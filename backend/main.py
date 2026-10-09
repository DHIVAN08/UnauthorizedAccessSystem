
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from models import LoginEvent


app = FastAPI(
    title="Unauthorized Access Detection and Prevention System",
    description="Detects repeated failed access attempts and records security events.",
    version="1.2.0",
)

# Allow the React frontend to communicate with the FastAPI backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FAILURES = 5
WINDOW_MINUTES = 10
BLOCK_MINUTES = 5

attempts = defaultdict(deque)
blocked_until = {}
lock = Lock()


class AccessAttempt(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    success: bool
    source_device: str = Field(default="unknown", max_length=100)


def get_current_time():
    return datetime.now(timezone.utc)


@app.get("/")
def home():
    return {
        "message": "Unauthorized Access Detection API is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/access-attempt")
def record_attempt(
    data: AccessAttempt,
    request: Request,
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else "unknown"
    key = (ip_address, data.username)
    current_time = get_current_time()

    result = "failed"
    failure_count = 0
    retry_after = 0

    with lock:
        expiry = blocked_until.get(key)

        if expiry is not None and current_time < expiry:
            retry_after = max(
                1,
                int((expiry - current_time).total_seconds()),
            )
            result = "blocked"
            failure_count = len(attempts[key])

        else:
            if expiry is not None:
                blocked_until.pop(key, None)

            cutoff = current_time - timedelta(minutes=WINDOW_MINUTES)

            while attempts[key] and attempts[key][0] < cutoff:
                attempts[key].popleft()

            if data.success:
                attempts[key].clear()
                result = "success"
            else:
                attempts[key].append(current_time)
                result = "failed"

                if len(attempts[key]) >= MAX_FAILURES:
                    blocked_until[key] = (
                        current_time + timedelta(minutes=BLOCK_MINUTES)
                    )
                    result = "blocked"

            failure_count = len(attempts[key])

    event = LoginEvent(
        username=data.username,
        success=data.success,
        result=result,
        ip_address=ip_address,
    )

    try:
        db.add(event)
        db.commit()
        db.refresh(event)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save access event. Check the database connection and table structure.",
        )

    if retry_after > 0:
        raise HTTPException(
            status_code=429,
            detail={
                "status": "blocked",
                "message": "Too many failed attempts. Try again later.",
                "retry_after_seconds": retry_after,
            },
        )

    return {
        "message": "Access attempt recorded",
        "event_id": event.id,
        "result": result,
        "failures_in_window": failure_count,
        "block_duration_minutes": (
            BLOCK_MINUTES if result == "blocked" else 0
        ),
    }


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_events = (
        db.query(func.count(LoginEvent.id)).scalar() or 0
    )

    failed_attempts = (
        db.query(func.count(LoginEvent.id))
        .filter(LoginEvent.result == "failed")
        .scalar()
        or 0
    )

    blocked_events = (
        db.query(func.count(LoginEvent.id))
        .filter(LoginEvent.result == "blocked")
        .scalar()
        or 0
    )

    recent_records = (
        db.query(LoginEvent)
        .order_by(
            desc(LoginEvent.attempted_at),
            desc(LoginEvent.id),
        )
        .limit(20)
        .all()
    )

    recent_events = [
        {
            "id": event.id,
            "timestamp": (
                event.attempted_at.isoformat()
                if event.attempted_at
                else None
            ),
            "username": event.username,
            "source_ip": event.ip_address,
            "result": event.result,
        }
        for event in recent_records
    ]

    with lock:
        active_blocks = sum(
            1
            for expiry in blocked_until.values()
            if expiry > get_current_time()
        )

    return {
        "total_events": total_events,
        "failed_attempts": failed_attempts,
        "blocked_events": blocked_events,
        "active_blocks": active_blocks,
        "recent_events": recent_events,
    }
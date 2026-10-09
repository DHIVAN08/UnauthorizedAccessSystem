
from database import SessionLocal
from models import LoginEvent

db = SessionLocal()

try:
    event = LoginEvent(
        username="test_user",
        success=False,
        ip_address="127.0.0.1",
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    print("Test event saved successfully!")
    print("Event ID:", event.id)
    print("Username:", event.username)
    print("Login successful:", event.success)
    print("IP address:", event.ip_address)
    print("Attempted at:", event.attempted_at)

except Exception:
    db.rollback()
    raise

finally:
    db.close()
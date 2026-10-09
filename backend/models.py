from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

from database import Base


class LoginEvent(Base):
    __tablename__ = "login_events"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False, index=True)
    success = Column(Boolean, nullable=False)
    result = Column(String(20), nullable=False, default="failed")
    ip_address = Column(String(45), nullable=True)
    attempted_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


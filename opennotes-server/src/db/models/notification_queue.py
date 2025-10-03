from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class NotificationQueue(Base):
    __tablename__ = "notification_queue"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    batch_key: Mapped[str | None] = mapped_column(String, nullable=True)
    batched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_notification_queue_user_id", "user_id"),
        Index("ix_notification_queue_status", "status"),
        Index("ix_notification_queue_priority", "priority"),
        Index("ix_notification_queue_scheduled_for", "scheduled_for"),
        Index("ix_notification_queue_batch_key", "batch_key"),
        Index("ix_notification_queue_created_at", "created_at"),
    )

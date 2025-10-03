from datetime import datetime
from typing import List

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class NoteRequest(Base):
    __tablename__ = "note_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    message_id: Mapped[str] = mapped_column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    requestor_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    sources: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    message: Mapped["Message"] = relationship("Message", back_populates="note_requests")
    requestor: Mapped["User"] = relationship("User", back_populates="note_requests")

    __table_args__ = (
        UniqueConstraint("message_id", "requestor_id", name="uq_message_requestor"),
        Index("ix_note_requests_message_id", "message_id"),
        Index("ix_note_requests_requestor_id", "requestor_id"),
        Index("ix_note_requests_timestamp", "timestamp"),
    )

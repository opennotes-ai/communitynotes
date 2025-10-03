from datetime import datetime
from typing import List

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class OpenNote(Base):
    __tablename__ = "community_notes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    message_id: Mapped[str] = mapped_column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    classification: Mapped[str] = mapped_column(String, nullable=False)
    sources: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)

    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_status_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    helpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    not_helpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_ratings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    helpfulness_ratio: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    is_visible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    visibility_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    message: Mapped["Message"] = relationship("Message", back_populates="community_notes")
    author: Mapped["User"] = relationship("User", back_populates="community_notes")
    ratings: Mapped[List["NoteRating"]] = relationship(
        "NoteRating", back_populates="note", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_community_notes_message_id", "message_id"),
        Index("ix_community_notes_author_id", "author_id"),
        Index("ix_community_notes_status", "status"),
        Index("ix_community_notes_is_visible", "is_visible"),
    )

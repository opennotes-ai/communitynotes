from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class NoteRating(Base):
    __tablename__ = "note_ratings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    note_id: Mapped[str] = mapped_column(String, ForeignKey("community_notes.id", ondelete="CASCADE"), nullable=False)
    rater_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    helpful: Mapped[bool] = mapped_column(Boolean, nullable=False)
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    note: Mapped["OpenNote"] = relationship("OpenNote", back_populates="ratings")
    rater: Mapped["User"] = relationship("User", back_populates="note_ratings")

    __table_args__ = (
        UniqueConstraint("note_id", "rater_id", name="uq_note_rater"),
        Index("ix_note_ratings_note_id", "note_id"),
        Index("ix_note_ratings_rater_id", "rater_id"),
    )

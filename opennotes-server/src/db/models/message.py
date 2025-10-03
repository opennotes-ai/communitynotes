from datetime import datetime
from typing import List

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    discord_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    channel_id: Mapped[str] = mapped_column(String, nullable=False)
    server_id: Mapped[str] = mapped_column(String, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    attachments: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    total_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unique_requestors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    has_active_note: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    server: Mapped["Server"] = relationship("Server", back_populates="messages")
    note_requests: Mapped[List["NoteRequest"]] = relationship(
        "NoteRequest", back_populates="message", cascade="all, delete-orphan"
    )
    community_notes: Mapped[List["OpenNote"]] = relationship(
        "OpenNote", back_populates="message", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_messages_server_channel", "server_id", "channel_id"),
        Index("ix_messages_timestamp", "timestamp"),
    )

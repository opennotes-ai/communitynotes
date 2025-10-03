from datetime import datetime
from typing import List

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    discord_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String, nullable=False)
    discriminator: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar: Mapped[str | None] = mapped_column(String, nullable=True)
    helpfulness_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_notes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_ratings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_active_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    daily_request_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_request_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    trust_level: Mapped[str] = mapped_column(
        String, default="newcomer", nullable=False
    )

    notify_new_requests: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_note_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_note_ratings: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_status_changed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_milestones: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notification_batching: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    batching_interval: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    notification_methods: Mapped[List[str]] = mapped_column(
        ARRAY(String), default=["discord_dm"], nullable=False
    )
    notifications_muted_until: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    note_requests: Mapped[List["NoteRequest"]] = relationship(
        "NoteRequest", back_populates="requestor", cascade="all, delete-orphan"
    )
    community_notes: Mapped[List["OpenNote"]] = relationship(
        "OpenNote", back_populates="author", cascade="all, delete-orphan"
    )
    note_ratings: Mapped[List["NoteRating"]] = relationship(
        "NoteRating", back_populates="rater", cascade="all, delete-orphan"
    )
    server_memberships: Mapped[List["ServerMember"]] = relationship(
        "ServerMember", back_populates="user", cascade="all, delete-orphan"
    )

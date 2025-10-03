from datetime import datetime
from typing import List

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    discord_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    icon: Mapped[str | None] = mapped_column(String, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    allow_note_requests: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_note_creation: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_requests_per_user: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    require_verification: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    enabled_channels: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    disabled_channels: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    moderator_roles: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    contributor_roles: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)

    is_paused: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paused_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    paused_by: Mapped[str | None] = mapped_column(String, nullable=True)
    pause_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    messages: Mapped[List["Message"]] = relationship(
        "Message", back_populates="server", cascade="all, delete-orphan"
    )
    server_members: Mapped[List["ServerMember"]] = relationship(
        "ServerMember", back_populates="server", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog", back_populates="server", cascade="all, delete-orphan"
    )

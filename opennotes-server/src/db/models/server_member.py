from datetime import datetime
from typing import List

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class ServerMember(Base):
    __tablename__ = "server_members"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    server_id: Mapped[str] = mapped_column(String, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False)
    roles: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="server_memberships")
    server: Mapped["Server"] = relationship("Server", back_populates="server_members")

    __table_args__ = (UniqueConstraint("user_id", "server_id", name="uq_user_server"),)

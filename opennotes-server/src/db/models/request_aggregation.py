from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class RequestAggregation(Base):
    __tablename__ = "request_aggregations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    message_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    total_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unique_requestors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    first_request_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_request_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    threshold_met: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    threshold_met_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    contributors_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_request_aggregations_total_requests", "total_requests"),
        Index("ix_request_aggregations_threshold_met", "threshold_met"),
    )

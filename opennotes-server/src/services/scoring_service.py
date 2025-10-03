import logging
from typing import Any

from src.services.scoring_adapter import ScoringAdapter

logger = logging.getLogger(__name__)


class ScoringService:
    def __init__(self):
        self.adapter = ScoringAdapter()
        self._cache_enabled = False

    async def score_notes(
        self,
        notes: list[dict[str, Any]],
        ratings: list[dict[str, Any]],
        enrollment: list[dict[str, Any]],
        status: list[dict[str, Any]] | None = None,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
        if not notes:
            raise ValueError("Notes list cannot be empty")
        if not ratings:
            raise ValueError("Ratings list cannot be empty")
        if not enrollment:
            raise ValueError("Enrollment list cannot be empty")

        logger.info(
            f"Starting scoring for {len(notes)} notes, {len(ratings)} ratings, {len(enrollment)} users"
        )

        notes_df = self.adapter.transform_notes_to_dataframe(notes)
        ratings_df = self.adapter.transform_ratings_to_dataframe(ratings)
        enrollment_df = self.adapter.transform_enrollment_to_dataframe(enrollment)
        status_df = (
            self.adapter.transform_status_to_dataframe(status) if status else None
        )

        scored_notes_df, helpful_scores_df, aux_info_df = await self.adapter.score_notes(
            notes_df, ratings_df, enrollment_df, status_df
        )

        scored_notes = scored_notes_df.to_dict(orient="records")
        helpful_scores = helpful_scores_df.to_dict(orient="records")
        aux_info = aux_info_df.to_dict(orient="records")

        logger.info(
            f"Scoring complete. Generated {len(scored_notes)} scored notes, {len(helpful_scores)} user scores"
        )

        return scored_notes, helpful_scores, aux_info

    def enable_caching(self, enabled: bool = True) -> None:
        self._cache_enabled = enabled
        logger.info(f"Scoring cache {'enabled' if enabled else 'disabled'}")


def get_scoring_service() -> ScoringService:
    return ScoringService()

import asyncio
import logging
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any

import pandas as pd

scoring_path = Path(__file__).parent.parent.parent.parent / "scoring" / "src"
sys.path.insert(0, str(scoring_path))

from scoring.run_scoring import run_scoring

logger = logging.getLogger(__name__)


class ScoringAdapter:
    def __init__(self):
        self.scoring_enabled = True

    async def score_notes(
        self,
        notes_df: pd.DataFrame,
        ratings_df: pd.DataFrame,
        enrollment_df: pd.DataFrame,
        status_df: pd.DataFrame | None = None,
    ) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        return await asyncio.to_thread(
            self._run_scoring_sync, notes_df, ratings_df, enrollment_df, status_df
        )

    def _run_scoring_sync(
        self,
        notes_df: pd.DataFrame,
        ratings_df: pd.DataFrame,
        enrollment_df: pd.DataFrame,
        status_df: pd.DataFrame | None = None,
    ) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        with (
            NamedTemporaryFile(mode="w", suffix=".tsv", delete=False) as notes_file,
            NamedTemporaryFile(mode="w", suffix=".tsv", delete=False) as ratings_file,
            NamedTemporaryFile(mode="w", suffix=".tsv", delete=False) as enrollment_file,
        ):
            notes_df.to_csv(notes_file.name, sep="\t", index=False)
            ratings_df.to_csv(ratings_file.name, sep="\t", index=False)
            enrollment_df.to_csv(enrollment_file.name, sep="\t", index=False)

            status_file_path = None
            if status_df is not None:
                status_file = NamedTemporaryFile(mode="w", suffix=".tsv", delete=False)
                status_df.to_csv(status_file.name, sep="\t", index=False)
                status_file_path = status_file.name

            scored_notes, helpful_scores, aux_note_info, _ = run_scoring(
                args=None,
                notes=notes_df,
                ratings=ratings_df,
                noteStatusHistory=status_df,
                userEnrollment=enrollment_df,
                seed=None,
                pseudoraters=False,
                enabledScorers=None,
                strictColumns=True,
                runParallel=False,
                useStableInitialization=True,
            )

            try:
                Path(notes_file.name).unlink()
                Path(ratings_file.name).unlink()
                Path(enrollment_file.name).unlink()
                if status_file_path:
                    Path(status_file_path).unlink()
            except Exception as e:
                logger.warning(f"Failed to cleanup temp files: {e}")

            return scored_notes, helpful_scores, aux_note_info

    def transform_notes_to_dataframe(self, notes: list[dict[str, Any]]) -> pd.DataFrame:
        return pd.DataFrame(notes)

    def transform_ratings_to_dataframe(self, ratings: list[dict[str, Any]]) -> pd.DataFrame:
        return pd.DataFrame(ratings)

    def transform_enrollment_to_dataframe(
        self, enrollments: list[dict[str, Any]]
    ) -> pd.DataFrame:
        return pd.DataFrame(enrollments)

    def transform_status_to_dataframe(
        self, statuses: list[dict[str, Any]] | None
    ) -> pd.DataFrame | None:
        if not statuses:
            return None
        return pd.DataFrame(statuses)

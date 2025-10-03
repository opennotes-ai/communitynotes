from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Any

from src.services.scoring_service import ScoringService, get_scoring_service

router = APIRouter()


class NoteData(BaseModel):
    noteId: int
    noteAuthorParticipantId: str
    createdAtMillis: int
    tweetId: int
    summary: str
    classification: str


class RatingData(BaseModel):
    raterParticipantId: str
    noteId: int
    createdAtMillis: int
    helpfulnessLevel: str


class EnrollmentData(BaseModel):
    participantId: str
    enrollmentState: str
    successfulRatingNeededToEarnIn: int
    timestampOfLastStateChange: int


class ScoringRequest(BaseModel):
    notes: list[NoteData] = Field(..., description="List of community notes to score")
    ratings: list[RatingData] = Field(..., description="List of ratings for the notes")
    enrollment: list[EnrollmentData] = Field(
        ..., description="List of user enrollment data"
    )
    status: list[dict[str, Any]] | None = Field(
        default=None, description="Optional note status history"
    )


class ScoringResponse(BaseModel):
    scored_notes: list[dict[str, Any]]
    helpful_scores: list[dict[str, Any]]
    auxiliary_info: list[dict[str, Any]]


@router.post("/score", response_model=ScoringResponse, status_code=status.HTTP_200_OK)
async def score_notes(
    request: ScoringRequest,
    scoring_service: ScoringService = Depends(get_scoring_service),
) -> ScoringResponse:
    try:
        notes = [note.model_dump() for note in request.notes]
        ratings = [rating.model_dump() for rating in request.ratings]
        enrollment = [enroll.model_dump() for enroll in request.enrollment]

        status_data = None
        if request.status:
            status_data = request.status

        scored_notes, helpful_scores, aux_info = await scoring_service.score_notes(
            notes=notes,
            ratings=ratings,
            enrollment=enrollment,
            status=status_data,
        )

        return ScoringResponse(
            scored_notes=scored_notes,
            helpful_scores=helpful_scores,
            auxiliary_info=aux_info,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input data: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scoring failed: {str(e)}",
        )


@router.get("/health")
async def scoring_health() -> dict[str, str]:
    return {"status": "healthy", "service": "scoring"}

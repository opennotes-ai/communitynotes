import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
def sample_scoring_request():
    return {
        "notes": [
            {
                "noteId": 1,
                "noteAuthorParticipantId": "user1",
                "createdAtMillis": 1609459200000,
                "tweetId": 1001,
                "summary": "This is helpful context",
                "classification": "NOT_MISLEADING",
            }
        ],
        "ratings": [
            {
                "raterParticipantId": "rater1",
                "noteId": 1,
                "createdAtMillis": 1609459300000,
                "helpfulnessLevel": "HELPFUL",
            }
        ],
        "enrollment": [
            {
                "participantId": "user1",
                "enrollmentState": "earnedIn",
                "successfulRatingNeededToEarnIn": 0,
                "timestampOfLastStateChange": 1609459200000,
            }
        ],
    }


@pytest.mark.asyncio
async def test_scoring_health():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/scoring/health")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "scoring"


@pytest.mark.asyncio
async def test_score_notes_missing_notes():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/scoring/score",
            json={
                "notes": [],
                "ratings": [{"raterParticipantId": "r1", "noteId": 1}],
                "enrollment": [{"participantId": "u1"}],
            },
        )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_score_notes_missing_ratings():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/scoring/score",
            json={
                "notes": [{"noteId": 1, "noteAuthorParticipantId": "u1"}],
                "ratings": [],
                "enrollment": [{"participantId": "u1"}],
            },
        )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_score_notes_missing_enrollment():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/scoring/score",
            json={
                "notes": [{"noteId": 1}],
                "ratings": [{"raterParticipantId": "r1"}],
                "enrollment": [],
            },
        )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_score_notes_invalid_schema():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/scoring/score",
            json={"invalid": "data"},
        )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

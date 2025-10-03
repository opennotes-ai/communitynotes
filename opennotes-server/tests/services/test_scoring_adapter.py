import pandas as pd
import pytest

from src.services.scoring_adapter import ScoringAdapter


@pytest.fixture
def scoring_adapter():
    return ScoringAdapter()


@pytest.fixture
def sample_notes():
    return [
        {
            "noteId": 1,
            "noteAuthorParticipantId": "user1",
            "createdAtMillis": 1609459200000,
            "tweetId": 1001,
            "summary": "This is helpful context",
            "classification": "NOT_MISLEADING",
        },
        {
            "noteId": 2,
            "noteAuthorParticipantId": "user2",
            "createdAtMillis": 1609545600000,
            "tweetId": 1002,
            "summary": "Additional context needed",
            "classification": "MISINFORMED_OR_POTENTIALLY_MISLEADING",
        },
    ]


@pytest.fixture
def sample_ratings():
    return [
        {
            "raterParticipantId": "rater1",
            "noteId": 1,
            "createdAtMillis": 1609459300000,
            "helpfulnessLevel": "HELPFUL",
        },
        {
            "raterParticipantId": "rater2",
            "noteId": 1,
            "createdAtMillis": 1609459400000,
            "helpfulnessLevel": "HELPFUL",
        },
    ]


@pytest.fixture
def sample_enrollment():
    return [
        {
            "participantId": "user1",
            "enrollmentState": "newUser",
            "successfulRatingNeededToEarnIn": 5,
            "timestampOfLastStateChange": 1609459200000,
        },
        {
            "participantId": "user2",
            "enrollmentState": "earnedIn",
            "successfulRatingNeededToEarnIn": 0,
            "timestampOfLastStateChange": 1609459200000,
        },
    ]


def test_transform_notes_to_dataframe(scoring_adapter, sample_notes):
    df = scoring_adapter.transform_notes_to_dataframe(sample_notes)

    assert isinstance(df, pd.DataFrame)
    assert len(df) == 2
    assert "noteId" in df.columns
    assert df["noteId"].tolist() == [1, 2]


def test_transform_ratings_to_dataframe(scoring_adapter, sample_ratings):
    df = scoring_adapter.transform_ratings_to_dataframe(sample_ratings)

    assert isinstance(df, pd.DataFrame)
    assert len(df) == 2
    assert "noteId" in df.columns
    assert "helpfulnessLevel" in df.columns


def test_transform_enrollment_to_dataframe(scoring_adapter, sample_enrollment):
    df = scoring_adapter.transform_enrollment_to_dataframe(sample_enrollment)

    assert isinstance(df, pd.DataFrame)
    assert len(df) == 2
    assert "participantId" in df.columns
    assert "enrollmentState" in df.columns


def test_transform_status_to_dataframe_with_data(scoring_adapter):
    statuses = [
        {
            "noteId": "1",
            "currentStatus": "NEEDS_MORE_RATINGS",
            "createdAtMillis": 1609459200000,
        }
    ]

    df = scoring_adapter.transform_status_to_dataframe(statuses)

    assert isinstance(df, pd.DataFrame)
    assert len(df) == 1
    assert "noteId" in df.columns


def test_transform_status_to_dataframe_with_none(scoring_adapter):
    df = scoring_adapter.transform_status_to_dataframe(None)

    assert df is None


def test_transform_status_to_dataframe_with_empty_list(scoring_adapter):
    df = scoring_adapter.transform_status_to_dataframe([])

    assert df is None


@pytest.mark.asyncio
async def test_score_notes_integration(
    scoring_adapter, sample_notes, sample_ratings, sample_enrollment
):
    notes_df = scoring_adapter.transform_notes_to_dataframe(sample_notes)
    ratings_df = scoring_adapter.transform_ratings_to_dataframe(sample_ratings)
    enrollment_df = scoring_adapter.transform_enrollment_to_dataframe(sample_enrollment)

    scored_notes, helpful_scores, aux_note_info = await scoring_adapter.score_notes(
        notes_df, ratings_df, enrollment_df
    )

    assert isinstance(scored_notes, pd.DataFrame)
    assert isinstance(helpful_scores, pd.DataFrame)
    assert isinstance(aux_note_info, pd.DataFrame)


def test_scoring_adapter_initialization():
    adapter = ScoringAdapter()

    assert adapter.scoring_enabled is True

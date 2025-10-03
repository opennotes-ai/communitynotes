# Scoring API Documentation

## Overview

The OpenNotes server integrates the Community Notes scoring algorithm as a shared dependency. The scoring module is imported from `../scoring/src` and wrapped in an async adapter for use within FastAPI endpoints.

## Architecture

```
opennotes-server/
  src/
    services/
      scoring_adapter.py    # Async wrapper for scoring module

../scoring/                 # Community Notes scoring implementation
  src/
    scoring/
      run_scoring.py        # Core scoring logic
      enums.py             # Scorer configurations
```

## Installation

Install scoring dependencies (optional group):

```bash
cd /Users/mike/code/opennotes-ai/multiverse/communitynotes/opennotes-server
uv pip install -e ".[scoring]"
```

Dependencies installed:
- numpy==1.26.4
- pandas==2.2.2
- torch==2.1.2
- scipy==1.11.4
- scikit-learn>=1.3.0 (updated from 1.0.2 for Python 3.11 compatibility)
- pyarrow>=15.0.0
- wandb==0.18.7

## Usage

### Basic Example

```python
from src.services.scoring_adapter import ScoringAdapter
import pandas as pd

adapter = ScoringAdapter()

notes = [
    {
        "noteId": "1",
        "noteAuthorParticipantId": "user1",
        "createdAtMillis": 1609459200000,
        "summary": "This provides helpful context",
        "classification": "NOT_MISLEADING"
    }
]

ratings = [
    {
        "raterParticipantId": "rater1",
        "noteId": "1",
        "createdAtMillis": 1609459300000,
        "helpfulnessLevel": "HELPFUL"
    }
]

enrollment = [
    {
        "participantId": "user1",
        "enrollmentState": "earnedIn",
        "successfulRatingNeededToEarnIn": 0,
        "timestampOfLastStateChange": 1609459200000
    }
]

notes_df = adapter.transform_notes_to_dataframe(notes)
ratings_df = adapter.transform_ratings_to_dataframe(ratings)
enrollment_df = adapter.transform_enrollment_to_dataframe(enrollment)

scored_notes, helpful_scores, aux_info = await adapter.score_notes(
    notes_df,
    ratings_df,
    enrollment_df,
    status_df=None
)
```

### FastAPI Integration

```python
from fastapi import APIRouter, Depends
from src.services.scoring_adapter import ScoringAdapter

router = APIRouter()

def get_scoring_adapter() -> ScoringAdapter:
    return ScoringAdapter()

@router.post("/score")
async def score_notes(
    request: ScoringRequest,
    adapter: ScoringAdapter = Depends(get_scoring_adapter)
):
    notes_df = adapter.transform_notes_to_dataframe(request.notes)
    ratings_df = adapter.transform_ratings_to_dataframe(request.ratings)
    enrollment_df = adapter.transform_enrollment_to_dataframe(request.enrollment)

    scored_notes, helpful_scores, aux_info = await adapter.score_notes(
        notes_df,
        ratings_df,
        enrollment_df
    )

    return {
        "scored_notes": scored_notes.to_dict(orient="records"),
        "helpful_scores": helpful_scores.to_dict(orient="records"),
        "aux_info": aux_info.to_dict(orient="records")
    }
```

## Data Formats

### Notes DataFrame Schema

| Column | Type | Description |
|--------|------|-------------|
| noteId | str | Unique note identifier |
| noteAuthorParticipantId | str | Author's participant ID |
| createdAtMillis | int | Creation timestamp (milliseconds) |
| summary | str | Note content/summary |
| classification | str | Note classification type |

### Ratings DataFrame Schema

| Column | Type | Description |
|--------|------|-------------|
| raterParticipantId | str | Rater's participant ID |
| noteId | str | Note being rated |
| createdAtMillis | int | Rating timestamp (milliseconds) |
| helpfulnessLevel | str | Helpfulness rating (HELPFUL, etc.) |

### Enrollment DataFrame Schema

| Column | Type | Description |
|--------|------|-------------|
| participantId | str | User's participant ID |
| enrollmentState | str | Current enrollment state |
| successfulRatingNeededToEarnIn | int | Ratings needed to earn in |
| timestampOfLastStateChange | int | Last state change timestamp |

### Status DataFrame Schema (Optional)

| Column | Type | Description |
|--------|------|-------------|
| noteId | str | Note identifier |
| currentStatus | str | Current note status |
| createdAtMillis | int | Status timestamp |

## Output Formats

### Scored Notes

Contains note-level scoring results with fields like:
- Note status (CURRENTLY_RATED_HELPFUL, NEEDS_MORE_RATINGS, etc.)
- Scoring metrics (helpfulness scores, confidence intervals)
- Classification results

### Helpful Scores

User-level helpfulness scores showing contributor reputation and scoring history.

### Auxiliary Note Info

Additional metadata and intermediate scoring calculations.

## Performance Considerations

1. **Async Execution**: The scoring computation runs in a thread pool to avoid blocking the event loop
2. **Temporary Files**: TSV files are written to temp directory and cleaned up after scoring
3. **Memory Usage**: Large datasets should be batched to avoid memory issues
4. **CPU Intensive**: Scoring uses PyTorch and can benefit from GPU acceleration

## Error Handling

```python
from src.services.scoring_adapter import ScoringAdapter

adapter = ScoringAdapter()

try:
    scored_notes, helpful_scores, aux_info = await adapter.score_notes(
        notes_df, ratings_df, enrollment_df
    )
except Exception as e:
    logger.error(f"Scoring failed: {e}")
    # Handle error appropriately
```

## Testing

Run scoring adapter tests:

```bash
pytest tests/services/test_scoring_adapter.py -v
```

Run with coverage:

```bash
pytest tests/services/test_scoring_adapter.py --cov=src/services/scoring_adapter --cov-report=term
```

## Troubleshooting

### Import Errors

If you see `ModuleNotFoundError: No module named 'scoring'`:

1. Verify scoring dependencies are installed: `poetry install --with scoring`
2. Check that `../scoring/src` path exists relative to opennotes-server
3. Verify sys.path is correctly modified in scoring_adapter.py

### Performance Issues

If scoring is slow:

1. Enable PyTorch GPU acceleration if available
2. Reduce batch size for large datasets
3. Consider caching scoring results with Redis
4. Use `runParallel=True` for multi-core processing (requires process pool)

### Memory Issues

For large datasets:

1. Process notes in batches
2. Clear pandas DataFrames after use
3. Monitor temp file cleanup
4. Consider streaming processing for very large datasets

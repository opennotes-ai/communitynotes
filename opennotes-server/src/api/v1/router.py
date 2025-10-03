from fastapi import APIRouter

from src.api.v1.endpoints import scoring

api_router = APIRouter()

api_router.include_router(scoring.router, prefix="/scoring", tags=["scoring"])


@api_router.get("/status")
async def api_status() -> dict[str, str]:
    return {
        "status": "operational",
        "api_version": "1.0.0",
    }

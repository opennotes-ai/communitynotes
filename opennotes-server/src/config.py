from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = Field(default=False)

    PROJECT_NAME: str = "OpenNotes API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000

    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
        ]
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    DATABASE_URL: PostgresDsn = Field(
        default="postgresql+asyncpg://opennotes:opennotes@localhost:5432/opennotes"
    )
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_ECHO: bool = False

    REDIS_URL: RedisDsn = Field(default="redis://localhost:6379/0")
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_DECODE_RESPONSES: bool = True

    NATS_URL: str = "nats://localhost:4222"
    NATS_MAX_RECONNECT_ATTEMPTS: int = 60

    JWT_SECRET_KEY: str = Field(default="your-secret-key-change-this-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    API_KEY_HEADER_NAME: str = "X-API-Key"

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_NEWCOMER_REQUESTS_PER_DAY: int = 5
    RATE_LIMIT_CONTRIBUTOR_REQUESTS_PER_DAY: int = 10
    RATE_LIMIT_TRUSTED_REQUESTS_PER_DAY: int = 20
    RATE_LIMIT_GENERAL_REQUESTS_PER_HOUR: int = 100

    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    LOG_FORMAT: str = "json"

    SENTRY_DSN: str | None = None

    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str = "noreply@opennotes.ai"

    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_PHONE_NUMBER: str | None = None

    VERIFICATION_CODE_EXPIRE_MINUTES: int = 15
    VERIFICATION_CODE_LENGTH: int = 6

    SCORING_SCHEDULE_CRON: str = "0 */6 * * *"
    SCORING_ENABLED: bool = True

    WORKER_ENABLED: bool = True
    WORKER_CONCURRENCY: int = 4

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def database_url_sync(self) -> str:
        return str(self.DATABASE_URL).replace("+asyncpg", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

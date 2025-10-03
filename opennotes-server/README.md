# OpenNotes Server

Backend server for OpenNotes - Core business logic and API for the Community Notes system.

## Overview

OpenNotes Server is a FastAPI-based backend service that provides:

- **REST API** for note requests, community notes, ratings, and user management
- **Authentication & Authorization** using JWT tokens
- **Background Workers** for scoring algorithm execution and notification dispatch
- **Database Management** using PostgreSQL with SQLAlchemy
- **Caching** with Redis for performance optimization
- **Event Streaming** with NATS JetStream for async workflows

## Architecture

This service is part of a microservices architecture:

- **opennotes-discord** (AWS Lambda): Discord-specific edge functions
- **opennotes-server** (This service): Core business logic and data persistence
- **PostgreSQL**: Primary data store
- **Redis**: Caching and rate limiting
- **NATS**: Event streaming and background jobs

See [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for complete system architecture.

## Prerequisites

- Python 3.11+
- uv (for dependency management - https://github.com/astral-sh/uv)
- Docker & Docker Compose (for local development)
- PostgreSQL 15+
- Redis 7+
- NATS 2.10+ with JetStream

## Setup

### 1. Install Dependencies

```bash
uv pip install -e ".[dev,scoring]"
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `NATS_URL`: NATS server URL
- `JWT_SECRET_KEY`: Secret key for JWT signing (use `openssl rand -hex 32`)

### 3. Run with Docker Compose (Recommended)

```bash
docker-compose up -d
```

This starts:
- API server on http://localhost:8000
- PostgreSQL on localhost:5432
- Redis on localhost:6379
- NATS on localhost:4222

### 4. Run Database Migrations

```bash
docker-compose --profile migrations up migrations
```

Or without Docker:

```bash
alembic upgrade head
```

### 5. Access API Documentation

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc
- OpenAPI JSON: http://localhost:8000/api/v1/openapi.json

## Running Locally

### Development Server

```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Or use make:

```bash
make run
```

### Run Tests

```bash
uv run pytest
```

With coverage:

```bash
uv run pytest --cov=src --cov-report=html
```

Or use make:

```bash
make test
make test-cov
```

### Run Linting

```bash
uv run black src tests
uv run ruff check src tests
uv run mypy src
```

Or use make:

```bash
make lint
make format
```

## Project Structure

```
opennotes-server/
├── src/
│   ├── api/
│   │   └── v1/
│   │       ├── router.py          # Main API router
│   │       └── endpoints/         # API endpoint modules
│   ├── core/
│   │   ├── auth.py                # Authorization (roles, scopes)
│   │   ├── security.py            # JWT & password hashing
│   │   ├── dependencies.py        # FastAPI dependencies
│   │   └── logging_config.py      # Logging setup
│   ├── db/
│   │   ├── session.py             # Database session
│   │   ├── base.py                # SQLAlchemy Base
│   │   └── models/                # Database models
│   ├── schemas/                   # Pydantic schemas
│   ├── services/                  # Business logic
│   ├── utils/                     # Utility functions
│   ├── config.py                  # Configuration management
│   └── main.py                    # Application entry point
├── tests/
├── alembic/                       # Database migrations
├── .env.example
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints (Planned)

### Health & Status
- `GET /health` - Health check
- `GET /api/v1/status` - API status

### Note Requests
- `POST /api/v1/requests` - Create note request
- `GET /api/v1/requests` - List requests

### Community Notes
- `POST /api/v1/notes` - Create note
- `GET /api/v1/notes/{id}` - Get note
- `PATCH /api/v1/notes/{id}` - Update note

### Ratings
- `POST /api/v1/ratings` - Rate a note
- `GET /api/v1/ratings` - List ratings

### Users
- `GET /api/v1/users/{id}` - Get user profile
- `PATCH /api/v1/users/{id}` - Update user

### Verification
- `POST /api/v1/verification/email/initiate` - Start email verification
- `POST /api/v1/verification/email/verify` - Verify email code

### Analytics
- `GET /api/v1/analytics/overview` - System overview

## Authentication

All API endpoints (except health checks) require JWT authentication:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:8000/api/v1/notes
```

JWT tokens are issued by the Discord Lambda functions after validating Discord interactions.

## Environment Variables

See `.env.example` for all configuration options.

Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment (development/staging/production) | development |
| `DATABASE_URL` | PostgreSQL connection string | postgresql+asyncpg://... |
| `REDIS_URL` | Redis connection string | redis://localhost:6379/0 |
| `NATS_URL` | NATS server URL | nats://localhost:4222 |
| `JWT_SECRET_KEY` | Secret for JWT signing | (required) |
| `LOG_LEVEL` | Logging level | INFO |

## Development

### Creating a New Migration

```bash
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

### Adding New Dependencies

Add to `pyproject.toml` under `[project.dependencies]` and install:

```bash
uv pip install -e .
```

Dev dependencies:

Add to `[project.optional-dependencies.dev]` and install:

```bash
uv pip install -e ".[dev]"
```

## Deployment

### Build Docker Image

```bash
docker build -t opennotes-server:latest .
```

### Run in Production

```bash
docker run -d \
  --name opennotes-server \
  -p 8000:8000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_URL=$REDIS_URL \
  -e NATS_URL=$NATS_URL \
  -e JWT_SECRET_KEY=$JWT_SECRET_KEY \
  -e ENVIRONMENT=production \
  opennotes-server:latest
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](../../LICENSE) for details.

## Support

- Documentation: [docs/](../../docs/)
- Issues: [GitHub Issues](https://github.com/opennotes-ai/multiverse/issues)

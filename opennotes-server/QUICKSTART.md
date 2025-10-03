# Quick Start Guide

Get the OpenNotes Server up and running in 5 minutes.

## Prerequisites

- Python 3.11+
- Poetry
- Docker & Docker Compose (optional, but recommended)

## Option 1: Docker (Recommended)

### 1. Configure Environment

```bash
cp .env.example .env
```

### 2. Start All Services

```bash
docker-compose up -d
```

This starts:
- FastAPI server on http://localhost:8000
- PostgreSQL on localhost:5432
- Redis on localhost:6379
- NATS on localhost:4222

### 3. Run Migrations

```bash
docker-compose --profile migrations up migrations
```

### 4. Verify Setup

Visit http://localhost:8000/health

You should see:
```json
{
  "status": "healthy",
  "environment": "development",
  "version": "1.0.0"
}
```

### 5. View API Documentation

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## Option 2: Local Development (Without Docker)

### 1. Install Dependencies

```bash
poetry install
```

### 2. Set Up PostgreSQL

Install and start PostgreSQL 15+:

```bash
createdb opennotes
```

### 3. Set Up Redis

Install and start Redis 7+:

```bash
redis-server
```

### 4. Set Up NATS

Install and start NATS with JetStream:

```bash
nats-server -js
```

### 5. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials.

### 6. Run Migrations

```bash
poetry run alembic upgrade head
```

### 7. Start Server

```bash
poetry run uvicorn src.main:app --reload
```

Visit http://localhost:8000/health to verify.

## Common Commands

```bash
make help          # Show all available commands
make dev           # Install dependencies
make run           # Start development server
make test          # Run tests
make lint          # Run linters
make format        # Format code
make migrate       # Run migrations
make docker-up     # Start Docker services
make docker-down   # Stop Docker services
```

## Troubleshooting

### Port Already in Use

If port 8000 is already in use:

```bash
export SERVER_PORT=8080
uvicorn src.main:app --reload --port 8080
```

### Database Connection Error

Ensure PostgreSQL is running:

```bash
docker-compose logs postgres
```

Or check local PostgreSQL:

```bash
psql -U opennotes -d opennotes -c "SELECT 1"
```

### Redis Connection Error

Check Redis status:

```bash
docker-compose logs redis
```

Or local Redis:

```bash
redis-cli ping
```

## Next Steps

1. Read [README.md](README.md) for full documentation
2. Review [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for system design
3. Check [API endpoints](#) in Swagger docs
4. Start implementing features (see backlog)

## Development Workflow

1. Create a new branch for your feature
2. Make changes to code
3. Run tests: `make test`
4. Format code: `make format`
5. Run linters: `make lint`
6. Commit and push
7. Open pull request

## Getting Help

- Check [README.md](README.md) for detailed docs
- Review [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- Open an issue on GitHub

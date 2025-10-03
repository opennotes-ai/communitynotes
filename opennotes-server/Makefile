.PHONY: help install dev test lint format clean docker-build docker-up docker-down migrate

help:
	@echo "OpenNotes Server - Available Commands:"
	@echo ""
	@echo "Setup & Dependencies:"
	@echo "  make install      - Install production dependencies"
	@echo "  make dev          - Install all dependencies (including dev)"
	@echo "  make sync         - Sync dependencies from lock file"
	@echo ""
	@echo "Development:"
	@echo "  make run          - Run development server"
	@echo "  make test         - Run tests with coverage"
	@echo "  make lint         - Run all linters (black, ruff, mypy)"
	@echo "  make format       - Format code with black and ruff"
	@echo ""
	@echo "Database:"
	@echo "  make migrate      - Run database migrations"
	@echo "  make migration    - Create new migration (usage: make migration msg='description')"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-up    - Start all services with Docker Compose"
	@echo "  make docker-down  - Stop all services"
	@echo "  make docker-logs  - View logs from all services"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean        - Remove cache and build files"

install:
	uv pip install -e .

dev:
	uv pip install -e ".[dev,scoring]"

sync:
	uv pip sync

run:
	uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

test:
	uv run pytest

test-cov:
	uv run pytest --cov=src --cov-report=html --cov-report=term

lint:
	uv run ruff check src tests
	uv run ruff format --check src tests
	uv run mypy src

format:
	uv run ruff check --fix src tests
	uv run ruff format src tests

migrate:
	uv run alembic upgrade head

migration:
	@if [ -z "$(msg)" ]; then \
		echo "Error: Please provide a migration message. Usage: make migration msg='your message'"; \
		exit 1; \
	fi
	uv run alembic revision --autogenerate -m "$(msg)"

docker-build:
	docker build -t opennotes-server:latest .

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-migrate:
	docker-compose --profile migrations up migrations

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete
	rm -rf dist/ build/ *.egg-info

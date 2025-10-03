#!/bin/bash

set -e

echo "=================================="
echo "OpenNotes Server - Setup Verification"
echo "=================================="
echo ""

echo "Checking Python version..."
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

if command -v poetry &> /dev/null; then
    poetry_version=$(poetry --version | awk '{print $3}')
    echo "✓ Poetry version: $poetry_version"
else
    echo "✗ Poetry not found. Please install: curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

if command -v docker &> /dev/null; then
    docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
    echo "✓ Docker version: $docker_version"
else
    echo "⚠ Docker not found (optional for local development)"
fi

if command -v docker-compose &> /dev/null; then
    compose_version=$(docker-compose --version | awk '{print $4}' | sed 's/,//')
    echo "✓ Docker Compose version: $compose_version"
else
    echo "⚠ Docker Compose not found (optional for local development)"
fi

echo ""
echo "Checking project structure..."

required_files=(
    "pyproject.toml"
    "src/main.py"
    "src/config.py"
    ".env.example"
    "alembic.ini"
    "Dockerfile"
    "docker-compose.yml"
    "README.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
    else
        echo "✗ Missing: $file"
        exit 1
    fi
done

echo ""
echo "Checking required directories..."

required_dirs=(
    "src/api/v1"
    "src/core"
    "src/db"
    "src/schemas"
    "src/services"
    "src/utils"
    "tests"
    "alembic/versions"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✓ $dir/"
    else
        echo "✗ Missing: $dir/"
        exit 1
    fi
done

echo ""
echo "=================================="
echo "✓ Setup verification complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure"
echo "2. Run 'make dev' to install dependencies"
echo "3. Run 'make docker-up' to start services"
echo "4. Run 'make migrate' to run database migrations"
echo "5. Run 'make run' to start the development server"
echo ""
echo "For more commands, run: make help"

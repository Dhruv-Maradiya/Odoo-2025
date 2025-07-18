# Multi-stage minimal Dockerfile for auth-only FastAPI app
FROM python:3.12-slim AS base

# Install system dependencies (only what's needed)
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Install uv for fast Python package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./

# Set environment variables
ENV UV_COMPILE_BYTECODE=1 \
  UV_LINK_MODE=copy \
  UV_SYSTEM_PYTHON=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
  uv pip install --system --no-cache-dir .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
  mkdir -p /app/logs && \
  chown -R appuser:appuser /app

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
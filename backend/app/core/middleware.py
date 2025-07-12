"""
Middleware configuration for the FastAPI application.
"""

from app.config.settings import settings
from app.middleware.logger import LoggingMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def configure_middleware(app: FastAPI) -> None:
    """
    Configure middleware for the FastAPI application.

    Args:
        app (FastAPI): FastAPI application instance
    """

    # Add logging middleware
    app.add_middleware(LoggingMiddleware)

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
    )


def get_allowed_origins():
    """Get allowed CORS origins based on environment."""
    if settings.ENV == "development":
        return ["http://localhost:3000", "http://127.0.0.1:3000"]
    else:
        return [settings.FRONTEND_URL]

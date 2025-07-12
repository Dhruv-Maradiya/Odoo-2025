import time
from http import HTTPStatus

from app.config.loggers import request_logger as logger
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log API request and response details."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed_ms = (time.time() - start) * 1000

        # safe lookup of client IP
        if request.client:
            client_ip = request.client.host
        else:
            # fallback to header or literal
            client_ip = request.headers.get("x-forwarded-for", "unknown")

        # status phrase
        try:
            phrase = HTTPStatus(response.status_code).phrase
        except ValueError:
            phrase = "Unknown"

        logger.info(
            f"[{client_ip}] {request.method} {request.url.path} "
            f"{response.status_code} {phrase} - {elapsed_ms:.2f}ms"
        )
        return response

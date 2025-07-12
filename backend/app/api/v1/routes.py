"""
Odoo API v1 package.

This package contains the API routes and dependencies for version 1 of the Odoo API.
"""

from app.api.v1.router import auth, health, images, notifications, qa, users
from fastapi import APIRouter

router = APIRouter()

router.include_router(health.router, tags=["Health"])
router.include_router(auth.router, prefix="/oauth", tags=["OAuth"])
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(qa.router, prefix="/qa", tags=["Q&A System"])

router.include_router(images.router, prefix="/images", tags=["Images"])

router.include_router(
    notifications.router, prefix="/notifications", tags=["Notifications"]
)


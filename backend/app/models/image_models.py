"""
Image models for file upload and management.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ImageUploadResponse(BaseModel):
    """Response model for image upload."""

    filename: str
    url: str
    size: int
    content_type: str
    uploaded_at: datetime


class ImageModel(BaseModel):
    """Image model for storing image metadata."""

    image_id: str
    filename: str
    original_filename: str
    url: str
    size: int
    content_type: str
    upload_type: str  # 'questions', 'answers', 'profiles', etc.
    related_id: Optional[str] = None  # ID of the related entity
    uploaded_by: str  # User ID who uploaded the image
    uploaded_at: datetime
    is_deleted: bool = False


class ImageUploadRequest(BaseModel):
    """Request model for image upload."""

    upload_type: str = Field(
        ..., description="Type of upload: questions, answers, profiles"
    )
    related_id: Optional[str] = Field(None, description="ID of related entity")


class ImageListResponse(BaseModel):
    """Response model for listing images."""

    images: List[ImageModel]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool


class ImageFilterRequest(BaseModel):
    """Request model for filtering images."""

    upload_type: Optional[str] = None
    related_id: Optional[str] = None
    uploaded_by: Optional[str] = None
    content_type: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class ImageStatsModel(BaseModel):
    """Image statistics model."""

    total_images: int = 0
    total_size: int = 0  # Total size in bytes
    images_by_type: dict = Field(default_factory=dict)
    images_by_content_type: dict = Field(default_factory=dict)
    upload_trends: dict = Field(default_factory=dict)

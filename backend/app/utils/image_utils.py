"""
Image upload utilities for handling file uploads.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, UploadFile, status

from app.models.image_models import ImageUploadResponse


class ImageUploadService:
    """Service for handling image uploads."""

    def __init__(self, base_upload_dir: str = "app/static/uploads"):
        self.base_upload_dir = base_upload_dir
        self.max_file_size = 5 * 1024 * 1024  # 5 MB
        self.allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        self.allowed_extensions = [".jpg", ".jpeg", ".png", ".webp"]

    async def upload_image(
        self,
        file: UploadFile,
        upload_type: str,  # 'questions', 'answers', 'profiles', etc.
        related_id: Optional[str] = None,
    ) -> ImageUploadResponse:
        """Upload an image file and return the response."""

        # Validate file
        await self._validate_file(file)

        # Generate unique filename
        file_extension = self._get_file_extension(file.filename)
        unique_filename = self._generate_unique_filename(
            upload_type, related_id, file_extension
        )

        # Create upload directory
        upload_dir = os.path.join(self.base_upload_dir, upload_type)
        os.makedirs(upload_dir, exist_ok=True)

        # Full file path
        file_path = os.path.join(upload_dir, unique_filename)

        # Save file
        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}",
            )

        # Generate URL (relative path from static directory)
        relative_path = os.path.join(upload_type, unique_filename)
        file_url = f"/static/uploads/{relative_path.replace(os.sep, '/')}"

        # Get file size
        file_size = os.path.getsize(file_path)

        return ImageUploadResponse(
            filename=unique_filename,
            url=file_url,
            size=file_size,
            content_type=file.content_type or "image/jpeg",
            uploaded_at=datetime.now(timezone.utc),
        )

    async def _validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file."""
        # Check content type
        if file.content_type not in self.allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(self.allowed_types)}",
            )

        # Check file extension
        if file.filename:
            file_extension = self._get_file_extension(file.filename)
            if file_extension.lower() not in self.allowed_extensions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid file extension. Allowed extensions: {', '.join(self.allowed_extensions)}",
                )

        # Check file size (we need to read the file to check size)
        content = await file.read()
        file_size = len(content)

        if file_size > self.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds limit of {self.max_file_size / (1024*1024):.1f} MB",
            )

        # Reset file pointer
        await file.seek(0)

    def _get_file_extension(self, filename: Optional[str]) -> str:
        """Get file extension from filename."""
        if not filename:
            return ".jpg"  # Default extension

        return os.path.splitext(filename)[1].lower()

    def _generate_unique_filename(
        self, upload_type: str, related_id: Optional[str], extension: str
    ) -> str:
        """Generate a unique filename."""
        timestamp = int(datetime.now(timezone.utc).timestamp())
        unique_id = str(uuid.uuid4())[:8]

        if related_id:
            return f"{upload_type}_{related_id}_{timestamp}_{unique_id}{extension}"
        else:
            return f"{upload_type}_{timestamp}_{unique_id}{extension}"

    def delete_image(self, file_url: str) -> bool:
        """Delete an image file."""
        try:
            # Convert URL back to file path
            relative_path = file_url.replace("/static/uploads/", "").replace(
                "/", os.sep
            )
            file_path = os.path.join(self.base_upload_dir, relative_path)

            if os.path.exists(file_path):
                os.remove(file_path)
                return True

            return False
        except Exception as e:
            print(f"Error deleting image: {e}")
            return False


# Global instance
image_upload_service = ImageUploadService()

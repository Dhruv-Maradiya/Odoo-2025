"""
Image service layer for handling file uploads and management.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.db.mongodb.collections import mongodb_instance
from app.models.image_models import (
    ImageFilterRequest,
    ImageListResponse,
    ImageModel,
    ImageStatsModel,
    ImageUploadRequest,
    ImageUploadResponse,
)
from fastapi import HTTPException, UploadFile, status
from pymongo import DESCENDING


class ImageService:
    """Service class for image operations."""

    def __init__(self, base_upload_dir: str = "app/static/uploads"):
        self.db = mongodb_instance
        self.images = self.db.get_collection("images")
        self.base_upload_dir = base_upload_dir
        self.max_file_size = 5 * 1024 * 1024  # 5 MB
        self.allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        self.allowed_extensions = [".jpg", ".jpeg", ".png", ".webp"]

    async def upload_image(
        self, file: UploadFile, upload_request: ImageUploadRequest, user_id: str
    ) -> Optional[ImageUploadResponse]:
        """Upload an image file and return the response."""

        # Validate file
        await self._validate_file(file)

        # Generate unique filename
        file_extension = self._get_file_extension(file.filename)
        unique_filename = self._generate_unique_filename(
            upload_request.upload_type, upload_request.related_id, file_extension
        )

        # Create upload directory
        upload_dir = os.path.join(self.base_upload_dir, upload_request.upload_type)
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
        relative_path = os.path.join(upload_request.upload_type, unique_filename)
        file_url = f"/static/uploads/{relative_path.replace(os.sep, '/')}"

        # Get file size
        file_size = os.path.getsize(file_path)

        # Save to database
        image_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        image_doc = {
            "_id": image_id,
            "filename": unique_filename,
            "original_filename": file.filename or "unknown",
            "url": file_url,
            "size": file_size,
            "content_type": file.content_type or "image/jpeg",
            "upload_type": upload_request.upload_type,
            "related_id": upload_request.related_id,
            "uploaded_by": user_id,
            "uploaded_at": now,
            "is_deleted": False,
        }

        try:
            await self.images.insert_one(image_doc)
        except Exception as e:
            # Clean up file if database insert fails
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save image metadata: {str(e)}",
            )

        return ImageUploadResponse(
            filename=unique_filename,
            url=file_url,
            size=file_size,
            content_type=file.content_type or "image/jpeg",
            uploaded_at=now,
        )

    async def get_image_by_id(self, image_id: str) -> Optional[ImageModel]:
        """Get an image by ID."""
        try:
            doc = await self.images.find_one({"_id": image_id, "is_deleted": False})

            if doc:
                return ImageModel(
                    image_id=doc["_id"],
                    filename=doc["filename"],
                    original_filename=doc["original_filename"],
                    url=doc["url"],
                    size=doc["size"],
                    content_type=doc["content_type"],
                    upload_type=doc["upload_type"],
                    related_id=doc.get("related_id"),
                    uploaded_by=doc["uploaded_by"],
                    uploaded_at=doc["uploaded_at"],
                    is_deleted=doc["is_deleted"],
                )

            return None
        except Exception as e:
            print(f"Error getting image: {e}")
            return None

    async def list_images(
        self, filters: ImageFilterRequest, user_id: Optional[str] = None
    ) -> Optional[ImageListResponse]:
        """List images with filters."""
        try:
            # Build query
            query: Dict[str, Any] = {"is_deleted": False}

            if filters.upload_type:
                query["upload_type"] = filters.upload_type
            if filters.related_id:
                query["related_id"] = filters.related_id
            if filters.uploaded_by:
                query["uploaded_by"] = filters.uploaded_by
            elif user_id:  # If no specific user filter, default to current user
                query["uploaded_by"] = user_id
            if filters.content_type:
                query["content_type"] = filters.content_type
            if filters.date_from or filters.date_to:
                date_query = {}
                if filters.date_from:
                    date_query["$gte"] = filters.date_from
                if filters.date_to:
                    date_query["$lte"] = filters.date_to
                query["uploaded_at"] = date_query

            # Get total count
            total = await self.images.count_documents(query)

            # Calculate pagination
            skip = (filters.page - 1) * filters.limit
            has_next = skip + filters.limit < total
            has_prev = filters.page > 1

            # Get images
            cursor = (
                self.images.find(query)
                .sort("uploaded_at", DESCENDING)
                .skip(skip)
                .limit(filters.limit)
            )
            image_docs = await cursor.to_list(length=filters.limit)

            images = []
            for doc in image_docs:
                images.append(
                    ImageModel(
                        image_id=doc["_id"],
                        filename=doc["filename"],
                        original_filename=doc["original_filename"],
                        url=doc["url"],
                        size=doc["size"],
                        content_type=doc["content_type"],
                        upload_type=doc["upload_type"],
                        related_id=doc.get("related_id"),
                        uploaded_by=doc["uploaded_by"],
                        uploaded_at=doc["uploaded_at"],
                        is_deleted=doc["is_deleted"],
                    )
                )

            return ImageListResponse(
                images=images,
                total=total,
                page=filters.page,
                limit=filters.limit,
                has_next=has_next,
                has_prev=has_prev,
            )
        except Exception as e:
            print(f"Error listing images: {e}")
            return None

    async def delete_image(self, image_id: str, user_id: str) -> bool:
        """Delete an image (soft delete)."""
        try:
            # Get image first to check ownership
            image_doc = await self.images.find_one(
                {"_id": image_id, "uploaded_by": user_id, "is_deleted": False}
            )

            if not image_doc:
                return False

            # Soft delete in database
            result = await self.images.update_one(
                {"_id": image_id}, {"$set": {"is_deleted": True}}
            )

            # Optionally delete physical file
            try:
                relative_path = image_doc["url"].replace("/static/uploads/", "")
                file_path = os.path.join(
                    self.base_upload_dir, relative_path.replace("/", os.sep)
                )
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Warning: Failed to delete physical file: {e}")

            return result.modified_count > 0
        except Exception as e:
            print(f"Error deleting image: {e}")
            return False

    async def get_image_stats(
        self, user_id: Optional[str] = None
    ) -> Optional[ImageStatsModel]:
        """Get image statistics."""
        try:
            query: Dict[str, Any] = {"is_deleted": False}
            if user_id:
                query["uploaded_by"] = user_id

            # Aggregate statistics
            pipeline = [
                {"$match": query},
                {
                    "$group": {
                        "_id": None,
                        "total_images": {"$sum": 1},
                        "total_size": {"$sum": "$size"},
                        "images_by_type": {
                            "$push": {
                                "upload_type": "$upload_type",
                                "content_type": "$content_type",
                            }
                        },
                    }
                },
            ]

            result = await self.images.aggregate(pipeline).to_list(length=1)

            if result:
                data = result[0]

                # Process type counts
                images_by_type: Dict[str, int] = {}
                images_by_content_type: Dict[str, int] = {}

                for item in data["images_by_type"]:
                    upload_type = item["upload_type"]
                    content_type = item["content_type"]

                    images_by_type[upload_type] = images_by_type.get(upload_type, 0) + 1
                    images_by_content_type[content_type] = (
                        images_by_content_type.get(content_type, 0) + 1
                    )

                return ImageStatsModel(
                    total_images=data["total_images"],
                    total_size=data["total_size"],
                    images_by_type=images_by_type,
                    images_by_content_type=images_by_content_type,
                )

            return ImageStatsModel()
        except Exception as e:
            print(f"Error getting image stats: {e}")
            return ImageStatsModel()

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


# Global instance
image_service = ImageService()

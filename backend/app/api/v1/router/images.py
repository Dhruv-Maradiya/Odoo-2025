"""
Image API endpoints for file upload and management.
"""

from typing import Optional

from app.api.v1.dependencies import get_current_user
from app.models.image_models import (
    ImageFilterRequest,
    ImageListResponse,
    ImageModel,
    ImageStatsModel,
    ImageUploadRequest,
    ImageUploadResponse,
)
from app.models.user_models import CurrentUserModel
from app.services.image_service import image_service
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

router = APIRouter()


@router.post(
    "/upload",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    file: UploadFile = File(...),
    upload_type: str = Query(
        "general", description="Type of upload: questions, answers, profiles, general"
    ),
    related_id: Optional[str] = Query(None, description="ID of related entity"),
    current_user: CurrentUserModel = Depends(get_current_user),
) -> ImageUploadResponse:
    """Upload an image file."""

    upload_request = ImageUploadRequest(upload_type=upload_type, related_id=related_id)

    try:
        image_response = await image_service.upload_image(
            file=file, upload_request=upload_request, user_id=current_user.user_id
        )

        if not image_response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to upload image"
            )

        return image_response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}",
        )


@router.get("/images", response_model=ImageListResponse)
async def list_images(
    upload_type: Optional[str] = Query(None, description="Filter by upload type"),
    related_id: Optional[str] = Query(None, description="Filter by related entity ID"),
    content_type: Optional[str] = Query(None, description="Filter by content type"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: CurrentUserModel = Depends(get_current_user),
) -> ImageListResponse:
    """List user's uploaded images with filters."""

    filters = ImageFilterRequest(
        upload_type=upload_type,
        related_id=related_id,
        content_type=content_type,
        page=page,
        limit=limit,
    )

    images = await image_service.list_images(
        filters=filters, user_id=current_user.user_id
    )

    if not images:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No images found"
        )

    return images


@router.get("/images/{image_id}", response_model=ImageModel)
async def get_image(
    image_id: str,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> ImageModel:
    """Get a specific image by ID."""

    image = await image_service.get_image_by_id(image_id)

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Image not found"
        )

    # Check if user owns the image (or is admin)
    if image.uploaded_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this image",
        )

    return image


@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    image_id: str,
    current_user: CurrentUserModel = Depends(get_current_user),
):
    """Delete an image."""

    success = await image_service.delete_image(
        image_id=image_id, user_id=current_user.user_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found or you don't have permission to delete it",
        )


@router.get("/images/stats", response_model=ImageStatsModel)
async def get_image_stats(
    current_user: CurrentUserModel = Depends(get_current_user),
) -> ImageStatsModel:
    """Get image statistics for the current user."""

    stats = await image_service.get_image_stats(current_user.user_id)

    if not stats:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get image statistics",
        )

    return stats


@router.get("/images/all/stats", response_model=ImageStatsModel)
async def get_all_image_stats(
    current_user: CurrentUserModel = Depends(get_current_user),
) -> ImageStatsModel:
    """Get image statistics for all users (Admin only)."""

    # In a real app, you'd check if user is admin
    # For now, we'll return user's stats
    stats = await image_service.get_image_stats()

    if not stats:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get image statistics",
        )

    return stats

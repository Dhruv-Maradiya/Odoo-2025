"""
User management endpoints for admin and user operations.
"""

from typing import List

from app.api.v1.dependencies import (
    get_current_user,
    require_role,
)
from app.db.mongodb.collections import users_collection
from app.models.image_models import ImageUploadRequest
from app.models.user_models import CurrentUserModel, UserRole
from app.services.image_service import image_service
from app.services.user_service import get_user_by_id
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

router = APIRouter()


@router.get("/me", response_model=CurrentUserModel)
async def get_my_profile(current_user: CurrentUserModel = Depends(get_current_user)):
    """Get current user's profile information."""
    return current_user


@router.get("/", response_model=List[dict])
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """List all users (requires ADMIN role or higher)."""
    try:
        skip = (page - 1) * limit

        cursor = users_collection.find({}, {"password": 0}).skip(skip).limit(limit)
        users = []

        async for user in cursor:
            user["_id"] = str(user["_id"])
            users.append(user)

        total_users = await users_collection.count_documents({})

        return {
            "users": users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_users,
                "pages": (total_users + limit - 1) // limit,
            },
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users",
        )


@router.get("/{user_id}", response_model=dict)
async def get_user_by_id_endpoint(
    user_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Get user by ID (requires ADMIN role or higher)."""
    try:
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Remove password from response
        user.pop("password", None)
        return user

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user",
        )


@router.delete("/{user_id}", response_model=dict)
async def delete_user(
    user_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Delete user by ID (requires ADMIN role or higher)."""
    try:
        # Prevent self-deletion
        if user_id == current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account",
            )

        # Check if user exists
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Delete user
        result = await users_collection.delete_one({"_id": ObjectId(user_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        return {"message": "User deleted successfully"}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user",
        )


@router.post("/{user_id}/deactivate", response_model=dict)
async def deactivate_user(
    user_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Deactivate user account (requires ADMIN role or higher)."""
    try:
        # Prevent self-deactivation
        if user_id == current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account",
            )

        # Check if user exists
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Deactivate user
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": {"is_active": False}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=404, detail="User not found or already deactivated"
            )

        return {"message": "User deactivated successfully"}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate user",
        )


@router.post("/{user_id}/activate", response_model=dict)
async def activate_user(
    user_id: str,
    current_user: CurrentUserModel = Depends(require_role(UserRole.ADMIN)),
):
    """Activate user account (requires ADMIN role or higher)."""
    try:
        # Check if user exists
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Activate user
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": {"is_active": True}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=404, detail="User not found or already activated"
            )

        return {"message": "User activated successfully"}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate user",
        )


@router.post(
    "/{user_id}/upload-image",
)
async def upload_user_image(
    user_id: str,
    file: UploadFile = File(...),
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
):
    """Upload an image for a user (requires ADMIN role or higher)."""
    try:
        upload_data = await image_service.upload_image(
            file=file,
            upload_request=ImageUploadRequest(
                upload_type="profile", related_id=user_id
            ),
            user_id=user_id,
        )

        if not upload_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to upload image"
            )

        # Update user with image URL
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": {"image_url": upload_data.url}}
        )

        return {"message": "Image uploaded successfully", "user": result}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}",
        )


@router.put(
    "/{user_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
async def update_user(
    user_id: str,
    user_data: dict,
    current_user: CurrentUserModel = Depends(require_role(UserRole.USER)),
):
    """Update user information (requires ADMIN role or higher)."""
    try:
        user_id = str(user_id)

        # Update user data
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": user_data}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=404, detail="User not found or no changes made"
            )

        return {"message": "User updated successfully"}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user",
        )

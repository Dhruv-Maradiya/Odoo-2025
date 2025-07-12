from datetime import datetime, timezone
from typing import Optional

from app.config.loggers import app_logger as logger
from app.db.mongodb.collections import users_collection
from app.db.redis import set_cache
from app.models.user_models import ROLE_PERMISSIONS, UserRole
from app.utils.auth_utils import AuthUtils
from bson import ObjectId
from fastapi import HTTPException


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID from database."""
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}")
        raise HTTPException(status_code=404, detail="User not found")


async def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email from database."""
    try:
        user = await users_collection.find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception as e:
        logger.error(f"Error fetching user by email {email}: {e}")
        raise HTTPException(status_code=404, detail="User not found")


async def update_user_profile(
    user_id: str,
    name: Optional[str] = None,
    picture_data: Optional[bytes] = None,
    data: Optional[dict] = None,
) -> dict:
    """
    Update user profile information.

    Args:
        user_id: User ID
        name: New name (optional)
        picture_data: New profile picture data (optional)

    Returns:
        Updated user data
    """
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        update_data: dict = (
            {"updated_at": datetime.now(timezone.utc), **data}
            if data
            else {"updated_at": datetime.now(timezone.utc)}
        )

        # Update name if provided
        if name is not None and name.strip():
            update_data["name"] = name.strip()

        # Update database
        await users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": update_data}
        )

        # Clear user cache
        cache_key = f"user_cache:{user.get('email')}"
        await set_cache(cache_key, None, 0)  # Clear cache

        # Fetch and return updated user
        updated_user = await get_user_by_id(user_id)

        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found after update")

        return {
            "user_id": updated_user["_id"],
            "name": updated_user.get("name"),
            "email": updated_user.get("email"),
            "updated_at": updated_user.get("updated_at"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


async def create_user(
    email: str, password: str, name: str, role: UserRole = UserRole.USER
) -> dict:
    """Create a new user with email and password."""
    try:
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": email})
        if existing_user:
            raise HTTPException(
                status_code=400, detail="User with this email already exists"
            )

        # Hash password
        hashed_password = AuthUtils.hash_password(password)

        # Create user document
        user_data = {
            "email": email,
            "name": name,
            "password": hashed_password,
            "role": role.value,
            "permissions": [p.value for p in ROLE_PERMISSIONS.get(role, [])],
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        # Insert user
        result = await users_collection.insert_one(user_data)

        # Return user data without password
        user_data["_id"] = str(result.inserted_id)
        user_data.pop("password", None)

        return user_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Authenticate user with email and password."""
    try:
        user = await users_collection.find_one({"email": email})
        if not user:
            return None

        if not AuthUtils.verify_password(password, user["password"]):
            return None

        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="User account is disabled")

        # Return user data without password
        user["_id"] = str(user["_id"])
        user.pop("password", None)
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        return None


async def change_user_password(
    user_id: str, old_password: str, new_password: str
) -> bool:
    """Change user's password."""
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify old password
        if not AuthUtils.verify_password(old_password, user["password"]):
            raise HTTPException(status_code=400, detail="Invalid current password")

        # Hash new password
        new_hashed_password = AuthUtils.hash_password(new_password)

        # Update password
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password": new_hashed_password,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        return True

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(status_code=500, detail="Failed to change password")


async def update_user_role(user_id: str, new_role: UserRole, updated_by: str) -> dict:
    """Update user's role and permissions (admin only)."""
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update role and permissions
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "role": new_role.value,
                    "permissions": [
                        p.value for p in ROLE_PERMISSIONS.get(new_role, [])
                    ],
                    "updated_at": datetime.now(timezone.utc),
                    "updated_by": updated_by,
                }
            },
        )

        # Return updated user
        updated_user = await get_user_by_id(user_id)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found after update")
        return updated_user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user role")

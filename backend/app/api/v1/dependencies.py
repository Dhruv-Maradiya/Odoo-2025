"""
Centralized authentication and authorization dependencies.
Consolidated from app/dependencies/auth.py and other dependency files.
"""

from typing import Annotated, Optional

from app.config.loggers import app_logger as logger
from app.models.user_models import CurrentUserModel, UserRole
from app.services.user_service import get_user_by_id
from app.utils.auth_utils import AuthUtils
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Security scheme for JWT Bearer token
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> CurrentUserModel:
    """
    Get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        CurrentUserModel: The authenticated user

    Raises:
        HTTPException: If token is invalid or user not found
    """
    try:
        token = credentials.credentials
        payload = AuthUtils.decode_jwt_token(token)

        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
            )

        user = await get_user_by_id(str(user_id))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
            )

        return CurrentUserModel(
            user_id=user["_id"],
            name=user["name"],
            email=user["email"],
            role=UserRole(user["role"]),
            permissions=user.get("permissions", []),
            is_active=user.get("is_active", True),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
) -> Optional[CurrentUserModel]:
    """
    Get current user if authenticated, None otherwise.
    Useful for endpoints that can work with or without authentication.

    Args:
        credentials: Optional HTTP Bearer token credentials

    Returns:
        CurrentUserModel or None: The authenticated user or None if not authenticated
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_role(minimum_role: UserRole):
    """
    Dependency factory that creates a dependency requiring minimum role level.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(
            user: CurrentUserModel = Depends(require_role(UserRole.ADMIN))
        ):
            return {"message": "Only admins can see this"}

    Args:
        minimum_role: The minimum role required to access the endpoint

    Returns:
        A dependency function that checks user role
    """

    async def check_role(
        current_user: CurrentUserModel = Depends(get_current_user),
    ) -> CurrentUserModel:
        user_role = UserRole(current_user.role)

        if not user_role.has_minimum_role(minimum_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required: {minimum_role.value} (level {minimum_role.get_level()}) or higher. Your role: {user_role.value} (level {user_role.get_level()})",
            )

        logger.info(
            f"User {current_user.email} ({user_role.value}) accessed endpoint requiring {minimum_role.value}"
        )
        return current_user

    return check_role


def require_active_user():
    """
    Dependency that ensures the user is authenticated and active.

    Returns:
        A dependency function that checks if user is active
    """

    async def check_active(
        current_user: CurrentUserModel = Depends(get_current_user),
    ) -> CurrentUserModel:
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive. Please contact support.",
            )
        return current_user

    return check_active


def require_permissions(required_permissions: list[str]):
    """
    Dependency factory that creates a dependency requiring specific permissions.

    Usage:
        @router.get("/special-action")
        async def special_endpoint(
            user: CurrentUserModel = Depends(require_permissions(["read:reports", "write:data"]))
        ):
            return {"message": "User has required permissions"}

    Args:
        required_permissions: List of permissions required to access the endpoint

    Returns:
        A dependency function that checks user permissions
    """

    async def check_permissions(
        current_user: CurrentUserModel = Depends(get_current_user),
    ) -> CurrentUserModel:
        user_permissions = set(current_user.permissions)
        missing_permissions = set(required_permissions) - user_permissions

        if missing_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permissions: {', '.join(missing_permissions)}",
            )

        logger.info(
            f"User {current_user.email} accessed endpoint requiring permissions: {required_permissions}"
        )
        return current_user

    return check_permissions


# Pre-defined dependencies for common role requirements
RequireGuest = Depends(require_role(UserRole.GUEST))
RequireUser = Depends(require_role(UserRole.USER))
RequireAdmin = Depends(require_role(UserRole.ADMIN))

# Pre-defined dependency for active users
RequireActiveUser = Depends(require_active_user())

# Alias for backward compatibility and convenience
GetCurrentUser = Depends(get_current_user)
GetOptionalUser = Depends(get_optional_user)

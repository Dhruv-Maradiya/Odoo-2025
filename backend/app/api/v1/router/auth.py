"""
Authentication endpoints for user registration, login, and password management.
"""

from datetime import timedelta

from app.api.v1.dependencies import get_current_user
from app.config.settings import settings
from app.models.user_models import (
    CurrentUserModel,
    UserLoginRequest,
    UserLoginResponse,
    UserPasswordChangeRequest,
    UserRegistrationRequest,
    UserRole,
)
from app.services.user_service import (
    authenticate_user,
    change_user_password,
    create_user,
    get_user_by_id,
)
from app.utils.auth_utils import AuthUtils
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

router = APIRouter()
security = HTTPBearer()


@router.post(
    "/register", response_model=UserLoginResponse, status_code=status.HTTP_201_CREATED
)
async def register_user(user_data: UserRegistrationRequest):
    """Register a new user with email and password and return JWT tokens."""
    try:
        user = await create_user(
            email=user_data.email,
            password=user_data.password,
            name=user_data.name,
            role=UserRole.USER,
        )

        # Generate tokens immediately after registration
        access_token_expires = timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
        access_token = AuthUtils.generate_jwt_token(
            user_id=user["_id"],
            email=user["email"],
            role=user["role"],
            expires_delta=access_token_expires,
        )

        refresh_token = AuthUtils.generate_refresh_token(user["_id"])

        return UserLoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": user["_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "permissions": user.get("permissions", []),
            },
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post("/login", response_model=UserLoginResponse)
async def login_user(login_data: UserLoginRequest):
    """Authenticate user and return JWT tokens."""
    try:
        user = await authenticate_user(login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        # Generate tokens
        access_token_expires = timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
        access_token = AuthUtils.generate_jwt_token(
            user_id=user["_id"],
            email=user["email"],
            role=user["role"],
            expires_delta=access_token_expires,
        )

        refresh_token = AuthUtils.generate_refresh_token(user["_id"])

        return UserLoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": user["_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "permissions": user.get("permissions", []),
            },
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed"
        )


@router.get("/me", response_model=CurrentUserModel)
async def get_current_user_profile(
    current_user: CurrentUserModel = Depends(get_current_user),
):
    """Get current user's profile information."""
    return current_user


@router.post("/change-password", response_model=dict)
async def change_password(
    password_data: UserPasswordChangeRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
):
    """Change current user's password."""
    try:
        success = await change_user_password(
            user_id=current_user.user_id,
            old_password=password_data.current_password,
            new_password=password_data.new_password,
        )

        if success:
            return {"message": "Password changed successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to change password",
            )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed",
        )


@router.post("/refresh", response_model=dict)
async def refresh_access_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Refresh access token using refresh token."""
    try:
        refresh_token = credentials.credentials
        payload = AuthUtils.decode_jwt_token(refresh_token)

        # Check if it's a refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )

        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
            )

        user = await get_user_by_id(str(user_id))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
            )

        # Generate new access token
        access_token_expires = timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
        new_access_token = AuthUtils.generate_jwt_token(
            user_id=user["_id"],
            email=user["email"],
            role=user["role"],
            expires_delta=access_token_expires,
        )

        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token refresh failed"
        )

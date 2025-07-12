import re
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRole(str, Enum):
    GUEST = "guest"
    USER = "user"
    ADMIN = "admin"

    def get_level(self) -> int:
        """Get the hierarchical level of the role."""
        role_levels = {
            UserRole.GUEST: 1,
            UserRole.USER: 2,
            UserRole.ADMIN: 3,
        }
        return role_levels.get(self, 0)

    def has_minimum_role(self, required_role: "UserRole") -> bool:
        """Check if this role has the minimum required role level."""
        return self.get_level() >= required_role.get_level()

    @classmethod
    def from_level(cls, level: int) -> "UserRole":
        """Get role from level number."""
        level_to_role = {
            1: cls.GUEST,
            2: cls.USER,
            3: cls.ADMIN,
        }
        return level_to_role.get(level, cls.GUEST)


class Permission(str, Enum):
    # Basic permissions for GUEST
    READ_PUBLIC = "read:public"

    # USER level permissions
    READ_PROFILE = "read:profile"
    WRITE_PROFILE = "write:profile"
    READ_OWN_DATA = "read:own_data"
    WRITE_OWN_DATA = "write:own_data"

    # ADMIN level permissions
    READ_USERS = "read:users"
    WRITE_USERS = "write:users"
    DELETE_USERS = "delete:users"
    ADMIN_ACCESS = "admin:access"
    SYSTEM_CONFIG = "system:config"


# Role-based permissions mapping
ROLE_PERMISSIONS = {
    UserRole.GUEST: [
        Permission.READ_PUBLIC,
    ],
    UserRole.USER: [
        Permission.READ_PUBLIC,
        Permission.READ_PROFILE,
        Permission.WRITE_PROFILE,
        Permission.READ_OWN_DATA,
        Permission.WRITE_OWN_DATA,
    ],
    UserRole.ADMIN: [
        Permission.READ_PUBLIC,
        Permission.READ_PROFILE,
        Permission.WRITE_PROFILE,
        Permission.READ_OWN_DATA,
        Permission.WRITE_OWN_DATA,
        Permission.READ_USERS,
        Permission.WRITE_USERS,
        Permission.DELETE_USERS,
        Permission.ADMIN_ACCESS,
        Permission.SYSTEM_CONFIG,
    ],
}


class CurrentUserModel(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    user_id: str = Field(..., description="Unique identifier for the user")
    name: str = Field(..., description="Name of the user")
    email: str = Field(..., description="Email address of the user")
    role: UserRole = Field(default=UserRole.USER, description="User role")
    permissions: List[Permission] = Field(default=[], description="User permissions")
    cached_at: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp when the user data was cached",
    )
    picture: Optional[str] = Field(
        default=None, description="URL of the user's profile picture"
    )
    is_active: bool = Field(default=True, description="Indicates if the user is active")


class UserRegistrationRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, max_length=100, description="Password")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if not re.match(r"^[a-zA-Z\s\-\'\.]+$", v):
            raise ValueError(
                "Name can only contain letters, spaces, hyphens, apostrophes, and periods"
            )
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., description="Password")


class UserLoginResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry time in seconds")
    user: dict = Field(..., description="User information")


class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, description="New name for the user")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
            if not re.match(r"^[a-zA-Z\s\-\'\.]+$", v):
                raise ValueError(
                    "Name can only contain letters, spaces, hyphens, apostrophes, and periods"
                )
        return v


class UserUpdateResponse(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user")
    name: str = Field(..., description="Name of the user")
    email: str = Field(..., description="Email address of the user")
    role: UserRole = Field(..., description="User role")
    picture: Optional[str] = Field(
        None, description="URL of the user's profile picture"
    )
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class UserPasswordChangeRequest(BaseModel):
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ..., min_length=8, max_length=100, description="New password"
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ..., min_length=8, max_length=100, description="New password"
    )

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


class SavedPostType(str, Enum):
    """Type of saved post."""

    QUESTION = "question"
    ANSWER = "answer"


class SavedPostModel(BaseModel):
    """Model for a saved post."""

    model_config = ConfigDict(from_attributes=True)

    saved_id: str = Field(..., description="Unique identifier for the saved post")
    user_id: str = Field(..., description="ID of the user who saved the post")
    post_id: str = Field(..., description="ID of the saved question or answer")
    post_type: SavedPostType = Field(..., description="Type of the saved post")
    saved_at: datetime = Field(..., description="When the post was saved")
    notes: Optional[str] = Field(
        None, description="Optional user notes about the saved post"
    )


class SavePostRequest(BaseModel):
    """Request to save a post."""

    post_id: str = Field(..., description="ID of the question or answer to save")
    post_type: SavedPostType = Field(..., description="Type of the post to save")
    notes: Optional[str] = Field(
        None, max_length=500, description="Optional notes about the saved post"
    )


class UpdateSavedPostRequest(BaseModel):
    """Request to update a saved post."""

    notes: Optional[str] = Field(
        None, max_length=500, description="Updated notes about the saved post"
    )


class SavedPostWithContent(BaseModel):
    """Saved post with the actual content."""

    model_config = ConfigDict(from_attributes=True)

    saved_id: str = Field(..., description="Unique identifier for the saved post")
    user_id: str = Field(..., description="ID of the user who saved the post")
    post_id: str = Field(..., description="ID of the saved question or answer")
    post_type: SavedPostType = Field(..., description="Type of the saved post")
    saved_at: datetime = Field(..., description="When the post was saved")
    notes: Optional[str] = Field(None, description="User notes about the saved post")

    # Content fields (populated based on post_type)
    title: Optional[str] = Field(
        None, description="Title of the question (if post_type is question)"
    )
    content: str = Field(..., description="Content of the question/answer")
    author_name: str = Field(..., description="Name of the post author")
    created_at: datetime = Field(..., description="When the original post was created")
    tags: Optional[List[str]] = Field(
        None, description="Tags of the question (if applicable)"
    )


class SavedPostsResponse(BaseModel):
    """Response for saved posts list."""

    saved_posts: List[SavedPostWithContent]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool

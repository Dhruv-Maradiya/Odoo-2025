"""
Notification system models for managing user notifications.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    """Types of notifications."""

    QUESTION_ANSWERED = "question_answered"
    ANSWER_COMMENTED = "answer_commented"
    USER_MENTIONED = "user_mentioned"
    ANSWER_ACCEPTED = "answer_accepted"
    QUESTION_UPVOTED = "question_upvoted"
    ANSWER_UPVOTED = "answer_upvoted"
    NEW_FOLLOWER = "new_follower"
    SYSTEM_ANNOUNCEMENT = "system_announcement"


class NotificationPriority(str, Enum):
    """Notification priority levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# Request Models
class NotificationCreateRequest(BaseModel):
    """Request model for creating a notification."""

    user_id: str
    type: NotificationType
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=1000)
    related_id: Optional[str] = None  # question_id, answer_id, etc.
    priority: NotificationPriority = NotificationPriority.MEDIUM
    action_url: Optional[str] = None


class NotificationUpdateRequest(BaseModel):
    """Request model for updating a notification."""

    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None


class NotificationMarkAllReadRequest(BaseModel):
    """Request model for marking all notifications as read."""

    notification_ids: Optional[List[str]] = None  # If None, mark all as read


class NotificationPreferencesRequest(BaseModel):
    """Request model for updating notification preferences."""

    email_notifications: bool = True
    push_notifications: bool = True
    notification_types: List[NotificationType] = Field(default_factory=list)


# Response Models
class NotificationModel(BaseModel):
    """Notification model."""

    notification_id: str
    user_id: str
    type: NotificationType
    title: str
    message: str
    related_id: Optional[str] = None
    priority: NotificationPriority
    action_url: Optional[str] = None
    is_read: bool = False
    is_archived: bool = False
    created_at: datetime
    read_at: Optional[datetime] = None


class NotificationCountModel(BaseModel):
    """Notification count model."""

    total: int
    unread: int
    archived: int
    by_priority: dict = Field(default_factory=dict)


class NotificationListResponse(BaseModel):
    """Response model for notification listing."""

    notifications: List[NotificationModel]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool


class NotificationPreferencesModel(BaseModel):
    """User notification preferences model."""

    user_id: str
    email_notifications: bool = True
    push_notifications: bool = True
    notification_types: List[NotificationType] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None


# Filter Models
class NotificationFilterRequest(BaseModel):
    """Request model for filtering notifications."""

    type: Optional[NotificationType] = None
    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None
    priority: Optional[NotificationPriority] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


# Statistics Models
class NotificationStatsModel(BaseModel):
    """Notification statistics model."""

    user_id: str
    total_notifications: int = 0
    unread_notifications: int = 0
    notifications_by_type: dict = Field(default_factory=dict)
    last_notification_at: Optional[datetime] = None
    avg_response_time: Optional[float] = None  # Average time to read notifications

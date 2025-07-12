"""
Notification API endpoints for managing user notifications.
"""

from typing import List, Optional

from app.api.v1.dependencies import get_current_user
from app.models.notification_models import (
    NotificationCountModel,
    NotificationCreateRequest,
    NotificationFilterRequest,
    NotificationListResponse,
    NotificationModel,
    NotificationPreferencesModel,
    NotificationPreferencesRequest,
    NotificationType,
    NotificationUpdateRequest,
)
from app.models.user_models import CurrentUserModel
from app.services.notification_service import NotificationService
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter()

# Initialize service
notification_service = NotificationService()


@router.post(
    "/notifications",
    response_model=NotificationModel,
    status_code=status.HTTP_201_CREATED,
)
async def create_notification(
    notification_data: NotificationCreateRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> NotificationModel:
    """Create a new notification (Admin only)."""
    # In a real app, you'd check if user is admin
    notification = await notification_service.create_notification(notification_data)

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create notification",
        )

    return notification


@router.get("/notifications", response_model=NotificationListResponse)
async def get_notifications(
    type: Optional[NotificationType] = Query(
        None, description="Filter by notification type"
    ),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_archived: Optional[bool] = Query(None, description="Filter by archived status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: CurrentUserModel = Depends(get_current_user),
) -> NotificationListResponse:
    """Get user notifications with filters."""
    filters = NotificationFilterRequest(
        type=type, is_read=is_read, is_archived=is_archived, page=page, limit=limit
    )

    notifications = await notification_service.get_user_notifications(
        user_id=current_user.user_id, filters=filters
    )

    if not notifications:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No notifications found"
        )

    return notifications


@router.get("/notifications/{notification_id}", response_model=NotificationModel)
async def get_notification(
    notification_id: str,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> NotificationModel:
    """Get a specific notification."""
    notification = await notification_service.get_notification_by_id(
        notification_id=notification_id, user_id=current_user.user_id
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    return notification


@router.patch("/notifications/{notification_id}", response_model=NotificationModel)
async def update_notification(
    notification_id: str,
    update_data: NotificationUpdateRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> NotificationModel:
    """Update a notification (mark as read/unread, archive/unarchive)."""
    notification = await notification_service.update_notification(
        notification_id=notification_id,
        user_id=current_user.user_id,
        update_data=update_data,
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or no changes made",
        )

    return notification


@router.delete(
    "/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_notification(
    notification_id: str,
    current_user: CurrentUserModel = Depends(get_current_user),
):
    """Delete a notification."""
    success = await notification_service.delete_notification(
        notification_id=notification_id, user_id=current_user.user_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )


@router.post("/notifications/mark-read", status_code=status.HTTP_200_OK)
async def mark_notifications_read(
    notification_ids: Optional[List[str]] = None,
    current_user: CurrentUserModel = Depends(get_current_user),
):
    """Mark notifications as read. If no IDs provided, marks all as read."""
    success = await notification_service.mark_notifications_as_read(
        user_id=current_user.user_id, notification_ids=notification_ids
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to mark notifications as read",
        )

    return {"message": "Notifications marked as read"}


@router.get("/notifications/count", response_model=NotificationCountModel)
async def get_notification_count(
    current_user: CurrentUserModel = Depends(get_current_user),
) -> NotificationCountModel:
    """Get notification counts for the current user."""
    counts = await notification_service.get_notification_count(current_user.user_id)

    return NotificationCountModel(
        total=counts["total"],
        unread=counts["unread"],
        archived=counts["archived"],
        by_priority=counts["by_priority"],
    )


@router.post(
    "/notifications/preferences",
    response_model=NotificationPreferencesModel,
    status_code=status.HTTP_201_CREATED,
)
async def create_notification_preferences(
    preferences: NotificationPreferencesRequest,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> NotificationPreferencesModel:
    """Create or update notification preferences."""
    user_preferences = await notification_service.create_user_preferences(
        user_id=current_user.user_id, preferences=preferences
    )

    if not user_preferences:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create notification preferences",
        )

    return user_preferences


@router.get("/notifications/preferences", response_model=NotificationPreferencesModel)
async def get_notification_preferences(
    current_user: CurrentUserModel = Depends(get_current_user),
) -> NotificationPreferencesModel:
    """Get user notification preferences."""
    preferences = await notification_service.get_user_preferences(current_user.user_id)

    if not preferences:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification preferences not found",
        )

    return preferences


# Helper endpoints for creating common notifications
@router.post(
    "/notifications/system",
    response_model=NotificationModel,
    status_code=status.HTTP_201_CREATED,
)
async def create_system_notification(
    title: str,
    message: str,
    target_user_id: str,
    current_user: CurrentUserModel = Depends(get_current_user),
) -> NotificationModel:
    """Create a system notification (Admin only)."""
    # In a real app, you'd check if user is admin
    notification = await notification_service.create_system_notification(
        user_id=target_user_id, title=title, message=message
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create system notification",
        )

    return notification

"""
Notification service layer for managing user notifications with email integration.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.mongodb.collections import mongodb_instance
from app.models.notification_models import (
    NotificationCreateRequest,
    NotificationFilterRequest,
    NotificationListResponse,
    NotificationModel,
    NotificationPreferencesModel,
    NotificationPreferencesRequest,
    NotificationPriority,
    NotificationStatsModel,
    NotificationType,
    NotificationUpdateRequest,
)
from pymongo import DESCENDING


class NotificationService:
    """Service class for notification operations with email integration."""

    def __init__(self):
        self.db = mongodb_instance
        self.notifications = self.db.get_collection("notifications")
        self.notification_preferences = self.db.get_collection(
            "notification_preferences"
        )
        self.notification_stats = self.db.get_collection("notification_stats")
        self.users = self.db.get_collection("users")  # For user email lookup

    async def create_notification(
        self, notification_data: NotificationCreateRequest, send_email: bool = True
    ) -> Optional[NotificationModel]:
        """Create a new notification and optionally send email."""
        notification_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        notification_doc = {
            "_id": notification_id,
            "user_id": notification_data.user_id,
            "type": notification_data.type.value,
            "title": notification_data.title,
            "message": notification_data.message,
            "related_id": notification_data.related_id,
            "priority": notification_data.priority.value,
            "action_url": notification_data.action_url,
            "is_read": False,
            "is_archived": False,
            "created_at": now,
            "read_at": None,
        }

        try:
            await self.notifications.insert_one(notification_doc)

            # Update user notification stats
            await self._update_notification_stats(
                notification_data.user_id, notification_data.type
            )

            return NotificationModel(
                notification_id=notification_id,
                user_id=notification_data.user_id,
                type=notification_data.type,
                title=notification_data.title,
                message=notification_data.message,
                related_id=notification_data.related_id,
                priority=notification_data.priority,
                action_url=notification_data.action_url,
                is_read=False,
                is_archived=False,
                created_at=now,
                read_at=None,
            )
        except Exception as e:
            print(f"Error creating notification: {e}")
            return None

    async def get_user_notifications(
        self, user_id: str, filters: NotificationFilterRequest
    ) -> Optional[NotificationListResponse]:
        """Get notifications for a user with filters."""
        try:
            # Build query
            query: Dict[str, Any] = {"user_id": user_id}

            if filters.type:
                query["type"] = filters.type.value
            if filters.is_read is not None:
                query["is_read"] = filters.is_read
            if filters.is_archived is not None:
                query["is_archived"] = filters.is_archived
            if filters.priority:
                query["priority"] = filters.priority.value
            if filters.date_from or filters.date_to:
                date_query: Dict[str, Any] = {}
                if filters.date_from:
                    date_query["$gte"] = filters.date_from
                if filters.date_to:
                    date_query["$lte"] = filters.date_to
                query["created_at"] = date_query

            # Get total count
            total = await self.notifications.count_documents(query)

            # Calculate pagination
            skip = (filters.page - 1) * filters.limit
            has_next = skip + filters.limit < total
            has_prev = filters.page > 1

            # Get notifications
            cursor = (
                self.notifications.find(query)
                .sort("created_at", DESCENDING)
                .skip(skip)
                .limit(filters.limit)
            )
            notifications_docs = await cursor.to_list(length=filters.limit)

            notifications = []
            for doc in notifications_docs:
                notifications.append(
                    NotificationModel(
                        notification_id=doc["_id"],
                        user_id=doc["user_id"],
                        type=NotificationType(doc["type"]),
                        title=doc["title"],
                        message=doc["message"],
                        related_id=doc.get("related_id"),
                        priority=NotificationPriority(doc["priority"]),
                        action_url=doc.get("action_url"),
                        is_read=doc["is_read"],
                        is_archived=doc["is_archived"],
                        created_at=doc["created_at"],
                        read_at=doc.get("read_at"),
                    )
                )

            return NotificationListResponse(
                notifications=notifications,
                total=total,
                page=filters.page,
                limit=filters.limit,
                has_next=has_next,
                has_prev=has_prev,
            )
        except Exception as e:
            print(f"Error getting notifications: {e}")
            return None

    async def update_notification(
        self, notification_id: str, user_id: str, update_data: NotificationUpdateRequest
    ) -> Optional[NotificationModel]:
        """Update a notification."""
        try:
            update_doc: Dict[str, Any] = {}

            if update_data.is_read is not None:
                update_doc["is_read"] = update_data.is_read
                if update_data.is_read:
                    update_doc["read_at"] = datetime.now(timezone.utc)
                else:
                    update_doc["read_at"] = None

            if update_data.is_archived is not None:
                update_doc["is_archived"] = update_data.is_archived

            if not update_doc:
                return None

            result = await self.notifications.update_one(
                {"_id": notification_id, "user_id": user_id}, {"$set": update_doc}
            )

            if result.modified_count > 0:
                # Get updated notification
                return await self.get_notification_by_id(notification_id, user_id)

            return None
        except Exception as e:
            print(f"Error updating notification: {e}")
            return None

    async def get_notification_by_id(
        self, notification_id: str, user_id: str
    ) -> Optional[NotificationModel]:
        """Get a specific notification by ID."""
        try:
            doc = await self.notifications.find_one(
                {"_id": notification_id, "user_id": user_id}
            )

            if doc:
                return NotificationModel(
                    notification_id=doc["_id"],
                    user_id=doc["user_id"],
                    type=NotificationType(doc["type"]),
                    title=doc["title"],
                    message=doc["message"],
                    related_id=doc.get("related_id"),
                    priority=NotificationPriority(doc["priority"]),
                    action_url=doc.get("action_url"),
                    is_read=doc["is_read"],
                    is_archived=doc["is_archived"],
                    created_at=doc["created_at"],
                    read_at=doc.get("read_at"),
                )

            return None
        except Exception as e:
            print(f"Error getting notification: {e}")
            return None

    async def mark_notifications_as_read(
        self, user_id: str, notification_ids: Optional[List[str]] = None
    ) -> bool:
        """Mark notifications as read."""
        try:
            query = {"user_id": user_id, "is_read": False}

            if notification_ids:
                query["_id"] = {"$in": notification_ids}

            result = await self.notifications.update_many(
                query,
                {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}},
            )

            return result.modified_count > 0
        except Exception as e:
            print(f"Error marking notifications as read: {e}")
            return False

    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification."""
        try:
            result = await self.notifications.delete_one(
                {"_id": notification_id, "user_id": user_id}
            )
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting notification: {e}")
            return False

    async def get_notification_count(self, user_id: str) -> Dict[str, Any]:
        """Get notification counts for a user."""
        try:
            # Total notifications
            total = await self.notifications.count_documents({"user_id": user_id})

            # Unread notifications
            unread = await self.notifications.count_documents(
                {"user_id": user_id, "is_read": False}
            )

            # Archived notifications
            archived = await self.notifications.count_documents(
                {"user_id": user_id, "is_archived": True}
            )

            # Count by priority
            by_priority = {}
            for priority in NotificationPriority:
                count = await self.notifications.count_documents(
                    {"user_id": user_id, "priority": priority.value, "is_read": False}
                )
                by_priority[priority.value] = count

            return {
                "total": total,
                "unread": unread,
                "archived": archived,
                "by_priority": by_priority,
            }
        except Exception as e:
            print(f"Error getting notification count: {e}")
            return {"total": 0, "unread": 0, "archived": 0, "by_priority": {}}

    async def create_user_preferences(
        self, user_id: str, preferences: NotificationPreferencesRequest
    ) -> Optional[NotificationPreferencesModel]:
        """Create or update user notification preferences."""
        now = datetime.now(timezone.utc)

        preferences_doc = {
            "_id": user_id,
            "user_id": user_id,
            "email_notifications": preferences.email_notifications,
            "push_notifications": preferences.push_notifications,
            "notification_types": [nt.value for nt in preferences.notification_types],
            "created_at": now,
            "updated_at": now,
        }

        try:
            await self.notification_preferences.replace_one(
                {"_id": user_id}, preferences_doc, upsert=True
            )

            return NotificationPreferencesModel(
                user_id=user_id,
                email_notifications=preferences.email_notifications,
                push_notifications=preferences.push_notifications,
                notification_types=preferences.notification_types,
                created_at=now,
                updated_at=now,
            )
        except Exception as e:
            print(f"Error creating notification preferences: {e}")
            return None

    async def get_user_preferences(
        self, user_id: str
    ) -> Optional[NotificationPreferencesModel]:
        """Get user notification preferences."""
        try:
            doc = await self.notification_preferences.find_one({"_id": user_id})

            if doc:
                return NotificationPreferencesModel(
                    user_id=doc["user_id"],
                    email_notifications=doc["email_notifications"],
                    push_notifications=doc["push_notifications"],
                    notification_types=[
                        NotificationType(nt) for nt in doc["notification_types"]
                    ],
                    created_at=doc["created_at"],
                    updated_at=doc.get("updated_at"),
                )

            # Return default preferences if none exist
            return NotificationPreferencesModel(
                user_id=user_id,
                email_notifications=True,
                push_notifications=True,
                notification_types=[],
                created_at=datetime.now(timezone.utc),
            )
        except Exception as e:
            print(f"Error getting notification preferences: {e}")
            return None

    async def _update_notification_stats(
        self, user_id: str, notification_type: NotificationType
    ):
        """Update user notification statistics."""
        try:
            now = datetime.now(timezone.utc)

            # Increment notification counts
            await self.notification_stats.update_one(
                {"_id": user_id},
                {
                    "$inc": {
                        "total_notifications": 1,
                        "unread_notifications": 1,
                        f"notifications_by_type.{notification_type.value}": 1,
                    },
                    "$set": {"user_id": user_id, "last_notification_at": now},
                },
                upsert=True,
            )
        except Exception as e:
            print(f"Error updating notification stats: {e}")

    async def get_notification_stats(
        self, user_id: str
    ) -> Optional[NotificationStatsModel]:
        """Get user notification statistics."""
        try:
            doc = await self.notification_stats.find_one({"_id": user_id})

            if doc:
                return NotificationStatsModel(
                    user_id=doc["user_id"],
                    total_notifications=doc.get("total_notifications", 0),
                    unread_notifications=doc.get("unread_notifications", 0),
                    notifications_by_type=doc.get("notifications_by_type", {}),
                    last_notification_at=doc.get("last_notification_at"),
                    avg_response_time=doc.get("avg_response_time"),
                )

            return NotificationStatsModel(user_id=user_id)
        except Exception as e:
            print(f"Error getting notification stats: {e}")
            return None

    # Helper method for creating system notifications
    async def create_system_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
    ) -> Optional[NotificationModel]:
        """Create a system notification."""
        notification_request = NotificationCreateRequest(
            user_id=user_id,
            type=NotificationType.SYSTEM_ANNOUNCEMENT,
            title=title,
            message=message,
            priority=priority,
        )

        return await self.create_notification(notification_request)

    # Helper methods for common notifications
    async def notify_question_answered(
        self, user_id: str, question_id: str, answerer_name: str
    ) -> Optional[NotificationModel]:
        """Create notification when question is answered."""
        notification_request = NotificationCreateRequest(
            user_id=user_id,
            type=NotificationType.QUESTION_ANSWERED,
            title="Your question has been answered",
            message=f"{answerer_name} answered your question",
            related_id=question_id,
            action_url=f"/questions/{question_id}",
        )

        return await self.create_notification(notification_request)

    async def notify_answer_accepted(
        self, user_id: str, answer_id: str, question_title: str
    ) -> Optional[NotificationModel]:
        """Create notification when answer is accepted."""
        notification_request = NotificationCreateRequest(
            user_id=user_id,
            type=NotificationType.ANSWER_ACCEPTED,
            title="Your answer was accepted",
            message=f"Your answer to '{question_title}' was accepted",
            related_id=answer_id,
            priority=NotificationPriority.HIGH,
            action_url=f"/answers/{answer_id}",
        )

        return await self.create_notification(notification_request)

    async def _get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user information for email notifications."""
        try:
            user_doc = await self.users.find_one({"_id": user_id})
            if user_doc:
                return {
                    "name": user_doc.get("name", "User"),
                    "email": user_doc.get("email", ""),
                }
            return None
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None

"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button, Spinner } from "@heroui/react";
import { Bell, Check, Archive, X, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "question_answered":
      return "💬";
    case "answer_commented":
      return "💭";
    case "user_mentioned":
      return "👋";
    case "answer_accepted":
      return "✅";
    case "question_upvoted":
    case "answer_upvoted":
      return "👍";
    case "new_follower":
      return "👥";
    case "system_announcement":
      return "📢";
    default:
      return "🔔";
  }
};

const getNotificationActionUrl = (notification: any): string => {
  if (notification.action_url) {
    return notification.action_url;
  }

  // Generate action URL based on type and related_id
  switch (notification.type) {
    case "question_answered":
    case "answer_commented":
    case "answer_accepted":
    case "question_upvoted":
      return notification.related_id
        ? `/question/${notification.related_id}`
        : "/";
    case "user_mentioned":
      return notification.related_id
        ? `/question/${notification.related_id}`
        : "/";
    default:
      return "/";
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export default function NotificationsPage() {
  const router = useRouter();

  const {
    notifications,
    notificationCount,
    isLoading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
  } = useNotifications();

  // Debug: log notifications and loading state
  console.log("test1", notifications);
  console.log("isLoading", isLoading);
  console.log("notificationCount", notificationCount);

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark as read if not already read
      if (!notification.is_read) {
        await markAsRead(notification.notification_id);
      }

      // Navigate to the related content
      const actionUrl = getNotificationActionUrl(notification);
      if (actionUrl !== "/") {
        router.push(actionUrl);
      }
    } catch (error) {
      console.error("Failed to handle notification click:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      toast.success("Marked as read", "Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark as read", "Please try again");
    }
  };

  const handleMarkAsUnread = async (notificationId: string) => {
    try {
      await markAsUnread(notificationId);
      toast.success("Marked as unread", "Notification marked as unread");
    } catch (error) {
      toast.error("Failed to mark as unread", "Please try again");
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      await archiveNotification(notificationId);
      toast.success("Archived", "Notification archived");
    } catch (error) {
      toast.error("Failed to archive", "Please try again");
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      toast.success("Deleted", "Notification deleted");
    } catch (error) {
      toast.error("Failed to delete", "Please try again");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All marked as read", "All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read", "Please try again");
    }
  };

  const unreadCount = notificationCount?.unread || 0;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount !== 1 ? "s" : ""
                  }`
                : "All caught up!"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="flat"
                size="sm"
                color="primary"
                startContent={<Check className="h-4 w-4" />}
                onPress={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>Loading notifications...</span>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl">
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                You're all caught up! No notifications yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.notification_id}
                className={`shadow-none outline-1 rounded-2xl transition-all duration-200 hover:shadow-sm cursor-pointer ${
                  !notification.is_read
                    ? "bg-primary/5 outline-primary/20 border-l-4 border-l-primary"
                    : "bg-foreground-50 outline-foreground-100"
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-base font-medium text-foreground-900 mb-2">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            {notification.priority === "high" && (
                              <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded">
                                High Priority
                              </span>
                            )}
                            {notification.priority === "urgent" && (
                              <span className="bg-red-100 text-red-600 px-2 py-1 rounded">
                                Urgent
                              </span>
                            )}
                            {!notification.is_read && (
                              <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                                Unread
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {!notification.is_read ? (
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.notification_id);
                              }}
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              isIconOnly
                              size="sm"
                              variant="flat"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsUnread(
                                  notification.notification_id
                                );
                              }}
                              title="Mark as unread"
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(notification.notification_id);
                            }}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>

                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            color="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.notification_id);
                            }}
                            title="Delete"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

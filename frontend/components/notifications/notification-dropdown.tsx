"use client";

import { useState, useEffect, useMemo } from "react";
import { Bell, Check, X, Archive, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Spinner,
} from "@heroui/react";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "@/lib/toast";

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

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Memoize filters to prevent infinite re-renders
  const notificationFilters = useMemo(() => ({ limit: 10 }), []);

  const {
    notifications,
    notificationCount,
    isLoading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
  } = useNotifications(notificationFilters);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when dropdown is open
      if (!isOpen) return;

      if (event.key === "Escape") {
        setIsOpen(false);
      } else if (event.key === "a" && event.metaKey) {
        event.preventDefault();
        handleMarkAllAsRead();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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

      setIsOpen(false);
    } catch (error) {
      console.error("Failed to handle notification click:", error);
    }
  };

  const handleMarkAsRead = async (
    e: React.MouseEvent,
    notificationId: string
  ) => {
    e.stopPropagation();
    try {
      await markAsRead(notificationId);
      toast.success("Marked as read", "Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark as read", "Please try again");
    }
  };

  const handleMarkAsUnread = async (
    e: React.MouseEvent,
    notificationId: string
  ) => {
    e.stopPropagation();
    try {
      await markAsUnread(notificationId);
      toast.success("Marked as unread", "Notification marked as unread");
    } catch (error) {
      toast.error("Failed to mark as unread", "Please try again");
    }
  };

  const handleArchive = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    try {
      await archiveNotification(notificationId);
      toast.success("Archived", "Notification archived");
    } catch (error) {
      toast.error("Failed to archive", "Please try again");
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
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
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger>
        <Badge
          color="primary"
          size="md"
          content={unreadCount ? unreadCount.toString() : ""}
          shape="circle"
          className={unreadCount > 0 ? "animate-pulse" : ""}
        >
          <Button
            isIconOnly
            aria-label="Notifications"
            variant="flat"
            size="sm"
            className={isLoading ? "animate-pulse" : ""}
          >
            <Bell className="h-5 w-5" />
          </Button>
        </Badge>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Notifications"
        className="w-96 max-h-96 overflow-auto"
      >
        <DropdownSection title="Notifications" showDivider>
          {isLoading ? (
            <DropdownItem key="loading" className="justify-center">
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Loading notifications...</span>
              </div>
            </DropdownItem>
          ) : notifications.length === 0 ? (
            <DropdownItem
              key="empty"
              className="justify-center text-muted-foreground"
            >
              No notifications yet
            </DropdownItem>
          ) : (
            notifications.map((notification) => (
              <DropdownItem key={notification.notification_id} className="p-0">
                {" "}
                <div
                  className={`w-full p-3 hover:bg-foreground-100 transition-colors cursor-pointer ${
                    !notification.is_read
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg mt-0.5 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground-800 mb-1 leading-tight">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            {notification.priority === "high" && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                                High
                              </span>
                            )}
                            {notification.priority === "urgent" && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                Urgent
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          {!notification.is_read ? (
                            <button
                              onClick={(e) =>
                                handleMarkAsRead(
                                  e,
                                  notification.notification_id
                                )
                              }
                              className="p-1 hover:bg-foreground-200 rounded text-muted-foreground hover:text-green-600 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) =>
                                handleMarkAsUnread(
                                  e,
                                  notification.notification_id
                                )
                              }
                              className="p-1 hover:bg-foreground-200 rounded text-muted-foreground hover:text-primary transition-colors"
                              title="Mark as unread"
                            >
                              <Bell className="h-3 w-3" />
                            </button>
                          )}

                          <button
                            onClick={(e) =>
                              handleArchive(e, notification.notification_id)
                            }
                            className="p-1 hover:bg-foreground-200 rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Archive"
                          >
                            <Archive className="h-3 w-3" />
                          </button>

                          <button
                            onClick={(e) =>
                              handleDelete(e, notification.notification_id)
                            }
                            className="p-1 hover:bg-foreground-200 rounded text-muted-foreground hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DropdownItem>
            ))
          )}
        </DropdownSection>

        <DropdownSection>
          {unreadCount > 0 ? (
            <DropdownItem
              key="mark-all-read"
              onPress={handleMarkAllAsRead}
              className="justify-center text-primary font-medium"
            >
              Mark all as read
            </DropdownItem>
          ) : null}

          <DropdownItem
            key="view-all"
            onPress={() => {
              router.push("/notifications");
              setIsOpen(false);
            }}
            className="justify-center text-primary font-medium"
          >
            <div className="flex items-center gap-2">
              View all notifications
              <ExternalLink className="h-3 w-3" />
            </div>
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}

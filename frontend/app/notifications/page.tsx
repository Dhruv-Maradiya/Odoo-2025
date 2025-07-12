"use client";

import { useState } from "react";
import { Button, Tooltip } from "@heroui/react";
import { ArrowLeft, Check, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock notifications data (same as dropdown for consistency)
const mockNotifications = [
  {
    id: 1,
    message: "John answered your question about SQL joins",
    time: "2 minutes ago",
    read: false,
  },
  {
    id: 2,
    message: "Sarah commented on your answer",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    message: "Mike mentioned you in a comment",
    time: "3 hours ago",
    read: true,
  },
  {
    id: 4,
    message: "Your question received 5 upvotes",
    time: "1 day ago",
    read: true,
  },
  {
    id: 5,
    message: "New comment on your SQL optimization question",
    time: "2 days ago",
    read: false,
  },
  {
    id: 6,
    message: "Emma upvoted your answer",
    time: "3 days ago",
    read: true,
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => router.back()}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-medium text-foreground">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-muted-foreground text-sm">
                  {unreadCount} unread notification
                  {unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              onPress={markAllAsRead}
              color="primary"
              size="sm"
              startContent={<CheckCheck className="h-4 w-4" />}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                bg-card border rounded-lg p-4 transition-all hover:shadow-sm
                ${
                  notification.read
                    ? "border-border"
                    : "border-primary/20 bg-primary/5"
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`text-sm leading-relaxed ${
                          notification.read
                            ? "text-muted-foreground"
                            : "text-foreground font-medium"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground mt-2 block">
                        {notification.time}
                      </span>
                    </div>
                  </div>
                </div>
                {!notification.read && (
                  <Tooltip content="Mark as Read">
                    <Button
                      isIconOnly
                      variant="flat"
                      size="sm"
                      onPress={() => markAsRead(notification.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              All caught up!
            </h3>
            <p className="text-muted-foreground">
              You have no notifications at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

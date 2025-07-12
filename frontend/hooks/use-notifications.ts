import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getAuthenticatedClient } from "@/lib/api-client";
import type {
  Notification,
  NotificationCount,
  NotificationFilterRequest,
} from "@/types/api";

export function useNotifications(filters?: NotificationFilterRequest) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] =
    useState<NotificationCount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Always pass a limit to the backend (default 20)
  const effectiveFilters = { ...filters, limit: filters?.limit ?? 10, page: filters?.page ?? 1 };

  const fetchNotifications = useCallback(async () => {
    if (!session?.accessToken) {
      setIsLoading(false);
      setNotifications([]);
      return;
    }
    try {
      setIsLoading(true);
      const apiClient = getAuthenticatedClient(session.accessToken);
      const response = await apiClient.getNotifications(effectiveFilters);
      if (Array.isArray(response)) {
        setNotifications(response);
        console.log("hey there (array)", response);
      } else if (response.notifications) {
        setNotifications(response.notifications);
        console.log("hey there (object)", response.notifications);
      } else {
        setNotifications([]);
        console.log("hey there (empty)", response);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken, JSON.stringify(effectiveFilters)]);

  const fetchNotificationCount = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      const apiClient = getAuthenticatedClient(session.accessToken);
      const count = await apiClient.getNotificationCount();
      setNotificationCount(count);
    } catch (err) {
      console.error("Failed to fetch notification count:", err);
      setNotificationCount({
        total: 0,
        unread: 0,
        archived: 0,
        by_priority: {},
      }); // Set default values on error
    }
  }, [session?.accessToken]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!session?.accessToken) return;

      try {
        const apiClient = getAuthenticatedClient(session.accessToken);
        const updatedNotification = await apiClient.markNotificationAsRead(
          notificationId
        );

        // Update local state
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.notification_id === notificationId
              ? {
                ...notification,
                is_read: true,
                read_at: new Date().toISOString(),
              }
              : notification
          )
        );

        // Update count
        setNotificationCount((prev) =>
          prev ? { ...prev, unread: Math.max(0, prev.unread - 1) } : null
        );

        return updatedNotification;
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
        throw err;
      }
    },
    [session?.accessToken]
  );

  const markAsUnread = useCallback(
    async (notificationId: string) => {
      if (!session?.accessToken) return;

      try {
        const apiClient = getAuthenticatedClient(session.accessToken);
        const updatedNotification = await apiClient.markNotificationAsUnread(
          notificationId
        );

        // Update local state
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.notification_id === notificationId
              ? { ...notification, is_read: false, read_at: undefined }
              : notification
          )
        );

        // Update count
        setNotificationCount((prev) =>
          prev ? { ...prev, unread: prev.unread + 1 } : null
        );

        return updatedNotification;
      } catch (err) {
        console.error("Failed to mark notification as unread:", err);
        throw err;
      }
    },
    [session?.accessToken]
  );

  const markAllAsRead = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      const apiClient = getAuthenticatedClient(session.accessToken);
      await apiClient.markAllNotificationsAsRead();

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );

      // Update count
      setNotificationCount((prev) => (prev ? { ...prev, unread: 0 } : null));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      throw err;
    }
  }, [session?.accessToken]);

  const archiveNotification = useCallback(
    async (notificationId: string) => {
      if (!session?.accessToken) return;

      try {
        const apiClient = getAuthenticatedClient(session.accessToken);
        await apiClient.archiveNotification(notificationId);

        // Remove from local state
        setNotifications((prev) =>
          prev.filter(
            (notification) => notification.notification_id !== notificationId
          )
        );

        // Update count if it was unread
        const notification = notifications.find(
          (n) => n.notification_id === notificationId
        );
        if (notification && !notification.is_read) {
          setNotificationCount((prev) =>
            prev
              ? {
                ...prev,
                unread: Math.max(0, prev.unread - 1),
                archived: prev.archived + 1,
              }
              : null
          );
        }
      } catch (err) {
        console.error("Failed to archive notification:", err);
        throw err;
      }
    },
    [session?.accessToken, notifications]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!session?.accessToken) return;

      try {
        const apiClient = getAuthenticatedClient(session.accessToken);
        await apiClient.deleteNotification(notificationId);

        // Remove from local state
        setNotifications((prev) =>
          prev.filter(
            (notification) => notification.notification_id !== notificationId
          )
        );

        // Update count if it was unread
        const notification = notifications.find(
          (n) => n.notification_id === notificationId
        );
        if (notification && !notification.is_read) {
          setNotificationCount((prev) =>
            prev ? { ...prev, unread: Math.max(0, prev.unread - 1) } : null
          );
        }
      } catch (err) {
        console.error("Failed to delete notification:", err);
        throw err;
      }
    },
    [session?.accessToken, notifications]
  );

  // Use the same session check logic as posting/comments (see QACard, ask/page.tsx, etc)
  useEffect(() => {
    // Always fetch notifications and count when the session or filters change
    fetchNotifications();
    fetchNotificationCount();
  }, [fetchNotifications, fetchNotificationCount, filters, session?.accessToken]);

  return {
    notifications,
    notificationCount,
    isLoading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
  };
}

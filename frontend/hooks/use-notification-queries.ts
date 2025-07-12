import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Notification, NotificationCount, NotificationFilterRequest } from '@/types/api';

// Simple hook for fetching notifications
export const useNotifications = (params?: NotificationFilterRequest) => {
    const [data, setData] = useState<Notification[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const result = await apiClient.getNotifications(params);
                setData(result.notifications);
            } catch (err) {
                setError(err as Error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, [JSON.stringify(params)]);

    return { data, isLoading, error };
};

// Simple hook for fetching notification count
export const useNotificationCount = () => {
    const [data, setData] = useState<NotificationCount | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchNotificationCount = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const result = await apiClient.getNotificationCount();
                setData(result);
            } catch (err) {
                setError(err as Error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotificationCount();
    }, []);

    return { data, isLoading, error };
};

// Simple function for marking notification as read
export const useMarkNotificationAsRead = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const markAsRead = async (id: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const result = await apiClient.markNotificationAsRead(id);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { markAsRead, isLoading, error };
};

// Simple function for marking all notifications as read
export const useMarkAllNotificationsAsRead = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const markAllAsRead = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const result = await apiClient.markAllNotificationsAsRead();
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { markAllAsRead, isLoading, error };
};

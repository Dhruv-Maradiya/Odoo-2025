import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
    Notification,
    NotificationCount,
    NotificationFilterRequest,
} from '@/types/api';

// Query Keys
export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    list: (params?: NotificationFilterRequest) => [...notificationKeys.lists(), params] as const,
    count: () => [...notificationKeys.all, 'count'] as const,
};

// Notifications Queries
export const useNotifications = (
    params?: NotificationFilterRequest,
    options?: UseQueryOptions<Notification[]>
) => {
    return useQuery({
        queryKey: notificationKeys.list(params),
        queryFn: () => apiClient.getNotifications(params),
        staleTime: 30 * 1000, // 30 seconds
        ...options,
    });
};

export const useNotificationCount = (options?: UseQueryOptions<NotificationCount>) => {
    return useQuery({
        queryKey: notificationKeys.count(),
        queryFn: () => apiClient.getNotificationCount(),
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // Refetch every minute
        ...options,
    });
};

// Notifications Mutations
export const useMarkNotificationAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.markNotificationAsRead(id),
        onMutate: async (notificationId) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
            await queryClient.cancelQueries({ queryKey: notificationKeys.count() });

            // Snapshot the previous values
            const previousNotifications = queryClient.getQueriesData({ queryKey: notificationKeys.lists() });
            const previousCount = queryClient.getQueryData(notificationKeys.count());

            // Optimistically update notifications
            queryClient.setQueriesData(
                { queryKey: notificationKeys.lists() },
                (old: Notification[] | undefined) => {
                    if (!old) return undefined;
                    return old.map((notification) =>
                        notification.id === notificationId
                            ? { ...notification, is_read: true }
                            : notification
                    );
                }
            );

            // Optimistically update count
            queryClient.setQueryData(
                notificationKeys.count(),
                (old: NotificationCount | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        unread: Math.max(0, old.unread - 1),
                    };
                }
            );

            return { previousNotifications, previousCount };
        },
        onError: (err, notificationId, context) => {
            // Rollback on error
            if (context?.previousNotifications) {
                context.previousNotifications.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            if (context?.previousCount) {
                queryClient.setQueryData(notificationKeys.count(), context.previousCount);
            }
        },
        onSettled: () => {
            // Always refetch to ensure we're in sync
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.count() });
        },
    });
};

export const useMarkAllNotificationsAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiClient.markAllNotificationsAsRead(),
        onMutate: async () => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
            await queryClient.cancelQueries({ queryKey: notificationKeys.count() });

            // Snapshot the previous values
            const previousNotifications = queryClient.getQueriesData({ queryKey: notificationKeys.lists() });
            const previousCount = queryClient.getQueryData(notificationKeys.count());

            // Optimistically update all notifications as read
            queryClient.setQueriesData(
                { queryKey: notificationKeys.lists() },
                (old: Notification[] | undefined) => {
                    if (!old) return undefined;
                    return old.map((notification) => ({ ...notification, is_read: true }));
                }
            );

            // Optimistically update count
            queryClient.setQueryData(
                notificationKeys.count(),
                (old: NotificationCount | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        unread: 0,
                    };
                }
            );

            return { previousNotifications, previousCount };
        },
        onError: (err, _, context) => {
            // Rollback on error
            if (context?.previousNotifications) {
                context.previousNotifications.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            if (context?.previousCount) {
                queryClient.setQueryData(notificationKeys.count(), context.previousCount);
            }
        },
        onSettled: () => {
            // Always refetch to ensure we're in sync
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.count() });
        },
    });
};

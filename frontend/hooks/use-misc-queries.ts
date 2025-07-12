import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
    User,
    PaginationParams,
    ImageUploadRequest,
    ImageUploadResponse,
} from '@/types/api';

// Query Keys
export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    list: (params?: PaginationParams) => [...userKeys.lists(), params] as const,
    details: () => [...userKeys.all, 'detail'] as const,
    detail: (id: string) => [...userKeys.details(), id] as const,
};

export const imageKeys = {
    all: ['images'] as const,
    upload: (type: string, relatedId?: string) => [...imageKeys.all, 'upload', type, relatedId] as const,
};

// Users Queries
export const useUsers = (
    params?: PaginationParams,
    options?: UseQueryOptions<{ users: User[]; pagination: any }>
) => {
    return useQuery({
        queryKey: userKeys.list(params),
        queryFn: () => apiClient.getUsers(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
};

export const useUser = (id: string, options?: UseQueryOptions<User>) => {
    return useQuery({
        queryKey: userKeys.detail(id),
        queryFn: () => apiClient.getUserById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
};

// Users Mutations
export const useDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.deleteUser(id),
        onSuccess: (_, deletedId) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: userKeys.detail(deletedId) });

            // Invalidate users list
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        },
    });
};

// Image Upload Mutation
export const useUploadImage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ file, uploadRequest }: { file: File; uploadRequest: ImageUploadRequest }) =>
            apiClient.uploadImage(file, uploadRequest),
        onSuccess: (data) => {
            // Optionally cache the uploaded image data
            queryClient.setQueryData(
                imageKeys.upload(data.upload_type, data.related_id),
                data
            );
        },
    });
};

import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    PasswordChangeRequest,
    CurrentUser,
} from '@/types/api';

// Query Keys
export const authKeys = {
    all: ['auth'] as const,
    currentUser: () => [...authKeys.all, 'current-user'] as const,
};

// Auth Queries
export const useCurrentUser = (options?: UseQueryOptions<CurrentUser>) => {
    return useQuery({
        queryKey: authKeys.currentUser(),
        queryFn: () => apiClient.getCurrentUser(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
};

// Auth Mutations
export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (credentials: LoginRequest) => apiClient.login(credentials),
        onSuccess: (data: AuthResponse) => {
            // Store user data
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            // Invalidate and refetch user data
            queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
        },
    });
};

export const useRegister = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userData: RegisterRequest) => apiClient.register(userData),
        onSuccess: (data: AuthResponse) => {
            // Store user data
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            // Invalidate and refetch user data
            queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
        },
    });
};

export const useChangePassword = () => {
    return useMutation({
        mutationFn: (data: PasswordChangeRequest) => apiClient.changePassword(data),
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiClient.logout(),
        onSuccess: () => {
            // Clear all queries
            queryClient.clear();
        },
    });
};

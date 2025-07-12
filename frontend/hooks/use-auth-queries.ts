import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { signIn, signOut, useSession } from 'next-auth/react';
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
    const { data: session, status } = useSession();
    return {
        user: session?.user || null,
        isLoading: status === 'loading',
        isAuthenticated: status === 'authenticated',
        isUnauthenticated: status === 'unauthenticated',
    };
};

// Auth Mutations
export const useLogin = () => {
    return useMutation({
        mutationFn: async (credentials: LoginRequest) => {
            const result = await signIn('credentials', {
                email: credentials.email,
                password: credentials.password,
                redirect: false,
            });
            if (result?.error) throw new Error(result.error);
            return result;
        },
    });
};

export const useRegister = () => {
    return useMutation({
        mutationFn: async (userData: RegisterRequest) => {
            // Call your registration API endpoint directly here if needed
            // Then sign in with NextAuth
            throw new Error('Implement registration via NextAuth or custom API');
        },
    });
};

export const useLogout = () => {
    return useMutation({
        mutationFn: async () => {
            await signOut({ redirect: false });
        },
    });
};

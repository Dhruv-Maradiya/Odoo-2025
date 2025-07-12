import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import type { LoginRequest, RegisterRequest } from '@/types/api';

// Simple hook for getting current user using NextAuth
export const useCurrentUser = () => {
    const { data: session, status } = useSession();

    return {
        data: session?.user || null,
        isLoading: status === 'loading',
        error: null,
    };
};

// Simple function for login using NextAuth
export const useLogin = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const login = async (credentials: LoginRequest) => {
        try {
            setIsLoading(true);
            setError(null);
            const result = await signIn('credentials', {
                email: credentials.email,
                password: credentials.password,
                redirect: false,
            });

            if (result?.error) {
                throw new Error(result.error);
            }

            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { login, isLoading, error };
};

// Simple function for register
export const useRegister = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const register = async (userData: RegisterRequest) => {
        try {
            setIsLoading(true);
            setError(null);
            // For now, we'll use signIn after registration
            // You might want to implement a separate registration endpoint
            const result = await signIn('credentials', {
                email: userData.email,
                password: userData.password,
                redirect: false,
            });

            if (result?.error) {
                throw new Error(result.error);
            }

            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { register, isLoading, error };
};

// Simple function for logout using NextAuth
export const useLogout = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const logout = async () => {
        try {
            setIsLoading(true);
            setError(null);
            await signOut({ redirect: false });
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { logout, isLoading, error };
};

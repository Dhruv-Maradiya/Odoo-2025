import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { User } from '@/types/api';

// Simple hook for fetching users
export const useUsers = (params?: any) => {
    const [data, setData] = useState<{ users: User[]; pagination: any } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const result = await apiClient.getUsers(params);
                setData(result);
            } catch (err) {
                setError(err as Error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [JSON.stringify(params)]);

    return { data, isLoading, error };
};

// Simple hook for fetching a single user
export const useUser = (id: string) => {
    const [data, setData] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchUser = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const result = await apiClient.getUserById(id);
                setData(result);
            } catch (err) {
                setError(err as Error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    return { data, isLoading, error };
};

// Simple function for deleting a user
export const useDeleteUser = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const deleteUser = async (id: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const result = await apiClient.deleteUser(id);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { deleteUser, isLoading, error };
};

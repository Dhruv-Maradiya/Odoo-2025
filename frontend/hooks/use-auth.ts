"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  type LoginRequest,
  type RegisterRequest,
  type AuthResponse,
} from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => apiClient.login(credentials),
    onSuccess: (data: AuthResponse) => {
      // Store tokens in localStorage (consider using httpOnly cookies for production)
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Invalidate and refetch user queries
      queryClient.invalidateQueries({ queryKey: ["user"] });

      toast.success("Login successful!");
      router.push("/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Login failed");
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: RegisterRequest) => apiClient.register(userData),
    onSuccess: (data: AuthResponse) => {
      // Store tokens in localStorage
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Invalidate and refetch user queries
      queryClient.invalidateQueries({ queryKey: ["user"] });

      toast.success("Registration successful!");
      router.push("/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Registration failed");
    },
  });
}

export function useGoogleAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => apiClient.googleAuth(token),
    onSuccess: (data: AuthResponse) => {
      // Store tokens in localStorage
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Invalidate and refetch user queries
      queryClient.invalidateQueries({ queryKey: ["user"] });

      toast.success("Google authentication successful!");
      router.push("/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Google authentication failed");
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear tokens from localStorage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear();

      toast.success("Logged out successfully!");
      router.push("/auth/login");
    },
  });
}

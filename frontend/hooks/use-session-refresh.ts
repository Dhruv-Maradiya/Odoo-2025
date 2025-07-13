"use client";

import { useSession } from "next-auth/react";

export function useSessionRefresh() {
    const { data: session, update } = useSession();

    const refreshSession = async () => {
        try {
            // Call the NextAuth session endpoint to refresh the session
            const response = await fetch("/api/auth/session");
            if (response.ok) {
                // Force a session update
                await update();
            }
        } catch (error) {
            console.error("Failed to refresh session:", error);
        }
    };

    return { refreshSession, session };
} 
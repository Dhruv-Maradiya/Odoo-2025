"use client";

import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "@/lib/toast";

export function AdminHeader() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    try {
      await signOut({
        callbackUrl: "/",
      });
      toast.success(
        "Logged out successfully",
        "You have been logged out of your admin session"
      );
    } catch (error) {
      toast.error("Failed to logout", "Please try again");
    }
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {session?.user?.name || "Admin"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground">
            {session?.user?.email}
          </p>
        </div>

        <Button variant="destructive" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
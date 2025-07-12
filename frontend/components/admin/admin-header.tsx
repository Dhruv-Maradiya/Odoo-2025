"use client";

import { Button } from "@heroui/react";
import { LogOut, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

export function AdminHeader() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    try {
      await signOut({
        callbackUrl: "/",
      });
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
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

        <Button
          color="danger"
          variant="light"
          startContent={<LogOut className="h-4 w-4" />}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}

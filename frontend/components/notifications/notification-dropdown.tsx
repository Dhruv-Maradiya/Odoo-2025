"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge, Button } from "@heroui/react";
import { NotificationIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const mockNotifications = [
  {
    id: 1,
    message: "John answered your question about SQL joins",
    time: "2 minutes ago",
    read: false,
  },
  {
    id: 2,
    message: "Sarah commented on your answer",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    message: "Mike mentioned you in a comment",
    time: "3 hours ago",
    read: true,
  },
  {
    id: 4,
    message: "Your question received 5 upvotes",
    time: "1 day ago",
    read: true,
  },
];

export function NotificationDropdown() {
  const [notifications] = useState(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge
          color="primary"
          size="md"
          content={unreadCount ? unreadCount : ""}
          shape="circle"
        >
          <Button
            isIconOnly
            aria-label="Notifications"
            variant="flat"
            size="sm"
          >
            <Bell className="h-5 w-5" />
          </Button>
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <h4 className="font-semibold mb-2">Notifications</h4>
          {notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start p-3 cursor-pointer"
            >
              <div className="flex items-start justify-between w-full">
                <p className="text-sm flex-1">{notification.message}</p>
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-1" />
                )}
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                {notification.time}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem className="justify-center text-primary cursor-pointer">
            View all notifications
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

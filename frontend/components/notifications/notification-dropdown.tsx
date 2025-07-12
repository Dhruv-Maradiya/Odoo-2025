"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/react";

type NotificationItem = {
  key: string;
  type: "notification";
  message: string;
  time: string;
  read: boolean;
};

type HeaderItem = {
  key: string;
  type: "header";
  label: string;
};

type ActionItem = {
  key: string;
  type: "action";
  label: string;
};

type DropdownItemType = NotificationItem | HeaderItem | ActionItem;

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
  const router = useRouter();
  const [notifications] = useState(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleAction = (key: React.Key) => {
    if (key === "view-all") {
      router.push("/notifications");
    }
  };

  // Create items array for HeroUI dynamic dropdown
  const dropdownItems: DropdownItemType[] = [
    ...notifications.map(
      (notification): NotificationItem => ({
        key: notification.id.toString(),
        type: "notification",
        message: notification.message,
        time: notification.time,
        read: notification.read,
      })
    ),
    {
      key: "view-all",
      type: "action",
      label: "View all notifications",
    },
  ];

  return (
    <Dropdown>
      <DropdownTrigger>
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
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Notifications"
        className="w-80"
        items={dropdownItems}
        onAction={handleAction}
      >
        {(item) => (
          <DropdownItem
            key={item.key}
            className={
              item.type === "action" ? "justify-center text-primary" : "p-3"
            }
          >
            {item.type === "notification" ? (
              <div className="flex items-start justify-between w-full">
                <div className="flex-1">
                  <p className="text-sm">{item.message}</p>
                  <span className="text-xs text-muted-foreground mt-1">
                    {item.time}
                  </span>
                </div>
                {!item.read && (
                  <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-1 flex-shrink-0" />
                )}
              </div>
            ) : (
              item.label
            )}
          </DropdownItem>
        )}
      </DropdownMenu>
    </Dropdown>
  );
}

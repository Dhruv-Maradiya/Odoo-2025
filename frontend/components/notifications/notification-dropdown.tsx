"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const mockNotifications = [
  { id: 1, message: "John answered your question about SQL joins", time: "2 minutes ago", read: false },
  { id: 2, message: "Sarah commented on your answer", time: "1 hour ago", read: false },
  { id: 3, message: "Mike mentioned you in a comment", time: "3 hours ago", read: true },
  { id: 4, message: "Your question received 5 upvotes", time: "1 day ago", read: true },
]

export function NotificationDropdown() {
  const [notifications] = useState(mockNotifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <h4 className="font-semibold mb-2">Notifications</h4>
          {notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 cursor-pointer">
              <div className="flex items-start justify-between w-full">
                <p className="text-sm flex-1">{notification.message}</p>
                {!notification.read && <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-1" />}
              </div>
              <span className="text-xs text-muted-foreground mt-1">{notification.time}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem className="justify-center text-primary cursor-pointer">
            View all notifications
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

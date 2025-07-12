"use client";

import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button, Input } from "@heroui/react";
import { LogOut, Menu, Moon, Plus, Search, Settings, Sun, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";

interface HeaderProps { }

export function Header({ }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isLoading, isAuthenticated } = useCurrentUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Mobile Menu + Logo */}
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" isIconOnly className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="flex flex-col gap-4 mt-6">
                  <Link href="/" className="text-lg font-semibold">
                    Home
                  </Link>
                  <Link href="/ask" className="text-lg font-semibold">
                    Ask Question
                  </Link>
                  <Link href="/tags" className="text-lg font-semibold">
                    Tags
                  </Link>
                  <Link href="/users" className="text-lg font-semibold">
                    Users
                  </Link>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="text-2xl font-bold text-primary">
              StackIt
            </Link>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">

              <Input
                startContent={
                  <Search className="h-5 w-5 text-muted-foreground" />
                }
                radius="full"
                placeholder="Search questions..."
                value={searchQuery}
                onValueChange={(e) => setSearchQuery(e)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Search */}
            <Button variant="ghost" isIconOnly className="md:hidden">
              <Search className="h-5 w-5" />
            </Button>

            {isAuthenticated &&
              <Link href="/ask" >
                <Button size="sm" color="primary" className="font-bold"
                  radius="full"
                  startContent={
                    <Plus width={18} height={18} />
                  }>Ask a Question</Button>
              </Link>
            }

            <Button
              variant="flat"
              isIconOnly onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
              size="sm"
              disabled={!mounted}
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {isAuthenticated ? (
              <>
                <NotificationDropdown />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarImage
                        src={user?.image || "https://links.aryanranderiya.com/l/default_user"}
                      />
                      <AvatarFallback>
                        {user?.name?.charAt(0) || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button size="sm" variant="bordered" className="font-bold">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" color="primary" className="font-bold">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

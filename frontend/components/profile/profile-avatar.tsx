"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionRefresh } from "@/hooks/use-session-refresh";
import { getImageUrl, profileApi } from "@/lib/backend-api";
import { toast } from "@/lib/toast";
import { useSession } from "next-auth/react";
import { useState } from "react";

interface ProfileAvatarProps {
  currentAvatar?: string;
  userId: string;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
}

export function ProfileAvatar({ currentAvatar, userId, onAvatarUpdate }: ProfileAvatarProps) {
  const { data: session } = useSession();
  const { refreshSession } = useSessionRefresh();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };


  const handleUpload = async () => {
    if (!selectedFile || !session?.accessToken) {
      toast.error("No file selected", "Please select an image file to upload");
      return;
    }

    try {
      setIsUploading(true);

      const result = await profileApi.uploadAvatar(session.accessToken, selectedFile);

      toast.success("Avatar updated successfully", "Your profile picture has been updated");

      if (onAvatarUpdate) {
        // Convert the returned image URL to absolute URL
        const absoluteImageUrl = getImageUrl(result.image_url);
        onAvatarUpdate(absoluteImageUrl || result.image_url);
      }

      setSelectedFile(null);
      // Refresh the session to update the profile picture in the header
      await refreshSession();
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast.error("Failed to upload avatar", "Please try again");
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl">
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24">
            <AvatarImage
              src={getImageUrl(currentAvatar) || "https://links.aryanranderiya.com/l/default_user"}
            />
            <AvatarFallback className="text-lg">
              {getInitials("User")}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2 w-full">
            <Label htmlFor="avatar-upload">Upload new picture</Label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full"
            />
          </div>

          {selectedFile && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? "Uploading..." : "Upload Picture"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

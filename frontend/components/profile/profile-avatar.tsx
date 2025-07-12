"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { ImageUploadRequest } from "@/types/api";

interface ProfileAvatarProps {
  currentAvatar?: string;
  userId: string;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
}

export function ProfileAvatar({ currentAvatar, userId, onAvatarUpdate }: ProfileAvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("No file selected", "Please select an image file to upload");
      return;
    }

    try {
      setIsUploading(true);
      
      const uploadRequest: ImageUploadRequest = {
        upload_type: "profile_avatar",
        related_id: userId,
      };

      const result = await apiClient.uploadImage(selectedFile, uploadRequest);
      
      toast.success("Avatar updated successfully", "Your profile picture has been updated");
      
      if (onAvatarUpdate) {
        onAvatarUpdate(result.image_url);
      }
      
      setSelectedFile(null);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl">
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
        <CardDescription>
          Upload a new profile picture. Supported formats: JPG, PNG, GIF (max 5MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={currentAvatar} alt="Profile" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Label htmlFor="avatar-upload">Upload new image</Label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>
        </div>
        {selectedFile && (
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? "Uploading..." : "Upload Avatar"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

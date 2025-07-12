"use client";

import React, { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { Avatar, Button, Progress } from "@heroui/react";
import { toast } from "sonner";
import { Camera, Upload } from "lucide-react";

interface ProfileAvatarProps {
  currentImageUrl?: string;
  userName: string;
  onImageUpdate: (imageUrl: string) => void;
}

export function ProfileAvatar({
  currentImageUrl,
  userName,
  onImageUpdate,
}: ProfileAvatarProps) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Profile picture updated successfully!");
      onImageUpdate(data.image_url);
      setUploadProgress(0);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload image");
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Start upload
    setUploadProgress(0);
    uploadAvatarMutation.mutate(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      {/* Avatar */}
      <div className="relative">
        <Avatar
          src={currentImageUrl}
          name={userName}
          size="lg"
          className="w-24 h-24 text-large"
          classNames={{
            base: "ring-4 ring-background",
          }}
        />

        {/* Upload overlay */}
        <div
          className={`
            absolute inset-0 rounded-full bg-black/50 flex items-center justify-center
            opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer
            ${uploadAvatarMutation.isPending ? "opacity-100" : ""}
          `}
          onClick={handleUploadClick}
        >
          {uploadAvatarMutation.isPending ? (
            <div className="text-white text-center">
              <Upload className="w-6 h-6 mx-auto animate-pulse" />
              <p className="text-xs mt-1">Uploading...</p>
            </div>
          ) : (
            <div className="text-white text-center">
              <Camera className="w-6 h-6 mx-auto" />
              <p className="text-xs mt-1">Change</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload progress */}
      {uploadAvatarMutation.isPending && (
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-full">
          <Progress
            size="sm"
            isIndeterminate
            aria-label="Uploading image..."
            className="w-full"
          />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploadAvatarMutation.isPending}
      />

      {/* Upload button for mobile/accessibility */}
      <div className="mt-6 sm:hidden">
        <Button
          size="sm"
          variant="bordered"
          onClick={handleUploadClick}
          isLoading={uploadAvatarMutation.isPending}
          startContent={<Camera className="w-4 h-4" />}
        >
          Change Photo
        </Button>
      </div>
    </div>
  );
}

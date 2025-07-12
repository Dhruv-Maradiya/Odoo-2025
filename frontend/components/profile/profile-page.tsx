"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Avatar,
  Divider,
  Spinner,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProfileAvatar } from "./profile-avatar";

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  role: string;
  picture?: string;
  is_active: boolean;
}

interface UpdateProfileData {
  name?: string;
}

export function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");

  // Fetch current user profile
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<UserProfile>({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      const response = await fetch("/api/profile", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      return response.json();
    },
    enabled: !!session?.user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["profile", session?.user?.id],
      });
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  // Redirect to login if not authenticated
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardBody className="text-center">
            <p className="text-danger">Failed to load profile</p>
            <Button
              color="primary"
              onClick={() => router.push("/")}
              className="mt-4"
            >
              Go Home
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const handleEdit = () => {
    setName(profile.name);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setName("");
    setIsEditing(false);
  };

  const handleSave = () => {
    if (name.trim() && name !== profile.name) {
      updateProfileMutation.mutate({ name: name.trim() });
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold">My Profile</h1>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <ProfileAvatar
                currentImageUrl={profile.picture}
                userName={profile.name}
                onImageUpdate={(imageUrl: string) => {
                  queryClient.invalidateQueries({
                    queryKey: ["profile", session?.user?.id],
                  });
                }}
              />
            </div>

            <Divider />

            {/* Profile Information */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Profile Information</h2>
                {!isEditing && (
                  <Button
                    color="primary"
                    variant="light"
                    size="sm"
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                )}
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                {isEditing ? (
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    variant="bordered"
                  />
                ) : (
                  <p className="text-foreground-600 bg-default-100 p-3 rounded-lg">
                    {profile.name}
                  </p>
                )}
              </div>

              {/* Email Field (read-only) */}
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <p className="text-foreground-600 bg-default-100 p-3 rounded-lg">
                  {profile.email}
                </p>
              </div>

              {/* Role Field (read-only) */}
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <p className="text-foreground-600 bg-default-100 p-3 rounded-lg capitalize">
                  {profile.role}
                </p>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex space-x-3 pt-4">
                  <Button
                    color="primary"
                    onClick={handleSave}
                    isLoading={updateProfileMutation.isPending}
                    disabled={!name.trim() || name === profile.name}
                  >
                    Save Changes
                  </Button>
                  <Button
                    color="default"
                    variant="light"
                    onClick={handleCancel}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Account Settings</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Account Status</p>
                  <p className="text-sm text-foreground-600">
                    Your account is {profile.is_active ? "active" : "inactive"}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    profile.is_active
                      ? "bg-success-100 text-success-800"
                      : "bg-danger-100 text-danger-800"
                  }`}
                >
                  {profile.is_active ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

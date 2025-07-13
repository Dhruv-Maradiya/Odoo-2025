"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ProfileAvatar } from "./profile-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { profileApi, getImageUrl } from "@/lib/backend-api";
import { toast } from "@/lib/toast";

interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  bio?: string;
  picture?: string;
  created_at?: string;
  updated_at?: string;
}

export function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
  });

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.accessToken) return;

      try {
        setIsLoading(true);
        const profileData = await profileApi.getProfile(session.accessToken);

        // Convert picture URL to absolute URL if needed
        const profileWithImage = {
          ...profileData,
          picture: getImageUrl(profileData.picture),
        };

        setProfile(profileWithImage);
        setFormData({
          name: profileData.name || "",
          bio: profileData.bio || "",
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to load profile", "Please try again later");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [session?.accessToken]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateProfile = async () => {
    if (!profile || !session?.accessToken) return;

    try {
      setIsUpdating(true);

      await profileApi.updateProfile(session.accessToken, {
        name: formData.name,
      });

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        name: formData.name,
        updated_at: new Date().toISOString(),
      } : null);

      toast.success("Profile updated successfully", "Your changes have been saved");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile", "Please try again");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    if (profile) {
      setProfile({
        ...profile,
        picture: newAvatarUrl,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Failed to load profile</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Section */}
          <div className="lg:col-span-1">
            <ProfileAvatar
              currentAvatar={profile.picture}
              userId={profile.user_id}
              onAvatarUpdate={handleAvatarUpdate}
            />
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and bio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-foreground-400"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

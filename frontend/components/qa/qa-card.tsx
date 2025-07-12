"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@heroui/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown, ArrowUp, CheckCircle, MessageSquare } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { getApiClient } from "@/lib/api-client";
import { getImageUrl } from "@/lib/backend-api";
import { useSession } from "next-auth/react";
import { toast } from "@/lib/toast";

interface QACardProps {
  type: "question" | "answer";
  id: string;
  title?: string;
  content: string;
  tags?: string[];
  author: {
    name: string;
    email: string;
    picture: string
  };
  votes: number;
  userVote?: "upvote" | "downvote" | null;
  createdAt: string;
  isAccepted?: boolean;
  onVote?: (type: "upvote" | "downvote") => void;
}

export function QACard({
  type,
  id,
  title,
  content,
  tags = [],
  author,
  votes,
  userVote,
  createdAt,
  isAccepted = false,
  onVote,
}: QACardProps) {
  const { data: session } = useSession();
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: "upvote" | "downvote") => {
    // Debug: Log session info
    console.log("Session:", session);
    console.log("Access token:", session?.accessToken);

    if (!session?.accessToken) {
      toast.error("Please log in to vote", "You need to be logged in to vote");
      return;
    }

    if (isVoting) return;

    // Determine the vote type to send to API based on current state
    let voteTypeToSend: "upvote" | "downvote";

    if (userVote === voteType) {
      // User is clicking the same vote type - remove the vote (send opposite to toggle off)
      voteTypeToSend = voteType === "upvote" ? "downvote" : "upvote";
    } else {
      // User is clicking a different vote type or no vote exists - set the new vote
      voteTypeToSend = voteType;
    }

    setIsVoting(true);
    try {
      const apiClient = getApiClient(session.accessToken);

      if (type === "question") {
        const result = await apiClient.voteQuestion(id, voteTypeToSend);
        // Don't update local state here - let parent handle it
      } else {
        const result = await apiClient.voteAnswer(id, voteTypeToSend);
        // For answers, we might need to refresh the data or handle differently
        // For now, we'll just show a success message
      }

      if (onVote) {
        onVote(voteType);
      }
    } catch (error) {
      console.error("Failed to vote:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsVoting(false);
    }
  };

  const getAuthorInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Voting Section */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex flex-col items-center p-2 rounded-full ${userVote === "upvote"
                ? "bg-primary"
                : userVote === "downvote"
                  ? "bg-violet-600"
                  : "bg-foreground-200"
                }`}
            >
              <Button
                variant="light"
                size="sm"
                radius="full"
                className={`h-8 w-8 p-0 text-white`}
                isIconOnly
                onPress={() => handleVote("upvote")}
                isDisabled={isVoting}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <span className="font-bold text-base">{votes || 0}</span>
              <Button
                variant="light"
                size="sm"
                radius="full"
                className={`h-8 w-8 p-0 text-white`}
                isIconOnly
                onPress={() => handleVote("downvote")}
                isDisabled={isVoting}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-1 mb-3">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={getImageUrl(author.picture)
                    || "https://links.aryanranderiya.com/l/default_user"
                  }
                />
                <AvatarFallback className="text-xs">
                  {getAuthorInitials(author.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(createdAt)}
                </span>
                {isAccepted && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Accepted
                  </Badge>
                )}
              </div>
            </div>

            {/* Title (for questions) */}
            {type === "question" && title && (
              <h2 className="text-xl font-semibold mb-3">{title}</h2>
            )}

            {/* Content */}
            <div
              className="prose prose-sm max-w-none mb-4"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Tags (for questions) */}
            {type === "question" && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="text-xs bg-foreground-200 font-light text-foreground-500"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>0 comments</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

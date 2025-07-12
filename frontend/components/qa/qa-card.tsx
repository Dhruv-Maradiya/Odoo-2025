"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@heroui/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown, ArrowUp, CheckCircle, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { getAuthenticatedClient as getApiClient } from "@/lib/api-client";
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
    picture: string;
  };
  votes: number;
  userVote?: "upvote" | "downvote" | null;
  createdAt: string;
  isAccepted?: boolean;
  onVote?: (type: "upvote" | "downvote") => void;
  onAccept?: () => void;
  canAccept?: boolean;
  isAccepting?: boolean;
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
  onAccept,
  canAccept = false,
  isAccepting = false,
}: QACardProps) {
  const { data: session } = useSession();
  const [isVoting, setIsVoting] = useState(false);
  const [localVotes, setLocalVotes] = useState(votes);
  const [localUserVote, setLocalUserVote] = useState(userVote);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalVotes(votes);
    setLocalUserVote(userVote);
    console.log(userVote)
  }, [votes, userVote]);

  const handleVote = async (voteType: "upvote" | "downvote") => {

    if (!session?.accessToken) {
      toast.error("Please log in to vote", "You need to be logged in to vote");
      return;
    }

    if (isVoting) return;

    // Always send the clicked vote type to the backend
    // The backend will handle the logic of toggling off if it's the same vote
    const voteTypeToSend = voteType;

    setIsVoting(true);
    try {
      const apiClient = getApiClient(session.accessToken);

      if (type === "question") {
        const result = await apiClient.voteQuestion(id, voteTypeToSend);
        // Update local state based on the API response
        setLocalVotes(result.vote_count);
        setLocalUserVote(result.user_vote);
      } else {
        const result = await apiClient.voteAnswer(id, voteTypeToSend);
        // Update local state based on the API response
        setLocalVotes(result.vote_count);
        setLocalUserVote(result.user_vote);
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
    <Card className={`shadow-none outline-1  rounded-2xl ${isAccepted ? "bg-green-500/50 outline-green-500 " : " bg-foreground-50 outline-foreground-100"} `}>
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Voting Section */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex flex-col items-center p-2 rounded-full text-foreground ${localUserVote === "upvote"
                ? "bg-primary"
                : localUserVote === "downvote" ? "bg-violet-600" : "bg-foreground-200"
                }`}
            >
              <Button
                variant="light"
                size="sm"
                radius="full"
                className={`h-8 w-8 p-0`}
                isIconOnly
                onPress={() => handleVote("upvote")}
                isDisabled={isVoting}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <span className="font-bold text-base">{localVotes || 0}</span>
              <Button
                variant="light"
                size="sm"
                radius="full"
                className={`h-8 w-8 p-0`}
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
                  src={
                    getImageUrl(author.picture) ||
                    "https://links.aryanranderiya.com/l/default_user"
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

            {/* Accept Answer Button (for answers only) */}
            {type === "answer" && canAccept && !isAccepted && (
              <div className="flex justify-end mb-4">
                <Button
                  color="success"
                  variant="flat"
                  size="sm"
                  radius="full"
                  onPress={onAccept}
                  isDisabled={isAccepting}
                  startContent={
                    isAccepting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )
                  }
                >
                  {isAccepting ? "Accepting..." : "Accept Answer"}
                </Button>
              </div>
            )}

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
          </div>
        </div>
      </CardContent>
    </Card >
  );
}

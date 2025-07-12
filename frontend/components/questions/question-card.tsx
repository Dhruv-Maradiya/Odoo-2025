"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@heroui/react";
import { Comment03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Question } from "@/types/api";

interface QuestionCardProps {
  question: Question;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const [votes, setVotes] = useState(question.vote_count);
  const [userVote, setUserVote] = useState<"upvote" | "downvote" | null>(
    question.user_vote || null
  );
  const [isBookmarked, setIsBookmarked] = useState(
    question.is_bookmarked || false
  );

  const handleVote = (type: "upvote" | "downvote") => {
    if (userVote === type) {
      // Remove vote
      setVotes((prev) => prev + (type === "upvote" ? -1 : 1));
      setUserVote(null);
    } else {
      // Add or change vote
      const adjustment = userVote
        ? type === "upvote"
          ? 2
          : -2
        : type === "upvote"
        ? 1
        : -1;
      setVotes((prev) => prev + adjustment);
      setUserVote(type);
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

  const hasAcceptedAnswer = !!question.accepted_answer_id;

  return (
    <Link href={`/question/${question.question_id}`}>
      <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl group hover:bg-foreground-100 transition">
        <CardContent className="p-0">
          <div className="flex">
            {/* Content Section */}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                    {question.author_name && (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getAuthorInitials(question.author_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="pr-3">u/{question.author_name}</span>
                      </>
                    )}
                    <span>{formatTimeAgo(question.created_at)}</span>
                    {hasAcceptedAnswer && (
                      <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                    )}
                  </div>

                  <h3 className="text-lg font-semibold group-hover:text-primary cursor-pointer line-clamp-2 mb-1 transition">
                    {question.title}
                  </h3>

                  <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
                    {/* Strip HTML tags for preview */}
                    {question.description?.replace(/<[^>]*>/g, "")}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {question.tags.map((tag) => (
                      <Badge
                        key={tag}
                        className="text-xs bg-foreground-200 font-light text-foreground-500"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-start gap-2 text-muted-foreground">
                    <div
                      className={`flex flex-row items-center p-1 gap-2 rounded-full text-foreground ${
                        userVote === "upvote"
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
                        className={`h-8 w-8 p-0 hover:text-primary`}
                        isIconOnly
                        onPress={() => handleVote("upvote")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <span className={`font-bold text-base`}>
                        {votes || 0}
                      </span>
                      <Button
                        variant="light"
                        size="sm"
                        radius="full"
                        className={`h-8 w-8 p-0 hover:text-violet-600`}
                        isIconOnly
                        onPress={() => handleVote("downvote")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      variant="flat"
                      radius="full"
                      className="text-base font-bold"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {question.answer_count || 0}
                    </Button>

                    {isBookmarked && (
                      <div className="ml-auto">
                        <div className="h-2 w-2 bg-primary rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

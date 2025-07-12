"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@heroui/react";
import { ArrowDown, ArrowUp, Check, CheckCheck } from "lucide-react";
import Image from "next/image";
import { ReactNode } from "react";

export interface QACardProps {
  type: "question" | "answer";
  id?: number;
  title?: string;
  content: string | ReactNode;
  tags?: string[];
  author: { name: string; email: string; picture: string };
  votes: number;
  userVote?: "up" | "down" | null;
  createdAt: string;
  isAccepted?: boolean;
  onVote?: (type: "up" | "down") => void;
  className?: string;
  children?: ReactNode;
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
  className = "",
  children,
}: QACardProps) {
  const isQuestion = type === "question";

  // Different sizes based on type
  const cardClasses = isQuestion
    ? "shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl p-0"
    : `shadow-none outline-1 rounded-2xl transition-colors ${
        isAccepted
          ? "bg-green-500/30 outline-green-400 border-green-400"
          : "bg-foreground-50 outline-foreground-100"
      }`;

  const titleSize = isQuestion ? "text-2xl" : "text-lg";
  const contentPadding = isQuestion ? "p-4" : "pt-6";
  const headerPadding = isQuestion ? "pb-4 p-4" : "pb-4";

  const handleVote = (voteType: "up" | "down") => {
    if (onVote) {
      onVote(voteType);
    }
  };

  return (
    <Card className={`${cardClasses} ${className}`}>
      {/* Header only for questions */}
      {isQuestion && title && (
        <CardHeader className={headerPadding}>
          <h1 className={`${titleSize} font-medium mb-2`}>{title}</h1>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  className="text-xs bg-foreground-200 font-light text-foreground-500 hover:bg-primary/10 cursor-pointer transition-colors"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className={`pt-0 ${contentPadding}`}>
        {isAccepted && (
          <div className="text-sm flex gap-2 mb-5 bg-green-500/50 w-fit rounded-full px-3 py-1 text-foreground items-center">
            <CheckCheck width={19} height={19} />
            Accepted Answer
          </div>
        )}

        <div className="flex gap-4">
          {/* Voting Section */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex flex-col items-center gap-1 p-2 rounded-full transition-colors ${
                userVote === "up"
                  ? "bg-primary"
                  : userVote === "down"
                  ? "bg-violet-600"
                  : "bg-foreground-200"
              }`}
            >
              <Button
                variant="light"
                size="sm"
                radius="full"
                className="h-8 w-8 p-0 hover:text-primary transition-colors"
                isIconOnly
                onPress={() => handleVote("up")}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <span className="font-bold text-base">{votes}</span>
              <Button
                variant="light"
                size="sm"
                radius="full"
                className="h-8 w-8 p-0 hover:text-violet-600 transition-colors"
                isIconOnly
                onPress={() => handleVote("down")}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1">
            <div className="prose prose-sm max-w-none mb-4 flex gap-10">
              {content && <div dangerouslySetInnerHTML={{ __html: content }} />}
            </div>

            {/* Author and timestamp info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-foreground-200 pt-4">
              <div className="flex items-center gap-2">
                <span>
                  {isQuestion ? "Asked" : "Answered"}{" "}
                  {new Date(createdAt).toDateString()}
                </span>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    <Image
                      src={
                        author?.picture ||
                        "https://links.aryanranderiya.com/l/default_user"
                      }
                      alt={author?.name}
                      className="rounded-full"
                      height={20}
                      width={20}
                    />
                  </AvatarFallback>
                </Avatar>
                <span>u/{author?.name}</span>
              </div>
            </div>

            {/* Additional children content */}
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

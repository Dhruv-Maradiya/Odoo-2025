"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Share,
  Bookmark,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@heroui/react";
import Image from "next/image";

interface Question {
  id: number;
  title: string;
  description: string;
  tags: string[];
  author: string;
  answers: number;
  votes: number;
  createdAt: string;
  bookmarked?: boolean;
}

interface QuestionCardProps {
  question: Question;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const [votes, setVotes] = useState(question.votes);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [bookmarked, setBookmarked] = useState(question.bookmarked || false);

  const handleVote = (type: "up" | "down") => {
    if (userVote === type) {
      // Remove vote
      setVotes((prev) => prev + (type === "up" ? -1 : 1));
      setUserVote(null);
    } else {
      // Add or change vote
      const adjustment = userVote
        ? type === "up"
          ? 2
          : -2
        : type === "up"
        ? 1
        : -1;
      setVotes((prev) => prev + adjustment);
      setUserVote(type);
    }
  };

  return (
    <Card className="shadow-none bg-foreground-100 rounded-2xl">
      <CardContent className="p-0">
        <div className="flex">
          {/* Voting Section - Reddit Style */}
          <div
            className={`flex flex-col items-center p-1 gap-2 rounded-full h-fit m-3 mr-1  ${
              userVote === "up"
                ? "text-white bg-primary"
                : userVote === "down"
                ? "bg-purple-500"
                : "bg-foreground-200"
            }`}
          >
            <Button
              variant="light"
              size="sm"
              radius="full"
              className={`h-8 w-8 p-0 `}
              isIconOnly
              onPress={() => handleVote("up")}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <span className={`font-bold text-base`}>{votes}</span>
            <Button
              variant="light"
              size="sm"
              radius="full"
              className={`h-8 w-8 p-0 `}
              isIconOnly
              onPress={() => handleVote("down")}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      <Image
                        src={"https://github.com/aryanranderiya.png"}
                        alt="dummy image"
                        width={20}
                        height={20}
                      />
                    </AvatarFallback>
                  </Avatar>
                  <span>u/{question.author}</span>
                  <span className="pl-3">{question.createdAt}</span>
                </div>

                <Link href={`/question/${question.id}`}>
                  <h3 className="text-lg font-semibold hover:text-primary cursor-pointer mb-2 line-clamp-2">
                    {question.title}
                  </h3>
                </Link>

                <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
                  {question.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {question.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="text-xs hover:bg-primary/30 cursor-pointer bg-zinc-300 font-light text-zinc-800"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="flat"
                      size="sm"
                      className="h-8 px-2 text-xs"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {question.answers}
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button variant="flat" size="sm" className="h-8 px-2">
                      <Share className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="flat"
                      size="sm"
                      className={`h-8 px-2 ${bookmarked ? "text-primary" : ""}`}
                      onClick={() => setBookmarked(!bookmarked)}
                    >
                      <Bookmark
                        className={`h-3 w-3 ${
                          bookmarked ? "fill-current" : ""
                        }`}
                      />
                    </Button>
                    <Button variant="flat" size="sm" className="h-8 px-2">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

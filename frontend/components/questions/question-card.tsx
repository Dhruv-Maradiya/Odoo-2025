"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@heroui/react";
import { Comment03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
    <Link href={`/question/${question.id}`}>
      <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl group hover:bg-foreground-100 transition">
        <CardContent className="p-0">
          <div className="flex">
            {/* Content Section */}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
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

                  <h3 className="text-lg font-semibold group-hover:text-primary cursor-pointer line-clamp-2 mb-1 transition">
                    {question.title}
                  </h3>

                  <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
                    {question.description}
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
                        className={`h-8 w-8 p-0 hover:text-primary`}
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
                        className={`h-8 w-8 p-0 hover:text-violet-600`}
                        isIconOnly
                        onPress={() => handleVote("down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      variant="flat"
                      radius="full"
                      className="text-base font-bold"
                    >
                      <HugeiconsIcon icon={Comment03Icon} />
                      {question.answers}
                    </Button>
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

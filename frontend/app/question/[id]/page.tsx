"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Header } from "@/components/layout/header";
import { QACard } from "@/components/qa/qa-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BreadcrumbItem, Breadcrumbs, Button } from "@heroui/react";
import Link from "next/link";
import { useState } from "react";

const mockQuestion = {
  id: 1,
  title: "How to join 2 columns in a data set to make a separate column in SQL",
  description:
    "I do not know the code for it as I am a beginner. As an example what I need to do is like there is a column 1 containing First name and column 2 consists of last name I want a column to combine both first name and last name to make a separate column containing full name.",
  tags: ["SQL", "Database"],
  author: "john_doe",
  votes: 12,
  createdAt: "2 hours ago",
  answers: [
    {
      id: 1,
      content:
        "<p>You can use the <strong>CONCAT</strong> function or the <strong>||</strong> operator to combine columns:</p><pre><code>SELECT first_name, last_name, CONCAT(first_name, ' ', last_name) AS full_name FROM your_table;</code></pre><p>Or alternatively:</p><pre><code>SELECT first_name, last_name, first_name || ' ' || last_name AS full_name FROM your_table;</code></pre>",
      author: "sql_expert",
      votes: 8,
      isAccepted: true,
      createdAt: "1 hour ago",
    },
    {
      id: 2,
      content:
        "<p>Another approach is to use the <strong>CONCAT_WS</strong> function which handles NULL values better:</p><pre><code>SELECT CONCAT_WS(' ', first_name, last_name) AS full_name FROM your_table;</code></pre>",
      author: "database_guru",
      votes: 3,
      isAccepted: false,
      createdAt: "30 minutes ago",
    },
  ],
};

export default function QuestionDetailPage() {
  const [newAnswer, setNewAnswer] = useState("");
  const [questionVotes, setQuestionVotes] = useState(mockQuestion.votes);
  const [questionUserVote, setQuestionUserVote] = useState<
    "up" | "down" | null
  >(null);
  const [answerVotes, setAnswerVotes] = useState<{ [key: number]: number }>({
    1: 8,
    2: 3,
  });
  const [answerUserVotes, setAnswerUserVotes] = useState<{
    [key: number]: "up" | "down" | null;
  }>({});
  const [isLoggedIn] = useState(true);

  const handleQuestionVote = (type: "up" | "down") => {
    if (questionUserVote === type) {
      setQuestionVotes((prev) => prev + (type === "up" ? -1 : 1));
      setQuestionUserVote(null);
    } else {
      const adjustment = questionUserVote
        ? type === "up"
          ? 2
          : -2
        : type === "up"
        ? 1
        : -1;
      setQuestionVotes((prev) => prev + adjustment);
      setQuestionUserVote(type);
    }
  };

  const handleAnswerVote = (answerId: number, type: "up" | "down") => {
    const currentVote = answerUserVotes[answerId];
    if (currentVote === type) {
      setAnswerVotes((prev) => ({
        ...prev,
        [answerId]: prev[answerId] + (type === "up" ? -1 : 1),
      }));
      setAnswerUserVotes((prev) => ({ ...prev, [answerId]: null }));
    } else {
      const adjustment = currentVote
        ? type === "up"
          ? 2
          : -2
        : type === "up"
        ? 1
        : -1;
      setAnswerVotes((prev) => ({
        ...prev,
        [answerId]: prev[answerId] + adjustment,
      }));
      setAnswerUserVotes((prev) => ({ ...prev, [answerId]: type }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={isLoggedIn} />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          {/* <Link href="/" className="hover:text-primary transition-colors">
            Questions
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground truncate"></span> */}

          <Breadcrumbs>
            <BreadcrumbItem href="/">Questions</BreadcrumbItem>
            <BreadcrumbItem className="truncate max-w-20">
              Lorem ipsum dolor sit amet, consectetur adipisicing elit.
              Praesentium, quaerat?
            </BreadcrumbItem>
          </Breadcrumbs>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Question */}
            <QACard
              type="question"
              title={mockQuestion.title}
              content={mockQuestion.description}
              tags={mockQuestion.tags}
              author={mockQuestion.author}
              votes={questionVotes}
              userVote={questionUserVote}
              createdAt={mockQuestion.createdAt}
              onVote={handleQuestionVote}
            />

            {/* Answers Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {mockQuestion.answers.length} Answer
                {mockQuestion.answers.length !== 1 ? "s" : ""}
              </h2>

              <div className="space-y-4">
                {mockQuestion.answers.map((answer) => (
                  <QACard
                    key={answer.id}
                    type="answer"
                    content={answer.content}
                    author={answer.author}
                    votes={answerVotes[answer.id]}
                    userVote={answerUserVotes[answer.id]}
                    createdAt={answer.createdAt}
                    isAccepted={answer.isAccepted}
                    onVote={(type) => handleAnswerVote(answer.id, type)}
                  />
                ))}
              </div>
            </div>

            {/* Submit Answer */}
            <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold">Your Answer</h3>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <RichTextEditor
                  content={newAnswer}
                  onChange={setNewAnswer}
                  placeholder="Write your answer here..."
                />

                <div className="flex justify-end">
                  <Button radius="full" color="primary">
                    Post Your Answer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 ">
            <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl sticky top-20">
              <CardHeader className="pb-4">
                <h4 className="font-semibold">Related Questions</h4>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Link
                  href="#"
                  className="block text-sm hover:text-primary transition-colors p-2 rounded-lg hover:bg-foreground-100"
                >
                  How to concatenate strings in MySQL?
                </Link>
                <Link
                  href="#"
                  className="block text-sm hover:text-primary transition-colors p-2 rounded-lg hover:bg-foreground-100"
                >
                  SQL JOIN vs UNION - What's the difference?
                </Link>
                <Link
                  href="#"
                  className="block text-sm hover:text-primary transition-colors p-2 rounded-lg hover:bg-foreground-100"
                >
                  Best practices for database column naming
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

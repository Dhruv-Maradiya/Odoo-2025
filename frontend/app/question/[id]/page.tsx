"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Header } from "@/components/layout/header";
import { QACard } from "@/components/qa/qa-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuestion, useSimilarQuestions } from "@/hooks/use-question-queries";
import { BreadcrumbItem, Breadcrumbs, Button } from "@heroui/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params.id as string;
  const { data: questionData, isLoading, error } = useQuestion(questionId);
  const { data: similarQuestionsData } = useSimilarQuestions(questionId);

  // Voting state
  const [questionVotes, setQuestionVotes] = useState<number>(
    questionData?.vote_count || 0
  );
  const [questionUserVote, setQuestionUserVote] = useState<
    "up" | "down" | null
  >(null);
  const [answerVotes, setAnswerVotes] = useState<{ [key: string]: number }>(
    questionData?.answers?.reduce((acc, answer) => {
      acc[answer.id] = answer.vote_count;
      return acc;
    }, {} as { [key: string]: number }) || {}
  );
  const [answerUserVotes, setAnswerUserVotes] = useState<{
    [key: string]: "up" | "down" | null;
  }>({});
  const [newAnswer, setNewAnswer] = useState("");

  const handleQuestionVote = (type: "up" | "down") => {
    if (questionUserVote === type) {
      setQuestionVotes((prev: number) => prev + (type === "up" ? -1 : 1));
      setQuestionUserVote(null);
    } else {
      const adjustment = questionUserVote
        ? type === "up"
          ? 2
          : -2
        : type === "up"
        ? 1
        : -1;
      setQuestionVotes((prev: number) => prev + adjustment);
      setQuestionUserVote(type);
    }
  };

  const handleAnswerVote = (answerId: string, type: "up" | "down") => {
    const currentVote = answerUserVotes[answerId];
    if (currentVote === type) {
      setAnswerVotes((prev) => ({
        ...prev,
        [answerId]: (prev[answerId] || 0) + (type === "up" ? -1 : 1),
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
        [answerId]: (prev[answerId] || 0) + adjustment,
      }));
      setAnswerUserVotes((prev) => ({ ...prev, [answerId]: type }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Loading...
      </div>
    );
  }
  if (error || !questionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Failed to load question.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Breadcrumbs>
            <BreadcrumbItem href="/">Questions</BreadcrumbItem>
            <BreadcrumbItem className="truncate max-w-20">
              {questionData.title}
            </BreadcrumbItem>
          </Breadcrumbs>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Question */}
            <QACard
              type="question"
              title={questionData.title}
              content={questionData.description}
              tags={questionData.tags}
              author={questionData.author}
              votes={questionVotes}
              userVote={questionUserVote}
              createdAt={questionData.created_at}
              onVote={handleQuestionVote}
            />

            {/* Answers Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {questionData.answers.length} Answer
                {questionData.answers.length !== 1 ? "s" : ""}
              </h2>

              <div className="space-y-4">
                {questionData.answers.map((answer) => (
                  <QACard
                    key={answer.id}
                    type="answer"
                    content={answer.content}
                    author={answer.author}
                    votes={answerVotes[answer.id]}
                    userVote={answerUserVotes[answer.id]}
                    createdAt={answer.created_at}
                    isAccepted={answer.is_accepted}
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
                {similarQuestionsData?.similar_questions?.map(
                  (question, index) => (
                    <Link
                      key={index}
                      href={`/question/${question.question_id}`}
                      className="block text-sm hover:text-primary transition-colors p-2 rounded-lg hover:bg-foreground-100"
                    >
                      {question.title}
                    </Link>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

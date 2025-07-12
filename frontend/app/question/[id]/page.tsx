"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { MainLayout } from "@/components/layout/main-layout";
import { QACard } from "@/components/qa/qa-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BreadcrumbItem, Breadcrumbs, Button, Spinner } from "@heroui/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getAuthenticatedClient, getApiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { QuestionWithAnswers, Question } from "@/types/api";
import { formatDistanceToNow } from "date-fns";

export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params.id as string;
  const { data: session } = useSession();

  const [questionData, setQuestionData] = useState<QuestionWithAnswers | null>(
    null
  );
  const [similarQuestionsData, setSimilarQuestionsData] = useState<{
    similar_questions: Question[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [isVotingQuestion, setIsVotingQuestion] = useState(false);
  const [isVotingAnswer, setIsVotingAnswer] = useState<string | null>(null);
  const [newAnswer, setNewAnswer] = useState("");

  // Helper function to format time
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  // Fetch question data
  useEffect(() => {
    const fetchQuestion = async () => {
      if (!questionId) return;

      try {
        setIsLoading(true);
        setError(null);
        const apiClient = getApiClient();
        const result = await apiClient.getQuestion(questionId, true);
        setQuestionData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestion();
  }, [questionId, session]);

  // Fetch similar questions
  useEffect(() => {
    const fetchSimilarQuestions = async () => {
      if (!questionId) return;

      try {
        const apiClient = getApiClient();
        const result = await apiClient.getSimilarQuestions(questionId, 5);
        setSimilarQuestionsData(result);
      } catch (err) {
        console.error("Failed to fetch similar questions:", err);
      }
    };

    fetchSimilarQuestions();
  }, [questionId, session?.accessToken]);

  const handleQuestionVote = async (type: "upvote" | "downvote") => {
    if (!questionData || !session?.accessToken) {
      toast.error(
        "Please log in to vote",
        "You need to be logged in to vote on questions"
      );
      return;
    }

    if (isVotingQuestion) return;

    // Determine the vote type to send to API based on current state
    let voteTypeToSend: "upvote" | "downvote";

    if (questionData.user_vote === type) {
      // User is clicking the same vote type - remove the vote (send opposite to toggle off)
      voteTypeToSend = type === "upvote" ? "downvote" : "upvote";
    } else {
      // User is clicking a different vote type or no vote exists - set the new vote
      voteTypeToSend = type;
    }

    setIsVotingQuestion(true);
    try {
      const apiClient = getAuthenticatedClient(session.accessToken);
      const result = await apiClient.voteQuestion(
        questionData.question_id,
        voteTypeToSend
      );

      // Update local state with proper vote count calculation
      setQuestionData((prev) =>
        prev
          ? {
              ...prev,
              vote_count: result.vote_count,
              user_vote: result.user_vote,
            }
          : null
      );
    } catch (error) {
      console.error("Failed to vote on question:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsVotingQuestion(false);
    }
  };

  const handleAnswerVote = async (
    answerId: string,
    type: "upvote" | "downvote"
  ) => {
    if (!session?.accessToken) {
      toast.error(
        "Please log in to vote",
        "You need to be logged in to vote on answers"
      );
      return;
    }

    if (isVotingAnswer === answerId) return;

    // Find the answer to get current vote state
    const answer = questionData?.answers.find((a) => a.id === answerId);
    if (!answer) return;

    // Determine the vote type to send to API based on current state
    let voteTypeToSend: "upvote" | "downvote";

    if (answer.user_vote === type) {
      // User is clicking the same vote type - remove the vote (send opposite to toggle off)
      voteTypeToSend = type === "upvote" ? "downvote" : "upvote";
    } else {
      // User is clicking a different vote type or no vote exists - set the new vote
      voteTypeToSend = type;
    }

    setIsVotingAnswer(answerId);
    try {
      const apiClient = getAuthenticatedClient(session.accessToken);
      const result = await apiClient.voteAnswer(answerId, voteTypeToSend);

      // Update local state with proper vote count calculation
      setQuestionData((prev) =>
        prev
          ? {
              ...prev,
              answers: prev.answers.map((a) => {
                if (a.id === answerId) {
                  // Calculate new vote count based on the vote change
                  let newVoteCount = a.vote_count;
                  let newUserVote: "upvote" | "downvote" | null = null;

                  if (answer.user_vote === type) {
                    // Removing vote
                    newUserVote = null;
                    if (type === "upvote") {
                      newVoteCount -= 1;
                    } else {
                      newVoteCount += 1;
                    }
                  } else {
                    // Adding or changing vote
                    newUserVote = type;
                    if (answer.user_vote === null) {
                      // No previous vote
                      if (type === "upvote") {
                        newVoteCount += 1;
                      } else {
                        newVoteCount -= 1;
                      }
                    } else {
                      // Changing from one vote to another
                      if (
                        answer.user_vote === "upvote" &&
                        type === "downvote"
                      ) {
                        newVoteCount -= 2; // From +1 to -1
                      } else if (
                        answer.user_vote === "downvote" &&
                        type === "upvote"
                      ) {
                        newVoteCount += 2; // From -1 to +1
                      }
                    }
                  }

                  return {
                    ...a,
                    vote_count: newVoteCount,
                    user_vote: newUserVote,
                  };
                }
                return a;
              }),
            }
          : null
      );
    } catch (error) {
      console.error("Failed to vote on answer:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsVotingAnswer(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl flex items-center justify-center">
          <Spinner color="primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !questionData) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl flex items-center justify-center">
          Failed to load question.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
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
              id={questionData.question_id}
              title={questionData.title}
              content={questionData.description}
              tags={questionData.tags}
              author={{
                ...questionData.author,
                picture: questionData.author.picture || "",
              }}
              votes={questionData.vote_count}
              userVote={questionData.user_vote}
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
                    id={answer.id}
                    content={answer.content}
                    author={{
                      ...answer.author,
                      picture: answer.author.picture || "",
                    }}
                    votes={answer.vote_count}
                    userVote={answer.user_vote}
                    createdAt={answer.created_at}
                    isAccepted={answer.is_accepted}
                    onVote={(type) => handleAnswerVote(answer.id, type)}
                  />
                ))}
              </div>
            </div>

            {/* Submit Answer */}
            <Card
              className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl"
              id="comments"
            >
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
          <div className="lg:col-span-1">
            <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl sticky top-20">
              <CardHeader className="pb-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Related Questions
                </h4>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {!similarQuestionsData ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse p-4 rounded-xl border border-foreground-200"
                      >
                        <div className="h-4 bg-foreground-200 rounded mb-3"></div>
                        <div className="h-3 bg-foreground-200 rounded w-3/4 mb-3"></div>
                        <div className="flex gap-2">
                          <div className="h-2 bg-foreground-200 rounded w-16"></div>
                          <div className="h-2 bg-foreground-200 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : similarQuestionsData?.similar_questions?.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 text-muted-foreground mx-auto mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.172 16.172a4 4 0 015.656 0M9 12l6 6m-6-6l6 6m6-6a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-muted-foreground">
                      No related questions found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {similarQuestionsData?.similar_questions?.map(
                      (question, index) => (
                        <Link
                          key={question.question_id}
                          href={`/question/${question.question_id}`}
                          className="group block p-4 rounded-xl border border-foreground-200 hover:border-primary/30 hover:bg-foreground-100/50 transition-all duration-200 hover:shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            {/* Question status indicator */}
                            <div className="flex flex-col items-center gap-1 mt-1">
                              <div className="flex items-center gap-1 text-xs">
                                <svg
                                  className="w-3 h-3 text-muted-foreground"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                  />
                                </svg>
                                <span className="font-medium text-muted-foreground">
                                  {question.vote_count}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <svg
                                  className="w-3 h-3 text-muted-foreground"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                                <span className="font-medium text-muted-foreground">
                                  {question.answer_count}
                                </span>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Question title */}
                              <h5 className="text-sm font-medium text-foreground-900 group-hover:text-primary transition-colors line-clamp-3 mb-2 leading-snug">
                                {question.title}
                              </h5>

                              {/* Author and time */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <span className="font-medium">
                                  {question.author.name}
                                </span>
                                <span>•</span>
                                <span>
                                  {formatTimeAgo(question.created_at)}
                                </span>
                              </div>

                              {/* Tags */}
                              {question.tags && question.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {question.tags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-md font-medium"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {question.tags.length > 2 && (
                                    <span className="inline-block px-2 py-0.5 text-xs text-muted-foreground bg-foreground-200 rounded-md">
                                      +{question.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Accepted answer indicator */}
                              {question.has_accepted_answer && (
                                <div className="flex items-center gap-1 text-green-600 mt-2">
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                  </svg>
                                  <span className="font-medium text-xs">
                                    Solved
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

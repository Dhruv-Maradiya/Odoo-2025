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
  const [isAcceptingAnswer, setIsAcceptingAnswer] = useState<string | null>(null);
  const [newAnswer, setNewAnswer] = useState("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

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
    const answer = questionData?.answers.find((a) => a.answer_id === answerId);
    if (!answer) return;

    // Always send the clicked vote type to the backend
    // The backend will handle the logic of toggling off if it's the same vote
    const voteTypeToSend = type;

    setIsVotingAnswer(answerId);
    try {
      const apiClient = getAuthenticatedClient(session.accessToken);
      const result = await apiClient.voteAnswer(answerId, voteTypeToSend);

      // Update local state based on the API response
      setQuestionData((prev) =>
        prev
          ? {
            ...prev,
            answers: prev.answers.map((a) => {
              if (a.answer_id === answerId) {
                return {
                  ...a,
                  vote_count: result.vote_count,
                  user_vote: result.user_vote as "upvote" | "downvote" | null,
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

  const handleAcceptAnswer = async (answerId: string) => {
    if (!session?.accessToken) {
      toast.error(
        "Please log in to accept answers",
        "You need to be logged in to accept answers"
      );
      return;
    }

    if (!questionData) return;

    // Check if current user is the question author using user ID
    if (session.user?.id !== questionData.author.user_id) {
      toast.error(
        "Not authorized",
        "Only the question author can accept answers"
      );
      return;
    }

    if (isAcceptingAnswer === answerId) return;

    setIsAcceptingAnswer(answerId);
    try {
      const apiClient = getAuthenticatedClient(session.accessToken);
      await apiClient.acceptAnswer(questionData.question_id, answerId);

      // Update local state to reflect the accepted answer
      setQuestionData((prev) =>
        prev
          ? {
            ...prev,
            has_accepted_answer: true,
            answers: prev.answers.map((a) => ({
              ...a,
              is_accepted: a.answer_id === answerId,
            })),
          }
          : null
      );

      toast.success(
        "Answer accepted",
        "The answer has been marked as accepted"
      );
    } catch (error) {
      console.error("Failed to accept answer:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsAcceptingAnswer(null);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session?.accessToken) {
      toast.error(
        "Please log in to post answers",
        "You need to be logged in to post answers"
      );
      return;
    }

    if (!newAnswer.trim()) {
      toast.error(
        "Answer cannot be empty",
        "Please write your answer before posting"
      );
      return;
    }

    if (isSubmittingAnswer) return;

    setIsSubmittingAnswer(true);
    try {
      const apiClient = getAuthenticatedClient(session.accessToken);
      const answerData = {
        content: newAnswer.trim(),
        images: [], // You can extend this to support images later
      };

      const newAnswerResponse = await apiClient.createAnswer(
        questionId,
        answerData
      );

      // Add the new answer to the local state
      setQuestionData((prev) =>
        prev
          ? {
            ...prev,
            answer_count: prev.answer_count + 1,
            answers: [
              ...prev.answers,
              {
                answer_id: newAnswerResponse.answer_id,
                question_id: questionId,
                content: newAnswerResponse.content,
                author: newAnswerResponse.author,
                vote_count: 0,
                is_accepted: false,
                images: newAnswerResponse.images || [],
                created_at: newAnswerResponse.created_at,
                updated_at: newAnswerResponse.updated_at,
                user_vote: null,
                comments: [],
              },
            ],
          }
          : null
      );

      // Clear the answer input
      setNewAnswer("");

      toast.success(
        "Answer posted successfully",
        "Your answer has been posted"
      );
    } catch (error) {
      console.error("Failed to post answer:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsSubmittingAnswer(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-4 space-y-6">
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
                    key={answer.answer_id}
                    type="answer"
                    id={answer.answer_id}
                    content={answer.content}
                    author={{
                      ...answer.author,
                      picture: answer.author.picture || "",
                    }}
                    votes={answer.vote_count}
                    userVote={answer.user_vote}
                    createdAt={answer.created_at}
                    isAccepted={answer.is_accepted}
                    onVote={(type) => handleAnswerVote(answer.answer_id, type)}
                    onAccept={() => handleAcceptAnswer(answer.answer_id)}
                    canAccept={
                      session?.user?.id === questionData.author.user_id &&
                      !questionData.has_accepted_answer
                    }
                    isAccepting={isAcceptingAnswer === answer.answer_id}
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
                  <Button
                    radius="full"
                    color="primary"
                    onClick={handleSubmitAnswer}
                    disabled={isSubmittingAnswer || !newAnswer.trim()}
                  >
                    {isSubmittingAnswer ? "Posting..." : "Post Your Answer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2">
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


                            <div className="flex-1 min-w-0">
                              {/* Question title */}
                              <h5 className="text-sm font-medium text-foreground-900 group-hover:text-primary transition-colors line-clamp-3 mb-2 leading-snug">
                                {question.title}
                              </h5>
                              <span>
                                {formatTimeAgo(question.created_at)}
                              </span>
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
    </MainLayout >
  );
}

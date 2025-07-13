"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Header } from "@/components/layout/header";
import { QACard } from "@/components/qa/qa-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BreadcrumbItem, Breadcrumbs, Button, Spinner } from "@heroui/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getApiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { QuestionWithAnswers, Question } from "@/types/api";

export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params.id as string;
  const { data: session } = useSession();

  const [questionData, setQuestionData] = useState<QuestionWithAnswers | null>(null);
  const [similarQuestionsData, setSimilarQuestionsData] = useState<{ similar_questions: Question[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [isVotingQuestion, setIsVotingQuestion] = useState(false);
  const [isVotingAnswer, setIsVotingAnswer] = useState<string | null>(null);
  const [isAcceptingAnswer, setIsAcceptingAnswer] = useState<string | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [newAnswer, setNewAnswer] = useState("");

  // Fetch question data
  useEffect(() => {
    const fetchQuestion = async () => {
      if (!questionId) return;

      try {
        setIsLoading(true);
        setError(null);
        const apiClient = getApiClient(session?.accessToken);
        const result = await apiClient.getQuestion(questionId, true);
        setQuestionData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestion();
  }, [questionId, session?.accessToken]);

  // Fetch similar questions
  useEffect(() => {
    const fetchSimilarQuestions = async () => {
      if (!questionId) return;

      try {
        const apiClient = getApiClient(session?.accessToken);
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
      toast.error("Please log in to vote", "You need to be logged in to vote on questions");
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
      const apiClient = getApiClient(session.accessToken);
      const result = await apiClient.voteQuestion(questionData.question_id, voteTypeToSend);

      // Update local state with proper vote count calculation
      setQuestionData(prev => prev ? {
        ...prev,
        vote_count: result.vote_count,
        user_vote: result.user_vote
      } : null);

    } catch (error) {
      console.error("Failed to vote on question:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsVotingQuestion(false);
    }
  };

  const handleAnswerVote = async (answerId: string, type: "upvote" | "downvote") => {
    if (!session?.accessToken) {
      toast.error("Please log in to vote", "You need to be logged in to vote on answers");
      return;
    }

    if (isVotingAnswer === answerId) return;

    // Find the answer to get current vote state
    const answer = questionData?.answers.find(a => a.id === answerId);
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
      const apiClient = getApiClient(session.accessToken);
      const result = await apiClient.voteAnswer(answerId, voteTypeToSend);

      // Update local state with proper vote count calculation
      setQuestionData(prev => prev ? {
        ...prev,
        answers: prev.answers.map(a => {
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
                if (answer.user_vote === "upvote" && type === "downvote") {
                  newVoteCount -= 2; // From +1 to -1
                } else if (answer.user_vote === "downvote" && type === "upvote") {
                  newVoteCount += 2; // From -1 to +1
                }
              }
            }

            return {
              ...a,
              vote_count: newVoteCount,
              user_vote: newUserVote
            };
          }
          return a;
        })
      } : null);


    } catch (error) {
      console.error("Failed to vote on answer:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsVotingAnswer(null);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!session?.accessToken) {
      toast.error("Please log in to accept answers", "You need to be logged in to accept answers");
      return;
    }

    if (isAcceptingAnswer === answerId) return;

    setIsAcceptingAnswer(answerId);
    try {
      const apiClient = getApiClient(session.accessToken);
      await apiClient.acceptAnswer(questionId, answerId);

      // Update local state to reflect the accepted answer
      setQuestionData(prev => prev ? {
        ...prev,
        answers: prev.answers.map(a => ({
          ...a,
          is_accepted: a.id === answerId
        })),
        has_accepted_answer: true
      } : null);

      toast.success("Answer accepted", "This answer has been marked as accepted");
    } catch (error) {
      console.error("Failed to accept answer:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsAcceptingAnswer(null);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session?.accessToken) {
      toast.error("Please log in to answer", "You need to be logged in to post answers");
      return;
    }

    if (!newAnswer.trim()) {
      toast.error("Answer cannot be empty", "Please enter your answer");
      return;
    }

    if (isSubmittingAnswer) return;

    setIsSubmittingAnswer(true);
    try {
      const apiClient = getApiClient(session.accessToken);
      const answerData = {
        content: newAnswer.trim(),
      };

      const newAnswerData = await apiClient.createAnswer(questionId, answerData);

      // Add the new answer to the local state
      setQuestionData(prev => prev ? {
        ...prev,
        answers: [...prev.answers, newAnswerData],
        answer_count: prev.answer_count + 1
      } : null);

      // Clear the form
      setNewAnswer("");
      toast.success("Answer posted", "Your answer has been posted successfully");
    } catch (error) {
      console.error("Failed to post answer:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner color="primary" />
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
              id={questionData.question_id}
              title={questionData.title}
              content={questionData.description}
              tags={questionData.tags}
              author={questionData.author}
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
                    author={answer.author}
                    votes={answer.vote_count}
                    userVote={answer.user_vote}
                    createdAt={answer.created_at}
                    isAccepted={answer.is_accepted}
                    questionAuthorId={questionData.author.email}
                    questionId={questionData.question_id}
                    onVote={(type) => handleAnswerVote(answer.id, type)}
                    onAccept={() => handleAcceptAnswer(answer.id)}
                  />
                ))}
              </div>
            </div>

            {/* Submit Answer */}
            {session?.accessToken ? (
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
                    <Button
                      radius="full"
                      color="primary"
                      onPress={handleSubmitAnswer}
                      isDisabled={isSubmittingAnswer || !newAnswer.trim()}
                    >
                      {isSubmittingAnswer ? "Posting..." : "Post Your Answer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-none bg-foreground-50 outline-1 outline-foreground-100 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    Please log in to post an answer
                  </p>
                  <Link href="/auth/login">
                    <Button radius="full" color="primary">
                      Log In to Answer
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
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

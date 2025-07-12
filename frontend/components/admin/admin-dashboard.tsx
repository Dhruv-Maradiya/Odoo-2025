"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { getAuthenticatedClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { Question, User } from "@/types/api";

interface PlatformStats {
  overview: {
    total_questions: number;
    total_answers: number;
    total_comments: number;
    total_users: number;
    total_votes: number;
    flagged_questions: number;
  };
  activity: {
    questions_today: number;
    answers_today: number;
    comments_today: number;
    new_users_today: number;
  };
  top_tags: Array<{
    tag: string;
    count: number;
  }>;
  generated_at: string;
}

export function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isFlagging, setIsFlagging] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set()
  );

  // Fetch stats, questions, and users
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.accessToken) return;

      try {
        setIsLoading(true);
        const apiClient = getAuthenticatedClient(session.accessToken);

        // Fetch admin stats
        const statsResponse = await apiClient.getAdminStats();
        setStats(statsResponse);

        // Fetch recent questions
        const questionsResponse = await apiClient.getQuestions({ limit: 10 });
        setQuestions(questionsResponse.questions);

        // Fetch users
        const usersResponse = await apiClient.getAdminUsers(1, 5);
        setUsers(usersResponse.users);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        toast.error("Failed to load admin data", "Please try again later");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session?.accessToken]);

  const handleDeleteQuestion = async (questionId: string) => {
    if (!session?.accessToken) return;

    try {
      setIsDeleting(questionId);
      const apiClient = getAuthenticatedClient(session.accessToken);
      await apiClient.adminDeleteQuestion(questionId);

      setQuestions((prev) => prev.filter((q) => q.question_id !== questionId));
      toast.success(
        "Question deleted successfully",
        "The question has been removed"
      );
    } catch (error) {
      console.error("Failed to delete question:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFlagQuestion = async (questionId: string) => {
    if (!session?.accessToken) return;

    try {
      setIsFlagging(questionId);
      const apiClient = getAuthenticatedClient(session.accessToken);
      await apiClient.flagQuestion(questionId, "Flagged by admin for review");

      // Update the question in local state
      setQuestions((prev) =>
        prev.map((q) =>
          q.question_id === questionId ? { ...q, is_flagged: true } : q
        )
      );

      toast.success(
        "Question flagged for review",
        "The question has been flagged for moderation"
      );
    } catch (error) {
      console.error("Failed to flag question:", error);
      toast.error("Failed to flag question", "Please try again");
    } finally {
      setIsFlagging(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!session?.accessToken || selectedQuestions.size === 0) return;

    try {
      setIsBulkDeleting(true);
      const apiClient = getAuthenticatedClient(session.accessToken);
      await apiClient.bulkDeleteQuestions(Array.from(selectedQuestions));

      setQuestions((prev) =>
        prev.filter((q) => !selectedQuestions.has(q.question_id))
      );
      setSelectedQuestions(new Set());
      toast.success(
        "Bulk delete completed",
        "Selected questions have been deleted"
      );
    } catch (error) {
      console.error("Failed to bulk delete:", error);
      toast.error("Failed to bulk delete", "Please try again");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!session?.accessToken) return;

    try {
      const apiClient = getAuthenticatedClient(session.accessToken);
      await apiClient.deleteUserAdmin(userId);

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User deleted successfully", "The user has been removed");
    } catch (error) {
      console.error("Failed to delete user:", error);
      // Error toast is handled by axios interceptor
    }
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const selectAllQuestions = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map((q) => q.question_id)));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            You need to be logged in to access the admin dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Platform statistics and moderation tools
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  Total questions on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.overview.total_questions}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  +{stats.activity.questions_today} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Answers</CardTitle>
                <CardDescription>Total answers provided</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.overview.total_answers}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  +{stats.activity.answers_today} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.overview.total_users}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  +{stats.activity.new_users_today} today
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Tags and Recent Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Tags */}
          {stats?.top_tags && stats.top_tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Tags</CardTitle>
                <CardDescription>
                  Most popular tags on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.top_tags.slice(0, 8).map((tag, index) => (
                    <div
                      key={tag.tag}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          #{index + 1}
                        </span>
                        <Badge variant="outline">{tag.tag}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {tag.count} questions
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Questions */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Questions</CardTitle>
                <CardDescription>
                  Latest questions that may need moderation
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {questions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        selectedQuestions.size === questions.length &&
                        questions.length > 0
                      }
                      onCheckedChange={selectAllQuestions}
                    />
                    <span className="text-sm text-muted-foreground">
                      Select All
                    </span>
                  </div>
                )}
                {selectedQuestions.size > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedQuestions.size} selected
                  </span>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={isBulkDeleting || selectedQuestions.size === 0}
                      variant="destructive"
                      size="sm"
                    >
                      {isBulkDeleting
                        ? "Deleting..."
                        : `Bulk Delete (${selectedQuestions.size})`}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bulk Delete Questions</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedQuestions.size}{" "}
                        selected question(s)? This action cannot be undone and
                        will also delete all related answers and comments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No questions to moderate
                </p>
              ) : (
                questions.map((question) => (
                  <div
                    key={question.question_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedQuestions.has(question.question_id)}
                        onCheckedChange={() =>
                          toggleQuestionSelection(question.question_id)
                        }
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{question.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          by {question.author.name} •{" "}
                          {new Date(question.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">
                            {question.vote_count} votes
                          </Badge>
                          <Badge variant="outline">
                            {question.answer_count || 0} answers
                          </Badge>
                          {question.is_flagged && (
                            <Badge variant="destructive">Flagged</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleFlagQuestion(question.question_id)}
                        disabled={isFlagging === question.question_id}
                        variant="outline"
                        size="sm"
                      >
                        {isFlagging === question.question_id
                          ? "Flagging..."
                          : "Flag"}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={isDeleting === question.question_id}
                            variant="destructive"
                            size="sm"
                          >
                            {isDeleting === question.question_id
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Question</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{question.title}
                              "? This action cannot be undone and will also
                              delete all answers and comments.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDeleteQuestion(question.question_id)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

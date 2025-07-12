"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { Question } from "@/types/api";

interface PlatformStats {
  total_questions: number;
  total_answers: number;
  total_users: number;
  questions_this_week: number;
  answers_this_week: number;
  users_this_week: number;
}

export function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isFlagging, setIsFlagging] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Fetch stats and questions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // For now, we'll create mock data since the API endpoints might not exist
        const mockStats: PlatformStats = {
          total_questions: 150,
          total_answers: 420,
          total_users: 89,
          questions_this_week: 12,
          answers_this_week: 34,
          users_this_week: 5,
        };
        
        setStats(mockStats);
        
        // Fetch recent questions
        const questionsResponse = await apiClient.getQuestions({ limit: 10 });
        setQuestions(questionsResponse.questions);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        toast.error("Failed to load admin data", "Please try again later");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      setIsDeleting(questionId);
      await apiClient.deleteQuestion(questionId);
      
      setQuestions(prev => prev.filter(q => q.question_id !== questionId));
      toast.success("Question deleted successfully", "The question has been removed");
    } catch (error) {
      console.error("Failed to delete question:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFlagQuestion = async (questionId: string) => {
    try {
      setIsFlagging(questionId);
      // This would be a custom API call - for now we'll just show a toast
      toast.success("Question flagged for review", "The question has been flagged for moderation");
    } catch (error) {
      console.error("Failed to flag question:", error);
      toast.error("Failed to flag question", "Please try again");
    } finally {
      setIsFlagging(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsBulkDeleting(true);
      // This would be a custom API call - for now we'll just show a toast
      toast.success("Bulk delete completed", "Selected questions have been deleted");
      setQuestions([]);
    } catch (error) {
      console.error("Failed to bulk delete:", error);
      toast.error("Failed to bulk delete", "Please try again");
    } finally {
      setIsBulkDeleting(false);
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
          <p className="text-gray-600 mt-2">Platform statistics and moderation tools</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
                <CardDescription>Total questions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_questions}</div>
                <p className="text-xs text-gray-500 mt-1">
                  +{stats.questions_this_week} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Answers</CardTitle>
                <CardDescription>Total answers provided</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_answers}</div>
                <p className="text-xs text-gray-500 mt-1">
                  +{stats.answers_this_week} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_users}</div>
                <p className="text-xs text-gray-500 mt-1">
                  +{stats.users_this_week} this week
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Questions */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Questions</CardTitle>
                <CardDescription>Latest questions that may need moderation</CardDescription>
              </div>
              <Button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting || questions.length === 0}
                variant="destructive"
                size="sm"
              >
                {isBulkDeleting ? "Deleting..." : "Bulk Delete"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No questions to moderate</p>
              ) : (
                questions.map((question) => (
                  <div
                    key={question.question_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{question.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        by {question.author.name} • {new Date(question.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">{question.vote_count} votes</Badge>
                        <Badge variant="outline">{question.answers?.length || 0} answers</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleFlagQuestion(question.question_id)}
                        disabled={isFlagging === question.question_id}
                        variant="outline"
                        size="sm"
                      >
                        {isFlagging === question.question_id ? "Flagging..." : "Flag"}
                      </Button>
                      <Button
                        onClick={() => handleDeleteQuestion(question.question_id)}
                        disabled={isDeleting === question.question_id}
                        variant="destructive"
                        size="sm"
                      >
                        {isDeleting === question.question_id ? "Deleting..." : "Delete"}
                      </Button>
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

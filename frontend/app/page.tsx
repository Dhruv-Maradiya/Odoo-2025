"use client";

import { Header } from "@/components/layout/header";
import { MainLayout } from "@/components/layout/main-layout";
import { QuestionCard } from "@/components/questions/question-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiClient } from "@/lib/api-client";
import type {
  QuestionSearchRequest,
  QuestionSearchResponse,
} from "@/types/api";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = useSession();

  const [questionsResponse, setQuestionsResponse] =
    useState<QuestionSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Build search params
  const searchParams: QuestionSearchRequest = {
    query: searchQuery || undefined,
    sort_by: sortBy,
    order,
    page,
    limit: 20,
    // Add filter logic based on activeFilters
    has_accepted_answer: activeFilters.includes("answered")
      ? true
      : activeFilters.includes("unanswered")
        ? false
        : undefined,
  };

  // Fetch questions with authentication
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiClient = getApiClient(session?.accessToken);
        const result = await apiClient.getQuestions(searchParams);
        setQuestionsResponse(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [JSON.stringify(searchParams), session?.accessToken]);

  const handleFilterToggle = (filter: string) => {
    setActiveFilters((prev) => {
      const newFilters = prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter];

      // Reset to first page when filters change
      setPage(1);
      return newFilters;
    });
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    setPage(1);

    // Set appropriate order based on sort type
    if (newSortBy === "vote_count" || newSortBy === "view_count") {
      setOrder("desc");
    } else {
      setOrder("desc"); // Default to newest first
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load questions. Please try again.
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Questions List */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-6 border rounded-lg">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex gap-2 mb-3">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-18" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))
          ) : questionsResponse?.questions.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-foreground mb-2">
                No questions found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Be the first to ask a question!"}
              </p>
              <Link href="/ask">
                <Button>Ask a Question</Button>
              </Link>
            </div>
          ) : (
            questionsResponse?.questions.map((question, index) => (
              <QuestionCard question={question} key={index} />
            ))
          )}
        </div>

        {/* Pagination */}
        {questionsResponse && questionsResponse.questions.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!questionsResponse.pagination?.has_prev}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>

              {/* Page numbers */}
              {Array.from(
                { length: Math.min(5, questionsResponse.pagination?.pages) },
                (_, i) => {
                  const pageNum = Math.max(1, page - 2) + i;
                  if (pageNum > questionsResponse.pagination.pages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                }
              )}

              <Button
                variant="outline"
                size="sm"
                disabled={!questionsResponse.pagination?.has_next}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Results summary */}
        {questionsResponse && (
          <div className="text-center mt-4 text-sm text-gray-500">
            Showing {questionsResponse.questions.length} of{" "}
            {questionsResponse.pagination?.total} questions
          </div>
        )}
      </main>
    </div>
  );
}

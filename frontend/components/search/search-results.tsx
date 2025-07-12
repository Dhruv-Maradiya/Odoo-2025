"use client";

import { useSearch } from "@/contexts/search-context";
import { Card, CardBody } from "@heroui/react";
import { Spinner } from "@heroui/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function SearchResults() {
  const { searchQuery, searchResults, isSearching, hasSearched } = useSearch();

  if (!hasSearched && !searchQuery.trim()) {
    return null;
  }

  if (isSearching) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Spinner size="lg" />
          <span className="ml-2">Searching...</span>
        </div>
      </div>
    );
  }

  if (hasSearched && searchResults.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No results found</h2>
          <p className="text-muted-foreground">
            No questions found for "{searchQuery}". Try different keywords.
          </p>
        </div>
      </div>
    );
  }

  if (searchResults.length > 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            Search Results for "{searchQuery}"
          </h2>
          <p className="text-muted-foreground">
            Found {searchResults.length} question(s)
          </p>
        </div>

        <div className="space-y-4">
          {searchResults.map((question) => (
            <Link
              key={question.question_id}
              href={`/question/${question.question_id}`}
            >
              <Card className="shadow-none outline-foreground-300 outline-1 mb-5">
                <CardBody className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold hover:text-primary cursor-pointer line-clamp-2 mb-2">
                        {question.title}
                      </h3>

                      {question.tags && question.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {question.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>by {question.author.name}</span>
                        <span>{question.view_count} views</span>
                        <span>{question.answer_count} answers</span>
                        <span>{question.vote_count} votes</span>
                        {question.has_accepted_answer && (
                          <Badge variant="default" className="text-xs">
                            Accepted Answer
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

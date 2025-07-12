"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { QuestionCard } from "@/components/questions/question-card";
import { QuestionFilters } from "@/components/questions/question-filters";
import { Button } from "@/components/ui/button";

const mockQuestions = [
  {
    id: 1,
    title:
      "How to join 2 columns in a data set to make a separate column in SQL",
    description:
      "I do not know the code for it as I am a beginner. As an example what I need to do is like there is a column 1 containing First name and column 2 consists of last name I want a column to combine both first name and last name to make a separate column containing full name.",
    tags: ["SQL", "Database", "Beginner"],
    author: "john_doe",
    answers: 5,
    votes: 12,
    createdAt: "2 hours ago",
  },
  {
    id: 2,
    title: "React useState not updating immediately - Why does this happen?",
    description:
      "I'm having trouble with useState not updating the state immediately when I call the setter function. The component doesn't re-render with the new value right away. Can someone explain why this happens and how to fix it?",
    tags: ["React", "JavaScript", "Hooks", "State Management"],
    author: "react_dev",
    answers: 3,
    votes: 8,
    createdAt: "4 hours ago",
    bookmarked: true,
  },
  {
    id: 3,
    title: "Best practices for JWT authentication in Node.js applications",
    description:
      "What are the security considerations when implementing JWT authentication in a Node.js application? I want to make sure I'm following industry standards and not introducing vulnerabilities.",
    tags: ["JWT", "Node.js", "Security", "Authentication"],
    author: "security_expert",
    answers: 2,
    votes: 15,
    createdAt: "1 day ago",
  },
];

export default function HomePage() {
  const [sortBy, setSortBy] = useState("newest");
  const [activeFilters, setActiveFilters] = useState<string[]>(["hot"]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleFilterToggle = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        onLoginToggle={() => setIsLoggedIn(!isLoggedIn)}
      />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Link href="/ask" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">Ask New Question</Button>
          </Link>
        </div>

        {/* Filters */}
        <QuestionFilters
          sortBy={sortBy}
          onSortChange={setSortBy}
          activeFilters={activeFilters}
          onFilterToggle={handleFilterToggle}
        />

        {/* Questions List */}
        <div className="flex flex-col gap-3">
          {mockQuestions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2">
            <Button variant="bordered" size="sm" disabled>
              Previous
            </Button>
            {[1, 2, 3, 4, 5].map((page) => (
              <Button
                key={page}
                variant={page === 1 ? "solid" : "bordered"}
                size="sm"
                className="w-8 h-8"
              >
                {page}
              </Button>
            ))}
            <Button variant="bordered" size="sm">
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

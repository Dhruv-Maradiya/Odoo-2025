"use client";

import { Header } from "./header";
import { SearchResults } from "@/components/search/search-results";
import { useSearch } from "@/contexts/search-context";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { hasSearched, searchQuery } = useSearch();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Show search results when user has searched */}
      {hasSearched && searchQuery.trim() ? (
        <SearchResults />
      ) : (
        <main>{children}</main>
      )}
    </div>
  );
}

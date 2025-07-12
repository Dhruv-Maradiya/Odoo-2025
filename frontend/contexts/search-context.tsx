"use client";

import { getApiClient } from "@/lib/api-client";
import { Question } from "@/types/api";
import { useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useState } from "react";
import useDebounce from "@/hooks/use-debounce";
import { toast } from "sonner";

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Question[];
  isSearching: boolean;
  hasSearched: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Question[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { data: session } = useSession();

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        const apiClient = getApiClient(session?.accessToken);
        const results = await apiClient.searchQuestions({
          query: debouncedSearch,
          limit: 20,
        });

        setSearchResults(results.questions || []);
      } catch (error) {
        console.error("Error searching questions:", error);
        toast.error(`${error}`)
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearch, session?.accessToken]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        hasSearched,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}

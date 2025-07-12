import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type {
    Question,
    QuestionWithAnswers,
    QuestionSearchRequest,
    QuestionSearchResponse,
} from '@/types/api';

// Simple hook for fetching questions
export const useQuestions = (params?: QuestionSearchRequest) => {
    const [data, setData] = useState<QuestionSearchResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const result = await apiClient.getQuestions(params);
                setData(result);
            } catch (err) {
                setError(err as Error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestions();
    }, [JSON.stringify(params)]);

    return { data, isLoading, error };
};

// Simple hook for fetching a single question
export const useQuestion = (id: string, incrementView = false) => {
    const [data, setData] = useState<QuestionWithAnswers | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchQuestion = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const result = await apiClient.getQuestion(id, incrementView);
                setData(result);
            } catch (err) {
                setError(err as Error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestion();
    }, [id, incrementView]);

    return { data, isLoading, error };
};

// Simple hook for fetching similar questions
export const useSimilarQuestions = (questionId: string, limit = 5) => {
    const [data, setData] = useState<{ similar_questions: Question[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!questionId) return;

        const fetchSimilarQuestions = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const result = await apiClient.getSimilarQuestions(questionId, limit);
                setData(result);
            } catch (err) {
                setError(err as Error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSimilarQuestions();
    }, [questionId, limit]);

    return { data, isLoading, error };
}; 
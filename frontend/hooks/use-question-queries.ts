import { useMutation, useQuery, useQueryClient, UseQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient, getAuthenticatedClient } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import type {
    Question,
    QuestionWithAnswers,
    QuestionCreateRequest,
    QuestionUpdateRequest,
    QuestionSearchRequest,
    QuestionSearchResponse,
    Answer,
    AnswerCreateRequest,
    AnswerUpdateRequest,
    Comment,
    CommentCreateRequest,
} from '@/types/api';
import { useSession } from 'next-auth/react';

// Query Keys
export const questionKeys = {
    all: ['questions'] as const,
    lists: () => [...questionKeys.all, 'list'] as const,
    list: (params?: QuestionSearchRequest) => [...questionKeys.lists(), params] as const,
    details: () => [...questionKeys.all, 'detail'] as const,
    detail: (id: string) => [...questionKeys.details(), id] as const,
    similar: (id: string) => [...questionKeys.all, 'similar', id] as const,
    search: (query: string) => [...questionKeys.all, 'search', query] as const,
};

// Questions Queries
export const useQuestions = (params?: QuestionSearchRequest, options?: UseQueryOptions<QuestionSearchResponse>) => {
    return useQuery({
        queryKey: questionKeys.list(params),
        queryFn: () => apiClient.getQuestions(params),
        staleTime: 30 * 1000, // 30 seconds
        ...options,
    });
};

export const useInfiniteQuestions = (params?: QuestionSearchRequest) => {
    return useInfiniteQuery({
        queryKey: questionKeys.list(params),
        queryFn: ({ pageParam = 1 }) =>
            apiClient.getQuestions({ ...params, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
        staleTime: 30 * 1000,
    });
};

export const useQuestion = (
    id: string,
    incrementView = false,
    options?: UseQueryOptions<QuestionWithAnswers>
) => {
    return useQuery({
        queryKey: questionKeys.detail(id),
        queryFn: () => apiClient.getQuestion(id, incrementView),
        enabled: !!id,
        staleTime: 30 * 1000,
        ...options,
    });
};

export const useSimilarQuestions = (questionId: string, limit = 5) => {
    return useQuery({
        queryKey: questionKeys.similar(questionId),
        queryFn: () => apiClient.getSimilarQuestions(questionId, limit),
        enabled: !!questionId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useSemanticSearch = (query: string, limit = 20) => {
    return useQuery({
        queryKey: questionKeys.search(query),
        queryFn: () => apiClient.semanticSearch(query, limit),
        enabled: !!query && query.length > 2,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

// Questions Mutations
export const useCreateQuestion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: QuestionCreateRequest) => apiClient.createQuestion(data),
        onSuccess: () => {
            // Invalidate questions list
            queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
        },
    });
};

export const useUpdateQuestion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: QuestionUpdateRequest }) =>
            apiClient.updateQuestion(id, data),
        onSuccess: (updatedQuestion) => {
            // Update question detail cache
            queryClient.setQueryData(
                questionKeys.detail(updatedQuestion.question_id),
                (old: QuestionWithAnswers | undefined) =>
                    old ? { ...old, ...updatedQuestion } : undefined
            );

            // Invalidate questions list
            queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
        },
    });
};

export const useDeleteQuestion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.deleteQuestion(id),
        onSuccess: (_, deletedId) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: questionKeys.detail(deletedId) });

            // Invalidate questions list
            queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
        },
    });
};

// Answers Mutations
export const useCreateAnswer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ questionId, data }: { questionId: string; data: AnswerCreateRequest }) =>
            apiClient.createAnswer(questionId, data),
        onSuccess: (newAnswer) => {
            // Update question detail cache
            queryClient.setQueryData(
                questionKeys.detail(newAnswer.question_id),
                (old: QuestionWithAnswers | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        answers: [...old.answers, newAnswer],
                        answer_count: old.answer_count + 1,
                    };
                }
            );

            // Invalidate questions list to update answer count
            queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
        },
    });
};

export const useUpdateAnswer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: AnswerUpdateRequest }) =>
            apiClient.updateAnswer(id, data),
        onSuccess: (updatedAnswer) => {
            // Update question detail cache
            queryClient.setQueryData(
                questionKeys.detail(updatedAnswer.question_id),
                (old: QuestionWithAnswers | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        answers: old.answers.map((answer) =>
                            answer.id === updatedAnswer.id ? updatedAnswer : answer
                        ),
                    };
                }
            );
        },
    });
};

export const useDeleteAnswer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.deleteAnswer(id),
        onSuccess: (_, deletedId) => {
            // Update all question caches to remove the answer
            queryClient.setQueriesData(
                { queryKey: questionKeys.details() },
                (old: QuestionWithAnswers | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        answers: old.answers.filter((answer) => answer.id !== deletedId),
                        answer_count: Math.max(0, old.answer_count - 1),
                    };
                }
            );

            // Invalidate questions list
            queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
        },
    });
};

export const useVoteQuestion = (accessToken?: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, voteType }: { id: string; voteType: 'upvote' | 'downvote' }) => {
            const client = accessToken ? getAuthenticatedClient(accessToken) : apiClient;
            return client.voteQuestion(id, voteType);
        },
        onSuccess: (data: any, variables) => {
            const { voteType } = variables;
            toast.success(
                `Vote ${voteType === 'upvote' ? 'upvoted' : 'downvoted'} successfully`,
                `Question ${voteType === 'upvote' ? 'upvoted' : 'downvoted'} with ${data.vote_count} total votes`
            );
        },
        onMutate: async ({ id, voteType }) => {
            // Optimistically update the UI for question lists
            queryClient.setQueriesData(
                { queryKey: questionKeys.lists() },
                (old: QuestionSearchResponse | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        questions: old.questions.map((question) => {
                            if (question.question_id === id) {
                                const currentVote = question.user_vote;
                                let voteCountChange = 0;

                                if (currentVote === voteType) {
                                    // Removing vote
                                    voteCountChange = voteType === 'upvote' ? -1 : 1;
                                } else if (currentVote === null) {
                                    // Adding new vote
                                    voteCountChange = voteType === 'upvote' ? 1 : -1;
                                } else {
                                    // Changing vote
                                    voteCountChange = voteType === 'upvote' ? 2 : -2;
                                }

                                return {
                                    ...question,
                                    vote_count: question.vote_count + voteCountChange,
                                    user_vote: currentVote === voteType ? null : voteType,
                                };
                            }
                            return question;
                        }),
                    };
                }
            );

            // Also update question detail cache
            queryClient.setQueriesData(
                { queryKey: questionKeys.details() },
                (old: QuestionWithAnswers | undefined) => {
                    if (!old || old.question_id !== id) return undefined;
                    const currentVote = old.user_vote;
                    let voteCountChange = 0;

                    if (currentVote === voteType) {
                        // Removing vote
                        voteCountChange = voteType === 'upvote' ? -1 : 1;
                    } else if (currentVote === null) {
                        // Adding new vote
                        voteCountChange = voteType === 'upvote' ? 1 : -1;
                    } else {
                        // Changing vote
                        voteCountChange = voteType === 'upvote' ? 2 : -2;
                    }

                    return {
                        ...old,
                        vote_count: old.vote_count + voteCountChange,
                        user_vote: currentVote === voteType ? null : voteType,
                    };
                }
            );
        },
        onError: () => {
            // Revert optimistic update on error
            queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
            queryClient.invalidateQueries({ queryKey: questionKeys.details() });
        },
    });
};

export const useVoteAnswer = (accessToken?: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, voteType }: { id: string; voteType: 'upvote' | 'downvote' }) => {
            const client = accessToken ? getAuthenticatedClient(accessToken) : apiClient;
            return client.voteAnswer(id, voteType);
        },
        onSuccess: (data, variables) => {
            const { voteType } = variables;
            toast.success(
                `Answer ${voteType === 'upvote' ? 'upvoted' : 'downvoted'} successfully`,
                `Answer ${voteType === 'upvote' ? 'upvoted' : 'downvoted'} successfully`
            );
        },
        onMutate: async ({ id, voteType }) => {
            // Optimistically update the UI
            queryClient.setQueriesData(
                { queryKey: questionKeys.details() },
                (old: QuestionWithAnswers | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        answers: old.answers.map((answer) => {
                            if (answer.id === id) {
                                const currentVote = answer.user_vote;
                                let voteCountChange = 0;

                                if (currentVote === voteType) {
                                    // Removing vote
                                    voteCountChange = voteType === 'upvote' ? -1 : 1;
                                } else if (currentVote === null) {
                                    // Adding new vote
                                    voteCountChange = voteType === 'upvote' ? 1 : -1;
                                } else {
                                    // Changing vote
                                    voteCountChange = voteType === 'upvote' ? 2 : -2;
                                }

                                return {
                                    ...answer,
                                    vote_count: answer.vote_count + voteCountChange,
                                    user_vote: currentVote === voteType ? null : voteType,
                                };
                            }
                            return answer;
                        }),
                    };
                }
            );
        },
        onError: () => {
            // Revert optimistic update on error
            queryClient.invalidateQueries({ queryKey: questionKeys.details() });
        },
    });
};

export const useRemoveVote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.removeVote(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: questionKeys.details() });
        },
    });
};

export const useAcceptAnswer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ questionId, answerId }: { questionId: string; answerId: string }) =>
            apiClient.acceptAnswer(questionId, answerId),
        onSuccess: (_, { questionId, answerId }) => {
            // Update question detail cache
            queryClient.setQueryData(
                questionKeys.detail(questionId),
                (old: QuestionWithAnswers | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        accepted_answer_id: answerId,
                        answers: old.answers.map((answer) => ({
                            ...answer,
                            is_accepted: answer.id === answerId,
                        })),
                    };
                }
            );

            // Invalidate questions list
            queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
        },
    });
};

// Comments Mutations
export const useCreateComment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ answerId, data }: { answerId: string; data: CommentCreateRequest }) =>
            apiClient.createComment(answerId, data),
        onSuccess: (newComment) => {
            // Update question detail cache
            queryClient.setQueriesData(
                { queryKey: questionKeys.details() },
                (old: QuestionWithAnswers | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        answers: old.answers.map((answer) => {
                            if (answer.id === newComment.answer_id) {
                                return {
                                    ...answer,
                                    comments: [...answer.comments, newComment],
                                };
                            }
                            return answer;
                        }),
                    };
                }
            );
        },
    });
};

export const useDeleteComment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => apiClient.deleteComment(id),
        onSuccess: (_, deletedId) => {
            // Update question detail cache
            queryClient.setQueriesData(
                { queryKey: questionKeys.details() },
                (old: QuestionWithAnswers | undefined) => {
                    if (!old) return undefined;
                    return {
                        ...old,
                        answers: old.answers.map((answer) => ({
                            ...answer,
                            comments: answer.comments.filter((comment) => comment.id !== deletedId),
                        })),
                    };
                }
            );
        },
    });
};

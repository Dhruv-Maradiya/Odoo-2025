// API Types based on backend models
export interface User {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin" | "moderator";
    permissions: string[];
    created_at: string;
    updated_at: string;
}

export interface CurrentUser {
    user_id: string;
    name: string;
    email: string;
    role: "user" | "admin" | "moderator";
    permissions: string[];
}

// Auth Types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        permissions?: string[];
    };
}

export interface PasswordChangeRequest {
    current_password: string;
    new_password: string;
}

// Q&A Types
export interface Question {
    question_id: string;
    title: string;
    description: string;
    tags: string[];
    author: {
        name: string;
        email: string;
        picture: string;
    };
    vote_count: number;
    view_count: number;
    answer_count: number;
    accepted_answer_id?: string;
    images: string[];
    created_at: string;
    updated_at: string;
    is_bookmarked?: boolean;
    user_vote?: "upvote" | "downvote" | null;
}

export interface Answer {
    id: string;
    question_id: string;
    content: string;
    author: {
        name: string; email: string; picture: string
    }
    vote_count: number;
    is_accepted: boolean;
    images: string[];
    created_at: string;
    updated_at: string;
    user_vote?: "upvote" | "downvote" | null;
}

export interface QuestionWithAnswers extends Question {
    answers: Answer[];
    author: {
        name: string; email: string; picture: string
    }
}

export interface QuestionCreateRequest {
    title: string;
    description: string;
    tags: string[];
    images?: string[];
}

export interface QuestionUpdateRequest {
    title?: string;
    description?: string;
    tags?: string[];
    images?: string[];
}

export interface AnswerCreateRequest {
    content: string;
    images?: string[];
}

export interface AnswerUpdateRequest {
    content?: string;
    images?: string[];
}

export interface VoteRequest {
    vote_type: "upvote" | "downvote";
}

export interface QuestionSearchRequest {
    query?: string;
    tags?: string[];
    author_id?: string;
    has_accepted_answer?: boolean;
    sort_by?: string;
    order?: "asc" | "desc";
    page?: number;
    limit?: number;
}

export interface QuestionSearchResponse {
    questions: Question[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

// Notification Types
export interface Notification {
    id: string;
    user_id: string;
    type: "question_answered" | "answer_commented" | "user_mentioned" | "answer_accepted";
    title: string;
    message: string;
    related_question_id?: string;
    related_answer_id?: string;
    related_user_id?: string;
    is_read: boolean;
    created_at: string;
    updated_at: string;
}

export interface NotificationCount {
    total: number;
    unread: number;
}

export interface NotificationFilterRequest {
    type?: string;
    is_read?: boolean;
    limit?: number;
    offset?: number;
}

export interface NotificationListResponse {
    notifications: Notification[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        has_more: boolean;
    };
}

// Image Types
export interface ImageUploadRequest {
    upload_type: "questions" | "answers" | "profiles" | "general";
    related_id?: string;
}

export interface ImageUploadResponse {
    image_id: string;
    filename: string;
    url: string;
    upload_type: string;
    related_id?: string;
    file_size: number;
    content_type: string;
    uploaded_at: string;
}

// API Error Type
export interface ApiError {
    detail: string;
    status: number;
}

// Pagination
export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginationResponse {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
}

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
export interface QuestionAuthor {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface Question {
  question_id: string;
  title: string;
  description: string;
  tags: string[];
  author: QuestionAuthor;
  vote_count: number;
  view_count: number;
  answer_count: number;
  has_accepted_answer: boolean;
  is_flagged?: boolean;
  images?: string[];
  created_at: string;
  updated_at?: string;
  user_vote?: "upvote" | "downvote" | null;
}

export interface Answer {
  id: string;
  question_id: string;
  content: string;
  author: {
    name: string;
    email: string;
    picture: string;
  };
  vote_count: number;
  is_accepted: boolean;
  images: string[];
  created_at: string;
  updated_at: string;
  user_vote?: "upvote" | "downvote" | null;
  comments: Comment[];
}

export interface Comment {
  id: string;
  answer_id: string;
  content: string;
  author: {
    name: string;
    email: string;
    picture: string;
  };
  created_at: string;
  updated_at: string;
}

export interface QuestionWithAnswers extends Question {
  answers: Answer[];
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

export interface CommentCreateRequest {
  content: string;
}

export interface BulkDeleteRequest {
  item_ids: string[];
  item_type: "questions" | "answers" | "comments";
}

export interface FlagContentRequest {
  reason: string;
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
  notification_id: string;
  user_id: string;
  type:
    | "question_answered"
    | "answer_commented"
    | "user_mentioned"
    | "answer_accepted"
    | "question_upvoted"
    | "answer_upvoted"
    | "new_follower"
    | "system_announcement";
  title: string;
  message: string;
  related_id?: string; // question_id, answer_id, etc.
  priority: "low" | "medium" | "high" | "urgent";
  action_url?: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationCount {
  total: number;
  unread: number;
  archived: number;
  by_priority: Record<string, number>;
}

export interface NotificationFilterRequest {
  type?: string;
  is_read?: boolean;
  is_archived?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface NotificationUpdateRequest {
  is_read?: boolean;
  is_archived?: boolean;
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

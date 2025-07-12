import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  PasswordChangeRequest,
  CurrentUser,
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
  VoteRequest,
  Notification,
  NotificationCount,
  NotificationFilterRequest,
  NotificationListResponse,
  ImageUploadRequest,
  ImageUploadResponse,
  PaginationParams,
  User,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
                headers: {
                  Authorization: `Bearer ${refreshToken}`,
                },
              });

              const { access_token } = response.data;
              this.setAccessToken(access_token);

              return this.client(original);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/auth/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  private setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  private setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', credentials);
    const authData = response.data;

    // Store tokens
    this.setAccessToken(authData.access_token);
    this.setRefreshToken(authData.refresh_token);

    return authData;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', userData);
    const authData = response.data;

    // Store tokens
    this.setAccessToken(authData.access_token);
    this.setRefreshToken(authData.refresh_token);

    return authData;
  }

  async getCurrentUser(): Promise<CurrentUser> {
    const response = await this.client.get<CurrentUser>('/auth/me');
    return response.data;
  }

  async changePassword(data: PasswordChangeRequest): Promise<{ message: string }> {
    const response = await this.client.post('/auth/change-password', data);
    return response.data;
  }

  async logout(): Promise<void> {
    this.clearTokens();
  }

  // Questions endpoints
  async getQuestions(params?: QuestionSearchRequest): Promise<QuestionSearchResponse> {
    const response = await this.client.get<QuestionSearchResponse>('/qa/questions', { params });
    return response.data;
  }

  async getQuestion(id: string, incrementView = false): Promise<QuestionWithAnswers> {
    const response = await this.client.get<QuestionWithAnswers>(`/qa/questions/${id}`, {
      params: { increment_view: incrementView },
    });
    return response.data;
  }

  async createQuestion(data: QuestionCreateRequest): Promise<Question> {
    const response = await this.client.post<Question>('/qa/questions', data);
    return response.data;
  }

  async updateQuestion(id: string, data: QuestionUpdateRequest): Promise<Question> {
    const response = await this.client.put<Question>(`/qa/questions/${id}`, data);
    return response.data;
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.client.delete(`/qa/questions/${id}`);
  }

  // Answers endpoints
  async createAnswer(questionId: string, data: AnswerCreateRequest): Promise<Answer> {
    const response = await this.client.post<Answer>(`/qa/questions/${questionId}/answers`, data);
    return response.data;
  }

  async updateAnswer(id: string, data: AnswerUpdateRequest): Promise<Answer> {
    const response = await this.client.put<Answer>(`/qa/answers/${id}`, data);
    return response.data;
  }

  async deleteAnswer(id: string): Promise<void> {
    await this.client.delete(`/qa/answers/${id}`);
  }

  async voteAnswer(id: string, voteType: 'upvote' | 'downvote'): Promise<{ message: string }> {
    const response = await this.client.post(`/qa/answers/${id}/vote`, { vote_type: voteType });
    return response.data;
  }

  async removeVote(id: string): Promise<void> {
    await this.client.delete(`/qa/answers/${id}/vote`);
  }

  async acceptAnswer(questionId: string, answerId: string): Promise<{ message: string }> {
    const response = await this.client.post(`/qa/questions/${questionId}/answers/${answerId}/accept`);
    return response.data;
  }

  // Comments endpoints
  async createComment(answerId: string, data: CommentCreateRequest): Promise<Comment> {
    const response = await this.client.post<Comment>(`/qa/answers/${answerId}/comments`, data);
    return response.data;
  }

  async deleteComment(id: string): Promise<void> {
    await this.client.delete(`/qa/comments/${id}`);
  }

  // Notifications endpoints
  async getNotifications(params?: NotificationFilterRequest): Promise<Notification[]> {
    const response = await this.client.get<Notification[]>('/qa/notifications', { params });
    return response.data;
  }

  async getNotificationCount(): Promise<NotificationCount> {
    const response = await this.client.get<NotificationCount>('/qa/notifications/count');
    return response.data;
  }

  async markNotificationAsRead(id: string): Promise<{ message: string }> {
    const response = await this.client.post(`/qa/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    const response = await this.client.post('/qa/notifications/read-all');
    return response.data;
  }

  // Search endpoints
  async getSimilarQuestions(questionId: string, limit = 5): Promise<{ similar_questions: Question[] }> {
    const response = await this.client.get(`/qa/questions/${questionId}/similar`, {
      params: { limit },
    });
    return response.data;
  }

  async semanticSearch(query: string, limit = 20): Promise<any> {
    const response = await this.client.get('/qa/search/semantic', {
      params: { query, limit },
    });
    return response.data;
  }

  // Users endpoints
  async getUsers(params?: PaginationParams): Promise<{ users: User[]; pagination: any }> {
    const response = await this.client.get('/users/', { params });
    return response.data;
  }

  async getUserById(id: string): Promise<User> {
    const response = await this.client.get<User>(`/users/${id}`);
    return response.data;
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  // Images endpoints
  async uploadImage(file: File, uploadRequest: ImageUploadRequest): Promise<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ImageUploadResponse>('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: {
        upload_type: uploadRequest.upload_type,
        related_id: uploadRequest.related_id,
      },
    });

    return response.data;
  }
}

export const apiClient = new ApiClient();

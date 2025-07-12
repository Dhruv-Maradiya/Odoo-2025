import axios, { AxiosInstance, AxiosError } from "axios";
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
  VoteRequest,
  Notification,
  NotificationCount,
  NotificationFilterRequest,
  NotificationListResponse,
  NotificationUpdateRequest,
  ImageUploadRequest,
  ImageUploadResponse,
  PaginationParams,
  User,
} from "@/types/api";
import { toast } from "./toast";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type SearchQuestionsParams = {
  query: string;
  limit?: number;
  tags?: string[];
  author_id?: string;
  has_accepted_answer?: boolean;
};

class ApiClient {
  private client: AxiosInstance;

  constructor(accessToken?: string) {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleApiError(error: AxiosError) {
    let title = "Error";
    let description = "Something went wrong";

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          title = "Authentication Required";
          description = data?.detail || "Please log in to perform this action";
          break;
        case 403:
          title = "Access Denied";
          description =
            data?.detail || "You do not have permission to perform this action";
          break;
        case 404:
          title = "Not Found";
          description = data?.detail || "The requested resource was not found";
          break;
        case 422:
          title = "Validation Error";
          description = data?.detail || "Please check your input and try again";
          break;
        case 500:
          title = "Server Error";
          description = data?.detail || "An internal server error occurred";
          break;
        default:
          title = `Error ${status}`;
          description = data?.detail || "An unexpected error occurred";
      }
    } else if (error.request) {
      title = "Network Error";
      description =
        "Unable to connect to the server. Please check your internet connection.";
    } else {
      title = "Request Error";
      description =
        error.message || "An error occurred while processing your request";
    }

    toast.show({
      title,
      description,
      variant: "destructive",
    });
  }

  // Questions endpoints
  async getQuestions(
    params?: QuestionSearchRequest
  ): Promise<QuestionSearchResponse> {
    const response = await this.client.get<QuestionSearchResponse>(
      "/qa/questions",
      { params }
    );
    return response.data;
  }

  async getQuestion(
    id: string,
    incrementView = false
  ): Promise<QuestionWithAnswers> {
    const response = await this.client.get<QuestionWithAnswers>(
      `/qa/questions/${id}`,
      {
        params: { increment_view: incrementView },
      }
    );
    return response.data;
  }

  async createQuestion(data: QuestionCreateRequest): Promise<Question> {
    const response = await this.client.post<Question>("/qa/questions", data);
    return response.data;
  }

  async updateQuestion(
    id: string,
    data: QuestionUpdateRequest
  ): Promise<Question> {
    const response = await this.client.put<Question>(
      `/qa/questions/${id}`,
      data
    );
    return response.data;
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.client.delete(`/qa/questions/${id}`);
  }

  async adminDeleteQuestion(id: string): Promise<void> {
    await this.client.delete(`/qa/admin/questions/${id}`);
  }

  async voteQuestion(
    id: string,
    voteType: "upvote" | "downvote" | null
  ): Promise<{
    message: string;
    vote_count: number;
    upvotes?: number;
    downvotes?: number;
    user_vote: "upvote" | "downvote";
  }> {
    const response = await this.client.post(`/qa/questions/${id}/vote`, {
      vote_type: voteType,
    });
    return response.data;
  }

  // Answers endpoints
  async createAnswer(
    questionId: string,
    data: AnswerCreateRequest
  ): Promise<Answer> {
    const response = await this.client.post<Answer>(
      `/qa/questions/${questionId}/answers`,
      data
    );
    return response.data;
  }

  async updateAnswer(id: string, data: AnswerUpdateRequest): Promise<Answer> {
    const response = await this.client.put<Answer>(`/qa/answers/${id}`, data);
    return response.data;
  }

  async deleteAnswer(id: string): Promise<void> {
    await this.client.delete(`/qa/answers/${id}`);
  }

  async voteAnswer(
    id: string,
    voteType: "upvote" | "downvote"
  ): Promise<{
    message: string;
    vote_count: number;
    user_vote: "upvote" | "downvote" | null;
  }> {
    const response = await this.client.post(`/qa/answers/${id}/vote`, {
      vote_type: voteType,
    });
    return response.data;
  }

  async acceptAnswer(
    questionId: string,
    answerId: string
  ): Promise<{ message: string }> {
    const response = await this.client.post(
      `/qa/questions/${questionId}/answers/${answerId}/accept`
    );
    return response.data;
  }

  // Comments endpoints
  async createComment(
    answerId: string,
    data: CommentCreateRequest
  ): Promise<Comment> {
    const response = await this.client.post<Comment>(
      `/qa/answers/${answerId}/comments`,
      data
    );
    return response.data;
  }

  async deleteComment(id: string): Promise<void> {
    await this.client.delete(`/qa/comments/${id}`);
  }

  // Notifications endpoints
  async getNotifications(
    params?: NotificationFilterRequest
  ): Promise<NotificationListResponse> {
    const response = await this.client.get<NotificationListResponse>(
      "/notifications",
      { params }
    );
    return response.data;
  }

  async getNotification(id: string): Promise<Notification> {
    const response = await this.client.get<Notification>(
      `/notifications/${id}`
    );
    return response.data;
  }

  async getNotificationCount(): Promise<NotificationCount> {
    const response = await this.client.get<NotificationCount>(
      "/notifications/count"
    );
    return response.data;
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    const response = await this.client.patch<Notification>(
      `/notifications/${id}`,
      { is_read: true }
    );
    return response.data;
  }

  async markNotificationAsUnread(id: string): Promise<Notification> {
    const response = await this.client.patch<Notification>(
      `/notifications/${id}`,
      { is_read: false }
    );
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    const response = await this.client.post("/notifications/mark-read");
    return response.data;
  }

  async archiveNotification(id: string): Promise<Notification> {
    const response = await this.client.patch<Notification>(
      `/notifications/${id}`,
      { is_archived: true }
    );
    return response.data;
  }

  async deleteNotification(id: string): Promise<void> {
    await this.client.delete(`/notifications/${id}`);
  }

  // Search endpoints
  async getSimilarQuestions(
    questionId: string,
    limit = 5
  ): Promise<{ similar_questions: Question[] }> {
    const response = await this.client.get(
      `/qa/questions/${questionId}/similar`,
      {
        params: { limit },
      }
    );
    return response.data;
  }

  async semanticSearch({
    query,
    limit = 20,
  }: SearchQuestionsParams): Promise<any> {
    const response = await this.client.get("/qa/search/semantic", {
      params: { query, limit },
    });
    return response.data;
  }

  async searchQuestions({
    query,
    limit = 20,
    tags,
    author_id,
    has_accepted_answer,
  }: SearchQuestionsParams): Promise<QuestionSearchResponse> {
    const response = await this.client.get<QuestionSearchResponse>(
      "/qa/questions",
      {
        params: { query, limit, tags, author_id, has_accepted_answer },
      }
    );
    return response.data;
  }

  // Users endpoints
  async getUsers(
    params?: PaginationParams
  ): Promise<{ users: User[]; pagination: any }> {
    const response = await this.client.get("/users/", { params });
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
  async uploadImage(
    file: File,
    uploadRequest: ImageUploadRequest
  ): Promise<ImageUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.client.post<ImageUploadResponse>(
      "/images/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        params: {
          upload_type: uploadRequest.upload_type,
          related_id: uploadRequest.related_id,
        },
      }
    );

    return response.data;
  }

  // Admin endpoints
  async getAdminStats(dateFrom?: string, dateTo?: string): Promise<any> {
    const params: any = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    const response = await this.client.get("/qa/admin/stats", { params });
    return response.data;
  }

  async getAdminUsers(page = 1, limit = 10): Promise<any> {
    const response = await this.client.get("/users/", {
      params: { page, limit },
    });
    return response.data;
  }

  async deleteUserAdmin(userId: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/users/${userId}`);
    return response.data;
  }

  async deactivateUser(userId: string): Promise<{ message: string }> {
    const response = await this.client.post(`/users/${userId}/deactivate`);
    return response.data;
  }

  async activateUser(userId: string): Promise<{ message: string }> {
    const response = await this.client.post(`/users/${userId}/activate`);
    return response.data;
  }

  async getAdminUserPosts(
    userId: string,
    postType?: string,
    page = 1,
    limit = 10
  ): Promise<any> {
    const params: any = { page, limit };
    if (postType) params.post_type = postType;

    const response = await this.client.get(`/qa/admin/users/${userId}/posts`, {
      params,
    });
    return response.data;
  }

  async flagQuestion(
    questionId: string,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await this.client.post(
      `/qa/admin/questions/${questionId}/flag`,
      { reason: reason || "Flagged by admin for review" }
    );
    return response.data;
  }

  async unflagQuestion(questionId: string): Promise<{ message: string }> {
    const response = await this.client.delete(
      `/qa/admin/questions/${questionId}/flag`
    );
    return response.data;
  }

  async bulkDeleteQuestions(
    questionIds: string[]
  ): Promise<{ message: string }> {
    const response = await this.client.post("/qa/admin/bulk-delete", {
      item_ids: questionIds,
      item_type: "questions",
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();

export const getApiClient = (accessToken?: string) =>
  new ApiClient(accessToken);

// Function to get authenticated client for voting operations
export const getAuthenticatedClient = (accessToken?: string) => {
  if (!accessToken) {
    throw new Error("Authentication required for this operation");
  }
  return new ApiClient(accessToken);
};

// Usage example in a React component/hook:
// const { data: session } = useSession();
// const api = new AuthApiClient(session?.accessToken);
// await api.voteQuestion(id, voteType);

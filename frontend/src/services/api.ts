import axios from "axios";
import type { FeedSession } from "@/types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface FeedsResponse {
  feeds: FeedSession[];
  total: number;
}

export interface DeleteResponse {
  message: string;
  deleted_count: number;
}

export const feedApi = {
  // Create a new feeding session
  createFeed: async (
    session: Omit<FeedSession, "id" | "created_at">,
  ): Promise<FeedSession> => {
    const response = await api.post<FeedSession>("/feed", session);
    return response.data;
  },

  // Get all feeding sessions
  getFeeds: async (limit = 100, offset = 0): Promise<FeedsResponse> => {
    const response = await api.get<FeedsResponse>("/feeds", {
      params: { limit, offset },
    });
    return response.data;
  },

  // Delete all feeding sessions
  deleteAllFeeds: async (): Promise<DeleteResponse> => {
    const response = await api.delete<DeleteResponse>("/feeds");
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{
    status: string;
    timestamp: string;
    service: string;
  }> => {
    const response = await api.get("/health");
    return response.data;
  },
};

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default api;

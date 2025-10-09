import axios from "axios";
import type { FeedSession } from "@/types";

// Shared helper function to get base URL for different endpoints
const getBaseUrl = (includeApiPath: boolean = true): string => {
  // If VITE_API_URL is explicitly set, use it
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return includeApiPath ? envApiUrl : envApiUrl.replace("/api/v1", "");
  }

  // In browser environment, use same host as current page
  if (typeof window !== "undefined" && window.location) {
    const { hostname } = window.location;

    // If we're on the production domain, use relative path
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return includeApiPath ? "/api/v1" : "";
    }
  }

  // Fallback for development
  return includeApiPath
    ? "http://localhost:8080/api/v1"
    : "http://localhost:8080";
};

const API_BASE_URL = getBaseUrl(true); // Include /api/v1 path
const HEALTH_BASE_URL = getBaseUrl(false); // Exclude /api/v1 path

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Separate axios instance for health checks (no /api/v1 prefix)
const healthApi = axios.create({
  baseURL: HEALTH_BASE_URL,
  timeout: 5000,
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
    const response = await healthApi.get("/health");
    return response.data;
  },
};

// Add response interceptor for error handling
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default api;

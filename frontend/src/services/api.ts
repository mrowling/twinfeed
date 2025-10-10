import axios from "axios";
import type { FeedSession, FeedEvent } from "@/types";
import { getApiBaseUrl } from "@/utils/apiUrl";

const API_BASE_URL = getApiBaseUrl();

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

export interface CreateSessionRequest {
  twin: "A" | "B";
}

export interface AddEventRequest {
  session_id: number;
  event_type: "start" | "pause" | "end" | "side_change";
  timestamp: string;
  side: "Left" | "Right";
}

export const feedApi = {
  // Create a new feeding session
  createSession: async (
    request: CreateSessionRequest,
  ): Promise<FeedSession> => {
    const response = await api.post<FeedSession>("/sessions", request);
    return response.data;
  },

  // Add an event to an existing session
  addEvent: async (request: AddEventRequest): Promise<FeedEvent> => {
    const response = await api.post<FeedEvent>("/events", request);
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

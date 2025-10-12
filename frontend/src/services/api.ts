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

export interface UpdateSessionRequest {
  twin: "A" | "B";
  bottle_amount?: number;
  bottle_type?: "breastmilk" | "formula";
  created_at?: string;
}

export interface UpdateEventRequest {
  event_type: "start" | "pause" | "end" | "side_change";
  side: "Left" | "Right";
  timestamp: string;
}

export interface DeleteResponse {
  message: string;
  deleted_count: number;
}

export interface SimpleDeleteResponse {
  message: string;
}

export interface CreateSessionRequest {
  twin: "A" | "B";
  is_bottle?: boolean;
  bottle_amount?: number;
  bottle_type?: "breastmilk" | "formula";
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

  // Update a feeding session
  updateSession: async (
    id: number,
    request: UpdateSessionRequest,
  ): Promise<FeedSession> => {
    const response = await api.put<FeedSession>(`/sessions/${id}`, request);
    return response.data;
  },

  // Delete a feeding session
  deleteSession: async (id: number): Promise<SimpleDeleteResponse> => {
    const response = await api.delete<SimpleDeleteResponse>(`/sessions/${id}`);
    return response.data;
  },

  // Update a feed event
  updateEvent: async (
    id: number,
    request: UpdateEventRequest,
  ): Promise<FeedEvent> => {
    const response = await api.put<FeedEvent>(`/events/${id}`, request);
    return response.data;
  },

  // Delete a feed event
  deleteEvent: async (id: number): Promise<SimpleDeleteResponse> => {
    const response = await api.delete<SimpleDeleteResponse>(`/events/${id}`);
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

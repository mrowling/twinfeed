import { useEffect, useState } from "react";
import { feedApi } from "@/services/api";
import { useTimerStore } from "@/store/timerStore";
import type { FeedSession } from "@/types";

export function useApiSync() {
  const { sessions, setSessions, addSession } = useTimerStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sessions from backend on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await feedApi.getFeeds();
      setSessions(response.feeds);
    } catch (err) {
      setError("Failed to load sessions");
      console.error("Error loading sessions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = async (
    session: Omit<FeedSession, "id" | "created_at">,
  ): Promise<FeedSession | null> => {
    try {
      setError(null);
      const savedSession = await feedApi.createFeed(session);
      addSession(savedSession);
      return savedSession;
    } catch (err) {
      setError("Failed to save session");
      console.error("Error saving session:", err);
      // Add to local store even if API fails
      const localSession: FeedSession = {
        ...session,
        id: Date.now(), // Temporary ID
      };
      addSession(localSession);
      return localSession;
    }
  };

  const clearAllSessions = async (): Promise<boolean> => {
    try {
      setError(null);
      await feedApi.deleteAllFeeds();
      setSessions([]);
      return true;
    } catch (err) {
      setError("Failed to clear sessions");
      console.error("Error clearing sessions:", err);
      return false;
    }
  };

  const retry = () => {
    setError(null);
    loadSessions();
  };

  return {
    sessions,
    isLoading,
    error,
    saveSession,
    clearAllSessions,
    loadSessions,
    retry,
  };
}

import { useEffect, useState, useCallback } from "react";
import { feedApi } from "@/services/api";
import { useTimerStore } from "@/store/timerStore";

export function useApiSync() {
  const { sessions, setSessions } = useTimerStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
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
  }, [setSessions]);

  // Load sessions from backend on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
    clearAllSessions,
    loadSessions,
    refreshSessions: loadSessions,
    retry,
  };
}

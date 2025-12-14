import { useEffect, useState, useCallback } from "react";
import { feedApi } from "@/services/api";
import { useTimerStore } from "@/store/timerStore";

export function useApiSync() {
  const { sessions, totalSessions, setSessions, appendSessions, setTotalSessions } = useTimerStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async (limit = 10, offset = 0, append = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await feedApi.getFeeds(limit, offset);
      if (append) {
        appendSessions(response.feeds);
      } else {
        setSessions(response.feeds);
      }
      setTotalSessions(response.total);
    } catch (err) {
      setError("Failed to load sessions");
      console.error("Error loading sessions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [setSessions, appendSessions, setTotalSessions]);

  // Load sessions from backend on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadMoreSessions = useCallback(async (limit = 20) => {
    const offset = sessions.length;
    await loadSessions(limit, offset, true);
  }, [sessions.length, loadSessions]);

  const clearAllSessions = async (): Promise<boolean> => {
    try {
      setError(null);
      await feedApi.deleteAllFeeds();
      setSessions([]);
      setTotalSessions(0);
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
    totalSessions,
    isLoading,
    error,
    clearAllSessions,
    loadSessions,
    loadMoreSessions,
    refreshSessions: loadSessions,
    retry,
  };
}

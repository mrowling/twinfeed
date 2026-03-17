import { useEffect, useState } from "react";
import { useSleepStore } from "@/store/sleepStore";
import { sleepApi } from "@/services/api";

export function useSleepApiSync() {
  const { setSessions, setTotalSessions } = useSleepStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = async (
    limit = 10,
    offset = 0,
    append = false,
  ): Promise<void> => {
    try {
      setError(null);
      const response = await sleepApi.getSleep(limit, offset);

      if (append) {
        useSleepStore.getState().appendSessions(response.sleep);
      } else {
        setSessions(response.sleep);
      }

      setTotalSessions(response.total);
    } catch (err) {
      console.error("Failed to load sleep sessions:", err);
      setError("Failed to load sleep data. Using local storage.");
    } finally {
      setIsLoading(false);
    }
  };

  const retry = () => {
    setIsLoading(true);
    loadSessions();
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return { error, isLoading, retry, loadSessions };
}

import { useEffect, useState } from "react";
import { useTimerStore } from "@/store/timerStore";
import type { Twin } from "@/types";

export function useIdleTimer(twin: Twin) {
  const { getIdleDuration } = useTimerStore();
  const [idleTime, setIdleTime] = useState("");

  useEffect(() => {
    const updateIdleTime = () => {
      const duration = getIdleDuration(twin);
      if (duration > 0) {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        setIdleTime(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      } else {
        setIdleTime("");
      }
    };

    updateIdleTime();
    const interval = setInterval(updateIdleTime, 1000);
    return () => clearInterval(interval);
  }, [twin, getIdleDuration]);

  return idleTime;
}
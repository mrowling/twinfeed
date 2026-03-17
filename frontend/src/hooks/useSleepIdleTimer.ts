import { useEffect, useState } from "react";
import { useSleepStore } from "@/store/sleepStore";
import type { Twin } from "@/types";

export function useSleepIdleTimer(twin: Twin) {
  const { twinA, twinB, getIdleDuration } = useSleepStore();
  const [idleTime, setIdleTime] = useState<string | null>(null);

  const timer = twin === "A" ? twinA : twinB;

  useEffect(() => {
    const updateIdleTime = () => {
      const idleDuration = getIdleDuration(twin);

      if (idleDuration > 0) {
        const hours = Math.floor(idleDuration / 3600);
        const minutes = Math.floor((idleDuration % 3600) / 60);
        const seconds = idleDuration % 60;

        if (hours > 0) {
          setIdleTime(
            `Wake window: ${hours}h ${minutes}m`,
          );
        } else if (minutes > 0) {
          setIdleTime(`Wake window: ${minutes}m ${seconds}s`);
        } else {
          setIdleTime(`Wake window: ${seconds}s`);
        }
      } else {
        setIdleTime(null);
      }
    };

    updateIdleTime();

    // Only update if there's an idle time to display
    if (timer.idleStartTime && !timer.isRunning) {
      const interval = setInterval(updateIdleTime, 1000);
      return () => clearInterval(interval);
    }
  }, [twin, timer.idleStartTime, timer.isRunning, getIdleDuration]);

  return idleTime;
}

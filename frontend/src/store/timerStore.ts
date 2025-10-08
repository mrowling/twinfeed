import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FeedSession, TimerState, Twin, Side } from "@/types";

interface TimerStore {
  // Timer states
  twinA: TimerState;
  twinB: TimerState;

  // Sessions
  sessions: FeedSession[];

  // Timer actions
  startTimer: (twin: Twin, side: Side) => void;
  pauseTimer: (twin: Twin) => void;
  resetTimer: (twin: Twin) => void;

  // Session actions
  saveSession: (twin: Twin) => FeedSession | null;
  addSession: (session: FeedSession) => void;
  setSessions: (sessions: FeedSession[]) => void;
  clearSessions: () => void;

  // Utility
  getFormattedTime: (twin: Twin) => string;
  getCurrentDuration: (twin: Twin) => number;
  getSuggestedNextSide: (twin: Twin) => Side | null;
}

const initialTimerState: TimerState = {
  isRunning: false,
  startTime: 0,
  duration: 0,
  side: null,
};

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      twinA: { ...initialTimerState },
      twinB: { ...initialTimerState },
      sessions: [],

      // Timer actions
      startTimer: (twin: Twin, side: Side) => {
        const now = Date.now();
        set((state) => ({
          [`twin${twin}`]: {
            ...state[
              `twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">
            ],
            isRunning: true,
            startTime: now,
            side,
          },
        }));
      },

      pauseTimer: (twin: Twin) => {
        const now = Date.now();
        set((state) => {
          const currentTimer =
            state[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];
          const additionalDuration = currentTimer.isRunning
            ? Math.floor((now - currentTimer.startTime) / 1000)
            : 0;

          return {
            [`twin${twin}`]: {
              ...currentTimer,
              isRunning: false,
              duration: currentTimer.duration + additionalDuration,
              startTime: 0,
            },
          };
        });
      },

      resetTimer: (twin: Twin) => {
        set((_state) => ({
          [`twin${twin}`]: { ...initialTimerState },
        }));
      },

      // Session actions
      saveSession: (twin: Twin) => {
        const state = get();
        const timer =
          state[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];

        if (!timer.side || timer.duration === 0) {
          return null;
        }

        // Calculate final duration if timer is still running
        let finalDuration = timer.duration;
        if (timer.isRunning) {
          finalDuration += Math.floor((Date.now() - timer.startTime) / 1000);
        }

        // Calculate start time based on duration
        const startTime = new Date(Date.now() - finalDuration * 1000);

        const session: FeedSession = {
          twin,
          side: timer.side,
          duration: finalDuration,
          start_time: startTime.toISOString(),
        };

                        // Add to sessions and reset timer
                set((_state) => ({
                    sessions: [session, ...get().sessions],
                    [`twin${twin}`]: { ...initialTimerState },
                }));

        return session;
      },

      addSession: (session: FeedSession) => {
        set((state) => ({
          sessions: [session, ...state.sessions],
        }));
      },

      setSessions: (sessions: FeedSession[]) => {
        set({ sessions });
      },

      clearSessions: () => {
        set({ sessions: [] });
      },

      // Utility functions
      getFormattedTime: (twin: Twin) => {
        const state = get();
        const timer =
          state[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];

        let totalSeconds = timer.duration;
        if (timer.isRunning) {
          // Use more precise calculation for real-time updates
          totalSeconds += Math.floor((Date.now() - timer.startTime) / 1000);
        }

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      },

      getCurrentDuration: (twin: Twin) => {
        const state = get();
        const timer =
          state[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];

        let totalSeconds = timer.duration;
        if (timer.isRunning) {
          totalSeconds += Math.floor((Date.now() - timer.startTime) / 1000);
        }

        return totalSeconds;
      },

      getSuggestedNextSide: (twin: Twin) => {
        const state = get();
        // Find the most recent session for this twin
        const lastSession = state.sessions.find(
          (session) => session.twin === twin,
        );

        // If no previous session, no suggestion
        if (!lastSession) {
          return null;
        }

        // Suggest the opposite side from last time
        return lastSession.side === "Left" ? "Right" : "Left";
      },
    }),
    {
      name: "twinfeed-timer-storage",
      partialize: (state) => ({
        twinA: state.twinA,
        twinB: state.twinB,
        sessions: state.sessions,
      }),
    },
  ),
);

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SleepSession,
  SleepEvent,
  SleepTimerState,
  Twin,
  SleepEventType,
} from "@/types";
import { calculateSleepDuration } from "@/types";
import { sleepApi } from "@/services/api";

interface SleepStore {
  // Timer states
  twinA: SleepTimerState;
  twinB: SleepTimerState;

  // Sessions
  sessions: SleepSession[];
  totalSessions: number;

  // Timer actions
  startSleep: (twin: Twin) => Promise<void>;
  pauseSleep: (twin: Twin) => Promise<void>;
  resetSleep: (twin: Twin) => Promise<void>;

  // Session actions
  saveSession: (twin: Twin) => Promise<SleepSession | null>;
  addSession: (session: SleepSession) => void;
  setSessions: (sessions: SleepSession[]) => void;
  appendSessions: (sessions: SleepSession[]) => void;
  setTotalSessions: (total: number) => void;
  clearSessions: () => void;

  // Event-based actions
  createSession: (twin: Twin) => Promise<SleepSession>;
  addEvent: (
    sessionId: number,
    eventType: SleepEventType,
    timestamp?: Date,
  ) => Promise<void>;

  // Utility
  getFormattedTime: (twin: Twin) => string;
  getCurrentDuration: (twin: Twin) => number;
  getIdleDuration: (twin: Twin) => number;
}

const initialTimerState: SleepTimerState = {
  isRunning: false,
  startTime: 0,
  duration: 0,
  currentSessionId: undefined,
};

export const useSleepStore = create<SleepStore>()(
  persist(
    (set, get) => ({
      // Initial state
      twinA: { ...initialTimerState },
      twinB: { ...initialTimerState },
      sessions: [],
      totalSessions: 0,

      // Timer actions
      startSleep: async (twin: Twin) => {
        const now = Date.now();
        const currentState =
          get()[`twin${twin}` as keyof Pick<SleepStore, "twinA" | "twinB">];

        let sessionId = currentState.currentSessionId;

        // If no active session, create a new one
        if (!sessionId) {
          const newSession = await get().createSession(twin);
          sessionId = newSession.id!;
        }

        // If timer is not running, start the timer
        if (!currentState.isRunning) {
          // Add start event to the session
          await get().addEvent(sessionId, "start", new Date(now));

          set((state: any) => ({
            [`twin${twin}`]: {
              ...state[`twin${twin}`],
              isRunning: true,
              startTime: now,
              currentSessionId: sessionId,
              idleStartTime: undefined, // Clear idle timer when resuming
            },
          }));
        }
      },

      pauseSleep: async (twin: Twin) => {
        const now = Date.now();
        const currentTimer =
          get()[`twin${twin}` as keyof Pick<SleepStore, "twinA" | "twinB">];

        if (currentTimer.isRunning && currentTimer.currentSessionId) {
          // Add pause event to the current session
          await get().addEvent(
            currentTimer.currentSessionId,
            "pause",
            new Date(now),
          );

          const additionalDuration = Math.floor(
            (now - currentTimer.startTime) / 1000,
          );

          set((state: any) => ({
            [`twin${twin}`]: {
              ...state[`twin${twin}`],
              isRunning: false,
              duration: state[`twin${twin}`].duration + additionalDuration,
              startTime: 0,
              idleStartTime: now, // Start idle timer (wake window) when paused
            },
          }));
        }
      },

      resetSleep: async (twin: Twin) => {
        const currentTimer =
          get()[`twin${twin}` as keyof Pick<SleepStore, "twinA" | "twinB">];

        // If there's an active session, optionally add an end event
        if (currentTimer.currentSessionId) {
          await get().addEvent(currentTimer.currentSessionId, "end");
        }

        set(() => ({
          [`twin${twin}`]: { ...initialTimerState },
        }));
      },

      // Session actions
      saveSession: async (twin: Twin) => {
        const timer =
          get()[`twin${twin}` as keyof Pick<SleepStore, "twinA" | "twinB">];

        if (!timer.currentSessionId) {
          return null;
        }

        // Always add end event when saving session to properly close it
        await get().addEvent(timer.currentSessionId, "end");

        // Find and return the saved session
        const session = get().sessions.find(
          (s: SleepSession) => s.id === timer.currentSessionId,
        );

        // Reset timer and start idle timer (wake window)
        set(() => ({
          [`twin${twin}`]: {
            ...initialTimerState,
            idleStartTime: Date.now(), // Start wake window tracking when session saved
          },
        }));

        return session || null;
      },

      createSession: async (twin: Twin) => {
        try {
          // Try to create session on backend first
          const backendSession = await sleepApi.createSession({ twin });

          set((state: any) => ({
            sessions: [backendSession, ...state.sessions],
          }));

          return backendSession;
        } catch (error) {
          console.warn(
            "Failed to create session on backend, using local storage:",
            error,
          );

          // Fallback to local session if backend is unavailable
          const localSession: SleepSession = {
            id: Date.now(), // Temporary ID until backend assigns real ID
            twin,
            events: [],
            created_at: new Date().toISOString(),
          };

          set((state: any) => ({
            sessions: [localSession, ...state.sessions],
          }));

          return localSession;
        }
      },

      addEvent: async (
        sessionId: number,
        eventType: SleepEventType,
        timestamp: Date = new Date(),
      ) => {
        const newEvent: SleepEvent = {
          id: Date.now() + Math.random(), // Temporary ID
          sleep_session_id: sessionId,
          event_type: eventType,
          timestamp: timestamp.toISOString(),
          created_at: new Date().toISOString(),
        };

        // Add event locally first for immediate UI update
        set((state: any) => ({
          sessions: state.sessions.map((session: SleepSession) =>
            session.id === sessionId
              ? { ...session, events: [...session.events, newEvent] }
              : session,
          ),
        }));

        // Try to sync with backend
        try {
          await sleepApi.addEvent({
            session_id: sessionId,
            event_type: eventType,
            timestamp: timestamp.toISOString(),
          });
        } catch (error) {
          console.warn("Failed to sync event with backend:", error);
          // Event remains in local storage, will be synced when possible
        }
      },

      addSession: (session: SleepSession) => {
        set((state: any) => ({
          sessions: [session, ...state.sessions],
        }));
      },

      setSessions: (sessions: SleepSession[]) => {
        set({ sessions });
      },

      appendSessions: (newSessions: SleepSession[]) => {
        set((state: any) => ({
          sessions: [...state.sessions, ...newSessions],
        }));
      },

      setTotalSessions: (total: number) => {
        set({ totalSessions: total });
      },

      clearSessions: () => {
        set({ sessions: [], totalSessions: 0 });
      },

      // Utility functions
      getFormattedTime: (twin: Twin) => {
        const currentDuration = get().getCurrentDuration(twin);

        const hours = Math.floor(currentDuration / 3600);
        const minutes = Math.floor((currentDuration % 3600) / 60);
        const seconds = currentDuration % 60;

        if (hours > 0) {
          return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }

        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      },

      getCurrentDuration: (twin: Twin) => {
        const timer =
          get()[`twin${twin}` as keyof Pick<SleepStore, "twinA" | "twinB">];

        if (timer.currentSessionId) {
          // Find the session and calculate duration from events
          const session = get().sessions.find(
            (s: SleepSession) => s.id === timer.currentSessionId,
          );

          if (session && session.events) {
            return calculateSleepDuration(session.events);
          }
        }

        // If no session or events, calculate from stored duration and startTime
        if (timer.isRunning) {
          const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
          return timer.duration + elapsed;
        }

        return timer.duration;
      },

      getIdleDuration: (twin: Twin) => {
        const timer =
          get()[`twin${twin}` as keyof Pick<SleepStore, "twinA" | "twinB">];

        if (timer.idleStartTime && !timer.isRunning) {
          return Math.floor((Date.now() - timer.idleStartTime) / 1000);
        }

        return 0;
      },
    }),
    {
      name: "twinfeed-sleep-storage",
      partialize: (state) => ({
        twinA: state.twinA,
        twinB: state.twinB,
        sessions: state.sessions,
        totalSessions: state.totalSessions,
      }),
    },
  ),
);

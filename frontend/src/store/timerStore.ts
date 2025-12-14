import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  FeedSession,
  FeedEvent,
  TimerState,
  Twin,
  Side,
  EventType,
} from "@/types";
import { calculateDuration } from "@/types";
import { feedApi } from "@/services/api";

interface TimerStore {
  // Timer states
  twinA: TimerState;
  twinB: TimerState;

  // Sessions
  sessions: FeedSession[];
  totalSessions: number;

  // Timer actions
  startTimer: (twin: Twin, side: Side) => Promise<void>;
  pauseTimer: (twin: Twin) => Promise<void>;
  resetTimer: (twin: Twin) => Promise<void>;

  // Session actions
  saveSession: (twin: Twin) => Promise<FeedSession | null>;
  addSession: (session: FeedSession) => void;
  setSessions: (sessions: FeedSession[]) => void;
  appendSessions: (sessions: FeedSession[]) => void;
  setTotalSessions: (total: number) => void;
  clearSessions: () => void;

  // New event-based actions
  createSession: (twin: Twin) => Promise<FeedSession>;
  addEvent: (
    sessionId: number,
    eventType: EventType,
    side: Side,
    timestamp?: Date,
  ) => Promise<void>;

  // Utility
  getFormattedTime: (twin: Twin) => string;
  getCurrentDuration: (twin: Twin) => number;
  getSuggestedNextSide: (twin: Twin) => Side | null;
  getIdleDuration: (twin: Twin) => number;
}

const initialTimerState: TimerState = {
  isRunning: false,
  startTime: 0,
  duration: 0,
  side: null,
  currentSessionId: undefined,
};

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      twinA: { ...initialTimerState },
      twinB: { ...initialTimerState },
      sessions: [],
      totalSessions: 0,

      // Timer actions
      startTimer: async (twin: Twin, side: Side) => {
        const now = Date.now();
        const currentState =
          get()[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];

        let sessionId = currentState.currentSessionId;

        // If no active session, create a new one
        if (!sessionId) {
          const newSession = await get().createSession(twin);
          sessionId = newSession.id!;
        }

        // If timer is already running and side is different, just change side without resetting timer
        if (currentState.isRunning && currentState.side !== side) {
          // Add side_change event with new side to track the change
          await get().addEvent(sessionId, "side_change", side, new Date(now));

          set((state: any) => ({
            [`twin${twin}`]: {
              ...state[`twin${twin}`],
              side,
            },
          }));
        }
        // If timer is not running, start the timer
        else if (!currentState.isRunning) {
          // Add start event to the session
          await get().addEvent(sessionId, "start", side, new Date(now));

          set((state: any) => ({
            [`twin${twin}`]: {
              ...state[`twin${twin}`],
              isRunning: true,
              startTime: now,
              side,
              currentSessionId: sessionId,
              idleStartTime: undefined, // Clear idle timer when resuming
            },
          }));
        }
      },

      pauseTimer: async (twin: Twin) => {
        const now = Date.now();
        const currentTimer =
          get()[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];

        if (
          currentTimer.isRunning &&
          currentTimer.currentSessionId &&
          currentTimer.side
        ) {
          // Add pause event to the current session
          await get().addEvent(
            currentTimer.currentSessionId,
            "pause",
            currentTimer.side,
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
              idleStartTime: now, // Start idle timer when paused
            },
          }));
        }
      },

      resetTimer: async (twin: Twin) => {
        const currentTimer =
          get()[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];

        // If there's an active session, optionally add an end event
        if (currentTimer.currentSessionId && currentTimer.side) {
          await get().addEvent(
            currentTimer.currentSessionId,
            "end",
            currentTimer.side,
          );
        }

        set(() => ({
          [`twin${twin}`]: { ...initialTimerState },
        }));
      },

      // Session actions
      saveSession: async (twin: Twin) => {
        const timer =
          get()[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];

        if (!timer.side || !timer.currentSessionId) {
          return null;
        }

        // Always add end event when saving session to properly close it
        await get().addEvent(timer.currentSessionId, "end", timer.side);

        // Find and return the saved session
        const session = get().sessions.find(
          (s: FeedSession) => s.id === timer.currentSessionId,
        );

        // Reset timer and start idle timer
        set(() => ({
          [`twin${twin}`]: {
            ...initialTimerState,
            idleStartTime: Date.now(), // Start idle timer when session saved
          },
        }));

        return session || null;
      },

      createSession: async (twin: Twin) => {
        try {
          // Try to create session on backend first
          const backendSession = await feedApi.createSession({ twin });

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
          const localSession: FeedSession = {
            id: Date.now(), // Temporary ID until backend assigns real ID
            twin,
            is_bottle: false,
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
        eventType: EventType,
        side: Side,
        timestamp: Date = new Date(),
      ) => {
        const newEvent: FeedEvent = {
          id: Date.now() + Math.random(), // Temporary ID
          feed_session_id: sessionId,
          event_type: eventType,
          side: side,
          timestamp: timestamp.toISOString(),
          created_at: new Date().toISOString(),
        };

        // Add event locally first for immediate UI update
        set((state: any) => ({
          sessions: state.sessions.map((session: FeedSession) =>
            session.id === sessionId
              ? { ...session, events: [...session.events, newEvent] }
              : session,
          ),
        }));

        // Try to sync with backend
        try {
          await feedApi.addEvent({
            session_id: sessionId,
            event_type: eventType,
            timestamp: timestamp.toISOString(),
            side: side,
          });
        } catch (error) {
          console.warn("Failed to sync event with backend:", error);
          // Event remains in local storage, will be synced when possible
        }
      },

      addSession: (session: FeedSession) => {
        set((state: any) => ({
          sessions: [session, ...state.sessions],
        }));
      },

      setSessions: (sessions: FeedSession[]) => {
        set({ sessions });
      },

      appendSessions: (newSessions: FeedSession[]) => {
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

        const minutes = Math.floor(currentDuration / 60);
        const seconds = currentDuration % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      },

      getCurrentDuration: (twin: Twin) => {
        const timer =
          get()[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];

        if (timer.currentSessionId) {
          // Calculate duration from events
          const session = get().sessions.find(
            (s: FeedSession) => s.id === timer.currentSessionId,
          );
          if (session) {
            return calculateDuration(session.events);
          }
        }

        // Fallback to timer duration if no session
        let duration = timer.duration;
        if (timer.isRunning) {
          duration += Math.floor((Date.now() - timer.startTime) / 1000);
        }
        return duration;
      },

      getIdleDuration: (twin: Twin) => {
        const timer =
          get()[`twin${twin}` as keyof Pick<TimerStore, "twinA" | "twinB">];

        if (timer.idleStartTime) {
          return Math.floor((Date.now() - timer.idleStartTime) / 1000);
        }
        return 0;
      },

      getSuggestedNextSide: (twin: Twin) => {
        const sessions = get().sessions;
        const twinSessions = sessions.filter(
          (s: FeedSession) => s.twin === twin,
        );

        if (twinSessions.length === 0) {
          return "Left"; // Default to left for first session
        }

        // Find the last completed session (one that ends with an "end" event)
        const completedSessions = twinSessions.filter(
          (session: FeedSession) => {
            if (session.events.length === 0) return false;
            const lastEvent = session.events[session.events.length - 1];
            return lastEvent.event_type === "end";
          },
        );

        if (completedSessions.length === 0) {
          return "Left"; // No completed sessions yet, default to left
        }

        // Use the last completed session
        const lastCompletedSession = completedSessions[0];
        // Calculate total duration per side in the last completed session
        const sideDurations: Record<Side, number> = { Left: 0, Right: 0 };

        let lastSide: Side | null = null;
        let lastStart: number | null = null;

        for (const event of lastCompletedSession.events) {
          if (
            event.event_type === "start" ||
            event.event_type === "side_change"
          ) {
            // Start timing for this side
            lastSide = event.side;
            lastStart = new Date(event.timestamp).getTime();
          } else if (
            (event.event_type === "pause" || event.event_type === "end") &&
            lastSide &&
            lastStart !== null
          ) {
            // Stop timing for this side
            const endTime = new Date(event.timestamp).getTime();
            sideDurations[lastSide] += Math.max(
              0,
              Math.floor((endTime - lastStart) / 1000),
            );
            lastStart = null;
          }
        }

        // Suggest the side with less total duration
        if (sideDurations.Left < sideDurations.Right) {
          return "Left";
        } else if (sideDurations.Right < sideDurations.Left) {
          return "Right";
        } else {
          // If equal, default to Left
          return "Left";
        }
      },
    }),
    {
      name: "twinfeed-timer-storage",
      partialize: (state: any) => ({
        twinA: state.twinA,
        twinB: state.twinB,
        sessions: state.sessions,
        totalSessions: state.totalSessions,
      }),
    },
  ),
);

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { create } from "zustand";
import type { FeedSession, TimerState } from "../types";
import { feedApi } from "../services/api";

// Create a test version of the store without persistence
interface TestTimerStore {
  twinA: TimerState;
  twinB: TimerState;
  sessions: FeedSession[];
  totalSessions: number;
  startTimer: (twin: "A" | "B", side: "Left" | "Right") => Promise<void>;
  pauseTimer: (twin: "A" | "B") => Promise<void>;
  resetTimer: (twin: "A" | "B") => Promise<void>;
  saveSession: (twin: "A" | "B") => Promise<FeedSession | null>;
  addSession: (session: FeedSession) => void;
  setSessions: (sessions: FeedSession[]) => void;
  appendSessions: (sessions: FeedSession[]) => void;
  setTotalSessions: (total: number) => void;
  clearSessions: () => void;
  createSession: (twin: "A" | "B") => Promise<FeedSession>;
  addEvent: (sessionId: number, eventType: string, side: "Left" | "Right", timestamp?: Date) => Promise<void>;
  getFormattedTime: (twin: "A" | "B") => string;
  getCurrentDuration: (twin: "A" | "B") => number;
  getSuggestedNextSide: (twin: "A" | "B") => "Left" | "Right" | null;
  getIdleDuration: (twin: "A" | "B") => number;
}

const initialTimerState: TimerState = {
  isRunning: false,
  startTime: 0,
  duration: 0,
  side: null,
  currentSessionId: undefined,
  idleStartTime: undefined,
};

const useTestTimerStore = create<TestTimerStore>((set, get) => ({
  twinA: { ...initialTimerState },
  twinB: { ...initialTimerState },
  sessions: [],
  totalSessions: 0,

  startTimer: async (twin: "A" | "B", side: "Left" | "Right") => {
    const now = Date.now();
    const currentState = get()[`twin${twin}` as keyof Pick<TestTimerStore, "twinA" | "twinB">];

    let sessionId = currentState.currentSessionId;

    if (!sessionId) {
      const newSession = await get().createSession(twin);
      sessionId = newSession.id!;
    }

    if (currentState.isRunning && currentState.side !== side) {
      await get().addEvent(sessionId, "side_change", side, new Date(now));
      set((state: any) => ({
        [`twin${twin}`]: {
          ...state[`twin${twin}`],
          side,
        },
      }));
    } else if (!currentState.isRunning) {
      await get().addEvent(sessionId, "start", side, new Date(now));
      set((state: any) => ({
        [`twin${twin}`]: {
          ...state[`twin${twin}`],
          isRunning: true,
          startTime: now,
          side,
          currentSessionId: sessionId,
          idleStartTime: undefined,
        },
      }));
    }
  },

  pauseTimer: async (twin: "A" | "B") => {
    const now = Date.now();
    const currentTimer = get()[`twin${twin}` as keyof Pick<TestTimerStore, "twinA" | "twinB">];

    if (currentTimer.isRunning && currentTimer.currentSessionId && currentTimer.side) {
      await get().addEvent(currentTimer.currentSessionId, "pause", currentTimer.side, new Date(now));
      const additionalDuration = Math.floor((now - currentTimer.startTime) / 1000);
      set((state: any) => ({
        [`twin${twin}`]: {
          ...state[`twin${twin}`],
          isRunning: false,
          duration: state[`twin${twin}`].duration + additionalDuration,
          startTime: 0,
          idleStartTime: now,
        },
      }));
    }
  },

  resetTimer: async (twin: "A" | "B") => {
    const currentTimer = get()[`twin${twin}` as keyof Pick<TestTimerStore, "twinA" | "twinB">];
    if (currentTimer.currentSessionId && currentTimer.side) {
      await get().addEvent(currentTimer.currentSessionId, "end", currentTimer.side);
    }
    set(() => ({
      [`twin${twin}`]: { ...initialTimerState },
    }));
  },

  saveSession: async (twin: "A" | "B") => {
    const timer = get()[`twin${twin}` as keyof Pick<TestTimerStore, "twinA" | "twinB">];
    if (!timer.side || !timer.currentSessionId) {
      return null;
    }
    await get().addEvent(timer.currentSessionId, "end", timer.side);
    const session = get().sessions.find((s: FeedSession) => s.id === timer.currentSessionId);
    set(() => ({
      [`twin${twin}`]: {
        ...initialTimerState,
        idleStartTime: Date.now(),
      },
    }));
    return session || null;
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

  createSession: async (twin: "A" | "B") => {
    const backendSession = await feedApi.createSession({ twin });
    set((state: any) => ({
      sessions: [backendSession, ...state.sessions],
    }));
    return backendSession;
  },

  addEvent: async (sessionId: number, eventType: string, side: "Left" | "Right", timestamp: Date = new Date()) => {
    const newEvent = {
      id: Date.now() + Math.random(),
      feed_session_id: sessionId,
      event_type: eventType as any,
      side: side,
      timestamp: timestamp.toISOString(),
      created_at: new Date().toISOString(),
    };
    set((state: any) => ({
      sessions: state.sessions.map((session: FeedSession) =>
        session.id === sessionId
          ? { ...session, events: [...session.events, newEvent] }
          : session,
      ),
    }));
    await feedApi.addEvent({
      session_id: sessionId,
      event_type: eventType as any,
      timestamp: timestamp.toISOString(),
      side: side,
    });
  },

  getFormattedTime: (twin: "A" | "B") => {
    const currentDuration = get().getCurrentDuration(twin);
    const minutes = Math.floor(currentDuration / 60);
    const seconds = currentDuration % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  },

  getCurrentDuration: (twin: "A" | "B") => {
    const timer = get()[`twin${twin}` as keyof Pick<TestTimerStore, "twinA" | "twinB">];
    if (timer.currentSessionId) {
      const session = get().sessions.find((s: FeedSession) => s.id === timer.currentSessionId);
      if (session) {
        return calculateDuration(session.events);
      }
    }
    let duration = timer.duration;
    if (timer.isRunning) {
      duration += Math.floor((Date.now() - timer.startTime) / 1000);
    }
    return duration;
  },

  getSuggestedNextSide: (twin: "A" | "B") => {
    const sessions = get().sessions;
    const twinSessions = sessions.filter((s: FeedSession) => s.twin === twin);
    if (twinSessions.length === 0) {
      return "Left";
    }
    const completedSessions = twinSessions.filter((session: FeedSession) => {
      if (session.events.length === 0) return false;
      const lastEvent = session.events[session.events.length - 1];
      return lastEvent.event_type === "end";
    });
    if (completedSessions.length === 0) {
      return "Left";
    }
    const lastCompletedSession = completedSessions[0];
    const sideDurations: Record<string, number> = { Left: 0, Right: 0 };
    let lastSide: string | null = null;
    let lastStart: number | null = null;
    for (const event of lastCompletedSession.events) {
      if (event.event_type === "start" || event.event_type === "side_change") {
        lastSide = event.side;
        lastStart = new Date(event.timestamp).getTime();
      } else if ((event.event_type === "pause" || event.event_type === "end") && lastSide && lastStart !== null) {
        const endTime = new Date(event.timestamp).getTime();
        sideDurations[lastSide] += Math.max(0, Math.floor((endTime - lastStart) / 1000));
        lastStart = null;
      }
    }
    if (sideDurations.Left < sideDurations.Right) {
      return "Left";
    } else if (sideDurations.Right < sideDurations.Left) {
      return "Right";
    } else {
      return "Left";
    }
  },

  getIdleDuration: (twin: "A" | "B") => {
    const timer = get()[`twin${twin}` as keyof Pick<TestTimerStore, "twinA" | "twinB">];
    if (timer.idleStartTime) {
      return Math.floor((Date.now() - timer.idleStartTime) / 1000);
    }
    return 0;
  },
}));

// Mock feedApi
vi.mock("../services/api", () => ({
  feedApi: {
    createSession: vi.fn().mockResolvedValue({
      id: 123,
      twin: "A",
      events: [],
      created_at: new Date().toISOString(),
    }),
    addEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import calculateDuration for the test store
import { calculateDuration } from "../types";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Reset store state before each test
beforeEach(() => {
  vi.useFakeTimers();
  useTestTimerStore.setState({
    twinA: { ...initialTimerState },
    twinB: { ...initialTimerState },
    sessions: [],
    totalSessions: 0,
  });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTestTimerStore", () => {
  describe("Timer Actions", () => {
    it("should start timer for Twin A", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      await act(async () => {
        await result.current.startTimer("A", "Left");
      });

      const state = result.current;
      expect(state.twinA.isRunning).toBe(true);
      expect(state.twinA.side).toBe("Left");
      expect(state.twinA.startTime).toBeGreaterThan(0);
      expect(state.twinB.isRunning).toBe(false);
    });

    it("should start timer for Twin B", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      await act(async () => {
        await result.current.startTimer("B", "Right");
      });

      const state = result.current;
      expect(state.twinB.isRunning).toBe(true);
      expect(state.twinB.side).toBe("Right");
      expect(state.twinB.startTime).toBeGreaterThan(0);
      expect(state.twinA.isRunning).toBe(false);
    });

    it("should pause running timer", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Start timer
      await act(async () => {
        await result.current.startTimer("A", "Left");
      });

      // Wait a bit then pause
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await result.current.pauseTimer("A");
      });

      const state = result.current;
      expect(state.twinA.isRunning).toBe(false);
      expect(state.twinA.duration).toBeGreaterThan(0);
      expect(state.twinA.side).toBe("Left");
      expect(state.twinA.startTime).toBe(0);
    });

    it("should reset timer", () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Start and pause timer to set some duration
      act(() => {
        result.current.startTimer("A", "Left");
        vi.advanceTimersByTime(1000);
        result.current.pauseTimer("A");
      });

      // Reset timer
      act(() => {
        result.current.resetTimer("A");
      });

      const state = result.current;
      expect(state.twinA.isRunning).toBe(false);
      expect(state.twinA.duration).toBe(0);
      expect(state.twinA.side).toBe(null);
      expect(state.twinA.startTime).toBe(0);
    });
  });

  describe("Session Management", () => {
    it("should save session when timer has duration and side", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Start, wait, and pause timer
      await act(async () => {
        await result.current.startTimer("A", "Left");
        vi.advanceTimersByTime(5000); // 5 seconds
        await result.current.pauseTimer("A");
      });

      // Save session
      let savedSession: FeedSession | null = null;
      await act(async () => {
        savedSession = await result.current.saveSession("A");
      });

      expect(savedSession).not.toBeNull();
      expect(savedSession!.twin).toBe("A");
      expect(savedSession!.events).toHaveLength(3); // Should have start, pause, and end events
      expect(savedSession!.events[0].event_type).toBe("start");
      expect(savedSession!.events[0].side).toBe("Left");
      expect(savedSession!.events[1].event_type).toBe("pause");
      expect(savedSession!.events[1].side).toBe("Left");
      expect(savedSession!.events[2].event_type).toBe("end");
      expect(savedSession!.events[2].side).toBe("Left");

      // Check that session was added to store
      const state = result.current;
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0]).toEqual(savedSession);

      // Check that timer was reset
      expect(state.twinA.isRunning).toBe(false);
      expect(state.twinA.duration).toBe(0);
      expect(state.twinA.side).toBe(null);
    });

    it("should not save session when timer has no duration", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Try to save session without starting timer
      let savedSession: FeedSession | null = null;
      await act(async () => {
        savedSession = await result.current.saveSession("A");
      });

      expect(savedSession).toBeNull();
      expect(result.current.sessions).toHaveLength(0);
    });

    it("should not save session when timer has no side", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Manually set duration without side
      act(() => {
        useTestTimerStore.setState({
          twinA: { isRunning: false, startTime: 0, duration: 300, side: null },
        });
      });

      let savedSession: FeedSession | null = null;
      await act(async () => {
        savedSession = await result.current.saveSession("A");
      });

      expect(savedSession).toBeNull();
      expect(result.current.sessions).toHaveLength(0);
    });

    it("should add external session", () => {
      const { result } = renderHook(() => useTestTimerStore());

      const session: FeedSession = {
        twin: "B",
        is_bottle: false,
        events: [
          {
            feed_session_id: 1,
            event_type: "start",
            side: "Left",
            timestamp: new Date().toISOString(),
          },
          {
            feed_session_id: 1,
            event_type: "end",
            side: "Left",
            timestamp: new Date(Date.now() + 300000).toISOString(), // 5 minutes later
          },
        ],
      };

      act(() => {
        result.current.addSession(session);
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0]).toEqual(session);
    });

    it("should set multiple sessions", () => {
      const { result } = renderHook(() => useTestTimerStore());

      const sessions: FeedSession[] = [
        {
          twin: "A",
          is_bottle: false,
          events: [
            {
              feed_session_id: 1,
              event_type: "start",
              side: "Left",
              timestamp: new Date().toISOString(),
            },
            {
              feed_session_id: 1,
              event_type: "end",
              side: "Left",
              timestamp: new Date(Date.now() + 300000).toISOString(),
            },
          ],
        },
        {
          twin: "B",
          events: [
            {
              feed_session_id: 2,
              event_type: "start",
              side: "Right",
              timestamp: new Date().toISOString(),
            },
            {
              feed_session_id: 2,
              event_type: "end",
              side: "Right",
              timestamp: new Date(Date.now() + 250000).toISOString(),
            },
          ],
        },
      ];

      act(() => {
        result.current.setSessions(sessions);
      });

      expect(result.current.sessions).toEqual(sessions);
    });

    it("should clear all sessions", () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Add some sessions first
      const sessions: FeedSession[] = [
        {
          twin: "A",
          events: [
            {
              feed_session_id: 1,
              event_type: "start",
              side: "Left",
              timestamp: new Date().toISOString(),
            },
            {
              feed_session_id: 1,
              event_type: "end",
              side: "Left",
              timestamp: new Date(Date.now() + 300000).toISOString(),
            },
          ],
        },
      ];

      act(() => {
        result.current.setSessions(sessions);
      });

      expect(result.current.sessions).toHaveLength(1);

      act(() => {
        result.current.clearSessions();
      });

      expect(result.current.sessions).toHaveLength(0);
    });
  });

  describe("Utility Functions", () => {
    it("should format time correctly for stopped timer", () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Set duration manually
      act(() => {
        useTestTimerStore.setState({
          twinA: { isRunning: false, startTime: 0, duration: 125, side: null },
        });
      });

      const formattedTime = result.current.getFormattedTime("A");
      expect(formattedTime).toBe("02:05"); // 125 seconds = 2 minutes 5 seconds
    });

    it("should format time correctly for running timer", () => {
      const { result } = renderHook(() => useTestTimerStore());

      const startTime = Date.now();

      // Set running timer
      act(() => {
        useTestTimerStore.setState({
          twinA: { isRunning: true, startTime, duration: 60, side: "Left" },
        });
      });

      // Advance time
      act(() => {
        vi.advanceTimersByTime(30000); // 30 seconds
      });

      const formattedTime = result.current.getFormattedTime("A");
      expect(formattedTime).toBe("01:30"); // 60 + 30 = 90 seconds = 1 minute 30 seconds
    });

    it("should get current duration for stopped timer", () => {
      const { result } = renderHook(() => useTestTimerStore());

      act(() => {
        useTestTimerStore.setState({
          twinA: { isRunning: false, startTime: 0, duration: 300, side: null },
        });
      });

      const duration = result.current.getCurrentDuration("A");
      expect(duration).toBe(300);
    });

    it("should get current duration for running timer", () => {
      const { result } = renderHook(() => useTestTimerStore());

      const startTime = Date.now();

      act(() => {
        useTestTimerStore.setState({
          twinA: { isRunning: true, startTime, duration: 100, side: "Left" },
        });
      });

      act(() => {
        vi.advanceTimersByTime(50000); // 50 seconds
      });

      const duration = result.current.getCurrentDuration("A");
      expect(duration).toBe(150); // 100 + 50
    });

    it("should get suggested next side based on last session", () => {
      const { result } = renderHook(() => useTestTimerStore());

      const sessions: FeedSession[] = [
        {
          twin: "A",
          events: [
            {
              feed_session_id: 1,
              event_type: "start",
              side: "Left",
              timestamp: new Date().toISOString(),
            },
            {
              feed_session_id: 1,
              event_type: "end",
              side: "Left",
              timestamp: new Date(Date.now() + 300000).toISOString(),
            },
          ],
        },
        {
          twin: "B",
          events: [
            {
              feed_session_id: 2,
              event_type: "start",
              side: "Right",
              timestamp: new Date().toISOString(),
            },
            {
              feed_session_id: 2,
              event_type: "end",
              side: "Right",
              timestamp: new Date(Date.now() + 250000).toISOString(),
            },
          ],
        },
      ];

      act(() => {
        result.current.setSessions(sessions);
      });

      // Should suggest opposite of last side
      expect(result.current.getSuggestedNextSide("A")).toBe("Right");
      expect(result.current.getSuggestedNextSide("B")).toBe("Left");
    });

    it("should return Left when no previous sessions exist", () => {
      const { result } = renderHook(() => useTestTimerStore());

      expect(result.current.getSuggestedNextSide("A")).toBe("Left");
      expect(result.current.getSuggestedNextSide("B")).toBe("Left");
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple rapid timer starts/stops", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      await act(async () => {
        await result.current.startTimer("A", "Left");
        await result.current.pauseTimer("A");
        await result.current.startTimer("A", "Right");
        await result.current.pauseTimer("A");
      });

      const state = result.current;
      expect(state.twinA.isRunning).toBe(false);
      expect(state.twinA.side).toBe("Right");
      expect(state.twinA.duration).toBeGreaterThanOrEqual(0);
    });

    it("should change side without resetting timer when already running", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      await act(async () => {
        await result.current.startTimer("A", "Left");
      });

      const initialStartTime = result.current.twinA.startTime;

      await act(async () => {
        vi.advanceTimersByTime(2000); // Let timer run for 2 seconds
        await result.current.startTimer("A", "Right"); // Change side
      });

      const state = result.current;
      expect(state.twinA.isRunning).toBe(true);
      expect(state.twinA.side).toBe("Right");
      expect(state.twinA.startTime).toBe(initialStartTime); // Should not reset
    });

    it("should handle concurrent timer operations", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      await act(async () => {
        await result.current.startTimer("A", "Left");
        await result.current.startTimer("B", "Right");
      });

      const state = result.current;
      expect(state.twinA.isRunning).toBe(true);
      expect(state.twinA.side).toBe("Left");
      expect(state.twinB.isRunning).toBe(true);
      expect(state.twinB.side).toBe("Right");
    });

    it("should preserve sessions when resetting timers", () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Add a session
      const session: FeedSession = {
        twin: "A",
        events: [
          {
            feed_session_id: 1,
            event_type: "start",
            side: "Left",
            timestamp: new Date().toISOString(),
          },
          {
            feed_session_id: 1,
            event_type: "end",
            side: "Left",
            timestamp: new Date(Date.now() + 300000).toISOString(),
          },
        ],
      };

      act(() => {
        result.current.addSession(session);
        result.current.resetTimer("A");
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.twinA.duration).toBe(0);
    });
  });

  describe("Event-Based Actions", () => {
    it("should create a new session", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      const session = await act(async () => {
        return await result.current.createSession("A");
      });

      expect(session).toBeDefined();
      expect(session.twin).toBe("A");
      expect(session.events).toEqual([]);
      expect(session.id).toBeDefined();
    });

    it("should add an event to a session", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      const session = await act(async () => {
        return await result.current.createSession("A");
      });

      const eventTimestamp = new Date();
      await act(async () => {
        await result.current.addEvent(
          session.id!,
          "start",
          "Left",
          eventTimestamp,
        );
      });

      // Verify the API was called correctly
      expect(vi.mocked(feedApi.addEvent)).toHaveBeenCalledWith({
        session_id: session.id,
        event_type: "start",
        side: "Left",
        timestamp: eventTimestamp.toISOString(),
      });
    });

    it("should handle side change events during active timer", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Start timer
      await act(async () => {
        await result.current.startTimer("A", "Left");
      });

      // Change side (should add side_change event)
      await act(async () => {
        await result.current.startTimer("A", "Right");
      });

      const state = result.current;
      expect(state.twinA.side).toBe("Right");
      expect(state.twinA.isRunning).toBe(true);

      // Verify side_change event was added
      expect(vi.mocked(feedApi.addEvent)).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "side_change",
          side: "Right",
        }),
      );
    });

    it("should add pause and resume events correctly", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Start timer
      await act(async () => {
        await result.current.startTimer("A", "Left");
      });

      // Pause timer
      await act(async () => {
        await result.current.pauseTimer("A");
      });

      // Resume timer
      await act(async () => {
        await result.current.startTimer("A", "Left");
      });

      // Verify pause and start events were added
      expect(vi.mocked(feedApi.addEvent)).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "pause",
          side: "Left",
        }),
      );

      expect(vi.mocked(feedApi.addEvent)).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "start",
          side: "Left",
        }),
      );
    });

    it("should save session with complete event sequence", async () => {
      const { result } = renderHook(() => useTestTimerStore());

      // Start and run timer
      await act(async () => {
        await result.current.startTimer("A", "Left");
        vi.advanceTimersByTime(5000);
        await result.current.pauseTimer("A");
      });

      // Save session
      const savedSession = await act(async () => {
        return await result.current.saveSession("A");
      });

      expect(savedSession).toBeDefined();
      expect(savedSession!.events).toHaveLength(3); // start, pause, end
      expect(savedSession!.events[0].event_type).toBe("start");
      expect(savedSession!.events[1].event_type).toBe("pause");
      expect(savedSession!.events[2].event_type).toBe("end");
    });
  });

  describe("Side Recommendation Logic", () => {
    it("should only consider completed sessions for side recommendations", () => {
      const { result } = renderHook(() => useTestTimerStore());

      const sessions: FeedSession[] = [
        // Completed session (ends with "end")
        {
          twin: "A",
          events: [
            {
              feed_session_id: 1,
              event_type: "start",
              side: "Left",
              timestamp: new Date(Date.now() - 1000000).toISOString(),
            },
            {
              feed_session_id: 1,
              event_type: "end",
              side: "Left",
              timestamp: new Date(Date.now() - 700000).toISOString(),
            },
          ],
        },
        // Active session (ends with "pause" - should be ignored)
        {
          twin: "A",
          events: [
            {
              feed_session_id: 2,
              event_type: "start",
              side: "Right",
              timestamp: new Date(Date.now() - 300000).toISOString(),
            },
            {
              feed_session_id: 2,
              event_type: "pause",
              side: "Right",
              timestamp: new Date(Date.now() - 100000).toISOString(),
            },
          ],
        },
      ];

      act(() => {
        result.current.setSessions(sessions);
      });

      // Should suggest opposite of last completed session (Left), not the paused one (Right)
      expect(result.current.getSuggestedNextSide("A")).toBe("Right");
    });

    it("should handle sessions with pause/resume cycles", () => {
      const { result } = renderHook(() => useTestTimerStore());

      const sessions: FeedSession[] = [
        {
          twin: "A",
          events: [
            {
              feed_session_id: 1,
              event_type: "start",
              side: "Left",
              timestamp: new Date(Date.now() - 1000000).toISOString(),
            },
            {
              feed_session_id: 1,
              event_type: "pause",
              side: "Left",
              timestamp: new Date(Date.now() - 700000).toISOString(),
            },
            {
              feed_session_id: 1,
              event_type: "start",
              side: "Left",
              timestamp: new Date(Date.now() - 400000).toISOString(),
            },
            {
              feed_session_id: 1,
              event_type: "end",
              side: "Left",
              timestamp: new Date(Date.now() - 100000).toISOString(),
            },
          ],
        },
      ];

      act(() => {
        result.current.setSessions(sessions);
      });

      // Should suggest opposite of the completed session
      expect(result.current.getSuggestedNextSide("A")).toBe("Right");
    });

    it("should ignore sessions without end events", () => {
      const { result } = renderHook(() => useTestTimerStore());

      const sessions: FeedSession[] = [
        // Session that only has start - should be ignored
        {
          twin: "A",
          events: [
            {
              feed_session_id: 1,
              event_type: "start",
              side: "Left",
              timestamp: new Date().toISOString(),
            },
          ],
        },
        // Session that ends with pause - should be ignored
        {
          twin: "A",
          events: [
            {
              feed_session_id: 2,
              event_type: "start",
              side: "Right",
              timestamp: new Date().toISOString(),
            },
            {
              feed_session_id: 2,
              event_type: "pause",
              side: "Right",
              timestamp: new Date(Date.now() + 100000).toISOString(),
            },
          ],
        },
      ];

      act(() => {
        result.current.setSessions(sessions);
      });

      // Should default to Left when no completed sessions exist
      expect(result.current.getSuggestedNextSide("A")).toBe("Left");
    });
  });
});

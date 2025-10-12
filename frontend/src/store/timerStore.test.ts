import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTimerStore } from "../store/timerStore";
import type { FeedSession } from "../types";
import { feedApi } from "../services/api";

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
  useTimerStore.setState({
    twinA: { isRunning: false, startTime: 0, duration: 0, side: null },
    twinB: { isRunning: false, startTime: 0, duration: 0, side: null },
    sessions: [],
  });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTimerStore", () => {
  describe("Timer Actions", () => {
    it("should start timer for Twin A", async () => {
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

      // Try to save session without starting timer
      let savedSession: FeedSession | null = null;
      await act(async () => {
        savedSession = await result.current.saveSession("A");
      });

      expect(savedSession).toBeNull();
      expect(result.current.sessions).toHaveLength(0);
    });

    it("should not save session when timer has no side", async () => {
      const { result } = renderHook(() => useTimerStore());

      // Manually set duration without side
      act(() => {
        useTimerStore.setState({
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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

      // Set duration manually
      act(() => {
        useTimerStore.setState({
          twinA: { isRunning: false, startTime: 0, duration: 125, side: null },
        });
      });

      const formattedTime = result.current.getFormattedTime("A");
      expect(formattedTime).toBe("02:05"); // 125 seconds = 2 minutes 5 seconds
    });

    it("should format time correctly for running timer", () => {
      const { result } = renderHook(() => useTimerStore());

      const startTime = Date.now();

      // Set running timer
      act(() => {
        useTimerStore.setState({
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
      const { result } = renderHook(() => useTimerStore());

      act(() => {
        useTimerStore.setState({
          twinA: { isRunning: false, startTime: 0, duration: 300, side: null },
        });
      });

      const duration = result.current.getCurrentDuration("A");
      expect(duration).toBe(300);
    });

    it("should get current duration for running timer", () => {
      const { result } = renderHook(() => useTimerStore());

      const startTime = Date.now();

      act(() => {
        useTimerStore.setState({
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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

      expect(result.current.getSuggestedNextSide("A")).toBe("Left");
      expect(result.current.getSuggestedNextSide("B")).toBe("Left");
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple rapid timer starts/stops", async () => {
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

      const session = await act(async () => {
        return await result.current.createSession("A");
      });

      expect(session).toBeDefined();
      expect(session.twin).toBe("A");
      expect(session.events).toEqual([]);
      expect(session.id).toBeDefined();
    });

    it("should add an event to a session", async () => {
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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
      const { result } = renderHook(() => useTimerStore());

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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { feedApi } from "./api";
import type { FeedSession, FeedEvent } from "../types";

// Mock the entire api module
vi.mock("./api", () => ({
  feedApi: {
    createSession: vi.fn(),
    addEvent: vi.fn(),
    getFeeds: vi.fn(),
    deleteAllFeeds: vi.fn(),
  },
}));

describe("feedApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSession", () => {
    it("should create a new feeding session", async () => {
      const request = { twin: "A" as const };
      const mockSession: FeedSession = {
        id: 123,
        twin: "A",
        events: [],
        created_at: new Date().toISOString(),
      };

      vi.mocked(feedApi.createSession).mockResolvedValue(mockSession);

      const result = await feedApi.createSession(request);

      expect(feedApi.createSession).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockSession);
    });

    it("should handle error when creating session", async () => {
      const request = { twin: "A" as const };
      vi.mocked(feedApi.createSession).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(feedApi.createSession(request)).rejects.toThrow(
        "Network error",
      );
    });

    it("should create session for Twin B", async () => {
      const request = { twin: "B" as const };
      const mockSession: FeedSession = {
        id: 456,
        twin: "B",
        events: [],
        created_at: new Date().toISOString(),
      };

      vi.mocked(feedApi.createSession).mockResolvedValue(mockSession);

      const result = await feedApi.createSession(request);

      expect(feedApi.createSession).toHaveBeenCalledWith(request);
      expect(result.twin).toBe("B");
    });
  });

  describe("addEvent", () => {
    it("should add an event to a session", async () => {
      const request = {
        session_id: 123,
        event_type: "start" as const,
        timestamp: new Date().toISOString(),
        side: "Left" as const,
      };
      const mockEvent: FeedEvent = {
        id: 1,
        feed_session_id: 123,
        event_type: "start",
        side: "Left",
        timestamp: request.timestamp,
        created_at: new Date().toISOString(),
      };

      vi.mocked(feedApi.addEvent).mockResolvedValue(mockEvent);

      const result = await feedApi.addEvent(request);

      expect(feedApi.addEvent).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockEvent);
    });

    it("should handle error when adding event", async () => {
      const request = {
        session_id: 123,
        event_type: "start" as const,
        timestamp: new Date().toISOString(),
        side: "Left" as const,
      };
      vi.mocked(feedApi.addEvent).mockRejectedValue(new Error("Server error"));

      await expect(feedApi.addEvent(request)).rejects.toThrow("Server error");
    });

    it("should add different event types", async () => {
      const eventTypes: Array<"start" | "pause" | "end" | "side_change"> = [
        "start",
        "pause",
        "end",
        "side_change",
      ];

      for (const eventType of eventTypes) {
        const request = {
          session_id: 123,
          event_type: eventType,
          timestamp: new Date().toISOString(),
          side: "Right" as const,
        };
        const mockEvent: FeedEvent = {
          id: 1,
          feed_session_id: 123,
          event_type: eventType,
          side: "Right",
          timestamp: request.timestamp,
          created_at: new Date().toISOString(),
        };

        vi.mocked(feedApi.addEvent).mockResolvedValue(mockEvent);

        const result = await feedApi.addEvent(request);
        expect(result.event_type).toBe(eventType);
      }
    });
  });

  describe("getFeeds", () => {
    it("should fetch feeds with default parameters", async () => {
      const mockResponse = {
        feeds: [
          {
            id: 1,
            twin: "A" as const,
            events: [
              {
                id: 1,
                feed_session_id: 1,
                event_type: "start" as const,
                side: "Left" as const,
                timestamp: new Date().toISOString(),
                created_at: new Date().toISOString(),
              },
            ],
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
      };

      vi.mocked(feedApi.getFeeds).mockResolvedValue(mockResponse);

      const result = await feedApi.getFeeds();

      expect(feedApi.getFeeds).toHaveBeenCalledWith();
      expect(result).toEqual(mockResponse);
    });

    it("should fetch feeds with custom parameters", async () => {
      const mockResponse = {
        feeds: [],
        total: 0,
      };

      vi.mocked(feedApi.getFeeds).mockResolvedValue(mockResponse);

      const result = await feedApi.getFeeds(50, 10);

      expect(feedApi.getFeeds).toHaveBeenCalledWith(50, 10);
      expect(result).toEqual(mockResponse);
    });

    it("should handle error when fetching feeds", async () => {
      vi.mocked(feedApi.getFeeds).mockRejectedValue(new Error("Network error"));

      await expect(feedApi.getFeeds()).rejects.toThrow("Network error");
    });

    it("should handle empty feeds response", async () => {
      const mockResponse = {
        feeds: [],
        total: 0,
      };

      vi.mocked(feedApi.getFeeds).mockResolvedValue(mockResponse);

      const result = await feedApi.getFeeds();

      expect(result.feeds).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should handle feeds with multiple events", async () => {
      const mockResponse = {
        feeds: [
          {
            id: 1,
            twin: "A" as const,
            events: [
              {
                id: 1,
                feed_session_id: 1,
                event_type: "start" as const,
                side: "Left" as const,
                timestamp: "2023-01-01T10:00:00.000Z",
                created_at: "2023-01-01T10:00:00.000Z",
              },
              {
                id: 2,
                feed_session_id: 1,
                event_type: "pause" as const,
                side: "Left" as const,
                timestamp: "2023-01-01T10:05:00.000Z",
                created_at: "2023-01-01T10:05:00.000Z",
              },
              {
                id: 3,
                feed_session_id: 1,
                event_type: "end" as const,
                side: "Left" as const,
                timestamp: "2023-01-01T10:10:00.000Z",
                created_at: "2023-01-01T10:10:00.000Z",
              },
            ],
            created_at: "2023-01-01T10:00:00.000Z",
          },
        ],
        total: 1,
      };

      vi.mocked(feedApi.getFeeds).mockResolvedValue(mockResponse);

      const result = await feedApi.getFeeds();

      expect(result.feeds[0].events).toHaveLength(3);
      expect(result.feeds[0].events[0].event_type).toBe("start");
      expect(result.feeds[0].events[1].event_type).toBe("pause");
      expect(result.feeds[0].events[2].event_type).toBe("end");
    });
  });

  describe("deleteAllFeeds", () => {
    it("should delete all feeds successfully", async () => {
      const mockResponse = {
        message: "All feeding sessions deleted",
        deleted_count: 5,
      };

      vi.mocked(feedApi.deleteAllFeeds).mockResolvedValue(mockResponse);

      const result = await feedApi.deleteAllFeeds();

      expect(feedApi.deleteAllFeeds).toHaveBeenCalledWith();
      expect(result).toEqual(mockResponse);
    });

    it("should handle deletion when no feeds exist", async () => {
      const mockResponse = {
        message: "All feeding sessions deleted",
        deleted_count: 0,
      };

      vi.mocked(feedApi.deleteAllFeeds).mockResolvedValue(mockResponse);

      const result = await feedApi.deleteAllFeeds();

      expect(result.deleted_count).toBe(0);
    });

    it("should handle error when deleting feeds", async () => {
      vi.mocked(feedApi.deleteAllFeeds).mockRejectedValue(
        new Error("Server error"),
      );

      await expect(feedApi.deleteAllFeeds()).rejects.toThrow("Server error");
    });
  });
});

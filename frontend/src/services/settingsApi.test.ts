import { describe, it, expect, vi, beforeEach } from "vitest";
import { settingsApi } from "../services/settingsApi";
import type { UserSettings } from "../types";

// Mock fetch
global.fetch = vi.fn();

describe("settingsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSettings", () => {
    it("should fetch settings successfully", async () => {
      const mockSettings: UserSettings = {
        id: 1,
        twin_a_name: "Alice",
        twin_b_name: "Bob",
        twin_a_color: "blue",
        twin_b_color: "pink",
        default_timer_interval: 100,
        theme: "system",
        created_at: "2023-01-01T12:00:00.000Z",
        updated_at: "2023-01-01T12:00:00.000Z",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      } as Response);

      const result = await settingsApi.getSettings();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/settings",
      );
      expect(result).toEqual(mockSettings);
    });

    it("should handle fetch errors", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(settingsApi.getSettings()).rejects.toThrow(
        "Failed to fetch settings",
      );
    });

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      await expect(settingsApi.getSettings()).rejects.toThrow("Network error");
    });

    it("should handle malformed JSON response", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as Response);

      await expect(settingsApi.getSettings()).rejects.toThrow("Invalid JSON");
    });
  });

  describe("updateSettings", () => {
    it("should update settings successfully", async () => {
      const settingsUpdate: Partial<UserSettings> = {
        twin_a_name: "Updated Alice",
        twin_b_name: "Updated Bob",
        twin_a_color: "red",
        theme: "dark",
      };

      const mockResponse: UserSettings = {
        id: 1,
        twin_a_name: "Updated Alice",
        twin_b_name: "Updated Bob",
        twin_a_color: "red",
        twin_b_color: "pink",
        default_timer_interval: 100,
        theme: "dark",
        created_at: "2023-01-01T12:00:00.000Z",
        updated_at: "2023-01-01T12:30:00.000Z",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await settingsApi.updateSettings(settingsUpdate);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settingsUpdate),
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle partial updates", async () => {
      const partialUpdate: Partial<UserSettings> = {
        theme: "light",
      };

      const mockResponse: UserSettings = {
        id: 1,
        twin_a_name: "Alice",
        twin_b_name: "Bob",
        twin_a_color: "blue",
        twin_b_color: "pink",
        default_timer_interval: 100,
        theme: "light",
        created_at: "2023-01-01T12:00:00.000Z",
        updated_at: "2023-01-01T12:30:00.000Z",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await settingsApi.updateSettings(partialUpdate);

      expect(result.theme).toBe("light");
      expect(result.twin_a_name).toBe("Alice"); // Unchanged
    });

    it("should handle update errors", async () => {
      const settingsUpdate: Partial<UserSettings> = {
        twin_a_name: "Updated Alice",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      } as Response);

      await expect(settingsApi.updateSettings(settingsUpdate)).rejects.toThrow(
        "Failed to update settings",
      );
    });

    it("should handle invalid data validation errors", async () => {
      const invalidUpdate = {
        default_timer_interval: -100, // Invalid value
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
      } as Response);

      await expect(settingsApi.updateSettings(invalidUpdate)).rejects.toThrow(
        "Failed to update settings",
      );
    });

    it("should handle empty update object", async () => {
      const emptyUpdate = {};

      const mockResponse: UserSettings = {
        id: 1,
        twin_a_name: "Alice",
        twin_b_name: "Bob",
        twin_a_color: "blue",
        twin_b_color: "pink",
        default_timer_interval: 100,
        theme: "system",
        created_at: "2023-01-01T12:00:00.000Z",
        updated_at: "2023-01-01T12:00:00.000Z",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await settingsApi.updateSettings(emptyUpdate);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emptyUpdate),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("resetSettings", () => {
    it("should reset settings to defaults successfully", async () => {
      const defaultSettings: UserSettings = {
        id: 1,
        twin_a_name: "Twin A",
        twin_b_name: "Twin B",
        twin_a_color: "blue",
        twin_b_color: "pink",
        default_timer_interval: 100,
        theme: "system",
        created_at: "2023-01-01T12:00:00.000Z",
        updated_at: "2023-01-01T12:30:00.000Z",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(defaultSettings),
      } as Response);

      const result = await settingsApi.resetSettings();

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/settings/reset",
        {
          method: "POST",
        },
      );
      expect(result).toEqual(defaultSettings);
      expect(result.twin_a_name).toBe("Twin A");
      expect(result.twin_b_name).toBe("Twin B");
      expect(result.theme).toBe("system");
    });

    it("should handle reset errors", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(settingsApi.resetSettings()).rejects.toThrow(
        "Failed to reset settings",
      );
    });

    it("should handle reset when no settings exist", async () => {
      const newDefaultSettings: UserSettings = {
        id: 1,
        twin_a_name: "Twin A",
        twin_b_name: "Twin B",
        twin_a_color: "blue",
        twin_b_color: "pink",
        default_timer_interval: 100,
        theme: "system",
        created_at: "2023-01-01T12:00:00.000Z",
        updated_at: "2023-01-01T12:00:00.000Z",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(newDefaultSettings),
      } as Response);

      const result = await settingsApi.resetSettings();

      expect(result).toEqual(newDefaultSettings);
      expect(result.created_at).toEqual(result.updated_at); // New record
    });
  });

  describe("Error Handling", () => {
    it("should handle network timeout", async () => {
      vi.mocked(fetch).mockRejectedValue(
        new Error("The operation was aborted"),
      );

      await expect(settingsApi.getSettings()).rejects.toThrow(
        "The operation was aborted",
      );
    });

    it("should handle 404 errors", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      await expect(settingsApi.getSettings()).rejects.toThrow(
        "Failed to fetch settings",
      );
    });

    it("should handle malformed request data", async () => {
      const circularObject: any = {};
      circularObject.self = circularObject; // Create circular reference

      // This should not cause an error in the API call itself,
      // but JSON.stringify would throw if attempted
      expect(() => JSON.stringify(circularObject)).toThrow();
    });

    it("should handle server returning non-JSON response", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("Unexpected token < in JSON")),
      } as Response);

      await expect(settingsApi.getSettings()).rejects.toThrow(
        "Unexpected token < in JSON",
      );
    });
  });

  describe("API Configuration", () => {
    it("should use correct API base URL", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await settingsApi.getSettings();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:8080/api/v1/settings"),
      );
    });

    it("should include correct headers for PUT requests", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await settingsApi.updateSettings({ theme: "dark" });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    });

    it("should include correct headers for POST requests", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await settingsApi.resetSettings();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  describe("Data Integrity", () => {
    it("should preserve all settings fields in response", async () => {
      const completeSettings: UserSettings = {
        id: 1,
        twin_a_name: "Alice",
        twin_b_name: "Bob",
        twin_a_color: "blue",
        twin_b_color: "pink",
        default_timer_interval: 100,
        theme: "system",
        created_at: "2023-01-01T12:00:00.000Z",
        updated_at: "2023-01-01T12:30:00.000Z",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(completeSettings),
      } as Response);

      const result = await settingsApi.getSettings();

      // Verify all fields are present
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("twin_a_name");
      expect(result).toHaveProperty("twin_b_name");
      expect(result).toHaveProperty("twin_a_color");
      expect(result).toHaveProperty("twin_b_color");
      expect(result).toHaveProperty("default_timer_interval");
      expect(result).toHaveProperty("theme");
      expect(result).toHaveProperty("created_at");
      expect(result).toHaveProperty("updated_at");
    });

    it("should handle missing optional fields gracefully", async () => {
      const minimalSettings = {
        id: 1,
        twin_a_name: "Alice",
        twin_b_name: "Bob",
        // Missing some fields
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(minimalSettings),
      } as Response);

      const result = await settingsApi.getSettings();

      expect(result.id).toBe(1);
      expect(result.twin_a_name).toBe("Alice");
      expect(result.twin_b_name).toBe("Bob");
    });
  });
});

import type { UserSettings } from "@/types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export class SettingsApiService {
  async getSettings(): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) {
      throw new Error("Failed to fetch settings");
    }
    return response.json();
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error("Failed to update settings");
    }
    return response.json();
  }

  async resetSettings(): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/settings/reset`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to reset settings");
    }
    return response.json();
  }
}

export const settingsApi = new SettingsApiService();

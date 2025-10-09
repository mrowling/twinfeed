import type { UserSettings } from "@/types";
import { getApiBaseUrl } from "@/utils/apiUrl";

const API_BASE_URL = getApiBaseUrl();

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

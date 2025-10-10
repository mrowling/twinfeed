export interface FeedEvent {
  id?: number;
  feed_session_id: number;
  event_type: "start" | "pause" | "end";
  side: "Left" | "Right";
  timestamp: string; // ISO string
  created_at?: string; // ISO string
}

export interface FeedSession {
  id?: number;
  twin: "A" | "B";
  events: FeedEvent[];
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
}

export interface TimerState {
  isRunning: boolean;
  startTime: number;
  duration: number;
  side: "Left" | "Right" | null;
  currentSessionId?: number; // Track the current session being timed
}

export interface AppState {
  twinA: TimerState;
  twinB: TimerState;
  sessions: FeedSession[];
}

export type Twin = "A" | "B";
export type Side = "Left" | "Right";
export type EventType = "start" | "pause" | "end";

export interface UserSettings {
  id?: number;
  twin_a_name: string;
  twin_b_name: string;
  twin_a_color: string;
  twin_b_color: string;
  default_timer_interval: number;
  theme: string;
  created_at?: string;
  updated_at?: string;
}

// Helper function to calculate total duration from events
export function calculateDuration(events: FeedEvent[]): number {
  if (events.length === 0) return 0;

  let totalDuration = 0;
  let startTime: Date | null = null;

  for (const event of events) {
    const eventTime = new Date(event.timestamp);

    switch (event.event_type) {
      case "start":
        startTime = eventTime;
        break;
      case "pause":
      case "end":
        if (startTime) {
          totalDuration += Math.floor(
            (eventTime.getTime() - startTime.getTime()) / 1000,
          );
          startTime = null;
        }
        break;
    }
  }

  // If session is still active (no pause/end event after last start)
  if (startTime) {
    totalDuration += Math.floor((Date.now() - startTime.getTime()) / 1000);
  }

  return totalDuration;
}

// Helper function to check if a session is currently active
export function isSessionActive(events: FeedEvent[]): boolean {
  if (events.length === 0) return false;
  const lastEvent = events[events.length - 1];
  return lastEvent.event_type === "start";
}

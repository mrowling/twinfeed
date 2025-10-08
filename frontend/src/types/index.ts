export interface FeedSession {
    id?: number
    twin: 'A' | 'B'
    side: 'Left' | 'Right'
    duration: number // in seconds
    start_time: string // ISO string
    created_at?: string // ISO string
}

export interface TimerState {
    isRunning: boolean
    startTime: number
    duration: number
    side: 'Left' | 'Right' | null
}

export interface AppState {
    twinA: TimerState
    twinB: TimerState
    sessions: FeedSession[]
}

export type Twin = 'A' | 'B'
export type Side = 'Left' | 'Right'

export interface UserSettings {
    id?: number
    twin_a_name: string
    twin_b_name: string
    twin_a_color: string
    twin_b_color: string
    default_timer_interval: number
    theme: string
    created_at?: string
    updated_at?: string
}
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
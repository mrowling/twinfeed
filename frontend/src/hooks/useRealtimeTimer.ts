import { useEffect, useState } from 'react'
import { useTimerStore } from '@/store/timerStore'
import type { Twin } from '@/types'

export function useRealtimeTimer(twin: Twin) {
    const { twinA, twinB, getFormattedTime } = useTimerStore()
    const [displayTime, setDisplayTime] = useState('')

    const timer = twin === 'A' ? twinA : twinB

    useEffect(() => {
        // Update immediately
        setDisplayTime(getFormattedTime(twin))

        // Only set up interval if timer is running
        if (!timer.isRunning) {
            return
        }

        const interval = setInterval(() => {
            setDisplayTime(getFormattedTime(twin))
        }, 100) // Update every 100ms for smooth real-time feel

        return () => clearInterval(interval)
    }, [twin, timer.isRunning, timer.startTime, timer.duration, getFormattedTime])

    // Also update when timer state changes (paused, reset, etc.)
    useEffect(() => {
        setDisplayTime(getFormattedTime(twin))
    }, [timer.duration, twin, getFormattedTime])

    return displayTime
}
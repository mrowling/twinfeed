import { useState, useEffect } from 'react'
import { settingsApi } from '@/services/settingsApi'
import type { UserSettings } from '@/types'

interface UseSettingsReturn {
    settings: UserSettings | null
    isLoading: boolean
    error: string | null
    updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>
    resetSettings: () => Promise<void>
    refetch: () => Promise<void>
}

export function useSettings(): UseSettingsReturn {
    const [settings, setSettings] = useState<UserSettings | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSettings = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const data = await settingsApi.getSettings()
            setSettings(data)

            // Also update localStorage for immediate access
            localStorage.setItem('twinAName', data.twin_a_name)
            localStorage.setItem('twinBName', data.twin_b_name)
            localStorage.setItem('twinAColor', data.twin_a_color)
            localStorage.setItem('twinBColor', data.twin_b_color)
            localStorage.setItem('timerInterval', data.default_timer_interval.toString())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch settings')

            // Fallback to localStorage if API fails
            const fallbackSettings: UserSettings = {
                twin_a_name: localStorage.getItem('twinAName') || 'Twin A',
                twin_b_name: localStorage.getItem('twinBName') || 'Twin B',
                twin_a_color: localStorage.getItem('twinAColor') || 'blue',
                twin_b_color: localStorage.getItem('twinBColor') || 'pink',
                default_timer_interval: parseInt(localStorage.getItem('timerInterval') || '100'),
                theme: 'system'
            }
            setSettings(fallbackSettings)
        } finally {
            setIsLoading(false)
        }
    }

    const updateSettings = async (newSettings: Partial<UserSettings>) => {
        if (!settings) return

        try {
            setError(null)
            const updatedSettings = await settingsApi.updateSettings(newSettings)
            setSettings(updatedSettings)

            // Update localStorage immediately
            localStorage.setItem('twinAName', updatedSettings.twin_a_name)
            localStorage.setItem('twinBName', updatedSettings.twin_b_name)
            localStorage.setItem('twinAColor', updatedSettings.twin_a_color)
            localStorage.setItem('twinBColor', updatedSettings.twin_b_color)
            localStorage.setItem('timerInterval', updatedSettings.default_timer_interval.toString())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update settings')
            throw err
        }
    }

    const resetSettings = async () => {
        try {
            setError(null)
            const defaultSettings = await settingsApi.resetSettings()
            setSettings(defaultSettings)

            // Update localStorage immediately
            localStorage.setItem('twinAName', defaultSettings.twin_a_name)
            localStorage.setItem('twinBName', defaultSettings.twin_b_name)
            localStorage.setItem('twinAColor', defaultSettings.twin_a_color)
            localStorage.setItem('twinBColor', defaultSettings.twin_b_color)
            localStorage.setItem('timerInterval', defaultSettings.default_timer_interval.toString())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset settings')
            throw err
        }
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    return {
        settings,
        isLoading,
        error,
        updateSettings,
        resetSettings,
        refetch: fetchSettings
    }
}
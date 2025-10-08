import { useState } from 'react'
import { useTimerStore } from '@/store/timerStore'
import { useApiSync } from '@/hooks/useApiSync'

function SettingsPage() {
    const { clearSessions } = useTimerStore()
    const { clearAllSessions, isLoading } = useApiSync()
    const [showConfirm, setShowConfirm] = useState(false)
    const [settingsChanged, setSettingsChanged] = useState(false)

    // Settings state
    const [settings, setSettings] = useState({
        twinAName: localStorage.getItem('twinAName') || 'Twin A',
        twinBName: localStorage.getItem('twinBName') || 'Twin B',
        defaultTimerInterval: parseInt(localStorage.getItem('timerInterval') || '100'),
        darkMode: localStorage.getItem('darkMode') === 'true',
    })

    const handleSettingChange = (key: string, value: string | boolean | number) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }))
        setSettingsChanged(true)
    }

    const saveSettings = () => {
        // Save to localStorage
        localStorage.setItem('twinAName', settings.twinAName)
        localStorage.setItem('twinBName', settings.twinBName)
        localStorage.setItem('timerInterval', settings.defaultTimerInterval.toString())
        localStorage.setItem('darkMode', settings.darkMode.toString())

        setSettingsChanged(false)

        // Show success message
        const successMsg = document.createElement('div')
        successMsg.className = 'fixed top-4 right-4 bg-success-500 text-white px-4 py-2 rounded-lg shadow-soft z-50'
        successMsg.textContent = 'Settings saved!'
        document.body.appendChild(successMsg)
        setTimeout(() => {
            document.body.removeChild(successMsg)
        }, 2000)
    }

    const handleClearAllData = async () => {
        if (!showConfirm) {
            setShowConfirm(true)
            return
        }

        try {
            // Clear from backend
            await clearAllSessions()

            // Clear local storage
            clearSessions()
            localStorage.removeItem('twinfeed-timer-storage')

            setShowConfirm(false)

            // Show success message
            const successMsg = document.createElement('div')
            successMsg.className = 'fixed top-4 right-4 bg-success-500 text-white px-4 py-2 rounded-lg shadow-soft z-50'
            successMsg.textContent = 'All data cleared!'
            document.body.appendChild(successMsg)
            setTimeout(() => {
                document.body.removeChild(successMsg)
            }, 2000)
        } catch (error) {
            console.error('Failed to clear data:', error)
        }
    }

    const resetSettings = () => {
        setSettings({
            twinAName: 'Twin A',
            twinBName: 'Twin B',
            defaultTimerInterval: 100,
            darkMode: false,
        })
        setSettingsChanged(true)
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                    Settings
                </h2>
                <p className="text-neutral-600">
                    Customize your TwinFeed experience
                </p>
            </div>

            {/* Twin Names */}
            <div className="card">
                <h3 className="text-lg font-semibold text-neutral-700 mb-4">Twin Names</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            First Twin Name
                        </label>
                        <input
                            type="text"
                            value={settings.twinAName}
                            onChange={(e) => handleSettingChange('twinAName', e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Twin A"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Second Twin Name
                        </label>
                        <input
                            type="text"
                            value={settings.twinBName}
                            onChange={(e) => handleSettingChange('twinBName', e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Twin B"
                        />
                    </div>
                </div>
            </div>

            {/* Timer Settings */}
            <div className="card">
                <h3 className="text-lg font-semibold text-neutral-700 mb-4">Timer Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Timer Update Interval (ms)
                        </label>
                        <select
                            value={settings.defaultTimerInterval}
                            onChange={(e) => handleSettingChange('defaultTimerInterval', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value={100}>100ms (Smooth)</option>
                            <option value={500}>500ms (Balanced)</option>
                            <option value={1000}>1000ms (Battery Saving)</option>
                        </select>
                        <p className="text-xs text-neutral-500 mt-1">
                            Lower values provide smoother updates but use more battery
                        </p>
                    </div>
                </div>
            </div>

            {/* App Preferences */}
            <div className="card">
                <h3 className="text-lg font-semibold text-neutral-700 mb-4">App Preferences</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-neutral-700">Dark mode</label>
                            <p className="text-xs text-neutral-500">Use dark theme (coming soon)</p>
                        </div>
                        <button
                            onClick={() => handleSettingChange('darkMode', !settings.darkMode)}
                            disabled
                            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-neutral-300 opacity-50 cursor-not-allowed"
                        >
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="card">
                <h3 className="text-lg font-semibold text-neutral-700 mb-4">Actions</h3>
                <div className="space-y-3">
                    {settingsChanged && (
                        <button
                            onClick={saveSettings}
                            className="w-full btn-success"
                        >
                            Save Settings
                        </button>
                    )}

                    <button
                        onClick={resetSettings}
                        className="w-full btn-secondary"
                    >
                        Reset to Defaults
                    </button>

                    <div className="border-t border-neutral-200 pt-4">
                        <h4 className="text-sm font-medium text-neutral-700 mb-2">Danger Zone</h4>
                        {!showConfirm ? (
                            <button
                                onClick={handleClearAllData}
                                disabled={isLoading}
                                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 shadow-soft disabled:opacity-50"
                            >
                                {isLoading ? 'Clearing...' : 'Clear All Data'}
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-red-600 text-center">
                                    ⚠️ This will permanently delete all feeding sessions and timer data!
                                </p>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleClearAllData}
                                        disabled={isLoading}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 shadow-soft disabled:opacity-50"
                                    >
                                        {isLoading ? 'Clearing...' : 'Yes, Delete All'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* App Info */}
            <div className="card">
                <h3 className="text-lg font-semibold text-neutral-700 mb-4">About</h3>
                <div className="space-y-2 text-sm text-neutral-600">
                    <div className="flex justify-between">
                        <span>Version:</span>
                        <span className="font-mono">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Build:</span>
                        <span className="font-mono">initial-dev</span>
                    </div>
                    <div className="flex justify-between">
                        <span>License:</span>
                        <span>MIT</span>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-200">
                    <p className="text-xs text-neutral-500 text-center">
                        TwinFeed - A mobile-friendly breastfeeding tracker for twins
                    </p>
                </div>
            </div>
        </div>
    )
}

export default SettingsPage
import TimerCard from '@/components/TimerCard'
import { useTimerStore } from '@/store/timerStore'
import { useApiSync } from '@/hooks/useApiSync'

function TrackerPage() {
    const {
        twinA,
        twinB,
        startTimer,
        pauseTimer,
        saveSession: saveLocalSession,
    } = useTimerStore()

    const { saveSession: saveToApi, error, retry } = useApiSync()

    const handleStartTimer = (twin: 'A' | 'B', side: 'Left' | 'Right') => {
        startTimer(twin, side)
    }

    const handlePauseTimer = (twin: 'A' | 'B') => {
        pauseTimer(twin)
    }

    const handleSaveSession = async (twin: 'A' | 'B') => {
        const localSession = saveLocalSession(twin)
        if (localSession) {
            // Try to sync with backend
            await saveToApi({
                twin: localSession.twin,
                side: localSession.side,
                duration: localSession.duration,
                start_time: localSession.start_time,
            })
        }
    }

    return (
        <div className="space-y-6">
            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="text-red-600">⚠️</div>
                            <div className="text-sm text-red-700">{error}</div>
                        </div>
                        <button
                            onClick={retry}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            <div className="text-center">
                <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                    Twin Feeding Tracker
                </h2>
                <p className="text-neutral-600">
                    Track feeding sessions for both twins
                </p>
            </div>

            <div className="space-y-4">
                <TimerCard
                    twin="A"
                    isRunning={twinA.isRunning}
                    currentSide={twinA.side}
                    onStart={(side) => handleStartTimer('A', side)}
                    onPause={() => handlePauseTimer('A')}
                    onSave={() => handleSaveSession('A')}
                />

                <TimerCard
                    twin="B"
                    isRunning={twinB.isRunning}
                    currentSide={twinB.side}
                    onStart={(side) => handleStartTimer('B', side)}
                    onPause={() => handlePauseTimer('B')}
                    onSave={() => handleSaveSession('B')}
                />
            </div>
        </div>
    )
}

export default TrackerPage
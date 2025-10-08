import { useRealtimeTimer } from '@/hooks/useRealtimeTimer'
import type { Twin, Side } from '@/types'

interface TimerCardProps {
    twin: Twin
    isRunning: boolean
    currentSide: Side | null
    onStart: (side: Side) => void
    onPause: () => void
    onSave: () => void
}

function TimerCard({
    twin,
    isRunning,
    currentSide,
    onStart,
    onPause,
    onSave
}: TimerCardProps) {
    const displayTime = useRealtimeTimer(twin)

    const handleSideClick = (side: Side) => {
        if (isRunning && currentSide === side) {
            onPause()
        } else {
            onStart(side)
        }
    }

    const canSave = currentSide !== null && displayTime !== '00:00:00'

    return (
        <div className="card">
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-neutral-700">
                    Twin {twin}
                </h3>
                {currentSide && (
                    <p className="text-sm text-neutral-500 mt-1">
                        Feeding on {currentSide} side
                    </p>
                )}
            </div>

            <div className="text-center mb-6">
                <div className={`timer-display transition-colors duration-200 ${isRunning ? 'text-primary-600 animate-pulse' : 'text-neutral-800'
                    }`}>
                    {displayTime}
                </div>
                {isRunning && (
                    <div className="text-xs text-primary-500 mt-1 animate-pulse">
                        ● Recording...
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                    onClick={() => handleSideClick('Left')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all duration-200 ${currentSide === 'Left'
                            ? isRunning
                                ? 'bg-primary-500 text-white shadow-soft'
                                : 'bg-primary-100 text-primary-700 border-2 border-primary-200'
                            : 'btn-secondary'
                        }`}
                >
                    Left
                </button>
                <button
                    onClick={() => handleSideClick('Right')}
                    className={`py-3 px-4 rounded-xl font-medium transition-all duration-200 ${currentSide === 'Right'
                            ? isRunning
                                ? 'bg-primary-500 text-white shadow-soft'
                                : 'bg-primary-100 text-primary-700 border-2 border-primary-200'
                            : 'btn-secondary'
                        }`}
                >
                    Right
                </button>
            </div>

            <div className="flex justify-center space-x-3">
                <button
                    onClick={onPause}
                    disabled={!isRunning}
                    className={`px-6 py-3 rounded-xl font-medium transition-colors duration-200 ${isRunning
                            ? 'bg-neutral-600 hover:bg-neutral-700 text-white shadow-soft'
                            : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        }`}
                >
                    {isRunning ? 'Pause' : 'Paused'}
                </button>
                <button
                    onClick={onSave}
                    disabled={!canSave}
                    className={`px-6 py-3 rounded-xl font-medium transition-colors duration-200 ${canSave
                            ? 'btn-success'
                            : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        }`}
                >
                    Save
                </button>
            </div>
        </div>
    )
}

export default TimerCard
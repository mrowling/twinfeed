import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { useApiSync } from '@/hooks/useApiSync'
import type { FeedSession } from '@/types'

function ReportPage() {
    const { sessions, clearAllSessions, isLoading, error, retry } = useApiSync()

    // Group sessions by date
    const groupedSessions = sessions.reduce((groups: Record<string, FeedSession[]>, session: FeedSession) => {
        const date = format(parseISO(session.start_time), 'yyyy-MM-dd')
        if (!groups[date]) {
            groups[date] = []
        }
        groups[date].push(session)
        return groups
    }, {})

    // Sort dates in descending order
    const sortedDates = Object.keys(groupedSessions).sort().reverse()

    const formatDate = (dateString: string) => {
        const date = parseISO(dateString + 'T00:00:00')
        if (isToday(date)) return 'Today'
        if (isYesterday(date)) return 'Yesterday'
        return format(date, 'MMM d, yyyy')
    }

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const secs = seconds % 60

        return `${minutes}:${secs.toString().padStart(2, '0')}`
    }

    const formatTime = (isoString: string) => {
        return format(parseISO(isoString), 'h:mm a')
    }

    const handleClearHistory = async () => {
        if (window.confirm('Are you sure you want to clear all feeding history?')) {
            const success = await clearAllSessions()
            if (!success) {
                alert('Failed to clear history. Please try again.')
            }
        }
    }

    const totalSessions = sessions.length
    const totalDuration = sessions.reduce((total: number, session: FeedSession) => total + session.duration, 0)

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                        Feeding Report
                    </h2>
                    <p className="text-neutral-600">Loading...</p>
                </div>
                <div className="card">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
                        <div className="space-y-2">
                            <div className="h-3 bg-neutral-200 rounded"></div>
                            <div className="h-3 bg-neutral-200 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
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
                    Feeding Report
                </h2>
                <p className="text-neutral-600">
                    View your feeding history
                </p>
            </div>

            {/* Summary Stats */}
            {totalSessions > 0 && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-neutral-700 mb-3">Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-primary-600">{totalSessions}</div>
                            <div className="text-sm text-neutral-500">Total Sessions</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-primary-600">
                                {formatDuration(totalDuration)}
                            </div>
                            <div className="text-sm text-neutral-500">Total Time</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sessions List */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-700">Recent Sessions</h3>
                    {sessions.length > 0 && (
                        <button
                            onClick={handleClearHistory}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                            Clear History
                        </button>
                    )}
                </div>

                {sessions.length === 0 ? (
                    <div className="text-center text-neutral-500 py-8">
                        <div className="text-6xl mb-4">🍼</div>
                        <p>No feeding sessions recorded yet</p>
                        <p className="text-sm mt-2">Start tracking your twins' feeding sessions!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {sortedDates.map((dateString) => (
                            <div key={dateString}>
                                <h4 className="text-sm font-semibold text-neutral-600 mb-3 sticky top-0 bg-white py-1">
                                    {formatDate(dateString)}
                                </h4>
                                <div className="space-y-2">
                                    {groupedSessions[dateString]
                                        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                                        .map((session, index) => (
                                            <div
                                                key={`${session.start_time}-${index}`}
                                                className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-3 h-3 rounded-full ${session.twin === 'A' ? 'bg-blue-400' : 'bg-pink-400'
                                                        }`} />
                                                    <div>
                                                        <div className="font-medium text-neutral-800">
                                                            Twin {session.twin} • {session.side}
                                                        </div>
                                                        <div className="text-sm text-neutral-500">
                                                            {formatTime(session.start_time)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium text-neutral-800">
                                                        {formatDuration(session.duration)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ReportPage
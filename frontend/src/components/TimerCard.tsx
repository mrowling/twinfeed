import { useState } from 'react'
import { useRealtimeTimer } from '@/hooks/useRealtimeTimer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pause, Save, Trash2 } from 'lucide-react'
import type { Twin, Side } from '@/types'

interface TimerCardProps {
    twin: Twin
    isRunning: boolean
    currentSide: Side | null
    suggestedSide: Side | null
    onStart: (side: Side) => void
    onPause: () => void
    onSave: () => void
    onReset: () => void
}

function TimerCard({
    twin,
    isRunning,
    currentSide,
    suggestedSide,
    onStart,
    onPause,
    onSave,
    onReset
}: TimerCardProps) {
    const displayTime = useRealtimeTimer(twin)
    const [showResetConfirm, setShowResetConfirm] = useState(false)

    // Get custom twin names from localStorage
    const twinName = twin === 'A'
        ? localStorage.getItem('twinAName') || 'Twin A'
        : localStorage.getItem('twinBName') || 'Twin B'

    const handleSideClick = (side: Side) => {
        if (isRunning && currentSide === side) {
            onPause()
        } else {
            onStart(side)
        }
    }

    const handleResetClick = () => {
        if (!showResetConfirm) {
            setShowResetConfirm(true)
        } else {
            onReset()
            setShowResetConfirm(false)
        }
    }

    const handleSaveClick = () => {
        if (isRunning) {
            onPause() // Stop the timer first
        }
        onSave() // Then save the session
    }

    const canSave = currentSide !== null && displayTime !== '00:00:00'

    return (
        <Card className="w-full relative">
            <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{twinName}</CardTitle>
                <div className="h-6 flex items-center justify-center">
                    {currentSide ? (
                        <Badge variant="outline" className="mx-auto w-fit">
                            Feeding on {currentSide} side
                        </Badge>
                    ) : (
                        <div className="invisible">
                            <Badge variant="outline" className="mx-auto w-fit">
                                Feeding on Left side
                            </Badge>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center">
                    <div className={`text-4xl font-mono font-bold transition-colors duration-200 ${isRunning ? 'text-primary' : 'text-foreground'
                        }`}>
                        {displayTime}
                    </div>
                    <div className="text-xs mt-1 h-4 flex items-center justify-center gap-1">
                        {isRunning ? (
                            <>
                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                                <span className="text-primary">Recording...</span>
                            </>
                        ) : (
                            <span className="invisible">Recording...</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={() => handleSideClick('Left')}
                        variant={currentSide === 'Left' ? (isRunning ? 'default' : 'secondary') : 'outline'}
                        size="lg"
                        className={`h-12 ${suggestedSide === 'Left' && currentSide !== 'Left'
                            ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-300'
                            : ''
                            }`}
                    >
                        Left
                    </Button>
                    <Button
                        onClick={() => handleSideClick('Right')}
                        variant={currentSide === 'Right' ? (isRunning ? 'default' : 'secondary') : 'outline'}
                        size="lg"
                        className={`h-12 ${suggestedSide === 'Right' && currentSide !== 'Right'
                            ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-300'
                            : ''
                            }`}
                    >
                        Right
                    </Button>
                </div>

                <div className="flex justify-center space-x-3">
                    <Button
                        onClick={onPause}
                        disabled={!isRunning}
                        variant="outline"
                        size="lg"
                    >
                        <Pause className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={handleSaveClick}
                        disabled={!canSave}
                        variant="default"
                        size="lg"
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Save className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={handleResetClick}
                        disabled={isRunning}
                        variant="outline"
                        size="lg"
                        className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:border-red-700 dark:hover:bg-red-950"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                {showResetConfirm && (
                    <div className="text-center text-xs text-red-500 mt-2">
                        Click reset again to confirm
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default TimerCard
import { useRealtimeTimer } from '@/hooks/useRealtimeTimer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

    const canSave = currentSide !== null && displayTime !== '00:00:00'

    return (
        <Card className="w-full">
            <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{twinName}</CardTitle>
                {currentSide && (
                    <Badge variant="outline" className="mx-auto w-fit">
                        Feeding on {currentSide} side
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center">
                    <div className={`text-4xl font-mono font-bold transition-colors duration-200 ${
                        isRunning ? 'text-primary animate-pulse' : 'text-foreground'
                    }`}>
                        {displayTime}
                    </div>
                    {isRunning && (
                        <div className="text-xs text-primary mt-1 animate-pulse flex items-center justify-center gap-1">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                            Recording...
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={() => handleSideClick('Left')}
                        variant={currentSide === 'Left' ? (isRunning ? 'default' : 'secondary') : 'outline'}
                        size="lg"
                        className="h-12"
                    >
                        Left
                    </Button>
                    <Button
                        onClick={() => handleSideClick('Right')}
                        variant={currentSide === 'Right' ? (isRunning ? 'default' : 'secondary') : 'outline'}
                        size="lg"
                        className="h-12"
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
                        {isRunning ? 'Pause' : 'Paused'}
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={!canSave}
                        variant="default"
                        size="lg"
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Save
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default TimerCard
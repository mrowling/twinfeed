import { useState } from "react";
import { useSleepRealtimeTimer } from "@/hooks/useSleepRealtimeTimer";
import { useSleepIdleTimer } from "@/hooks/useSleepIdleTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, Save, Trash2 } from "lucide-react";
import type { Twin } from "@/types";

interface SleepTimerCardProps {
  twin: Twin;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onSave: () => void;
  onReset: () => void;
}

function SleepTimerCard({
  twin,
  isRunning,
  onStart,
  onPause,
  onSave,
  onReset,
}: SleepTimerCardProps) {
  const displayTime = useSleepRealtimeTimer(twin);
  const idleTime = useSleepIdleTimer(twin);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Get custom twin names from localStorage
  const twinName =
    twin === "A"
      ? localStorage.getItem("twinAName") || "Twin A"
      : localStorage.getItem("twinBName") || "Twin B";

  const handleResetClick = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
    } else {
      onReset();
      setShowResetConfirm(false);
    }
  };

  const handleSaveClick = () => {
    if (isRunning) {
      onPause(); // Stop the timer first
    }
    onSave(); // Then save the session
  };

  const canSave = displayTime !== "00:00" && displayTime !== "00:00:00";

  return (
    <Card className="w-full relative">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg">{twinName}</CardTitle>
        <div className="h-6 flex items-center justify-center">
          {idleTime ? (
            <div className="text-orange-600 dark:text-orange-400 text-sm font-mono">
              {idleTime}
            </div>
          ) : isRunning ? (
            <Badge variant="outline" className="mx-auto w-fit">
              Sleeping
            </Badge>
          ) : (
            <div className="invisible">
              <Badge variant="outline" className="mx-auto w-fit">
                Sleeping
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div
            className={`text-4xl font-mono font-bold transition-colors duration-200 ${
              isRunning ? "text-primary" : "text-foreground"
            }`}
          >
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

        <div className="flex justify-center">
          <Button
            onClick={isRunning ? onPause : onStart}
            variant={isRunning ? "outline" : "default"}
            size="lg"
            className="h-16 w-full max-w-xs"
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Pause Sleep
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Start Sleep
              </>
            )}
          </Button>
        </div>

        <div className="flex justify-center space-x-3">
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
  );
}

export default SleepTimerCard;

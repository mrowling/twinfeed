import TimerCard from "@/components/TimerCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTimerStore } from "@/store/timerStore";
import { useApiSync } from "@/hooks/useApiSync";
import { AlertTriangle } from "lucide-react";

function TrackerPage() {
  const {
    twinA,
    twinB,
    startTimer,
    pauseTimer,
    resetTimer,
    saveSession: saveLocalSession,
    getSuggestedNextSide,
  } = useTimerStore();

  const { saveSession: saveToApi, error, retry } = useApiSync();

  const handleStartTimer = async (twin: "A" | "B", side: "Left" | "Right") => {
    await startTimer(twin, side);
  };

  const handlePauseTimer = async (twin: "A" | "B") => {
    await pauseTimer(twin);
  };

  const handleResetTimer = async (twin: "A" | "B") => {
    await resetTimer(twin);
  };

  const handleSaveSession = async (twin: "A" | "B") => {
    const localSession = await saveLocalSession(twin);
    if (localSession) {
      // Try to sync with backend
      await saveToApi({
        twin: localSession.twin,
        events: localSession.events,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <div className="text-sm text-destructive">{error}</div>
              </div>
              <Button
                onClick={retry}
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive/80"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Twin Feeding Tracker
        </h2>
        <p className="text-muted-foreground">
          Track feeding sessions for both twins
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <TimerCard
          twin="A"
          isRunning={twinA.isRunning}
          currentSide={twinA.side}
          suggestedSide={getSuggestedNextSide("A")}
          onStart={(side) => handleStartTimer("A", side)}
          onPause={() => handlePauseTimer("A")}
          onSave={() => handleSaveSession("A")}
          onReset={() => handleResetTimer("A")}
        />

        <TimerCard
          twin="B"
          isRunning={twinB.isRunning}
          currentSide={twinB.side}
          suggestedSide={getSuggestedNextSide("B")}
          onStart={(side) => handleStartTimer("B", side)}
          onPause={() => handlePauseTimer("B")}
          onSave={() => handleSaveSession("B")}
          onReset={() => handleResetTimer("B")}
        />
      </div>
    </div>
  );
}

export default TrackerPage;

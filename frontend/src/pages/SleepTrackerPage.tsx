import SleepTimerCard from "@/components/SleepTimerCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSleepStore } from "@/store/sleepStore";
import { useSleepApiSync } from "@/hooks/useSleepApiSync";
import { AlertTriangle } from "lucide-react";

function SleepTrackerPage() {
  const {
    twinA,
    twinB,
    startSleep,
    pauseSleep,
    resetSleep,
    saveSession: saveLocalSession,
  } = useSleepStore();

  const { error, retry } = useSleepApiSync();

  const handleStartSleep = async (twin: "A" | "B") => {
    await startSleep(twin);
  };

  const handlePauseSleep = async (twin: "A" | "B") => {
    await pauseSleep(twin);
  };

  const handleResetSleep = async (twin: "A" | "B") => {
    await resetSleep(twin);
  };

  const handleSaveSession = async (twin: "A" | "B") => {
    await saveLocalSession(twin);
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
          Twin Sleep Tracker
        </h2>
        <p className="text-muted-foreground">
          Track sleep sessions and wake windows for both twins
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <SleepTimerCard
          twin="A"
          isRunning={twinA.isRunning}
          onStart={() => handleStartSleep("A")}
          onPause={() => handlePauseSleep("A")}
          onSave={() => handleSaveSession("A")}
          onReset={() => handleResetSleep("A")}
        />

        <SleepTimerCard
          twin="B"
          isRunning={twinB.isRunning}
          onStart={() => handleStartSleep("B")}
          onPause={() => handlePauseSleep("B")}
          onSave={() => handleSaveSession("B")}
          onReset={() => handleResetSleep("B")}
        />
      </div>
    </div>
  );
}

export default SleepTrackerPage;

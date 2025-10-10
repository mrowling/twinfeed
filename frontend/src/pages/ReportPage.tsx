import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApiSync } from "@/hooks/useApiSync";
import { AlertTriangle, Loader2, Baby, ChevronDown, ChevronRight } from "lucide-react";
import { getTwinColorClasses } from "@/lib/twinColors";
import type { FeedSession } from "@/types";
import { calculateDuration } from "@/types";
import { useState } from "react";

function ReportPage() {
  const { sessions, clearAllSessions, isLoading, error, retry } = useApiSync();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Get custom twin names from localStorage
  const twinAName = localStorage.getItem("twinAName") || "Twin A";
  const twinBName = localStorage.getItem("twinBName") || "Twin B";

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce(
    (groups: Record<string, FeedSession[]>, session: FeedSession) => {
      // Use the first event's timestamp as the session date
      const firstEvent = session.events[0];
      if (!firstEvent) return groups;

      const date = format(parseISO(firstEvent.timestamp), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
      return groups;
    },
    {},
  );

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedSessions).sort().reverse();

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString + "T00:00:00");
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTime = (isoString: string) => {
    return format(parseISO(isoString), "h:mm a");
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all feeding history?")) {
      const success = await clearAllSessions();
      if (!success) {
        alert("Failed to clear history. Please try again.");
      }
    }
  };

  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce(
    (total: number, session: FeedSession) =>
      total + calculateDuration(session.events),
    0,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Feeding Report
          </h2>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-5/6"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          Feeding Report
        </h2>
        <p className="text-muted-foreground">View your feeding history</p>
      </div>

      {/* Summary Stats */}
      {totalSessions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {totalSessions}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Sessions
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatDuration(totalDuration)}
                </div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Sessions</CardTitle>
            {sessions.length > 0 && (
              <Button
                onClick={handleClearHistory}
                variant="destructive"
                size="sm"
              >
                Clear History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Baby className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No feeding sessions recorded yet</p>
              <p className="text-sm mt-2">
                Start tracking your twins' feeding sessions!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((dateString) => (
                <div key={dateString}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                    {formatDate(dateString)}
                  </h4>
                  <div className="space-y-2">
                    {groupedSessions[dateString]
                      .sort((a, b) => {
                        const aTime = a.events[0]?.timestamp || "0";
                        const bTime = b.events[0]?.timestamp || "0";
                        return (
                          new Date(bTime).getTime() - new Date(aTime).getTime()
                        );
                      })
                      .map((session, index) => {
                        const sessionId = `${session.events[0]?.timestamp || "unknown"}-${index}`;
                        const isExpanded = expandedSessions.has(sessionId);
                        return (
                          <div key={sessionId} className="border rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                              onClick={() => toggleSessionExpansion(sessionId)}
                            >
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-3 h-3 rounded-full ${getTwinColorClasses(session.twin).bg}`}
                                />
                                <div>
                                  <div className="font-medium text-foreground">
                                    {session.twin === "A" ? twinAName : twinBName}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {session.events[0]?.side || "Unknown"}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {session.events[0]
                                        ? formatTime(session.events[0].timestamp)
                                        : "Unknown"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="text-right">
                                  <div className="font-medium text-foreground">
                                    {formatDuration(
                                      calculateDuration(session.events),
                                    )}
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="px-3 pb-3">
                                <div className="pt-2 border-t">
                                  <h5 className="text-sm font-medium text-muted-foreground mb-2">
                                    Events ({session.events.length})
                                  </h5>
                                  <div className="space-y-1">
                                    {session.events.map((event, eventIndex) => (
                                      <div
                                        key={eventIndex}
                                        className="flex items-center justify-between text-sm py-1 px-2 bg-background rounded"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <Badge
                                            variant={
                                              event.event_type === "start"
                                                ? "default"
                                                : event.event_type === "end"
                                                ? "secondary"
                                                : "outline"
                                            }
                                            className="text-xs"
                                          >
                                            {event.event_type}
                                          </Badge>
                                          <span className="text-muted-foreground">
                                            {event.side}
                                          </span>
                                        </div>
                                        <span className="text-muted-foreground">
                                          {formatTime(event.timestamp)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ReportPage;

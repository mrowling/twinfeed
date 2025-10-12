import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApiSync } from "@/hooks/useApiSync";
import { useSettings } from "@/hooks/useSettings";
import {
  AlertTriangle,
  Loader2,
  Baby,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Save,
  X,
  Plus,
} from "lucide-react";
import { getTwinColorClasses } from "@/lib/twinColors";
import type { FeedSession, FeedEvent } from "@/types";
import { calculateDuration } from "@/types";
import { useState } from "react";
import { feedApi } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

function ReportPage() {
  const { sessions, clearAllSessions, isLoading, error, retry, refreshSessions } = useApiSync();
  const { settings } = useSettings();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [addingEvent, setAddingEvent] = useState<string | null>(null);
  const [sessionEditData, setSessionEditData] = useState<{ twin: "A" | "B" } | null>(null);
  const [eventEditData, setEventEditData] = useState<{
    event_type: "start" | "pause" | "end" | "side_change";
    side: "Left" | "Right";
    timestamp: string;
  } | null>(null);
  const [newEventData, setNewEventData] = useState<{
    event_type: "start" | "pause" | "end" | "side_change";
    side: "Left" | "Right";
    timestamp: string;
  } | null>(null);

  // Get custom twin names from settings (which syncs with localStorage)
  const twinAName = settings?.twin_a_name || localStorage.getItem("twinAName") || "Twin A";
  const twinBName = settings?.twin_b_name || localStorage.getItem("twinBName") || "Twin B";

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const startEditingSession = (session: FeedSession) => {
    setEditingSession(session.id?.toString() || null);
    setSessionEditData({ twin: session.twin });
  };

  const cancelEditingSession = () => {
    setEditingSession(null);
    setSessionEditData(null);
  };

  const saveSessionEdit = async (sessionId: number) => {
    if (!sessionEditData) return;

    try {
      await feedApi.updateSession(sessionId, sessionEditData);
      await refreshSessions();
      cancelEditingSession();
    } catch (error) {
      alert("Failed to update session. Please try again.");
    }
  };

  const deleteSession = async (sessionId: number) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;

    try {
      await feedApi.deleteSession(sessionId);
      await refreshSessions();
    } catch (error) {
      alert("Failed to delete session. Please try again.");
    }
  };

  const startEditingEvent = (event: FeedEvent) => {
    setEditingEvent(`${event.feed_session_id}-${event.id}`);
    setEventEditData({
      event_type: event.event_type,
      side: event.side,
      timestamp: event.timestamp,
    });
  };

  const cancelEditingEvent = () => {
    setEditingEvent(null);
    setEventEditData(null);
  };

  const saveEventEdit = async (eventId: number) => {
    if (!eventEditData) return;

    try {
      await feedApi.updateEvent(eventId, eventEditData);
      await refreshSessions();
      cancelEditingEvent();
    } catch (error) {
      alert("Failed to update event. Please try again.");
    }
  };

  const deleteEvent = async (eventId: number) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      await feedApi.deleteEvent(eventId);
      await refreshSessions();
    } catch (error) {
      alert("Failed to delete event. Please try again.");
    }
  };

  const startAddingEvent = (sessionId: string) => {
    setAddingEvent(sessionId);
    setNewEventData({
      event_type: "start",
      side: "Left",
      timestamp: new Date().toISOString(),
    });
  };

  const cancelAddingEvent = () => {
    setAddingEvent(null);
    setNewEventData(null);
  };

  const saveNewEvent = async (sessionId: number) => {
    if (!newEventData) return;

    try {
      await feedApi.addEvent({
        session_id: sessionId,
        event_type: newEventData.event_type,
        side: newEventData.side,
        timestamp: newEventData.timestamp,
      });
      await refreshSessions();
      cancelAddingEvent();
    } catch (error) {
      alert("Failed to add event. Please try again.");
    }
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
                        const aTime = a.created_at || a.events[0]?.timestamp || "0";
                        const bTime = b.created_at || b.events[0]?.timestamp || "0";
                        return (
                          new Date(bTime).getTime() - new Date(aTime).getTime()
                        );
                      })
                      .map((session, index) => {
                        const sessionId = `${session.created_at || session.events[0]?.timestamp || "unknown"}-${index}`;
                        const isExpanded = expandedSessions.has(sessionId);
                        return (
                          <div
                            key={sessionId}
                            className="border rounded-lg overflow-hidden"
                          >
                            <div
                              className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                              onClick={() => toggleSessionExpansion(sessionId)}
                            >
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-3 h-3 rounded-full ${getTwinColorClasses(session.twin).bg}`}
                                />
                                <div>
                                  {editingSession === session.id?.toString() ? (
                                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                      <Select
                                        value={sessionEditData?.twin || session.twin}
                                        onValueChange={(value: "A" | "B") =>
                                          setSessionEditData(prev => prev ? { ...prev, twin: value } : null)
                                        }
                                      >
                                        <SelectTrigger className="w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="A">{twinAName}</SelectItem>
                                          <SelectItem value="B">{twinBName}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          session.id && saveSessionEdit(session.id);
                                        }}
                                      >
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          cancelEditingSession();
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="font-medium text-foreground">
                                        {session.twin === "A"
                                          ? twinAName
                                          : twinBName}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {session.is_bottle ? (
                                          <Badge variant="outline" className="text-xs">
                                            Bottle
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-xs">
                                            {session.events[0]?.side || "Unknown"}
                                          </Badge>
                                        )}
                                        <span className="text-sm text-muted-foreground">
                                          {session.created_at
                                            ? formatTime(session.created_at)
                                            : session.events[0]
                                              ? formatTime(session.events[0].timestamp)
                                              : "Unknown"}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="text-right">
                                  <div className="font-medium text-foreground">
                                    {session.is_bottle ? (
                                      <div className="flex flex-col items-end">
                                        <span>{session.bottle_amount} ml</span>
                                        <Badge variant="outline" className="text-xs mt-1">
                                          {session.bottle_type}
                                        </Badge>
                                      </div>
                                    ) : (
                                      formatDuration(calculateDuration(session.events))
                                    )}
                                  </div>
                                </div>
                                {editingSession !== session.id?.toString() && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingSession(session);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        session.id && deleteSession(session.id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
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
                                  {session.is_bottle ? (
                                    <div className="space-y-2">
                                      <h5 className="text-sm font-medium text-muted-foreground">
                                        Bottle Details
                                      </h5>
                                      <div className="bg-muted/50 rounded p-3 space-y-2">
                                        <div className="flex justify-between">
                                          <span className="text-sm text-muted-foreground">Amount:</span>
                                          <span className="text-sm font-medium">{session.bottle_amount} ml</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm text-muted-foreground">Type:</span>
                                          <Badge variant="outline" className="text-xs">
                                            {session.bottle_type}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm text-muted-foreground">Time:</span>
                                          <span className="text-sm">
                                            {session.created_at ? formatTime(session.created_at) : "Unknown"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <h5 className="text-sm font-medium text-muted-foreground mb-2">
                                        Events ({session.events.length})
                                      </h5>
                                      <div className="space-y-1">
                                        {session.events.map((event, eventIndex) => {
                                          const eventKey = `${event.feed_session_id}-${event.id}`;
                                          const isEditing = editingEvent === eventKey;
                                          return (
                                            <div
                                              key={eventIndex}
                                              className="flex items-center justify-between text-sm py-1 px-2 bg-background rounded"
                                            >
                                              {isEditing ? (
                                                <div className="flex items-center space-x-2 flex-1">
                                                  <Select
                                                    value={eventEditData?.event_type || event.event_type}
                                                    onValueChange={(value: "start" | "pause" | "end" | "side_change") =>
                                                      setEventEditData(prev => prev ? { ...prev, event_type: value } : null)
                                                    }
                                                  >
                                                    <SelectTrigger className="w-24">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="start">Start</SelectItem>
                                                      <SelectItem value="pause">Pause</SelectItem>
                                                      <SelectItem value="end">End</SelectItem>
                                                      <SelectItem value="side_change">Side Change</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                  <Select
                                                    value={eventEditData?.side || event.side}
                                                    onValueChange={(value: "Left" | "Right") =>
                                                      setEventEditData(prev => prev ? { ...prev, side: value } : null)
                                                    }
                                                  >
                                                    <SelectTrigger className="w-20">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="Left">Left</SelectItem>
                                                      <SelectItem value="Right">Right</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                  <Input
                                                    type="datetime-local"
                                                    value={eventEditData?.timestamp ?
                                                      new Date(eventEditData.timestamp).toISOString().slice(0, 16) :
                                                      new Date(event.timestamp).toISOString().slice(0, 16)
                                                    }
                                                    onChange={(e) =>
                                                      setEventEditData(prev => prev ? { ...prev, timestamp: new Date(e.target.value).toISOString() } : null)
                                                    }
                                                    className="flex-1"
                                                  />
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => event.id && saveEventEdit(event.id)}
                                                  >
                                                    <Save className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={cancelEditingEvent}
                                                  >
                                                    <X className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <>
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
                                                  <div className="flex items-center space-x-2">
                                                    <span className="text-muted-foreground">
                                                      {formatTime(event.timestamp)}
                                                    </span>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => startEditingEvent(event)}
                                                    >
                                                      <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => event.id && deleteEvent(event.id)}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {addingEvent === sessionId ? (
                                          <div className="flex items-center space-x-2 py-1 px-2 bg-muted/50 rounded">
                                            <Select
                                              value={newEventData?.event_type || "start"}
                                              onValueChange={(value: "start" | "pause" | "end" | "side_change") =>
                                                setNewEventData(prev => prev ? { ...prev, event_type: value } : null)
                                              }
                                            >
                                              <SelectTrigger className="w-24">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="start">Start</SelectItem>
                                                <SelectItem value="pause">Pause</SelectItem>
                                                <SelectItem value="end">End</SelectItem>
                                                <SelectItem value="side_change">Side Change</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <Select
                                              value={newEventData?.side || "Left"}
                                              onValueChange={(value: "Left" | "Right") =>
                                                setNewEventData(prev => prev ? { ...prev, side: value } : null)
                                              }
                                            >
                                              <SelectTrigger className="w-20">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="Left">Left</SelectItem>
                                                <SelectItem value="Right">Right</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <Input
                                              type="datetime-local"
                                              value={newEventData?.timestamp ?
                                                new Date(newEventData.timestamp).toISOString().slice(0, 16) :
                                                new Date().toISOString().slice(0, 16)
                                              }
                                              onChange={(e) =>
                                                setNewEventData(prev => prev ? { ...prev, timestamp: new Date(e.target.value).toISOString() } : null)
                                              }
                                              className="flex-1"
                                            />
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => session.id && saveNewEvent(session.id)}
                                            >
                                              <Save className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={cancelAddingEvent}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => startAddingEvent(sessionId)}
                                            className="w-full justify-start text-muted-foreground hover:text-foreground"
                                          >
                                            <Plus className="h-3 w-3 mr-2" />
                                            Add Event
                                          </Button>
                                        )}
                                      </div>
                                    </>
                                  )}
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

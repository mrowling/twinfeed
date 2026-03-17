import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSleepApiSync } from "@/hooks/useSleepApiSync";
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
  Filter,
} from "lucide-react";
import { getTwinColorClasses } from "@/lib/twinColors";
import type { SleepSession, SleepEvent } from "@/types";
import { calculateSleepDuration } from "@/types";
import { useState } from "react";
import { sleepApi } from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useSleepStore } from "@/store/sleepStore";

function SleepReportPage() {
  const { sessions } = useSleepStore();
  const { clearSessions } = useSleepStore();
  const { isLoading, error, retry, loadSessions } = useSleepApiSync();
  const { settings } = useSettings();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [sessionEditData, setSessionEditData] = useState<{
    twin: "A" | "B";
    created_at?: string;
  } | null>(null);
  const [eventEditData, setEventEditData] = useState<{
    event_type: "start" | "pause" | "end";
    timestamp: string;
  } | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    twin: "all" as "all" | "A" | "B",
    dateRange: "all" as
      | "all"
      | "today"
      | "yesterday"
      | "week"
      | "month"
      | "custom",
  });
  const [customDateRange, setCustomDateRange] = useState({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Get custom twin names from settings
  const twinAName =
    settings?.twin_a_name || localStorage.getItem("twinAName") || "Twin A";
  const twinBName =
    settings?.twin_b_name || localStorage.getItem("twinBName") || "Twin B";

  // Filter sessions based on current filters
  const filteredSessions = sessions.filter((session) => {
    // Twin filter
    if (filters.twin !== "all" && session.twin !== filters.twin) {
      return false;
    }

    // Date range filter
    const sessionDate = parseISO(
      session.created_at || session.events[0]?.timestamp || "",
    );
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    if (filters.dateRange === "today" && sessionDate < today) {
      return false;
    }
    if (
      filters.dateRange === "yesterday" &&
      (sessionDate < yesterday || sessionDate >= today)
    ) {
      return false;
    }
    if (filters.dateRange === "week" && sessionDate < weekAgo) {
      return false;
    }
    if (filters.dateRange === "month" && sessionDate < monthAgo) {
      return false;
    }
    if (filters.dateRange === "custom") {
      if (customDateRange.startDate && sessionDate < customDateRange.startDate) {
        return false;
      }
      if (customDateRange.endDate) {
        const endDate = new Date(customDateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (sessionDate > endDate) {
          return false;
        }
      }
    }

    return true;
  });

  // Calculate summary stats
  const totalSleepTime = filteredSessions.reduce((total, session) => {
    return total + calculateSleepDuration(session.events);
  }, 0);

  const formatDuration = (seconds: number) => {
    // Handle negative or zero durations
    if (seconds <= 0) {
      return "0m";
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const toggleSessionExpanded = (sessionId: string) => {
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

  const startEditingSession = (session: SleepSession) => {
    const sessionId = `session-${session.id}`;
    setEditingSession(sessionId);
    setSessionEditData({
      twin: session.twin,
      created_at: session.created_at,
    });
  };

  const cancelEditingSession = () => {
    setEditingSession(null);
    setSessionEditData(null);
  };

  const saveSessionEdit = async (session: SleepSession) => {
    if (!sessionEditData || !session.id) return;

    try {
      await sleepApi.updateSession(session.id, sessionEditData);
      await loadSessions(100, 0, false); // Refresh sessions
      setEditingSession(null);
      setSessionEditData(null);
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  };

  const deleteSession = async (sessionId: number) => {
    if (!confirm("Are you sure you want to delete this sleep session?")) return;

    try {
      await sleepApi.deleteSession(sessionId);
      await loadSessions(100, 0, false); // Refresh sessions
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const clearAllSessions = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL sleep sessions? This cannot be undone.",
      )
    )
      return;

    try {
      await sleepApi.deleteAllSleep();
      clearSessions();
    } catch (error) {
      console.error("Failed to clear all sessions:", error);
    }
  };

  const startEditingEvent = (event: SleepEvent) => {
    const eventId = `event-${event.id}`;
    setEditingEvent(eventId);
    setEventEditData({
      event_type: event.event_type,
      timestamp: event.timestamp,
    });
  };

  const cancelEditingEvent = () => {
    setEditingEvent(null);
    setEventEditData(null);
  };

  const saveEventEdit = async (event: SleepEvent) => {
    if (!eventEditData || !event.id) return;

    try {
      await sleepApi.updateEvent(event.id, eventEditData);
      await loadSessions(100, 0, false); // Refresh sessions
      setEditingEvent(null);
      setEventEditData(null);
    } catch (error) {
      console.error("Failed to update event:", error);
    }
  };

  const deleteEvent = async (eventId: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await sleepApi.deleteEvent(eventId);
      await loadSessions(100, 0, false); // Refresh sessions
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  const clearFilters = () => {
    setFilters({
      twin: "all",
      dateRange: "all",
    });
    setCustomDateRange({
      startDate: undefined,
      endDate: undefined,
    });
  };

  const hasActiveFilters =
    filters.twin !== "all" || filters.dateRange !== "all";

  // Group sessions by date
  const groupedSessions = filteredSessions.reduce(
    (groups, session) => {
      const date = session.created_at || session.events[0]?.timestamp || "";
      const parsedDate = parseISO(date);
      let dateKey: string;

      if (isToday(parsedDate)) {
        dateKey = "Today";
      } else if (isYesterday(parsedDate)) {
        dateKey = "Yesterday";
      } else {
        dateKey = format(parsedDate, "MMMM d, yyyy");
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
      return groups;
    },
    {} as Record<string, SleepSession[]>,
  );

  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          Sleep Report
        </h2>
        <p className="text-muted-foreground">View and manage sleep history</p>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{filteredSessions.length}</div>
            <div className="text-sm text-muted-foreground">Sleep Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {formatDuration(totalSleepTime)}
            </div>
            <div className="text-sm text-muted-foreground">Total Sleep</div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle className="text-lg">Filters</CardTitle>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {filteredSessions.length} / {sessions.length}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Twin</label>
                <Select
                  value={filters.twin}
                  onValueChange={(value: any) =>
                    setFilters({ ...filters, twin: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select twin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Twins</SelectItem>
                    <SelectItem value="A">{twinAName}</SelectItem>
                    <SelectItem value="B">{twinBName}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(value: any) =>
                    setFilters({ ...filters, dateRange: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filters.dateRange === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <DatePicker
                    date={customDateRange.startDate}
                    onDateChange={(date) =>
                      setCustomDateRange({ ...customDateRange, startDate: date })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <DatePicker
                    date={customDateRange.endDate}
                    onDateChange={(date) =>
                      setCustomDateRange({ ...customDateRange, endDate: date })
                    }
                  />
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Baby className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No sleep sessions</h3>
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "No sessions match your filters"
                : "Start tracking sleep sessions to see them here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSessions).map(([date, dateSessions]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {date}
              </h3>
              <div className="space-y-3">
                {dateSessions.map((session) => {
                  const sessionId = `session-${session.id}`;
                  const isExpanded = expandedSessions.has(sessionId);
                  const isEditing = editingSession === sessionId;
                  const duration = calculateSleepDuration(session.events);
                  const twinName = session.twin === "A" ? twinAName : twinBName;
                  const colorClasses = getTwinColorClasses(session.twin);
                  const sessionTime = session.created_at
                    ? format(parseISO(session.created_at), "h:mm a")
                    : session.events[0]
                      ? format(parseISO(session.events[0].timestamp), "h:mm a")
                      : "Unknown time";

                  return (
                    <Card key={sessionId}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div
                              className={`w-2 h-2 rounded-full ${colorClasses.bg}`}
                            />
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <Select
                                    value={sessionEditData?.twin}
                                    onValueChange={(value: "A" | "B") =>
                                      setSessionEditData({
                                        ...sessionEditData!,
                                        twin: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select twin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="A">{twinAName}</SelectItem>
                                      <SelectItem value="B">{twinBName}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-medium">{twinName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {sessionTime} • {formatDuration(duration)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => saveSessionEdit(session)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditingSession}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingSession(session)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    session.id && deleteSession(session.id)
                                  }
                                  className="text-destructive hover:text-destructive/80"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSessionExpanded(sessionId)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-2">
                            <div className="text-sm font-medium mb-2">Events</div>
                            {session.events.map((event) => {
                              const eventId = `event-${event.id}`;
                              const isEditingEvent = editingEvent === eventId;
                              const eventTime = format(
                                parseISO(event.timestamp),
                                "h:mm:ss a",
                              );

                              return (
                                <div
                                  key={eventId}
                                  className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50"
                                >
                                  {isEditingEvent ? (
                                    <div className="flex-1 space-y-2">
                                      <Select
                                        value={eventEditData?.event_type}
                                        onValueChange={(
                                          value: "start" | "pause" | "end",
                                        ) =>
                                          setEventEditData({
                                            ...eventEditData!,
                                            event_type: value,
                                          })
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Event type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="start">
                                            Start
                                          </SelectItem>
                                          <SelectItem value="pause">
                                            Pause
                                          </SelectItem>
                                          <SelectItem value="end">End</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        type="datetime-local"
                                        value={
                                          eventEditData?.timestamp
                                            ? format(
                                                parseISO(eventEditData.timestamp),
                                                "yyyy-MM-dd'T'HH:mm",
                                              )
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const date = new Date(e.target.value);
                                          setEventEditData({
                                            ...eventEditData!,
                                            timestamp: date.toISOString(),
                                          });
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2 flex-1">
                                      <Badge variant="outline">
                                        {event.event_type}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        {eventTime}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-1">
                                    {isEditingEvent ? (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => saveEventEdit(event)}
                                        >
                                          <Save className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={cancelEditingEvent}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditingEvent(event)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            event.id && deleteEvent(event.id)
                                          }
                                          className="text-destructive hover:text-destructive/80"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {sessions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <Button
              variant="destructive"
              onClick={clearAllSessions}
              className="w-full"
            >
              Clear All Sleep History
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SleepReportPage;

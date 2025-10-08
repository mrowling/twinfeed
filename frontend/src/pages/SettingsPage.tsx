import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTimerStore } from "@/store/timerStore";
import { useApiSync } from "@/hooks/useApiSync";
import { useTheme } from "@/components/theme-provider";
import { useSettings } from "@/hooks/useSettings";
import { AlertTriangle, Loader2 } from "lucide-react";

function SettingsPage() {
  const { clearSessions } = useTimerStore();
  const { clearAllSessions, isLoading: isApiLoading } = useApiSync();
  const { theme, setTheme } = useTheme();
  const {
    settings: remoteSettings,
    isLoading: isSettingsLoading,
    error: settingsError,
    updateSettings,
    resetSettings: resetRemoteSettings,
  } = useSettings();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<any>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize local settings when remote settings load
  useEffect(() => {
    if (remoteSettings && !localSettings) {
      setLocalSettings({
        twinAName: remoteSettings.twin_a_name,
        twinBName: remoteSettings.twin_b_name,
        twinAColor: remoteSettings.twin_a_color,
        twinBColor: remoteSettings.twin_b_color,
        defaultTimerInterval: remoteSettings.default_timer_interval,
      });
    }
  }, [remoteSettings, localSettings]);

  const colorOptions = [
    { name: "Blue", value: "blue", class: "bg-blue-500" },
    { name: "Pink", value: "pink", class: "bg-pink-500" },
    { name: "Green", value: "green", class: "bg-green-500" },
    { name: "Purple", value: "purple", class: "bg-purple-500" },
    { name: "Orange", value: "orange", class: "bg-orange-500" },
    { name: "Red", value: "red", class: "bg-red-500" },
    { name: "Yellow", value: "yellow", class: "bg-yellow-500" },
    { name: "Teal", value: "teal", class: "bg-teal-500" },
    { name: "Indigo", value: "indigo", class: "bg-indigo-500" },
    { name: "Gray", value: "gray", class: "bg-gray-500" },
  ];

  // Debounced save function
  const debouncedSave = async () => {
    if (Object.keys(pendingChanges).length === 0 || !localSettings) return;

    try {
      setIsSaving(true);

      // Send complete settings object with all current values
      const completeSettings = {
        twin_a_name: localSettings.twinAName,
        twin_b_name: localSettings.twinBName,
        twin_a_color: localSettings.twinAColor,
        twin_b_color: localSettings.twinBColor,
        default_timer_interval: localSettings.defaultTimerInterval,
        theme: theme,
      };

      await updateSettings(completeSettings);
      setPendingChanges({});
      showSaveToast();
    } catch (error) {
      console.error("Failed to update settings:", error);
      showErrorToast();
    } finally {
      setIsSaving(false);
    }
  };

  // Effect to handle debounced saving
  useEffect(() => {
    if (Object.keys(pendingChanges).length > 0) {
      // Show pending changes toast
      showPendingToast();

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        debouncedSave();
      }, 1000); // 1 second debounce
    } else {
      // Hide pending changes toast when no changes
      hidePendingToast();
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [pendingChanges]);

  // Effect to hide pending toast when saving starts
  useEffect(() => {
    if (isSaving) {
      hidePendingToast();
    }
  }, [isSaving]);

  const handleSettingChange = (
    key: string,
    value: string | boolean | number,
  ) => {
    if (!remoteSettings || !localSettings) return;

    // Update local state immediately for instant UI feedback
    setLocalSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));

    // Map frontend keys to backend keys
    const backendKey =
      key === "twinAName"
        ? "twin_a_name"
        : key === "twinBName"
          ? "twin_b_name"
          : key === "twinAColor"
            ? "twin_a_color"
            : key === "twinBColor"
              ? "twin_b_color"
              : key === "defaultTimerInterval"
                ? "default_timer_interval"
                : key;

    // Update localStorage immediately for instant feedback
    if (key === "twinAName") localStorage.setItem("twinAName", value as string);
    if (key === "twinBName") localStorage.setItem("twinBName", value as string);
    if (key === "twinAColor")
      localStorage.setItem("twinAColor", value as string);
    if (key === "twinBColor")
      localStorage.setItem("twinBColor", value as string);
    if (key === "defaultTimerInterval")
      localStorage.setItem("timerInterval", value.toString());

    // Add to pending changes for debounced save
    setPendingChanges((prev) => ({
      ...prev,
      [backendKey]: value,
    }));
  };

  const showSaveToast = () => {
    // Remove any existing pending toast first
    const existingPendingToast = document.querySelector(
      ".pending-changes-toast",
    );
    if (existingPendingToast) {
      existingPendingToast.style.transform = "translateX(100%)";
      existingPendingToast.style.opacity = "0";
      setTimeout(() => {
        if (document.body.contains(existingPendingToast)) {
          document.body.removeChild(existingPendingToast);
        }
      }, 200);
    }

    // Create and animate in the save toast
    setTimeout(() => {
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm transition-all duration-200 ease-in-out";
      toast.style.transform = "translateX(100%)";
      toast.style.opacity = "0";
      toast.innerHTML =
        '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> Saved!';
      document.body.appendChild(toast);

      // Animate in
      requestAnimationFrame(() => {
        toast.style.transform = "translateX(0)";
        toast.style.opacity = "1";
      });

      setTimeout(() => {
        if (document.body.contains(toast)) {
          toast.style.transform = "translateX(100%)";
          toast.style.opacity = "0";
          setTimeout(() => {
            if (document.body.contains(toast)) {
              document.body.removeChild(toast);
            }
          }, 200);
        }
      }, 1500);
    }, 200);
  };

  const showErrorToast = () => {
    // Remove any existing pending toast first
    const existingPendingToast = document.querySelector(
      ".pending-changes-toast",
    );
    if (existingPendingToast) {
      existingPendingToast.style.transform = "translateX(100%)";
      existingPendingToast.style.opacity = "0";
      setTimeout(() => {
        if (document.body.contains(existingPendingToast)) {
          document.body.removeChild(existingPendingToast);
        }
      }, 200);
    }

    // Create and animate in the error toast
    setTimeout(() => {
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm transition-all duration-200 ease-in-out";
      toast.style.transform = "translateX(100%)";
      toast.style.opacity = "0";
      toast.innerHTML =
        '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> Save failed!';
      document.body.appendChild(toast);

      // Animate in
      requestAnimationFrame(() => {
        toast.style.transform = "translateX(0)";
        toast.style.opacity = "1";
      });

      setTimeout(() => {
        if (document.body.contains(toast)) {
          toast.style.transform = "translateX(100%)";
          toast.style.opacity = "0";
          setTimeout(() => {
            if (document.body.contains(toast)) {
              document.body.removeChild(toast);
            }
          }, 200);
        }
      }, 3000);
    }, 200);
  };

  const showPendingToast = () => {
    // Remove any existing pending toast
    const existingToast = document.querySelector(".pending-changes-toast");
    if (existingToast) {
      document.body.removeChild(existingToast);
    }

    const toast = document.createElement("div");
    toast.className =
      "pending-changes-toast fixed top-4 right-4 bg-orange-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm transition-all duration-200 ease-in-out";
    toast.style.transform = "translateX(100%)";
    toast.style.opacity = "0";
    toast.innerHTML =
      '<div class="w-2 h-2 bg-white rounded-full animate-pulse"></div> Changes pending...';
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = "translateX(0)";
      toast.style.opacity = "1";
    });
  };

  const hidePendingToast = () => {
    const existingToast = document.querySelector(".pending-changes-toast");
    if (existingToast) {
      existingToast.style.transform = "translateX(100%)";
      existingToast.style.opacity = "0";
      setTimeout(() => {
        if (document.body.contains(existingToast)) {
          document.body.removeChild(existingToast);
        }
      }, 200);
    }
  };

  const handleClearAllData = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      // Clear from backend
      await clearAllSessions();

      // Clear local storage
      clearSessions();
      localStorage.removeItem("twinfeed-timer-storage");

      setShowConfirm(false);

      // Show success toast
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2";
      toast.innerHTML =
        '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> All data cleared!';
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
    } catch (error) {
      console.error("Failed to clear data:", error);
    }
  };

  const handleResetSettings = async () => {
    try {
      await resetRemoteSettings();
      showSaveToast();
    } catch (error) {
      console.error("Failed to reset settings:", error);
      showErrorToast();
    }
  };

  // Show loading state while settings are loading
  if (isSettingsLoading || !localSettings) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Settings</h2>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        </div>
      </div>
    );
  }

  // Show error state if settings failed to load
  if (!remoteSettings) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Settings</h2>
          <p className="text-destructive">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Settings
          {isSaving && (
            <Loader2 className="h-4 w-4 animate-spin text-primary ml-2 inline" />
          )}
        </h2>
        <p className="text-muted-foreground">
          Customize your TwinFeed experience
        </p>
      </div>

      {/* Twin Names */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Twin Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">First Twin</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                value={localSettings.twinAName}
                onChange={(e) =>
                  handleSettingChange("twinAName", e.target.value)
                }
                placeholder="Twin A"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      handleSettingChange("twinAColor", color.value)
                    }
                    className={`w-8 h-8 rounded-full ${color.class} border-2 transition-all ${
                      localSettings.twinAColor === color.value
                        ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                        : "border-border hover:border-foreground"
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Second Twin</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                value={localSettings.twinBName}
                onChange={(e) =>
                  handleSettingChange("twinBName", e.target.value)
                }
                placeholder="Twin B"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      handleSettingChange("twinBColor", color.value)
                    }
                    className={`w-8 h-8 rounded-full ${color.class} border-2 transition-all ${
                      localSettings.twinBColor === color.value
                        ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                        : "border-border hover:border-foreground"
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timer Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Timer Update Interval
            </label>
            <Select
              value={localSettings.defaultTimerInterval.toString()}
              onValueChange={(value) =>
                handleSettingChange("defaultTimerInterval", parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100ms (Smooth)</SelectItem>
                <SelectItem value="500">500ms (Balanced)</SelectItem>
                <SelectItem value="1000">1000ms (Battery Saving)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Lower values provide smoother updates but use more battery
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium text-foreground">
                Theme
              </label>
              <p className="text-xs text-muted-foreground">
                Choose your preferred theme
              </p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleResetSettings}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Reset to Defaults
          </Button>

          <div className="border-t pt-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Danger Zone
              </h4>
              {!showConfirm ? (
                <Button
                  onClick={handleClearAllData}
                  disabled={isApiLoading}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  {isApiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    "Clear All Data"
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 border border-destructive rounded-lg bg-destructive/5">
                    <p className="text-sm text-destructive text-center font-medium">
                      ⚠️ This will permanently delete all feeding sessions and
                      timer data!
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setShowConfirm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleClearAllData}
                      disabled={isApiLoading}
                      variant="destructive"
                      className="flex-1"
                    >
                      {isApiLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        "Yes, Delete All"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Version:</span>
              <Badge variant="outline" className="font-mono">
                1.0.0
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">License:</span>
              <Badge variant="outline">MIT</Badge>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              TwinFeed - A mobile-friendly breastfeeding tracker for twins
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;

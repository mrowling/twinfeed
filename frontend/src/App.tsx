import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Navigation from "./components/Navigation";
import TrackerPage from "./pages/TrackerPage";
import BottlePage from "./pages/BottlePage";
import ReportPage from "./pages/ReportPage";
import SleepTrackerPage from "./pages/SleepTrackerPage";
import SleepReportPage from "./pages/SleepReportPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="twinfeeder-ui-theme">
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-6 max-w-md sm:max-w-2xl">
          <Routes>
            <Route path="/" element={<BottlePage />} />
            <Route path="/bottle" element={<Navigate to="/" replace />} />
            <Route path="/timer" element={<TrackerPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/sleep" element={<SleepTrackerPage />} />
            <Route path="/sleep-report" element={<SleepReportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;

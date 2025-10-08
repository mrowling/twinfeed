import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import Navigation from './components/Navigation'
import TrackerPage from './pages/TrackerPage'
import ReportPage from './pages/ReportPage'
import SettingsPage from './pages/SettingsPage'

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="twinfeeder-ui-theme">
            <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-6 max-w-md sm:max-w-2xl">
                    <Routes>
                        <Route path="/" element={<TrackerPage />} />
                        <Route path="/report" element={<ReportPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                </main>
            </div>
        </ThemeProvider>
    )
}

export default App
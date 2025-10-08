import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import TrackerPage from './pages/TrackerPage'
import ReportPage from './pages/ReportPage'

function App() {
    return (
        <div className="min-h-screen bg-neutral-50">
            <Navigation />
            <main className="container mx-auto px-4 py-6 max-w-md">
                <Routes>
                    <Route path="/" element={<TrackerPage />} />
                    <Route path="/report" element={<ReportPage />} />
                </Routes>
            </main>
        </div>
    )
}

export default App
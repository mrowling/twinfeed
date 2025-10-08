import { Link, useLocation } from 'react-router-dom'

function Navigation() {
    const location = useLocation()

    return (
        <nav className="bg-white shadow-soft border-b border-neutral-200">
            <div className="container mx-auto px-4 max-w-md">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-neutral-800">
                            🍼 TwinFeed
                        </h1>
                    </div>
                    <div className="flex space-x-1">
                        <Link
                            to="/"
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/'
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100'
                                }`}
                        >
                            Timer
                        </Link>
                        <Link
                            to="/report"
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/report'
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100'
                                }`}
                        >
                            Report
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navigation
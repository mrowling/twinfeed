import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

function Navigation() {
    const location = useLocation()

    const navItems = [
        { path: '/', label: 'Timer' },
        { path: '/report', label: 'Report' },
        { path: '/settings', label: 'Settings' }
    ]

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 max-w-md">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-bold text-foreground">
                            🍼 TwinFeed
                        </h1>
                    </div>
                    <div className="flex items-center space-x-1">
                        {navItems.map((item) => (
                            <Button
                                key={item.path}
                                asChild
                                variant={location.pathname === item.path ? 'default' : 'ghost'}
                                size="sm"
                            >
                                <Link to={item.path}>
                                    {item.label}
                                </Link>
                            </Button>
                        ))}
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navigation
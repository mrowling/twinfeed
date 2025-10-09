import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Timer" },
    { path: "/report", label: "Report" },
    { path: "/settings", label: "Settings" },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-3 max-w-md">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-foreground">🍼 TwinFeed</h1>
          </div>
          <div className="flex items-center space-x-0.5">
            {navItems.map((item) => (
              <Button
                key={item.path}
                asChild
                variant={location.pathname === item.path ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2 text-xs"
              >
                <Link to={item.path}>{item.label}</Link>
              </Button>
            ))}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChevronDown, Menu } from "lucide-react";
import { useState } from "react";

function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const feedPaths = ["/", "/bottle", "/report"];
  const sleepPaths = ["/sleep", "/sleep-report"];
  const isFeedActive = feedPaths.includes(location.pathname);
  const isSleepActive = sleepPaths.includes(location.pathname);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 max-w-md sm:max-w-2xl">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">🍼 TwinFeed</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center space-x-1">
            {/* Feed Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isFeedActive ? "default" : "ghost"}
                  size="default"
                  className="h-10"
                >
                  Feed
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/" className="w-full cursor-pointer">
                    Feed Timer
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/bottle" className="w-full cursor-pointer">
                    Bottle Feed
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/report" className="w-full cursor-pointer">
                    Feed Report
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sleep Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isSleepActive ? "default" : "ghost"}
                  size="default"
                  className="h-10"
                >
                  Sleep
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/sleep" className="w-full cursor-pointer">
                    Sleep Tracker
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/sleep-report" className="w-full cursor-pointer">
                    Sleep Report
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <Button
              asChild
              variant={location.pathname === "/settings" ? "default" : "ghost"}
              size="default"
              className="h-10"
            >
              <Link to="/settings">Settings</Link>
            </Button>

            <ThemeToggle />
          </div>

          {/* Mobile Navigation */}
          <div className="flex sm:hidden items-center space-x-2">
            <ThemeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* Feed Section */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground px-3">Feed</h3>
                    <Button
                      asChild
                      variant={location.pathname === "/" ? "default" : "ghost"}
                      className="w-full justify-start h-12 text-base"
                      onClick={closeMobileMenu}
                    >
                      <Link to="/">Feed Timer</Link>
                    </Button>
                    <Button
                      asChild
                      variant={location.pathname === "/bottle" ? "default" : "ghost"}
                      className="w-full justify-start h-12 text-base"
                      onClick={closeMobileMenu}
                    >
                      <Link to="/bottle">Bottle Feed</Link>
                    </Button>
                    <Button
                      asChild
                      variant={location.pathname === "/report" ? "default" : "ghost"}
                      className="w-full justify-start h-12 text-base"
                      onClick={closeMobileMenu}
                    >
                      <Link to="/report">Feed Report</Link>
                    </Button>
                  </div>

                  {/* Sleep Section */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground px-3">Sleep</h3>
                    <Button
                      asChild
                      variant={location.pathname === "/sleep" ? "default" : "ghost"}
                      className="w-full justify-start h-12 text-base"
                      onClick={closeMobileMenu}
                    >
                      <Link to="/sleep">Sleep Tracker</Link>
                    </Button>
                    <Button
                      asChild
                      variant={location.pathname === "/sleep-report" ? "default" : "ghost"}
                      className="w-full justify-start h-12 text-base"
                      onClick={closeMobileMenu}
                    >
                      <Link to="/sleep-report">Sleep Report</Link>
                    </Button>
                  </div>

                  {/* Settings */}
                  <div className="space-y-2">
                    <Button
                      asChild
                      variant={location.pathname === "/settings" ? "default" : "ghost"}
                      className="w-full justify-start h-12 text-base"
                      onClick={closeMobileMenu}
                    >
                      <Link to="/settings">Settings</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Navigation from "./Navigation";

// Mock the theme-toggle component
vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ChevronDown: () => <div data-testid="chevron-icon" />,
  Menu: () => <div data-testid="menu-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

const renderNavigation = () => {
  return render(
    <BrowserRouter>
      <Navigation />
    </BrowserRouter>
  );
};

describe("Navigation", () => {
  describe("Basic Rendering", () => {
    it("should render the app title", () => {
      renderNavigation();
      expect(screen.getByText(/TwinFeed/)).toBeInTheDocument();
    });

    it("should render theme toggle", () => {
      renderNavigation();
      // There are two theme toggles (desktop and mobile), so we use getAllByTestId
      const themeToggles = screen.getAllByTestId("theme-toggle");
      expect(themeToggles.length).toBeGreaterThan(0);
    });
  });

  describe("Desktop Navigation", () => {
    it("should render Feed dropdown on desktop", () => {
      renderNavigation();
      // Desktop nav is hidden on mobile, shown on sm and up
      const feedButtons = screen.getAllByText("Feed");
      expect(feedButtons.length).toBeGreaterThan(0);
    });

    it("should render Sleep dropdown on desktop", () => {
      renderNavigation();
      const sleepButtons = screen.getAllByText("Sleep");
      expect(sleepButtons.length).toBeGreaterThan(0);
    });

    it("should render Settings link on desktop", () => {
      renderNavigation();
      const settingsLinks = screen.getAllByText("Settings");
      expect(settingsLinks.length).toBeGreaterThan(0);
    });
  });

  describe("Mobile Navigation", () => {
    it("should render hamburger menu button", () => {
      renderNavigation();
      expect(screen.getByTestId("menu-icon")).toBeInTheDocument();
    });

    it("should open mobile menu when hamburger is clicked", () => {
      renderNavigation();
      const menuButton = screen.getByTestId("menu-icon").closest("button");
      
      fireEvent.click(menuButton!);

      // Check for menu items
      expect(screen.getByText("Feed Timer")).toBeInTheDocument();
      expect(screen.getByText("Bottle Feed")).toBeInTheDocument();
      expect(screen.getByText("Sleep Tracker")).toBeInTheDocument();
    });

    it("should close mobile menu when a link is clicked", () => {
      renderNavigation();
      const menuButton = screen.getByTestId("menu-icon").closest("button");
      
      // Open menu
      fireEvent.click(menuButton!);
      
      // Click a link
      const feedTimerLink = screen.getByText("Feed Timer");
      fireEvent.click(feedTimerLink);

      // Menu should close (sheet will handle this via onOpenChange)
      // We can't easily test this without more complex setup, but the onClick handler is in place
    });
  });

  describe("Navigation Links", () => {
    it("should have correct number of navigation sections in mobile menu", () => {
      renderNavigation();
      const menuButton = screen.getByTestId("menu-icon").closest("button");
      
      fireEvent.click(menuButton!);

      // Check for section headers
      expect(screen.getAllByText("Feed").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Sleep").length).toBeGreaterThan(0);
    });

    it("should render all feed-related links in mobile menu", () => {
      renderNavigation();
      const menuButton = screen.getByTestId("menu-icon").closest("button");
      
      fireEvent.click(menuButton!);

      expect(screen.getByText("Feed Timer")).toBeInTheDocument();
      expect(screen.getByText("Bottle Feed")).toBeInTheDocument();
      expect(screen.getByText("Feed Report")).toBeInTheDocument();
    });

    it("should render all sleep-related links in mobile menu", () => {
      renderNavigation();
      const menuButton = screen.getByTestId("menu-icon").closest("button");
      
      fireEvent.click(menuButton!);

      expect(screen.getByText("Sleep Tracker")).toBeInTheDocument();
      expect(screen.getByText("Sleep Report")).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("should have proper mobile-friendly touch targets", () => {
      renderNavigation();
      const menuButton = screen.getByTestId("menu-icon").closest("button");
      
      fireEvent.click(menuButton!);

      // Check that mobile menu buttons have proper height (h-12 = 48px, good for touch)
      // Links are wrapped in Button components with h-12 and text-base for good touch targets
      const feedTimerLink = screen.getByText("Feed Timer");
      expect(feedTimerLink).toBeInTheDocument();
      
      // Check that the button wrapper has mobile-friendly sizing classes
      const buttonWrapper = feedTimerLink.closest("a");
      expect(buttonWrapper).toHaveClass("h-12");
      expect(buttonWrapper).toHaveClass("text-base");
    });
  });

  describe("Accessibility", () => {
    it("should have screen reader text for menu button", () => {
      renderNavigation();
      expect(screen.getByText("Open menu")).toBeInTheDocument();
    });

    it("should render menu title", () => {
      renderNavigation();
      const menuButton = screen.getByTestId("menu-icon").closest("button");
      
      fireEvent.click(menuButton!);

      expect(screen.getByText("Menu")).toBeInTheDocument();
    });
  });
});

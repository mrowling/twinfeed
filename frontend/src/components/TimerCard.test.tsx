import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import TimerCard from "../components/TimerCard";
import type { Twin, Side } from "../types";
import { useRealtimeTimer } from "../hooks/useRealtimeTimer";

// Mock the useRealtimeTimer hook
vi.mock("../hooks/useRealtimeTimer", () => ({
  useRealtimeTimer: vi.fn(() => "05:30"),
}));

// Get typed mock
const mockUseRealtimeTimer = vi.mocked(useRealtimeTimer);

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Pause: () => <div data-testid="pause-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
}));

// Create a more robust localStorage mock
const createLocalStorageMock = () => {
  const storage: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }),
    length: 0,
    key: vi.fn(),
  };
};

let localStorageMock: ReturnType<typeof createLocalStorageMock>;

const renderTimerCard = (props = {}) => {
  const defaultProps = {
    twin: "A" as Twin,
    isRunning: false,
    currentSide: null as Side | null,
    suggestedSide: null as Side | null,
    onStart: vi.fn(),
    onPause: vi.fn(),
    onSave: vi.fn(),
    onReset: vi.fn(),
  };

  return render(
    <BrowserRouter>
      <TimerCard {...defaultProps} {...props} />
    </BrowserRouter>,
  );
};

describe("TimerCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    mockUseRealtimeTimer.mockReturnValue("05:30");
  });

  describe("Basic Rendering", () => {
    it("should render timer card with default twin name", () => {
      renderTimerCard({ twin: "A" });

      expect(screen.getByText("Twin A")).toBeInTheDocument();
      expect(screen.getByText("05:30")).toBeInTheDocument();
    });

    it("should render timer card with custom twin name from localStorage", () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "twinAName") return "Alice";
        return null;
      });

      renderTimerCard({ twin: "A" });

      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    it("should render twin B with default name", () => {
      renderTimerCard({ twin: "B" });

      expect(screen.getByText("Twin B")).toBeInTheDocument();
    });

    it("should render timer display", () => {
      renderTimerCard();

      expect(screen.getByText("05:30")).toBeInTheDocument();
    });
  });

  describe("Side Selection", () => {
    it("should render Left and Right side buttons", () => {
      renderTimerCard();

      expect(screen.getByText("Left")).toBeInTheDocument();
      expect(screen.getByText("Right")).toBeInTheDocument();
    });

    it("should highlight current side when selected", () => {
      renderTimerCard({ currentSide: "Left" });

      const leftButton = screen.getByText("Left");
      expect(leftButton).toHaveClass("bg-secondary"); // or appropriate variant class
    });

    it("should highlight suggested side with ring", () => {
      renderTimerCard({ suggestedSide: "Right", currentSide: null });

      const rightButton = screen.getByText("Right");
      expect(rightButton).toHaveClass("ring-2", "ring-blue-500");
    });

    it("should not highlight suggested side if it is current side", () => {
      renderTimerCard({ suggestedSide: "Left", currentSide: "Left" });

      const leftButton = screen.getByText("Left");
      expect(leftButton).not.toHaveClass("ring-2");
    });

    it("should call onStart when side button is clicked", () => {
      const onStart = vi.fn();
      renderTimerCard({ onStart });

      fireEvent.click(screen.getByText("Left"));

      expect(onStart).toHaveBeenCalledWith("Left");
    });

    it("should call onPause when current side is clicked while running", () => {
      const onPause = vi.fn();
      renderTimerCard({
        isRunning: true,
        currentSide: "Left",
        onPause,
      });

      fireEvent.click(screen.getByText("Left"));

      expect(onPause).toHaveBeenCalled();
    });
  });

  describe("Control Buttons", () => {
    it("should render pause, save, and reset buttons", () => {
      renderTimerCard({ currentSide: "Left" });

      expect(screen.getByTestId("pause-icon")).toBeInTheDocument();
      expect(screen.getByTestId("save-icon")).toBeInTheDocument();
      expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
    });

    it("should disable pause button when not running", () => {
      renderTimerCard({ isRunning: false });

      const pauseButton = screen.getByTestId("pause-icon").closest("button");
      expect(pauseButton).toBeDisabled();
    });

    it("should enable pause button when running", () => {
      renderTimerCard({ isRunning: true });

      const pauseButton = screen.getByTestId("pause-icon").closest("button");
      expect(pauseButton).not.toBeDisabled();
    });

    it("should disable save button when no current side", () => {
      renderTimerCard({ currentSide: null });

      const saveButton = screen.getByTestId("save-icon").closest("button");
      expect(saveButton).toBeDisabled();
    });

    it("should disable save button when timer shows 00:00:00", () => {
      mockUseRealtimeTimer.mockReturnValue("00:00:00");

      renderTimerCard({ currentSide: "Left" });

      const saveButton = screen.getByTestId("save-icon").closest("button");
      expect(saveButton).toBeDisabled();
    });

    it("should enable save button when has current side and duration", () => {
      renderTimerCard({ currentSide: "Left" });

      const saveButton = screen.getByTestId("save-icon").closest("button");
      expect(saveButton).not.toBeDisabled();
    });

    it("should call onPause and onSave when save button is clicked", () => {
      const onPause = vi.fn();
      const onSave = vi.fn();

      renderTimerCard({
        currentSide: "Left",
        isRunning: true,
        onPause,
        onSave,
      });

      const saveButton = screen.getByTestId("save-icon").closest("button");
      fireEvent.click(saveButton!);

      expect(onPause).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalled();
    });

    it("should disable reset button when timer is running", () => {
      renderTimerCard({ isRunning: true, currentSide: "Left" });

      const resetButton = screen.getByTestId("trash-icon").closest("button");
      expect(resetButton).toBeDisabled();
    });
  });

  describe("Reset Functionality", () => {
    it("should show confirmation message after first reset click", async () => {
      renderTimerCard({ currentSide: "Left" });

      const resetButton = screen.getByTestId("trash-icon").closest("button");
      fireEvent.click(resetButton!);

      await waitFor(() => {
        expect(
          screen.getByText("Click reset again to confirm"),
        ).toBeInTheDocument();
      });
    });

    it("should call onReset on second reset click", async () => {
      const onReset = vi.fn();
      renderTimerCard({ currentSide: "Left", onReset });

      const resetButton = screen.getByTestId("trash-icon").closest("button");

      // First click
      fireEvent.click(resetButton!);

      // Second click
      fireEvent.click(resetButton!);

      expect(onReset).toHaveBeenCalled();
    });

    it("should hide confirmation message after successful reset", async () => {
      const onReset = vi.fn();
      renderTimerCard({ currentSide: "Left", onReset });

      const resetButton = screen.getByTestId("trash-icon").closest("button");

      // First click
      fireEvent.click(resetButton!);

      await waitFor(() => {
        expect(
          screen.getByText("Click reset again to confirm"),
        ).toBeInTheDocument();
      });

      // Second click
      fireEvent.click(resetButton!);

      await waitFor(() => {
        expect(
          screen.queryByText("Click reset again to confirm"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Running State Display", () => {
    it("should show recording indicator when running", () => {
      renderTimerCard({
        isRunning: true,
        currentSide: "Left",
      });

      expect(screen.getByText("Recording...")).toBeInTheDocument();
    });

    it("should not show recording indicator when not running", () => {
      renderTimerCard({ isRunning: false });

      const recordingText = screen.queryByText("Recording...");
      expect(recordingText).toHaveClass("invisible");
    });

    it("should show feeding side badge when side is selected", () => {
      renderTimerCard({ currentSide: "Left" });

      expect(screen.getByText("Feeding on Left side")).toBeInTheDocument();
    });

    it("should hide feeding side badge when no side selected", () => {
      renderTimerCard({ currentSide: null });

      // When no side is selected, the badge is in an invisible container
      const invisibleElement = screen.getByText(
        "Feeding on Left side",
      ).parentElement;
      expect(invisibleElement).toHaveClass("invisible");
    });
  });

  describe("Timer Display Styling", () => {
    it("should highlight timer display when running", () => {
      renderTimerCard({ isRunning: true });

      const timerDisplay = screen.getByText("05:30");
      expect(timerDisplay).toHaveClass("text-primary");
    });

    it("should use normal styling when not running", () => {
      renderTimerCard({ isRunning: false });

      const timerDisplay = screen.getByText("05:30");
      expect(timerDisplay).toHaveClass("text-foreground");
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button labels", () => {
      renderTimerCard({ currentSide: "Left" });

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      // Check that buttons are clickable (not hidden)
      buttons.forEach((button) => {
        expect(button).toBeVisible();
      });
    });

    it("should have proper button states for screen readers", () => {
      renderTimerCard({ isRunning: false });

      const pauseButton = screen.getByTestId("pause-icon").closest("button");
      expect(pauseButton).toHaveAttribute("disabled");
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid button clicks gracefully", () => {
      const onStart = vi.fn();
      renderTimerCard({ onStart });

      const leftButton = screen.getByText("Left");

      // Rapid clicks
      fireEvent.click(leftButton);
      fireEvent.click(leftButton);
      fireEvent.click(leftButton);

      // Should still work normally
      expect(onStart).toHaveBeenCalledTimes(3);
    });

    it("should handle missing localStorage gracefully", () => {
      // Mock localStorage to return null instead of throwing
      localStorageMock.getItem.mockReturnValue(null);

      expect(() => {
        renderTimerCard({ twin: "A" });
      }).not.toThrow();

      expect(screen.getByText("Twin A")).toBeInTheDocument();
    });

    it("should handle null/undefined currentSide gracefully", () => {
      renderTimerCard({ currentSide: null });

      expect(screen.getByText("Left")).toBeInTheDocument();
      expect(screen.getByText("Right")).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BottlePage from "./BottlePage";
import { feedApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  feedApi: {
    createSession: vi.fn(),
  },
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: {
      twin_a_name: "Twin A",
      twin_b_name: "Twin B",
      twin_a_color: "#3b82f6",
      twin_b_color: "#22c55e",
      default_timer_interval: 15,
      theme: "system",
    },
    isLoading: false,
    error: null,
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
    refetch: vi.fn(),
  }),
}));

describe("BottlePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("alert", vi.fn());
    vi.mocked(feedApi.createSession).mockResolvedValue({
      id: 1,
      twin: "A",
      is_bottle: true,
      bottle_amount: 120,
      bottle_type: "formula",
      events: [],
      created_at: new Date().toISOString(),
    });
  });

  it("does not offer breastmilk or a bottle type selector", () => {
    render(<BottlePage />);
    expect(screen.queryByText("Breastmilk")).not.toBeInTheDocument();
    expect(screen.queryByText("Bottle Type")).not.toBeInTheDocument();
  });

  it("submits a bottle feed with bottle_type formula", async () => {
    render(<BottlePage />);
    const amountInput = screen.getByLabelText(/amount \(ml\)/i);
    fireEvent.change(amountInput, { target: { value: "120" } });
    fireEvent.click(
      screen.getByRole("button", { name: /record bottle feed/i }),
    );
    await waitFor(() => {
      expect(feedApi.createSession).toHaveBeenCalledTimes(1);
    });
    expect(feedApi.createSession).toHaveBeenCalledWith({
      twin: "A",
      is_bottle: true,
      bottle_amount: 120,
      bottle_type: "formula",
      events: [],
    });
  });
});

import "@testing-library/jest-dom/vitest"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LocationTypeahead, { clearLocationCache } from "../_components/LocationTypeahead";

function mockFetchSequence(responses: Array<{ delayMs: number; body: unknown[] }>) {
  let call = 0;
  global.fetch = vi.fn(() => {
    const { delayMs, body } = responses[call++];
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            ok: true,
            json: async () => body,
          } as Response),
        delayMs
      )
    );
  }) as unknown as typeof fetch;
}

describe("LocationTypeahead", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    clearLocationCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("ignores a slow first response that resolves after a faster second one", async () => {
    // The slow response must never overwrite the fast one.
    mockFetchSequence([
      { delayMs: 500, body: [{ place_id: 1, display_name: "Lekki Phase 1", lat: "6.45", lon: "3.47" }] },
      { delayMs: 50, body: [{ place_id: 2, display_name: "Lekki Phase 2", lat: "6.44", lon: "3.55" }] },
    ]);

    const user = userEvent.setup({ delay: null });
    render(<LocationTypeahead />);
    const input = screen.getByRole("combobox");

    await user.type(input, "Lek");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await user.type(input, "i2");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByText("Lekki Phase 2")).toBeInTheDocument();
    });
    expect(screen.queryByText("Lekki Phase 1")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation and selection", async () => {
    mockFetchSequence([
      {
        delayMs: 10,
        body: [
          { place_id: 1, display_name: "Ikoyi", lat: "6.45", lon: "3.43" },
          { place_id: 2, display_name: "Ikeja", lat: "6.6", lon: "3.35" },
        ],
      },
    ]);

    const user = userEvent.setup({ delay: null });
    render(<LocationTypeahead />);
    const input = screen.getByRole("combobox");

    await user.type(input, "Ik");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    await waitFor(() => expect(screen.getByText("Ikoyi")).toBeInTheDocument());

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(input).toHaveValue("Ikeja");
  });

  it("shows an error state when the request fails", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("network down"))) as unknown as typeof fetch;

    const user = userEvent.setup({ delay: null });
    render(<LocationTypeahead />);
    const input = screen.getByRole("combobox");

    await user.type(input, "Ik");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(screen.getByText(/couldn.t load results/i)).toBeInTheDocument();
    });
  });

  it("does not fetch below the minimum query length", async () => {
    global.fetch = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<LocationTypeahead />);
    const input = screen.getByRole("combobox");

    await user.type(input, "L");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
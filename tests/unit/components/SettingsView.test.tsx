import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsView } from "@/components/SettingsView";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@/stores/aiChat", () => ({
  useAiChatStore: vi.fn((selector) =>
    selector({ setAwsProfile: vi.fn() })
  ),
}));

import { invoke } from "@tauri-apps/api/core";
import { useAiChatStore } from "@/stores/aiChat";

describe("SettingsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === "load_preferences")
        return Promise.resolve({
          aws_profile: "my-profile",
          last_opened_folder: "/Users/me/docs",
        });
      if (cmd === "save_preferences") return Promise.resolve();
      return Promise.resolve();
    });
    (useAiChatStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (s: { setAwsProfile: ReturnType<typeof vi.fn> }) => unknown) =>
        selector({ setAwsProfile: vi.fn() })
    );
  });

  it("pre-populates AWS profile from load_preferences", async () => {
    render(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("my-profile")).toBeInTheDocument();
    });
  });

  it("persists valid value with full merged preferences", async () => {
    render(<SettingsView />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));

    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "new-profile" },
    });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("save_preferences", {
        preferences: {
          aws_profile: "new-profile",
          last_opened_folder: "/Users/me/docs",
        },
      });
    });
  });

  it("preserves last_opened_folder when updating aws_profile", async () => {
    render(<SettingsView />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));

    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "updated-profile" },
    });

    await waitFor(() => {
      const calls = (invoke as ReturnType<typeof vi.fn>).mock.calls;
      const saveCall = calls.find(([cmd]: [string]) => cmd === "save_preferences");
      expect(saveCall?.[1].preferences.last_opened_folder).toBe("/Users/me/docs");
    });
  });

  it("does not persist empty value", async () => {
    render(<SettingsView />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));

    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "" },
    });

    expect(invoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("does not persist value longer than 64 characters", async () => {
    render(<SettingsView />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));

    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "a".repeat(65) },
    });

    expect(invoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("does not persist value with invalid characters", async () => {
    render(<SettingsView />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));

    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "bad profile!" },
    });

    expect(invoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("does not persist before preferences are loaded", async () => {
    render(<SettingsView />);
    // Fire change BEFORE awaiting load_preferences resolution
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "early-input" },
    });
    // Wait for load to complete
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    // save_preferences should NOT have been called during the pre-load change
    expect(invoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });
});

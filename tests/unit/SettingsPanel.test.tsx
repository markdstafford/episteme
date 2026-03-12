import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useSettingsStore } from "@/stores/settings";
import { firstCategoryId } from "@/config/settings";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/stores/aiChat", () => ({
  useAiChatStore: vi.fn((selector) => selector({ setAwsProfile: vi.fn() })),
}));

import { invoke } from "@tauri-apps/api/core";
import { useAiChatStore } from "@/stores/aiChat";

describe("SettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ activeCategory: firstCategoryId() });
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === "load_preferences")
        return Promise.resolve({ aws_profile: "my-profile", last_opened_folder: "/docs" });
      if (cmd === "save_preferences") return Promise.resolve();
      return Promise.resolve();
    });
    (useAiChatStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (s: { setAwsProfile: ReturnType<typeof vi.fn> }) => unknown) =>
        selector({ setAwsProfile: vi.fn() })
    );
  });

  it("renders a section header for the active category", async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByText(/credentials/i)).toBeInTheDocument();
    });
  });

  it("pre-populates AWS profile from load_preferences", async () => {
    render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("my-profile")).toBeInTheDocument();
    });
  });

  it("persists valid value with full merged preferences", async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "new-profile" },
    });
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("save_preferences", {
        preferences: { aws_profile: "new-profile", last_opened_folder: "/docs" },
      });
    });
  });

  it("preserves last_opened_folder when updating aws_profile", async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "updated" },
    });
    await waitFor(() => {
      const calls = (invoke as ReturnType<typeof vi.fn>).mock.calls;
      const saveCall = calls.find(([cmd]: [string]) => cmd === "save_preferences");
      expect(saveCall?.[1].preferences.last_opened_folder).toBe("/docs");
    });
  });

  it("does not persist empty value", async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    fireEvent.change(screen.getByLabelText("AWS Profile"), { target: { value: "" } });
    expect(invoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("does not persist value longer than 64 characters", async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "a".repeat(65) },
    });
    expect(invoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("does not persist value with invalid characters", async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "bad profile!" },
    });
    expect(invoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("does not persist before preferences are loaded", async () => {
    render(<SettingsPanel />);
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "early-input" },
    });
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    expect(invoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("shows placeholder when active category has no settings", () => {
    useSettingsStore.setState({ activeCategory: "nonexistent" });
    render(<SettingsPanel />);
    expect(screen.getByText(/no settings yet/i)).toBeInTheDocument();
  });

  it("switches displayed content when activeCategory changes", async () => {
    render(<SettingsPanel />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    useSettingsStore.setState({ activeCategory: "nonexistent" });
    await waitFor(() => {
      expect(screen.queryByLabelText("AWS Profile")).not.toBeInTheDocument();
      expect(screen.getByText(/no settings yet/i)).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsDialog } from "@/components/SettingsDialog";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@/stores/aiChat", () => ({
  useAiChatStore: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { useAiChatStore } from "@/stores/aiChat";

const mockInvoke = invoke as ReturnType<typeof vi.fn>;
const mockUseAiChatStore = useAiChatStore as ReturnType<typeof vi.fn>;

describe("SettingsDialog", () => {
  const onClose = vi.fn();
  const mockSetAwsProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "load_preferences") return Promise.resolve({ aws_profile: "my-profile" });
      if (cmd === "save_preferences") return Promise.resolve();
      return Promise.resolve();
    });
    mockUseAiChatStore.mockImplementation((selector: (s: { setAwsProfile: typeof mockSetAwsProfile }) => unknown) =>
      selector({ setAwsProfile: mockSetAwsProfile })
    );
  });

  it("pre-populates AWS profile from load_preferences", async () => {
    render(<SettingsDialog onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("my-profile")).toBeInTheDocument();
    });
  });

  it("persists valid value change immediately", async () => {
    render(<SettingsDialog onClose={onClose} />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "new-profile" },
    });
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("save_preferences", {
        preferences: { aws_profile: "new-profile" },
      });
    });
  });

  it("does not persist empty value", async () => {
    render(<SettingsDialog onClose={onClose} />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    mockInvoke.mockClear();
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "" },
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("does not persist value longer than 64 characters", async () => {
    render(<SettingsDialog onClose={onClose} />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    mockInvoke.mockClear();
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "a".repeat(65) },
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("does not persist value with invalid characters", async () => {
    render(<SettingsDialog onClose={onClose} />);
    await waitFor(() => screen.getByDisplayValue("my-profile"));
    mockInvoke.mockClear();
    fireEvent.change(screen.getByLabelText("AWS Profile"), {
      target: { value: "bad profile!" },
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("save_preferences", expect.anything());
  });

  it("calls onClose when X button is clicked", async () => {
    render(<SettingsDialog onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close settings"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", async () => {
    render(<SettingsDialog onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", async () => {
    render(<SettingsDialog onClose={onClose} />);
    fireEvent.click(screen.getByTestId("settings-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});

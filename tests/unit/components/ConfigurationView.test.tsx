import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: function () {
    this.onmessage = null;
  },
}));

import { ConfigurationView } from "@/components/ConfigurationView";
import { useAiChatStore } from "@/stores/aiChat";

beforeEach(() => {
  vi.clearAllMocks();
  useAiChatStore.setState({
    authChecked: false,
    isAuthenticated: false,
    awsProfile: null,
    error: null,
    checkAuth: vi.fn() as unknown as () => Promise<void>,
    login: vi.fn() as unknown as () => Promise<void>,
    setAwsProfile: vi.fn() as unknown as (profile: string) => Promise<void>,
    clearAwsProfile: vi.fn() as unknown as () => Promise<void>,
  });
});

describe("ConfigurationView", () => {
  it("shows 'AI settings' header in every state", () => {
    render(<ConfigurationView />);
    expect(screen.getByText("AI settings")).toBeInTheDocument();
  });

  it("shows loading spinner when authChecked is false", () => {
    const { container } = render(<ConfigurationView />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows first-time setup form when not authenticated and no profile", () => {
    useAiChatStore.setState({ authChecked: true });
    render(<ConfigurationView />);
    expect(screen.getByText("Connect to AWS Bedrock")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g., ai-prod-llm")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("disables Connect button when profile input is empty", () => {
    useAiChatStore.setState({ authChecked: true });
    render(<ConfigurationView />);
    expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled();
  });

  it("shows re-authenticate prompt when not authenticated but has profile", () => {
    useAiChatStore.setState({ authChecked: true, awsProfile: "my-profile" });
    render(<ConfigurationView />);
    expect(screen.getByText("Session expired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-authenticate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change profile" })).toBeInTheDocument();
  });

  it("shows error message when error is set", () => {
    useAiChatStore.setState({ authChecked: true, error: "Something went wrong" });
    render(<ConfigurationView />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("calls setAwsProfile when Connect is clicked", async () => {
    const setAwsProfile = vi.fn().mockResolvedValue(undefined);
    const login = vi.fn().mockResolvedValue(undefined);
    useAiChatStore.setState({ authChecked: true, setAwsProfile, login });
    const { getByPlaceholderText, getByRole } = render(<ConfigurationView />);
    await userEvent.type(getByPlaceholderText("e.g., ai-prod-llm"), "my-profile");
    await userEvent.click(getByRole("button", { name: "Connect" }));
    expect(setAwsProfile).toHaveBeenCalledWith("my-profile");
  });

  it("calls setAwsProfile and login when Enter is pressed in the input", async () => {
    const setAwsProfile = vi.fn().mockResolvedValue(undefined);
    const login = vi.fn().mockResolvedValue(undefined);
    useAiChatStore.setState({ authChecked: true, setAwsProfile, login });
    const { getByPlaceholderText } = render(<ConfigurationView />);
    await userEvent.type(getByPlaceholderText("e.g., ai-prod-llm"), "my-profile{Enter}");
    expect(setAwsProfile).toHaveBeenCalledWith("my-profile");
  });

  it("skips login when already authenticated after setAwsProfile", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const setAwsProfile = vi.fn().mockImplementation(async () => {
      useAiChatStore.setState({ isAuthenticated: true });
    });
    useAiChatStore.setState({ authChecked: true, setAwsProfile, login });
    const { getByPlaceholderText, getByRole } = render(<ConfigurationView />);
    await userEvent.type(getByPlaceholderText("e.g., ai-prod-llm"), "my-profile");
    await userEvent.click(getByRole("button", { name: "Connect" }));
    expect(setAwsProfile).toHaveBeenCalledWith("my-profile");
    expect(login).not.toHaveBeenCalled();
  });

  it("calls login when Re-authenticate is clicked", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAiChatStore.setState({ authChecked: true, awsProfile: "my-profile", login });
    const { getByRole } = render(<ConfigurationView />);
    await userEvent.click(getByRole("button", { name: "Re-authenticate" }));
    expect(login).toHaveBeenCalled();
  });

  it("calls clearAwsProfile when Change profile is clicked", async () => {
    const clearAwsProfile = vi.fn().mockResolvedValue(undefined);
    useAiChatStore.setState({
      authChecked: true,
      awsProfile: "my-profile",
      clearAwsProfile,
    });
    const { getByRole } = render(<ConfigurationView />);
    await userEvent.click(getByRole("button", { name: "Change profile" }));
    expect(clearAwsProfile).toHaveBeenCalledTimes(1);
  });
});

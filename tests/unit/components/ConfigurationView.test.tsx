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
  });
});

describe("ConfigurationView", () => {
  it("shows 'AI settings' header when auth is checking", () => {
    render(<ConfigurationView />);
    expect(screen.getByText("AI settings")).toBeInTheDocument();
  });

  it("shows 'AI settings' header when not authenticated without profile", () => {
    useAiChatStore.setState({ authChecked: true });
    render(<ConfigurationView />);
    expect(screen.getByText("AI settings")).toBeInTheDocument();
  });

  it("shows 'AI settings' header when credentials have expired", () => {
    useAiChatStore.setState({ authChecked: true, awsProfile: "my-profile" });
    render(<ConfigurationView />);
    expect(screen.getByText("AI settings")).toBeInTheDocument();
  });

  it("renders no action buttons in the header", () => {
    render(<ConfigurationView />);
    const header = screen.getByRole("banner");
    expect(header.querySelectorAll("button")).toHaveLength(0);
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

  it("calls setAwsProfile then login when Connect is clicked", async () => {
    const setAwsProfile = vi.fn().mockResolvedValue(undefined);
    const login = vi.fn().mockResolvedValue(undefined);
    useAiChatStore.setState({ authChecked: true, setAwsProfile, login });
    const { getByPlaceholderText, getByRole } = render(<ConfigurationView />);
    await userEvent.type(getByPlaceholderText("e.g., ai-prod-llm"), "my-profile");
    await userEvent.click(getByRole("button", { name: "Connect" }));
    expect(setAwsProfile).toHaveBeenCalledWith("my-profile");
    expect(login).toHaveBeenCalled();
  });

  it("calls login when Re-authenticate is clicked", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAiChatStore.setState({ authChecked: true, awsProfile: "my-profile", login });
    const { getByRole } = render(<ConfigurationView />);
    await userEvent.click(getByRole("button", { name: "Re-authenticate" }));
    expect(login).toHaveBeenCalled();
  });

  it("resets awsProfile when Change profile is clicked", async () => {
    useAiChatStore.setState({ authChecked: true, awsProfile: "my-profile" });
    const { getByRole } = render(<ConfigurationView />);
    await userEvent.click(getByRole("button", { name: "Change profile" }));
    expect(useAiChatStore.getState().awsProfile).toBeNull();
  });
});

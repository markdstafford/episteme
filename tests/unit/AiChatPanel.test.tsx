import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: function () {
    this.onmessage = null;
  },
}));

import { AiChatPanel } from "@/components/AiChatPanel";
import { useAiChatStore } from "@/stores/aiChat";

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  useAiChatStore.setState({
    messages: [],
    isStreaming: false,
    streamingContent: "",
    isAuthenticated: false,
    authChecked: false,
    awsProfile: null,
    currentSession: null,
    sessions: [],
    error: null,
    checkAuth: vi.fn() as unknown as () => Promise<void>,
    login: vi.fn() as unknown as () => Promise<void>,
    setAwsProfile: vi.fn() as unknown as (profile: string) => Promise<void>,
    clearAwsProfile: vi.fn() as unknown as () => Promise<void>,
    sendMessage: vi.fn() as unknown as (content: string) => Promise<void>,
    newSession: vi.fn() as unknown as () => void,
    resumeSession: vi.fn() as unknown as (id: string) => void,
  });
});

describe("AiChatPanel routing", () => {
  it("renders ConfigurationView when authChecked is false", () => {
    render(<AiChatPanel />);
    expect(screen.getByText("AI settings")).toBeInTheDocument();
  });

  it("renders ConfigurationView when not authenticated", () => {
    useAiChatStore.setState({ authChecked: true, isAuthenticated: false });
    render(<AiChatPanel />);
    expect(screen.getByText("AI settings")).toBeInTheDocument();
  });

  it("renders ChatView when authenticated", () => {
    useAiChatStore.setState({ authChecked: true, isAuthenticated: true });
    render(<AiChatPanel />);
    expect(screen.getByText("AI assistant")).toBeInTheDocument();
  });

  it("renders ConfigurationView when credentials expire while in history view", () => {
    useAiChatStore.setState({ authChecked: true, isAuthenticated: true });
    const { rerender } = render(<AiChatPanel />);
    useAiChatStore.setState({ isAuthenticated: false });
    rerender(<AiChatPanel />);
    expect(screen.getByText("AI settings")).toBeInTheDocument();
  });
});

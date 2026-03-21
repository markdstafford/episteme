import { render, screen, fireEvent, act } from "@testing-library/react";
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

  it("renders ConfigurationView when credentials expire while in history view", async () => {
    useAiChatStore.setState({ authChecked: true, isAuthenticated: true });
    render(<AiChatPanel />);
    // Navigate to history view
    fireEvent.click(screen.getByLabelText("Session history"));
    // Credentials expire
    act(() => {
      useAiChatStore.setState({ isAuthenticated: false });
    });
    // ConfigurationView should take precedence
    expect(screen.getByText("AI settings")).toBeInTheDocument();
  });

  it("renders SessionHistoryView when navigating to history", async () => {
    useAiChatStore.setState({ authChecked: true, isAuthenticated: true });
    render(<AiChatPanel />);
    fireEvent.click(screen.getByLabelText("Session history"));
    expect(screen.getByText("Conversation history")).toBeInTheDocument();
  });
});

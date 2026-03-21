import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: function () {
    this.onmessage = null;
  },
}));

import { ChatView } from "@/components/ChatView";
import { useAiChatStore } from "@/stores/aiChat";
import type { Session } from "@/lib/session";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: crypto.randomUUID(),
    name: "",
    last_mode: "view",
    last_active_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    scope: { type: "workspace" },
    messages_all: [],
    messages_compacted: [],
    pinned: false,
    ...overrides,
  };
}

const onShowHistory = vi.fn();
const onNewSession = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  useAiChatStore.setState({
    currentSession: null,
    sessions: [],
    messages: [],
    isStreaming: false,
    streamingContent: "",
    error: null,
    sendMessage: vi.fn() as unknown as (content: string) => Promise<void>,
    newSession: vi.fn() as unknown as () => void,
  });
});

describe("ChatView", () => {
  describe("Header", () => {
    it("shows 'AI assistant' fallback when session has no name", () => {
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      expect(screen.getByText("AI assistant")).toBeInTheDocument();
    });

    it("shows session name when currentSession has a name", () => {
      useAiChatStore.setState({
        currentSession: makeSession({ id: "s1", name: "My session" }),
      });
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      expect(screen.getByText("My session")).toBeInTheDocument();
    });

    it("calls onShowHistory when Clock button is clicked", async () => {
      const { getByLabelText } = render(
        <ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />
      );
      getByLabelText("Session history").click();
      expect(onShowHistory).toHaveBeenCalledOnce();
    });

    it("calls onNewSession when Plus button is clicked", async () => {
      const { getByLabelText } = render(
        <ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />
      );
      getByLabelText("New conversation").click();
      expect(onNewSession).toHaveBeenCalledOnce();
    });
  });

  it("renders the chat input card", () => {
    render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
    expect(screen.getByPlaceholderText("Ask a question...")).toBeInTheDocument();
  });

  describe("Empty state", () => {
    it("shows suggested prompts when no messages", () => {
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      expect(screen.getByText("Summarize this document")).toBeInTheDocument();
      expect(screen.getByText("What documents relate to this one?")).toBeInTheDocument();
      expect(screen.getByText("What context do I need to understand this?")).toBeInTheDocument();
    });

    it("shows suggested prompts as clickable buttons", () => {
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      expect(screen.getByText("Summarize this document").tagName).toBe("BUTTON");
    });

    it("calls sendMessage when a suggested prompt is clicked", async () => {
      const sendMessage = vi.fn() as unknown as (content: string) => Promise<void>;
      useAiChatStore.setState({ sendMessage });
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      screen.getByText("Summarize this document").click();
      expect(sendMessage).toHaveBeenCalledWith("Summarize this document");
    });
  });

  describe("With messages", () => {
    beforeEach(() => {
      useAiChatStore.setState({
        messages: [
          { role: "user", content: "Hello there" },
          { role: "assistant", content: "Hi! How can I help?" },
        ],
      });
    });

    it("renders messages", () => {
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      expect(screen.getByText("Hello there")).toBeInTheDocument();
      expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
    });
  });
});

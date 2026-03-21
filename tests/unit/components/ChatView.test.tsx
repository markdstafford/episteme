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
        currentSession: {
          id: "s1",
          name: "My session",
          last_mode: "view",
          last_active_at: new Date().toISOString(),
          scope: { type: "workspace" },
          messages_all: [],
        },
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

    it("shows chat input", () => {
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      expect(screen.getByPlaceholderText("Ask a question...")).toBeInTheDocument();
    });
  });
});

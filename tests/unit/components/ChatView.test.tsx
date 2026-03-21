import { render, screen, fireEvent } from "@testing-library/react";
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

  describe("Header rename popover", () => {
    beforeEach(() => {
      useAiChatStore.setState({
        currentSession: makeSession({ id: "s1", name: "My session", messages_compacted: [
          { role: "user" as const, content: [{ type: "text" as const, text: "hi" }] }
        ]}),
        renameSession: vi.fn().mockResolvedValue(undefined) as unknown as (id: string, name: string) => Promise<void>,
        suggestSessionName: vi.fn().mockResolvedValue("AI suggested name") as unknown as (sessionId: string) => Promise<string>,
      });
    });

    it("shows pencil button in header", () => {
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      expect(screen.getByLabelText("Rename session")).toBeInTheDocument();
    });

    it("opens rename popover when pencil clicked", () => {
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      fireEvent.click(screen.getByLabelText("Rename session"));
      expect(screen.getByDisplayValue("My session")).toBeInTheDocument();
    });

    it("calls renameSession on Enter when name changed", async () => {
      const renameSession = vi.fn().mockResolvedValue(undefined) as unknown as (id: string, name: string) => Promise<void>;
      useAiChatStore.setState({ renameSession });
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      fireEvent.click(screen.getByLabelText("Rename session"));
      const input = screen.getByDisplayValue("My session");
      fireEvent.change(input, { target: { value: "Better name" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(renameSession).toHaveBeenCalledWith("s1", "Better name");
    });

    it("does not call renameSession on Enter when name is unchanged", () => {
      const renameSession = vi.fn().mockResolvedValue(undefined) as unknown as (id: string, name: string) => Promise<void>;
      useAiChatStore.setState({ renameSession });
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      fireEvent.click(screen.getByLabelText("Rename session"));
      fireEvent.keyDown(screen.getByDisplayValue("My session"), { key: "Enter" });
      expect(renameSession).not.toHaveBeenCalled();
    });

    it("discards on blur without calling renameSession", () => {
      const renameSession = vi.fn().mockResolvedValue(undefined) as unknown as (id: string, name: string) => Promise<void>;
      useAiChatStore.setState({ renameSession });
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      fireEvent.click(screen.getByLabelText("Rename session"));
      const input = screen.getByDisplayValue("My session");
      fireEvent.change(input, { target: { value: "Changed but discarded" } });
      fireEvent.blur(input);
      expect(renameSession).not.toHaveBeenCalled();
    });

    it("does not call renameSession on Esc", () => {
      const renameSession = vi.fn().mockResolvedValue(undefined) as unknown as (id: string, name: string) => Promise<void>;
      useAiChatStore.setState({ renameSession });
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      fireEvent.click(screen.getByLabelText("Rename session"));
      fireEvent.keyDown(screen.getByDisplayValue("My session"), { key: "Escape" });
      expect(renameSession).not.toHaveBeenCalled();
    });

    it("calls suggestSessionName, disables input during loading, and populates field on resolution", async () => {
      let resolveSuggestion!: (name: string) => void;
      const suggestionPromise = new Promise<string>((resolve) => { resolveSuggestion = resolve; });
      const suggestSessionName = vi.fn().mockReturnValue(suggestionPromise) as unknown as (sessionId: string) => Promise<string>;
      useAiChatStore.setState({ suggestSessionName });

      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      fireEvent.click(screen.getByLabelText("Rename session"));

      // Click the sparkle button
      fireEvent.click(screen.getByTestId("header-suggest-btn"));
      expect(suggestSessionName).toHaveBeenCalledWith("s1");

      // Input should be disabled while suggestion is loading
      const input = screen.getByRole("textbox", { name: "Session name" });
      expect(input).toBeDisabled();

      // Resolve the suggestion
      resolveSuggestion("Suggested Session Name");
      await screen.findByDisplayValue("Suggested Session Name");

      // Input should be re-enabled
      expect(input).not.toBeDisabled();
    });

    it("disables sparkle when session has no messages", () => {
      useAiChatStore.setState({
        currentSession: makeSession({ id: "s1", name: "My session", messages_compacted: [] }),
        renameSession: vi.fn() as unknown as (id: string, name: string) => Promise<void>,
        suggestSessionName: vi.fn() as unknown as (sessionId: string) => Promise<string>,
      });
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      fireEvent.click(screen.getByLabelText("Rename session"));
      expect(screen.getByTestId("header-suggest-btn")).toBeDisabled();
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

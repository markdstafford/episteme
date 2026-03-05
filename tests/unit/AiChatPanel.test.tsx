import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Tauri API before importing components
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
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
  useAiChatStore.setState({
    messages: [],
    isStreaming: false,
    streamingContent: "",
    isAuthenticated: false,
    authChecked: false,
    awsProfile: null,
    error: null,
    // Override checkAuth so the useEffect on mount does not change state
    checkAuth: vi.fn() as unknown as () => Promise<void>,
  });
});

describe("AiChatPanel", () => {
  describe("Auth checking state", () => {
    it("shows loading spinner when authChecked is false", () => {
      const { container } = render(<AiChatPanel onClose={vi.fn()} />);
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Not authenticated, no profile", () => {
    beforeEach(() => {
      useAiChatStore.setState({
        authChecked: true,
        isAuthenticated: false,
        awsProfile: null,
      });
    });

    it("shows 'Connect to AWS Bedrock' text", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(screen.getByText("Connect to AWS Bedrock")).toBeInTheDocument();
    });

    it("shows profile input field with placeholder", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(
        screen.getByPlaceholderText("e.g., ai-prod-llm"),
      ).toBeInTheDocument();
    });

    it("shows 'Connect' button", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: "Connect" }),
      ).toBeInTheDocument();
    });
  });

  describe("Not authenticated, has profile", () => {
    beforeEach(() => {
      useAiChatStore.setState({
        authChecked: true,
        isAuthenticated: false,
        awsProfile: "my-profile",
      });
    });

    it("shows 'Session expired' text", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(screen.getByText("Session expired")).toBeInTheDocument();
    });

    it("shows 'Re-authenticate' button", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: "Re-authenticate" }),
      ).toBeInTheDocument();
    });

    it("shows 'Change profile' link", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: "Change profile" }),
      ).toBeInTheDocument();
    });
  });

  describe("Authenticated empty state", () => {
    beforeEach(() => {
      useAiChatStore.setState({
        authChecked: true,
        isAuthenticated: true,
        messages: [],
      });
    });

    it("shows suggested prompts", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(
        screen.getByText("Summarize this document"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("What documents relate to this one?"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("What context do I need to understand this?"),
      ).toBeInTheDocument();
    });

    it("shows 'Summarize this document' as a clickable button", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      const button = screen.getByText("Summarize this document");
      expect(button.tagName).toBe("BUTTON");
    });
  });

  describe("Authenticated with messages", () => {
    beforeEach(() => {
      useAiChatStore.setState({
        authChecked: true,
        isAuthenticated: true,
        messages: [
          { role: "user", content: "Hello there" },
          { role: "assistant", content: "Hi! How can I help?" },
        ],
      });
    });

    it("renders messages", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(screen.getByText("Hello there")).toBeInTheDocument();
      expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
    });

    it("shows input textarea", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(
        screen.getByPlaceholderText("Ask a question..."),
      ).toBeInTheDocument();
    });

    it("shows send button", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(screen.getByTitle("Send")).toBeInTheDocument();
    });
  });

  describe("Header", () => {
    beforeEach(() => {
      useAiChatStore.setState({ authChecked: true });
    });

    it("shows 'AI Assistant' text", () => {
      render(<AiChatPanel onClose={vi.fn()} />);
      expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    });

    it("close button calls onClose", () => {
      const onClose = vi.fn();
      render(<AiChatPanel onClose={onClose} />);
      const closeButton = screen.getByTitle("Close");
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

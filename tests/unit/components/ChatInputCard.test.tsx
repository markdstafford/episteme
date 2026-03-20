import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ChatInputCard } from "@/components/ChatInputCard";

function makePanelRef() {
  const ref = { current: document.createElement("div") };
  Object.defineProperty(ref.current, "offsetHeight", { value: 600 });
  return ref;
}

describe("ChatInputCard", () => {
  describe("Keyboard behavior", () => {
    it("Enter calls onSend", () => {
      const onSend = vi.fn();
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={onSend}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      const textarea = screen.getByPlaceholderText("Ask a question...");
      fireEvent.keyDown(textarea, { key: "Enter" });
      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it("Cmd+Enter calls onSend", () => {
      const onSend = vi.fn();
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={onSend}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      const textarea = screen.getByPlaceholderText("Ask a question...");
      fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });
      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it("Ctrl+Enter calls onSend", () => {
      const onSend = vi.fn();
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={onSend}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      const textarea = screen.getByPlaceholderText("Ask a question...");
      fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it("Shift+Enter does not call onSend", () => {
      const onSend = vi.fn();
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={onSend}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      const textarea = screen.getByPlaceholderText("Ask a question...");
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe("Send button disabled states", () => {
    it("send button is disabled when value is empty", () => {
      render(
        <ChatInputCard
          value=""
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });

    it("send button is disabled when isStreaming is true", () => {
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={true}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });

    it("send button is enabled when value is non-empty and not streaming", () => {
      render(
        <ChatInputCard
          value="hello"
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.getByRole("button", { name: /send/i })).not.toBeDisabled();
    });
  });

  describe("modeButton render prop", () => {
    it("renders modeButton in the toolbar when provided", () => {
      render(
        <ChatInputCard
          value=""
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={false}
          modeButton={<button>Mode</button>}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.getByRole("button", { name: "Mode" })).toBeInTheDocument();
    });

    it("renders nothing in mode slot when modeButton is not provided", () => {
      render(
        <ChatInputCard
          value=""
          onChange={vi.fn()}
          onSend={vi.fn()}
          isStreaming={false}
          panelRef={makePanelRef()}
        />
      );
      expect(screen.queryByRole("button", { name: "Mode" })).not.toBeInTheDocument();
    });
  });
});

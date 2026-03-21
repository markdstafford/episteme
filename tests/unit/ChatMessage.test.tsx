import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ChatMessage } from "@/components/ChatMessage";

describe("ChatMessage", () => {
  it("renders user message content", () => {
    render(
      <ChatMessage
        message={{ role: "user", content: "Hello from user" }}
      />
    );
    expect(screen.getByText("Hello from user")).toBeInTheDocument();
  });

  it("renders assistant message content", () => {
    render(
      <ChatMessage
        message={{ role: "assistant", content: "Hello from assistant" }}
      />
    );
    expect(screen.getByText("Hello from assistant")).toBeInTheDocument();
  });

  it("user messages have right-aligned container", () => {
    const { container } = render(
      <ChatMessage
        message={{ role: "user", content: "User msg" }}
      />
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("justify-end");
  });

  it("assistant messages have left-aligned container", () => {
    const { container } = render(
      <ChatMessage
        message={{ role: "assistant", content: "Assistant msg" }}
      />
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("justify-start");
  });

  it("user messages have accent background", () => {
    render(
      <ChatMessage
        message={{ role: "user", content: "Blue user msg" }}
      />
    );
    const msgEl = screen.getByText("Blue user msg").closest("div.max-w-\\[85\\%\\]") ||
      screen.getByText("Blue user msg").parentElement;
    expect(msgEl?.className).toContain("bg-(--color-accent)");
  });

  it("assistant messages have subtle background", () => {
    render(
      <ChatMessage
        message={{ role: "assistant", content: "Gray assistant msg" }}
      />
    );
    const msgEl = screen.getByText("Gray assistant msg").closest("div.max-w-\\[85\\%\\]") ||
      screen.getByText("Gray assistant msg").parentElement;
    expect(msgEl?.className).toContain("bg-(--color-bg-subtle)");
  });
});

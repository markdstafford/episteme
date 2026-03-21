# Migrate AI Chat Components to Design System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all hardcoded Tailwind color, typography, spacing, and radius classes across the five AI chat components with design system token references.

**Architecture:** Visual-only migration — no behavior, logic, or test changes. Each task is a single component file. All tasks are independent and can be done in any order. The design tokens are CSS custom properties defined in `src/app.css` and referenced via Tailwind's arbitrary value syntax (e.g. `bg-[--color-bg-base]`).

**Tech Stack:** React, TypeScript, Tailwind CSS v4 (custom properties via `@theme {}`), Vitest

---

## Reference

Design tokens available (defined in `src/app.css`):

**Colors** — use as `bg-[--token]`, `text-[--token]`, `border-[--token]`
- Backgrounds: `--color-bg-base`, `--color-bg-subtle`, `--color-bg-elevated`, `--color-bg-hover`
- Text: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-quaternary`
- Text on fills: `--color-text-on-accent`
- Borders: `--color-border-subtle`, `--color-border-default`, `--color-border-strong`
- Accent: `--color-accent`, `--color-accent-hover`
- State: `--color-state-danger`

**Typography** — use as `text-[--token]`
- `--font-size-ui-xs` (11px) — badges, timestamps
- `--font-size-ui-sm` (12px) — secondary labels
- `--font-size-ui-base` (13px) — controls, inputs, body
- `--font-size-ui-md` (14px) — section headers, emphasized labels

**Radius** — use as `rounded-[--token]`
- `--radius-sm` (3px) — badges
- `--radius-base` (4px) — buttons, inputs
- `--radius-md` (6px) — cards, message bubbles
- `--radius-xl` (12px) — large containers (ChatInputCard)

**Motion** — use as `duration-[--token]`
- `--duration-fast` (100ms) — hover states

**Icon-only button sizing:** Use `size-7` (28×28px = `--height-control-base`) + `flex items-center justify-center`

**Input focus pattern** (replaces `focus:ring-2 focus:ring-blue-500`):
```
focus:outline-none focus:border-[--color-accent] focus:shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-accent)_25%,transparent)]
```

**Container focus-within pattern** (for `ChatInputCard`):
```
focus-within:border-[--color-accent] focus-within:shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-accent)_25%,transparent)]
```

---

## Task 1: Migrate `ChatMessage`

**Files:**
- Modify: `src/components/ChatMessage.tsx`

**Step 1: Apply token changes**

Replace the entire file:

```tsx
import { ChatMessage as ChatMessageType } from "@/stores/aiChat";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] px-4 py-2 rounded-[--radius-md] ${
          isUser
            ? "bg-[--color-accent] text-[--color-text-on-accent]"
            : "bg-[--color-bg-subtle] text-[--color-text-primary]"
        }`}
      >
        {isUser ? (
          <p className="text-[--font-size-ui-base] whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Run tests**

```bash
npm test
```

Expected: 479 tests pass, 0 failures. If any test checks for `bg-blue-600` or `bg-gray-100` classnames directly, update those assertions to match the new token classes.

**Step 3: Commit**

```bash
git add src/components/ChatMessage.tsx
git commit -m "style: migrate ChatMessage to design system tokens"
```

---

## Task 2: Migrate `ChatInputCard`

**Files:**
- Modify: `src/components/ChatInputCard.tsx`

**Step 1: Apply token changes**

Replace the entire file:

```tsx
import { useRef, useEffect, ReactNode, RefObject } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputCardProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  modeButton?: ReactNode;
  panelRef: RefObject<HTMLDivElement | null>;
}

export function ChatInputCard({
  value,
  onChange,
  onSend,
  isStreaming,
  modeButton,
  panelRef,
}: ChatInputCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    const panel = panelRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = panel ? panel.offsetHeight * 0.5 : 9999;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
  }, [value]);

  const canSend = value.trim().length > 0 && !isStreaming;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && canSend) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="rounded-[--radius-xl] border border-[--color-border-default] focus-within:border-[--color-accent] focus-within:shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-accent)_25%,transparent)]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question..."
        rows={1}
        disabled={isStreaming}
        className="w-full resize-none bg-transparent border-none outline-none px-3 pt-3 text-[--font-size-ui-base] text-[--color-text-primary] placeholder-[--color-text-tertiary] overflow-y-auto disabled:opacity-50"
      />
      <div className="flex items-center justify-between px-2 py-1.5 border-t border-[--color-border-default]">
        <div>{modeButton}</div>
        <button
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className="bg-[--color-accent] hover:bg-[--color-accent-hover] text-[--color-text-on-accent] rounded-[--radius-base] p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Run tests**

```bash
npm test
```

Expected: 479 tests pass.

**Step 3: Commit**

```bash
git add src/components/ChatInputCard.tsx
git commit -m "style: migrate ChatInputCard to design system tokens"
```

---

## Task 3: Migrate `SessionHistoryView`

**Files:**
- Modify: `src/components/SessionHistoryView.tsx`

**Step 1: Apply token changes**

Replace the entire file:

```tsx
import { ArrowLeft, Plus } from "lucide-react";
import { type Session, type SessionScope } from "@/lib/session";

interface SessionHistoryViewProps {
  sessions: Session[];
  currentSessionId: string | null;
  currentScope: SessionScope;
  onResume: (id: string) => void;
  onNewSession: () => void;
  onBack: () => void;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateStart.getTime() === todayStart.getTime()) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;
    return `Today, ${displayHours}:${minutes}${period}`;
  }
  if (dateStart.getTime() === yesterdayStart.getTime()) {
    return "Yesterday";
  }
  return date.toLocaleDateString();
}

function matchesScope(session: Session, scope: SessionScope): boolean {
  if (session.scope.type !== scope.type) return false;
  if (scope.type === "document" && session.scope.type === "document") {
    return session.scope.path === scope.path;
  }
  return true;
}

export function SessionHistoryView({
  sessions,
  currentSessionId,
  currentScope,
  onResume,
  onNewSession,
  onBack,
}: SessionHistoryViewProps) {
  const filtered = sessions
    .filter((s) => matchesScope(s, currentScope))
    .sort((a, b) => (b.last_active_at > a.last_active_at ? 1 : -1));

  return (
    <div className="w-96 flex flex-col h-full border-l border-[--color-border-default] bg-[--color-bg-base]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--color-border-default] flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            aria-label="Back"
            className="size-7 flex items-center justify-center hover:bg-[--color-bg-hover] rounded-[--radius-base]"
          >
            <ArrowLeft className="w-4 h-4 text-[--color-text-tertiary]" />
          </button>
          <span className="text-[--font-size-ui-md] font-medium text-[--color-text-primary]">
            Conversation history
          </span>
        </div>
        <button
          onClick={onNewSession}
          aria-label="New conversation"
          className="size-7 flex items-center justify-center hover:bg-[--color-bg-hover] rounded-[--radius-base]"
        >
          <Plus className="w-4 h-4 text-[--color-text-tertiary]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <p className="text-[--font-size-ui-base] text-[--color-text-tertiary]">
              No conversations yet
            </p>
            <button
              onClick={onNewSession}
              className="px-3 py-1.5 text-[--font-size-ui-base] text-[--color-accent] border border-[--color-border-default] rounded-[--radius-base] hover:bg-[--color-bg-hover] transition-colors duration-[--duration-fast]"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <ul>
            {filtered.map((session) => {
              const isCurrent = session.id === currentSessionId;
              return (
                <li
                  key={session.id}
                  data-testid={`session-row-${session.id}`}
                  data-current={isCurrent ? "true" : undefined}
                  role="button"
                  tabIndex={0}
                  onClick={() => onResume(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onResume(session.id);
                    }
                  }}
                  className="flex items-stretch cursor-pointer hover:bg-[--color-bg-hover] border-b border-[--color-border-subtle]"
                >
                  {/* Accent left border for current session */}
                  <div
                    style={{
                      width: 3,
                      flexShrink: 0,
                      backgroundColor: isCurrent ? "var(--color-accent)" : "transparent",
                    }}
                  />
                  <div className="flex-1 px-3 py-3 min-w-0">
                    <p className="text-[--font-size-ui-base] font-medium text-[--color-text-primary] truncate">
                      {session.name || "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[--font-size-ui-xs] px-1.5 py-0.5 rounded-[--radius-sm] bg-[--color-bg-hover] text-[--color-text-secondary]">
                        {session.last_mode}
                      </span>
                      <span className="text-[--font-size-ui-xs] text-[--color-text-quaternary]">
                        {formatRelativeTime(session.last_active_at)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Run tests**

```bash
npm test
```

Expected: 479 tests pass.

**Step 3: Commit**

```bash
git add src/components/SessionHistoryView.tsx
git commit -m "style: migrate SessionHistoryView to design system tokens"
```

---

## Task 4: Migrate `ChatView`

**Files:**
- Modify: `src/components/ChatView.tsx`

**Step 1: Apply token changes**

Replace the entire file:

```tsx
import { useState, useRef, useEffect } from "react";
import { useAiChatStore } from "@/stores/aiChat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInputCard } from "@/components/ChatInputCard";
import { MessageSquare, Clock, Plus } from "lucide-react";

interface ChatViewProps {
  onShowHistory: () => void;
  onNewSession: () => void;
}

export function ChatView({ onShowHistory, onNewSession }: ChatViewProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    currentSession,
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
  } = useAiChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  const renderBody = () => {
    // Empty state: no messages and not streaming
    if (messages.length === 0 && !isStreaming) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-[--font-size-ui-base] text-[--color-text-tertiary]">
            Ask me about this document or your repository
          </p>
          <div className="flex flex-col gap-2 w-full">
            {[
              "Summarize this document",
              "What documents relate to this one?",
              "What context do I need to understand this?",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="w-full px-3 py-2 text-[--font-size-ui-base] text-left text-[--color-text-secondary] bg-[--color-bg-subtle] hover:bg-[--color-bg-hover] rounded-[--radius-base] transition-colors duration-[--duration-fast]"
              >
                {prompt}
              </button>
            ))}
          </div>
          {error && (
            <p className="text-[--font-size-ui-base] text-[--color-state-danger] mt-2">
              {error}
            </p>
          )}
        </div>
      );
    }

    // Has messages (and possibly streaming)
    return (
      <>
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {isStreaming && streamingContent && (
          <ChatMessage
            message={{ role: "assistant", content: streamingContent }}
          />
        )}
        {isStreaming && !streamingContent && (
          <div className="flex justify-start mb-3">
            <span className="inline-block w-2 h-2 bg-[--color-text-tertiary] rounded-full animate-pulse" />
          </div>
        )}
        {error && (
          <p className="text-[--font-size-ui-base] text-[--color-state-danger] mt-2">
            {error}
          </p>
        )}
        <div ref={messagesEndRef} />
      </>
    );
  };

  return (
    <div
      ref={panelRef}
      className="w-96 flex flex-col h-full border-l border-[--color-border-default] bg-[--color-bg-base]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--color-border-default] flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[--color-text-tertiary]" />
          <span className="text-[--font-size-ui-md] font-medium text-[--color-text-primary]">
            {currentSession?.name || "AI assistant"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onShowHistory}
            className="size-7 flex items-center justify-center hover:bg-[--color-bg-hover] rounded-[--radius-base]"
            title="Session history"
            aria-label="Session history"
          >
            <Clock className="w-4 h-4 text-[--color-text-tertiary]" />
          </button>
          <button
            onClick={onNewSession}
            className="size-7 flex items-center justify-center hover:bg-[--color-bg-hover] rounded-[--radius-base]"
            title="New conversation"
            aria-label="New conversation"
          >
            <Plus className="w-4 h-4 text-[--color-text-tertiary]" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Messages pane */}
        <div className="flex-1 overflow-y-auto p-4">{renderBody()}</div>

        {/* Input — always rendered in ChatView; disabled via isStreaming when session not yet ready */}
        <div className="p-3 border-t border-[--color-border-default]">
          <ChatInputCard
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isStreaming={isStreaming || !currentSession}
            panelRef={panelRef}
          />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Run tests**

```bash
npm test
```

Expected: 479 tests pass.

**Step 3: Commit**

```bash
git add src/components/ChatView.tsx
git commit -m "style: migrate ChatView to design system tokens"
```

---

## Task 5: Migrate `ConfigurationView`

**Files:**
- Modify: `src/components/ConfigurationView.tsx`

**Step 1: Apply token changes**

Replace the entire file:

```tsx
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAiChatStore } from "@/stores/aiChat";

export function ConfigurationView() {
  const [profileInput, setProfileInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    authChecked,
    isAuthenticated,
    awsProfile,
    error,
    login,
    setAwsProfile,
    clearAwsProfile,
  } = useAiChatStore();

  const handleConnect = async () => {
    if (!profileInput.trim() || isConnecting) return;
    setIsConnecting(true);
    try {
      await setAwsProfile(profileInput.trim());
      if (!useAiChatStore.getState().isAuthenticated) {
        await login();
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="w-96 flex flex-col h-full border-l border-[--color-border-default] bg-[--color-bg-base]">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-[--color-border-default] flex-shrink-0">
        <span className="text-[--font-size-ui-md] font-medium text-[--color-text-primary]">
          AI settings
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 gap-4">
        {!authChecked && (
          <Loader2 className="w-6 h-6 text-[--color-text-tertiary] animate-spin" />
        )}

        {authChecked && !isAuthenticated && !awsProfile && (
          <>
            <p className="text-[--font-size-ui-md] font-medium text-[--color-text-primary]">
              Connect to AWS Bedrock
            </p>
            <input
              type="text"
              value={profileInput}
              onChange={(e) => setProfileInput(e.target.value)}
              placeholder="e.g., ai-prod-llm"
              className="w-full px-3 py-1.5 text-[--font-size-ui-base] border border-[--color-border-default] rounded-[--radius-base] bg-[--color-bg-subtle] text-[--color-text-primary] placeholder-[--color-text-tertiary] focus:outline-none focus:border-[--color-accent] focus:shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-accent)_25%,transparent)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConnect();
              }}
            />
            <button
              onClick={handleConnect}
              disabled={!profileInput.trim() || isConnecting}
              className="w-full px-4 py-2 text-[--font-size-ui-base] font-medium text-[--color-text-on-accent] bg-[--color-accent] hover:bg-[--color-accent-hover] rounded-[--radius-base] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? "Connecting…" : "Connect"}
            </button>
          </>
        )}

        {authChecked && !isAuthenticated && awsProfile && (
          <>
            <p className="text-[--font-size-ui-md] font-medium text-[--color-text-primary]">
              Session expired
            </p>
            <button
              onClick={login}
              className="w-full px-4 py-2 text-[--font-size-ui-base] font-medium text-[--color-text-on-accent] bg-[--color-accent] hover:bg-[--color-accent-hover] rounded-[--radius-base]"
            >
              Re-authenticate
            </button>
            <button
              onClick={clearAwsProfile}
              className="text-[--font-size-ui-sm] text-[--color-accent] hover:underline"
            >
              Change profile
            </button>
          </>
        )}

        {error && (
          <p className="text-[--font-size-ui-base] text-[--color-state-danger]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Run tests**

```bash
npm test
```

Expected: 479 tests pass.

**Step 3: Commit**

```bash
git add src/components/ConfigurationView.tsx
git commit -m "style: migrate ConfigurationView to design system tokens"
```

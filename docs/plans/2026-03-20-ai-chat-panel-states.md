# AI Chat Panel States Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `AiChatPanel` into a thin router that slots one of three self-contained view components — `ConfigurationView`, `ChatView`, or `SessionHistoryView` — each owning its own header and content.

**Architecture:** `AiChatPanel` derives `isConfigurationView = !authChecked || !isAuthenticated` and routes to the appropriate component. `ConfigurationView` and `ChatView` are new components extracted from the current monolithic `AiChatPanel`. `SessionHistoryView` is unchanged.

**Tech Stack:** React, TypeScript, Zustand (`useAiChatStore`), Tailwind CSS, Lucide React icons, Vitest + Testing Library

---

## Task 1: `ConfigurationView` component

**Files:**
- Create: `src/components/ConfigurationView.tsx`
- Create: `tests/unit/components/ConfigurationView.test.tsx`

### Step 1: Create the test file with failing tests

Create `tests/unit/components/ConfigurationView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
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
    // Header should contain no buttons — all actions are in the content area
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
});
```

### Step 2: Run tests to verify they fail

```bash
cd /path/to/worktree && npm test -- tests/unit/components/ConfigurationView.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ConfigurationView'`

### Step 3: Implement `ConfigurationView`

Create `src/components/ConfigurationView.tsx`:

```tsx
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAiChatStore } from "@/stores/aiChat";

export function ConfigurationView() {
  const [profileInput, setProfileInput] = useState("");

  const {
    authChecked,
    isAuthenticated,
    awsProfile,
    error,
    login,
    setAwsProfile,
  } = useAiChatStore();

  const handleConnect = async () => {
    if (!profileInput.trim()) return;
    await setAwsProfile(profileInput.trim());
    await login();
  };

  return (
    <div className="w-96 flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <header
        role="banner"
        className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          AI settings
        </span>
      </header>

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 gap-4">
        {!authChecked && (
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        )}

        {authChecked && !isAuthenticated && !awsProfile && (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Connect to AWS Bedrock
            </p>
            <input
              type="text"
              value={profileInput}
              onChange={(e) => setProfileInput(e.target.value)}
              placeholder="e.g., ai-prod-llm"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConnect();
              }}
            />
            <button
              onClick={handleConnect}
              disabled={!profileInput.trim()}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </>
        )}

        {authChecked && !isAuthenticated && awsProfile && (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Session expired
            </p>
            <button
              onClick={login}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Re-authenticate
            </button>
            <button
              onClick={() =>
                useAiChatStore.setState({ awsProfile: null, authChecked: true })
              }
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Change profile
            </button>
          </>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
```

### Step 4: Run tests to verify they pass

```bash
npm test -- tests/unit/components/ConfigurationView.test.tsx
```

Expected: All tests pass. If the "no action buttons in header" test fails, check that no `<button>` elements are inside the `<header role="banner">` element.

### Step 5: Commit

```bash
git add src/components/ConfigurationView.tsx tests/unit/components/ConfigurationView.test.tsx
git commit -m "feat: add ConfigurationView component with AI settings header"
```

---

## Task 2: `ChatView` component

**Files:**
- Create: `src/components/ChatView.tsx`
- Create: `tests/unit/components/ChatView.test.tsx`

### Step 1: Create the test file with failing tests

Create `tests/unit/components/ChatView.test.tsx`:

```tsx
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
    it("shows suggested prompts when authenticated with no messages", () => {
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      expect(screen.getByText("Summarize this document")).toBeInTheDocument();
      expect(screen.getByText("What documents relate to this one?")).toBeInTheDocument();
      expect(screen.getByText("What context do I need to understand this?")).toBeInTheDocument();
    });

    it("shows suggested prompts as clickable buttons", () => {
      render(<ChatView onShowHistory={onShowHistory} onNewSession={onNewSession} />);
      const button = screen.getByText("Summarize this document");
      expect(button.tagName).toBe("BUTTON");
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
```

### Step 2: Run tests to verify they fail

```bash
npm test -- tests/unit/components/ChatView.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ChatView'`

### Step 3: Implement `ChatView`

Create `src/components/ChatView.tsx`:

```tsx
import { useState, useRef, useEffect } from "react";
import { Clock, MessageSquare, Plus } from "lucide-react";
import { useAiChatStore } from "@/stores/aiChat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInputCard } from "@/components/ChatInputCard";

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

  const renderContent = () => {
    if (messages.length === 0 && !isStreaming) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
      );
    }

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
        {isStreaming && (
          <div className="flex justify-start mb-3">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          </div>
        )}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <div ref={messagesEndRef} />
      </>
    );
  };

  return (
    <div
      ref={panelRef}
      className="w-96 flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {currentSession?.name || "AI assistant"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onShowHistory}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="Session history"
            aria-label="Session history"
          >
            <Clock className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={onNewSession}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            title="New conversation"
            aria-label="New conversation"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
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

### Step 4: Run tests to verify they pass

```bash
npm test -- tests/unit/components/ChatView.test.tsx
```

Expected: All tests pass.

### Step 5: Commit

```bash
git add src/components/ChatView.tsx tests/unit/components/ChatView.test.tsx
git commit -m "feat: add ChatView component extracted from AiChatPanel"
```

---

## Task 3: Refactor `AiChatPanel` to thin router

**Files:**
- Modify: `src/components/AiChatPanel.tsx`
- Modify: `tests/unit/AiChatPanel.test.tsx`

### Step 1: Update `AiChatPanel.test.tsx` with routing tests

Replace the contents of `tests/unit/AiChatPanel.test.tsx` entirely:

```tsx
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
    // Start authenticated so we can reach the history view state
    useAiChatStore.setState({ authChecked: true, isAuthenticated: true });
    const { rerender } = render(<AiChatPanel />);
    // Credentials expire
    useAiChatStore.setState({ isAuthenticated: false });
    rerender(<AiChatPanel />);
    expect(screen.getByText("AI settings")).toBeInTheDocument();
  });
});
```

### Step 2: Run tests to verify the new routing tests fail

```bash
npm test -- tests/unit/AiChatPanel.test.tsx
```

Expected: Some tests fail — "renders ChatView when authenticated" will fail because `AiChatPanel` still renders the chat header from its own JSX.

### Step 3: Refactor `AiChatPanel.tsx`

Replace the entire contents of `src/components/AiChatPanel.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useAiChatStore } from "@/stores/aiChat";
import { useFileTreeStore } from "@/stores/fileTree";
import { ConfigurationView } from "@/components/ConfigurationView";
import { ChatView } from "@/components/ChatView";
import { SessionHistoryView } from "@/components/SessionHistoryView";
import type { SessionScope } from "@/lib/session";

export function AiChatPanel() {
  const [view, setView] = useState<"chat" | "history">("chat");

  const {
    authChecked,
    isAuthenticated,
    currentSession,
    sessions,
    resumeSession,
    newSession,
    checkAuth,
  } = useAiChatStore();

  const selectedFilePath = useFileTreeStore((s) => s.selectedFilePath);
  const currentScope: SessionScope = selectedFilePath
    ? { type: "document", path: selectedFilePath }
    : { type: "workspace" };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const isConfigurationView = !authChecked || !isAuthenticated;

  if (isConfigurationView) {
    return <ConfigurationView />;
  }

  if (view === "history") {
    return (
      <SessionHistoryView
        sessions={sessions}
        currentSessionId={currentSession?.id ?? null}
        currentScope={currentScope}
        onResume={(id) => {
          resumeSession(id);
          setView("chat");
        }}
        onNewSession={() => {
          newSession();
          setView("chat");
        }}
        onBack={() => setView("chat")}
      />
    );
  }

  return (
    <ChatView
      onShowHistory={() => setView("history")}
      onNewSession={() => {
        newSession();
        setView("chat");
      }}
    />
  );
}
```

### Step 4: Run all tests

```bash
npm test
```

Expected: All 432+ tests pass. If `AiChatPanel.test.tsx` fails on a test that checks for content now owned by `ConfigurationView` or `ChatView`, verify those tests were removed from `AiChatPanel.test.tsx` in Step 1.

### Step 5: Commit

```bash
git add src/components/AiChatPanel.tsx tests/unit/AiChatPanel.test.tsx
git commit -m "refactor: reduce AiChatPanel to thin router; extract ConfigurationView and ChatView"
```

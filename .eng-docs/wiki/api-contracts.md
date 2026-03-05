# API Contracts

This document defines API endpoints, request/response schemas, and contracts for Episteme.

**Status**: Initial stub - to be populated as features are designed

---

## Overview

Episteme has two types of APIs:

1. **Tauri Commands** - Rust backend functions callable from React frontend
2. **External APIs** - GitHub API, AI provider APIs (Anthropic, OpenAI, etc.)

---

## Tauri Commands

Tauri commands are Rust functions exposed to the frontend via `#[tauri::command]`.

### File System Operations

(To be defined as features are built)

**Example structure**:
```typescript
// Frontend TypeScript interface
interface TauriCommands {
  openFolder(): Promise<string>; // Returns folder path
  listFiles(folderPath: string): Promise<FileNode[]>;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
}
```

### Git Operations

(To be defined)

### Settings/Preferences

(To be defined)

---

## External APIs

### GitHub API

**Base URL**: `https://api.github.com`

**Authentication**: OAuth token (stored in OS keychain)

**Endpoints** (to be detailed as features are built):
- Create branch
- Create pull request
- Create discussion
- List notifications
- etc.

### AWS Bedrock (Claude)

**Service**: `bedrock-runtime` via AWS SDK for Rust

**Authentication**: AWS SSO via default credential chain (`AWS_PROFILE` env var)

**Operations**:
- `Converse` - Send messages to Claude model, get response

### Tauri AI Commands

```typescript
// Check if AWS credentials are valid
ai_check_auth(aws_profile: string): Promise<boolean>;

// Trigger SSO login (opens browser)
ai_sso_login(aws_profile: string): Promise<void>;

// Send chat message, stream AI response via Channel
ai_chat(
  messages: { role: "user" | "assistant"; content: string }[],
  active_file_path: string | null,
  workspace_path: string,
  aws_profile: string,
  on_event: Channel  // receives Token(string), Done(string), Error(string)
): Promise<void>;
```

---

## Error Handling

(To be defined - standardized error response format)

---

## Notes

This document will be updated as we build features and define APIs. API design decisions should be documented in ADRs if significant.

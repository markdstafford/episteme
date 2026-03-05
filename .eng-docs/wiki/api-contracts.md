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

### Anthropic API

**Base URL**: `https://api.anthropic.com`

**Authentication**: API key (user-provided, stored in OS keychain)

**Endpoints** (to be detailed):
- Create message
- Stream message
- etc.

---

## Error Handling

(To be defined - standardized error response format)

---

## Notes

This document will be updated as we build features and define APIs. API design decisions should be documented in ADRs if significant.

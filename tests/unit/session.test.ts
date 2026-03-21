import { describe, it, expect } from "vitest";
import { newSession, type SessionScope } from "@/lib/session";

describe("newSession", () => {
  it("creates a session with empty name", () => {
    const scope: SessionScope = { type: "workspace" };
    const session = newSession("view", scope);
    expect(session.name).toBe("");
  });

  it("creates a session with the given scope", () => {
    const scope: SessionScope = { type: "document", path: "/workspace/doc.md" };
    const session = newSession("edit", scope);
    expect(session.scope).toEqual({ type: "document", path: "/workspace/doc.md" });
  });

  it("creates a workspace-scoped session", () => {
    const scope: SessionScope = { type: "workspace" };
    const session = newSession("view", scope);
    expect(session.scope).toEqual({ type: "workspace" });
  });

  it("creates a session with a unique id each time", () => {
    const scope: SessionScope = { type: "workspace" };
    const a = newSession("view", scope);
    const b = newSession("view", scope);
    expect(a.id).not.toBe(b.id);
  });

  it("creates a session with empty message arrays", () => {
    const scope: SessionScope = { type: "workspace" };
    const session = newSession("view", scope);
    expect(session.messages_all).toEqual([]);
    expect(session.messages_compacted).toEqual([]);
  });
});

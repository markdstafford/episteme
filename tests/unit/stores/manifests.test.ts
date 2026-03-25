import { describe, it, expect, beforeEach, vi } from "vitest";
import { useManifestStore } from "@/stores/manifests";
import type { ModeManifest, LoadedManifests } from "@/stores/manifests";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const { invoke } = await import("@tauri-apps/api/core");
const mockInvoke = vi.mocked(invoke);

const mockMode = (id: string, scope: "document" | "workspace" | "any" = "document"): ModeManifest => ({
  id,
  name: id.charAt(0).toUpperCase() + id.slice(1),
  scope,
  tools: [],
  system_prompt: "",
});

const mockManifests: LoadedManifests = {
  modes: [mockMode("draft"), mockMode("review"), mockMode("ask", "workspace")],
  doc_types: [],
  processes: [],
};

describe("useManifestStore", () => {
  beforeEach(() => {
    useManifestStore.setState({ modes: [], docTypes: [], processes: [], activeMode: null });
    vi.clearAllMocks();
  });

  it("loadManifests invokes load_manifests and updates state", async () => {
    mockInvoke.mockResolvedValueOnce(mockManifests);
    await useManifestStore.getState().loadManifests("/workspace");
    expect(mockInvoke).toHaveBeenCalledWith("load_manifests", { workspacePath: "/workspace" });
    expect(useManifestStore.getState().modes).toHaveLength(3);
  });

  it("setManifests replaces all manifest state", () => {
    useManifestStore.getState().setManifests(mockManifests);
    expect(useManifestStore.getState().modes).toHaveLength(3);
    expect(useManifestStore.getState().docTypes).toHaveLength(0);
  });

  it("setActiveMode updates activeMode", () => {
    useManifestStore.getState().setManifests(mockManifests);
    useManifestStore.getState().setActiveMode("review");
    expect(useManifestStore.getState().activeMode).toBe("review");
  });

  it("applicableModes excludes document-scoped when no docType (no doc open)", () => {
    useManifestStore.getState().setManifests(mockManifests);
    const applicable = useManifestStore.getState().applicableModes(null);
    expect(applicable.some(m => m.id === "ask")).toBe(true);
    expect(applicable.some(m => m.id === "draft")).toBe(false);
    expect(applicable.some(m => m.id === "review")).toBe(false);
  });

  it("applicableModes excludes workspace-scoped when docType present", () => {
    useManifestStore.getState().setManifests(mockManifests);
    const applicable = useManifestStore.getState().applicableModes("product-description");
    expect(applicable.some(m => m.id === "draft")).toBe(true);
    expect(applicable.some(m => m.id === "review")).toBe(true);
    expect(applicable.some(m => m.id === "ask")).toBe(false);
  });

  it("applicableModes includes any-scoped regardless of context", () => {
    const withAny: LoadedManifests = {
      ...mockManifests,
      modes: [...mockManifests.modes, mockMode("brainstorm", "any")],
    };
    useManifestStore.getState().setManifests(withAny);
    expect(useManifestStore.getState().applicableModes(null).some(m => m.id === "brainstorm")).toBe(true);
    expect(useManifestStore.getState().applicableModes("pd").some(m => m.id === "brainstorm")).toBe(true);
  });

  it("resolveDefaultMode returns ask when no docType", () => {
    useManifestStore.getState().setManifests(mockManifests);
    expect(useManifestStore.getState().resolveDefaultMode(null, null)).toBe("ask");
  });

  it("resolveDefaultMode returns draft when docType present", () => {
    useManifestStore.getState().setManifests(mockManifests);
    expect(useManifestStore.getState().resolveDefaultMode("product-description", null)).toBe("draft");
  });

  it("resolveDefaultMode returns null when no applicable modes", () => {
    // No modes loaded
    expect(useManifestStore.getState().resolveDefaultMode(null, null)).toBeNull();
  });
});

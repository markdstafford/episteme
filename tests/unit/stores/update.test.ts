import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @tauri-apps/api/core before importing the store
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { useUpdateStore } from "@/stores/update";

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  vi.clearAllMocks();
  useUpdateStore.setState({
    available: false,
    version: null,
    notes: null,
    status: "idle",
    error: null,
  });
});

describe("update store", () => {
  it("transitions idle → checking → available when update found", async () => {
    mockInvoke.mockResolvedValueOnce({
      available: true,
      version: "0.2.0",
      notes: "## Features\n- New stuff",
    });

    const promise = useUpdateStore.getState().checkForUpdate();
    expect(useUpdateStore.getState().status).toBe("checking");

    await promise;

    expect(useUpdateStore.getState().status).toBe("idle");
    expect(useUpdateStore.getState().available).toBe(true);
    expect(useUpdateStore.getState().version).toBe("0.2.0");
    expect(useUpdateStore.getState().notes).toBe("## Features\n- New stuff");
  });

  it("transitions idle → checking → idle when no update", async () => {
    mockInvoke.mockResolvedValueOnce({
      available: false,
      version: null,
      notes: null,
    });

    await useUpdateStore.getState().checkForUpdate();

    expect(useUpdateStore.getState().status).toBe("idle");
    expect(useUpdateStore.getState().available).toBe(false);
    expect(useUpdateStore.getState().version).toBeNull();
  });

  it("transitions idle → checking → error on failure", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("network error"));

    await useUpdateStore.getState().checkForUpdate();

    expect(useUpdateStore.getState().status).toBe("error");
    expect(useUpdateStore.getState().error).toBe("network error");
  });

  it("sets status to downloading when installUpdate called", async () => {
    useUpdateStore.setState({ available: true, version: "0.2.0" });
    mockInvoke.mockImplementationOnce(() => new Promise(() => {})); // never resolves

    useUpdateStore.getState().installUpdate();

    expect(useUpdateStore.getState().status).toBe("downloading");
  });
});

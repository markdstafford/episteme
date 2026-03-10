import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateNewDialog } from "@/components/CreateNewDialog";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

function makeSkills(names: string[]) {
  return names.map((n) => ({ name: n, description: "" }));
}

describe("CreateNewDialog option list computation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows skills in alphabetical order when no MRU and no document counts", async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "list_skills") return Promise.resolve(makeSkills(["tech-design", "product-description"]));
      if (cmd === "count_documents_by_type") return Promise.resolve({});
      if (cmd === "load_preferences") return Promise.resolve({ last_opened_folder: null, aws_profile: null, recently_used_skill_types: [] });
      return Promise.resolve(null);
    });

    render(<CreateNewDialog onSelect={vi.fn()} onClose={vi.fn()} workspacePath="/ws" />);
    await waitFor(() => expect(screen.getByText("product-description")).toBeTruthy());

    const items = screen.getAllByRole("button").filter(b => b.getAttribute("data-option"));
    expect(items[0]).toHaveTextContent("product-description");
    expect(items[1]).toHaveTextContent("tech-design");
  });

  it("shows MRU types first", async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "list_skills") return Promise.resolve(makeSkills(["product-description", "tech-design"]));
      if (cmd === "count_documents_by_type") return Promise.resolve({});
      if (cmd === "load_preferences") return Promise.resolve({ last_opened_folder: null, aws_profile: null, recently_used_skill_types: ["tech-design"] });
      return Promise.resolve(null);
    });

    render(<CreateNewDialog onSelect={vi.fn()} onClose={vi.fn()} workspacePath="/ws" />);
    await waitFor(() => expect(screen.getByText("tech-design")).toBeTruthy());

    const items = screen.getAllByRole("button").filter(b => b.getAttribute("data-option"));
    expect(items[0]).toHaveTextContent("tech-design");
  });

  it("caps skill options at 3 and always shows Other", async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "list_skills") return Promise.resolve(makeSkills(["a", "b", "c", "d"]));
      if (cmd === "count_documents_by_type") return Promise.resolve({});
      if (cmd === "load_preferences") return Promise.resolve({ last_opened_folder: null, aws_profile: null, recently_used_skill_types: [] });
      return Promise.resolve(null);
    });

    render(<CreateNewDialog onSelect={vi.fn()} onClose={vi.fn()} workspacePath="/ws" />);
    await waitFor(() => expect(screen.getByText("Other")).toBeTruthy());

    const items = screen.getAllByRole("button").filter(b => b.getAttribute("data-option"));
    // 3 skill options + 1 Other = 4
    expect(items).toHaveLength(4);
  });

  it("shows fewer than 3 options when workspace has fewer skills", async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "list_skills") return Promise.resolve(makeSkills(["only-skill"]));
      if (cmd === "count_documents_by_type") return Promise.resolve({});
      if (cmd === "load_preferences") return Promise.resolve({ last_opened_folder: null, aws_profile: null, recently_used_skill_types: [] });
      return Promise.resolve(null);
    });

    render(<CreateNewDialog onSelect={vi.fn()} onClose={vi.fn()} workspacePath="/ws" />);
    await waitFor(() => expect(screen.getByText("only-skill")).toBeTruthy());

    const items = screen.getAllByRole("button").filter(b => b.getAttribute("data-option"));
    // 1 skill + Other = 2
    expect(items).toHaveLength(2);
  });
});

describe("CreateNewDialog keyboard shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "list_skills") return Promise.resolve(makeSkills(["product-description", "tech-design"]));
      if (cmd === "count_documents_by_type") return Promise.resolve({});
      if (cmd === "load_preferences") return Promise.resolve({ last_opened_folder: null, aws_profile: null, recently_used_skill_types: [] });
      if (cmd === "save_preferences") return Promise.resolve(undefined);
      return Promise.resolve(null);
    });
  });

  it("pressing '1' selects the first skill", async () => {
    const onSelect = vi.fn();
    render(<CreateNewDialog onSelect={onSelect} onClose={vi.fn()} workspacePath="/ws" />);
    await waitFor(() => expect(screen.getByText("product-description")).toBeTruthy());

    fireEvent.keyDown(document, { key: "1" });
    expect(onSelect).toHaveBeenCalledWith("product-description");
  });

  it("pressing Escape calls onClose without onSelect", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<CreateNewDialog onSelect={onSelect} onClose={onClose} workspacePath="/ws" />);
    await waitFor(() => expect(screen.getByText("product-description")).toBeTruthy());

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("last key selects Other", async () => {
    const onSelect = vi.fn();
    render(<CreateNewDialog onSelect={onSelect} onClose={vi.fn()} workspacePath="/ws" />);
    await waitFor(() => expect(screen.getByText("Other")).toBeTruthy());

    // 2 skills + Other = key "3"
    fireEvent.keyDown(document, { key: "3" });
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe("CreateNewDialog MRU update", () => {
  it("updates recently_used_skill_types and saves preferences on selection", async () => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "list_skills") return Promise.resolve(makeSkills(["product-description"]));
      if (cmd === "count_documents_by_type") return Promise.resolve({});
      if (cmd === "load_preferences") return Promise.resolve({ last_opened_folder: null, aws_profile: null, recently_used_skill_types: [] });
      if (cmd === "save_preferences") return Promise.resolve(undefined);
      return Promise.resolve(null);
    });

    const onSelect = vi.fn();
    render(<CreateNewDialog onSelect={onSelect} onClose={vi.fn()} workspacePath="/ws" />);
    await waitFor(() => expect(screen.getByText("product-description")).toBeTruthy());

    fireEvent.click(screen.getByText("product-description"));

    await waitFor(() => {
      const saveCalls = mockInvoke.mock.calls.filter(c => c[0] === "save_preferences");
      expect(saveCalls.length).toBeGreaterThan(0);
      const savedPrefs = saveCalls[0][1] as { preferences: { recently_used_skill_types: string[] } };
      expect(savedPrefs.preferences.recently_used_skill_types).toContain("product-description");
    });
  });
});

describe("CreateNewDialog empty workspace", () => {
  it("shows only Other when no skills exist", async () => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "list_skills") return Promise.resolve([]);
      if (cmd === "count_documents_by_type") return Promise.resolve({});
      if (cmd === "load_preferences") return Promise.resolve({ last_opened_folder: null, aws_profile: null, recently_used_skill_types: [] });
      return Promise.resolve(null);
    });

    render(<CreateNewDialog onSelect={vi.fn()} onClose={vi.fn()} workspacePath="/ws" />);
    await waitFor(() => expect(screen.getByText("Other")).toBeTruthy());

    const items = screen.getAllByRole("button").filter(b => b.getAttribute("data-option"));
    expect(items).toHaveLength(1); // Only "Other"
  });
});

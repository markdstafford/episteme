import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useWorkspaceStore } from "@/stores/workspace";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("WelcomeScreen", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      folderPath: null,
      isLoading: false,
      error: null,
    });
  });

  it("renders the app title", () => {
    render(<WelcomeScreen />);
    expect(screen.getByText("Episteme")).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<WelcomeScreen />);
    expect(
      screen.getByText("Open a folder to get started")
    ).toBeInTheDocument();
  });

  it("renders the Open Folder button", () => {
    render(<WelcomeScreen />);
    expect(
      screen.getByRole("button", { name: /open folder/i })
    ).toBeInTheDocument();
  });

  it("calls openFolder when button is clicked", async () => {
    const openFolder = vi.fn();
    useWorkspaceStore.setState({ openFolder });

    render(<WelcomeScreen />);
    await userEvent.click(
      screen.getByRole("button", { name: /open folder/i })
    );

    expect(openFolder).toHaveBeenCalledOnce();
  });

  it("does not show error when there is none", () => {
    render(<WelcomeScreen />);
    expect(screen.queryByText(/could not open folder/i)).not.toBeInTheDocument();
  });

  it("shows error message when error exists", () => {
    useWorkspaceStore.setState({ error: "Something went wrong" });

    render(<WelcomeScreen />);
    expect(
      screen.getByText(/could not open folder/i)
    ).toBeInTheDocument();
  });
});

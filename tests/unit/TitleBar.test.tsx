import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TitleBar } from "@/components/TitleBar";

describe("TitleBar", () => {
  it("renders back and forward navigation buttons", () => {
    render(<TitleBar folderPath={null} />);
    expect(screen.getByRole("button", { name: /navigate back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /navigate forward/i })).toBeInTheDocument();
  });

  it("renders 'Episteme' title text", () => {
    render(<TitleBar folderPath={null} />);
    expect(screen.getByText("Episteme")).toBeInTheDocument();
  });

  it("renders New Document button as disabled when folderPath is null", () => {
    render(<TitleBar folderPath={null} />);
    const newDocBtn = screen.getByRole("button", { name: /new document/i });
    expect(newDocBtn).toBeDisabled();
  });

  it("renders New Document button as enabled when folderPath is a string", () => {
    render(<TitleBar folderPath="/some/path" />);
    const newDocBtn = screen.getByRole("button", { name: /new document/i });
    expect(newDocBtn).not.toBeDisabled();
  });
});

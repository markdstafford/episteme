import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TitleBar } from "@/components/TitleBar";

describe("TitleBar", () => {
  it("renders 'Episteme' as fallback when folderName is null", () => {
    render(<TitleBar folderName={null} />);
    expect(screen.getByText("Episteme")).toBeInTheDocument();
  });

  it("renders the folder name when folderName is provided", () => {
    render(<TitleBar folderName="my-docs-folder" />);
    expect(screen.getByText("my-docs-folder")).toBeInTheDocument();
  });
});

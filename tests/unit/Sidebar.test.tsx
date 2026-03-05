import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Sidebar } from "@/components/Sidebar";

describe("Sidebar", () => {
  it("renders children", () => {
    render(
      <Sidebar>
        <p>Test content</p>
      </Sidebar>
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders as aside element", () => {
    render(
      <Sidebar>
        <p>Content</p>
      </Sidebar>
    );
    const aside = document.querySelector("aside");
    expect(aside).toBeInTheDocument();
  });
});

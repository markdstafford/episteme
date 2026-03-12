import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from "@/components/ui/Popover";

describe("Popover", () => {
  it("shows content when trigger is clicked", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>
    );
    await userEvent.click(screen.getByText("Open popover"));
    expect(screen.getByText("Popover body")).toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>
    );
    await userEvent.click(screen.getByText("Open popover"));
    expect(screen.getByText("Popover body")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("Popover body")).not.toBeInTheDocument();
  });

  it("closes when PopoverClose is clicked", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          Content
          <PopoverClose>Close</PopoverClose>
        </PopoverContent>
      </Popover>
    );
    await userEvent.click(screen.getByText("Open"));
    await userEvent.click(screen.getByText("Close"));
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });
});

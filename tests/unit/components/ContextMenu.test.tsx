import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuShortcut,
} from "@/components/ui/ContextMenu";

describe("ContextMenu", () => {
  it("shows content on right-click", async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Open</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
    await userEvent.pointer({
      target: screen.getByText("Right-click me"),
      keys: "[MouseRight]",
    });
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("calls onSelect when item is clicked", async () => {
    const handleSelect = vi.fn();
    render(
      <ContextMenu>
        <ContextMenuTrigger>Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleSelect}>Open</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
    await userEvent.pointer({
      target: screen.getByText("Trigger"),
      keys: "[MouseRight]",
    });
    await userEvent.click(screen.getByText("Open"));
    expect(handleSelect).toHaveBeenCalled();
  });

  it("renders separator with role=separator", async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Item</ContextMenuItem>
          <ContextMenuSeparator />
        </ContextMenuContent>
      </ContextMenu>
    );
    await userEvent.pointer({
      target: screen.getByText("Trigger"),
      keys: "[MouseRight]",
    });
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders label text", async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Actions</ContextMenuLabel>
        </ContextMenuContent>
      </ContextMenu>
    );
    await userEvent.pointer({
      target: screen.getByText("Trigger"),
      keys: "[MouseRight]",
    });
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders shortcut text inside an item", async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Trigger</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>
            Open
            <ContextMenuShortcut>⌘O</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
    await userEvent.pointer({
      target: screen.getByText("Trigger"),
      keys: "[MouseRight]",
    });
    expect(screen.getByText("⌘O")).toBeInTheDocument();
  });
});

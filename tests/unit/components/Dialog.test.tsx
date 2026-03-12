import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";

describe("Dialog", () => {
  it("renders content when open", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test dialog</DialogTitle>
          </DialogHeader>
          <DialogBody>Body text</DialogBody>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test dialog")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <Dialog open={false}>
        <DialogContent>
          <DialogBody>Hidden content</DialogBody>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when close button clicked", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test</DialogTitle>
            <DialogClose />
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    await userEvent.click(screen.getByRole("button", { name: /close dialog/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders footer content", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test</DialogTitle>
          <DialogFooter>
            <button>Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });
});

import * as RadixDialog from "@radix-ui/react-dialog";
import { useUpdateStore } from "@/stores/update";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/Button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";

export function UpdateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const version = useUpdateStore((s) => s.version);
  const notes = useUpdateStore((s) => s.notes);
  const installUpdate = useUpdateStore((s) => s.installUpdate);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          width: "min(560px, calc(100vw - var(--space-8)))",
        }}
      >
        <DialogHeader>
          <DialogTitle>Version {version} available</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogBody
          style={{
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {notes ? (
            <MarkdownRenderer content={notes} className="prose prose-tiptap dark:prose-invert max-w-none" />
          ) : (
            <p style={{ color: "var(--color-text-secondary)" }}>
              No release notes available.
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <RadixDialog.Close asChild>
            <Button variant="ghost" aria-label="Dismiss">
              Dismiss
            </Button>
          </RadixDialog.Close>
          <Button
            variant="primary"
            onClick={() => {
              installUpdate();
            }}
          >
            Update and restart
          </Button>
        </DialogFooter>
      </DialogContent>
    </RadixDialog.Root>
  );
}

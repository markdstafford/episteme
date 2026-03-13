import { useState } from "react";
import { ArrowUpCircle } from "lucide-react";
import { useUpdateStore } from "@/stores/update";
import { UpdateDialog } from "@/components/UpdateDialog";
import { Button } from "@/components/ui/Button";

export function UpdateIndicator() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const available = useUpdateStore((s) => s.available);
  const version = useUpdateStore((s) => s.version);

  if (!available) return null;

  return (
    <>
      <Button
        variant="ghost"
        iconOnly
        onClick={() => setDialogOpen(true)}
        title={`Version ${version ?? "unknown"} available`}
        aria-label="Update available"
        style={{ color: "var(--color-accent)" }}
      >
        <ArrowUpCircle size={14} />
      </Button>
      <UpdateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

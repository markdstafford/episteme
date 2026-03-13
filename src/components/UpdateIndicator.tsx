import { useState } from "react";
import { ArrowUpCircle } from "lucide-react";
import { useUpdateStore } from "@/stores/update";
import { UpdateDialog } from "@/components/UpdateDialog";

export function UpdateIndicator() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const available = useUpdateStore((s) => s.available);
  const version = useUpdateStore((s) => s.version);

  if (!available) return null;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        title={`Version ${version} available`}
        aria-label="Update available"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <ArrowUpCircle size={14} />
      </button>
      <UpdateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

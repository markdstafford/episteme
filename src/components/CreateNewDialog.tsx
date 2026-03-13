import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileText, Wrench, HelpCircle } from "lucide-react";
import { parsePreferences } from "@/lib/preferences";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
} from "@/components/ui/Dialog";

interface SkillInfo {
  id: string;
  name: string;
  description: string;
}

interface Option {
  label: string;
  skillName: string | null;
}

interface CreateNewDialogProps {
  workspacePath: string;
  onSelect: (skillName: string | null) => void;
  onClose: () => void;
}

function buildOptionList(
  skills: SkillInfo[],
  counts: Record<string, number>,
  mru: string[]
): Option[] {
  const skillIds = new Set(skills.map((s) => s.id));
  const validMru = mru.filter((id) => skillIds.has(id));

  const slots: string[] = validMru.slice(0, 3);
  const slotsSet = new Set(slots);

  const remaining = skills
    .filter((s) => !slotsSet.has(s.id))
    .sort((a, b) => {
      const diff = (counts[b.id] ?? 0) - (counts[a.id] ?? 0);
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });

  while (slots.length < 3 && remaining.length > 0) {
    slots.push(remaining.shift()!.id);
  }

  const idToSkill = new Map(skills.map((s) => [s.id, s]));
  const options: Option[] = slots.map((id) => {
    const skill = idToSkill.get(id)!;
    return { label: skill.name, skillName: skill.id };
  });
  options.push({ label: "Other", skillName: null });
  return options;
}

function iconForSkill(name: string) {
  if (name.includes("tech"))
    return (
      <Wrench
        size={16}
        style={{ color: "var(--color-text-tertiary)" }}
      />
    );
  return (
    <FileText
      size={16}
      style={{ color: "var(--color-text-tertiary)" }}
    />
  );
}

export function CreateNewDialog({
  workspacePath,
  onSelect,
  onClose,
}: CreateNewDialogProps) {
  const [options, setOptions] = useState<Option[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [skills, counts, prefsRaw] = await Promise.all([
          invoke<SkillInfo[]>("list_skills", { workspacePath }),
          invoke<Record<string, number>>("count_documents_by_type", {
            workspacePath,
          }),
          invoke("load_preferences"),
        ]);
        if (cancelled) return;
        const prefs = parsePreferences(prefsRaw);
        setOptions(buildOptionList(skills, counts, prefs.recently_used_skill_types));
      } catch {
        if (!cancelled) setOptions(buildOptionList([], {}, []));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [workspacePath]);

  const handleSelect = useCallback(
    (opt: Option) => {
      if (opt.skillName !== null) {
        const skillName = opt.skillName;
        invoke("load_preferences")
          .then((prefsRaw) => {
            const prefs = parsePreferences(prefsRaw);
            const updated = [
              skillName,
              ...prefs.recently_used_skill_types.filter((n) => n !== skillName),
            ].slice(0, 3);
            return invoke("save_preferences", {
              preferences: { ...prefs, recently_used_skill_types: updated },
            });
          })
          .catch(() => {});
      }
      onSelect(opt.skillName);
      onClose();
    },
    [onSelect, onClose]
  );

  useEffect(() => {
    if (options === null) return;
    function handleKey(e: KeyboardEvent) {
      // Escape is handled by Radix Dialog via onOpenChange; skip it here
      // to avoid calling onClose twice.
      if (e.key === "Escape") return;
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= options!.length) {
        handleSelect(options![n - 1]);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [options, handleSelect]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent style={{ width: 288 }}>
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogBody style={{ padding: "var(--space-1)" }}>
          {options === null ? (
            <div
              style={{
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--font-size-ui-base)",
                color: "var(--color-text-tertiary)",
              }}
            >
              Loading...
            </div>
          ) : (
            options.map((opt, i) => (
              <button
                key={opt.skillName ?? "other"}
                data-option="true"
                onClick={() => handleSelect(opt)}
                className="focus-ring hover:bg-(--color-bg-hover) rounded-[var(--radius-md)] transition-colors duration-(--duration-fast)"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ flexShrink: 0 }}>
                  {opt.skillName !== null ? (
                    iconForSkill(opt.skillName)
                  ) : (
                    <HelpCircle
                      size={16}
                      style={{ color: "var(--color-text-tertiary)" }}
                    />
                  )}
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: "var(--font-size-ui-base)",
                    color: "var(--color-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.label}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: "var(--font-size-ui-xs)",
                    color: "var(--color-text-quaternary)",
                    backgroundColor: "var(--color-bg-hover)",
                    borderRadius: "var(--radius-sm)",
                    padding: "2px 6px",
                  }}
                >
                  {i + 1}
                </span>
              </button>
            ))
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileText, Wrench, HelpCircle } from "lucide-react";
import { parsePreferences } from "@/lib/preferences";

interface SkillInfo {
  id: string;       // directory name — passed to load_skill
  name: string;     // display name
  description: string;
}

interface Option {
  label: string;
  skillName: string | null; // null = "Other"
}

interface CreateNewDialogProps {
  workspacePath: string;
  onSelect: (skillName: string | null) => void;
  onClose: () => void;
}

function buildOptionList(
  skills: SkillInfo[],
  counts: Record<string, number>,
  mru: string[]   // mru stores ids
): Option[] {
  const skillIds = new Set(skills.map((s) => s.id));
  const validMru = mru.filter((id) => skillIds.has(id));

  const slots: string[] = validMru.slice(0, 3);  // slots holds ids
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

  // Build display options: label = skill.name, skillName = skill.id
  const idToSkill = new Map(skills.map((s) => [s.id, s]));
  const options: Option[] = slots.map((id) => {
    const skill = idToSkill.get(id)!;
    return { label: skill.name, skillName: skill.id };
  });
  options.push({ label: "Other", skillName: null });
  return options;
}

function iconForSkill(name: string) {
  if (name.includes("tech")) return <Wrench className="w-4 h-4 text-gray-400 shrink-0" />;
  return <FileText className="w-4 h-4 text-gray-400 shrink-0" />;
}

export function CreateNewDialog({ workspacePath, onSelect, onClose }: CreateNewDialogProps) {
  const [options, setOptions] = useState<Option[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [skills, counts, prefsRaw] = await Promise.all([
          invoke<SkillInfo[]>("list_skills", { workspacePath }),
          invoke<Record<string, number>>("count_documents_by_type", { workspacePath }),
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
    return () => { cancelled = true; };
  }, [workspacePath]);

  const handleSelect = useCallback(
    (opt: Option) => {
      // Fire MRU save as best-effort background operation; don't block selection
      if (opt.skillName !== null) {
        const skillName = opt.skillName;
        invoke("load_preferences")
          .then((prefsRaw) => {
            const prefs = parsePreferences(prefsRaw);
            const updated = [skillName, ...prefs.recently_used_skill_types.filter((n) => n !== skillName)].slice(0, 3);
            return invoke("save_preferences", {
              preferences: { ...prefs, recently_used_skill_types: updated },
            });
          })
          .catch(() => {
            // best-effort MRU update; don't block the user
          });
      }
      onSelect(opt.skillName);
      onClose();
    },
    [onSelect, onClose]
  );

  useEffect(() => {
    if (options === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= options.length) {
        handleSelect(options[n - 1]);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [options, handleSelect, onClose]);

  return (
    <>
      {/* Click-capture layer */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg w-72 p-2 z-50">
        {options === null ? (
          <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>
        ) : (
          options.map((opt, i) => (
            <button
              key={opt.skillName ?? "other"}
              data-option="true"
              onClick={() => handleSelect(opt)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-left"
            >
              <span className="shrink-0">
                {opt.skillName !== null ? iconForSkill(opt.skillName) : <HelpCircle className="w-4 h-4 text-gray-400" />}
              </span>
              <span className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 truncate">
                {opt.label}
              </span>
              <span className="shrink-0 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5">
                {i + 1}
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
}

import { create } from "zustand";

export interface ShortcutAction {
  id: string;
  label: string;
  binding: string;
  category: string;
  ignoresActionRestrictions: boolean;
  callback?: () => void;
}

interface ShortcutsState {
  actions: Record<string, ShortcutAction>;
  actionsRestricted: boolean;
  registerAction: (action: ShortcutAction) => void;
  resolveAction: (combo: string, target: Element) => ShortcutAction | null;
  setActionsRestricted: (restricted: boolean) => void;
}

export function normalizeCombo(e: KeyboardEvent): string {
  const isMac = navigator.platform.startsWith("Mac");
  const modifiers: string[] = [];
  if (e.altKey) modifiers.push("Alt");
  if (e.metaKey) modifiers.push("Meta");
  if (!isMac && e.ctrlKey) modifiers.push("Meta");
  if (e.shiftKey) modifiers.push("Shift");
  const unique = [...new Set(modifiers)];
  unique.sort();
  return [...unique, e.code].join("+");
}

function isInputTarget(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  return (el as HTMLElement).isContentEditable;
}

export const useShortcutsStore = create<ShortcutsState>((set, get) => ({
  actions: {},
  actionsRestricted: false,

  registerAction(action) {
    set((s) => ({ actions: { ...s.actions, [action.id]: action } }));
  },

  resolveAction(combo, target) {
    const { actions, actionsRestricted } = get();
    const action = Object.values(actions).find((a) => a.binding === combo) ?? null;
    if (!action) return null;
    if (actionsRestricted || isInputTarget(target)) {
      return action.ignoresActionRestrictions ? action : null;
    }
    return action;
  },

  setActionsRestricted(restricted) {
    set({ actionsRestricted: restricted });
  },
}));

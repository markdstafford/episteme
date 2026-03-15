import { create } from "zustand";

export interface ShortcutAction {
  id: string;
  label: string;
  defaultBinding: string;
  category: string;
  firesThroughInputs: boolean;
  callback?: () => void;
}

interface ShortcutsState {
  actions: Record<string, ShortcutAction>;
  customBindings: Record<string, string>;
  registerAction: (action: ShortcutAction) => void;
  setBinding: (actionId: string, combo: string) => void;
  resetBinding: (actionId: string) => void;
  getBinding: (actionId: string) => string | undefined;
  comboToAction: (combo: string) => string | null;
  resolveAction: (combo: string, target: Element) => ShortcutAction | null;
  applyCustomBindings: (bindings: Record<string, string>) => void;
}

export function normalizeCombo(e: KeyboardEvent): string {
  const modifiers: string[] = [];
  if (e.altKey) modifiers.push("Alt");
  if (e.metaKey) modifiers.push("Meta");
  if (e.shiftKey) modifiers.push("Shift");
  modifiers.sort();
  return [...modifiers, e.code].join("+");
}

function isInputTarget(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  return (el as HTMLElement).isContentEditable;
}

export const useShortcutsStore = create<ShortcutsState>((set, get) => ({
  actions: {},
  customBindings: {},

  registerAction(action) {
    set((s) => ({ actions: { ...s.actions, [action.id]: action } }));
  },

  setBinding(actionId, combo) {
    set((s) => ({ customBindings: { ...s.customBindings, [actionId]: combo } }));
  },

  resetBinding(actionId) {
    set((s) => {
      const next = { ...s.customBindings };
      delete next[actionId];
      return { customBindings: next };
    });
  },

  getBinding(actionId) {
    const { actions, customBindings } = get();
    return customBindings[actionId] ?? actions[actionId]?.defaultBinding;
  },

  comboToAction(combo) {
    const { actions, customBindings } = get();
    for (const [id, action] of Object.entries(actions)) {
      const effective = customBindings[id] ?? action.defaultBinding;
      if (effective === combo) return id;
    }
    return null;
  },

  resolveAction(combo, target) {
    const { actions } = get();
    const actionId = get().comboToAction(combo);
    if (!actionId) return null;
    const action = actions[actionId];
    if (!action) return null;
    if (!action.firesThroughInputs && isInputTarget(target)) return null;
    return action;
  },

  applyCustomBindings(bindings) {
    set({ customBindings: bindings });
  },
}));

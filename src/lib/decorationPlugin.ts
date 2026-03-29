import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { DecorationRange } from "@/lib/threadDecorations";

export const decorationPluginKey = new PluginKey("threadDecorations");

export function createDecorationPlugin(
  getRanges: () => DecorationRange[],
): Plugin {
  return new Plugin({
    key: decorationPluginKey,
    state: {
      init(_config, state) {
        const ranges = getRanges();
        if (ranges.length === 0) return DecorationSet.empty;
        const decos = ranges.map((r) =>
          Decoration.inline(r.from, r.to, {
            class: `thread-decoration ${r.colorClass}`,
            "data-thread-ids": r.threadIds.join(","),
          }),
        );
        return DecorationSet.create(state.doc, decos);
      },
      apply(_tr, _old, _oldState, newState) {
        const ranges = getRanges();
        if (ranges.length === 0) return DecorationSet.empty;
        const decos = ranges.map((r) =>
          Decoration.inline(r.from, r.to, {
            class: `thread-decoration ${r.colorClass}`,
            "data-thread-ids": r.threadIds.join(","),
          }),
        );
        return DecorationSet.create(newState.doc, decos);
      },
    },
    props: {
      decorations(state) {
        return decorationPluginKey.getState(state) ?? DecorationSet.empty;
      },
    },
  });
}

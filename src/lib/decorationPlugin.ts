import { Plugin, PluginKey, EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { DecorationRange } from "@/lib/threadDecorations";

export const decorationPluginKey = new PluginKey("threadDecorations");

export function createDecorationPlugin(
  getRanges: (state: EditorState) => DecorationRange[],
): Plugin {
  return new Plugin({
    key: decorationPluginKey,
    state: {
      init(_config, state) {
        const ranges = getRanges(state);
        if (ranges.length === 0) return DecorationSet.empty;
        const decos = ranges.map((r) =>
          Decoration.inline(r.from, r.to, {
            class: `thread-decoration ${r.colorClass}`,
            "data-thread-ids": r.threadIds.join(","),
          }),
        );
        return DecorationSet.create(state.doc, decos);
      },
      apply(tr, old, _oldState, newState) {
        // Performance: only rebuild from store when thread state changes (threadDecorationUpdate).
        // For all other transactions, remap existing decorations via tr.mapping — O(decorations)
        // instead of O(threads) on every keypress.
        if (!tr.getMeta("threadDecorationUpdate")) {
          return old.map(tr.mapping, newState.doc);
        }
        const ranges = getRanges(newState);
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

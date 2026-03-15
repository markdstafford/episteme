const isMac = typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");

export function displayKey(segment: string): string {
  const map: Record<string, string> = {
    Meta: isMac ? "⌘" : "Ctrl",
    Shift: "⇧",
    Alt: "⌥",
    Ctrl: "^",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Enter: "↵",
    Backspace: "⌫",
    Space: "Space",
  };
  if (map[segment]) return map[segment];
  if (segment.startsWith("Key")) return segment.slice(3);
  if (segment.startsWith("Digit")) return segment.slice(5);
  return segment;
}

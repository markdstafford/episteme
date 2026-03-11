export function DesignKitchen({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--color-bg-base)" }}>
      <h1>Design Kitchen</h1>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-label="Loading"
      className="spinner"
      role="status"
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 8) }}
    />
  );
}

export function Skeleton({ className = "", rows = 1 }: { className?: string; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} className={`skeleton ${className}`} />
      ))}
    </>
  );
}

import type { ReactNode } from "react";

export function Tooltip({ children, text }: { children: ReactNode; text: string }) {
  return (
    <span className="tooltip">
      {children}
      <span className="tooltip-text" role="tooltip">
        {text}
      </span>
    </span>
  );
}

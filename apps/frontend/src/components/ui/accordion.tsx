import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface AccordionItemProps {
  title: ReactNode;
  indicator?: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

export function AccordionItem({ title, indicator, children, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div className={`accordion-item${isOpen ? " is-open" : ""}`}>
      <button
        aria-expanded={isOpen}
        className="accordion-header"
        onClick={onToggle}
        type="button"
      >
        <span className="accordion-header-content">
          {title}
          {indicator ? <span style={{ marginLeft: "var(--space-2)" }}>{indicator}</span> : null}
        </span>
        <ChevronDown className="accordion-chevron" size={20} />
      </button>
      <div className={`accordion-body ${isOpen ? "is-open" : ""}`}>
        <div className="accordion-inner">
          <div className="accordion-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Accordion({ children, flush }: { children: ReactNode; flush?: boolean }) {
  return <div className={`accordion${flush ? " accordion-flush" : ""}`}>{children}</div>;
}

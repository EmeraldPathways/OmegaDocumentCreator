import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface AccordionItemProps {
  id?: string;
  title: ReactNode;
  indicator?: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function AccordionItem({ id, title, indicator, children, isOpen, onToggle, className = "" }: AccordionItemProps) {
  return (
    <div className={`accordion-item${isOpen ? " is-open" : ""}${className ? ` ${className}` : ""}`} id={id}>
      <button
        aria-expanded={isOpen}
        className="accordion-header"
        onClick={onToggle}
        type="button"
      >
        <span className="accordion-header-content">
          {title}
          {indicator ? <span className="accordion-indicator">{indicator}</span> : null}
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

export function Accordion({
  children,
  flush,
  className = "",
}: {
  children: ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <div className={`accordion${flush ? " accordion-flush" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

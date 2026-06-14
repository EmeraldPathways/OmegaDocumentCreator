import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Button } from "./button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "small" | "medium" | "large";
}

export function Modal({ isOpen, onClose, title, children, footer, size = "medium" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
      ref={overlayRef}
      role="dialog"
    >
      <div className={`modal modal-${size}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <Button className="modal-close" onClick={onClose} variant="ghost">
            ×
          </Button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

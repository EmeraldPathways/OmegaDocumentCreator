import type { ReactNode, TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, id, className = "", ...props }: TextareaProps) {
  const textareaId = id ?? props.name;
  return (
    <div className={`field ${className}`}>
      {label ? (
        <label className="field-label" htmlFor={textareaId}>
          {label}
        </label>
      ) : null}
      <div className={`field-textarea-wrap${error ? " is-error" : ""}`}>
        <textarea className={`field-textarea${error ? " is-error" : ""}`} id={textareaId} {...props} />
      </div>
      {error ? <span className="field-error">{error}</span> : null}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
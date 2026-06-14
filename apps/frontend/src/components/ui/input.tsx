import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function Input({ label, error, hint, prefix, suffix, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className={`field ${className}`}>
      {label ? (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className={`field-input-wrap ${prefix ? "has-prefix" : ""} ${suffix ? "has-suffix" : ""} ${error ? "is-error" : ""}`}>
        {prefix ? <span className="field-prefix">{prefix}</span> : null}
        <input className="field-input" id={inputId} {...props} />
        {suffix ? <span className="field-suffix">{suffix}</span> : null}
      </div>
      {error ? <span className="field-error">{error}</span> : null}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

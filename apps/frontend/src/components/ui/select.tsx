import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, error, hint, options, id, className = "", ...props }: SelectProps) {
  const selectId = id ?? props.name;
  return (
    <div className={`field ${className}`}>
      {label ? (
        <label className="field-label" htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <select className={`field-input field-select ${error ? "is-error" : ""}`} id={selectId} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="field-error">{error}</span> : null}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

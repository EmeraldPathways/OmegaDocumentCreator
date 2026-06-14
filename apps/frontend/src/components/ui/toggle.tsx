import type { InputHTMLAttributes } from "react";

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Toggle({ label, checked, onChange, id, ...props }: ToggleProps) {
  return (
    <label className="toggle" htmlFor={id}>
      <input checked={checked} className="toggle-input" id={id} onChange={onChange} type="checkbox" {...props} />
      <span aria-hidden="true" className="toggle-switch" />
      {label ? <span className="toggle-label">{label}</span> : null}
    </label>
  );
}

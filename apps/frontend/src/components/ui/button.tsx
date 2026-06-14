import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "text";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const baseClass = `btn btn-${variant}`;
  return (
    <button className={`${baseClass} ${className}`} disabled={disabled || isLoading} type={type} {...props}>
      {isLoading ? <Spinner size={16} /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "draft" | "active" | "approved" | "pending" | "notSaved" | "saved" | "ready" | "sent" | "signed" | "default";

const variantClasses: Record<BadgeVariant, string> = {
  draft: "badge-draft",
  active: "badge-active",
  approved: "badge-approved",
  pending: "badge-pending",
  notSaved: "badge-not-saved",
  saved: "badge-saved",
  ready: "badge-ready",
  sent: "badge-sent",
  signed: "badge-signed",
  default: "badge-default",
};

export function Badge({ children, variant = "default", ...props }: { children: ReactNode; variant?: BadgeVariant } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={`badge ${variantClasses[variant]}`} {...props}>{children}</span>;
}

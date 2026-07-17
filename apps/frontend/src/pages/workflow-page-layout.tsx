import type { PropsWithChildren } from "react";

import type { WorkflowPageKind } from "./income-protection-helpers";

type WorkflowPageLayoutProps = PropsWithChildren<{
  className?: string;
  clientReference: string;
  workflowKind: WorkflowPageKind;
}>;

export function WorkflowPageLayout({
  children,
  className,
  clientReference,
  workflowKind,
}: WorkflowPageLayoutProps) {
  const classes = className ? `page-stack ${className}` : "page-stack";

  return (
    <div className={classes} data-client-reference={clientReference} data-workflow-kind={workflowKind}>
      {children}
    </div>
  );
}

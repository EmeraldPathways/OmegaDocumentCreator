import type { ReactNode } from "react";

import type { WorkflowPageKind, WorkflowSectionId } from "./income-protection-helpers";

type WorkflowDocumentSectionsProps = {
  sectionIds: WorkflowSectionId[];
  clientReference: string;
  workflowKind: WorkflowPageKind;
  renderSection: (sectionId: WorkflowSectionId) => ReactNode;
};

export function WorkflowDocumentSections({
  sectionIds,
  clientReference,
  workflowKind,
  renderSection,
}: WorkflowDocumentSectionsProps) {
  return (
    <div data-client-reference={clientReference} data-workflow-kind={workflowKind}>
      {sectionIds.map((sectionId) => (
        <section key={sectionId} data-workflow-section={sectionId}>
          {renderSection(sectionId)}
        </section>
      ))}
    </div>
  );
}

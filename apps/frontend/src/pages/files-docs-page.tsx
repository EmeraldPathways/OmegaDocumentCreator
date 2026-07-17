import { IncomeProtectionPage } from "./income-protection-page";

export function FilesDocsPage() {
  return (
    <IncomeProtectionPage
      pageTitle="Files/Docs"
      visibleTabIds={["files", "generated-documents"]}
      workflowKind="files-docs"
    />
  );
}

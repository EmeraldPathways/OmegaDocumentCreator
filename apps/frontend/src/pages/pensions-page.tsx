import { IncomeProtectionPage } from "./income-protection-page";

export function PensionsPage() {
  return (
    <IncomeProtectionPage
      pageTitle="Pensions"
      quoteDocumentType="Pensions Quote"
      statementDocumentType="Pensions Statement"
      visibleTabIds={["quote", "statement-of-suitability"]}
      workflowKind="pensions"
    />
  );
}

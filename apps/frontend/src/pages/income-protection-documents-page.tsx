import { IncomeProtectionPage } from "./income-protection-page";

export function IncomeProtectionDocumentsPage() {
  return (
    <IncomeProtectionPage
      pageTitle="Income Protection"
      visibleTabIds={["quote", "statement-of-suitability"]}
      workflowKind="income-protection"
    />
  );
}

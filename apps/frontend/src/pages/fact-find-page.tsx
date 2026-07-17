import { IncomeProtectionPage } from "./income-protection-page";

export function FactFindPage() {
  return (
    <IncomeProtectionPage
      pageTitle="Fact Find"
      visibleTabIds={["fact-find", "fact-find-update"]}
      workflowKind="fact-find"
    />
  );
}

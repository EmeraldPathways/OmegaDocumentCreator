import type { ReactNode } from "react";

import { Save } from "lucide-react";

import type { SeededClientProfile } from "../data/seeded-clients";
import { GeneratedOutputWorkspace } from "../documents/generated-output-workspace";
import { TemplatePicker } from "../documents/template-picker";
import type { GeneratedDocumentDraft } from "../documents/document-types";
import { Accordion, AccordionItem, Button, Input, Select, Textarea, Toggle } from "../components/ui";

import {
  coverAgeOptions,
  deferredPeriodOptions,
  formatCurrency,
  genderOptions,
  getGeneratedDraftStatusLabel,
  isAffirmative,
  phiIndexationOptions,
  phiOccupationalClassOptions,
  smokerStatusOptions,
  statementTypeOptions,
} from "./income-protection-helpers";
import type { WorkflowRequirement } from "./income-protection-requirements";

type StatementQuoteOption = {
  key: string;
  label: string;
};

type AccordionState = {
  isOpen: (sectionId: string) => boolean;
  toggle: (sectionId: string) => void;
};

type RenderGenerationRequirements = (
  title: string,
  requirements: WorkflowRequirement[],
  missingFields: string[],
  options?: { explainSharedFields?: boolean; emphasiseMissing?: boolean },
) => ReactNode;

type RequiredLabel = (label: string) => ReactNode;

type StatementWorkflowSectionProps = {
  draft: SeededClientProfile;
  documentDraft: GeneratedDocumentDraft;
  isIncomeProtectionDocumentFlow: boolean;
  renderGenerationRequirements: RenderGenerationRequirements;
  requiredLabel: RequiredLabel;
  saveLabel: string;
  selectedPolicyPickerValue: string;
  showStatementValidation: boolean;
  statementDocumentStatus: string;
  statementDocumentType: "Statement of Suitability" | "Pensions Statement";
  statementGenerationRequirements: WorkflowRequirement[];
  statementMissingFields: string[];
  statementQuoteOptions: StatementQuoteOption[];
  tabProgressIndicator: ReactNode;
  workspaceAccordion: AccordionState;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onGenerate: () => void;
  onSave: () => void;
  onTemplateChange: (templateId: string) => void;
  onUpdateField: (field: keyof SeededClientProfile, value: string) => void;
  onUpdateGeneratedOutput: (html: string) => void;
};

type QuoteWorkflowSectionProps = {
  draft: SeededClientProfile;
  documentDraft: GeneratedDocumentDraft;
  isPensionsQuoteWorkflow: boolean;
  quoteAnnualCoverAmount: string;
  quoteCoverToAge: string;
  quoteDeferredPeriod: string;
  quoteDocumentStatus: string;
  quoteDocumentType: "Quote" | "Pensions Quote";
  quoteGenerationRequirements: WorkflowRequirement[];
  quoteMissingFields: string[];
  quoteOccupationClass: string;
  quotePensionEscalation: string;
  quotePensionExistingFund: string;
  quotePensionGender: string;
  quotePensionInflation: string;
  quotePensionMonthlyContribution: string;
  quotePensionNetGrowth: string;
  quotePensionPremiumEscalation: string;
  quotePensionRequired: string;
  quotePensionRetirementAge: string;
  quotePensionSpousesPension: string;
  quotePhiIndexation: string;
  quoteSmoker: string;
  quoteYourAge: string;
  renderGenerationRequirements: RenderGenerationRequirements;
  requiredLabel: RequiredLabel;
  showQuoteValidation: boolean;
  workspaceAccordion: AccordionState;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onGenerate: () => void;
  onQuoteAnnualCoverAmountChange: (value: string) => void;
  onQuoteCoverToAgeChange: (value: string) => void;
  onQuoteDeferredPeriodChange: (value: string) => void;
  onQuoteOccupationClassChange: (value: string) => void;
  onQuotePensionEscalationChange: (value: string) => void;
  onQuotePensionExistingFundChange: (value: string) => void;
  onQuotePensionGenderChange: (value: string) => void;
  onQuotePensionInflationChange: (value: string) => void;
  onQuotePensionMonthlyContributionChange: (value: string) => void;
  onQuotePensionNetGrowthChange: (value: string) => void;
  onQuotePensionPremiumEscalationChange: (value: string) => void;
  onQuotePensionRequiredChange: (value: string) => void;
  onQuotePensionRetirementAgeChange: (value: string) => void;
  onQuotePensionSpousesPensionChange: (value: string) => void;
  onQuotePhiIndexationChange: (value: string) => void;
  onQuoteSmokerChange: (value: string) => void;
  onTemplateChange: (templateId: string) => void;
  onToggleZurichDiscount: (checked: boolean) => void;
  onUpdateGeneratedOutput: (html: string) => void;
  tabProgressIndicator: ReactNode;
};

export function StatementWorkflowSection({
  draft,
  documentDraft,
  isIncomeProtectionDocumentFlow,
  renderGenerationRequirements,
  requiredLabel,
  saveLabel,
  selectedPolicyPickerValue,
  showStatementValidation,
  statementDocumentStatus,
  statementDocumentType,
  statementGenerationRequirements,
  statementMissingFields,
  statementQuoteOptions,
  tabProgressIndicator,
  workspaceAccordion,
  onExportDocx,
  onExportPdf,
  onGenerate,
  onSave,
  onTemplateChange,
  onUpdateField,
  onUpdateGeneratedOutput,
}: StatementWorkflowSectionProps) {
  return (
    <div className="page-stack">
      <Accordion flush className="workflow-form-accordion">
        <AccordionItem
          indicator={tabProgressIndicator}
          isOpen={workspaceAccordion.isOpen("statement-form")}
          onToggle={() => workspaceAccordion.toggle("statement-form")}
          title="Statement Form"
        >
          {isIncomeProtectionDocumentFlow ? (
            <section className="form-section">
              <h3 className="form-section-title">Statement basics</h3>
              <div className="form-grid form-grid-desktop-3">
                <Input
                  id="sos-letterDate"
                  label={requiredLabel("Statement date")}
                  onChange={(event) => onUpdateField("letterDate", event.target.value)}
                  type="date"
                  value={draft.letterDate}
                />
                <Select
                  id="sos-statementSelectedQuoteKey"
                  label={requiredLabel("Policy picker")}
                  onChange={(event) => onUpdateField("statementSelectedQuoteKey", event.target.value)}
                  options={
                    statementQuoteOptions.length > 0
                      ? statementQuoteOptions.map((option) => ({ label: option.label, value: option.key }))
                      : [{ label: "Generate a quote first", value: "" }]
                  }
                  value={selectedPolicyPickerValue}
                />
              </div>
            </section>
          ) : (
            <>
              <section className="form-section">
                <h3 className="form-section-title">Recommendation basics</h3>
                <div className="form-grid">
                  <Input
                    id="sos-letterDate"
                    label={requiredLabel("Letter date")}
                    onChange={(event) => onUpdateField("letterDate", event.target.value)}
                    type="date"
                    value={draft.letterDate}
                  />
                  <Select
                    id="sos-statementType"
                    label={requiredLabel("Statement type")}
                    onChange={(event) => onUpdateField("statementType", event.target.value)}
                    options={statementTypeOptions}
                    value={draft.statementType}
                  />
                  <Input
                    id="sos-productType"
                    label={requiredLabel("Product type")}
                    onChange={(event) => onUpdateField("productType", event.target.value)}
                    type="text"
                    value={draft.productType}
                  />
                  <Input
                    id="sos-advisorName"
                    label={requiredLabel("Advisor name")}
                    onChange={(event) => onUpdateField("advisorName", event.target.value)}
                    type="text"
                    value={draft.advisorName}
                  />
                </div>
              </section>

              <section className="form-section">
                <h3 className="form-section-title">Cover summary</h3>
                <div className="form-grid">
                  <Input
                    id="sos-recommendedCover"
                    label={requiredLabel("Annual Cover Amount (EUR)")}
                    onBlur={(event) => onUpdateField("recommendedCover", formatCurrency(event.target.value))}
                    onChange={(event) => onUpdateField("recommendedCover", event.target.value)}
                    prefix="EUR"
                    inputMode="decimal"
                    step="0.01"
                    type="text"
                    value={draft.recommendedCover}
                  />
                  <Select
                    id="sos-deferredPeriod"
                    label={requiredLabel("Deferred period")}
                    onChange={(event) => onUpdateField("deferredPeriod", event.target.value)}
                    options={deferredPeriodOptions}
                    value={draft.deferredPeriod}
                  />
                  <Select
                    id="sos-coverAge"
                    label={requiredLabel("Cover to age")}
                    onChange={(event) => onUpdateField("coverAge", event.target.value)}
                    options={coverAgeOptions}
                    value={draft.coverAge}
                  />
                  <Input
                    hint="Gross premium minus tax relief at your marginal rate"
                    id="sos-netMonthlyCost"
                    label={requiredLabel("Net monthly cost")}
                    onBlur={(event) => onUpdateField("netMonthlyCost", formatCurrency(event.target.value))}
                    onChange={(event) => onUpdateField("netMonthlyCost", event.target.value)}
                    prefix="EUR"
                    inputMode="decimal"
                    step="0.01"
                    type="text"
                    value={draft.netMonthlyCost}
                  />
                  <Textarea
                    className="form-grid-full"
                    hint="Summarise the recommended cover and rationale"
                    id="sos-coverSummary"
                    label="Cover summary"
                    onChange={(event) => onUpdateField("coverSummary", event.target.value)}
                    placeholder="Brief overview of the recommended cover and why it suits the client..."
                    rows={4}
                    value={draft.coverSummary}
                  />
                </div>
              </section>
            </>
          )}
          {renderGenerationRequirements(
            `${statementDocumentType} generation requirements`,
            statementGenerationRequirements,
            statementMissingFields,
            {
              explainSharedFields: true,
              emphasiseMissing: showStatementValidation,
            },
          )}
          <div className="form-action-row">
            <span className="form-action-row-status">{saveLabel}</span>
            <Button onClick={onSave} variant="primary">
              <Save size={18} />
              Save Statement
            </Button>
          </div>
        </AccordionItem>
        <AccordionItem
          indicator={getGeneratedDraftStatusLabel(documentDraft.generationStatus)}
          isOpen={workspaceAccordion.isOpen("statement-output")}
          onToggle={() => workspaceAccordion.toggle("statement-output")}
          title="Generated Output"
        >
          <GeneratedOutputWorkspace
            draft={documentDraft}
            generateDisabled={statementMissingFields.length > 0}
            onContentChange={onUpdateGeneratedOutput}
            onExportDocx={onExportDocx}
            onExportPdf={onExportPdf}
            onGenerate={onGenerate}
            statusLabel={statementDocumentStatus.replace("Document: ", "")}
            templatePicker={
              <TemplatePicker
                documentType={statementDocumentType}
                onChange={onTemplateChange}
                selectedTemplateId={documentDraft.selectedTemplateId}
              />
            }
          />
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function QuoteWorkflowSection({
  draft,
  documentDraft,
  isPensionsQuoteWorkflow,
  quoteAnnualCoverAmount,
  quoteCoverToAge,
  quoteDeferredPeriod,
  quoteDocumentStatus,
  quoteDocumentType,
  quoteGenerationRequirements,
  quoteMissingFields,
  quoteOccupationClass,
  quotePensionEscalation,
  quotePensionExistingFund,
  quotePensionGender,
  quotePensionInflation,
  quotePensionMonthlyContribution,
  quotePensionNetGrowth,
  quotePensionPremiumEscalation,
  quotePensionRequired,
  quotePensionRetirementAge,
  quotePensionSpousesPension,
  quotePhiIndexation,
  quoteSmoker,
  quoteYourAge,
  renderGenerationRequirements,
  requiredLabel,
  showQuoteValidation,
  workspaceAccordion,
  onExportDocx,
  onExportPdf,
  onGenerate,
  onQuoteAnnualCoverAmountChange,
  onQuoteCoverToAgeChange,
  onQuoteDeferredPeriodChange,
  onQuoteOccupationClassChange,
  onQuotePensionEscalationChange,
  onQuotePensionExistingFundChange,
  onQuotePensionGenderChange,
  onQuotePensionInflationChange,
  onQuotePensionMonthlyContributionChange,
  onQuotePensionNetGrowthChange,
  onQuotePensionPremiumEscalationChange,
  onQuotePensionRequiredChange,
  onQuotePensionRetirementAgeChange,
  onQuotePensionSpousesPensionChange,
  onQuotePhiIndexationChange,
  onQuoteSmokerChange,
  onTemplateChange,
  onToggleZurichDiscount,
  onUpdateGeneratedOutput,
  tabProgressIndicator,
}: QuoteWorkflowSectionProps) {
  return (
    <div className="page-stack">
      <Accordion flush className="workflow-form-accordion">
        <AccordionItem
          indicator={tabProgressIndicator}
          isOpen={workspaceAccordion.isOpen("quote-output")}
          onToggle={() => workspaceAccordion.toggle("quote-output")}
          title="Quote Form"
        >
          <div className="form-grid form-grid-desktop-3">
            <Input id="quote-name" label="Name" type="text" value={draft.fullName} disabled />
            <Input id="quote-dob" label="Date of Birth" type="date" value={draft.dateOfBirth} disabled />
            <Input id="quote-age" label="Your Age" type="text" value={quoteYourAge} disabled />
            {isPensionsQuoteWorkflow ? (
              <>
                <Select id="quote-pensionGender" label={requiredLabel("Gender")} onChange={(event) => onQuotePensionGenderChange(event.target.value)} options={genderOptions} value={quotePensionGender} />
                <Input id="quote-pensionRetirementAge" label={requiredLabel("Retirement Age")} onChange={(event) => onQuotePensionRetirementAgeChange(event.target.value)} type="text" value={quotePensionRetirementAge} />
                <Select id="quote-pensionSpousesPension" label="Spouse's Pension" onChange={(event) => onQuotePensionSpousesPensionChange(event.target.value)} options={[{ label: "No", value: "No" }, { label: "Yes", value: "Yes" }]} value={quotePensionSpousesPension} />
                <Input id="quote-pensionEscalation" label="Pension Escalation" onChange={(event) => onQuotePensionEscalationChange(event.target.value)} type="text" value={quotePensionEscalation} />
                <Input id="quote-pensionNetGrowth" label="Net Growth" onChange={(event) => onQuotePensionNetGrowthChange(event.target.value)} type="text" value={quotePensionNetGrowth} />
                <Input id="quote-pensionPremiumEscalation" label="Premium Escalation" onChange={(event) => onQuotePensionPremiumEscalationChange(event.target.value)} type="text" value={quotePensionPremiumEscalation} />
                <Input id="quote-pensionInflation" label="Inflation" onChange={(event) => onQuotePensionInflationChange(event.target.value)} type="text" value={quotePensionInflation} />
                <Input id="quote-pensionExistingFund" label="Existing Fund" onChange={(event) => onQuotePensionExistingFundChange(event.target.value)} type="text" value={quotePensionExistingFund} />
                <Input id="quote-pensionRequired" label={requiredLabel("Required Pension Income")} onChange={(event) => onQuotePensionRequiredChange(event.target.value)} type="text" value={quotePensionRequired} />
                <Input id="quote-pensionMonthlyContribution" label={requiredLabel("Monthly Contribution")} onChange={(event) => onQuotePensionMonthlyContributionChange(event.target.value)} type="text" value={quotePensionMonthlyContribution} />
              </>
            ) : (
              <>
                <Input id="quote-annualCoverAmount" label={requiredLabel("Annual Cover Amount")} onChange={(event) => onQuoteAnnualCoverAmountChange(event.target.value)} type="text" value={quoteAnnualCoverAmount} />
                <Select id="quote-coverToAge" label={requiredLabel("Cover to Age")} onChange={(event) => onQuoteCoverToAgeChange(event.target.value)} options={coverAgeOptions} value={quoteCoverToAge} />
                <Select id="quote-occupationClass" label={requiredLabel("Occupation Class")} onChange={(event) => onQuoteOccupationClassChange(event.target.value)} options={phiOccupationalClassOptions} value={quoteOccupationClass} />
                <Select id="quote-deferredPeriod" label={requiredLabel("Deferred Period")} onChange={(event) => onQuoteDeferredPeriodChange(event.target.value)} options={deferredPeriodOptions} value={quoteDeferredPeriod} />
                <Select id="quote-smoker" label={requiredLabel("Smoker")} onChange={(event) => onQuoteSmokerChange(event.target.value)} options={smokerStatusOptions} value={quoteSmoker} />
                <Select id="quote-phiIndexation" label="PHI Indexation" onChange={(event) => onQuotePhiIndexationChange(event.target.value)} options={phiIndexationOptions} value={quotePhiIndexation} />
                <Toggle checked={isAffirmative(draft.zurichDiscountActive)} id="quote-zurichDiscount" label="Apply Zurich 17.5% discount" onChange={(event) => onToggleZurichDiscount(event.target.checked)} />
              </>
            )}
          </div>
          <div style={{ marginTop: "var(--space-4)" }}>
            {renderGenerationRequirements("Quote generation requirements", quoteGenerationRequirements, quoteMissingFields, {
              explainSharedFields: false,
              emphasiseMissing: showQuoteValidation,
            })}
          </div>
        </AccordionItem>
        <AccordionItem
          indicator={getGeneratedDraftStatusLabel(documentDraft.generationStatus)}
          isOpen={workspaceAccordion.isOpen("generated-output")}
          onToggle={() => workspaceAccordion.toggle("generated-output")}
          title="Generated Output"
        >
          <GeneratedOutputWorkspace
            draft={documentDraft}
            emptyMessage="Generate the quote comparison to open the quote workspace."
            generateDisabled={quoteMissingFields.length > 0}
            onContentChange={onUpdateGeneratedOutput}
            onExportDocx={onExportDocx}
            onExportPdf={onExportPdf}
            onGenerate={onGenerate}
            statusLabel={quoteDocumentStatus.replace("Document: ", "")}
            templatePicker={
              <TemplatePicker
                documentType={quoteDocumentType}
                onChange={onTemplateChange}
                selectedTemplateId={documentDraft.selectedTemplateId}
              />
            }
          />
        </AccordionItem>
      </Accordion>
    </div>
  );
}

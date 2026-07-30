import { createDefaultDocumentDrafts } from "../documents/document-templates";
import type { GeneratedDocumentDraft, SupportedDocumentType } from "../documents/document-types";

export type SeededDependant = {
  name: string;
  dateOfBirth: string;
  notes: string;
};

export type SeededSavingsInvestmentRow = {
  financialInstitution: string;
  value: string;
  startDate: string;
  term: string;
};

export type SeededClientFile = {
  id: string;
  category: string;
  originalFilename: string;
  status: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type SeededGeneratedDocument = {
  id: string;
  documentType: string;
  documentName: string;
  version: string;
  status: string;
  generatedAt: string;
  previewHtml?: string;
  previewTitle?: string;
};

export type SeededClientProfile = {
  clientReference: string;
  factFindType: string;
  fullName: string;
  firstName: string;
  surname: string;
  status: string;
  title: string;
  email: string;
  mobileNumber: string;
  workPhone: string;
  dateOfBirth: string;
  maritalStatus: string;
  createdBy: string;
  assignedTo: string;
  updatedBy: string;
  townCity: string;
  county: string;
  homeAddressLine1: string;
  homeAddressLine2: string;
  clientHomeAddressLine3: string;
  clientHomeAddressLine4: string;
  clientWorkAddressLine1: string;
  clientWorkAddressLine2: string;
  clientWorkAddressLine3: string;
  clientWorkAddressLine4: string;
  eircode: string;
  generalNotes: string;
  servicesRequestedLifeProtection: string;
  servicesRequestedIncomeProtection: string;
  servicesRequestedSavingsProtection: string;
  servicesRequestedPensionPlanning: string;
  partnerName: string;
  partnerDateOfBirth: string;
  partnerAddress: string;
  partnerAddressLine1: string;
  partnerAddressLine2: string;
  partnerAddressLine3: string;
  partnerAddressLine4: string;
  partnerHomeMobile: string;
  partnerWorkPhone: string;
  partnerEmail: string;
  dependantsSummary: string;
  dependants: SeededDependant[];
  occupation: string;
  employmentStatus: string;
  employed: string;
  selfEmployed: string;
  income: string;
  gender: string;
  smokerStatus: string;
  provider: string;
  recommendedCover: string;
  premium: string;
  deferredPeriod: string;
  coverAge: string;
  phiOccupationalClass: string;
  phiIndexation: string;
  incomeProtectionNoDeferredProvider: string;
  incomeProtectionNoDeferredDentistProvident: string;
  incomeProtectionNoDeferredDentistGeneral: string;
  incomeProtectionNoDeferredOther: string;
  incomeProtectionNoDeferredCurrentWeeklyCover: string;
  incomeProtectionNoDeferredMonthlyPremium: string;
  incomeProtectionNoDeferredCoverToAge60: string;
  incomeProtectionNoDeferredCoverToAge65: string;
  incomeProtectionDeferredProvider: string;
  incomeProtectionDeferredFriendsFirst: string;
  incomeProtectionDeferredIrishLife: string;
  incomeProtectionDeferredOther: string;
  incomeProtectionDeferred13Weeks: string;
  incomeProtectionDeferred26Weeks: string;
  incomeProtectionDeferred52Weeks: string;
  incomeProtectionDeferredCurrentWeeklyCover: string;
  incomeProtectionDeferredMonthlyPremium: string;
  incomeProtectionDeferredCoverToAge60: string;
  incomeProtectionDeferredCoverToAge65: string;
  assetHomeSelf: string;
  assetHomePartner: string;
  assetLandPropertySelf: string;
  assetLandPropertyPartner: string;
  assetBankBuildSocSelf: string;
  assetBankBuildSocPartner: string;
  assetCreditUnionSelf: string;
  assetCreditUnionPartner: string;
  liabilityMortgageAmount: string;
  liabilityMortgageMonthlyRepayment: string;
  liabilityMortgageProvider: string;
  liabilityMortgageBalanceOutstanding: string;
  liabilityCarLoanAmount: string;
  liabilityCarLoanMonthlyRepayment: string;
  liabilityCarLoanProvider: string;
  liabilityCarLoanBalanceOutstanding: string;
  liabilityOtherLoanPaymentsAmount: string;
  liabilityOtherLoanPaymentsMonthlyRepayment: string;
  liabilityOtherLoanPaymentsProvider: string;
  liabilityOtherLoanPaymentsBalanceOutstanding: string;
  liabilityOthersAmount: string;
  liabilityOthersMonthlyRepayment: string;
  liabilityOthersProvider: string;
  liabilityOthersBalanceOutstanding: string;
  liabilityOthersDetails: string;
  totalLiabilitiesPerMonthSelf: string;
  totalLiabilitiesPerMonthPartner: string;
  totalLiabilitiesPerMonthJoint: string;
  liabilitiesCoveredByOtherInsuranceYes: string;
  liabilitiesCoveredByOtherInsuranceNo: string;
  liabilitiesCoveredByOtherInsuranceDetails: string;
  selfAlreadyRetired: string;
  selfNotRetired: string;
  selfRetirementAge: string;
  selfRetirementIncomeTargetPercent: string;
  selfEmployeeDirectorPensionYes: string;
  selfEmployeeDirectorPensionNo: string;
  selfEmployeeDirectorSchemeType: string;
  selfEmployeeDirectorRetirementAge: string;
  selfEmployeeDirectorEmployerContribution: string;
  selfEmployeeDirectorPersonalContribution: string;
  selfEmployeeDirectorYearsInForce: string;
  selfPersonalPensionYes: string;
  selfPersonalPensionNo: string;
  selfPersonalPensionCompany: string;
  selfPersonalPensionPolicyType: string;
  selfPersonalPensionContribution: string;
  selfPersonalPensionCurrentValue: string;
  selfPersonalPensionYearsInForce: string;
  partnerAlreadyRetired: string;
  partnerNotRetired: string;
  partnerRetirementAge: string;
  partnerRetirementIncomeTargetPercent: string;
  partnerEmployeeDirectorPensionYes: string;
  partnerEmployeeDirectorPensionNo: string;
  partnerEmployeeDirectorSchemeType: string;
  partnerEmployeeDirectorRetirementAge: string;
  partnerEmployeeDirectorEmployerContribution: string;
  partnerEmployeeDirectorPersonalContribution: string;
  partnerEmployeeDirectorYearsInForce: string;
  partnerPersonalPensionYes: string;
  partnerPersonalPensionNo: string;
  partnerPersonalPensionCompany: string;
  partnerPersonalPensionPolicyType: string;
  partnerPersonalPensionContribution: string;
  partnerPersonalPensionCurrentValue: string;
  partnerPersonalPensionYearsInForce: string;
  advisorName: string;
  termsVersion: string;
  termsDeliveryMethod: string;
  termsIssuedBy: string;
  termsClientReceived: string;
  termsClientReviewed: string;
  termsIssuedDate: string;
  termsNotes: string;
  statementType: string;
  statementSelectedQuoteKey: string;
  productType: string;
  letterDate: string;
  zurichDiscountActive: string;
  discountApplied: string;
  taxReliefPercentage: string;
  netMonthlyCost: string;
  coverSummary: string;
  mortgageProtection: string;
  mortgageProtectionYes: string;
  mortgageProtectionNo: string;
  personalInsurance: string;
  keymanInsurance: string;
  partnershipInsurance: string;
  selfLifeInsuranceAmount: string;
  partnerLifeInsuranceAmount: string;
  selfSeriousIllnessAmount: string;
  partnerSeriousIllnessAmount: string;
  savingsInvestmentRows: SeededSavingsInvestmentRow[];
  savingsInvestmentComments: string;
  personalCircumstances: string;
  financialSituation: string;
  needsObjectives: string;
  executionOnlyConfirmation: string;
  termsReviewedReceived: string;
  factFindUpdatePersonalCircumstances: string;
  factFindUpdateFinancialSituation: string;
  factFindUpdateNeedsAndObjectives: string;
  factFindUpdateExecutionOnlyBasis: string;
  factFindUpdateTermsReviewedReceived: string;
  factFindUpdateDataProtectionText: string;
  doNotContact: string;
  agreeToMarketing: string;
  contactByPhone: string;
  contactBySms: string;
  contactByEmail: string;
  contactByPost: string;
  pepConfirmation: string;
  pepRelatedConfirmation: string;
  pepDeclarationConfirmed: string;
  pepDirectlyRelatedConfirmed: string;
  businessSource: string;
  recommendationAcknowledged: string;
  clientSignature1: string;
  clientSignature1Date: string;
  clientSignature2: string;
  clientSignature2Date: string;
  financialAdvisorSignature: string;
  financialAdvisorSignatureDate: string;
  requestClientNames: string;
  requestInfoAddressLine1: string;
  requestInfoAddressLine2: string;
  requestInfoAddressLine3: string;
  requestInfoAddressLine4: string;
  requestDateOfBirth: string;
  requestClientSignature: string;
  requestCompanyName: string;
  requestPolicies: string;
  requestLetterDate: string;
  documentDrafts: Record<SupportedDocumentType, GeneratedDocumentDraft>;
  files: SeededClientFile[];
  generatedDocuments: SeededGeneratedDocument[];
};

function createDefaultSavingsInvestmentRows(): SeededSavingsInvestmentRow[] {
  return Array.from({ length: 3 }, () => ({
    financialInstitution: "",
    value: "",
    startDate: "",
    term: "",
  }));
}

export const seededClientProfiles: Record<string, SeededClientProfile> = {
  "CLI-2026-0001": {
    clientReference: "CLI-2026-0001",
    factFindType: "all",
    fullName: "Test Client",
    firstName: "Test",
    surname: "Client",
    status: "Draft",
    title: "Mr",
    email: "",
    mobileNumber: "",
    workPhone: "",
    dateOfBirth: "1985-04-12",
    maritalStatus: "Married",
    createdBy: "Omega Admin",
    assignedTo: "",
    updatedBy: "Omega Admin",
    townCity: "Dublin",
    county: "Dublin",
    homeAddressLine1: "1 Main Street",
    homeAddressLine2: "",
    clientHomeAddressLine3: "",
    clientHomeAddressLine4: "",
    clientWorkAddressLine1: "",
    clientWorkAddressLine2: "",
    clientWorkAddressLine3: "",
    clientWorkAddressLine4: "",
    eircode: "D01 AB12",
    generalNotes: "",
    servicesRequestedLifeProtection: "",
    servicesRequestedIncomeProtection: "Yes",
    servicesRequestedSavingsProtection: "",
    servicesRequestedPensionPlanning: "",
    partnerName: "Taylor Client",
    partnerDateOfBirth: "",
    partnerAddress: "",
    partnerAddressLine1: "",
    partnerAddressLine2: "",
    partnerAddressLine3: "",
    partnerAddressLine4: "",
    partnerHomeMobile: "",
    partnerWorkPhone: "",
    partnerEmail: "",
    dependantsSummary: "",
    dependants: [],
    occupation: "",
    employmentStatus: "Employed",
    employed: "Yes",
    selfEmployed: "",
    income: "52000",
    gender: "",
    smokerStatus: "",
    provider: "",
    recommendedCover: "26000",
    premium: "145",
    deferredPeriod: "26 weeks",
    coverAge: "65",
    phiOccupationalClass: "",
    phiIndexation: "",
    incomeProtectionNoDeferredProvider: "",
    incomeProtectionNoDeferredDentistProvident: "",
    incomeProtectionNoDeferredDentistGeneral: "",
    incomeProtectionNoDeferredOther: "",
    incomeProtectionNoDeferredCurrentWeeklyCover: "",
    incomeProtectionNoDeferredMonthlyPremium: "",
    incomeProtectionNoDeferredCoverToAge60: "",
    incomeProtectionNoDeferredCoverToAge65: "",
    incomeProtectionDeferredProvider: "",
    incomeProtectionDeferredFriendsFirst: "",
    incomeProtectionDeferredIrishLife: "",
    incomeProtectionDeferredOther: "",
    incomeProtectionDeferred13Weeks: "",
    incomeProtectionDeferred26Weeks: "Yes",
    incomeProtectionDeferred52Weeks: "",
    incomeProtectionDeferredCurrentWeeklyCover: "",
    incomeProtectionDeferredMonthlyPremium: "145",
    incomeProtectionDeferredCoverToAge60: "",
    incomeProtectionDeferredCoverToAge65: "Yes",
    assetHomeSelf: "",
    assetHomePartner: "",
    assetLandPropertySelf: "",
    assetLandPropertyPartner: "",
    assetBankBuildSocSelf: "",
    assetBankBuildSocPartner: "",
    assetCreditUnionSelf: "",
    assetCreditUnionPartner: "",
    liabilityMortgageAmount: "",
    liabilityMortgageMonthlyRepayment: "",
    liabilityMortgageProvider: "",
    liabilityMortgageBalanceOutstanding: "",
    liabilityCarLoanAmount: "",
    liabilityCarLoanMonthlyRepayment: "",
    liabilityCarLoanProvider: "",
    liabilityCarLoanBalanceOutstanding: "",
    liabilityOtherLoanPaymentsAmount: "",
    liabilityOtherLoanPaymentsMonthlyRepayment: "",
    liabilityOtherLoanPaymentsProvider: "",
    liabilityOtherLoanPaymentsBalanceOutstanding: "",
    liabilityOthersAmount: "",
    liabilityOthersMonthlyRepayment: "",
    liabilityOthersProvider: "",
    liabilityOthersBalanceOutstanding: "",
    liabilityOthersDetails: "",
    totalLiabilitiesPerMonthSelf: "",
    totalLiabilitiesPerMonthPartner: "",
    totalLiabilitiesPerMonthJoint: "",
    liabilitiesCoveredByOtherInsuranceYes: "",
    liabilitiesCoveredByOtherInsuranceNo: "",
    liabilitiesCoveredByOtherInsuranceDetails: "",
    selfAlreadyRetired: "",
    selfNotRetired: "Yes",
    selfRetirementAge: "",
    selfRetirementIncomeTargetPercent: "",
    selfEmployeeDirectorPensionYes: "",
    selfEmployeeDirectorPensionNo: "",
    selfEmployeeDirectorSchemeType: "",
    selfEmployeeDirectorRetirementAge: "",
    selfEmployeeDirectorEmployerContribution: "",
    selfEmployeeDirectorPersonalContribution: "",
    selfEmployeeDirectorYearsInForce: "",
    selfPersonalPensionYes: "",
    selfPersonalPensionNo: "",
    selfPersonalPensionCompany: "",
    selfPersonalPensionPolicyType: "",
    selfPersonalPensionContribution: "",
    selfPersonalPensionCurrentValue: "",
    selfPersonalPensionYearsInForce: "",
    partnerAlreadyRetired: "",
    partnerNotRetired: "Yes",
    partnerRetirementAge: "",
    partnerRetirementIncomeTargetPercent: "",
    partnerEmployeeDirectorPensionYes: "",
    partnerEmployeeDirectorPensionNo: "",
    partnerEmployeeDirectorSchemeType: "",
    partnerEmployeeDirectorRetirementAge: "",
    partnerEmployeeDirectorEmployerContribution: "",
    partnerEmployeeDirectorPersonalContribution: "",
    partnerEmployeeDirectorYearsInForce: "",
    partnerPersonalPensionYes: "",
    partnerPersonalPensionNo: "",
    partnerPersonalPensionCompany: "",
    partnerPersonalPensionPolicyType: "",
    partnerPersonalPensionContribution: "",
    partnerPersonalPensionCurrentValue: "",
    partnerPersonalPensionYearsInForce: "",
    advisorName: "",
    termsVersion: "January 2026",
    termsDeliveryMethod: "Post",
    termsIssuedBy: "Omega Admin",
    termsClientReceived: "Pending confirmation",
    termsClientReviewed: "Pending confirmation",
    termsIssuedDate: "",
    termsNotes: "Issue with Income Protection recommendation pack.",
    statementType: "",
    statementSelectedQuoteKey: "",
    productType: "",
    letterDate: "2026-01-15",
    zurichDiscountActive: "",
    discountApplied: "",
    taxReliefPercentage: "",
    netMonthlyCost: "116",
    coverSummary: "",
    mortgageProtection: "No",
    mortgageProtectionYes: "",
    mortgageProtectionNo: "Yes",
    personalInsurance: "No",
    keymanInsurance: "No",
    partnershipInsurance: "No",
    selfLifeInsuranceAmount: "",
    partnerLifeInsuranceAmount: "",
    selfSeriousIllnessAmount: "",
    partnerSeriousIllnessAmount: "",
    savingsInvestmentRows: createDefaultSavingsInvestmentRows(),
    savingsInvestmentComments: "",
    personalCircumstances: "Partner noted: Taylor Client",
    financialSituation: "Annual income currently recorded as 52000.",
    needsObjectives: "Income Protection cover review requested.",
    executionOnlyConfirmation: "Pending",
    termsReviewedReceived: "Pending",
    factFindUpdatePersonalCircumstances: "",
    factFindUpdateFinancialSituation: "",
    factFindUpdateNeedsAndObjectives: "",
    factFindUpdateExecutionOnlyBasis: "",
    factFindUpdateTermsReviewedReceived: "",
    factFindUpdateDataProtectionText: "",
    doNotContact: "",
    agreeToMarketing: "",
    contactByPhone: "No preference recorded",
    contactBySms: "No preference recorded",
    contactByEmail: "No",
    contactByPost: "No preference recorded",
    pepConfirmation: "Not confirmed",
    pepRelatedConfirmation: "Not confirmed",
    pepDeclarationConfirmed: "",
    pepDirectlyRelatedConfirmed: "",
    businessSource: "Existing client referral",
    recommendationAcknowledged: "",
    clientSignature1: "Pending",
    clientSignature1Date: "",
    clientSignature2: "Pending",
    clientSignature2Date: "",
    financialAdvisorSignature: "",
    financialAdvisorSignatureDate: "",
    requestClientNames: "Test Client",
    requestInfoAddressLine1: "1 Main Street",
    requestInfoAddressLine2: "Dublin",
    requestInfoAddressLine3: "",
    requestInfoAddressLine4: "",
    requestDateOfBirth: "1985-04-12",
    requestClientSignature: "",
    requestCompanyName: "",
    requestPolicies: "Income Protection",
    requestLetterDate: "2026-01-15",
    documentDrafts: {
      ...createDefaultDocumentDrafts(),
      "Fact Find": {
        ...createDefaultDocumentDrafts()["Fact Find"],
        generationStatus: "completed",
        lastGeneratedHtml: "<p>Income protection fact find draft generated for Test Client.</p>",
        lastGeneratedSections: [
          {
            id: "summary",
            title: "Summary",
            bodyHtml: "<p>Income protection fact find draft generated for Test Client.</p>",
          },
        ],
      },
    },
    files: [
      {
        id: "FILE-0001",
        category: "Generated Documents",
        originalFilename: "Client_Fact_Find_Draft.docx",
        status: "Approved",
        uploadedBy: "Omega Admin",
        uploadedAt: "2026-01-15",
      },
    ],
    generatedDocuments: [
        {
          id: "DOC-0001",
          documentType: "Fact Find",
          documentName: "Client_Fact_Find_Draft.docx",
          version: "Version 1",
          status: "DOCX ready",
          generatedAt: "2026-01-15",
          previewHtml:
            '<article class="workflow-document workflow-document-fact-find"><header class="document-banner"><p class="document-eyebrow">Fact Find</p><h1>Income Protection Fact Find</h1><p class="document-subtitle">Test Client (CLI-2026-0001)</p></header><section class="document-section"><h2>Summary</h2><p>Income protection fact find draft generated for Test Client.</p></section><footer class="signatures-footer"><h2>Signatures and Record</h2><p><strong>Advisor:</strong> Omega Advisor</p><p><strong>Client signature:</strong> Pending</p></footer></article>',
          previewTitle: "Fact Find",
        },
    ],
  },
  "CLI-2026-0002": {
    clientReference: "CLI-2026-0002",
    factFindType: "all",
    fullName: "Jamie Murphy",
    firstName: "Jamie",
    surname: "Murphy",
    status: "Active",
    title: "Ms",
    email: "jamie.murphy@example.com",
    mobileNumber: "0870000002",
    workPhone: "014000002",
    dateOfBirth: "1990-11-08",
    maritalStatus: "Single",
    createdBy: "Office Staff",
    assignedTo: "",
    updatedBy: "Office Staff",
    townCity: "Galway",
    county: "Galway",
    homeAddressLine1: "15 Sea Road",
    homeAddressLine2: "",
    clientHomeAddressLine3: "",
    clientHomeAddressLine4: "",
    clientWorkAddressLine1: "",
    clientWorkAddressLine2: "",
    clientWorkAddressLine3: "",
    clientWorkAddressLine4: "",
    eircode: "H91 CD34",
    generalNotes: "",
    servicesRequestedLifeProtection: "",
    servicesRequestedIncomeProtection: "Yes",
    servicesRequestedSavingsProtection: "",
    servicesRequestedPensionPlanning: "",
    partnerName: "",
    partnerDateOfBirth: "",
    partnerAddress: "",
    partnerAddressLine1: "",
    partnerAddressLine2: "",
    partnerAddressLine3: "",
    partnerAddressLine4: "",
    partnerHomeMobile: "",
    partnerWorkPhone: "",
    partnerEmail: "",
    dependantsSummary: "Ella Murphy",
    dependants: [{ name: "Ella Murphy", dateOfBirth: "2017-06-20", notes: "Child" }],
    occupation: "Project Analyst",
    employmentStatus: "Employed",
    employed: "Yes",
    selfEmployed: "",
    income: "60000",
    gender: "Female",
    smokerStatus: "Non-Smoker",
    provider: "Zurich Life",
    recommendedCover: "30000",
    premium: "165",
    deferredPeriod: "13 weeks",
    coverAge: "65",
    phiOccupationalClass: "2",
    phiIndexation: "Y",
    incomeProtectionNoDeferredProvider: "",
    incomeProtectionNoDeferredDentistProvident: "",
    incomeProtectionNoDeferredDentistGeneral: "",
    incomeProtectionNoDeferredOther: "",
    incomeProtectionNoDeferredCurrentWeeklyCover: "",
    incomeProtectionNoDeferredMonthlyPremium: "",
    incomeProtectionNoDeferredCoverToAge60: "",
    incomeProtectionNoDeferredCoverToAge65: "",
    incomeProtectionDeferredProvider: "Zurich Life",
    incomeProtectionDeferredFriendsFirst: "",
    incomeProtectionDeferredIrishLife: "",
    incomeProtectionDeferredOther: "",
    incomeProtectionDeferred13Weeks: "Yes",
    incomeProtectionDeferred26Weeks: "",
    incomeProtectionDeferred52Weeks: "",
    incomeProtectionDeferredCurrentWeeklyCover: "30000",
    incomeProtectionDeferredMonthlyPremium: "165",
    incomeProtectionDeferredCoverToAge60: "",
    incomeProtectionDeferredCoverToAge65: "Yes",
    assetHomeSelf: "",
    assetHomePartner: "",
    assetLandPropertySelf: "",
    assetLandPropertyPartner: "",
    assetBankBuildSocSelf: "",
    assetBankBuildSocPartner: "",
    assetCreditUnionSelf: "",
    assetCreditUnionPartner: "",
    liabilityMortgageAmount: "",
    liabilityMortgageMonthlyRepayment: "",
    liabilityMortgageProvider: "",
    liabilityMortgageBalanceOutstanding: "",
    liabilityCarLoanAmount: "",
    liabilityCarLoanMonthlyRepayment: "",
    liabilityCarLoanProvider: "",
    liabilityCarLoanBalanceOutstanding: "",
    liabilityOtherLoanPaymentsAmount: "",
    liabilityOtherLoanPaymentsMonthlyRepayment: "",
    liabilityOtherLoanPaymentsProvider: "",
    liabilityOtherLoanPaymentsBalanceOutstanding: "",
    liabilityOthersAmount: "",
    liabilityOthersMonthlyRepayment: "",
    liabilityOthersProvider: "",
    liabilityOthersBalanceOutstanding: "",
    liabilityOthersDetails: "",
    totalLiabilitiesPerMonthSelf: "",
    totalLiabilitiesPerMonthPartner: "",
    totalLiabilitiesPerMonthJoint: "",
    liabilitiesCoveredByOtherInsuranceYes: "",
    liabilitiesCoveredByOtherInsuranceNo: "",
    liabilitiesCoveredByOtherInsuranceDetails: "",
    selfAlreadyRetired: "",
    selfNotRetired: "Yes",
    selfRetirementAge: "",
    selfRetirementIncomeTargetPercent: "",
    selfEmployeeDirectorPensionYes: "",
    selfEmployeeDirectorPensionNo: "",
    selfEmployeeDirectorSchemeType: "",
    selfEmployeeDirectorRetirementAge: "",
    selfEmployeeDirectorEmployerContribution: "",
    selfEmployeeDirectorPersonalContribution: "",
    selfEmployeeDirectorYearsInForce: "",
    selfPersonalPensionYes: "",
    selfPersonalPensionNo: "",
    selfPersonalPensionCompany: "",
    selfPersonalPensionPolicyType: "",
    selfPersonalPensionContribution: "",
    selfPersonalPensionCurrentValue: "",
    selfPersonalPensionYearsInForce: "",
    partnerAlreadyRetired: "",
    partnerNotRetired: "Yes",
    partnerRetirementAge: "",
    partnerRetirementIncomeTargetPercent: "",
    partnerEmployeeDirectorPensionYes: "",
    partnerEmployeeDirectorPensionNo: "",
    partnerEmployeeDirectorSchemeType: "",
    partnerEmployeeDirectorRetirementAge: "",
    partnerEmployeeDirectorEmployerContribution: "",
    partnerEmployeeDirectorPersonalContribution: "",
    partnerEmployeeDirectorYearsInForce: "",
    partnerPersonalPensionYes: "",
    partnerPersonalPensionNo: "",
    partnerPersonalPensionCompany: "",
    partnerPersonalPensionPolicyType: "",
    partnerPersonalPensionContribution: "",
    partnerPersonalPensionCurrentValue: "",
    partnerPersonalPensionYearsInForce: "",
    advisorName: "Office Staff",
    termsVersion: "January 2026",
    termsDeliveryMethod: "Email",
    termsIssuedBy: "Office Staff",
    termsClientReceived: "Pending confirmation",
    termsClientReviewed: "Pending confirmation",
    termsIssuedDate: "2026-06-06",
    termsNotes: "Issue with Income Protection recommendation pack.",
    statementType: "Full Advice",
    statementSelectedQuoteKey: "",
    productType: "Income Protection Plan",
    letterDate: "2026-06-06",
    zurichDiscountActive: "",
    discountApplied: "",
    taxReliefPercentage: "",
    netMonthlyCost: "132",
    coverSummary: "",
    mortgageProtection: "No",
    mortgageProtectionYes: "",
    mortgageProtectionNo: "Yes",
    personalInsurance: "No",
    keymanInsurance: "No",
    partnershipInsurance: "No",
    selfLifeInsuranceAmount: "",
    partnerLifeInsuranceAmount: "",
    selfSeriousIllnessAmount: "",
    partnerSeriousIllnessAmount: "",
    savingsInvestmentRows: createDefaultSavingsInvestmentRows(),
    savingsInvestmentComments: "",
    personalCircumstances: "",
    financialSituation: "Annual income currently recorded as 60000.",
    needsObjectives: "Income Protection cover review requested.",
    executionOnlyConfirmation: "Pending",
    termsReviewedReceived: "Pending",
    factFindUpdatePersonalCircumstances: "",
    factFindUpdateFinancialSituation: "",
    factFindUpdateNeedsAndObjectives: "",
    factFindUpdateExecutionOnlyBasis: "",
    factFindUpdateTermsReviewedReceived: "",
    factFindUpdateDataProtectionText: "",
    doNotContact: "",
    agreeToMarketing: "",
    contactByPhone: "No preference recorded",
    contactBySms: "No preference recorded",
    contactByEmail: "Yes",
    contactByPost: "No preference recorded",
    pepConfirmation: "Not confirmed",
    pepRelatedConfirmation: "Not confirmed",
    pepDeclarationConfirmed: "",
    pepDirectlyRelatedConfirmed: "",
    businessSource: "Existing client referral",
    recommendationAcknowledged: "",
    clientSignature1: "Pending",
    clientSignature1Date: "",
    clientSignature2: "Pending",
    clientSignature2Date: "",
    financialAdvisorSignature: "Office Staff",
    financialAdvisorSignatureDate: "",
    requestClientNames: "Jamie Murphy",
    requestInfoAddressLine1: "15 Sea Road",
    requestInfoAddressLine2: "Galway",
    requestInfoAddressLine3: "",
    requestInfoAddressLine4: "",
    requestDateOfBirth: "1990-11-08",
    requestClientSignature: "",
    requestCompanyName: "Zurich Life",
    requestPolicies: "Income Protection",
    requestLetterDate: "2026-06-06",
    documentDrafts: {
      ...createDefaultDocumentDrafts(),
      "Terms of Business": {
        ...createDefaultDocumentDrafts()["Terms of Business"],
        generationStatus: "completed",
        lastGeneratedHtml: "<p>Terms of Business issued to Jamie Murphy.</p>",
        lastGeneratedSections: [
          {
            id: "issue-details",
            title: "Issue Details",
            bodyHtml: "<p>Terms of Business issued to Jamie Murphy.</p>",
          },
        ],
      },
      "Statement of Suitability": {
        ...createDefaultDocumentDrafts()["Statement of Suitability"],
        generationStatus: "completed",
        lastGeneratedHtml: "<p>Statement of Suitability prepared for Jamie Murphy.</p>",
        lastGeneratedSections: [
          {
            id: "recommendation",
            title: "Recommendation",
            bodyHtml: "<p>Statement of Suitability prepared for Jamie Murphy.</p>",
          },
        ],
        integrationRequests: [
          {
            provider: "BestAdvice",
            requestType: "Phi",
            status: "sent",
            requestedAt: "2026-06-29T10:00:00+00:00",
            requestFields: [{ label: "Age", value: "30" }],
            quoteResults: [
              {
                providerName: "Aviva",
                policyType: "Reviewable",
                levelPremium: "102.50",
                escalation3Premium: "116.40",
              },
              {
                providerName: "Irish Life",
                policyType: "Guaranteed",
                levelPremium: "136.53",
                escalation5Premium: "149.78",
              },
            ],
            errors: [],
          },
        ],
      },
    },
    files: [
      {
        id: "FILE-0002",
        category: "Proof of Age",
        originalFilename: "jamie-murphy-passport.pdf",
        status: "Pending review",
        uploadedBy: "Office Staff",
        uploadedAt: "2026-06-06",
      },
      {
        id: "FILE-0003",
        category: "Generated Documents",
        originalFilename: "Jamie_Murphy_Statement_of_Suitability_2026-06-06.pdf",
        status: "Approved",
        uploadedBy: "Office Staff",
        uploadedAt: "2026-06-06",
      },
    ],
    generatedDocuments: [
        {
          id: "DOC-0002",
          documentType: "Statement of Suitability",
          documentName: "Jamie_Murphy_Statement_of_Suitability_2026-06-06.pdf",
          version: "Version 1",
          status: "PDF ready",
          generatedAt: "2026-06-06",
          previewHtml:
            '<article class="workflow-document workflow-document-statement-of-suitability"><header class="document-banner"><p class="document-eyebrow">Statement of Suitability</p><h1>Statement of Suitability</h1><p class="document-subtitle">Jamie Murphy (CLI-2026-0002)</p></header><section class="document-section"><h2>Recommendation</h2><p>Statement of Suitability prepared for Jamie Murphy.</p></section><footer class="signatures-footer"><h2>Signatures and Record</h2><p><strong>Advisor:</strong> Office Staff</p><p><strong>Client signature:</strong> Pending</p></footer></article>',
          previewTitle: "Statement of Suitability",
        },
        {
          id: "DOC-0003",
          documentType: "Terms of Business",
          documentName: "Jamie_Murphy_Terms_of_Business_2026-06-06.pdf",
          version: "Version 1",
          status: "PDF ready",
          generatedAt: "2026-06-06",
          previewHtml:
            '<article class="workflow-document workflow-document-terms-of-business"><header class="document-banner"><p class="document-eyebrow">Terms of Business</p><h1>Terms of Business</h1><p class="document-subtitle">Jamie Murphy (CLI-2026-0002)</p></header><section class="document-section"><h2>Issue Details</h2><p>Terms of Business issued to Jamie Murphy.</p></section><footer class="signatures-footer"><h2>Signatures and Record</h2><p><strong>Advisor:</strong> Office Staff</p><p><strong>Client signature:</strong> Pending</p></footer></article>',
          previewTitle: "Terms of Business",
        },
    ],
  },
};

export function createSeededClientProfiles() {
  return JSON.parse(JSON.stringify(seededClientProfiles)) as Record<string, SeededClientProfile>;
}

export function getSeededClientProfile(clientReference: string) {
  return seededClientProfiles[clientReference];
}

export function listSeededClientProfiles() {
  return Object.values(seededClientProfiles);
}

export function listSeededGeneratedDocuments() {
  return listSeededClientProfiles().flatMap((client) =>
    client.generatedDocuments.map((document) => ({
      ...document,
      clientReference: client.clientReference,
      clientName: client.fullName,
    })),
  );
}

export function listSeededClientFiles() {
  return listSeededClientProfiles().flatMap((client) =>
    client.files.map((file) => ({
      ...file,
      clientReference: client.clientReference,
      clientName: client.fullName,
    })),
  );
}

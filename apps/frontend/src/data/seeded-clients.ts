export type SeededDependant = {
  name: string;
  dateOfBirth: string;
  notes: string;
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
};

export type SeededClientProfile = {
  clientReference: string;
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
  updatedBy: string;
  townCity: string;
  county: string;
  partnerName: string;
  dependants: SeededDependant[];
  occupation: string;
  employmentStatus: string;
  income: string;
  provider: string;
  recommendedCover: string;
  premium: string;
  deferredPeriod: string;
  coverAge: string;
  advisorName: string;
  termsVersion: string;
  termsDeliveryMethod: string;
  termsIssuedBy: string;
  termsClientReceived: string;
  termsClientReviewed: string;
  termsNotes: string;
  statementType: string;
  productType: string;
  letterDate: string;
  netMonthlyCost: string;
  mortgageProtection: string;
  personalInsurance: string;
  keymanInsurance: string;
  partnershipInsurance: string;
  selfLifeInsuranceAmount: string;
  partnerSeriousIllnessAmount: string;
  personalCircumstances: string;
  financialSituation: string;
  needsObjectives: string;
  executionOnlyConfirmation: string;
  termsReviewedReceived: string;
  contactByPhone: string;
  contactBySms: string;
  contactByEmail: string;
  contactByPost: string;
  pepConfirmation: string;
  pepRelatedConfirmation: string;
  businessSource: string;
  clientSignature1: string;
  clientSignature1Date: string;
  clientSignature2: string;
  financialAdvisorSignature: string;
  requestCompanyName: string;
  requestPolicies: string;
  requestLetterDate: string;
  files: SeededClientFile[];
  generatedDocuments: SeededGeneratedDocument[];
};

export const seededClientProfiles: Record<string, SeededClientProfile> = {
  "CLI-2026-0001": {
    clientReference: "CLI-2026-0001",
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
    updatedBy: "Omega Admin",
    townCity: "Dublin",
    county: "Dublin",
    partnerName: "Taylor Client",
    dependants: [],
    occupation: "",
    employmentStatus: "Employed",
    income: "52000",
    provider: "",
    recommendedCover: "26000",
    premium: "145",
    deferredPeriod: "26 weeks",
    coverAge: "65",
    advisorName: "",
    termsVersion: "January 2026",
    termsDeliveryMethod: "Post",
    termsIssuedBy: "Omega Admin",
    termsClientReceived: "Pending confirmation",
    termsClientReviewed: "Pending confirmation",
    termsNotes: "Issue with Income Protection recommendation pack.",
    statementType: "Personal Income Protection",
    productType: "",
    letterDate: "2026-01-15",
    netMonthlyCost: "116",
    mortgageProtection: "No",
    personalInsurance: "No",
    keymanInsurance: "No",
    partnershipInsurance: "No",
    selfLifeInsuranceAmount: "",
    partnerSeriousIllnessAmount: "",
    personalCircumstances: "Partner noted: Taylor Client",
    financialSituation: "Annual income currently recorded as 52000.",
    needsObjectives: "Income Protection cover review requested.",
    executionOnlyConfirmation: "Pending",
    termsReviewedReceived: "Pending",
    contactByPhone: "No preference recorded",
    contactBySms: "No preference recorded",
    contactByEmail: "No",
    contactByPost: "No preference recorded",
    pepConfirmation: "Not confirmed",
    pepRelatedConfirmation: "Not confirmed",
    businessSource: "Existing client referral",
    clientSignature1: "Pending",
    clientSignature1Date: "",
    clientSignature2: "Pending",
    financialAdvisorSignature: "",
    requestCompanyName: "",
    requestPolicies: "Income Protection",
    requestLetterDate: "2026-01-15",
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
      },
    ],
  },
  "CLI-2026-0002": {
    clientReference: "CLI-2026-0002",
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
    updatedBy: "Office Staff",
    townCity: "Galway",
    county: "Galway",
    partnerName: "",
    dependants: [{ name: "Ella Murphy", dateOfBirth: "2017-06-20", notes: "Child" }],
    occupation: "Project Analyst",
    employmentStatus: "Employed",
    income: "60000",
    provider: "Zurich Life",
    recommendedCover: "30000",
    premium: "165",
    deferredPeriod: "13 weeks",
    coverAge: "65",
    advisorName: "Office Staff",
    termsVersion: "January 2026",
    termsDeliveryMethod: "Email",
    termsIssuedBy: "Office Staff",
    termsClientReceived: "Pending confirmation",
    termsClientReviewed: "Pending confirmation",
    termsNotes: "Issue with Income Protection recommendation pack.",
    statementType: "Personal Income Protection",
    productType: "Income Protection Plan",
    letterDate: "2026-06-06",
    netMonthlyCost: "132",
    mortgageProtection: "No",
    personalInsurance: "No",
    keymanInsurance: "No",
    partnershipInsurance: "No",
    selfLifeInsuranceAmount: "",
    partnerSeriousIllnessAmount: "",
    personalCircumstances: "",
    financialSituation: "Annual income currently recorded as 60000.",
    needsObjectives: "Income Protection cover review requested.",
    executionOnlyConfirmation: "Pending",
    termsReviewedReceived: "Pending",
    contactByPhone: "No preference recorded",
    contactBySms: "No preference recorded",
    contactByEmail: "Yes",
    contactByPost: "No preference recorded",
    pepConfirmation: "Not confirmed",
    pepRelatedConfirmation: "Not confirmed",
    businessSource: "Existing client referral",
    clientSignature1: "Pending",
    clientSignature1Date: "",
    clientSignature2: "Pending",
    financialAdvisorSignature: "Office Staff",
    requestCompanyName: "Zurich Life",
    requestPolicies: "Income Protection",
    requestLetterDate: "2026-06-06",
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
      },
      {
        id: "DOC-0003",
        documentType: "Terms of Business",
        documentName: "Jamie_Murphy_Terms_of_Business_2026-06-06.pdf",
        version: "Version 1",
        status: "PDF ready",
        generatedAt: "2026-06-06",
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

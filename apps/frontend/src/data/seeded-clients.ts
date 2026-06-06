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
  statementType: string;
  productType: string;
  letterDate: string;
  netMonthlyCost: string;
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
    statementType: "Personal Income Protection",
    productType: "",
    letterDate: "2026-01-15",
    netMonthlyCost: "116",
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
    statementType: "Personal Income Protection",
    productType: "Income Protection Plan",
    letterDate: "2026-06-06",
    netMonthlyCost: "132",
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

export function getSeededClientProfile(clientReference: string) {
  return seededClientProfiles[clientReference];
}

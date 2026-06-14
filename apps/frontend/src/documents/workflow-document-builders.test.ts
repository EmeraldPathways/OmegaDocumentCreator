import { describe, expect, it } from "vitest";

import { getSeededClientProfile, type SeededClientProfile } from "../data/seeded-clients";
import { buildWorkflowDocument } from "./workflow-document-builders";

function cloneProfile(clientReference: string) {
  return JSON.parse(JSON.stringify(getSeededClientProfile(clientReference))) as SeededClientProfile;
}

describe("buildWorkflowDocument", () => {
  it("returns composed statement html that merges saved draft narrative sections with workflow values", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Statement of Suitability"].lastGeneratedSections = [
      {
        id: "recommendation",
        title: "Recommendation Section",
        bodyHtml: "<p>AI recommendation narrative for Jamie Murphy.</p>",
      },
      {
        id: "needs",
        title: "Needs and Objectives",
        bodyHtml: "<p>AI needs narrative tailored to the client goals.</p>",
      },
      {
        id: "warnings",
        title: "Warnings",
        bodyHtml: "<p>Benefits may be limited by underwriting and policy definitions.</p>",
      },
    ];

    const document = buildWorkflowDocument(profile, "Statement of Suitability");

    expect(document.title).toBe("Statement of Suitability");
    expect(document.html).toContain("document-banner");
    expect(document.html).toContain("client-summary-grid");
    expect(document.html).toContain("AI recommendation narrative for Jamie Murphy.");
    expect(document.html).toContain("AI needs narrative tailored to the client goals.");
    expect(document.html).toContain("Benefits may be limited by underwriting and policy definitions.");
    expect(document.html).toContain("signatures-footer");
    expect(document.html).toContain("Omega Financial");
    expect(document.html).toContain("Recommended cover");
    expect(document.html).toContain("30000");
    expect(document.html).toContain("Personal Income Protection");
    expect(document.html).toContain("132");
    expect(document.html).toContain("2026-06-06");
    expect(document.html).toContain("Not confirmed");
    expect(document.html).toContain("Pending");
  });

  it("preserves fact find contact address and employment coverage when no generated draft exists", () => {
    const profile = cloneProfile("CLI-2026-0001");
    profile.documentDrafts["Fact Find"].lastGeneratedSections = [];

    const document = buildWorkflowDocument(profile, "Fact Find");

    expect(document.title).toBe("Fact Find");
    expect(document.html).toContain("document-banner");
    expect(document.html).toContain("client-summary-grid");
    expect(document.html).toContain("Income Protection Fact Find");
    expect(document.html).toContain("Income Protection cover review requested.");
    expect(document.html).toContain("Please confirm that the information captured in this fact find is complete and accurate.");
    expect(document.html).toContain("Dublin");
    expect(document.html).toContain("Married");
    expect(document.html).toContain("Employed");
    expect(document.html).toContain("52000");
    expect(document.html).toContain("26 weeks");
    expect(document.html).toContain("Not recorded");
    expect(document.html).toContain("signatures-footer");
  });

  it("preserves terms of business issue confirmations and contact preferences", () => {
    const profile = cloneProfile("CLI-2026-0002");
    profile.documentDrafts["Terms of Business"].lastGeneratedSections = [];

    const document = buildWorkflowDocument(profile, "Terms of Business");

    expect(document.title).toBe("Terms of Business");
    expect(document.html).toContain("document-banner");
    expect(document.html).toContain("client-summary-grid");
    expect(document.html).toContain("January 2026");
    expect(document.html).toContain("Email");
    expect(document.html).toContain("Pending confirmation");
    expect(document.html).toContain("No preference recorded");
    expect(document.html).toContain("Yes");
    expect(document.html).toContain("Issue with Income Protection recommendation pack.");
    expect(document.html).toContain("signatures-footer");
  });
});

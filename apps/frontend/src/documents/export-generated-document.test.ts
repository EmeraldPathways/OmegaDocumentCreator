import { describe, expect, it } from "vitest";

import { getSeededClientProfile, type SeededClientProfile } from "../data/seeded-clients";
import { buildExportDocumentArtifact } from "./export-generated-document";

function cloneProfile(clientReference: string) {
  return JSON.parse(JSON.stringify(getSeededClientProfile(clientReference))) as SeededClientProfile;
}

describe("buildExportDocumentArtifact", () => {
  it("merges heading-based editor html back into the composed export shell", () => {
    const profile = cloneProfile("CLI-2026-0002");

    const artifact = buildExportDocumentArtifact(profile, "Fact Find", {
      title: "Fact Find",
      html: [
        "<h1>Income Protection Fact Find</h1>",
        "<p>Jamie Murphy (CLI-2026-0002)</p>",
        "<h2>Recommendation Section</h2>",
        "<p>Edited recommendation for export.</p>",
        "<h2>Needs and Objectives</h2>",
        "<p>Edited needs for export.</p>",
      ].join(""),
    });

    expect(artifact.html).toContain("document-banner");
    expect(artifact.html).toContain("signatures-footer");
    expect(artifact.html).toContain("Edited recommendation for export.");
    expect(artifact.html).toContain("Edited needs for export.");
    expect(artifact.html).toContain("Client Summary");
    expect(artifact.html).toContain("Contact Details");
  });
});

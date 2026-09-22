import { describe, expect, it } from "vitest";

import { createEmptyClientProfile } from "./seeded-clients";
import { mergeGeneratedDraftIntoProfile } from "./generated-draft-persistence";

describe("generated draft persistence", () => {
  it("merges completed output into the workflow profile for backend persistence", () => {
    const profile = createEmptyClientProfile({
      clientReference: "Omega-2026-000001",
      firstName: "Test",
      surname: "Tester",
    });

    const next = mergeGeneratedDraftIntoProfile(profile, "Fact Find", {
      generationStatus: "completed",
      lastGeneratedHtml: "<h1>Fact Find</h1>",
      editedHtml: "<article>Fact Find output</article>",
    });

    expect(next.clientReference).toBe(profile.clientReference);
    expect(next.documentDrafts["Fact Find"].generationStatus).toBe("completed");
    expect(next.documentDrafts["Fact Find"].lastGeneratedHtml).toBe("<h1>Fact Find</h1>");
    expect(next.documentDrafts["Fact Find"].editedHtml).toBe("<article>Fact Find output</article>");
  });
});

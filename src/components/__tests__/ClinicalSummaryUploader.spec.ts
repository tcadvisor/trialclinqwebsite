import { describe, it, expect } from "vitest";
import { buildMarkdownAppend } from "../ClinicalSummaryUploader";

describe("ClinicalSummaryUploader - markdown builder", () => {
  it("includes heading, request id, and compact eligibility line", () => {
    const md = buildMarkdownAppend(
      {
        summaryMarkdown: "- 62 y/o female with breast cancer.",
        eligibility: {
          overall: "Likely eligible",
          criteria: [
            { id: "inc-age>=18", meets: true, evidence: "Age 62" },
            { id: "exc-active-infection", meets: false, evidence: "None" },
          ],
          missing: ["Hep B surface antigen"],
        },
        audit: { requestId: "REQ-123", generatedAt: "2025-09-22T00:00:00.000Z" },
      },
      true,
    );

    expect(md).toMatch(/### Clinical Record Summary \(auto-generated\)/);
    expect(md).toMatch(/Request ID: REQ-123/);
    expect(md).toMatch(/Eligibility — Overall: Likely eligible/);
    expect(md).not.toMatch(/####/);
  });

  it("skips eligibility when not provided", () => {
    const md = buildMarkdownAppend(
      { summaryMarkdown: "Summary", eligibility: undefined, audit: { requestId: "X" } },
      true,
    );
    expect(md).not.toMatch(/Eligibility —/);
  });
});

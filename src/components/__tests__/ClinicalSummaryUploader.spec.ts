import { describe, it, expect } from "vitest";
import { buildMarkdownAppend } from "../ClinicalSummaryUploader";

describe("ClinicalSummaryUploader - markdown builder", () => {
  it("includes heading and request id and eligibility", () => {
    const md = buildMarkdownAppend(
      {
        summaryMarkdown: "Patient is a 62-year-old...",
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
    expect(md).toMatch(/#### Trial Eligibility/);
    expect(md).toMatch(/Overall: Likely eligible/);
    expect(md).toMatch(/inc-age/);
    expect(md).toMatch(/Missing data/);
  });

  it("skips eligibility when not provided", () => {
    const md = buildMarkdownAppend(
      { summaryMarkdown: "Summary", eligibility: undefined, audit: { requestId: "X" } },
      true,
    );
    expect(md).not.toMatch(/Trial Eligibility/);
  });
});

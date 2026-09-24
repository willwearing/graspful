// @vitest-environment node
import { TOOL_SCHEMAS } from "../../../../../../packages/mcp/src/tool-schemas";
import { describe, expect, it } from "vitest";
import { QUALITY_CHECK_METADATA } from "@graspful/shared";
import { GET } from "../route";

function mcpToolContracts() {
  return Object.entries(TOOL_SCHEMAS).map(([name, schema]) => ({
    name,
    required: Object.entries(schema.shape).filter(([, field]) => !field.isOptional()).map(([field]) => field),
    optional: Object.entries(schema.shape).filter(([, field]) => field.isOptional()).map(([field]) => field),
  }));
}

describe("GET /llms-full.txt", () => {
  it("serves plain text with the actual publication check registry", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    const text = await response.text();
    for (const check of QUALITY_CHECK_METADATA) {
      expect(text).toContain(`**${check.name}**: ${check.description}`);
      expect(text).toContain(`Fix: ${check.fix}`);
    }
    expect(text).toContain(`A score of ${QUALITY_CHECK_METADATA.length}/${QUALITY_CHECK_METADATA.length} means all automated checks passed`);
    expect(text).toContain("Review the source, answer keys, teaching, and learner experience");
  });

  it("documents the current MCP tool names and exact required and optional inputs", async () => {
    const text = await (await GET()).text();
    const contracts = mcpToolContracts();
    const documentedTools = [...text.matchAll(/^### (graspful_\w+)/gm)].map((match) => match[1]);
    expect(documentedTools.sort()).toEqual(contracts.map((tool) => tool.name).sort());
    for (const contract of contracts) {
      const section = text.split(`### ${contract.name}\n`)[1] ?? text.split(`### ${contract.name} (AUTH REQUIRED)\n`)[1];
      expect(section, contract.name).toBeDefined();
      const block = section.split(/\n##/)[0];
      const names = (label: string) => {
        const line = block.split("\n").find((value) => value.startsWith(`**${label} inputs:**`)) ?? "";
        return [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
      };
      expect(names("Required"), contract.name).toEqual(contract.required);
      expect(names("Optional"), contract.name).toEqual(contract.optional);
    }
    expect(text).toContain("MCP `yaml` arguments contain the full YAML text");
  });

  it("requires authored content and confirmed publication while billing is unavailable", async () => {
    const text = await (await GET()).text();
    const quickstart = text.split("## Quickstart")[1].split("## Authentication")[0];
    expect(quickstart.indexOf("bun add -g @graspful/cli")).toBeLessThan(quickstart.indexOf("graspful register"));
    expect(quickstart.indexOf("graspful review course.yaml")).toBeLessThan(quickstart.indexOf("graspful import course.yaml"));
    expect(text).toContain("An empty scaffold cannot pass publication review");
    expect(text).toContain("published: false");
    expect(text).toContain("published: true");
    expect(text).toContain("publishedCourseIds and publishFailures");
    expect(text).toContain("Paid subscriptions are not available yet");
    expect(text).toContain("source` flag records the source reference in course metadata");
    expect(text).toContain("zero-based integer index within the available options");
    for (const stale of ["cross_concept_coverage", "--force", "--fix", "graspful import-brand", "graspful list courses", "70/30", "Never forget", "without any manual steps"]) {
      expect(text).not.toContain(stale);
    }
  });
});

// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { QUALITY_CHECK_METADATA } from "@graspful/shared";
import { GET } from "../route";

function mcpToolContracts() {
  const file = fileURLToPath(new URL("../../../../../../packages/mcp/src/index.ts", import.meta.url));
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let tools: ts.ArrayLiteralExpression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "TOOLS" && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      tools = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!tools) throw new Error("MCP tool registry was not found");

  const property = (node: ts.ObjectLiteralExpression, name: string) => {
    const entry = node.properties.find((item) => ts.isPropertyAssignment(item) && item.name.getText(source) === name);
    if (!entry || !ts.isPropertyAssignment(entry)) throw new Error(`Missing MCP property: ${name}`);
    return entry.initializer;
  };

  return tools.elements.map((entry) => {
    if (!ts.isObjectLiteralExpression(entry)) throw new Error("Expected MCP tool definition");
    const name = property(entry, "name");
    const schema = property(entry, "inputSchema");
    if (!ts.isStringLiteral(name) || !ts.isObjectLiteralExpression(schema)) throw new Error("Invalid MCP tool shape");
    const properties = property(schema, "properties");
    const required = property(schema, "required");
    if (!ts.isObjectLiteralExpression(properties) || !ts.isArrayLiteralExpression(required)) throw new Error("Invalid MCP input schema");
    const requiredNames = required.elements.map((field) => {
      if (!ts.isStringLiteral(field)) throw new Error("Expected required input name");
      return field.text;
    });
    const inputNames = properties.properties.map((field) => {
      if (!ts.isPropertyAssignment(field)) throw new Error("Expected MCP input property");
      return field.name.getText(source);
    });
    return {
      name: name.text,
      required: requiredNames,
      optional: inputNames.filter((field) => !requiredNames.includes(field)),
    };
  });
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

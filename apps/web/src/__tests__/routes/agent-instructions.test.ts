// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GET } from "@/app/agents.md/route";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, readFileSync: vi.fn(actual.readFileSync) };
});

afterEach(() => vi.mocked(readFileSync).mockReset());

describe("public agent instructions", () => {
  it("serves the full canonical document while local AGENTS.md stays a pointer", async () => {
    const canonical = readFileSync(resolve(process.cwd(), "../../CLAUDE.md"), "utf8");
    const entrypoint = readFileSync(resolve(process.cwd(), "../../AGENTS.md"), "utf8");
    const response = await GET();
    const content = await response.text();

    expect(entrypoint).toContain("[CLAUDE.md](CLAUDE.md)");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(content).toBe(canonical);
    expect(content).toContain("## E2E Test Coverage Requirements");
    const authIdx = content.search(/^### Authentication/m);
    const step1Idx = content.search(/^### Step 1:/m);
    expect(authIdx).toBeGreaterThan(-1);
    expect(step1Idx).toBeGreaterThan(authIdx);
    expect(content).toContain("graspful register");
    expect(content).toContain("GRASPFUL_API_KEY");
  });

  it("keeps authentication guidance before setup if the document is unavailable", async () => {
    vi.mocked(readFileSync).mockImplementationOnce(() => { throw new Error("ENOENT"); });
    const response = await GET();
    const content = await response.text();

    expect(content).toContain("## Authentication");
    expect(content.indexOf("## Authentication")).toBeLessThan(content.indexOf("## Step 1:"));
    expect(content).toContain("Authenticate before importing or publishing");
    expect(content).toContain("graspful register");
    expect(content).toContain("GRASPFUL_API_KEY");
    expect(content).toContain("https://graspful.ai/llms-full.txt");
  });
});

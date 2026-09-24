// @vitest-environment node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const webDirectory = fileURLToPath(new URL("../../../", import.meta.url));

function importOutsideServerComponent(entry: string) {
  return spawnSync("bun", ["-e", `await import(${JSON.stringify(entry)})`], {
    cwd: webDirectory,
    encoding: "utf8",
    timeout: 10_000,
  });
}

describe("shared package server boundaries", () => {
  it.each(["api-server", "supabase-server"])("rejects the %s entry outside a Server Component environment", (entry) => {
    const result = importOutsideServerComponent(`@graspful/creator-ui/${entry}`);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("This module cannot be imported from a Client Component module");
  });

  it.each(["api-client", "supabase-client"])("allows the %s entry without loading server-only code", (entry) => {
    const result = importOutsideServerComponent(`@graspful/creator-ui/${entry}`);
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });
});

import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  // Read AGENTS.md from the repo root (monorepo root is 4 levels up from apps/web/src/app)
  const agentsMdPath = join(process.cwd(), "../../AGENTS.md");

  let content: string;
  try {
    content = readFileSync(agentsMdPath, "utf-8");
  } catch {
    // Fallback: if the file can't be read at runtime, serve inline
    content = [
      "# Graspful — Agent Instructions",
      "",
      "> Use the CLI or MCP to interact with Graspful. Do NOT use a browser for account creation or course management.",
      "",
      "## Get Started",
      "",
      "```bash",
      "npx @graspful/cli init",
      "```",
      "",
      "Full documentation: https://graspful.ai/llms-full.txt",
    ].join("\n");
  }

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

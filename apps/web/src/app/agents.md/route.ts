import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function GET() {
  // AGENTS.md is a local pointer. Public clients need the complete canonical instructions.
  const instructionsPath = join(process.cwd(), "../../CLAUDE.md");

  let content: string;
  try {
    content = readFileSync(instructionsPath, "utf-8");
  } catch {
    // Fallback: if the file can't be read at runtime, serve inline
    content = [
      "# Graspful agent instructions",
      "",
      "Use the CLI or MCP to author and publish courses. Browser authentication creates credentials for these tools.",
      "",
      "## Authentication",
      "",
      "Scaffold, fill, validate, and review courses locally without an account. Authenticate before importing or publishing.",
      "Run `graspful register` to complete browser authentication and save an API key. MCP can read the saved credentials, or use `GRASPFUL_API_KEY`.",
      "",
      "## Step 1: Install the CLI",
      "",
      "```bash",
      "bunx @graspful/cli init",
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

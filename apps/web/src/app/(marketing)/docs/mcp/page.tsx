import type { Metadata } from "next";
import { QUALITY_CHECKS } from "@graspful/shared";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "MCP Server — Graspful Docs",
  description:
    "Set up the Graspful MCP server for Claude Code, Cursor, Codex, VS Code, and other AI agents. Tool schemas and configuration examples.",
  keywords: [
    "graspful mcp",
    "mcp server",
    "claude code mcp",
    "cursor mcp",
    "ai agent course creation",
    "model context protocol",
  ],
  alternates: { canonical: "https://graspful.ai/docs/mcp" },
};

function ToolCard({
  name,
  description,
  inputs,
  required,
  returns,
}: {
  name: string;
  description: string;
  inputs: { name: string; type: string; description: string }[];
  required: string[];
  returns: string;
}) {
  return (
    <div
      className="mt-6 rounded-xl border border-border/50 bg-card overflow-hidden"
      id={name}
    >
      <div className="border-b border-border/30 bg-muted/30 px-5 py-3">
        <code className="text-sm font-mono font-semibold text-primary">
          {name}
        </code>
      </div>
      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {description}
        </p>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">
            Inputs
          </p>
          <table className="w-full text-sm">
            <tbody>
              {inputs.map((input) => (
                <tr
                  key={input.name}
                  className="border-b border-border/20 last:border-0"
                >
                  <td className="py-1.5 pr-3 font-mono text-xs text-primary whitespace-nowrap align-top">
                    {input.name}
                    {required.includes(input.name) && (
                      <span className="text-destructive ml-0.5">*</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-xs text-muted-foreground whitespace-nowrap align-top">
                    {input.type}
                  </td>
                  <td className="py-1.5 text-xs text-muted-foreground">
                    {input.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
            Returns
          </p>
          <p className="text-xs text-muted-foreground">{returns}</p>
        </div>
      </div>
    </div>
  );
}

export default function MCPPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        MCP Server
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        The <InlineCode>@graspful/mcp</InlineCode> package is a Model Context
        Protocol server that exposes all Graspful operations as tools. Any
        MCP-compatible agent can scaffold, validate, review, and publish courses.
        The scaffold and fill tools create drafts and TODO stubs. Your external
        agent reads the source material and writes the actual teaching content.
      </p>

      {/* Getting your API key */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="api-key">
          Getting your API key
        </h2>
        <p className="mt-2 text-muted-foreground">
          The MCP server requires a <InlineCode>GRASPFUL_API_KEY</InlineCode> to
          import or publish. Local scaffold, fill, validate, and review tools
          work without a key. Install the CLI first with
          <InlineCode>bun add -g @graspful/cli</InlineCode>. You can get a key
          through browser registration or the creator dashboard:
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-4 rounded-lg border border-border/30 bg-card px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              1
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Web dashboard
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Go to{" "}
                <InlineCode>graspful.ai</InlineCode> &rarr; API Keys and create
                a new key.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg border border-border/30 bg-card px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              2
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                CLI register
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Run{" "}
                <InlineCode>graspful register --email you@example.com</InlineCode>{" "}
                to complete browser auth and mint an API key. The CLI saves the
                key automatically to{" "}
                <InlineCode>~/.graspful/credentials.json</InlineCode>.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-lg border border-border/30 bg-card px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              3
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Credentials file
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                If you have already logged in or registered, find your key in{" "}
                <InlineCode>~/.graspful/credentials.json</InlineCode>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Setup */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="setup">
          Setup
        </h2>
        <p className="mt-2 text-muted-foreground">
          Configure the MCP server in your agent. The server reads{" "}
          <InlineCode>GRASPFUL_API_KEY</InlineCode>,{" "}
          <InlineCode>GRASPFUL_ORG</InlineCode>, and{" "}
          <InlineCode>GRASPFUL_API_URL</InlineCode> from environment variables.
        </p>

        <h3
          className="mt-8 text-lg font-semibold text-foreground"
          id="claude-code"
        >
          Claude Code
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Run this after replacing the placeholder with your API key. User
          scope keeps the configuration outside the course repository:
        </p>
        <CodeBlock language="bash">
          {`claude mcp add --scope user graspful --env GRASPFUL_API_KEY=gsk_your_key_here -- bunx @graspful/mcp`}
        </CodeBlock>

        <h3
          className="mt-8 text-lg font-semibold text-foreground"
          id="cursor"
        >
          Cursor
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add to your Cursor MCP configuration (Settings &gt; MCP):
        </p>
        <CodeBlock language="json" title=".cursor/mcp.json">
          {`{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["-y", "@graspful/mcp"],
      "env": {
        "GRASPFUL_API_KEY": "gsk_your_key_here",
        "GRASPFUL_ORG": "your-org-slug"
      }
    }
  }
}`}
        </CodeBlock>

        <h3 className="mt-8 text-lg font-semibold text-foreground" id="codex">
          OpenAI Codex
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add the server with the Codex CLI. Replace the API key placeholder:
        </p>
        <CodeBlock language="bash">
          {`codex mcp add graspful --env GRASPFUL_API_KEY=gsk_your_key_here -- bunx @graspful/mcp`}
        </CodeBlock>

        <h3
          className="mt-8 text-lg font-semibold text-foreground"
          id="vscode"
        >
          VS Code (Copilot Agent Mode)
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Open MCP: Open User Configuration from the Command Palette and add
          the server below. Use the input prompt to enter your API key. See the{" "}
          <a href="https://code.visualstudio.com/docs/agent-customization/mcp-servers" className="text-primary hover:underline">VS Code MCP guide</a>
          {" "}for workspace and remote setup.
        </p>
        <CodeBlock language="json" title="mcp.json (user configuration)">
          {`{
  "inputs": [
    {
      "id": "graspful-api-key",
      "type": "promptString",
      "description": "Graspful API key",
      "password": true
    }
  ],
  "servers": {
    "graspful": {
      "type": "stdio",
      "command": "bunx",
      "args": ["@graspful/mcp"],
      "env": {
        "GRASPFUL_API_KEY": "\${input:graspful-api-key}"
      }
    }
  }
}`}
        </CodeBlock>
      </section>

      {/* The Two-YAML Workflow */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-foreground" id="workflow">
          The two-YAML workflow
        </h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Give source material to your external agent and plan the academy first.
          The agent then uses these tools with YAML strings. Between filling and
          review, it must replace the generated stubs with authored lessons,
          worked examples, and practice problems.
        </p>
        <div className="mt-6 space-y-3">
          {[
            {
              step: "1",
              tool: "graspful_scaffold_course",
              desc: "Generate the knowledge graph skeleton from a topic",
            },
            {
              step: "2",
              tool: "graspful_fill_concept",
              desc: "Add stubs, then author and verify their content (repeat per concept)",
            },
            {
              step: "3",
              tool: "graspful_review_course",
              desc: "Run 10 quality checks, fix any failures",
            },
            {
              step: "4",
              tool: "graspful_validate",
              desc: "Quick schema validation before import",
            },
            {
              step: "5",
              tool: "graspful_import_course",
              desc: "Import a draft, or request publication and confirm published: true",
            },
            {
              step: "6",
              tool: "graspful_create_brand",
              desc: "Generate brand YAML for the landing page",
            },
            {
              step: "7",
              tool: "graspful_import_brand",
              desc: "Import the brand to create the white-label site",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-4 rounded-lg border border-border/30 bg-card px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {item.step}
              </span>
              <div className="min-w-0">
                <code className="text-xs font-mono text-primary">
                  {item.tool}
                </code>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-foreground" id="tools">
          Tools
        </h2>
        <p className="mt-2 text-muted-foreground">
          The tools below cover course and brand authoring. Tools that call the Graspful API
          require the <InlineCode>GRASPFUL_API_KEY</InlineCode> environment
          variable.
        </p>

        <ToolCard
          name="graspful_scaffold_course"
          description={`Generate a course YAML skeleton with sections, concepts, and prerequisite edges. Returns a minimal valid YAML structure with TODO placeholders.

The scaffold is an unfinished draft and cannot pass publication review. Edit the graph, prerequisites, and difficulty levels before calling graspful_fill_concept. Author every concept before reviewing for publication.`}
          inputs={[
            { name: "topic", type: "string", description: 'Course topic name (e.g., "Linear Algebra")' },
            { name: "estimatedHours", type: "number", description: "Estimated total course hours (default: 10)" },
            { name: "sourceDocument", type: "string", description: "Reference to source material" },
          ]}
          required={["topic"]}
          returns="YAML string with course scaffold"
        />

        <ToolCard
          name="graspful_fill_concept"
          description={`Add knowledge point (KP) and problem stubs to a specific concept. Returns the full updated YAML.

Each KP stub includes instruction text, a worked example, and multiple-choice problems with a difficulty staircase (2, 3, 4, 5). Replace the TODO placeholders with real content. Fails if the concept already has KPs.`}
          inputs={[
            { name: "yaml", type: "string", description: "The full course YAML string" },
            { name: "conceptId", type: "string", description: "ID of the concept to fill (must have 0 KPs)" },
            { name: "kps", type: "number", description: "Number of KP stubs to add (default: 2)" },
            { name: "problemsPerKp", type: "number", description: "Number of problem stubs per KP (default: 3)" },
          ]}
          required={["yaml", "conceptId"]}
          returns="Full updated YAML string"
        />

        <ToolCard
          name="graspful_validate"
          description={`Validate any Graspful YAML (course, brand, or academy) against its Zod schema. Auto-detects the file type from the top-level key.

For course YAML, also checks that all prerequisite references point to existing concept IDs and the prerequisite graph is a DAG (no cycles). Run this before import to catch errors early.`}
          inputs={[
            { name: "yaml", type: "string", description: "The YAML string to validate" },
          ]}
          required={["yaml"]}
          returns="{ valid, fileType, errors[], stats }"
        />

        <ToolCard
          name="graspful_review_course"
          description={`Run all 10 mechanical quality checks on a course YAML. Returns a score (e.g., "8/10") with details on each failure.

The checks: ${QUALITY_CHECKS.join(", ")}.

A score of 10/10 means the automated checks passed. Review source accuracy, answer keys, and teaching quality before publishing.`}
          inputs={[
            { name: "yaml", type: "string", description: "The full course YAML string to review" },
          ]}
          required={["yaml"]}
          returns="{ passed, score, failures[], warnings[], stats }"
        />

        <ToolCard
          name="graspful_import_course"
          description={`Import a course YAML into a Graspful organization. Creates the course as a draft by default.

If publish=true, the server runs the review gate first. A failed publication can leave the imported course as a draft and returns failure details. Confirm published: true before reporting success. Requires GRASPFUL_API_KEY.`}
          inputs={[
            { name: "yaml", type: "string", description: "The full course YAML string" },
            { name: "org", type: "string", description: 'Organization slug (e.g., "acme-learning")' },
            { name: "publish", type: "boolean", description: "Publish immediately (runs review gate). Default: false" },
          ]}
          required={["yaml", "org"]}
          returns="{ courseId, url, published, reviewFailures? }"
        />

        <ToolCard
          name="graspful_publish_course"
          description={`Request publication of a draft course. The server runs the review gate. Confirm published: true in the result and report failure details if publication fails. Requires GRASPFUL_API_KEY.`}
          inputs={[
            { name: "courseId", type: "string", description: "The course ID (UUID) to publish" },
            { name: "org", type: "string", description: "Organization slug" },
          ]}
          required={["courseId", "org"]}
          returns="{ courseId, published }"
        />

        <ToolCard
          name="graspful_describe_course"
          description={`Compute statistics for a course YAML without importing it. Useful for tracking authoring progress.

Returns concept counts (authored vs stubs), KP and problem totals, graph depth, missing content counts, and per-section breakdowns.`}
          inputs={[
            { name: "yaml", type: "string", description: "The full course YAML string" },
          ]}
          required={["yaml"]}
          returns="{ courseName, courseId, concepts, authoredConcepts, stubConcepts, knowledgePoints, problems, graphDepth, sections[] }"
        />

        <ToolCard
          name="graspful_create_brand"
          description={`Generate a brand YAML scaffold for a white-label learning site. Niche presets (education, healthcare, finance, tech, legal) set appropriate colors, taglines, and copy.

The returned YAML includes brand identity, theme, landing page sections (hero, features, how-it-works, FAQ), and SEO config. Edit and then import with graspful_import_brand.`}
          inputs={[
            { name: "niche", type: "string", description: "Brand niche: education, healthcare, finance, tech, or legal" },
            { name: "name", type: "string", description: 'Brand name (default: "{Niche} Academy")' },
            { name: "domain", type: "string", description: 'Custom domain (default: "{slug}.graspful.ai")' },
            { name: "orgSlug", type: "string", description: "Organization slug to associate with" },
          ]}
          required={["niche"]}
          returns="YAML string with brand scaffold"
        />

        <ToolCard
          name="graspful_import_brand"
          description={`Import a brand YAML into Graspful. Creates the white-label site configuration including domain, theme, landing page, and SEO. Requires GRASPFUL_API_KEY.`}
          inputs={[
            { name: "yaml", type: "string", description: "The full brand YAML string" },
          ]}
          required={["yaml"]}
          returns="{ slug, domain, verificationStatus }"
        />

        <ToolCard
          name="graspful_list_courses"
          description={`List all courses in a Graspful organization. Returns an array of courses with their IDs, names, published status, and stats. Requires GRASPFUL_API_KEY.`}
          inputs={[
            { name: "org", type: "string", description: 'Organization slug (e.g., "acme-learning")' },
          ]}
          required={["org"]}
          returns="Array of { courseId, name, published, stats }"
        />
      </section>
    </div>
  );
}

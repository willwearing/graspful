import { QUALITY_CHECK_METADATA } from "@graspful/shared";

function generateLlmsFullTxt(): string {
  const checks = QUALITY_CHECK_METADATA.map(
    (check, index) => `${index + 1}. **${check.name}**: ${check.description}\n   Fix: ${check.fix}`,
  ).join("\n\n");

  return `# Graspful documentation for agents

Graspful provides CLI and MCP tools for authoring adaptive courses as YAML. Published courses use a prerequisite graph, lessons, practice problems, mastery estimates, and scheduled review.

Give PDFs, official references, and notes to your external AI agent. The agent reads the source and writes course content. Graspful scaffold and fill commands produce unfinished drafts and TODO stubs. Source-reference fields record metadata; the external agent performs source reading and content authoring.

## Quickstart

Start with an official source, its version, the intended learner, and the academy's course boundaries. Follow https://graspful.ai/docs/course-creation-guide before authoring.

\`\`\`bash
# 1. Install the CLI. Local authoring and review need no account.
bun add -g @graspful/cli
graspful --help

# 2. Scaffold an academy plan and its first course.
# Replace the topic and source reference with your actual details.
graspful create academy --topic "Your Topic" -o academy.yaml
graspful create course --topic "Your Topic" --source "Official source title, edition, and year" -o course.yaml

# 3. Edit the graph, then add stubs to one empty concept.
# Use an ID from your YAML if you changed the generated graph.
graspful fill concept course.yaml your-topic-intro --kps 3 --problems 4

# 4. Author each concept from the source material.
# Replace every TODO with teaching, worked examples, and distinct problems.
# Check source accuracy and answer keys, then fix and repeat these checks.
graspful validate course.yaml
graspful review course.yaml

# 5. Register before import, or use graspful login for an existing account.
graspful register --email you@example.com

# 6. Use the organization slug returned by authentication.
# A new course import is a draft by default.
graspful import course.yaml --org my-org --format json

# 7. Replace <course-id> with the returned courseId.
# Confirm published: true in the result before sharing the course.
graspful publish <course-id> --org my-org --format json
\`\`\`

An empty scaffold cannot pass publication review. A new draft import reports published: false. Publication is confirmed only by published: true. When publication fails, report the failure details, correct the local content, run validation and review again, replace the draft, and retry publication:

\`\`\`bash
graspful import course.yaml --org my-org --replace --format json
graspful publish <course-id> --org my-org --format json
\`\`\`

For an academy, edit the manifest to reference the actual course files and review each file. Import with \`graspful import academy.yaml --org my-org --course-dir . --format json\`. Adding \`--publish\` requests publication for each imported course. Read publishedCourseIds and publishFailures to confirm which courses published. An academy can be partially published.

Open the URL returned by course import and test a lesson and an incorrect answer as a learner. Configure the brand and verify its domain separately. Full guide: https://graspful.ai/docs/quickstart

## Authentication

Local create, fill, validate, review, and describe operations work without authentication. Importing, publishing, and listing courses require an API key.

- New account: install the CLI, then run \`graspful register\` in a terminal. Complete the browser authentication flow. The CLI saves a key in \`~/.graspful/credentials.json\`.
- Existing account: run \`graspful login\` in a terminal to authenticate.
- MCP: set \`GRASPFUL_API_KEY\` in your MCP client's private server configuration before starting the server.
- Keep API keys out of course files, public messages, and source control.

## CLI commands

CLI file arguments are local file paths. Use \`--format json\` for structured command output. Use \`graspful <command> --help\` for installed-version flags.

| Command | Purpose | Key flags |
|---------|---------|-----------|
| \`graspful create academy\` | Create an academy manifest draft | \`--topic\`, repeatable \`--course\`, \`--version\`, \`-o\` |
| \`graspful create course\` | Create an unfinished course graph | \`--topic\`, \`--hours\`, \`--source\`, \`-o\` |
| \`graspful fill concept <file> <conceptId>\` | Add TODO stubs to a concept with no knowledge points | \`--kps\`, \`--problems\` |
| \`graspful validate <file>\` | Validate a course, academy, or brand schema | \`--format json\` |
| \`graspful review <file>\` | Run automated course publication checks | \`--format json\` |
| \`graspful describe <file>\` | Show local course structure and missing content | \`--format json\` |
| \`graspful register\` | Create an account through browser authentication | \`--email\`, \`--no-browser\` |
| \`graspful login\` | Authenticate an existing account | \`--token\`, \`--no-browser\` |
| \`graspful import <file>\` | Import course, academy, or brand YAML | \`--org\`, \`--publish\`, \`--replace\`, \`--course-dir\` |
| \`graspful publish <courseId>\` | Request publication and return its result | \`--org\` |
| \`graspful create brand\` | Create brand settings to edit before import | \`--niche\`, \`--name\`, \`--topic\`, \`--domain\`, \`--org\`, \`-o\` |

The \`--source\` flag records the source reference in course metadata. You or your external agent must read that source and author the content. A successful schema validation can describe an unfinished draft. Before publication, the course must also pass review and receive content review from the author.

Importing a brand uses \`graspful import brand.yaml\`. Inspect its domain verification result and any DNS instructions. See https://graspful.ai/docs/cli and https://graspful.ai/docs/brand-schema

## MCP setup

The MCP package is \`@graspful/mcp\`. Its stdio command is \`bunx @graspful/mcp\`. Configure it in the external agent that will read your source files and author the YAML.

Claude Code, after replacing the key placeholder:

\`\`\`bash
claude mcp add --scope user graspful --env GRASPFUL_API_KEY=gsk_your_key_here -- bunx @graspful/mcp
\`\`\`

Codex, after replacing the key placeholder:

\`\`\`bash
codex mcp add graspful --env GRASPFUL_API_KEY=gsk_your_key_here -- bunx @graspful/mcp
\`\`\`

For Cursor, VS Code, and further client setup, use https://graspful.ai/docs/mcp. VS Code uses a \`servers\` root in its mcp.json configuration. Client configuration differs by editor.

## MCP tools

MCP \`yaml\` arguments contain the full YAML text. Read the local file first and send its contents. The \`manifestYaml\` argument also contains YAML text; \`courseYamls\` maps manifest file paths to their full YAML contents.

Tools marked AUTH REQUIRED need GRASPFUL_API_KEY. For course and academy operations, the organization input is named \`org\`. Brand creation uses \`orgSlug\` and stores it in the generated brand YAML.

### graspful_create_academy
**Required inputs:** \`topic\`.
**Optional inputs:** \`courseNames\`, \`version\`.
Creates an academy manifest draft. courseNames is an ordered array of names; version is a string. Resolve the source, learner promise, course boundaries, and referenced files before import.

### graspful_scaffold_course
**Required inputs:** \`topic\`.
**Optional inputs:** \`estimatedHours\`, \`sourceDocument\`.
Returns unfinished course YAML. estimatedHours is a number; sourceDocument is a source-reference string. Authoring and publication review are separate steps.

### graspful_fill_concept
**Required inputs:** \`yaml\`, \`conceptId\`.
**Optional inputs:** \`kps\`, \`problemsPerKp\`.
Adds TODO stubs to an existing concept with no knowledge points and returns the updated YAML text. kps and problemsPerKp are numbers. Replace the stubs with source-based teaching and questions before review.

### graspful_validate
**Required inputs:** \`yaml\`.
**Optional inputs:** none.
Validates course, academy, or brand YAML. Check valid and errors in the response. A valid draft can still fail publication review.

### graspful_review_course
**Required inputs:** \`yaml\`.
**Optional inputs:** none.
Runs the automated checks listed below. Read passed, score, failures, and warnings. Review factual accuracy and teaching quality against the source separately.

### graspful_import_course (AUTH REQUIRED)
**Required inputs:** \`yaml\`, \`org\`.
**Optional inputs:** \`publish\`.
Imports a course draft by default. Set publish to true to request publication after server review. Confirm published: true before reporting publication. A failed request can preserve an imported draft and return isError with publicationFailures.

### graspful_import_academy (AUTH REQUIRED)
**Required inputs:** \`manifestYaml\`, \`courseYamls\`, \`org\`.
**Optional inputs:** \`publish\`, \`replace\`, \`archiveMissing\`.
Imports a manifest and the referenced course YAML strings. The optional inputs are booleans. If publish is true, inspect publishedCourseIds and publishFailures for every course. Some courses can publish while others fail.

### graspful_publish_course (AUTH REQUIRED)
**Required inputs:** \`courseId\`, \`org\`.
**Optional inputs:** none.
Requests publication of a draft. courseId is the identifier returned by import. Confirm published: true and report the failures if publication does not succeed.

### graspful_describe_course
**Required inputs:** \`yaml\`.
**Optional inputs:** none.
Returns local course statistics, including authored concepts, stubs, knowledge points, and problems. Use this to inspect authoring progress.

### graspful_create_brand
**Required inputs:** \`niche\`.
**Optional inputs:** \`name\`, \`topic\`, \`domain\`, \`orgSlug\`.
Creates brand YAML for editing. Use a supported niche: education, healthcare, finance, tech, or legal. Write landing-page copy for the actual learner and course before import.

### graspful_import_brand (AUTH REQUIRED)
**Required inputs:** \`yaml\`.
**Optional inputs:** none.
Imports full brand YAML text. The organization is stored in brand.orgSlug in that YAML. Inspect the returned domain verification information separately from course publication.

### graspful_list_courses (AUTH REQUIRED)
**Required inputs:** \`org\`.
**Optional inputs:** none.
Lists an organization's courses and their publication state.

## YAML schema reference

Use the current schema documentation when authoring:

- Course schema: https://graspful.ai/docs/course-schema
- Brand schema: https://graspful.ai/docs/brand-schema
- Academy planning and authoring: https://graspful.ai/docs/course-creation-guide

Course YAML has top-level course and concepts fields, with optional sections. course.version is a string. Concept difficulty is an integer from 1 through 10; problem difficulty is an integer from 1 through 5. Knowledge points can use instruction and workedExample text, with typed instructionContent and workedExampleContent blocks for media and callouts.

Problem answer contracts:

- multiple_choice and scenario: correct is a zero-based integer index within the available options. Four options allow indices 0 through 3.
- true_false: correct is true or false, as a boolean or string.
- fill_blank: correct is nonempty text, a number, or an object with answer and optional alternatives.
- ordering: correct lists every option text once in the correct order, or uses a comma-separated index order containing every option once.
- matching: options use left|right pairs. correct maps every left label to an offered right label, or uses a full comma-separated index order.

Use at least three distinct practice problems per knowledge point and problems at more than one difficulty level per concept. Add teaching and worked examples, replace scaffold markers, and validate after edits. Refer to the schema for the full required fields and answer forms.

## Quality checks

The CLI review command and graspful_review_course run these ${QUALITY_CHECK_METADATA.length} automated checks from the shared registry:

${checks}

A score of ${QUALITY_CHECK_METADATA.length}/${QUALITY_CHECK_METADATA.length} means all automated checks passed. These checks do not verify source facts, complete curriculum coverage, or learner outcomes. Review the source, answer keys, teaching, and learner experience before publication.

## Agent workflow

1. **Plan from sources.** Identify official source material, its version, the intended learner, and course boundaries. Give the material to the external agent.
2. **Scaffold and author.** Create the academy plan and course graph, then author each concept. Scaffold and fill output need teaching content before publication.
3. **Validate and review.** Correct schema and gate failures. Check source accuracy and answer keys separately.
4. **Authenticate before import.** Run graspful register or graspful login, or configure GRASPFUL_API_KEY if you have a key already.
5. **Import a draft.** Save the courseId and URL returned by import.
6. **Request and confirm publication.** Confirm published: true for each course. Keep partial results and report failures when an academy only partially publishes.
7. **Verify the learner experience.** Test a lesson and incorrect-answer recovery. Import and verify the brand and domain separately.

## Billing availability

Paid subscriptions are not available yet. Stripe setup and payment-flow verification are still required before paid access can open. Course publication and brand import do not complete billing setup. Current status: https://graspful.ai/docs/billing

## Environment variables

- GRASPFUL_API_KEY: authentication for API operations. Keep this private.
- GRASPFUL_API_URL: optional API base URL override. Default: https://api.graspful.ai

## Learning behavior

The learner's recorded answers update mastery estimates. Prerequisite rules use those estimates to select available lessons. Review intervals adjust to answers and related practice. These estimates guide practice and can change as new evidence arrives.
`;
}

export async function GET() {
  return new Response(generateLlmsFullTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

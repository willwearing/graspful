import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const BACKEND_URL = "http://localhost:3000/api/v1";
const REPO_ROOT = path.resolve(__dirname, "../../..");
const CLI_PACKAGE_ROOT = path.resolve(REPO_ROOT, "packages/cli");
const SHARED_PACKAGE_ROOT = path.resolve(REPO_ROOT, "packages/shared");
const CLI_ENTRY = path.resolve(CLI_PACKAGE_ROOT, "dist/index.js");
let cliBuilt = false;

function buildCliOnce() {
  if (cliBuilt) {
    return;
  }

  execFileSync("bun", ["run", "build"], {
    cwd: SHARED_PACKAGE_ROOT,
    encoding: "utf-8",
    env: { ...process.env, NODE_ENV: "test" },
  });

  execFileSync("bun", ["run", "build"], {
    cwd: CLI_PACKAGE_ROOT,
    encoding: "utf-8",
    env: { ...process.env, NODE_ENV: "test" },
  });

  cliBuilt = true;
}

function runCli(args: string[], env: Record<string, string>) {
  buildCliOnce();
  return execFileSync("node", [CLI_ENTRY, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    env: { ...process.env, ...env, NODE_ENV: "test" },
  });
}

function buildFoundationsCourseYaml(slug: string): string {
  return `
course:
  id: ${slug}
  name: "Data Models"
  description: "Foundations for events, properties, and entity modeling."
  estimatedHours: 3
  version: "2026.1"
  sourceDocument: "Internal PostHog TAM academy outline"

sections:
  - id: foundations
    name: Foundations
    description: Core modeling ideas

concepts:
  - id: events-and-properties
    name: "Events and Properties"
    section: foundations
    difficulty: 2
    estimatedMinutes: 15
    tags: [events, properties, modeling]
    prerequisites: []
    knowledgePoints:
      - id: eap-kp1
        instruction: "Events record something that happened. Properties add the context that explains what happened, where it happened, and what attributes matter for later analysis."
        workedExample: "A signup event becomes more useful when it also carries properties like plan, source, and workspace type."
        problems:
          - id: eap-kp1-p1
            type: multiple_choice
            question: "Which statement best describes events and properties?"
            options: ["Events are dashboards and properties are charts", "Events capture actions while properties add context", "Events replace properties entirely", "Properties are only for billing records"]
            correct: 1
            explanation: "Events capture the action. Properties provide the context that makes the action analyzable."
            difficulty: 2
          - id: eap-kp1-p2
            type: multiple_choice
            question: "Why do TAMs care about event properties when reading product usage?"
            options: ["They add contextual detail to the event", "They remove the need for event names", "They make every event identical", "They hide segmentation choices"]
            correct: 0
            explanation: "Properties let TAMs segment, filter, and interpret event behavior instead of seeing a raw action with no context."
            difficulty: 3
          - id: eap-kp1-p3
            type: true_false
            question: "A well-modeled event can stay the same while properties change to reflect the business context."
            correct: "true"
            explanation: "That is the point of separating the event from its contextual properties."
            difficulty: 4

  - id: entity-linking
    name: "Entity Linking"
    section: foundations
    difficulty: 3
    estimatedMinutes: 15
    tags: [entities, linking, modeling]
    prerequisites: [events-and-properties]
    knowledgePoints:
      - id: el-kp1
        instruction: "Entity linking explains how an event connects to the user, company, workspace, or object that owns the activity. Good TAM analysis depends on understanding which entity each event belongs to."
        workedExample: "A feature-used event may belong to a user, but the TAM often wants to roll it up to the workspace or account entity that the user belongs to."
        problems:
          - id: el-kp1-p1
            type: multiple_choice
            question: "What does entity linking add to an event model?"
            options: ["A way to connect events to the account or workspace they belong to", "A way to remove user context from the data", "A way to convert events into invoices", "A way to avoid naming entities"]
            correct: 0
            explanation: "Entity linking lets the TAM understand which company, workspace, or object an event belongs to."
            difficulty: 2
          - id: el-kp1-p2
            type: multiple_choice
            question: "Why does entity linking matter for account-level analysis?"
            options: ["Because it keeps every event at the browser level only", "Because it connects user activity to the customer entity the TAM manages", "Because it replaces event properties", "Because it removes the need for filters"]
            correct: 1
            explanation: "The TAM manages the account, so the event model must support rolling user activity up to the relevant entity."
            difficulty: 3
          - id: el-kp1-p3
            type: true_false
            question: "If an event cannot be tied to the right entity, TAM conclusions about account health become less reliable."
            correct: "true"
            explanation: "Without the correct entity link, the TAM cannot trust which account or workspace the usage belongs to."
            difficulty: 4
`.trim();
}

function buildApplicationsCourseYaml(slug: string, foundationsSlug: string): string {
  return `
course:
  id: ${slug}
  name: "Pipeline Reading and Solution Design"
  description: "Read ingestion patterns and map them to customer-facing use cases."
  estimatedHours: 3
  version: "2026.1"
  sourceDocument: "Internal PostHog TAM academy outline"

sections:
  - id: applications
    name: Applications
    description: Read patterns and turn them into TAM guidance

concepts:
  - id: pipeline-reading
    name: "Pipeline Reading"
    section: applications
    difficulty: 4
    estimatedMinutes: 15
    tags: [pipelines, ingestion, diagnosis]
    prerequisites: [${foundationsSlug}:entity-linking]
    knowledgePoints:
      - id: pr-kp1
        instruction: "Pipeline reading means tracing how events move from source systems into the modeled entities and product surfaces that the customer cares about. You can only read the pipeline well if you already understand events, properties, and entity linking."
        workedExample: "A TAM sees that signup events arrive from the app, but account-level lifecycle events only become useful once they are linked to the workspace entity and routed into the right downstream views."
        problems:
          - id: pr-kp1-p1
            type: multiple_choice
            question: "What does pipeline reading help a TAM understand?"
            options: ["How data moves from source events into the customer-facing model", "How to rename every property", "How to avoid entity linking", "How to replace usage analysis with intuition"]
            correct: 0
            explanation: "Pipeline reading is about tracing movement from source events into the modeled outputs the customer relies on."
            difficulty: 2
          - id: pr-kp1-p2
            type: multiple_choice
            question: "Why does pipeline reading depend on entity linking?"
            options: ["Because every pipeline is only about CSS", "Because the TAM needs to know which account or workspace the data belongs to", "Because entity linking removes events from the pipeline", "Because it turns pipelines into dashboards automatically"]
            correct: 1
            explanation: "If the pipeline does not preserve the right entity relationships, the TAM cannot explain customer outcomes at the right level."
            difficulty: 3
          - id: pr-kp1-p3
            type: true_false
            question: "A pipeline can look busy while still failing to support the account-level questions a TAM needs to answer."
            correct: "true"
            explanation: "Volume alone is not enough. The modeled outputs still need to connect to the customer entity and use case."
            difficulty: 4

  - id: solution-design
    name: "Solution Design"
    section: applications
    difficulty: 5
    estimatedMinutes: 15
    tags: [solution-design, use-cases, tam]
    prerequisites: [pipeline-reading]
    knowledgePoints:
      - id: sd-kp1
        instruction: "Solution design turns the modeled events, linked entities, and pipeline behavior into a customer plan. A strong TAM recommendation starts with foundations, then uses those foundations to explain which use cases PostHog can support."
        workedExample: "If the customer wants activation reporting, the TAM starts by checking event quality, property coverage, and entity linking before promising a lifecycle or retention use case."
        problems:
          - id: sd-kp1-p1
            type: multiple_choice
            question: "What is the correct starting point for solution design in a TAM workflow?"
            options: ["Promise advanced use cases before checking the model", "Start from the modeled events and entities, then map them to customer outcomes", "Skip pipeline reading and rely on slide decks", "Treat every customer use case as identical"]
            correct: 1
            explanation: "A TAM should start from the actual data model and pipeline behavior, then map that reality to the use case."
            difficulty: 2
          - id: sd-kp1-p2
            type: multiple_choice
            question: "Why should a TAM verify event quality and entity coverage before recommending a reporting use case?"
            options: ["Because solution design depends on trustworthy foundations", "Because use cases remove the need for instrumentation", "Because every report is generated from marketing copy", "Because pipelines should never be reviewed"]
            correct: 0
            explanation: "Good solution design is layered: if the foundations are weak, the use case recommendation will also be weak."
            difficulty: 3
          - id: sd-kp1-p3
            type: true_false
            question: "A layered academy should move from models to pipelines to use cases so later work strengthens earlier understanding."
            correct: "true"
            explanation: "That ordering creates the structural integrity and layering the academy is trying to enforce."
            difficulty: 4
`.trim();
}

test("Academy CLI flow — scaffold, import, publish, and validate a live academy", async ({
  request,
}) => {
  const email = `e2e-academy-cli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;
  const registerRes = await request.post(`${BACKEND_URL}/auth/register`, {
    data: { email, password: "TestPassword123!" },
    headers: { "Content-Type": "application/json" },
  });

  expect(registerRes.status()).toBe(201);
  const { apiKey, orgSlug } = await registerRes.json();
  expect(apiKey).toMatch(/^gsk_/);
  expect(orgSlug).toBeTruthy();

  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "graspful-academy-cli-"));
  const courseDir = path.join(tmpdir, "courses");
  fs.mkdirSync(courseDir, { recursive: true });

  const academyFile = path.join(tmpdir, "academy.yaml");
  const cliEnv = {
    GRASPFUL_API_KEY: apiKey,
    GRASPFUL_API_URL: "http://localhost:3000",
  };

  runCli(
    [
      "create",
      "academy",
      "--topic",
      "PostHog TAM",
      "--course",
      "Data Models",
      "--course",
      "Pipeline Reading and Solution Design",
      "-o",
      academyFile,
    ],
    cliEnv,
  );

  fs.writeFileSync(
    path.join(courseDir, "data-models.yaml"),
    buildFoundationsCourseYaml("data-models"),
  );
  fs.writeFileSync(
    path.join(courseDir, "pipeline-reading-and-solution-design.yaml"),
    buildApplicationsCourseYaml("pipeline-reading-and-solution-design", "data-models"),
  );

  const importOutput = runCli(
    [
      "--format",
      "json",
      "import",
      academyFile,
      "--org",
      orgSlug,
      "--course-dir",
      tmpdir,
      "--publish",
    ],
    cliEnv,
  );

  const importResult = JSON.parse(importOutput);
  expect(importResult.courseCount).toBe(2);
  expect(importResult.publishedCourseIds).toHaveLength(2);
  expect(importResult.publishFailures).toEqual([]);

  const listAcademiesRes = await request.get(`${BACKEND_URL}/orgs/${orgSlug}/academies`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  expect(listAcademiesRes.status()).toBe(200);
  const academies = await listAcademiesRes.json();
  const academy = academies.find((item: { slug: string }) => item.slug === "posthog-tam");
  expect(academy).toBeTruthy();

  const validateRes = await request.post(
    `${BACKEND_URL}/orgs/${orgSlug}/academies/${academy.id}/validate`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );
  expect(validateRes.status()).toBe(201);
  const validation = await validateRes.json();
  expect(validation.isValid).toBe(true);

  const coursesRes = await request.get(`${BACKEND_URL}/orgs/${orgSlug}/courses`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  expect(coursesRes.status()).toBe(200);
  const courses = await coursesRes.json();
  const publishedCourses = courses.filter((course: { isPublished: boolean }) => course.isPublished);
  expect(publishedCourses.length).toBeGreaterThanOrEqual(2);

  fs.rmSync(tmpdir, { recursive: true, force: true });
});

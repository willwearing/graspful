import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Course Schema — Graspful Docs",
  description:
    "Full YAML schema reference for Graspful courses. Fields, types, validation rules, and authoring guidelines for sections, concepts, knowledge points, and problems.",
  keywords: [
    "graspful course schema",
    "course yaml",
    "knowledge graph",
    "adaptive learning schema",
    "course authoring",
  ],
};

function FieldTable({
  fields,
}: {
  fields: { name: string; type: string; required: boolean; description: string }[];
}) {
  return (
    <div className="mt-3 rounded-xl border border-border/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/30 bg-muted/30">
            <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
              Field
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
              Type
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr
              key={field.name}
              className="border-b border-border/20 last:border-0"
            >
              <td className="px-4 py-2 font-mono text-xs text-primary whitespace-nowrap align-top">
                {field.name}
                {field.required && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap align-top">
                {field.type}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                {field.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CourseSchemaPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Course Schema
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Courses are defined as YAML files with three top-level keys:{" "}
        <InlineCode>course</InlineCode>, <InlineCode>sections</InlineCode>, and{" "}
        <InlineCode>concepts</InlineCode>. The schema is validated with Zod at
        import time.
      </p>

      {/* Top-level structure */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="structure">
          Top-level structure
        </h2>
        <CodeBlock language="yaml">
          {`course:
  id: string              # kebab-case, globally unique
  name: string
  description: string
  estimatedHours: number
  version: string         # e.g., "2026.1"
  sourceDocument: string  # official source reference

sections:               # optional, ordered list
  - id: string
    name: string
    description: string
    sectionExam: ...      # optional exam gate

concepts:               # required, array of concept objects
  - id: string
    name: string
    ...`}
        </CodeBlock>
      </section>

      {/* Course metadata */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="course">
          course
        </h2>
        <p className="mt-2 text-muted-foreground">
          Top-level metadata about the course.
        </p>
        <FieldTable
          fields={[
            { name: "id", type: "string", required: true, description: "Kebab-case identifier, globally unique (e.g., aws-saa-c03)" },
            { name: "name", type: "string", required: true, description: "Human-readable course name" },
            { name: "description", type: "string", required: false, description: "Course description" },
            { name: "estimatedHours", type: "number", required: true, description: "Estimated total study hours (must be positive)" },
            { name: "version", type: "string", required: true, description: 'Semantic version string (e.g., "2026.1")' },
            { name: "sourceDocument", type: "string", required: false, description: "Reference to official source (e.g., exam guide, textbook)" },
          ]}
        />
      </section>

      {/* Sections */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="sections">
          sections
        </h2>
        <p className="mt-2 text-muted-foreground">
          Optional ordered list of sections. Concepts reference sections by ID.
        </p>
        <FieldTable
          fields={[
            { name: "id", type: "string", required: true, description: "Section identifier" },
            { name: "name", type: "string", required: true, description: "Section display name" },
            { name: "description", type: "string", required: false, description: "Section description" },
            { name: "sectionExam", type: "object", required: false, description: "Optional section exam gate (see below)" },
          ]}
        />

        <h3
          className="mt-6 text-lg font-semibold text-foreground"
          id="section-exam"
        >
          sectionExam
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Section-end certification checkpoints. Every blueprint concept must
          belong to the section.
        </p>
        <FieldTable
          fields={[
            { name: "enabled", type: "boolean", required: false, description: "Whether the exam is active (default: true)" },
            { name: "passingScore", type: "number", required: false, description: "Score to pass, 0.0-1.0 (default: 0.75)" },
            { name: "timeLimitMinutes", type: "number", required: false, description: "Optional time limit in minutes" },
            { name: "questionCount", type: "number", required: false, description: "Total questions (default: 10). Must be >= sum of blueprint minQuestions" },
            { name: "blueprint", type: "array", required: false, description: "Array of { conceptId, minQuestions } — each concept must be in this section" },
            { name: "instructions", type: "string", required: false, description: "Exam instructions shown to learner" },
          ]}
        />
      </section>

      {/* Concepts */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="concepts">
          concepts
        </h2>
        <p className="mt-2 text-muted-foreground">
          A concept represents one teachable idea that can be tested
          independently. Too broad and students get stuck. Too narrow and the
          graph becomes unwieldy.
        </p>
        <FieldTable
          fields={[
            { name: "id", type: "string", required: true, description: "Kebab-case identifier, unique within the course" },
            { name: "name", type: "string", required: true, description: "Human-readable concept name" },
            { name: "section", type: "string", required: false, description: "Section ID this concept belongs to" },
            { name: "difficulty", type: "1-10", required: true, description: "1=basic definition, 5=application, 8=complex analysis, 10=multi-step" },
            { name: "estimatedMinutes", type: "number", required: true, description: "Estimated study time in minutes (positive integer)" },
            { name: "tags", type: "string[]", required: false, description: 'Tags for filtering (e.g., "foundational", "calculation")' },
            { name: "sourceRef", type: "string", required: false, description: 'Source reference (e.g., "NFPA 1001-2019 JPR 4.3.1")' },
            { name: "prerequisites", type: "string[]", required: false, description: "Array of concept IDs that must be mastered first (max 3-4 direct)" },
            { name: "encompassing", type: "array", required: false, description: "Implicit repetition edges: { concept: id, weight: 0.0-1.0 }" },
            { name: "knowledgePoints", type: "array", required: false, description: "Array of KP objects (see below). Empty = graph stub" },
          ]}
        />
      </section>

      {/* Knowledge Points */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="knowledge-points">
          knowledgePoints
        </h2>
        <p className="mt-2 text-muted-foreground">
          Each knowledge point teaches one load-bearing move, distinction, or
          case. Fully-authored concepts should have 2-4 KPs with progressive
          difficulty. Each KP follows: instruction &rarr; content &rarr; worked
          example &rarr; practice.
        </p>
        <FieldTable
          fields={[
            { name: "id", type: "string", required: true, description: "KP identifier, unique within the concept" },
            { name: "instruction", type: "string", required: false, description: "Markdown instruction text (or file path ending in .md/.txt/.html)" },
            { name: "instructionContent", type: "array", required: false, description: "Structured content blocks (image, video, link, callout)" },
            { name: "workedExample", type: "string", required: false, description: "Step-by-step worked example text" },
            { name: "workedExampleContent", type: "array", required: false, description: "Structured content blocks for the worked example" },
            { name: "problems", type: "array", required: false, description: "Array of problem objects (see below). Need 3+ per KP" },
          ]}
        />
      </section>

      {/* Content Blocks */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="content-blocks">
          Content blocks
        </h2>
        <p className="mt-2 text-muted-foreground">
          Used in <InlineCode>instructionContent</InlineCode> and{" "}
          <InlineCode>workedExampleContent</InlineCode> for media and references.
          The <InlineCode>type</InlineCode> field determines the variant.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { type: "image", fields: "url, alt, caption?, width?", desc: "Screenshot or diagram" },
            { type: "video", fields: "url, title, caption?", desc: "External demo or walkthrough" },
            { type: "link", fields: "url, title, description?", desc: "Supporting document or page" },
            { type: "callout", fields: "title, body", desc: "Highlighted note" },
          ].map((block) => (
            <div
              key={block.type}
              className="rounded-lg border border-border/30 bg-card p-4"
            >
              <code className="text-xs font-mono font-semibold text-primary">
                {block.type}
              </code>
              <p className="mt-1 text-xs text-muted-foreground">{block.desc}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Fields: {block.fields}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Problems */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="problems">
          problems
        </h2>
        <p className="mt-2 text-muted-foreground">
          Practice problems attached to each knowledge point. The adaptive engine
          needs at least 3 problems per KP. Two consecutive correct answers
          passes a KP.
        </p>
        <FieldTable
          fields={[
            { name: "id", type: "string", required: true, description: "Problem identifier, globally unique across the course" },
            { name: "type", type: "enum", required: true, description: "multiple_choice | fill_blank | true_false | ordering | matching | scenario" },
            { name: "question", type: "string", required: true, description: "The question text" },
            { name: "options", type: "string[]", required: false, description: "Answer options (for MC: 4 options, 1 correct; for ordering: 4-6 steps)" },
            { name: "correct", type: "string | number", required: true, description: "Correct answer (index for MC, text for fill_blank)" },
            { name: "explanation", type: "string", required: false, description: "Shown after answering — should name the likely misconception" },
            { name: "difficulty", type: "1-5", required: false, description: "Problem difficulty level (integer 1-5)" },
          ]}
        />
      </section>

      {/* Example */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="example">
          Example course YAML
        </h2>
        <CodeBlock language="yaml" title="aws-saa-c03.yaml">
          {`course:
  id: aws-saa-c03
  name: AWS Solutions Architect Associate
  description: Comprehensive prep for the AWS SAA-C03 exam
  estimatedHours: 40
  version: "2026.1"
  sourceDocument: "AWS SAA-C03 Exam Guide"

sections:
  - id: foundations
    name: Cloud Foundations
    description: Core AWS concepts and global infrastructure
  - id: networking
    name: Networking
    description: VPC, subnets, routing, and connectivity
    sectionExam:
      enabled: true
      passingScore: 0.80
      questionCount: 10
      blueprint:
        - conceptId: vpc-basics
          minQuestions: 3
        - conceptId: subnet-design
          minQuestions: 2

concepts:
  - id: shared-responsibility
    name: AWS Shared Responsibility Model
    section: foundations
    difficulty: 3
    estimatedMinutes: 20
    tags: [foundational, security]
    sourceRef: "SAA-C03 Domain 1"
    prerequisites: []
    knowledgePoints:
      - id: shared-responsibility-kp1
        instruction: |
          AWS uses a shared responsibility model. AWS manages
          security OF the cloud (hardware, networking, facilities).
          You manage security IN the cloud (data, IAM, encryption).
        workedExample: |
          Scenario: A company stores PII in S3. Who is responsible
          for encrypting that data? Answer: The customer — S3
          encryption is the customer's responsibility.
        problems:
          - id: sr-kp1-p1
            type: multiple_choice
            question: "Who is responsible for patching the underlying EC2 hypervisor?"
            options:
              - "The customer"
              - "AWS"
              - "Shared equally"
              - "The VPC owner"
            correct: 1
            explanation: "AWS manages the hypervisor. Customers manage the OS and applications running on EC2."
            difficulty: 2
          - id: sr-kp1-p2
            type: multiple_choice
            question: "A company needs to encrypt S3 objects at rest. Whose responsibility is this?"
            options:
              - "AWS — they manage S3 infrastructure"
              - "The customer — data encryption is their responsibility"
              - "S3 encrypts everything by default, no action needed"
              - "The VPC security group controls this"
            correct: 1
            explanation: "While S3 now encrypts by default with SSE-S3, managing encryption keys and choosing encryption methods is the customer's responsibility."
            difficulty: 3
          - id: sr-kp1-p3
            type: scenario
            question: "Your auditor asks who manages physical security at an AWS data center. What do you tell them?"
            options:
              - "We manage it through security groups"
              - "AWS manages all physical data center security"
              - "It depends on the region"
              - "Physical security is a shared responsibility"
            correct: 1
            explanation: "Physical security is entirely AWS's responsibility — it's security OF the cloud."
            difficulty: 4

  - id: vpc-basics
    name: VPC Fundamentals
    section: networking
    difficulty: 4
    estimatedMinutes: 30
    tags: [networking, foundational]
    sourceRef: "SAA-C03 Domain 2"
    prerequisites:
      - shared-responsibility
    knowledgePoints: []  # stub — needs graspful fill concept`}
        </CodeBlock>
      </section>

      {/* Authoring guidelines */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="guidelines">
          Authoring guidelines
        </h2>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Concept granularity
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A concept = one teachable idea that can be tested independently.
              Good: &quot;Forms of Co-Ownership (Joint Tenancy, Tenancy in
              Common, TBE)&quot;. Too broad: &quot;All of Property Law&quot;.
              Too narrow: &quot;Definition of Joint Tenancy&quot; (make this a KP
              instead).
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground">
              Prerequisites
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Max 3-4 direct prerequisites per concept (working memory limit).
              Only list direct prerequisites — transitive ones are inferred. If
              A&rarr;B&rarr;C, don&apos;t add A&rarr;C explicitly.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground">
              Knowledge points
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fully-authored concepts should have 2-4 KPs with progressive
              difficulty. Each KP teaches one load-bearing move. Difficulty
              should rise one small step at a time — learners should feel like
              climbing a staircase, not jumping a gap.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground">
              Problem quality
            </h3>
            <ul className="mt-1 text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                Multiple choice: 4 options, 1 correct. Distractors should be plausible.
              </li>
              <li>
                Fill blank: Accept reasonable variations (the system normalizes).
              </li>
              <li>Ordering: 4-6 steps max. Every step must be necessary.</li>
              <li>
                Scenario: Audio description + follow-up. Best for complex application.
              </li>
              <li>
                Explanations should name the likely misconception, not just reveal the answer.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground">
              Encompassing weights
            </h3>
            <ul className="mt-1 text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>1.0: Fully exercises the target as a subskill</li>
              <li>0.5-0.7: Substantially exercises the target</li>
              <li>0.2-0.4: Partially exercises the target</li>
              <li>&lt; 0.2: Probably not worth listing</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground">
              Progress-safe evolution
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              After a course has active learners, keep{" "}
              <InlineCode>course.id</InlineCode>, section{" "}
              <InlineCode>id</InlineCode>, concept{" "}
              <InlineCode>id</InlineCode>, and KP{" "}
              <InlineCode>id</InlineCode> stable across revisions. Safe changes:
              refine instruction, add worked examples, revise problems, add new
              concepts. Unsafe: renaming slugs in place. Use{" "}
              <InlineCode>--archiveMissing</InlineCode> when retiring content.
            </p>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section className="mt-12 rounded-xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-bold text-foreground">Validation rules</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The importer validates the following at import time:
        </p>
        <ul className="mt-3 text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>No cycles in the prerequisite graph</li>
          <li>All referenced concept IDs exist</li>
          <li>Encompassing weights are 0.0-1.0</li>
          <li>Every authored concept has at least 1 KP</li>
          <li>Every authored KP has at least 2 problems</li>
          <li>Section exam blueprint concepts belong to the section</li>
          <li>
            Section exam <InlineCode>questionCount</InlineCode> &ge; sum of
            blueprint <InlineCode>minQuestions</InlineCode>
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Run{" "}
          <Link href="/docs/cli#graspful-validate" className="text-primary hover:underline">
            graspful validate
          </Link>{" "}
          locally before importing to catch errors early. The{" "}
          <Link href="/docs/review-gate" className="text-primary hover:underline">
            review gate
          </Link>{" "}
          runs additional quality checks on top of schema validation.
        </p>
      </section>
    </div>
  );
}

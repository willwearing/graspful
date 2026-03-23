import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "The Learning Staircase — Graspful Docs",
  description:
    "How Graspful breaks concepts into knowledge points that scaffold from recognition to transfer, minimizing cognitive load at every step.",
  keywords: [
    "learning staircase",
    "knowledge points",
    "scaffolding",
    "cognitive load",
    "worked examples",
    "expertise reversal",
    "problem types",
  ],
};

const kpLevels = [
  {
    level: "KP1",
    name: "Recognition",
    question: "What is this?",
    description:
      "Definitions, identification, and basic recall. The student learns to recognize the concept and distinguish it from related ideas.",
    examples: "Identify the term, select the correct definition, match terms to descriptions.",
  },
  {
    level: "KP2",
    name: "Guided Application",
    question: "Use it with support",
    description:
      "Worked examples and guided practice. The student applies the concept with scaffolding — step-by-step instructions, partially completed solutions, or constrained problem spaces.",
    examples: "Follow a worked example, fill in missing steps, apply a formula with given values.",
  },
  {
    level: "KP3",
    name: "Independent Application",
    question: "Use it alone",
    description:
      "Unscaffolded problems where the student must apply the concept without guidance. They choose the method, set up the problem, and execute — no training wheels.",
    examples: "Solve a novel problem, design a solution, calculate without a reference.",
  },
  {
    level: "KP4",
    name: "Transfer",
    question: "Use it in new contexts",
    description:
      "Novel scenarios that require adapting the concept to unfamiliar situations. This is the highest level — the student can recognize when and how to apply the concept even in contexts they haven't seen before.",
    examples: "Apply to a cross-domain scenario, evaluate tradeoffs, troubleshoot an unfamiliar failure.",
  },
];

const problemTypes = [
  { type: "multiple_choice", description: "4 options, 1 correct. Best for recognition and recall." },
  { type: "true_false", description: "Binary choice. Best for testing common misconceptions." },
  { type: "fill_blank", description: "Free-text input, normalized for comparison. Best for recall without cues." },
  { type: "ordering", description: "4-6 steps to arrange. Best for procedures and sequences." },
  { type: "matching", description: "Pair items from two lists. Best for terminology and classification." },
  { type: "scenario", description: "Situational question with context. Best for application and transfer." },
];

export default function LearningStaircasePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        The Learning Staircase
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Every concept is broken into 2-4 knowledge points that form a
        staircase from recognition to transfer. Each step is small enough
        that the student never feels overwhelmed.
      </p>

      {/* Cognitive load */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="cognitive-load">
          Minimizing cognitive load
        </h2>
        <p className="mt-2 text-muted-foreground">
          Working memory can hold about 4 items at once. If a lesson demands
          more than that — learning a new concept, understanding its notation,
          and applying it to a complex problem simultaneously — the student
          gets overloaded and nothing sticks.
        </p>
        <p className="mt-2 text-muted-foreground">
          The learning staircase solves this by introducing one cognitive
          demand at a time. First, learn what the concept is. Then, see how
          it&apos;s applied with worked examples. Then, try it yourself with
          support. Finally, apply it to new contexts. Each step assumes the
          previous one is solid.
        </p>
        <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Rule of thumb:</strong> if a
            student needs to hold more than 2-3 new ideas in working memory to
            answer a question, the staircase needs more intermediate steps.
            Break the concept into smaller knowledge points.
          </p>
        </div>
      </section>

      {/* The four levels */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="kp-levels">
          The four levels
        </h2>
        <p className="mt-2 text-muted-foreground">
          Not every concept needs all four levels. Simple definitional concepts
          may only need KP1 and KP2. Complex applied concepts should use all
          four. The minimum for a fully-authored concept is 2 knowledge points.
        </p>
        <div className="mt-6 space-y-4">
          {kpLevels.map((kp) => (
            <div
              key={kp.level}
              className="rounded-xl border border-border/50 bg-card overflow-hidden"
              id={`level-${kp.level.toLowerCase()}`}
            >
              <div className="flex items-center gap-3 border-b border-border/30 bg-muted/30 px-5 py-3">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {kp.level}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {kp.name}
                </span>
                <span className="ml-auto text-xs text-muted-foreground italic">
                  &quot;{kp.question}&quot;
                </span>
              </div>
              <div className="px-5 py-4 space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {kp.description}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  <strong className="text-foreground">Examples:</strong>{" "}
                  {kp.examples}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Worked examples */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="worked-examples">
          Worked examples
        </h2>
        <p className="mt-2 text-muted-foreground">
          A worked example shows the complete solution process, step by step.
          Research consistently shows that studying worked examples produces
          faster learning than solving equivalent problems, especially for
          beginners. The student sees how an expert approaches the problem
          before attempting it themselves.
        </p>
        <h3 className="text-lg font-semibold text-foreground mt-6">
          When to use them
        </h3>
        <p className="mt-2 text-muted-foreground">
          Worked examples are most valuable at KP2 (guided application), where
          the student is transitioning from &quot;I know what this is&quot; to
          &quot;I can use it.&quot; The review gate requires at least 50% of
          authored concepts to include a worked example on at least one KP.
        </p>
        <h3 className="text-lg font-semibold text-foreground mt-6">
          Expertise reversal effect
        </h3>
        <p className="mt-2 text-muted-foreground">
          Here&apos;s the catch: scaffolding that helps beginners can actively
          hurt advanced learners. An expert forced to read through a step-by-step
          walkthrough of something they already know experiences redundant
          cognitive load — their working memory is busy processing unnecessary
          information instead of the actual problem.
        </p>
        <p className="mt-2 text-muted-foreground">
          The learning staircase handles this naturally. Once a student masters
          KP2, they advance to KP3 (independent application) where worked
          examples are absent. The adaptive engine never shows scaffolding to a
          student who has demonstrated they don&apos;t need it.
        </p>
      </section>

      {/* Problem types */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="problem-types">
          Problem types
        </h2>
        <p className="mt-2 text-muted-foreground">
          Graspful supports six problem types. Different types suit different
          levels of the staircase.
        </p>
        <div className="mt-4 rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {problemTypes.map((pt) => (
                <tr
                  key={pt.type}
                  className="border-b border-border/20 last:border-0"
                >
                  <td className="px-4 py-2 font-mono text-xs text-primary whitespace-nowrap align-top">
                    {pt.type}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {pt.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section exams */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="section-exams">
          Section exams
        </h2>
        <p className="mt-2 text-muted-foreground">
          Once a student masters all concepts in a section, they become eligible
          for the section exam — a cumulative assessment that verifies knowledge
          across the entire section. Section exams are configured in the course
          YAML with a blueprint that specifies which concepts to sample and how
          many questions each gets.
        </p>
        <p className="mt-2 text-muted-foreground">
          Section exams serve as certification checkpoints. They confirm that
          mastery of individual concepts actually translates into integrated
          understanding. A student might master each concept in isolation but
          struggle when concepts are mixed. The exam catches this.
        </p>
      </section>

      {/* YAML example */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="yaml-example">
          Example: concept with 3 knowledge points
        </h2>
        <p className="mt-2 text-muted-foreground">
          This YAML shows a concept with three KPs progressing from recognition
          to independent application. Each KP has instruction, an optional
          worked example, and practice problems at increasing difficulty.
        </p>
        <CodeBlock language="yaml" title="subnet-design.yaml">
          {`- id: subnet-design
  name: Subnet Design
  section: networking
  difficulty: 6
  estimatedMinutes: 25
  tags: [networking, applied]
  prerequisites:
    - cidr-notation
    - vpc-basics
  knowledgePoints:

    # KP1: Recognition — "what is a subnet?"
    - id: subnet-design-kp1
      instruction: |
        A subnet is a range of IP addresses within a VPC. Each subnet
        lives in one Availability Zone. You use subnets to isolate
        resources: public subnets for internet-facing resources,
        private subnets for internal workloads.
      problems:
        - id: sd-kp1-p1
          type: multiple_choice
          question: "What is the primary purpose of subnets within a VPC?"
          options:
            - "To increase network speed"
            - "To isolate resources into distinct IP ranges"
            - "To replicate data across regions"
            - "To manage DNS resolution"
          correct: 1
          explanation: "Subnets segment the VPC into smaller IP ranges, each in one AZ, to isolate and organize resources."
          difficulty: 2
        - id: sd-kp1-p2
          type: true_false
          question: "A single subnet can span multiple Availability Zones."
          correct: false
          explanation: "Each subnet is confined to one AZ. For multi-AZ deployments, create one subnet per AZ."
          difficulty: 1
        - id: sd-kp1-p3
          type: multiple_choice
          question: "Which subnet type should host an internet-facing load balancer?"
          options:
            - "Private subnet"
            - "Public subnet"
            - "Either — it depends on the security group"
            - "Isolated subnet"
          correct: 1
          explanation: "Public subnets have a route to an internet gateway. Internet-facing resources must be in a public subnet."
          difficulty: 2

    # KP2: Guided application — "design subnets with help"
    - id: subnet-design-kp2
      instruction: |
        To design subnets, start with your VPC CIDR (e.g., 10.0.0.0/16)
        and divide it. A common pattern: /24 subnets give you 251 usable
        IPs each. Use at least 2 AZs for high availability.
      workedExample: |
        Scenario: Design subnets for a web app in us-east-1.
        VPC CIDR: 10.0.0.0/16

        Step 1: Public subnets for ALB
          - 10.0.1.0/24 in us-east-1a (251 IPs)
          - 10.0.2.0/24 in us-east-1b (251 IPs)

        Step 2: Private subnets for app servers
          - 10.0.10.0/24 in us-east-1a
          - 10.0.11.0/24 in us-east-1b

        Step 3: Isolated subnets for databases
          - 10.0.20.0/24 in us-east-1a
          - 10.0.21.0/24 in us-east-1b

        Result: 6 subnets, 3 tiers, 2 AZs. Each tier has
        its own routing and security rules.
      problems:
        - id: sd-kp2-p1
          type: ordering
          question: "Put these subnet design steps in order:"
          options:
            - "Choose the VPC CIDR block"
            - "Decide how many AZs to use"
            - "Allocate CIDR ranges for each subnet tier"
            - "Create route tables for public and private tiers"
          correct: [0, 1, 2, 3]
          explanation: "Start with the VPC CIDR, then decide AZ count, allocate ranges, and finally set up routing."
          difficulty: 3
        - id: sd-kp2-p2
          type: fill_blank
          question: "A /24 subnet provides ___ usable IP addresses (AWS reserves 5)."
          correct: "251"
          explanation: "A /24 has 256 IPs. AWS reserves 5 (network, router, DNS, future, broadcast), leaving 251."
          difficulty: 3
        - id: sd-kp2-p3
          type: multiple_choice
          question: "You have a /16 VPC. How many /24 subnets can you create?"
          options:
            - "16"
            - "64"
            - "256"
            - "1024"
          correct: 2
          explanation: "/16 has 65,536 IPs. /24 has 256 IPs. 65536 / 256 = 256 possible subnets."
          difficulty: 3

    # KP3: Independent application — "design it yourself"
    - id: subnet-design-kp3
      instruction: |
        You should now be able to design a subnet layout given
        requirements. Consider: number of tiers, AZs needed, IP
        capacity per subnet, and room for future growth.
      problems:
        - id: sd-kp3-p1
          type: scenario
          question: "Your app needs 3 tiers (web, app, DB), must survive an AZ failure, and each tier needs at most 100 IPs. What's the minimum number of subnets?"
          options:
            - "3 subnets"
            - "4 subnets"
            - "6 subnets"
            - "9 subnets"
          correct: 2
          explanation: "3 tiers * 2 AZs (minimum for AZ failure survival) = 6 subnets. Each /25 or /24 gives enough IPs."
          difficulty: 4
        - id: sd-kp3-p2
          type: scenario
          question: "You're running out of IPs in your /24 private subnets. Your VPC is 10.0.0.0/16. What should you do?"
          options:
            - "Expand the VPC CIDR"
            - "Add new, larger subnets (e.g., /22) in unused CIDR ranges"
            - "Move to IPv6 only"
            - "Reduce the number of AZs"
          correct: 1
          explanation: "You can't resize existing subnets, but you can add new larger subnets in unused ranges within the VPC CIDR."
          difficulty: 5
        - id: sd-kp3-p3
          type: multiple_choice
          question: "A /16 VPC uses 10.0.0.0/24 through 10.0.5.0/24. You need a new subnet with 500+ IPs. Which CIDR works?"
          options:
            - "10.0.6.0/24"
            - "10.0.8.0/22"
            - "10.0.6.0/23"
            - "10.0.4.0/22"
          correct: 2
          explanation: "A /23 gives 512 IPs (507 usable). 10.0.6.0/23 covers 10.0.6.0-10.0.7.255, which doesn't overlap with existing subnets."
          difficulty: 5`}
        </CodeBlock>
      </section>

      {/* Authoring guidance */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="authoring-guidance">
          Authoring guidance
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mt-6">
              How many KPs?
            </h3>
            <p className="mt-2 text-muted-foreground">
              Use 2 KPs for simple concepts (definitions, straightforward
              rules). Use 3-4 KPs for applied concepts where there&apos;s a
              meaningful gap between &quot;I know it&quot; and &quot;I can do
              it.&quot; Never exceed 4 — if you need more, the concept is too
              broad and should be split.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mt-6">
              Problem count per KP
            </h3>
            <p className="mt-2 text-muted-foreground">
              Each KP needs at least 3 problems. The adaptive engine requires 2
              consecutive correct answers to pass a KP. With only 2 problems,
              the student sees the same questions on retry. With 3+, the engine
              can select different variants each time.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mt-6">
              Difficulty within a concept
            </h3>
            <p className="mt-2 text-muted-foreground">
              Difficulty should rise across KPs within a concept. KP1 problems
              at difficulty 1-2, KP2 at 2-3, KP3 at 3-4, KP4 at 4-5. The
              student should feel like climbing a staircase — each step is
              slightly higher, but never a jump. The{" "}
              <Link
                href="/docs/review-gate#difficulty_staircase"
                className="text-primary hover:underline"
              >
                review gate
              </Link>{" "}
              enforces that each concept has problems at 2+ distinct difficulty
              levels.
            </p>
          </div>
        </div>
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="space-y-3">
          <Link
            href="/docs/concepts/knowledge-graph"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            Knowledge Graph — prerequisites, frontiers, and course structure
          </Link>
          <Link
            href="/docs/concepts/mastery-learning"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            Mastery Learning — how the system decides when a concept is learned
          </Link>
          <Link
            href="/docs/course-schema"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            Course Schema — full YAML reference for authoring courses
          </Link>
        </div>
      </section>
    </div>
  );
}

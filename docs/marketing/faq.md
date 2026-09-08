# Graspful FAQ

## What is Graspful?

Graspful is a platform for courses with explanations, worked examples, practice questions, and scheduled review. Courses are stored in YAML files. You or an external agent, such as Claude or Codex, author those files and use Graspful CLI commands or MCP tools to validate, import, and publish them.

## Does Graspful write the course for me?

The CLI creates draft scaffolds. The `fill concept` command adds placeholder knowledge points and questions. Your external agent can replace those placeholders using your source material. The author reviews the facts, questions, and answer explanations before publication.

The MCP server gives your agent structured tools for course operations. It does not include a built-in model that researches and writes a complete course when you enter a topic.

## How do I start?

Install with `bun add -g @graspful/cli`. Give your agent the source material and the [course authoring runbook](../adding-a-course.md). You can scaffold, validate, and review locally. Register through `graspful register` before importing or publishing.

## Which agents can I use?

Use an agent that can run CLI commands or call MCP tools. Use CLI commands with Claude Code or Codex, or configure MCP using the format required by your client. The [MCP documentation](https://graspful.ai/docs/mcp) provides client-specific setup. `graspful init` authenticates and configures detected clients; it can start browser registration.

## What is the authoring workflow?

1. Define the audience, source material, and course scope.
2. Scaffold an academy and its course files.
3. Write the prerequisite graph, lessons, worked examples, and questions.
4. Run schema validation and quality checks. Fix each finding and check the facts against the sources.
5. Import the files as drafts and inspect the result.
6. Publish when ready, and check the command result to confirm that publication succeeded.

Import without `--publish` saves a draft. The [runbook](../adding-a-course.md) gives the full workflow.

## What do the quality checks establish?

The checks report mechanical issues such as invalid schema fields, circular prerequisites, missing content, repeated questions, and insufficient problem coverage. The checks use rules and heuristics. A passing result does not establish factual accuracy, teaching quality, or exam coverage.

Review the [quality gate implementation](../../packages/shared/src/quality-gate.ts) and [review guide](../course-review-gate.md) for the checks and their limits.

## How does learner progress work?

Diagnostic and practice answers update estimates of learner progress. The course's prerequisite graph helps the engine choose available lessons. Review schedules bring earlier concepts back for further practice. A progress estimate reflects performance on course questions; it does not certify professional competence or predict an exam result.

See the [diagnostic](../../backend/src/diagnostic), [learning engine](../../backend/src/learning-engine), and [spaced repetition](../../backend/src/spaced-repetition) implementations.

## Can I use audio?

Lesson text can be read aloud. Worked examples and practice questions can still require screen interaction, especially for diagrams or code. Review the course itself to see which material works well in audio.

## Can I use my own branding and domain?

Brand YAML controls the landing-page copy, theme, and course scope. A custom domain also requires DNS and hosting configuration. See the [brand format](../../content/brands/README.md) and [brand resolver](../../apps/web/src/lib/brand) for the configuration.

## Can I sell a course?

Paid subscriptions and creator payouts are not available yet. Stripe integration code is present, but live setup and payment verification are required before accepting customers. Proposed prices and revenue-share settings in the repository are under development.

## How long does course creation take?

There is no verified creation-time benchmark. It depends on the source material, course scope, authoring tools, and corrections required during review. Scaffolding produces a starting file; most of the work is in accurate explanations, useful questions, and review.

The [benchmark plan](benchmarks.md) defines what should be measured before publishing time or quality claims.

## How should I compare Graspful with other platforms?

Test each platform against the same course and learner workflow. Compare authoring tools, content export, lesson sequencing, review, access controls, and the payment flows you need. See the [evaluation guide](comparison.md) for a concrete checklist.

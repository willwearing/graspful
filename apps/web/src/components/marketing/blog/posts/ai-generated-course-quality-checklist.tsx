import { A, Code, H2, P } from "../prose";

type CheckRow = { check: string; catches: string; who: "Automated" | "You" };

const checklist: CheckRow[] = [
  { check: "Schema and answer keys parse", catches: "Broken structure, answer keys that point at an option that doesn't exist", who: "Automated" },
  { check: "Unique problem IDs", catches: "Two problems that share one ID anywhere in the course", who: "Automated" },
  { check: "No placeholders left", catches: "Concepts with no teaching, TODO or lorem ipsum text, teaching under 5 words", who: "Automated" },
  { check: "No duplicate questions", catches: "The same question at the same difficulty in two places", who: "Automated" },
  { check: "Two or more difficulty levels", catches: "A concept where every question is equally easy", who: "Automated" },
  { check: "Questions match the lessons", catches: "A knowledge point where no question shares vocabulary with what was taught", who: "Automated" },
  { check: "Three or more problems per knowledge point", catches: "Too little practice to tell whether a learner knows it", who: "Automated" },
  { check: "Long lessons broken up", catches: "Walls of text over 100 words with no content blocks", who: "Automated" },
  { check: "Worked examples", catches: "Fewer than half of the concepts show a worked example", who: "Automated" },
  { check: "Prerequisites are valid", catches: "Missing prerequisites, duplicate IDs, prerequisite cycles", who: "Automated" },
  { check: "Facts match the source", catches: "A wrong number, date, name, step or rule that reads fine", who: "You" },
  { check: "One right answer per question", catches: "A distractor that is also true under your policy", who: "You" },
  { check: "Current, official source", catches: "A course built from last year's handbook or a marketing page", who: "You" },
  { check: "Prerequisite order makes sense", catches: "A concept that needs something the graph doesn't list first", who: "You" },
  { check: "Explanations teach", catches: "Explanations that repeat the answer and don't say why", who: "You" },
];

export function AiGeneratedCourseQualityChecklist() {
  return (
    <>
      <P>
        Check an AI-generated course in two passes before you publish. First,
        run automated checks for the things a machine can count: structure,
        duplicate questions, practice depth, difficulty levels and prerequisite
        order. Then a person checks the things a machine can&apos;t: every fact
        and answer key against your source. Graspful is an adaptive learning
        platform where AI agents like Claude Code build courses through a CLI
        and an MCP server, and it runs the first pass as 10 automated review
        checks.
      </P>
      <P>
        This page gives you the full 15-point checklist, real output from the
        Graspful review on a small sample course, and the one failure no
        automated check can catch.
      </P>

      <H2 id="checklist">The 15-point checklist</H2>
      <P>
        The first 10 rows are the checks <code>graspful review</code> runs.
        The last 5 are yours. Most checklists for AI course content are only
        the last kind, so a reviewer spends an afternoon counting questions
        instead of reading for accuracy.
      </P>
      <div className="my-6 overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Check</th>
              <th className="px-4 py-3 font-semibold">What it catches</th>
              <th className="px-4 py-3 font-semibold">Who checks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {checklist.map((row, index) => (
              <tr key={row.check}>
                <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-3 font-medium">{row.check}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.catches}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.who}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        The <A href="/docs/review-gate">review gate docs</A> list the exact
        rule and fix for each of the 10 automated checks.
      </P>

      <H2 id="automated">Pass 1: run the automated checks</H2>
      <P>
        Install the CLI and run two commands on the course file. Both run on
        your machine with no account.
      </P>
      <Code>{`bun add -g @graspful/cli
graspful validate course.yaml
graspful review course.yaml`}</Code>
      <P>
        <code>validate</code> checks the file against the{" "}
        <A href="/docs/course-schema">course schema</A>.{" "}
        <code>review</code> runs the 10 checks. To show what a failure looks
        like, we wrote a two-concept course on a made-up refund policy, then
        broke it the way an agent often does: we pasted a question from the
        first concept into the second, and set every problem in the second
        concept to the same difficulty. This is the real output:
      </P>
      <Code>{`$ graspful review refunds-broken.yaml
FAIL
Score: 8/10
Stats: 2 concepts (2 authored, 0 stubs), 2 KPs, 6 problems

Failures:
  [FAIL] question_deduplication: "refund-exceptions-kp1-p1" collides with "refund-window-kp1-p1" (same question text at same difficulty)
  [FAIL] difficulty_staircase: "refund-exceptions" has problems at only 1 difficulty level(s) - need 2+`}</Code>
      <P>
        Each failure names the problem or concept and what is wrong. If an
        agent wrote the course, give it this output and ask it to fix the
        failures and run the review again. <code>graspful review</code> exits
        with code 1 when a check fails, so you can also run it in CI and block
        a merge on a failing course. Add <code>--format json</code> for
        machine-readable output.
      </P>
      <P>
        If you use Claude Code, Cursor or Codex with the{" "}
        <A href="/docs/mcp">Graspful MCP server</A>, the agent can run the same
        review itself through the <code>graspful_review_course</code> tool.
      </P>

      <H2 id="limits">What the automated checks can&apos;t see</H2>
      <P>
        Here is the fixed version of the same course. It passes every check:
      </P>
      <Code>{`$ graspful review refunds.yaml
PASS
Score: 10/10
Stats: 2 concepts (2 authored, 0 stubs), 2 KPs, 6 problems`}</Code>
      <P>
        Now say the real handbook gives customers 14 days to ask for a refund.
        The course teaches 30. The lesson says 30, the worked example uses 30,
        and the answer key marks 30 as correct. The course is consistent with
        itself, so it scores 10/10. It will also train every new support agent
        to give the wrong answer.
      </P>
      <P>
        That is the limit of any automated review. The teaching alignment check
        is a vocabulary check: it fails a knowledge point only when none of its
        questions share words with the lesson, worked example or
        prerequisites. It can tell you a question is about refunds. It
        can&apos;t tell you the refund window is wrong. A 10/10 score means the
        course is complete and well-formed. It doesn&apos;t mean it&apos;s
        true.
      </P>

      <H2 id="human">Pass 2: the five checks only you can do</H2>
      <P>
        <strong>11. Facts match the source.</strong> Read each lesson with the
        source open beside it. Mark every number, date, name, threshold and
        step in a process, and find each one in the source. Then do the same
        for the answer keys, because an agent can write a correct lesson and a
        wrong key.
      </P>
      <P>
        <strong>12. One right answer per question.</strong> For each multiple
        choice question, read every wrong option and ask whether it could be
        true under your rules. &quot;A partial refund&quot; is a bad distractor
        if your team gives partial refunds in some cases.
      </P>
      <P>
        <strong>13. Current, official source.</strong> A Graspful course file
        can record its source in the <code>sourceDocument</code> field. Fill it
        in, and check that it names the version your team follows today. Leave
        out marketing pages and old drafts.
      </P>
      <P>
        <strong>14. Prerequisite order makes sense.</strong> The automated
        check proves the graph has no cycles and no missing references. It
        can&apos;t tell you that a concept needs something the graph forgot.
        Ask someone who knows the material to read the concept list in order.
        Graspful uses this{" "}
        <A href="/docs/concepts/knowledge-graph">knowledge graph</A> to decide
        what each learner sees next, so a missing edge means a learner gets
        material they can&apos;t follow yet.
      </P>
      <P>
        <strong>15. Explanations teach.</strong> A learner reads the
        explanation right after a wrong answer. &quot;The answer is
        B&quot; doesn&apos;t help. A good explanation says why B is right and,
        where it helps, why the tempting wrong answer is wrong.
      </P>

      <H2 id="faster">How to make the human pass faster</H2>
      <P>
        You can split the fact check with a second agent session. Give it only
        the course file and the source, and ask it to list every claim and
        answer key it can&apos;t find in the source, with the line it checked.
        Treat its list as a place to start. A person still reads the flagged
        items and decides.
      </P>
      <Code>{`Here is course.yaml and docs/refunds.md. For every lesson, worked
example and answer key in the course, find the sentence in the source
that supports it. List each claim you can't find support for, and each
claim that disagrees with the source. Quote the source line you used.`}</Code>
      <P>
        Fix what it finds, run <code>graspful review</code> again, and keep
        the score at 10/10 after your edits.
      </P>

      <H2 id="publish">Publish only after both passes</H2>
      <P>
        When both passes are done, import the course as a draft with{" "}
        <code>graspful import course.yaml --org &lt;your-org-slug&gt;</code>,
        then publish it. Graspful runs the same 10 checks on the server when
        you publish, so a course that fails a check stays a draft. The human
        pass has no server-side version. It&apos;s on you.
      </P>
      <P>
        If you are building the course from your own docs, the{" "}
        <A href="/blog/turn-docs-into-a-course-with-claude-code">
          docs-to-course walkthrough
        </A>{" "}
        covers the steps before this one: the concept graph, the scaffold and
        filling one concept at a time. The{" "}
        <A href="/docs/quickstart">quickstart</A> has every command in one
        place.
      </P>
    </>
  );
}

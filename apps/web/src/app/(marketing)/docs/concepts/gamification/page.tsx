import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Gamification — Graspful Docs",
  description:
    "XP system, streaks, leaderboards, and engagement mechanics in Graspful. Calibrated to reward quality study and prevent gaming.",
  keywords: [
    "gamification",
    "XP system",
    "streaks",
    "leaderboards",
    "engagement",
    "adaptive learning",
    "daily practice",
  ],
};

const xpTable = [
  { activity: "Lesson (new KP)", xp: "10 - 20", notes: "Scales with concept difficulty" },
  { activity: "Review (correct)", xp: "3 - 5", notes: "Scales with memory strength (lower = more XP)" },
  { activity: "Quiz", xp: "15+", notes: "Based on score and question count" },
  { activity: "Section Exam", xp: "25+", notes: "Bonus for first-attempt pass" },
  { activity: "Diagnostic Test", xp: "5 - 10", notes: "Flat rate, no gaming incentive" },
];

export default function GamificationPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Gamification
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Graspful uses XP, streaks, and leaderboards to drive consistent daily
        practice. The system is calibrated so that gaming it is harder than
        actually learning.
      </p>

      {/* Design philosophy */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="design-philosophy">
          Design philosophy
        </h2>
        <p className="mt-2 text-muted-foreground">
          Gamification serves learning, not the other way around. Every mechanic
          exists to reinforce a specific study behavior:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">XP</strong> — rewards quality
            engagement, not time spent or clicks
          </li>
          <li>
            <strong className="text-foreground">Streaks</strong> — drive daily
            consistency, which is the strongest predictor of course completion
          </li>
          <li>
            <strong className="text-foreground">Leaderboards</strong> — create
            healthy social motivation within a cohort
          </li>
          <li>
            <strong className="text-foreground">Completion estimates</strong> —
            connect daily effort to a tangible outcome
          </li>
        </ul>
        <p className="mt-4 text-muted-foreground">
          The target calibration is roughly{" "}
          <strong className="text-foreground">1 XP per minute of quality
          study</strong>. A focused 30-minute session should earn around 30 XP.
          This keeps the numbers intuitive for learners and administrators.
        </p>
      </section>

      {/* XP system */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="xp-system">
          XP by activity
        </h2>
        <p className="mt-2 text-muted-foreground">
          Different activities award different XP amounts. Harder concepts and
          lower memory strength increase the payout.
        </p>
        <div className="mt-4 rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
                  Activity
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
                  XP Range
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {xpTable.map((row) => (
                <tr
                  key={row.activity}
                  className="border-b border-border/20 last:border-0"
                >
                  <td className="px-4 py-2 text-sm font-medium text-foreground whitespace-nowrap">
                    {row.activity}
                  </td>
                  <td className="px-4 py-2 text-sm font-mono text-primary whitespace-nowrap">
                    {row.xp}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {row.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Difficulty scaling */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="difficulty-scaling">
          Difficulty scaling
        </h2>
        <p className="mt-2 text-muted-foreground">
          XP scales with concept difficulty to reward students who tackle harder
          material. A difficulty-8 concept awards roughly 2x the XP of a
          difficulty-3 concept for the same activity type. This prevents
          students from farming easy concepts for points.
        </p>
        <CodeBlock language="yaml" title="xp-scaling-example.yaml">
          {`# XP award for completing a new lesson KP
# Base: 10 XP, scaled by concept difficulty

concept: cidr-notation
difficulty: 3
xp_awarded: 12   # 10 * (1 + 0.03 * 3) = 10.9, rounded

concept: multi-az-architecture
difficulty: 7
xp_awarded: 17   # 10 * (1 + 0.03 * 7) = 12.1...
                  # plus bonus for higher difficulty tier

# Review XP scales inversely with memory strength
# Lower memory = harder recall = more XP
concept: vpc-basics
memory_strength: 0.28
review_xp: 5     # near-forgotten, full review XP

concept: shared-responsibility
memory_strength: 0.45
review_xp: 3     # still fresh-ish, lower XP`}
        </CodeBlock>
      </section>

      {/* Anti-gaming */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="anti-gaming">
          Anti-gaming measures
        </h2>
        <p className="mt-2 text-muted-foreground">
          The system includes several guards to ensure XP reflects actual
          learning, not button-mashing.
        </p>
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-border/30 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Minimum response time
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Answers submitted in under 2 seconds are flagged. The response is
              still recorded, but XP is reduced. This prevents
              rapid-fire guessing without reading the question.
            </p>
          </div>

          <div className="rounded-lg border border-border/30 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Diminishing returns on retries
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The first two attempts at a problem award full XP. From the 3rd
              attempt onward, XP is significantly reduced. By that point the
              student has likely memorized the answer rather than understood the
              concept.
            </p>
          </div>

          <div className="rounded-lg border border-border/30 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Daily XP cap
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A cap of <strong className="text-foreground">500 XP per day</strong>{" "}
              prevents marathon grinding sessions. Research shows that
              distributed practice (spreading study across days) dramatically
              outperforms massed practice (cramming). The cap nudges students
              toward the better strategy. At ~1 XP/minute, 500 XP represents
              roughly 8 hours of study, well beyond a healthy daily session.
            </p>
          </div>
        </div>
      </section>

      {/* Streaks */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="streaks">
          Streaks
        </h2>
        <p className="mt-2 text-muted-foreground">
          A streak counts consecutive calendar days where the student earned at
          least 1 XP. It&apos;s the simplest and most effective engagement
          mechanic: just show up and do something every day.
        </p>
        <h3 className="text-lg font-semibold text-foreground mt-6">
          Why streaks work
        </h3>
        <p className="mt-2 text-muted-foreground">
          Streaks convert a vague goal (&quot;I should study more&quot;) into a
          concrete daily action (&quot;I need to answer at least one question
          today&quot;). The longer the streak, the stronger the motivation to
          maintain it. A 30-day streak creates real psychological commitment.
        </p>
        <h3 className="text-lg font-semibold text-foreground mt-6">
          Streak mechanics
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Increment:</strong> any XP-earning
            activity on a new calendar day extends the streak by 1
          </li>
          <li>
            <strong className="text-foreground">Reset:</strong> missing a full
            calendar day resets the streak to 0
          </li>
          <li>
            <strong className="text-foreground">Timezone:</strong> streaks use the
            student&apos;s local timezone, set at enrollment
          </li>
          <li>
            <strong className="text-foreground">Display:</strong> current streak
            length and longest-ever streak are shown on the student dashboard
          </li>
        </ul>
      </section>

      {/* Leaderboards */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="leaderboards">
          Leaderboards
        </h2>
        <p className="mt-2 text-muted-foreground">
          Weekly XP leaderboards rank students within their academy or
          organization. Leaderboards reset every Monday at midnight (organization
          timezone) to give everyone a fresh start and prevent runaway leaders
          from discouraging others.
        </p>
        <h3 className="text-lg font-semibold text-foreground mt-6">
          Scoping
        </h3>
        <p className="mt-2 text-muted-foreground">
          Leaderboards are scoped to the organization level, so students only
          compete with peers studying similar material. An org admin can enable or
          disable leaderboards. When disabled, students still earn XP and streaks
          but don&apos;t see rankings.
        </p>
      </section>

      {/* Completion estimates */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="completion-estimates">
          Completion estimates
        </h2>
        <p className="mt-2 text-muted-foreground">
          Graspful projects a completion date for each course based on the
          student&apos;s daily XP target and remaining content. This makes the
          abstract (&quot;I&apos;m 40% done&quot;) concrete (&quot;At this
          pace, I&apos;ll finish by March 15&quot;).
        </p>
        <CodeBlock language="yaml" title="completion-estimate.yaml">
          {`# Completion estimate calculation
course: aws-saa-c03
total_estimated_minutes: 2400    # from course.estimatedHours
completed_minutes: 960           # based on mastered concepts
remaining_minutes: 1440

daily_xp_target: 30              # ~30 min/day at 1 XP/min
projected_days_remaining: 48
projected_completion: "2026-05-10"

# Adjusts dynamically:
# - Faster students see earlier dates
# - Remediation time is factored in
# - Diagnostic test credit reduces remaining time`}
        </CodeBlock>
        <p className="mt-2 text-muted-foreground">
          The estimate updates daily based on actual pace. Students who
          consistently exceed their XP target see the date pull forward.
          Students who slow down see it push back. This feedback loop
          encourages steady effort.
        </p>
      </section>

      {/* Configuration */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="configuration">
          Configuration
        </h2>
        <p className="mt-2 text-muted-foreground">
          Gamification settings are configured per-organization. Academies can
          tune the system to match their learner population and culture.
        </p>
        <CodeBlock language="yaml" title="gamification-config.yaml">
          {`# Organization-level gamification settings
gamification:
  xp:
    enabled: true
    dailyCap: 500              # max XP per day (0 = unlimited)
    minResponseTimeMs: 2000    # below this, XP is reduced
    retryPenaltyAfter: 2       # reduced XP from attempt 3+

  streaks:
    enabled: true
    timezone: "America/New_York"

  leaderboards:
    enabled: true
    resetDay: "monday"         # weekly reset
    scope: "organization"      # or "course"

  completionEstimates:
    enabled: true
    defaultDailyXpTarget: 30   # used until student sets their own`}
        </CodeBlock>
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="space-y-3">
          <Link
            href="/docs/concepts/task-selection"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            Task Selection — how the system decides what to show next
          </Link>
          <Link
            href="/docs/concepts/learning-staircase"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            The Learning Staircase — knowledge points and scaffolding
          </Link>
          <Link
            href="/docs/concepts/spaced-repetition"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            Spaced Repetition — the FIRe algorithm that schedules reviews
          </Link>
        </div>
      </section>
    </div>
  );
}

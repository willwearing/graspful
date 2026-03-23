import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Glossary — Graspful Docs",
  description:
    "Consistent definitions for every concept in the Graspful adaptive learning platform. Academy, BKT, concept, diagnostic, FIRe, knowledge frontier, mastery state, MEPE, and more.",
  keywords: [
    "graspful glossary",
    "adaptive learning terms",
    "knowledge graph glossary",
    "spaced repetition glossary",
    "BKT",
    "FIRe algorithm",
    "MEPE",
  ],
};

const terms = [
  {
    id: "academy",
    term: "Academy",
    definition:
      "A connected curriculum graph spanning multiple courses. An academy lets you organize related courses into a single product — for example, an \"AWS Certification Academy\" containing courses for SAA-C03, DVA-C02, and SOA-C02. Students can navigate across courses within the same academy, and prerequisites can span course boundaries.",
  },
  {
    id: "academy-part",
    term: "Academy Part",
    definition:
      "An organizational grouping inside an academy. Academy parts are used to cluster courses into categories or tiers — for example, \"Foundation\" and \"Associate\" tracks within a certification academy. They are a display-level concept with no impact on the adaptive engine.",
  },
  {
    id: "bayesian-knowledge-tracing-bkt",
    term: "Bayesian Knowledge Tracing (BKT)",
    definition:
      "A probabilistic model that tracks P(Learned) — the probability a student has mastered a given concept. BKT updates after every answer using four parameters: P(L0) (prior knowledge), P(T) (probability of learning per opportunity), P(G) (probability of a lucky guess), and P(S) (probability of a careless slip). The diagnostic engine uses BKT to build the initial mastery map, and the learning engine uses it to track ongoing progress.",
  },
  {
    id: "concept",
    term: "Concept",
    definition:
      "The atomic unit of knowledge in the graph. A concept represents one teachable idea that can be tested independently. Good granularity: \"Forms of Co-Ownership\" or \"JavaScript Closures\". Too broad: \"All of Property Law\". Too narrow: \"Definition of Joint Tenancy\" (this should be a knowledge point, not a concept). Each concept has a difficulty rating (1-10), prerequisites, optional encompassing edges, and 2-4 knowledge points.",
  },
  {
    id: "course",
    term: "Course",
    definition:
      "A named subgraph of an academy representing a single learning path. A course contains sections, concepts, prerequisite edges, and encompassing edges. It is defined as a YAML file and imported via the CLI or MCP server. A course can stand alone or be grouped with other courses in an academy.",
  },
  {
    id: "course-section",
    term: "Course Section",
    definition:
      "A human-readable grouping of concepts within a course. Sections provide organizational structure for the student — for example, \"Networking Fundamentals\" or \"Advanced VPC Design\". Each section can optionally have a section exam that gates progression. Sections have no effect on the prerequisite graph; they are purely for display and exam grouping.",
  },
  {
    id: "diagnostic-session",
    term: "Diagnostic Session",
    definition:
      "An adaptive assessment that maps what a student already knows at the start of a course. The diagnostic asks 20-60 questions, selected by the MEPE algorithm to maximize information gain per question. It uses BKT to update mastery estimates in real time and stops when additional questions would yield diminishing returns. The output is a complete mastery map for every concept in the course.",
  },
  {
    id: "encompassing-edge",
    term: "Encompassing Edge",
    definition:
      "A weighted directed edge in the knowledge graph indicating that practicing concept A implicitly exercises concept B. Written as { concept: B, weight: 0.7 } on concept A. The weight (0.0-1.0) controls how much implicit review credit the spaced repetition engine grants. A weight of 1.0 means A fully exercises B as a subskill. A weight of 0.3 means A partially exercises B. Encompassing edges are the key mechanism that reduces the total review burden in the FIRe algorithm.",
  },
  {
    id: "fire",
    term: "FIRe (Fractional Implicit Repetition)",
    definition:
      "The spaced repetition algorithm used by Graspful. FIRe extends traditional spaced repetition (SM-2 style intervals) with implicit review credit through encompassing edges. When a student practices concept A and A encompasses concept B with weight w, concept B's repetition counter advances by w. This means foundational concepts get reviewed for free as students work on advanced material, significantly reducing the number of explicit review sessions needed.",
  },
  {
    id: "knowledge-frontier",
    term: "Knowledge Frontier",
    definition:
      "The set of unmastered concepts whose prerequisites are all mastered. The frontier is the \"leading edge\" of what a student can learn right now. The learning engine selects new learning tasks exclusively from the frontier, ensuring students always have the prerequisite knowledge for whatever they are working on. As students master frontier concepts, new concepts become available and the frontier advances.",
  },
  {
    id: "knowledge-point-kp",
    term: "Knowledge Point (KP)",
    definition:
      "A progressive difficulty stage within a concept. Each concept has 2-4 KPs forming a learning staircase: KP1 is typically recognition (can you identify it?), KP2 is guided application (can you use it with support?), and KP3 is transfer (can you apply it in a novel context?). Each KP has its own instruction text, optional worked example, and 3+ practice problems. A student masters a KP by answering two consecutive problems correctly.",
  },
  {
    id: "mastery-state",
    term: "Mastery State",
    definition:
      "The current learning status of a student on a specific concept. One of four values: unstarted (never attempted), in_progress (working through KPs), mastered (all KPs passed), or needs_review (mastered but memory has decayed below the review threshold). The mastery state drives task selection: in_progress concepts are prioritized, needs_review triggers spaced repetition, and unstarted frontier concepts are queued for new learning.",
  },
  {
    id: "memory",
    term: "Memory",
    definition:
      "A per-concept P(Learned) estimate between 0 and 1 that decays over time. Memory starts at 1.0 when a concept is mastered and decays according to the FIRe algorithm's forgetting curve. When memory drops below a threshold (typically 0.8), the concept transitions to needs_review and a review task is scheduled. Implicit review credit from encompassing edges slows memory decay for foundational concepts.",
  },
  {
    id: "mepe",
    term: "MEPE (Maximum Expected Posterior Entropy)",
    definition:
      "The algorithm used to select questions during diagnostic sessions. MEPE chooses the question whose answer — regardless of whether the student gets it right or wrong — is expected to reduce the most uncertainty across the entire knowledge graph. This makes diagnostics maximally efficient: each question provides the most possible information about the student's overall knowledge state.",
  },
  {
    id: "plateau-detection",
    term: "Plateau Detection",
    definition:
      "The mechanism for identifying blocked students. A plateau is detected when a student fails two or more consecutive attempts on the same concept (failCount >= 2). When a plateau is detected, the engine examines the student's prerequisite concepts to find the weakest one — the prerequisite with the lowest memory or mastery confidence. That weak prerequisite becomes the target of a remediation task.",
  },
  {
    id: "prerequisite-edge",
    term: "Prerequisite Edge",
    definition:
      "A directed edge in the knowledge graph indicating that concept A must be mastered before concept B can be started. Written as prerequisites: [A] on concept B in the course YAML. The prerequisite graph must be a DAG (no cycles). Best practice is to list only direct prerequisites (max 3-4 per concept) — transitive prerequisites are inferred automatically.",
  },
  {
    id: "remediation",
    term: "Remediation",
    definition:
      "Targeted practice on a weak prerequisite that is blocking a student's progress on a downstream concept. When plateau detection identifies a weak prerequisite, the engine pauses work on the blocked concept and assigns practice on the prerequisite instead. Once the prerequisite is strengthened (memory restored above threshold), the student returns to the original concept. Remediation tasks have the highest priority in the task selection system.",
  },
  {
    id: "repetition-number",
    term: "Repetition Number (repNum)",
    definition:
      "A counter tracking the review history of a mastered concept. The repetition number determines the next review interval using an expanding schedule (similar to SM-2). Higher repNum values mean longer intervals between reviews. The FIRe algorithm increments repNum fractionally via encompassing edges — if a student practices an advanced concept that encompasses a foundational one at weight 0.5, the foundational concept's repNum increases by 0.5.",
  },
  {
    id: "section-exam",
    term: "Section Exam",
    definition:
      "A cumulative assessment across all concepts in a course section. Section exams are optional gating checkpoints: a student must pass the exam (default 75% score) to advance to concepts in the next section. Each exam has a blueprint specifying minimum questions per concept, ensuring broad coverage. Section exams test unaided reasoning — no instruction text or hints are provided.",
  },
  {
    id: "speed",
    term: "Speed",
    definition:
      "A per-concept learning velocity calculated as exp(abilityTheta - difficultyTheta), where abilityTheta is the student's estimated ability on this concept and difficultyTheta is the concept's estimated difficulty. Speed > 1 means the student learns faster than average for this concept. Speed < 1 means slower. The engine uses speed to estimate time-to-mastery and to calibrate XP awards.",
  },
  {
    id: "student-concept-state",
    term: "Student Concept State",
    definition:
      "The living mastery profile for one student on one concept. It tracks the mastery state (unstarted, in_progress, mastered, needs_review), memory (P(Learned)), repetition number, fail count, speed, and the current KP index. Student concept state is the primary input to the task selection algorithm and the spaced repetition scheduler.",
  },
  {
    id: "xp",
    term: "XP (Experience Points)",
    definition:
      "A reward metric calibrated to approximately 1 XP per minute of study. XP is earned for answering practice problems correctly, completing knowledge points, passing section exams, and completing spaced repetition reviews. The calibration is intentional: a student with 600 XP has studied for roughly 10 hours. XP drives the gamification layer — streaks, leaderboards, and progress displays all reference XP totals.",
  },
];

export default function GlossaryPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Glossary
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Every term in the Graspful platform, defined once. This page is
        designed for both human readers and AI agents — if you need to look up
        what a concept means, start here.
      </p>

      <section className="mt-12 space-y-0 divide-y divide-border/50 rounded-xl border border-border/50 overflow-hidden">
        {terms.map((t) => (
          <div key={t.id} className="px-6 py-5" id={t.id}>
            <h3 className="text-base font-semibold text-foreground">
              {t.term}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {t.definition}
            </p>
          </div>
        ))}
      </section>

      {/* Next steps */}
      <section className="mt-16 rounded-xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Next steps</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/how-it-works"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>How Graspful Works — system overview</span>
          </Link>
          <Link
            href="/docs/course-creation-guide"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Course Creation Guide — build your first course</span>
          </Link>
          <Link
            href="/docs/course-schema"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Course Schema — full YAML field reference</span>
          </Link>
          <Link
            href="/docs/quickstart"
            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <span>Quickstart — create a course in 5 minutes</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

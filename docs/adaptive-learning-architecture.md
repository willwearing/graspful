# Adaptive Learning Architecture

> Mastery-based adaptive learning system inspired by Math Academy. Subject-agnostic, white-label, no code to add a new course -- just content and a knowledge graph definition.

**Status:** Not Started — this is now the FIRST major system to be built (Phases 2-6 in PLAN.md)

**Core thesis:** We're not building "audio flashcards." We're building an expert system that compresses a course's worth of learning into the shortest possible path for each individual student, then delivers that path via audio instruction + active practice.

---

## Table of Contents

1. [The Seven Principles](#1-the-seven-principles)
2. [How Math Academy Works (Reference Model)](#2-how-math-academy-works-reference-model)
3. [Knowledge Graph Design](#3-knowledge-graph-design)
4. [Content Authoring Model](#4-content-authoring-model-no-code-just-content)
5. [Diagnostic Assessment](#5-diagnostic-assessment)
6. [Student Model & Mastery Tracking](#6-student-model--mastery-tracking)
7. [Task Selection Algorithm](#7-task-selection-algorithm)
8. [Spaced Repetition (FIRe-Inspired)](#8-spaced-repetition-fire-inspired)
9. [Active Practice & Testing](#9-active-practice--testing)
10. [XP System & Gamification](#10-xp-system--gamification)
11. [DDD Bounded Contexts (Backend)](#11-ddd-bounded-contexts-backend)
12. [Data Model Additions](#12-data-model-additions)
13. [API Surface](#13-api-surface)
14. [Integration with Existing Audio System](#14-integration-with-existing-audio-system)
15. [Implementation Phases](#15-implementation-phases)
16. [Key Sources & Further Reading](#16-key-sources--further-reading)

---

## 1. The Seven Principles

These principles govern how the system compresses learning time. Every architectural decision traces back to one or more of these.

### Principle 1: Identify What the Student Already Knows

A diagnostic assessment at enrollment uses adaptive questioning to efficiently map the student's existing knowledge. Correct answers on advanced topics imply mastery of prerequisites, so the system skips easier questions. The diagnostic compresses coverage of the full knowledge graph into 20-60 questions by selecting topics that provide maximum information about the student's knowledge profile.

### Principle 2: Build a Personal Knowledge Profile on the Knowledge Graph

The student's diagnostic results overlay onto the knowledge graph, producing a personal knowledge profile -- a map of which concepts are mastered, partially known, or unknown. This profile is the foundation for all personalization. It's a living document that updates with every interaction.

### Principle 3: Teach at the Knowledge Frontier

The "knowledge frontier" is the boundary between what the student knows and doesn't know. The system teaches only new topics for which the student has mastered all prerequisites. This means:
- No wasting time on material already known
- No confusing the student with material they lack foundations for
- Maximum learning efficiency: every minute spent is on the right thing

### Principle 4: Minimum Effective Dose of Instruction + Active Practice

Each lesson cycles through the smallest amount of explicitly guided instruction needed, immediately followed by active practice problems. The pattern:

```
Audio explanation (1-3 min) -> Worked example -> 2-3 practice problems -> Next knowledge point
```

This is interleaved, not "lecture then test." Students spend the majority of time actively solving problems, not passively listening.

### Principle 5: Enforce Mastery Relentlessly

If a student can't consistently solve problems correctly on a topic, they don't advance to material that depends on it. Instead:
- The system routes them to parallel learning paths (other topics at their frontier that don't share this prerequisite)
- Targeted prerequisite remediation identifies exactly which foundation is weak
- The student returns to the halted topic after remediation

Two consecutive failed attempts on a lesson trigger plateau detection. The system traces back through the knowledge graph to find the specific weak prerequisite and assigns targeted review.

### Principle 6: Spaced Repetition + Broad-Coverage Timed Quizzes

Previously learned material is reviewed using spaced repetition on an exponential schedule. Additionally, frequent closed-book timed quizzes cover broad swaths of recent material. Quiz difficulty targets ~80% expected performance -- hard enough to challenge, easy enough to reinforce confidence. Missed quiz topics immediately trigger targeted review.

### Principle 7: Review Old Stuff by Learning New Stuff

This is the key efficiency innovation (borrowed from Math Academy's "Fractional Implicit Repetition" model). When a student learns an advanced topic, they implicitly practice its prerequisites as subskills. The system tracks these implicit repetitions and credits them against the spaced repetition schedule for prerequisite topics. This dramatically reduces the explicit review burden -- you review by advancing, not by going backwards.

---

## 2. How Math Academy Works (Reference Model)

We studied Math Academy (mathacademy.com) extensively. Here's what we're borrowing and what we're adapting.

### What Math Academy Does

- **Knowledge graph:** ~2,500 math topics, each with 3-4 knowledge points, connected by prerequisite and "encompassing" edges with fractional weights
- **Expert system:** Rule-based AI (not ML/neural nets) that emulates an expert human tutor
- **FIRe algorithm:** Fractional Implicit Repetition -- credit for practicing advanced topics flows backward through the graph to prerequisites
- **Diagnostic:** 20-60 adaptive questions that compress full-graph assessment
- **Mastery enforcement:** Can't advance without passing prerequisites. Plateau detection triggers prerequisite remediation
- **Content:** 100% manually authored. ~20 questions per knowledge point. Tens of thousands of worked examples
- **Team:** Built by 2 programmers (Justin Skycak on algorithms, Jason Roberts on UI) + ~12 PhD content staff
- **Tech stack:** JavaScript/Node.js across the board. Monolithic. "Tricky caching" for performance
- **Business:** Bootstrapped, ~$7-10M ARR, 12k+ students, $49/month

### What We're Borrowing

| Math Academy Concept | Our Adaptation |
|---------------------|----------------|
| Knowledge graph with prerequisite + encompassing edges | Same structure, but content-defined via JSON/YAML -- no code per course |
| Fractional Implicit Repetition (FIRe) | Simplified version: credit flows backward through encompassing edges |
| Adaptive diagnostic assessment | Same approach: select questions that maximize information about the graph |
| Mastery enforcement with plateau detection | Same: can't advance without prerequisites, remediation on failure |
| Minimum effective dose instruction | Audio explanation + worked example + practice problems |
| XP system calibrated to ~1 XP per minute | Same gamification model |
| Timed broad-coverage quizzes | Same: periodic quizzes across recent material |

### What We're Adapting

| Math Academy Approach | Our Approach |
|----------------------|--------------|
| Math-only, hand-built for one domain | General-purpose: any subject domain, defined by content authors |
| 100% manual encompassing weight calibration (250 hours) | Default heuristic weights from graph depth + content author overrides |
| Custom monolithic JS codebase | NestJS with DDD bounded contexts, separate learning domain |
| Web-only, no mobile app | Audio-first: web + mobile, offline support |
| Text + LaTeX instruction | Audio instruction (TTS) + text fallback + optional visual aids |
| No LLMs | Optional LLM for question generation bootstrapping (human-reviewed) |

### Key Sources

- **Justin Skycak's blog** (justinmath.com): Technical deep dives on the knowledge graph, FIRe algorithm, diagnostic system, and pedagogical theory
- **"The Math Academy Way"** book (free PDF): 400+ pages covering the science of learning and Math Academy's implementation. Available at justinmath.com/files/the-math-academy-way.pdf
- **HN AMA (Jan 2024)**: Justin answers technical questions: news.ycombinator.com/item?id=39050945
- **Frank Hecker's 11-part analysis** (Feb 2025): Most comprehensive external analysis, especially Part 7 (technology brief): frankhecker.com/2025/02/08/math-academy-part-1/
- **"How Our AI Works"** page: mathacademy.com/how-our-ai-works
- **CS Primer Show #23**: Podcast with deep technical discussion: show.csprimer.com/episodes/e23-mathacademy-and-the-efficient-pursuit-of-mastery

---

## 3. Knowledge Graph Design

The knowledge graph is the foundation. Every course is a section of the graph. The graph is **subject-agnostic** -- its structure is defined by content, not code.

### Node: Concept

A **concept** is the atomic unit of knowledge. It's a single idea, skill, or fact that can be taught and tested independently.

Examples across domains:
- Firefighting: "NFPA 1001 Section 5.3.1 -- Fire Behavior: Heat Transfer Methods"
- Aviation: "FAR 91.205 -- Required VFR Day Instruments"
- Electrical: "NEC Article 210 -- Branch Circuit Calculations"
- CDL: "Pre-Trip Inspection: Engine Compartment Checks"
- Real Estate: "Contract Law: Contingency Clauses"

Each concept contains:
- **1-4 knowledge points (KPs)** -- progressively harder stages within the concept
- **Metadata:** difficulty (1-10), estimated time (minutes), tags, source reference
- **Content:** audio explanation, worked example(s), practice problems per KP

### Edge Type 1: Prerequisite

Directed edge: "Concept A is a prerequisite for Concept B."

Meaning: You must master A before attempting B. The system will not teach B until A is mastered.

Constraints:
- Max 3-4 direct prerequisites per knowledge point (working memory limit: ~4 chunks)
- Prerequisites can be within the same course or from foundation courses
- Transitive: if A -> B -> C, then A is an implicit prerequisite of C

### Edge Type 2: Encompassing

Directed edge with fractional weight: "Concept B encompasses Concept A with weight 0.6."

Meaning: When a student practices Concept B, they implicitly practice 60% of Concept A. This is the key to review compression.

Weights range from 0.0 to 1.0:
- **1.0:** B fully exercises A as a subskill (e.g., "Multi-step circuit calculations" fully exercises "Ohm's Law")
- **0.5:** B partially exercises A (e.g., "Fire Attack Strategy" partially exercises "Water Supply Calculations")
- **0.1:** B tangentially touches A (e.g., "Emergency Response Planning" tangentially exercises "Radio Communication Protocols")

### Course = Subgraph

A **course** is simply a named subset of the knowledge graph. Creating a new course means:
1. Defining concepts (content)
2. Defining prerequisite edges between them
3. Defining encompassing edges with weights
4. Optionally marking some concepts as belonging to "foundation" courses that span multiple courses

No code. The graph is data.

### Graph Definition Format

Content authors define courses using structured data (JSON/YAML). The system ingests this and builds the graph.

```yaml
# courses/nfpa-1001-firefighter-i.yaml
course:
  id: nfpa-1001-ff1
  name: "NFPA 1001 - Firefighter I"
  description: "Complete preparation for Firefighter I certification"
  estimatedHours: 50
  version: "2024.1"

concepts:
  - id: fire-behavior-basics
    name: "Fire Behavior Fundamentals"
    difficulty: 2
    estimatedMinutes: 15
    tags: [fire-science, foundational]
    sourceRef: "NFPA 1001 Ch.5"
    knowledgePoints:
      - id: fire-triangle
        instruction: "content/ff1/fire-triangle.md"      # -> generates audio
        workedExample: "content/ff1/fire-triangle-ex.md"
        problems:
          - id: ft-p1
            type: multiple_choice
            question: "Which three elements make up the fire triangle?"
            options: [...]
            correct: 0
            explanation: "..."
          - id: ft-p2
            type: fill_blank
            question: "Removing ___ from the fire triangle is the principle behind smothering a fire."
            correct: "oxygen"
            explanation: "..."

  - id: heat-transfer
    name: "Heat Transfer Methods"
    difficulty: 3
    estimatedMinutes: 20
    tags: [fire-science]
    sourceRef: "NFPA 1001 Ch.5 Section 5.3.1"
    prerequisites:
      - fire-behavior-basics    # must master before attempting
    knowledgePoints:
      - id: conduction
        instruction: "content/ff1/conduction.md"
        workedExample: "content/ff1/conduction-ex.md"
        problems: [...]
      - id: convection
        instruction: "content/ff1/convection.md"
        problems: [...]
      - id: radiation
        instruction: "content/ff1/radiation.md"
        problems: [...]

  - id: fire-attack-strategy
    name: "Fire Attack Strategy"
    difficulty: 6
    estimatedMinutes: 30
    tags: [operations, tactics]
    prerequisites:
      - heat-transfer
      - water-supply-basics
      - hose-operations
    encompassing:
      - concept: heat-transfer
        weight: 0.5       # practicing fire attack implicitly reviews heat transfer
      - concept: water-supply-basics
        weight: 0.4
      - concept: hose-operations
        weight: 0.7
    knowledgePoints: [...]
```

### Heuristic Default Weights

Content authors can omit encompassing weights. The system applies heuristics:

1. **Direct prerequisite, same topic area:** default 0.5
2. **Direct prerequisite, different topic area:** default 0.3
3. **Indirect prerequisite (2+ steps back):** multiplicative decay (e.g., A->B = 0.5, B->C = 0.4, so A->C = 0.2)
4. **No encompassing relationship specified:** 0.0

Authors can override any weight. But heuristics are just a starting point -- the system must validate and adjust them from student data.

### Encompassing Weight Calibration Feedback Loop

The heuristic defaults will be wrong. Math Academy spent 250 hours on manual calibration and still doesn't have a published data-driven adjustment process. We build the feedback loop from day one.

**The core signal:** If students whose mastery of concept B came primarily from implicit credit (practicing advanced concept A that encompasses B) fail reviews of B at a higher rate than students who practiced B explicitly, the encompassing weight from A to B is too high.

#### Step 1: Instrument Two Mastery Pathways

For every concept, classify each student's mastery source:

```
implicit_ratio(student, concept) = implicit_credit_earned / total_credit_earned
```

- **Explicit mastery group:** `implicit_ratio < 0.4` (most credit from direct practice/review)
- **Implicit mastery group:** `implicit_ratio >= 0.6` (most credit from encompassing flow)
- **Mixed:** `0.4 <= implicit_ratio < 0.6` (excluded from comparison to reduce noise)

Track this on `StudentConceptState` via a new `implicitCreditRatio` field, updated on every repetition credit event.

#### Step 2: Compare Review Pass Rates

When concept B comes up for spaced repetition review, compare:

```
pass_rate_explicit(B) = reviews_passed / reviews_total  (explicit mastery group)
pass_rate_implicit(B) = reviews_passed / reviews_total  (implicit mastery group)
retention_gap(B) = pass_rate_explicit(B) - pass_rate_implicit(B)
```

This is analogous to CMU DataShop's learning curve analysis -- comparing whether two "learning pathways" produce equivalent retention.

**Reference:** DataShop Learning Curve Analysis (pslcdatashop.web.cmu.edu/help?page=learningCurve). A smooth, monotonically decreasing error rate = well-calibrated skill. Flat or rising error rate = miscalibrated.

#### Step 3: Detect Problems via Statistical Test

Use a two-proportion z-test:

- **H0:** `pass_rate_implicit = pass_rate_explicit`
- **H1:** `pass_rate_implicit < pass_rate_explicit`

Thresholds (derived from spaced repetition literature -- FSRS targets 90% desired retention):

| Retention Gap | Cohort Size (per group) | Action |
|---|---|---|
| < 0.10 | any | No action. Weight is working. |
| 0.10 - 0.15 | n >= 30 | Flag for monitoring. |
| > 0.15 | n >= 30, p < 0.05 | Flag for weight adjustment. |

#### Step 4: Adjust Weights

Two modes based on data volume:

**Low data (<100 reviews per concept): Bayesian shrinkage**

```
retention_ratio = pass_rate_implicit / pass_rate_explicit
w_new = w_old * retention_ratio
w_final = 0.7 * w_old + 0.3 * w_new    // exponential smoothing, conservative
```

**High data (100+ reviews per concept): Direct estimation**

```
retention_ratio = pass_rate_implicit / pass_rate_explicit

if retention_ratio < 0.85:       // implicit group retains <85% as well
  w_new = w_old * retention_ratio
elif retention_ratio > 0.95:     // implicit credit is working well
  w_new = min(1.0, w_old * 1.10) // consider increasing by 10%
else:
  w_new = w_old                  // no change needed
```

**Guardrails:**
- Maximum single adjustment: +/- 0.1
- Minimum meaningful change: 0.05 (smaller changes are noise)
- Cooldown: don't re-adjust a weight within 30 days
- Clamp all weights to [0.0, 1.0]
- Log every adjustment with before/after values and the data that triggered it

#### Step 5: Monitoring Dashboard

Track per encompassing edge:
1. Current weight (with history)
2. Cohort sizes (explicit vs implicit mastery groups)
3. Retention gap with confidence interval
4. Trend (widening or narrowing after last adjustment)

**Run the calibration job weekly** (or nightly once data volume supports it). Surface flagged edges in the admin dashboard for content author review -- the system proposes adjustments, a human approves.

**References:**
- Pavlik, Cen, Koedinger (2009) -- Learning Factors Transfer Analysis: measuring skill transfer via learning curve comparison
- de la Torre (2008) -- Q-Matrix Refinement via RMSEA: flagging misspecified skill mappings using fit statistics (threshold 0.05-0.1)
- FSRS optimizer (github.com/open-spaced-repetition/fsrs4anki) -- maximum likelihood parameter tuning from review history
- Koedinger, Yudelson, Pavlik (2016) -- Testing Theories of Transfer: evidence that transfer is narrow and skill-pair-specific

---

## 4. Content Authoring Model (No Code, Just Content)

Adding a new course must require **zero code changes.** The process:

### Step 1: Define the Knowledge Graph

Write a YAML/JSON file defining concepts, prerequisites, encompassing edges, and knowledge points. This is the hardest part -- it requires domain expertise.

### Step 2: Write Content for Each Knowledge Point

Each KP needs:
- **Instruction text** (1-3 paragraphs) -> converted to audio via TTS
- **Worked example** (a solved problem with step-by-step explanation) -> audio + optional visual
- **2-5 practice problems** with:
  - Question text (audio + text display)
  - Answer type: multiple_choice, fill_blank, true_false, ordering, matching
  - Correct answer(s)
  - Explanation (audio on reveal)
  - Difficulty rating (1-5 within the KP)

### Step 3: Write Diagnostic Questions

Separate from practice problems. 1-3 per concept, designed to quickly assess whether the student already knows the material. Higher discrimination power than practice problems.

### Step 4: Write Quiz Questions

Separate pool. More integrative -- test connections between concepts, not just isolated recall. Used for broad-coverage timed quizzes.

### Step 5: Import

Run the content import pipeline:
```bash
bun run import:course --file courses/nfpa-1001-firefighter-i.yaml --org org_abc123
```

The pipeline:
1. Validates the YAML against the schema
2. Validates graph integrity (no cycles, all prerequisites exist, max 4 prereqs per KP)
3. Generates audio for all instruction text and worked examples via TTS
4. Uploads audio to storage
5. Creates all database records (concepts, KPs, problems, edges, audio refs)
6. Generates a diagnostic question set (selects optimal coverage questions)
7. Reports: concept count, edge count, question count, estimated hours, orphan detection

### Content Scale Requirements

Per course, expect:
- **50-300 concepts** (smaller than Math Academy's 2,500 -- we're per-certification, not spanning grades)
- **150-1,200 knowledge points** (3-4 per concept)
- **300-6,000 practice problems** (2-5 per KP)
- **50-300 diagnostic questions** (1-3 per concept)
- **100-600 quiz questions** (2+ per concept, integrative)
- **50-300 hours of audio** (instruction + worked examples)

### Content Versioning

Regulations change yearly. The system supports:
- Course versions tied to exam year (e.g., "NFPA 1001 2024 Edition")
- Content updates that preserve student progress where concepts map 1:1
- Archived versions for students mid-course

---

## 5. Diagnostic Assessment

When a student enrolls in a course, they take an adaptive diagnostic before any learning begins.

### Mastery Estimation (Modified BKT)

Each concept has a mastery probability `P(L_c)` that updates with each observed answer. We use Bayesian Knowledge Tracing without the transition parameter (no learning happens during a diagnostic).

**Parameters per concept c:**
- `P(L0_c)` -- prior probability of mastery. Default: 0.5 (maximum uncertainty)
- `P(S_c)` -- slip probability: answering wrong despite mastery. Default: 0.1
- `P(G_c)` -- guess probability: answering right without mastery. Default: 0.2 for MC (1/options), 0.05 for fill-blank

**Update after correct answer on concept c:**

```
P(L_c | correct) = P(L_c) * (1 - P(S_c)) / [P(L_c) * (1 - P(S_c)) + (1 - P(L_c)) * P(G_c)]
```

**Update after incorrect answer on concept c:**

```
P(L_c | incorrect) = P(L_c) * P(S_c) / [P(L_c) * P(S_c) + (1 - P(L_c)) * (1 - P(G_c))]
```

These are straight Bayes' theorem applications. No libraries needed.

**Reference:** Corbett & Anderson (1995), "Knowledge tracing: Modeling the acquisition of procedural knowledge."

### Evidence Propagation Through the Graph

After updating `P(L_c)` for the directly-tested concept, propagate evidence through the prerequisite graph using a discount-factor heuristic:

**Rule 1: Correct answer propagates mastery UP to prerequisites.**

If a student can do concept C, they very likely know its prerequisites. For each ancestor `a` at depth `d` edges away:

```
P(L_a) = max(P(L_a), P(L_c | correct) * 0.85^d)
```

The 0.85 discount means: if you demonstrate mastery of C (P = 0.95), we infer P = 0.81 for a direct prerequisite, P = 0.69 for a grandparent. This is conservative -- better to re-test than to over-assume.

**Rule 2: Incorrect answer propagates doubt DOWN to dependents.**

If a student can't do concept C, they likely can't do things that depend on C. For each descendant `desc` at depth `k`:

```
P(L_desc) = min(P(L_desc), P(L_c | incorrect) + (1 - P(L_c | incorrect)) * (1 - 0.85^k))
```

**Rule 3: Don't propagate failure upward.** A student might know the prerequisites but fail to integrate them for the advanced concept. That's what the `P(S_c)` slip parameter captures.

**Reference:** This discount-factor approach is a practical simplification of Pearl's belief propagation on DAGs. Full message-passing is more principled but unnecessary for graphs under 300 nodes.

### Next-Question Selection: Minimum Expected Posterior Entropy

The scoring function picks the concept whose assessment will **maximally reduce total uncertainty** across the entire graph. This is information-theoretically optimal.

For each untested concept `j`:

```
score(j) = H_current - E[H_after_testing_j]
```

Where `H` is the total entropy across all concepts:

```
H = SUM over all concepts i: [-P(L_i) * log2(P(L_i)) - (1 - P(L_i)) * log2(1 - P(L_i))]
```

To compute `E[H_after_testing_j]`, simulate both outcomes:

```
P(correct_j) = P(L_j) * (1 - P(S_j)) + (1 - P(L_j)) * P(G_j)

// Simulate correct answer: run BKT update + graph propagation, compute new entropy
H_if_correct = total_entropy(state_after_correct_on_j)

// Simulate incorrect answer: run BKT update + graph propagation, compute new entropy
H_if_incorrect = total_entropy(state_after_incorrect_on_j)

E[H_after] = P(correct_j) * H_if_correct + (1 - P(correct_j)) * H_if_incorrect

score(j) = H_current - E[H_after]
```

**Select:** `j* = argmax(score(j))` -- the concept with the highest expected information gain.

**Why this works well on a knowledge graph:** Concepts with many descendants and ancestors have high information gain because evidence propagates to many nodes. The algorithm naturally gravitates toward "strategic" concepts in the middle of the graph that split known from unknown.

**Complexity:** For each candidate concept, simulate 2 outcomes and propagate through the graph. With 300 concepts: 300 candidates * 2 outcomes * O(300) propagation = ~180K operations per question. For 60 questions = ~10.8M operations total. Trivial -- well under 1 second on any modern machine.

### Response Time Discounting

Correct answers with excessive response time receive diminished evidence:

```
// If response time exceeds 2x the concept's expected time, discount the evidence
time_ratio = response_time_ms / expected_response_time_ms
if (time_ratio > 2.0 && correct):
  // Blend between full correct update and no update
  discount = max(0.3, 1.0 - (time_ratio - 2.0) * 0.2)
  P(L_c) = P(L_c_before) + discount * (P(L_c_after_correct) - P(L_c_before))
```

This prevents a student who struggles through a question for 5 minutes from getting full mastery credit.

### Stopping Criteria

```
function should_stop(P_mastery, num_questions):
  uncertain_count = count(c where 0.2 < P(L_c) < 0.8)

  if num_questions >= 60: return true            // hard cap
  if uncertain_count == 0: return true           // full coverage
  if num_questions >= 20 and uncertain_count < 5: return true  // diminishing returns
  return false
```

### Classification

After the diagnostic terminates, classify each concept:

| P(L_c) | Classification | Action |
|---|---|---|
| >= 0.8 | `mastered` | Skip this concept in learning path |
| 0.5 - 0.8 | `conditionally_mastered` | Mark mastered but verify if student struggles on dependents |
| 0.2 - 0.5 | `partially_known` | Teach, but may progress faster than unstarted concepts |
| < 0.2 | `unknown` | Teach from scratch |

### Diagnostic Output

1. **Knowledge profile:** mastery state per concept overlaid on the graph
2. **Knowledge frontier:** the boundary between mastered and unknown
3. **Global ability estimate:** MLE from all diagnostic responses (used to bootstrap `speed` -- see Section 6)
4. **Estimated completion time** at various daily XP targets
5. **Foundation gaps:** prerequisite concepts outside this course that need remediation

### Diagnostic Report

After the diagnostic, the student sees:
- Their knowledge frontier visualized on the graph
- Estimated time to course completion at various daily effort levels
- Which foundation gaps were identified
- Recommended daily XP target

**References:**
- ALEKS diagnostic: splits probability mass over knowledge states using half-split item selection (Falmagne & Doignon, 2011)
- Computerized Adaptive Testing: MEPE item selection is equivalent to maximizing mutual information (Tatsuoka, 2002; Wang et al., 2020)
- Math Academy diagnostic: compresses graph into minimum covering set, iterates by information gain (mathacademy.com/how-our-ai-works)

---

## 6. Student Model & Mastery Tracking

The student model is a per-student overlay on the knowledge graph.

### Per-Student-Concept State

For each (student, concept) pair, the system tracks:

```
{
  masteryState: 'unstarted' | 'in_progress' | 'mastered' | 'needs_review',
  repNum: number,             // accumulated successful spaced reps (FIRe)
  memory: number,             // current retention estimate (0-1)
  lastPracticedAt: timestamp,
  interval: number,           // days until next review needed
  speed: number,              // derived: exp(abilityTheta - difficultyTheta)
  abilityTheta: number,       // student ability on logit scale (Elo/IRT)
  speedRD: number,            // rating deviation: uncertainty in ability estimate (Glicko)
  observationCount: number,   // practice observations on this concept
  implicitCreditRatio: number,// fraction of total credit from implicit repetition
  failCount: number,          // consecutive failures (for plateau detection)
  diagnosticState: 'unknown' | 'mastered' | 'partially_known' | 'conditionally_mastered'
}
```

### Speed Parameter: Bootstrap, Update, and Convergence

The `speed` parameter modulates how much credit a student earns per spaced repetition in the FIRe equations. It represents `student_ability / concept_difficulty`. The challenge: for a new student on a new concept, we have no data.

The approach combines Elo-style updates (Pelanek 2016) with Glicko-style uncertainty tracking and response time evidence from IRT.

#### Bootstrap: Initial Estimate

**Stage 1: No data at all.** Before the diagnostic:

```
abilityTheta = 0.0     // centered, no information
speedRD = 350          // maximum uncertainty (Glicko scale)
speed = 1.0            // neutral default
```

**Stage 2: After diagnostic.** The diagnostic provides a global ability estimate via Maximum Likelihood Estimation:

```typescript
function bootstrapFromDiagnostic(
  responses: { conceptId: string; correct: boolean }[]
): number {
  let theta = 0;  // start at center

  // Newton-Raphson: find theta that maximizes likelihood of observed responses
  for (let iter = 0; iter < 20; iter++) {
    let gradient = 0;
    let hessian = 0;
    for (const r of responses) {
      const difficulty = getConceptDifficultyTheta(r.conceptId);
      const p = 1 / (1 + Math.exp(-(theta - difficulty)));
      gradient += (r.correct ? 1 : 0) - p;      // first derivative of log-likelihood
      hessian += p * (1 - p);                    // Fisher information
    }
    if (hessian < 0.001) break;
    theta += gradient / hessian;                  // Newton step
  }
  return theta;
}
```

With 20-60 diagnostic items, this converges in 5-10 iterations and produces an ability estimate with SE ~ 0.3-0.5 logits.

Then set per-concept initial speed:

```
abilityTheta = globalTheta   // from diagnostic
speedRD = 250                // reduced from 350 (we have some info)
speed = exp(abilityTheta - conceptDifficultyTheta)
```

**Concept difficulty on logit scale** is derived from authored difficulty (1-10):

```
difficultyTheta = (authored_difficulty - 5.5) * (6 / 9)  // maps 1-10 to roughly -3 to +3
```

Once population data is available (50+ attempts per concept), replace this with observed difficulty:

```
difficultyTheta = -ln(pass_rate / (1 - pass_rate))  // logit of observed pass rate
```

#### Update Rule: After Each Practice Observation

Every time a student answers a problem on concept C, update the speed estimate:

```typescript
function updateSpeed(state: SpeedState, obs: Observation, concept: ConceptParams): SpeedState {
  const { abilityTheta, speedRD, observationCount } = state;
  const { difficultyTheta, timeIntensity, timeIntensitySD } = concept;

  // 1. K-factor: high uncertainty = bigger updates (faster convergence for new students)
  const K = Math.max(0.05, 1.0 / (1 + 0.5 * observationCount));
  // K = 1.0 for first observation, 0.67 after 1, 0.5 after 2, converges toward 0.05

  // 2. Accuracy signal (standard Elo/Rasch)
  const expected = 1 / (1 + Math.exp(-(abilityTheta - difficultyTheta)));
  const actual = obs.correct ? 1 : 0;
  const accuracyResidual = actual - expected;

  // 3. Response time signal (Van der Linden lognormal model)
  const observedLogRT = Math.log(obs.responseTimeMs / 1000);
  const rtResidual = timeIntensity - observedLogRT;  // positive = faster than expected
  const normalizedRT = Math.max(-2, Math.min(2,      // clip outliers
    rtResidual / Math.max(timeIntensitySD, 0.5)
  ));

  // 4. Response time weight: grows from 0.1 to 0.3 as we collect more data
  const lambda = 0.1 + 0.2 * Math.min(1, observationCount / 20);

  // 5. Guessing detection: fast + incorrect = likely guessing, discount
  let rtWeight = lambda * normalizedRT;
  if (!obs.correct && normalizedRT > 0.5) {
    rtWeight *= 0.3;  // fast + wrong = guessing, don't penalize ability much
  }

  // 6. Combined update
  const newTheta = abilityTheta + K * (accuracyResidual + rtWeight);

  // 7. Uncertainty shrinks (Glicko formula)
  const q = Math.log(10) / 400;
  const gRD = 1 / Math.sqrt(1 + 3 * q * q * speedRD * speedRD / (Math.PI * Math.PI));
  const d2 = 1 / (q * q * gRD * gRD * expected * (1 - expected));
  const newRD = Math.sqrt(1 / (1 / (speedRD * speedRD) + 1 / d2));

  return { abilityTheta: newTheta, speedRD: newRD, observationCount: observationCount + 1 };
}
```

**What response time tells you:**
- Fast + correct: strong positive signal (both accuracy and speed channels agree)
- Slow + correct: moderate positive (got it right, but needed effort)
- Fast + incorrect: likely guessing (discount the negative accuracy signal)
- Slow + incorrect: strong negative (both channels agree the student struggled)

**Reference:** Van der Linden (2006), "A lognormal model for response times on test items." The joint accuracy + RT model outperforms accuracy-only models by ~15% in ability estimation accuracy.

#### Deriving Speed from Ability

```
raw_speed = exp(abilityTheta - difficultyTheta)
```

This gives: speed = 1.0 when ability equals difficulty, >1.0 when the student is stronger, <1.0 when weaker.

#### Cold-Start Blending

For the first ~15 observations, blend the estimated speed with a conservative prior:

```
confidence = min(1.0, observationCount / 15)
effective_speed = 1.0 * (1 - confidence) + raw_speed * confidence
```

This ensures:
- **0 observations:** effective_speed = 1.0 (neutral, conservative scheduling)
- **8 observations:** effective_speed = 0.47 * 1.0 + 0.53 * raw_speed (blended)
- **15+ observations:** effective_speed = raw_speed (fully estimated)

The `effective_speed` is what feeds into the FIRe equations:

```
repNum = max(0, repNum + effective_speed * decay^failed * rawDelta)
```

#### Convergence

| Observations | RD | SE (logits) | Trust Level |
|---|---|---|---|
| 0 | 350 | -- | Default speed (1.0) |
| 1-3 | ~250 | ~0.8 | Very noisy. Blend heavily with prior. |
| 4-10 | ~180 | ~0.5 | Moderate signal. Start using for scheduling. |
| 10-20 | ~120 | ~0.3 | Good signal. Full FIRe modulation. |
| 20+ | <100 | ~0.2 | Stable. Only big performance shifts move it. |

From CAT literature: adaptive tests achieve reliable ability estimates with 10-25 well-targeted items. For non-adaptive practice (where items aren't optimally targeted), expect 15-25 observations.

**References:**
- Pelanek (2016) -- "Applications of the Elo rating system in adaptive educational systems" (Computers & Education)
- Glickman (1999) -- "The Glicko system" (glicko.net) -- uncertainty-aware rating
- Van der Linden (2006) -- Lognormal response time model (JEBE)
- Settles & Meeder (2016) -- "A Trainable Spaced Repetition Model for Language Learning" (Duolingo/ACL) -- half-life regression as an alternative speed model

### Per-Student-KnowledgePoint State

Finer granularity within concepts:

```
{
  passed: boolean,
  attempts: number,
  consecutiveCorrect: number,  // 2 consecutive correct = KP passed
  lastAttemptAt: timestamp
}
```

### Mastery Transitions

```
unstarted -> in_progress    (first lesson started)
in_progress -> mastered     (all KPs passed in a lesson)
mastered -> needs_review    (memory decayed below threshold OR quiz failure)
needs_review -> mastered    (successful review)
in_progress -> in_progress  (lesson failed, routed to remediation)
```

### Mastery Threshold

A concept is "mastered" when:
1. All knowledge points within the concept are passed (2 consecutive correct each)
2. The concept hasn't been "conditionally mastered" with a pending verification

A concept "needs review" when:
1. `memory` drops below 0.5 (50% estimated retention)
2. The student fails a quiz question on this concept
3. The student fails a lesson that depends on this concept (prerequisite remediation)

---

## 7. Task Selection Algorithm

The task selection algorithm is the "brain" -- it decides what the student should do next. It runs every time the student finishes a task or opens the app.

### Task Types

1. **Lesson** -- Learn a new concept at the knowledge frontier
2. **Review** -- Spaced repetition review of a previously mastered concept
3. **Quiz** -- Broad-coverage timed assessment (triggered every N XP)
4. **Remediation** -- Targeted prerequisite repair after plateau detection

### Selection Priority

1. **Remediation tasks** (if any plateau detected) -- highest priority, blocks progress
2. **Urgent reviews** (memory < 0.3, severely overdue) -- prevent complete forgetting
3. **New lessons** (at the knowledge frontier) -- primary learning progression
4. **Standard reviews** (memory < 0.5, due for review) -- maintenance
5. **Quizzes** (when XP threshold reached) -- periodic assessment

### Knowledge Frontier Calculation

A concept is "at the frontier" if:
- All its prerequisites are mastered
- The concept itself is NOT mastered
- No remediation is blocking it

The system selects from frontier concepts using these heuristics:
1. **Non-interference:** Don't teach similar concepts on the same day. Concepts sharing tags or close graph proximity are spaced apart to reduce associative interference.
2. **Variety:** Alternate between different topic areas to maintain engagement.
3. **Review compression:** Prefer frontier concepts whose encompassing edges "knock out" due reviews. If concept B encompasses concept A (which is due for review), teaching B implicitly reviews A.
4. **Difficulty balancing:** Alternate hard and easy concepts within a session.

### Plateau Detection & Remediation

When a student fails a lesson twice consecutively:

1. **Identify weak prerequisites:** Trace back through the graph. Which prerequisite KPs are the lesson's KPs depending on?
2. **Check prerequisite mastery signals:** Low memory, long time since practice, previous failures
3. **Assign remediation:** Targeted review of the specific weak prerequisite(s)
4. **Route to parallel paths:** While remediation is pending, suggest other frontier concepts that don't depend on the weak prerequisite
5. **Return:** After remediation is complete (prerequisite re-mastered), the halted lesson becomes available again

---

## 8. Spaced Repetition (FIRe-Inspired)

Our spaced repetition system is adapted from Math Academy's Fractional Implicit Repetition (FIRe) model.

### Core Equations

**Repetition number update (after a review):**
```
repNum = max(0, repNum + speed * decay^failed * rawDelta)
```

**Memory decay (exponential forgetting):**
```
memory = max(0, memory + rawDelta) * (0.5)^(days / interval)
```

Where:
- `repNum`: accumulated successful review rounds on a concept
- `speed`: student_ability / concept_difficulty (personalized per student-concept pair)
- `decay`: penalty multiplier that increases as memory drops severely (models "summer slide")
- `failed`: 1 if the review was failed, 0 if passed
- `rawDelta`: credit earned -- positive for pass (scaled by quality), negative for fail
- `days`: time since last repetition
- `interval`: target spacing between repetitions. Grows with repNum (e.g., 1, 3, 7, 14, 30, 60 days)
- `memory`: estimated retention level, 0-1. Triggers review when below threshold

### Implicit Repetition (The Key Innovation)

When a student practices concept B, and B encompasses concept A with weight W:

```
A.repNum += W * rawDelta * speed_discount
A.memory += W * rawDelta
```

Where `speed_discount`:
- If student's speed on A >= 1.0: full implicit credit
- If student's speed on A < 1.0: implicit credit discarded, force explicit review (concept is hard for this student, can't assume implicit practice is sufficient)

This means:
- **Credit flows backward** through the encompassing graph (advanced -> foundational)
- **Penalties flow forward** through the prerequisite graph (foundational failure -> advanced topics at risk)
- The algorithm selects reviews that **knock out the most due reviews** via implicit repetition

### Review Compression In Practice

Without implicit repetition: Student must explicitly review every mastered concept on its schedule.

With implicit repetition: Learning new concept B might implicitly satisfy reviews for concepts A, C, D that B encompasses. Empirically (Math Academy data), most courses need only ~1 explicit review per concept -- the rest is covered implicitly by continued learning.

### Early Repetition Discounting

If a review happens before the optimal interval (memory is still high):

```
rawDelta *= (1 - memory)  // reduce credit proportionally
```

This prevents wasting review credit on concepts that don't need it yet.

---

## 9. Active Practice & Testing

The current platform is audio-only. The adaptive learning system requires active practice -- the student must demonstrate understanding, not just listen.

### Practice Problem Types

All problem types are designed for mobile-first interaction:

| Type | How It Works | Example |
|------|-------------|---------|
| **Multiple Choice** | 4 options, tap to select | "Which heat transfer method involves direct contact?" |
| **True/False** | Binary choice | "NFPA 1001 requires annual recertification. True or false?" |
| **Fill in the Blank** | Short text input | "The minimum water flow for a 1.75-inch handline is ___ GPM." |
| **Ordering** | Drag to reorder steps | "Put these pre-trip inspection steps in the correct order." |
| **Matching** | Connect pairs | "Match each NEC article to its subject area." |
| **Scenario-Based** | Multi-part: audio scenario then questions | "You arrive at a structure fire. [audio describes scene]. What is your first action?" |

### Lesson Flow (Per Knowledge Point)

```
1. Audio instruction (1-3 min) -- TTS of the explanation text
   [Student can pause, replay, speed up]

2. Worked example (audio + optional visual)
   [Step-by-step solved problem narrated via audio]

3. Practice problem 1 (easy)
   [Student answers, immediate feedback + explanation audio]

4. Practice problem 2 (medium)
   [Student answers, immediate feedback]

5. (If both correct) -> KP PASSED, advance to next KP
   (If either wrong) -> Practice problem 3 (medium)
   (If still wrong) -> KP FAILED, mark for remediation

Rule: 2 consecutive correct = KP passed
```

### Review Flow

When a concept is due for review:
- 3-5 questions across the concept's KPs
- Questions are **different** from the original lesson problems (prevents pattern matching)
- Immediate feedback with explanation
- Pass: concept stays mastered, repNum increases
- Fail: concept transitions to needs_review, triggers more frequent reviews

### Quiz Flow

Triggered every ~150 XP:
- Timed (15 minutes for 10-15 questions)
- Covers concepts from the last ~150 XP of learning
- Interleaved across multiple concepts
- No immediate feedback during the quiz (closed-book simulation)
- Results shown after: per-concept breakdown, weak areas highlighted
- Failed concepts immediately scheduled for review
- Target difficulty: ~80% expected score

---

## 10. XP System & Gamification

Calibrate XP so **1 XP = ~1 minute of focused study** for an average student.

### XP Awards

| Activity | Base XP | Modifier |
|----------|---------|----------|
| Complete a lesson (all KPs passed) | 10-20 (scales with concept difficulty) | +25% if first attempt, -50% if third+ attempt |
| Complete a review | 3-5 | +10% if fast + accurate |
| Complete a quiz | 15-25 | Score-dependent: 100% = 1.5x, <60% = 0.5x |
| Scenario/multistep task | 20-30 | Completion quality |

### Anti-Gaming

- **Blowing off tasks:** Rapid incorrect answers earn 0 or negative XP
- **Excessive skipping:** Skipping instruction without attempting practice = no XP
- **Time thresholds:** Answers faster than humanly possible (e.g., <2s on a problem requiring reading) flagged

### Engagement Mechanics

- **Daily XP target:** Configurable. Default 15 (minimum), 40 (standard), 100 (ambitious)
- **Streaks:** Consecutive days meeting XP target
- **Weekly leaderboards:** Within an organization (optional, configurable by org admin)
- **Progress visualization:** Knowledge graph fills in as concepts are mastered
- **Completion estimate:** "At your current pace, you'll finish this course in X weeks"

---

## 11. DDD Bounded Contexts (Backend)

The backend uses Domain-Driven Design. The adaptive learning system introduces new bounded contexts alongside the existing ones.

### Existing Bounded Contexts (from backend-plan.md)

```
Identity & Access    -- auth, users, orgs, memberships, roles
Content Management   -- exams, topics, sections, study items, content import
Audio Pipeline       -- TTS generation, audio storage, audio serving
Progress Tracking    -- listen counts, bookmarks, streaks (passive tracking)
Billing              -- Stripe subscriptions, plans, feature gating
```

### New Bounded Contexts for Adaptive Learning

```
Knowledge Graph      -- concepts, knowledge points, prerequisite edges,
                        encompassing edges, graph validation, graph queries
                        (Aggregate Root: Course)

Student Model        -- per-student mastery state, knowledge profiles,
                        diagnostic results, learning speed estimates
                        (Aggregate Root: StudentProfile)

Learning Engine      -- task selection algorithm, knowledge frontier calculation,
                        mastery enforcement, plateau detection, remediation
                        (Aggregate Root: LearningSession)

Assessment           -- practice problems, reviews, quizzes, diagnostic questions,
                        answer evaluation, scoring, feedback
                        (Aggregate Root: Assessment)

Spaced Repetition    -- FIRe algorithm, memory decay, implicit repetition,
                        review scheduling, review compression
                        (Aggregate Root: RepetitionSchedule)

Gamification         -- XP calculation, streaks, leaderboards, achievements
                        (Aggregate Root: PlayerProgress)
```

### Domain Events

The bounded contexts communicate via domain events:

```
KnowledgeGraph:
  CourseImported { courseId, conceptCount, edgeCount }
  GraphValidated { courseId, issues[] }

StudentModel:
  DiagnosticCompleted { studentId, courseId, knowledgeProfile }
  ConceptMastered { studentId, conceptId }
  ConceptNeedsReview { studentId, conceptId }
  PlateauDetected { studentId, conceptId, weakPrerequisites[] }

LearningEngine:
  TaskAssigned { studentId, taskType, conceptId }
  LessonCompleted { studentId, conceptId, passed, kpResults[] }
  RemediationTriggered { studentId, conceptId, targetPrerequisites[] }

Assessment:
  ProblemAnswered { studentId, problemId, correct, responseTimeMs }
  ReviewCompleted { studentId, conceptId, passed, score }
  QuizCompleted { studentId, quizId, score, failedConcepts[] }

SpacedRepetition:
  RepetitionCredited { studentId, conceptId, explicit, implicitFrom? }
  ReviewScheduled { studentId, conceptId, dueAt }
  ReviewCompressed { studentId, reviewsEliminated, via }

Gamification:
  XPAwarded { studentId, amount, source }
  StreakExtended { studentId, days }
  LeaderboardUpdated { orgId, week }
```

### Module Structure (NestJS)

```
backend/src/modules/
├── auth/                    # existing
├── orgs/                    # existing
├── content/                 # existing (exams, topics, sections, study items)
├── audio/                   # existing (TTS, storage, serving)
├── progress/                # existing (passive tracking: listens, bookmarks, streaks)
├── billing/                 # existing
├── knowledge-graph/         # NEW
│   ├── knowledge-graph.module.ts
│   ├── knowledge-graph.service.ts      # graph queries, frontier calc
│   ├── graph-import.service.ts         # YAML -> DB import + validation
│   ├── graph-validation.service.ts     # cycle detection, constraint checks
│   ├── entities/
│   │   ├── concept.entity.ts
│   │   ├── knowledge-point.entity.ts
│   │   ├── prerequisite-edge.entity.ts
│   │   └── encompassing-edge.entity.ts
│   └── dto/
├── student-model/           # NEW
│   ├── student-model.module.ts
│   ├── student-model.service.ts        # knowledge profile, mastery state
│   ├── diagnostic.service.ts           # adaptive diagnostic algorithm
│   ├── entities/
│   │   ├── student-concept-state.entity.ts
│   │   └── student-kp-state.entity.ts
│   └── dto/
├── learning-engine/         # NEW
│   ├── learning-engine.module.ts
│   ├── task-selector.service.ts        # the "brain" -- what to do next
│   ├── mastery-enforcer.service.ts     # prerequisite checks, gating
│   ├── plateau-detector.service.ts     # failure pattern detection
│   ├── remediation.service.ts          # prerequisite repair paths
│   └── dto/
├── assessment/              # NEW
│   ├── assessment.module.ts
│   ├── problem.service.ts              # serve + evaluate problems
│   ├── review.service.ts               # spaced rep review sessions
│   ├── quiz.service.ts                 # timed quiz generation + scoring
│   ├── entities/
│   │   ├── problem.entity.ts
│   │   ├── problem-attempt.entity.ts
│   │   ├── review-session.entity.ts
│   │   └── quiz.entity.ts
│   └── dto/
├── spaced-repetition/       # NEW (replaces simple SM-2)
│   ├── spaced-repetition.module.ts
│   ├── fire.service.ts                 # FIRe algorithm implementation
│   ├── implicit-repetition.service.ts  # encompassing credit propagation
│   ├── review-scheduler.service.ts     # when to schedule reviews
│   └── dto/
└── gamification/            # NEW
    ├── gamification.module.ts
    ├── xp.service.ts                   # XP calculation + anti-gaming
    ├── streak.service.ts               # daily streak tracking
    ├── leaderboard.service.ts          # weekly org leaderboards
    └── dto/
```

---

## 12. Data Model Additions

New Prisma models alongside the existing schema. The existing content hierarchy (org -> exam -> topic -> section -> studyItem) remains for audio content. The knowledge graph is a parallel structure that links to content.

### New Models

```prisma
// === KNOWLEDGE GRAPH ===

model Concept {
  id              String   @id @default(uuid())
  courseId        String
  course          Course   @relation(fields: [courseId], references: [id])
  orgId           String
  org             Organization @relation(fields: [orgId], references: [id])

  slug            String                // unique within course
  name            String
  description     String?
  difficulty      Int                   // 1-10
  estimatedMinutes Int
  tags            String[]
  sourceReference String?
  sortOrder       Int                   // display ordering within course

  // Speed parameter support (Section 6)
  difficultyTheta Float    @default(0)  // difficulty on logit scale, initially from authored difficulty
  timeIntensity   Float    @default(0)  // expected log(response_time_seconds), from population data
  timeIntensitySD Float    @default(1)  // SD of log(RT), from population data

  // Relations
  knowledgePoints   KnowledgePoint[]
  prerequisiteOf    PrerequisiteEdge[]  @relation("prerequisiteTarget")
  prerequisiteFor   PrerequisiteEdge[]  @relation("prerequisiteSource")
  encompassedBy     EncompassingEdge[]  @relation("encompassedTarget")
  encompasses       EncompassingEdge[]  @relation("encompassingSource")
  diagnosticQuestions DiagnosticQuestion[]
  quizQuestions     QuizQuestion[]
  studentStates     StudentConceptState[]

  // Link to existing content (audio)
  studyItemId     String?              // optional link to existing StudyItem for audio
  studyItem       StudyItem?           @relation(fields: [studyItemId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([courseId, slug])
  @@index([orgId])
  @@index([courseId])
}

model Course {
  id              String   @id @default(uuid())
  orgId           String
  org             Organization @relation(fields: [orgId], references: [id])

  slug            String
  name            String
  description     String?
  version         String               // e.g., "2024.1"
  estimatedHours  Int
  isPublished     Boolean @default(false)

  concepts        Concept[]
  enrollments     CourseEnrollment[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([orgId, slug])
}

model KnowledgePoint {
  id              String   @id @default(uuid())
  conceptId       String
  concept         Concept  @relation(fields: [conceptId], references: [id], onDelete: Cascade)

  slug            String                // unique within concept
  sortOrder       Int                   // 1, 2, 3, 4 within concept
  instructionText String               // -> TTS audio
  workedExampleText String?            // -> TTS audio
  instructionAudioUrl String?          // generated
  workedExampleAudioUrl String?        // generated

  problems        Problem[]
  studentStates   StudentKPState[]

  @@unique([conceptId, slug])
}

model PrerequisiteEdge {
  id              String   @id @default(uuid())
  sourceConceptId String                // the prerequisite
  targetConceptId String                // the concept that requires it
  sourceConcept   Concept  @relation("prerequisiteSource", fields: [sourceConceptId], references: [id])
  targetConcept   Concept  @relation("prerequisiteTarget", fields: [targetConceptId], references: [id])

  // Optional: specific KP-level prerequisite
  sourceKPId      String?
  targetKPId      String?

  @@unique([sourceConceptId, targetConceptId])
}

model EncompassingEdge {
  id              String   @id @default(uuid())
  sourceConceptId String                // the advanced concept (does the encompassing)
  targetConceptId String                // the foundational concept (gets implicit credit)
  sourceConcept   Concept  @relation("encompassingSource", fields: [sourceConceptId], references: [id])
  targetConcept   Concept  @relation("encompassedTarget", fields: [targetConceptId], references: [id])

  weight          Float                 // 0.0 to 1.0
  weightSource    String   @default("authored") // "authored", "heuristic", or "calibrated"
  lastCalibratedAt DateTime?            // when the feedback loop last adjusted this weight
  retentionGap    Float?               // last measured gap between implicit vs explicit pass rates

  @@unique([sourceConceptId, targetConceptId])
}

// === ASSESSMENT ===

model Problem {
  id              String   @id @default(uuid())
  knowledgePointId String
  knowledgePoint  KnowledgePoint @relation(fields: [knowledgePointId], references: [id], onDelete: Cascade)

  type            ProblemType            // multiple_choice, fill_blank, true_false, ordering, matching
  questionText    String
  questionAudioUrl String?              // generated
  options         Json?                 // for MC: [{text, id}], for ordering: [{text, id}], etc.
  correctAnswer   Json                  // type-dependent: MC index, string, boolean, ordered ids, pairs
  explanation     String
  explanationAudioUrl String?           // generated
  difficulty      Int     @default(3)   // 1-5 within KP
  isReviewVariant Boolean @default(false) // different from lesson version, used for reviews

  attempts        ProblemAttempt[]

  @@index([knowledgePointId])
}

enum ProblemType {
  multiple_choice
  fill_blank
  true_false
  ordering
  matching
  scenario
}

model DiagnosticQuestion {
  id              String   @id @default(uuid())
  conceptId       String
  concept         Concept  @relation(fields: [conceptId], references: [id])

  questionText    String
  questionAudioUrl String?
  options         Json?
  correctAnswer   Json
  explanation     String
  discriminationPower Float @default(0.5) // how well this question differentiates mastery

  @@index([conceptId])
}

model QuizQuestion {
  id              String   @id @default(uuid())
  conceptId       String
  concept         Concept  @relation(fields: [conceptId], references: [id])

  questionText    String
  questionAudioUrl String?
  options         Json?
  correctAnswer   Json
  explanation     String
  integrates      String[]              // concept IDs this question also touches

  @@index([conceptId])
}

// === STUDENT MODEL ===

model CourseEnrollment {
  id              String   @id @default(uuid())
  userId          String
  courseId         String
  course          Course   @relation(fields: [courseId], references: [id])

  diagnosticCompleted Boolean @default(false)
  diagnosticCompletedAt DateTime?
  dailyXPTarget   Int     @default(40)
  totalXPEarned   Int     @default(0)

  createdAt       DateTime @default(now())

  @@unique([userId, courseId])
}

model StudentConceptState {
  id              String   @id @default(uuid())
  userId          String
  conceptId       String
  concept         Concept  @relation(fields: [conceptId], references: [id])

  masteryState    MasteryState @default(unstarted)
  repNum          Float    @default(0)    // accumulated spaced reps (FIRe)
  memory          Float    @default(1.0)  // current retention estimate
  lastPracticedAt DateTime?
  interval        Float    @default(1.0)  // days until next review
  speed           Float    @default(1.0)  // derived: exp(abilityTheta - difficultyTheta)
  abilityTheta    Float    @default(0)    // student ability on logit scale (Elo/IRT)
  speedRD         Float    @default(350)  // rating deviation: uncertainty (Glicko)
  observationCount Int     @default(0)    // practice observations on this concept
  implicitCreditRatio Float @default(0)   // fraction of credit from implicit repetition
  failCount       Int      @default(0)    // consecutive lesson failures
  diagnosticState DiagnosticState @default(unknown)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, conceptId])
  @@index([userId])
  @@index([userId, masteryState])
}

enum MasteryState {
  unstarted
  in_progress
  mastered
  needs_review
}

enum DiagnosticState {
  unknown
  mastered
  partially_known
  conditionally_mastered
}

model StudentKPState {
  id              String   @id @default(uuid())
  userId          String
  knowledgePointId String
  knowledgePoint  KnowledgePoint @relation(fields: [knowledgePointId], references: [id])

  passed          Boolean  @default(false)
  attempts        Int      @default(0)
  consecutiveCorrect Int   @default(0)
  lastAttemptAt   DateTime?

  @@unique([userId, knowledgePointId])
}

model ProblemAttempt {
  id              String   @id @default(uuid())
  userId          String
  problemId       String
  problem         Problem  @relation(fields: [problemId], references: [id])

  answer          Json                   // what the student answered
  correct         Boolean
  responseTimeMs  Int                    // for automaticity tracking
  xpAwarded       Int      @default(0)

  createdAt       DateTime @default(now())

  @@index([userId, problemId])
  @@index([userId, createdAt])
}

// === GAMIFICATION ===

model XPEvent {
  id              String   @id @default(uuid())
  userId          String
  courseId         String
  source          XPSource              // lesson, review, quiz, remediation
  amount          Int
  conceptId       String?

  createdAt       DateTime @default(now())

  @@index([userId, courseId])
  @@index([userId, createdAt])
}

enum XPSource {
  lesson
  review
  quiz
  remediation
  bonus
}
```

---

## 13. API Surface

### Knowledge Graph

```
GET    /courses/:courseId/graph                    # full graph structure (for visualization)
GET    /courses/:courseId/graph/frontier/:userId    # student's current knowledge frontier
GET    /courses/:courseId/concepts                  # list concepts with mastery overlay
GET    /courses/:courseId/concepts/:conceptId       # concept detail + KPs + problems
POST   /courses/import                             # admin: import course from YAML
POST   /courses/:courseId/validate                  # admin: validate graph integrity
```

### Student Model

```
POST   /courses/:courseId/enroll                   # enroll student
GET    /courses/:courseId/profile                   # student's knowledge profile
GET    /courses/:courseId/diagnostic/start          # begin diagnostic assessment
POST   /courses/:courseId/diagnostic/answer         # submit diagnostic answer
GET    /courses/:courseId/diagnostic/result         # diagnostic report
GET    /courses/:courseId/mastery                   # per-concept mastery breakdown
GET    /courses/:courseId/stats                     # completion %, XP, pace, ETA
```

### Learning Engine

```
GET    /courses/:courseId/next-task                 # what should I do next?
GET    /courses/:courseId/session                   # get a batch of tasks for a study session
POST   /courses/:courseId/lessons/:conceptId/start  # begin a lesson
POST   /courses/:courseId/lessons/:conceptId/answer # submit KP practice answer
POST   /courses/:courseId/lessons/:conceptId/complete # mark lesson done
```

### Assessment

```
POST   /courses/:courseId/reviews/:conceptId/start  # begin a review session
POST   /courses/:courseId/reviews/:conceptId/answer  # submit review answer
POST   /courses/:courseId/reviews/:conceptId/complete
POST   /courses/:courseId/quizzes/generate          # generate a quiz
POST   /courses/:courseId/quizzes/:quizId/answer    # submit quiz answer
POST   /courses/:courseId/quizzes/:quizId/complete
```

### Gamification

```
GET    /courses/:courseId/xp                        # XP summary (today, week, total)
GET    /courses/:courseId/leaderboard               # org weekly leaderboard
GET    /courses/:courseId/streak                    # current streak info
```

---

## 14. Integration with Existing Audio System

The adaptive learning system layers on top of the existing audio prep platform, not replaces it.

### Audio Content = Instruction Delivery

The existing content pipeline (text -> TTS -> Supabase Storage -> signed URLs) is the **delivery mechanism** for the instruction step in each lesson. The knowledge graph's `instructionText` and `workedExampleText` flow through the same TTS pipeline.

### Study Items -> Concepts Mapping

The existing `StudyItem` model (text chunks users listen to) maps to the `Concept.instructionText`:
- Each concept's instruction is a study item that gets TTS'd
- Each worked example is another study item
- The existing audio player UI plays these during lessons

### Existing SM-2 -> FIRe Migration

The current `UserProgress` table with SM-2 fields (`easeFactor`, `intervalDays`, `nextReviewAt`) gets superseded by the `StudentConceptState` table with FIRe fields. The migration path:
1. New enrollments use the full adaptive system from day one
2. Existing progress (listen counts, completions) can be imported as initial mastery signals
3. The old SM-2 code path remains for orgs that haven't set up knowledge graphs (backwards compatible)

### Two Modes

Orgs can operate in either mode:
1. **Audio-only mode** (existing) -- Linear content, SM-2 spaced repetition, no knowledge graph. For orgs that just want audio study.
2. **Adaptive learning mode** (new) -- Full knowledge graph, mastery enforcement, active practice, FIRe spaced rep. Requires course content in the new format.

This preserves the "add a niche with minimal effort" promise: simple audio-only niches are still easy. Full adaptive courses require more content authoring but deliver a dramatically better product.

---

## 15. Implementation Phases

These are now the FIRST phases built after the backend foundation (Phase 1 in PLAN.md). The adaptive learning system is the core product differentiator and ships before billing, polish, and mobile.

### Phase 2: Knowledge Graph Foundation (2-3 weeks)

**Status:** Complete

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Backend Phase 1 deliverables (Prisma, NestJS scaffold), knowledge graph spec (Section 3), content authoring spec (Section 4)
> - **Outputs:** Prisma schema additions, knowledge-graph module (CRUD, YAML import, validation), graph query service (frontier, prereqs, encompassing), admin API
> - **Dependencies:** Backend Phase 1

1. Prisma schema additions (Concept, KnowledgePoint, edges, etc.)
2. `knowledge-graph` module: CRUD, import from YAML, graph validation
3. Graph query service: frontier calculation, prerequisite traversal, encompassing traversal
4. Admin API: import course, validate, visualize graph
5. Content authoring format documentation + example course

### Phase 3: Student Model & Diagnostic (2 weeks)

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phase 2 deliverables (knowledge graph module), student model spec (Section 6), diagnostic spec (Section 5)
> - **Outputs:** Student-model module, enrollment flow, diagnostic assessment algorithm, diagnostic UI, knowledge profile visualization
> - **Dependencies:** Phase 2

6. `student-model` module: StudentConceptState, StudentKPState
7. Course enrollment flow
8. Diagnostic assessment algorithm
9. Diagnostic UI (web + mobile): adaptive question flow, results display
10. Knowledge profile visualization

### Phase 4: Assessment & Practice (2-3 weeks)

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phases 2-3 deliverables, assessment spec (Section 9), problem type definitions
> - **Outputs:** Assessment module (problem types, quiz generation), practice problem UI, review session flow, audio integration for questions
> - **Dependencies:** Phase 3

11. `assessment` module: Problem, DiagnosticQuestion, QuizQuestion
12. Problem types: MC, true/false, fill blank, ordering, matching
13. Practice problem UI (web + mobile)
14. Review session flow
15. Quiz generation + timed quiz UI
16. Audio integration: question audio, explanation audio

### Phase 5: Learning Engine (2-3 weeks)

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phases 2-4 deliverables, task selection spec (Section 7), plateau detection spec
> - **Outputs:** Learning-engine module (task selector, mastery enforcer), frontier calculation, plateau detection + remediation, "next task" API, learning session UI
> - **Dependencies:** Phase 4

17. `learning-engine` module: task selector, mastery enforcer
18. Knowledge frontier calculation
19. Task selection algorithm (priority-based with non-interference)
20. Plateau detection + remediation service
21. "Next task" API + session builder
22. Learning session UI (web + mobile): the main study experience

### Phase 6: Spaced Repetition — FIRe (1-2 weeks)

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phase 5 deliverables, FIRe spec (Section 8), encompassing edge weights
> - **Outputs:** Spaced-repetition module (FIRe equations), implicit repetition propagation, review scheduling + compression, SM-2 replacement for adaptive enrollments
> - **Dependencies:** Phase 5

23. `spaced-repetition` module: FIRe core equations
24. Implicit repetition propagation through encompassing edges
25. Review scheduling + compression
26. Replace SM-2 code path for adaptive-mode enrollments
27. Memory decay calculation + review urgency scoring

### Phase 11: Gamification & Polish (1-2 weeks)

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phases 2-6 deliverables, XP spec (Section 10), existing streaks module
> - **Outputs:** Gamification module (XP, anti-gaming), enhanced streaks, leaderboards, progress visualization, completion estimates, first adaptive course content
> - **Dependencies:** Phase 6

28. `gamification` module: XP calculation, anti-gaming
29. Streaks (enhance existing)
30. Leaderboards
31. Progress visualization (knowledge graph fills in)
32. Completion estimates
33. First full adaptive course content (port one niche)

**Total estimated: 10-15 weeks. Phases 2-6 are built first (core adaptive system), Phase 11 (gamification) comes later after billing and polish.**

---

## 16. Key Sources & Further Reading

### Math Academy Technical Documentation

| Source | What It Covers |
|--------|---------------|
| [How Our AI Works](https://www.mathacademy.com/how-our-ai-works) | Official overview of the expert system |
| [The Math Academy Way (free PDF)](https://www.justinmath.com/files/the-math-academy-way.pdf) | 508-page book (March 2026 draft): science of learning, knowledge graph, FIRe, gamification. **We did a full read-through — see Section 17 for callouts.** |
| [How Math Academy Creates its Knowledge Graph](https://www.justinmath.com/how-math-academy-creates-its-knowledge-graph/) | Manual graph creation, encompassing weights |
| [Individualized Spaced Repetition in Hierarchical Knowledge Structures](https://www.justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/) | FIRe algorithm with mathematical formulations |
| [The Tip of Math Academy's Technical Iceberg](https://www.justinmath.com/the-tip-of-math-academys-technical-iceberg/) | What's publicly known vs. hidden |
| [The Most Important Thing About Building Educational Knowledge Graphs](https://www.justinmath.com/the-most-important-thing-to-understand-about-building-educational-knowledge-graphs/) | Working memory constraints on graph design |
| [Cognitive Science of Learning: Minimizing Associative Interference](https://www.justinmath.com/cognitive-science-of-learning-minimizing-associative-interference/) | Non-interference principle for task scheduling |

### Justin Skycak Interviews & Talks

| Source | What It Covers |
|--------|---------------|
| [HN AMA (Jan 2024)](https://news.ycombinator.com/item?id=39050945) | Technical Q&A from Justin directly |
| [CS Primer Show #23](https://show.csprimer.com/episodes/e23-mathacademy-and-the-efficient-pursuit-of-mastery) | Deep technical discussion on mastery + efficiency |
| [Chalk & Talk Podcast #42](https://www.justinmath.com/chalk-and-talk-podcast-42/) | FIRe algorithm, XP system, quiz design |
| [Why I Code Quant/Algo-Heavy Infra in Node.js](https://www.justinmath.com/why-i-havent-been-using-ai-coding-tools-and-why-i-code-quant-algo-heavy-infra-in-node-js/) | Tech stack rationale |

### External Analysis

| Source | What It Covers |
|--------|---------------|
| [Frank Hecker's 11-part series](https://frankhecker.com/2025/02/08/math-academy-part-1/) | Most comprehensive external analysis (Part 7 = technology brief) |
| [Andy Matuschak's notes](https://notes.andymatuschak.org/z4WGXpWwYbbBjrnDQRao6pE) | UX + pedagogical analysis from a spaced repetition expert |
| [Oz Nova's balanced review](https://newsletter.ozwrites.com/p/a-balanced-review-of-math-academy) | Strengths and limitations |

### Foundational Theory

| Source | What It Covers |
|--------|---------------|
| Knowledge Space Theory (Doignon & Falmagne, 1985) | The academic foundation for prerequisite-based learning systems |
| Bayesian Knowledge Tracing | Probabilistic student modeling (Math Academy's starting point, then evolved beyond) |
| Bloom's Two-Sigma Problem (1984) | Why 1-on-1 tutoring is 2 standard deviations better than classroom instruction |
| [Spaced Repetition vs Spiraling](https://www.justinmath.com/spaced-repetition-vs-spiraling/) | Why spaced repetition beats curriculum spiraling |

---

## 17. Callouts from "The Math Academy Way" (Full 508-Page Read)

After reading the complete book (March 2026 working draft), here are the key technical details that sharpen or fill gaps in our architecture. Organized by what you asked about: knowledge graph algorithms, timing content to students, and looping back to rehash content.

---

### Knowledge Graph: What the Book Adds

**1. You only need to set encompassing weights along direct and key prerequisite edges.**

The book (Ch 29) explains that the full pairwise weight matrix would have tens of millions of entries for thousands of topics. But you don't need most of them. It suffices to set weights only where:
- The weight has a nontrivial value
- The weight can't be inferred by repetition flow (FIRe propagation handles the rest)
- The distance in the prerequisite graph is low (far-apart topics won't matter much even with full encompassing)

The weights satisfying these conditions are almost always on **direct and key prerequisite edges**, which scales linearly with topic count. This validates our heuristic default approach but also means: **don't bother computing multi-hop heuristic defaults.** Just set weights on direct edges and let FIRe's repetition flow handle propagation.

**Action:** Simplify heuristic defaults in Section 3. Remove the multiplicative decay formula for indirect prerequisites. Instead: set weights only on direct prereqs, default everything else to 0.0, and let FIRe handle it.

**2. Non-ancestor encompassings exist.**

The book describes cases where equivalent topics across courses (e.g., algebra-based stats vs calculus-based stats) share encompassing edges even though neither is a prerequisite of the other. We should support this in our edge model — an encompassing edge where `sourceConcept` is NOT an ancestor of `targetConcept` via prerequisite paths. Currently our model supports this structurally, but we should call it out as a valid content pattern.

**3. Mastery floors for courses.**

When a student enrolls in a higher-level course, there's a set of foundational topics that are automatically marked mastered (too basic to bother assessing). The book calls these "mastery floors" — topics that are far enough back or lie below the simplest diagnostic-assessable topics. We should add a `masteryFloor` concept set to the `Course` model.

**Action:** Add `masteryFloorConceptIds String[]` to the Course model. On enrollment, auto-mark these as mastered without diagnostic assessment.

**4. Key prerequisite edges at the KP level matter more than we specified.**

The book emphasizes that each knowledge point should be linked to 1+ **key prerequisites** — the specific prerequisite knowledge most directly used in that KP. This is distinct from the concept-level prerequisite edges. When a student fails a lesson twice at the same KP, the system remediates the key prerequisites of that specific KP, not all prerequisites of the concept.

Our schema already has optional `sourceKPId` / `targetKPId` on `PrerequisiteEdge`. **These should not be optional for adaptive-mode courses.** Content authors should specify KP-level key prerequisites. This is what enables precise remediation.

**Action:** For adaptive-mode course YAML, require `keyPrerequisites` per knowledge point (concept IDs or KP IDs). Wire plateau detection to use these rather than tracing all concept-level prereqs.

**5. Core vs supplemental topic prioritization.**

The book (Ch 32) describes an algorithm that identifies "core" topics (most relevant in the big picture) vs "supplemental" topics. Core topics are taught first, giving students more spaced repetition cycles on them by course end. The algorithm satisfies two constraints:
- If a topic is core, ALL its ancestors must also be core
- Each course must have a reasonable balance of core/supplemental

For our certification exam context, this maps to: prioritize the topics most frequently tested on the actual exam. We should add a `isCore Boolean @default(true)` field to `Concept` and have the task selector prefer core frontier topics over supplemental ones.

---

### Timing Content to Students: What the Book Adds

**6. Student ability is measured at the per-topic level, not globally.**

The book (Ch 29) is explicit: ability is tracked per student per topic, using accuracy across answers with more weight on recent answers. This is what we do (our `abilityTheta` on `StudentConceptState`). But the book adds two important propagation rules we should implement:
- **Correct answers propagate DOWN** to simpler encompassed topics (if you solved a hard problem, your ability on its subskills is at least as good)
- **Incorrect answers propagate UP** to more advanced encompassing topics (if you can't do the simple thing, you can't do the hard thing)

Our `updateSpeed` function (Section 6) currently only updates the directly-tested concept. We should propagate ability signals through the encompassing graph after each observation.

**Action:** After `updateSpeed()` on concept C, propagate:
- On correct: `abilityTheta` boost (discounted) to encompassed concepts
- On incorrect: `abilityTheta` penalty (discounted) to encompassing concepts

**7. Initial ability prediction uses the local graph neighborhood.**

The book says: to choose the initial starting value for a topic's accuracy, they predict based on the topic's local neighborhood — direct prerequisites, key prerequisites, encompassings, and same-module topics.

Our cold-start blending (Section 6) uses a global `theta` from the diagnostic, which is a reasonable first pass. But once a student has been learning for a while, new unstarted concepts should bootstrap from their **graph neighbors**, not the global estimate.

**Action:** When a student starts a new concept, initialize `abilityTheta` as the weighted average of their `abilityTheta` on the concept's direct prereqs, key prereqs, and encompassings (weighted by observation count / confidence). Fall back to global theta only if no neighbors have data.

**8. Topic difficulty should come from population data, not just authored difficulty.**

The book (Ch 29) says topic difficulty is measured by computing the topic's accuracy across all instances when one of its questions was answered by a serious student on an assessment. This naturally acts as a correction factor — hard topics get more review, easy ones get less.

We have `difficultyTheta` on `Concept` that starts from authored difficulty and should migrate to observed difficulty once we have 50+ attempts. This is already in the plan but worth emphasizing: **the system self-corrects difficulty estimates from data.** This is a key feature, not just a nice-to-have.

**9. When speed < 1.0, shut down ALL implicit credit and force explicit reviews.**

This is in our plan (Section 8) but the book explains the WHY more clearly: weaker students often can't absorb implicit repetitions on difficult topics because they struggle to generalize that "what I learned earlier is a special case of what I'm learning now." The decision is based on student-topic learning speed — when it's < 1.0, the topic is hard for this student relative to their ability, so don't trust implicit practice.

**10. The `decay` parameter models severe overdue penalties ("summer slide").**

The book explains `decay` starts at 1 and grows larger as a review becomes severely overdue relative to its ideal interval (memory becomes very low). This models the real phenomenon where a topic forgotten over months may need to be nearly re-taught, not just reviewed once.

Our FIRe equations include `decay` but we should be explicit about how it grows:

```
decay = 1.0 + max(0, (days / interval - 2.0)) * DECAY_RATE
```

When a review is 2x+ overdue, the penalty for failure increases. This prevents the system from treating "forgot it last week" the same as "forgot it 6 months ago."

---

### Looping Back / Rehashing Content: What the Book Adds

**11. Repetition compression is more than just "knock out due reviews."**

The book (Ch 18, Ch 31) is clear that repetition compression doesn't stop once all due reviews are eliminated. It also:
- **Fends off upcoming reviews** by choosing tasks whose implicit repetitions push back the next due date on nearly-due topics
- **Climbs the knowledge graph evenly** to maintain a broad spread of choices for future optimization (avoiding deep, narrow paths that limit future options)

Our task selector (Section 7) handles the first point via "prefer frontier concepts whose encompassing edges knock out due reviews." But we should add the second: **when multiple frontier concepts have similar review-compression value, prefer concepts that broaden the frontier rather than deepen a single path.**

**Action:** Add a "frontier breadth" factor to the task selection scoring. Frontier concepts in underrepresented topic areas get a small bonus.

**12. Conditional completion from diagnostics is important.**

The book (Ch 30) describes "conditionally completed" topics — topics where the diagnostic evidence barely places a student out of them. These are marked mastered, but if the student struggles on dependent topics, the system immediately "falls backward" along the learning path.

Our diagnostic classification (Section 5) has `conditionally_mastered` but we should be more explicit about the fallback behavior: **when a student fails a lesson whose prerequisite is only conditionally mastered, immediately reclassify that prerequisite as `partially_known` and assign remediation.** This is more aggressive than our current plateau detection (which waits for 2 consecutive failures).

**Action:** Add a check in `mastery-enforcer.service.ts`: if a lesson fails and any prerequisite is `conditionally_mastered`, immediately trigger remediation on that prerequisite without waiting for a second failure.

**13. Conservative vs aggressive edge of mastery.**

The book (Ch 30) distinguishes two boundaries:
- **Aggressive edge:** where a student has learned just enough to continue layering more advanced content (lesson passed, but not yet automatic)
- **Conservative edge:** where a student has solidified knowledge to the point of demonstrable mastery on an assessment

Mastery-based learning with layering operates on the **aggressive** edge. Diagnostic placement measures the **conservative** edge. This explains why a student who completed a course might place lower on a diagnostic — and that's expected.

For us, this means: **the mastery threshold for "can advance to dependent topics" should be LOWER than the mastery threshold for "can skip this on a diagnostic."** Our current plan uses a single threshold. We should split it:
- Advancement threshold: all KPs passed (2 consecutive correct) — aggressive edge
- Diagnostic placement threshold: P(L_c) >= 0.8 — conservative edge

**14. Diagnostic algorithm details that differ from our BKT approach.**

The book (Ch 30) describes a **plus-minus balance** system, not Bayesian Knowledge Tracing. For each topic:
- Each answer has a weight (default 1.0, diminished for slow-but-correct answers)
- Correct answers increase the balance of the answered topic AND its prerequisites
- Incorrect answers decrease the balance of the answered topic AND its post-requisites
- Also propagates positive credit to same-module leaf topics (correlation-based, not causal)
- Topics with positive balances are credited with repNum equal to their balance

This is simpler and more interpretable than BKT. Consider whether our BKT approach or this plus-minus balance would be easier to implement and debug. The plus-minus approach has the advantage of being transparent — you can inspect exactly why a topic was classified.

**Note:** This is not necessarily better than our BKT — both are valid. But the plus-minus approach has lower implementation complexity and is easier to explain to content authors debugging student placements.

**15. Graph compression for diagnostics.**

The book says they compress the knowledge graph beforehand into the smallest number of topics that fully "covers" the course at a desired granularity. A topic is "covered" if it has both a descendant and an ancestor in the compressed graph within 3 prerequisite edges.

We use information-theoretic question selection (MEPE), which is more principled. But the graph compression trick could reduce the candidate set significantly, making our O(n²) per-question computation cheaper. Worth considering if diagnostic performance becomes a bottleneck with 300+ concept courses.

**16. Supplemental diagnostics for graph updates.**

The book mentions tiny "supplemental diagnostics" assigned when topics are added or connectivity is revised in the knowledge graph. These reassess only the topics with zero evidence since the original diagnostic.

For our certification context where regulations change annually, this is critical: **when a course version updates and adds new concepts, auto-generate a supplemental diagnostic covering only the new/changed concepts rather than forcing a full re-diagnostic.**

**Action:** Add a `supplementalDiagnostic` flow triggered by course version updates. Only assess new concepts and concepts whose prerequisite edges changed.

---

### Other Technical Insights Worth Noting

**17. Learning efficiency is primarily driven by performance quality, secondarily by pace.**

The book (Ch 31) gives a concrete relationship: doubling your pace increases learning efficiency by ~7% (2^0.1). But quality of work (pass rate, accuracy) is the dominant factor. Low-quality work at high pace is far worse than high-quality work at moderate pace.

For our XP system: **don't over-incentivize pace.** The leaderboard should reward quality-adjusted XP (XP × learning efficiency) rather than raw XP, to prevent students from rushing through content poorly.

**18. The book claims ~1 explicit review per topic on average in practice.**

With sufficient encompassings, Math Academy empirically observes that most courses need roughly 1 explicit review per topic — the rest is handled implicitly. This is our target efficiency. If students are doing 3+ explicit reviews per topic, our encompassing weights are likely too low or the graph doesn't have enough encompassings.

**Monitoring action:** Track `average explicit reviews per mastered concept` as a system health metric. Target: < 1.5 for well-connected graphs.

**19. Interleaving is implemented by mixing topics in review assignments.**

The book (Ch 19) emphasizes that review sessions should interleave problems from different topic areas, not group them by topic. This creates "desirable difficulty" that promotes discrimination learning (matching problems to solution techniques) and category induction learning.

Our review flow (Section 9) currently does "3-5 questions across the concept's KPs" for a single concept review. We should also offer **interleaved review sessions** that mix questions from 4-5 different concepts, especially for quiz preparation.

---

## Open Questions

These need answers before implementation:

1. **Content authoring tooling.** YAML files work for v1 but won't scale to hundreds of concepts with thousands of problems. Do we build an admin UI for graph editing, or use a spreadsheet-to-YAML pipeline?

2. **LLM-assisted question generation.** Can we use LLMs to bootstrap practice problem creation (human-reviewed)? Math Academy explicitly rejects this due to math's dimensionality, but text-based certification content may be more tractable.

3. **Audio-first practice problems.** How does fill-in-the-blank work in an audio-first mobile context? Voice input? On-screen keyboard? Does the UX degrade too much on mobile for certain problem types?

4. ~~**Encompassing weight calibration.**~~ **RESOLVED** -- see Section 3 "Encompassing Weight Calibration Feedback Loop." Heuristic defaults + data-driven feedback loop comparing implicit vs explicit mastery group review pass rates. Weekly calibration job proposes adjustments, human approves.

5. **Minimum viable knowledge graph size.** How many concepts/problems does a course need before the adaptive system provides meaningful value over simple SM-2? Is there a floor below which it's not worth it?

6. **Quiz proctoring.** Timed quizzes in a mobile app with no proctoring are gameable. Is this a problem for certification prep, or is the honor system sufficient?

7. **Offline adaptive learning.** The task selection algorithm needs the full student model + knowledge graph. Can this run on-device for offline sessions, or must it be server-side with cached task queues?

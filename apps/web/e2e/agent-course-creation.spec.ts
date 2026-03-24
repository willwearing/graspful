import { test, expect } from "@playwright/test";

const BACKEND_URL = "http://localhost:3000/api/v1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build a complete course YAML that passes all 10 review quality checks.
 *
 * Requirements for 10/10:
 *  1. yaml_parses — valid Zod schema
 *  2. unique_problem_ids — no duplicate problem IDs
 *  3. prerequisites_valid — all prereq refs point to existing concept IDs
 *  4. question_deduplication — no duplicate questions at same difficulty
 *  5. difficulty_staircase — each concept has problems at 2+ difficulty levels
 *  6. cross_concept_coverage — no single term dominates too many concepts
 *  7. problem_variant_depth — each KP has 3+ problems
 *  8. instruction_formatting — long instructions have content blocks
 *  9. worked_example_coverage — 50%+ authored concepts have worked examples
 * 10. import_dry_run — DAG valid, no cycles
 */
function makeFullCourseYaml(slug: string): string {
  return `
course:
  id: ${slug}
  name: "Agent E2E — Git Fundamentals"
  description: "End-to-end test course covering Git basics."
  estimatedHours: 4
  version: "2026.1"

sections:
  - id: foundations
    name: Foundations
    description: Core version-control concepts

  - id: branching
    name: Branching
    description: Working with branches and merging

concepts:
  # ── Root concept (no prerequisites) ──────────────────────────
  - id: version-control-basics
    name: "Version Control Basics"
    section: foundations
    difficulty: 1
    estimatedMinutes: 15
    tags: [foundational, version-control]
    prerequisites: []
    knowledgePoints:
      - id: vc-what-is-vcs
        instruction: "Version control systems track changes to files over time, letting multiple people collaborate without overwriting each other's work."
        workedExample: "Initialize a new repository with git init, then check status with git status to see the clean working tree."
        problems:
          - id: vc-p1
            type: multiple_choice
            question: "What does a version control system primarily track?"
            options: ["File sizes", "Changes to files over time", "CPU usage", "Network traffic"]
            correct: 1
            explanation: "VCS tracks changes to files over time so you can recall specific versions later."
            difficulty: 1
          - id: vc-p2
            type: true_false
            question: "A version control system allows multiple developers to work on the same codebase simultaneously."
            correct: "true"
            explanation: "Concurrent collaboration is a primary benefit of version control."
            difficulty: 2
          - id: vc-p3
            type: fill_blank
            question: "The command to initialize a new Git repository is git ___."
            correct: "init"
            explanation: "git init creates a new .git directory in the current folder."
            difficulty: 3

      - id: vc-commits
        instruction: "A commit is a snapshot of your project at a point in time. Each commit has a unique SHA hash, a message, and a pointer to its parent commit."
        workedExample: "Stage a file with git add README.md, then commit with git commit -m 'Initial commit'. Run git log to see the new commit with its SHA."
        problems:
          - id: vc-c-p1
            type: multiple_choice
            question: "What uniquely identifies a Git commit?"
            options: ["The commit message", "The author name", "A SHA hash", "The timestamp"]
            correct: 2
            explanation: "Each commit is identified by a SHA-1 hash computed from its contents."
            difficulty: 1
          - id: vc-c-p2
            type: true_false
            question: "A commit message is optional in Git."
            correct: "false"
            explanation: "Git requires a commit message for every commit."
            difficulty: 2
          - id: vc-c-p3
            type: multiple_choice
            question: "Which command creates a new commit from staged changes?"
            options: ["git push", "git commit", "git add", "git branch"]
            correct: 1
            explanation: "git commit creates a snapshot from whatever is in the staging area."
            difficulty: 3

  # ── Second concept — depends on root ─────────────────────────
  - id: staging-area
    name: "The Staging Area"
    section: foundations
    difficulty: 3
    estimatedMinutes: 20
    tags: [foundational, staging]
    prerequisites: [version-control-basics]
    knowledgePoints:
      - id: sa-index
        instruction: "The staging area (index) sits between your working directory and the repository. Files must be staged before they can be committed."
        workedExample: "Edit a file, run git status to see it as 'modified', then git add the file. Run git status again to see it under 'Changes to be committed'."
        problems:
          - id: sa-p1
            type: multiple_choice
            question: "Where do files go before being committed in Git?"
            options: ["The remote", "The staging area", "The stash", "The reflog"]
            correct: 1
            explanation: "The staging area (index) holds changes that will be included in the next commit."
            difficulty: 1
          - id: sa-p2
            type: fill_blank
            question: "The Git command to add a file to the staging area is git ___ <file>."
            correct: "add"
            explanation: "git add moves changes from the working directory into the staging area."
            difficulty: 2
          - id: sa-p3
            type: true_false
            question: "Running git add on a file immediately creates a commit."
            correct: "false"
            explanation: "git add only stages the file. You still need git commit to create the snapshot."
            difficulty: 3

  # ── Third concept — depends on first two ─────────────────────
  - id: branching-basics
    name: "Branching Basics"
    section: branching
    difficulty: 4
    estimatedMinutes: 25
    tags: [branching, collaboration]
    prerequisites: [version-control-basics, staging-area]
    knowledgePoints:
      - id: bb-create
        instruction: "A branch is a lightweight pointer to a commit. Creating a branch lets you diverge from the main line of development without affecting it."
        workedExample: "Create a feature branch with git branch feature-login, switch to it with git checkout feature-login, then verify with git branch to see the asterisk on the active branch."
        problems:
          - id: bb-p1
            type: multiple_choice
            question: "What is a Git branch?"
            options: ["A copy of the repository", "A lightweight pointer to a commit", "A remote server", "A compressed archive"]
            correct: 1
            explanation: "A branch in Git is simply a pointer to a specific commit, making it lightweight."
            difficulty: 2
          - id: bb-p2
            type: fill_blank
            question: "The command to create a new branch called 'dev' is git ___ dev."
            correct: "branch"
            explanation: "git branch <name> creates a new branch pointing to the current commit."
            difficulty: 3
          - id: bb-p3
            type: true_false
            question: "Creating a new branch in Git duplicates all the files in the repository."
            correct: "false"
            explanation: "Branches are just pointers; no files are duplicated."
            difficulty: 4

      - id: bb-merge
        instruction: "Merging combines the work from one branch into another. A fast-forward merge simply moves the pointer when there is no divergence."
        workedExample: "Switch to main with git checkout main, then merge the feature branch with git merge feature-login. If no conflicts exist, Git performs a fast-forward merge."
        problems:
          - id: bb-m-p1
            type: multiple_choice
            question: "What does git merge do?"
            options: ["Deletes a branch", "Combines work from two branches", "Pushes to remote", "Reverts changes"]
            correct: 1
            explanation: "git merge integrates changes from one branch into the current branch."
            difficulty: 2
          - id: bb-m-p2
            type: true_false
            question: "A fast-forward merge creates a new merge commit."
            correct: "false"
            explanation: "A fast-forward merge simply moves the branch pointer forward; no merge commit is created."
            difficulty: 3
          - id: bb-m-p3
            type: multiple_choice
            question: "When does a fast-forward merge occur?"
            options: ["When there are conflicts", "When the target branch has not diverged", "When using rebase", "When the remote is ahead"]
            correct: 1
            explanation: "Fast-forward happens when the current branch can simply move its pointer forward to the merged branch's tip."
            difficulty: 4

  # ── Leaf concept — depends on branching ──────────────────────
  - id: merge-conflicts
    name: "Resolving Merge Conflicts"
    section: branching
    difficulty: 6
    estimatedMinutes: 30
    tags: [branching, collaboration, conflict-resolution]
    prerequisites: [branching-basics]
    knowledgePoints:
      - id: mc-detect
        instruction: "A merge conflict occurs when two branches modify the same lines in a file. Git marks the conflicting regions with angle-bracket markers so you can resolve them manually."
        workedExample: "Attempt to merge a branch that edited the same line. Git will output 'CONFLICT'. Open the file to see <<<<<<< HEAD, =======, and >>>>>>> markers. Edit the file to keep the correct version, then git add and git commit."
        problems:
          - id: mc-p1
            type: multiple_choice
            question: "When does a merge conflict occur?"
            options: ["When a branch is deleted", "When the same line is changed in both branches", "When a file is renamed", "When the remote is unreachable"]
            correct: 1
            explanation: "Conflicts happen when Git cannot automatically reconcile changes to the same lines."
            difficulty: 3
          - id: mc-p2
            type: fill_blank
            question: "Git uses ___ markers to indicate conflicting regions in a file."
            correct: "angle-bracket"
            explanation: "The <<<<<<< HEAD, =======, and >>>>>>> markers delineate conflicting regions."
            difficulty: 4
          - id: mc-p3
            type: true_false
            question: "After resolving a merge conflict, you must stage the file and create a new commit."
            correct: "true"
            explanation: "Once you manually resolve the conflict markers, git add and git commit finalize the merge."
            difficulty: 5
`.trim();
}

// ── Shared state across serial tests ────────────────────────────────────────

let apiKey: string;
let orgSlug: string;
let courseId: string;
const courseSlug = `e2e-agent-${Date.now()}`;
const courseYaml = makeFullCourseYaml(courseSlug);

function authHeaders(extraHeaders?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...extraHeaders,
  };
}

test.describe.serial("Agent Course Creation (API only)", () => {
  // ── Step 0: Register ──────────────────────────────────────────

  test("step 0: register a new user and get an API key", async ({
    request,
  }) => {
    const email = `e2e-agent-create-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`;

    const res = await request.post(`${BACKEND_URL}/auth/register`, {
      data: { email, password: "TestPassword123!" },
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.userId).toMatch(UUID_RE);
    expect(body.orgSlug).toBeTruthy();
    expect(body.apiKey).toMatch(/^gsk_/);

    apiKey = body.apiKey;
    orgSlug = body.orgSlug;
  });

  // ── Step 1: Review course YAML — should pass 10/10 ───────────

  test("step 1: review course YAML — expect 10/10", async ({ request }) => {
    const res = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/review`,
      {
        data: { yaml: courseYaml },
        headers: authHeaders(),
      }
    );

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.passed).toBe(true);
    expect(body.score).toBe("10/10");
    expect(body.failures).toEqual([]);
    expect(body.stats.concepts).toBe(4);
    expect(body.stats.kps).toBeGreaterThanOrEqual(6);
    expect(body.stats.problems).toBeGreaterThanOrEqual(18);
  });

  // ── Step 2: Import course as draft ────────────────────────────

  test("step 2: import course as draft", async ({ request }) => {
    const res = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/import`,
      {
        data: { yaml: courseYaml },
        headers: authHeaders(),
      }
    );

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.courseId).toMatch(UUID_RE);
    expect(body.conceptCount).toBe(4);
    expect(body.knowledgePointCount).toBeGreaterThanOrEqual(6);
    expect(body.problemCount).toBeGreaterThanOrEqual(18);
    expect(body.prerequisiteEdgeCount).toBeGreaterThanOrEqual(3);
    expect(body.warnings).toEqual([]);

    courseId = body.courseId;
  });

  // ── Step 3: List courses — draft should appear ────────────────

  test("step 3: list courses — draft appears", async ({ request }) => {
    const res = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses`,
      { headers: authHeaders() }
    );

    expect(res.status()).toBe(200);

    const courses = await res.json();
    expect(Array.isArray(courses)).toBe(true);

    const ours = courses.find(
      (c: { id: string }) => c.id === courseId
    );
    expect(ours).toBeTruthy();
    expect(ours.isPublished).toBe(false);
  });

  // ── Step 4: Publish the course ────────────────────────────────

  test("step 4: publish the course", async ({ request }) => {
    const res = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/publish`,
      {
        data: {},
        headers: authHeaders(),
      }
    );

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.published).toBe(true);
    expect(body.review.passed).toBe(true);
    expect(body.review.score).toBe("10/10");
  });

  // ── Step 5: Verify course is published ────────────────────────

  test("step 5: verify course is published in list", async ({ request }) => {
    const res = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses`,
      { headers: authHeaders() }
    );

    expect(res.status()).toBe(200);

    const courses = await res.json();
    const ours = courses.find(
      (c: { id: string }) => c.id === courseId
    );
    expect(ours).toBeTruthy();
    expect(ours.isPublished).toBe(true);
  });

  // ── Step 6: Export course YAML ────────────────────────────────

  test("step 6: export course YAML round-trips", async ({ request }) => {
    const res = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/yaml`,
      { headers: authHeaders() }
    );

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.yaml).toBeTruthy();
    expect(typeof body.yaml).toBe("string");

    // Exported YAML should contain key identifiers from the original
    expect(body.yaml).toContain("version-control-basics");
    expect(body.yaml).toContain("staging-area");
    expect(body.yaml).toContain("branching-basics");
    expect(body.yaml).toContain("merge-conflicts");
  });

  // ── Step 7: Re-import with publish=true ───────────────────────

  test("step 7: re-import with publish=true auto-publishes", async ({
    request,
  }) => {
    // Build a slightly different slug so we don't collide
    const newSlug = `${courseSlug}-v2`;
    const newYaml = makeFullCourseYaml(newSlug);

    const res = await request.post(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/import`,
      {
        data: { yaml: newYaml, publish: true },
        headers: authHeaders(),
      }
    );

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.courseId).toMatch(UUID_RE);
    expect(body.review).toBeTruthy();
    expect(body.review.passed).toBe(true);
    expect(body.review.score).toBe("10/10");
  });

  // ── Step 8: Course graph endpoint returns full structure ──────

  test("step 8: course graph has all sections and concepts", async ({
    request,
  }) => {
    const res = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/graph`,
      { headers: authHeaders() }
    );

    expect(res.status()).toBe(200);

    const graph = await res.json();

    // Sections
    expect(graph.sections).toBeTruthy();
    expect(graph.sections.length).toBe(2);
    const sectionSlugs = graph.sections.map((s: { slug: string }) => s.slug);
    expect(sectionSlugs).toContain("foundations");
    expect(sectionSlugs).toContain("branching");

    // Concepts
    expect(graph.concepts).toBeTruthy();
    expect(graph.concepts.length).toBe(4);

    // Prerequisite edges — at least 3 (staging->vc, branching->vc, branching->staging, conflicts->branching)
    expect(graph.prerequisiteEdges).toBeTruthy();
    expect(graph.prerequisiteEdges.length).toBeGreaterThanOrEqual(3);
  });

  // ── Step 9: Concept detail includes KPs and problems ──────────

  test("step 9: concept detail includes KPs and problems", async ({
    request,
  }) => {
    // First get the graph to find a concept's UUID
    const graphRes = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/graph`,
      { headers: authHeaders() }
    );
    const graph = await graphRes.json();

    const branchingConcept = graph.concepts.find(
      (c: { slug: string }) => c.slug === "branching-basics"
    );
    expect(branchingConcept).toBeTruthy();

    const res = await request.get(
      `${BACKEND_URL}/orgs/${orgSlug}/courses/${courseId}/concepts/${branchingConcept.id}`,
      { headers: authHeaders() }
    );

    expect(res.status()).toBe(200);

    const detail = await res.json();
    expect(detail.name).toBe("Branching Basics");
    expect(detail.knowledgePoints).toBeTruthy();
    expect(detail.knowledgePoints.length).toBe(2); // bb-create, bb-merge

    // Each KP should have 3 problems
    for (const kp of detail.knowledgePoints) {
      expect(kp.problems.length).toBe(3);
    }
  });
});

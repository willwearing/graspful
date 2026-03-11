# Adding a New Course

End-to-end guide for creating a course YAML and importing it into the platform.

## 1. Create the YAML File

Add a new file at `content/courses/<course-slug>.yaml`. Use kebab-case for the filename.

Reference existing courses for patterns:
- `ny-real-estate-salesperson.yaml` — law/regulation-heavy content
- `ab-nfpa-1001-firefighter-i.yaml` — skills/standards-based content
- `electrical-nec/course.yaml` — technical exam prep

### Minimal Structure

```yaml
course:
  id: my-course-slug          # kebab-case, globally unique
  name: "Course Name"
  description: "One-line description"
  estimatedHours: 40
  version: "2024.1"
  sourceDocument: "Official Source Document"

concepts:
  - id: concept-slug
    name: "Concept Name"
    difficulty: 5              # 1-10
    estimatedMinutes: 15
    tags: [topic-tag]
    sourceRef: "Section 4.2"
    prerequisites: []          # other concept IDs from this course
    encompassing: []           # [{concept: other-id, weight: 0.7}]
    knowledgePoints:
      - id: kp-slug
        instruction: "Markdown explanation text"
        workedExample: "Step-by-step example (optional)"
        problems:
          - id: prob-1
            type: multiple_choice
            question: "What is X?"
            options: ["A", "B", "C", "D"]
            correct: 0
            explanation: "Because..."
            difficulty: 3      # 1-5, optional
```

### Problem Types

| Type | `options` | `correct` |
|------|-----------|-----------|
| `multiple_choice` | 4 string options | Index (0-based) |
| `fill_blank` | — | String answer |
| `true_false` | — | `true` or `false` |
| `ordering` | 4-6 steps | Comma-separated correct order |
| `matching` | Pairs | Correct mapping |
| `scenario` | Varies | Varies |

### Authoring Guidelines

See [`content/README.md`](../content/README.md) for detailed guidelines on:
- Concept granularity (one teachable idea per concept)
- Prerequisite limits (max 3-4 direct per concept)
- Encompassing weights (1.0 = full, 0.5-0.7 = substantial, 0.2-0.4 = partial)
- Knowledge point structure (1-4 per concept, progressively harder)
- Problem quality (plausible distractors, test understanding not recall)
- Tag conventions and source references

## 2. Validate the Schema

The Zod schema lives at `backend/src/knowledge-graph/schemas/course-yaml.schema.ts`. The importer validates:

- All required fields present
- No cycles in the prerequisite graph
- All referenced concept IDs exist within the course
- Encompassing weights between 0.0 and 1.0
- Difficulty 1-10 for concepts, 1-5 for problems
- Problem type is a valid enum value

Concepts without knowledge points are imported as graph structure only — they won't appear to students until KPs are added.

## 3. Import the Course

### Option A: CLI Script (recommended)

```bash
cd backend
npx ts-node ../scripts/load-course.ts \
  --orgId <org-uuid> \
  --file ../content/courses/my-course.yaml
```

Idempotent — re-running replaces the existing course data.

### Option B: REST API

```
POST /orgs/:orgId/courses/import
Content-Type: application/json

{
  "yaml": "<raw YAML content>"
}
```

Requires `admin` role on the org.

### Option C: Seed Script

For demo/dev environments, create a script in `scripts/` following the pattern in `scripts/seed-electrical.ts`. This can create the org, load the YAML, and set up a subscription in one step.

## 4. Verify

After importing, the CLI outputs stats:

```
Imported: 50 concepts, 120 knowledge points, 340 problems, 65 prerequisite edges, 28 encompassing edges
```

Check the course is visible in the app by enrolling a test user.

## Key Files

| File | Purpose |
|------|---------|
| `content/README.md` | Authoring guidelines |
| `backend/src/knowledge-graph/schemas/course-yaml.schema.ts` | Zod schema (source of truth) |
| `backend/src/knowledge-graph/course-importer.service.ts` | YAML-to-DB importer |
| `scripts/load-course.ts` | CLI import tool |
| `backend/prisma/schema.prisma` | Database schema |

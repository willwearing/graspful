# Zoomable Course & Section Graphs

**Status:** Future

## Problem

The knowledge graph visualization (built in Phase 11 with @xyflow/react) shows all 37 concepts at once. This works for courses with ~50 concepts but gets overwhelming as courses grow. More importantly, it only shows one level of detail — there's no way for students to see the high-level structure of a course at a glance.

## Proposal

Add two additional graph views that let students zoom between three levels of the knowledge graph, inspired by the course graph concept from *The Math Academy Way* Ch 4 (pp. 72-73): "a course graph... can be interpreted as a highly-compressed version of a knowledge graph where a single entity represents hundreds of topics."

### Three zoom levels

**1. Course graph (most zoomed out)**

Each node represents a top-level learning area. For the PostHog TAM course, this would be three nodes:

```
Data Models → Data Pipelines → PostHog
```

Each node shows aggregate progress (e.g., "12/13 concepts mastered"). Clicking a node zooms into the section graph for that area.

This answers: "Where am I in the big picture?"

**2. Section graph (mid-level)**

Each node represents a section. For the PostHog TAM course, this would be 10 nodes arranged by the section DAG:

```
Data Modeling Basics → Data Modeling Design → Pipeline Basics → Pipeline Architecture
    → PostHog Data Model → PostHog Ingestion → Identification → Group Analytics → ...
```

Each node shows section-level progress. Clicking a node zooms into the knowledge graph for that section's concepts.

This answers: "What learning milestones have I hit?"

**3. Knowledge graph (most zoomed in) — already built**

The existing concept-level DAG. Could be filtered to show only one section's concepts when entering from the section graph.

### Interaction model

- Default view: section graph (most useful day-to-day)
- Zoom out button → course graph
- Click a section node → knowledge graph filtered to that section
- Breadcrumb nav: Course > Section > Concepts

### Data requirements

All data already exists:
- Course sections with sortOrder (`CourseSection` model)
- Section-to-section dependencies (derived from cross-section concept prerequisites)
- Per-concept mastery states (`StudentConceptState`)
- Section-level progress = aggregate of concept states within section

The section DAG can be computed from existing prerequisite edges:
```typescript
// For each section, find which other sections it depends on
for (const concept of concepts) {
  for (const prereq of concept.prerequisites) {
    if (prereq.sectionId !== concept.sectionId) {
      sectionDeps[concept.sectionId].add(prereq.sectionId);
    }
  }
}
```

### Course-level grouping

Sections could optionally be grouped into "course areas" (a new level above sections) for the most zoomed-out view. For now, this can be derived from section naming conventions or a new `area` field on sections:

```yaml
sections:
  - id: data-modeling-basics
    name: "Data Modeling Basics"
    area: "Data Models"          # optional grouping for course graph
  - id: pipeline-basics
    name: "Pipeline Basics"
    area: "Data Pipelines"
```

Alternatively, the course graph could just show sections grouped by their first word/prefix.

### Implementation notes

- Reuse @xyflow/react (already a dependency)
- Dagre layout (already used for the knowledge graph) works at all three levels
- Section graph nodes could show a mini progress bar inside each node
- Animate transitions between zoom levels for spatial continuity

## References

- *The Math Academy Way* Ch 4 (pp. 72-73) — course graphs as compressed knowledge graphs
- *The Math Academy Way* Ch 13 (p213) — knowledge profile visualization showing mastery overlay on the graph
- Existing implementation: `apps/web/src/components/app/knowledge-graph.tsx`

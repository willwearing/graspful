# Zoomable Academy, Course, Section, and Concept Graphs

**Status:** Future

## Problem

The current knowledge graph visualization shows concept nodes for one course at a time. That is too flat for larger domains and does not match the way *The Math Academy Way* describes curriculum structure:

- the knowledge graph is the real structure
- course graphs are compressed views for humans
- learners need to see both the big picture and the next local milestone

For PostHog TAM specifically, the current course-level view hides the real teaching structure. The foundations should become multiple real courses inside a larger academy, so the graph UI must support more than one level above sections.

## Proposal

Add zoomable graph views that let learners move between four levels of the curriculum:

- `academy graph`
- `course graph`
- `section graph`
- `concept graph`

This is directly inspired by *The Math Academy Way* Ch. 4 (pp. 72-73): course graphs are highly compressed summaries of the underlying knowledge graph.

## Four Zoom Levels

### 1. Academy graph (most zoomed out)

Each node represents a real course inside an academy.

For the PostHog TAM academy, the first view would eventually look like:

```text
Part 1
  Data Models
  Data Pipelines
  PostHog Data Model
  PostHog Ingestion Pipeline

Part 2
  Anonymous Events
  Identified Events
  Groups
```

Each node shows aggregate progress, readiness, and blocked/available status. Clicking a course zooms into that course graph.

This answers:

- "What are the major branches of this academy?"
- "Which courses are unlocked, in progress, or blocked?"

### 2. Course graph

Each node represents a section inside a single course.

For `Course 3: PostHog Data Model`, this might show:

```text
Events -> Event Properties -> Persons -> Person Properties -> distinct_id -> Sessions -> Actions
```

Each node shows section-level progress. Clicking a section zooms into its concept graph.

This answers:

- "What are the major milestones inside this course?"
- "How far through this course am I?"

### 3. Section graph

Each node represents a concept inside that section or tightly related section slice.

This is the "what concepts make up this milestone?" view. It helps learners understand the local dependency structure before dropping to the fully detailed concept graph.

This answers:

- "What concepts are in this part of the course?"
- "Which concept is my current frontier?"

### 4. Concept graph (most zoomed in)

The existing concept-level DAG, with prerequisite and encompassing relationships visible.

This answers:

- "What exact concept comes next?"
- "What supports this concept?"

## Interaction Model

- Default view for enrolled learners: academy graph or last-active course graph, depending on context
- Click academy node -> course graph
- Click course node -> section graph
- Click section node -> concept graph
- Breadcrumb nav: `Academy > Course > Section > Concepts`
- Progress overlays at every zoom level
- Visual distinction between:
  - ready frontier nodes
  - blocked nodes
  - mastered nodes
  - review-due nodes

## Data Requirements

This requires first-class academy support in the learning model.

Needed entities:

- `Academy`
- `Course`
- `CourseSection`
- `Concept`
- prerequisite edges that may cross course boundaries
- encompassing edges that may cross course boundaries
- learner progress at concept scope, aggregated upward to section/course/academy scope

Derived graphs:

- academy DAG from cross-course prerequisite relationships
- course DAG from cross-section prerequisite relationships
- section DAG from concept prerequisite relationships

## Authoring Implications

The UI model should match the authoring model:

- one academy manifest defines the academy tree
- each real course defines its own sections and concepts
- concept edges remain the real source of truth
- course and section graphs are derived/compressed views

This is especially important for parallel authoring. If the structure is real in the engine and real in the authoring model, multiple agents can safely work on different courses without inventing contradictory hierarchies.

## PostHog TAM Example

The near-term academy graph should show at least these four foundations courses:

- `Data Models`
- `Data Pipelines`
- `PostHog Data Model`
- `PostHog Ingestion Pipeline`

Those should not be fake "areas" inside one course. They should be real courses in the academy graph, with cross-course edges when one course depends on another.

## Implementation Notes

- Reuse `@xyflow/react`
- Keep Dagre or another DAG layout system for each zoom level
- Aggregate progress up from concept states to section/course/academy nodes
- Allow course and section nodes to expose quick stats:
  - mastered / total concepts
  - review due count
  - ready vs blocked state
- Animate transitions between zoom levels for spatial continuity

## References

- *The Math Academy Way* Ch. 4 (pp. 72-73) -- course graphs as compressed knowledge graphs
- *The Math Academy Way* Ch. 13 (pp. 210-214) -- frontier-based advancement across ready topics
- *The Math Academy Way* Ch. 14 (pp. 217-220) -- splitting large stairs into smaller stairs
- *The Math Academy Way* Ch. 16 (pp. 241-245) -- hierarchical connected learning sequences

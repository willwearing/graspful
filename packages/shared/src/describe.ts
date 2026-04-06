import type { CourseYaml } from './schemas/course-yaml.schema';

export interface CourseDescription {
  courseName: string;
  courseId: string;
  version: string;
  estimatedHours: number;
  concepts: number;
  authoredConcepts: number;
  stubConcepts: number;
  knowledgePoints: number;
  problems: number;
  graphDepth: number;
  conceptsWithoutKps: number;
  conceptsWithoutKpsList: string[];
  kpsWithoutProblems: number;
  kpsWithoutProblemsList: string[];
  sections: Array<{ section: string; concepts: number; kps: number; problems: number }>;
}

export function computeGraphDepth(concepts: CourseYaml['concepts']): number {
  const graph = new Map<string, string[]>();
  for (const c of concepts) {
    graph.set(c.id, c.prerequisites);
  }

  const memo = new Map<string, number>();

  function depth(id: string, visited: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);

    const prereqs = graph.get(id) ?? [];
    let maxPrereqDepth = 0;
    for (const prereq of prereqs) {
      if (graph.has(prereq)) {
        maxPrereqDepth = Math.max(maxPrereqDepth, depth(prereq, visited));
      }
    }

    const d = maxPrereqDepth + 1;
    memo.set(id, d);
    return d;
  }

  let maxDepth = 0;
  for (const c of concepts) {
    maxDepth = Math.max(maxDepth, depth(c.id, new Set()));
  }
  return maxDepth;
}

export function describeCourse(data: CourseYaml): CourseDescription {
  const concepts = data.concepts;
  const sections = data.sections;

  const authoredConcepts = concepts.filter((c) => c.knowledgePoints.length > 0);
  const stubConcepts = concepts.filter((c) => c.knowledgePoints.length === 0);

  const kpCount = concepts.reduce((sum, c) => sum + c.knowledgePoints.length, 0);
  const problemCount = concepts.reduce(
    (sum, c) => sum + c.knowledgePoints.reduce((s, kp) => s + kp.problems.length, 0),
    0,
  );

  const graphDepth = computeGraphDepth(concepts);

  const conceptsWithoutKps = stubConcepts.map((c) => c.id);
  const kpsWithoutProblems: string[] = [];
  for (const c of concepts) {
    for (const kp of c.knowledgePoints) {
      if (kp.problems.length === 0) {
        kpsWithoutProblems.push(`${c.id}/${kp.id}`);
      }
    }
  }

  const sectionBreakdown: CourseDescription['sections'] = [];
  if (sections.length > 0) {
    for (const section of sections) {
      const sectionConcepts = concepts.filter((c) => c.section === section.id);
      const sKps = sectionConcepts.reduce((sum, c) => sum + c.knowledgePoints.length, 0);
      const sProblems = sectionConcepts.reduce(
        (sum, c) => sum + c.knowledgePoints.reduce((s, kp) => s + kp.problems.length, 0),
        0,
      );
      sectionBreakdown.push({ section: section.id, concepts: sectionConcepts.length, kps: sKps, problems: sProblems });
    }

    const unsectioned = concepts.filter((c) => !c.section);
    if (unsectioned.length > 0) {
      const uKps = unsectioned.reduce((sum, c) => sum + c.knowledgePoints.length, 0);
      const uProblems = unsectioned.reduce(
        (sum, c) => sum + c.knowledgePoints.reduce((s, kp) => s + kp.problems.length, 0),
        0,
      );
      sectionBreakdown.push({ section: '(unsectioned)', concepts: unsectioned.length, kps: uKps, problems: uProblems });
    }
  }

  return {
    courseName: data.course.name,
    courseId: data.course.id,
    version: data.course.version,
    estimatedHours: data.course.estimatedHours,
    concepts: concepts.length,
    authoredConcepts: authoredConcepts.length,
    stubConcepts: stubConcepts.length,
    knowledgePoints: kpCount,
    problems: problemCount,
    graphDepth,
    conceptsWithoutKps: conceptsWithoutKps.length,
    conceptsWithoutKpsList: conceptsWithoutKps,
    kpsWithoutProblems: kpsWithoutProblems.length,
    kpsWithoutProblemsList: kpsWithoutProblems,
    sections: sectionBreakdown,
  };
}

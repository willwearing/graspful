import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { CourseYamlSchema } from '@graspful/shared';
import type { CourseYaml } from '@graspful/shared';
import { output, outputError } from '../lib/output';

function computeGraphDepth(concepts: CourseYaml['concepts']): number {
  const graph = new Map<string, string[]>();
  for (const c of concepts) {
    graph.set(c.id, c.prerequisites);
  }

  const memo = new Map<string, number>();

  function depth(id: string, visited: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visited.has(id)) return 0; // cycle, avoid infinite loop
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

export function registerDescribeCommand(program: Command) {
  program
    .command('describe <file>')
    .description('Show course statistics and structure summary')
    .action(async (file: string) => {
      if (!fs.existsSync(file)) {
        outputError(`File not found: ${file}`);
        process.exit(1);
      }

      let raw: unknown;
      try {
        raw = yaml.load(fs.readFileSync(file, 'utf-8'));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        outputError(`YAML parse error: ${msg}`);
        process.exit(1);
      }

      const result = CourseYamlSchema.safeParse(raw);
      if (!result.success) {
        outputError(`Invalid course YAML: ${result.error.issues[0]?.message ?? 'unknown error'}`);
        process.exit(1);
      }

      const data = result.data;
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

      // Section breakdown
      const sectionBreakdown: Array<{ section: string; concepts: number; kps: number; problems: number }> = [];
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

        // Concepts without a section
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

      const stats = {
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
        kpsWithoutProblems: kpsWithoutProblems.length,
        sections: sectionBreakdown,
      };

      const humanLines = [
        `Course: "${data.course.name}" (v${data.course.version})`,
        `Concepts: ${concepts.length} (${authoredConcepts.length} authored, ${stubConcepts.length} stubs)`,
        `KPs: ${kpCount}, Problems: ${problemCount}`,
        `Graph depth: ${graphDepth}`,
        `Missing: ${conceptsWithoutKps.length} concepts need KPs, ${kpsWithoutProblems.length} KPs need problems`,
      ];

      if (sectionBreakdown.length > 0) {
        humanLines.push('');
        humanLines.push('Sections:');
        for (const s of sectionBreakdown) {
          humanLines.push(`  ${s.section}: ${s.concepts} concepts, ${s.kps} KPs, ${s.problems} problems`);
        }
      }

      output(stats, humanLines.join('\n'));
    });
}

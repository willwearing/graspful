import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { CourseYamlSchema, describeCourse } from '@graspful/shared';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';

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

      const stats = describeCourse(result.data);

      const humanLines = [
        `Course: "${stats.courseName}" (v${stats.version})`,
        `Concepts: ${stats.concepts} (${stats.authoredConcepts} authored, ${stats.stubConcepts} stubs)`,
        `KPs: ${stats.knowledgePoints}, Problems: ${stats.problems}`,
        `Graph depth: ${stats.graphDepth}`,
        `Missing: ${stats.conceptsWithoutKps} concepts need KPs, ${stats.kpsWithoutProblems} KPs need problems`,
      ];

      if (stats.sections.length > 0) {
        humanLines.push('');
        humanLines.push('Sections:');
        for (const s of stats.sections) {
          humanLines.push(`  ${s.section}: ${s.concepts} concepts, ${s.kps} KPs, ${s.problems} problems`);
        }
      }

      cliCapture('course described', { concept_count: stats.concepts, kp_count: stats.knowledgePoints, problem_count: stats.problems });
      output(stats, humanLines.join('\n'));
    });
}

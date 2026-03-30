import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { runQualityGate } from '@graspful/shared';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';

export function registerReviewCommand(program: Command) {
  program
    .command('review <file>')
    .description('Run all 10 mechanical quality checks on a course YAML')
    .action(async (file: string) => {
      if (!fs.existsSync(file)) {
        outputError(`File not found: ${file}`);
        process.exit(1);
      }

      let raw: unknown;
      try {
        raw = yaml.load(fs.readFileSync(file, 'utf-8'));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        outputError(`YAML parse error: ${message}`);
        process.exit(1);
      }

      const result = runQualityGate(raw);
      const lines = [
        result.passed ? 'PASS' : 'FAIL',
        `Score: ${result.score}`,
        `Stats: ${result.stats.concepts} concepts (${result.stats.authoredConcepts} authored, ${result.stats.stubConcepts} stubs), ${result.stats.kps} KPs, ${result.stats.problems} problems`,
      ];

      if (result.failures.length > 0) {
        lines.push('');
        lines.push('Failures:');
        for (const failure of result.failures) {
          lines.push(`  [FAIL] ${failure.check}: ${failure.details ?? 'no details'}`);
        }
      }

      cliCapture('course reviewed', { score: result.score, passed: result.passed });
      output(result, lines.join('\n'));

      if (!result.passed) {
        process.exit(1);
      }
    });
}

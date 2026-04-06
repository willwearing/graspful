import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { validateParsedYaml } from '@graspful/shared';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';

export function registerValidateCommand(program: Command) {
  program
    .command('validate <file>')
    .description('Validate a course, brand, or academy YAML file against its schema')
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
        output(
          { valid: false, errors: [`YAML parse error: ${msg}`], stats: {} },
          `FAIL  YAML parse error: ${msg}`,
        );
        process.exit(1);
      }

      const result = validateParsedYaml(raw);

      if (!result.valid) {
        output(
          result,
          `FAIL  ${result.fileType ?? 'unknown'} validation (${result.errors.length} error${result.errors.length === 1 ? '' : 's'}):\n${result.errors.map((e) => `  - ${e}`).join('\n')}`,
        );
        process.exit(1);
      }

      cliCapture('course validated', { valid: true, error_count: 0, file_type: result.fileType });
      output(
        result,
        `PASS  ${result.fileType} validation\n${Object.entries(result.stats).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`,
      );
    });
}

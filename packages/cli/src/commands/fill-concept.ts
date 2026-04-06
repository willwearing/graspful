import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { fillConceptInRaw } from '@graspful/shared';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';

export function registerFillConceptCommand(program: Command) {
  const fill = program
    .command('fill')
    .description('Fill in content stubs');

  fill
    .command('concept <file> <conceptId>')
    .description('Add KP stubs to a specific concept')
    .option('--kps <count>', 'Number of KP stubs to add', '2')
    .option('--problems <count>', 'Number of problem stubs per KP', '3')
    .action(async (file: string, conceptId: string, opts: { kps: string; problems: string }) => {
      if (!fs.existsSync(file)) {
        outputError(`File not found: ${file}`);
        process.exit(1);
      }

      const content = fs.readFileSync(file, 'utf-8');
      let raw: unknown;
      try {
        raw = yaml.load(content);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        outputError(`YAML parse error: ${msg}`);
        process.exit(1);
      }

      try {
        const updated = fillConceptInRaw(raw, conceptId, {
          kps: parseInt(opts.kps, 10),
          problemsPerKp: parseInt(opts.problems, 10),
        });

        const updatedYaml = yaml.dump(updated, { lineWidth: 120, noRefs: true, schema: yaml.JSON_SCHEMA });
        fs.writeFileSync(file, updatedYaml);

        cliCapture('concept filled', { concept_id: conceptId });
        output(
          { conceptId, kpsAdded: parseInt(opts.kps, 10), problemsPerKp: parseInt(opts.problems, 10), file },
          `Added ${opts.kps} KP stub(s) with ${opts.problems} problem(s) each to "${conceptId}" in ${file}`,
        );
      } catch (e) {
        outputError(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });

  return fill;
}

import { Command } from 'commander';
import { positiveInteger } from '../lib/numbers';
import * as fs from 'fs';
import { readYamlFile, dumpYaml } from '@graspful/client';
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
    .option('--kps <count>', 'Number of KP stubs to add (authoring starting point, not a cap)', positiveInteger, 3)
    .option('--problems <count>', 'Number of problem stubs per KP', positiveInteger, 3)
    .action(async (file: string, conceptId: string, opts: { kps: number; problems: number }) => {
      if (!fs.existsSync(file)) {
        outputError(`File not found: ${file}`);
        process.exit(1);
      }

      let raw: unknown;
      try {
        raw = readYamlFile(file).raw;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        outputError(msg);
        process.exit(1);
      }

      try {
        const updated = fillConceptInRaw(raw, conceptId, {
          kps: opts.kps,
          problemsPerKp: opts.problems,
        });

        const updatedYaml = dumpYaml(updated);
        fs.writeFileSync(file, updatedYaml);

        cliCapture('concept filled', { concept_id: conceptId });
        output(
          { conceptId, kpsAdded: opts.kps, problemsPerKp: opts.problems, file },
          `Added ${opts.kps} KP stub(s) with ${opts.problems} problem(s) each to "${conceptId}" in ${file}`,
        );
      } catch (e) {
        outputError(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });

  return fill;
}

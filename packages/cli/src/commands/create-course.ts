import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { scaffoldCourseObject } from '@graspful/shared';
import { output } from '../lib/output';
import { cliCapture } from '../lib/analytics';

export function registerCreateCourseCommand(program: Command) {
  const create = program
    .command('create')
    .description('Scaffold new YAML files');

  create
    .command('course')
    .description('Generate a course YAML scaffold')
    .requiredOption('--topic <topic>', 'Course topic name')
    .option('--hours <hours>', 'Estimated course hours', '10')
    .option('--source <source>', 'Source document reference')
    .option('-o, --output <file>', 'Output file path (defaults to stdout)')
    .option('--scaffold-only', 'Generate scaffold without AI enrichment', true)
    .action(async (opts: { topic: string; hours: string; source?: string; output?: string; scaffoldOnly: boolean }) => {
      const obj = scaffoldCourseObject(opts.topic, {
        hours: parseInt(opts.hours, 10),
        source: opts.source,
      });
      const yamlContent = yaml.dump(obj, { lineWidth: 120, noRefs: true });

      cliCapture('course scaffolded', { topic: opts.topic, estimated_hours: parseInt(opts.hours, 10) });

      if (opts.output) {
        fs.writeFileSync(opts.output, yamlContent);
        output(
          { file: opts.output, topic: opts.topic },
          `Scaffold written to ${opts.output}`,
        );
      } else {
        console.log(yamlContent);
      }
    });

  return create;
}

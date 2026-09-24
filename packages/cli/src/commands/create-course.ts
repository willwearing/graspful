import { Command } from 'commander';
import { positiveInteger } from '../lib/numbers';
import * as fs from 'fs';
import { dumpYaml } from '@graspful/client';
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
    .option('--hours <hours>', 'Estimated course hours', positiveInteger, 10)
    .option('--source <source>', 'Source document reference')
    .option('-o, --output <file>', 'Output file path (defaults to stdout)')
    .action(async (opts: { topic: string; hours: number; source?: string; output?: string }) => {
      const obj = scaffoldCourseObject(opts.topic, {
        hours: opts.hours,
        source: opts.source,
      });
      const yamlContent = dumpYaml(obj);

      cliCapture('course scaffolded', { topic: opts.topic, estimated_hours: opts.hours });

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

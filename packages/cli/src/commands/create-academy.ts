import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { scaffoldAcademyObject } from '@graspful/shared';
import { output } from '../lib/output';
import { cliCapture } from '../lib/analytics';

function collect(value: string, previous: string[]) {
  previous.push(value);
  return previous;
}

export function registerCreateAcademyCommand(createCmd: Command) {
  createCmd
    .command('academy')
    .description('Generate an academy manifest scaffold')
    .requiredOption('--topic <topic>', 'Academy topic name')
    .option(
      '--course <name>',
      'Course name to include in the academy manifest (repeatable). Defaults to one foundations course.',
      collect,
      [] as string[],
    )
    .option('--version <version>', 'Academy version', '2026.1')
    .option('-o, --output <file>', 'Output file path (defaults to stdout)')
    .action(
      async (opts: {
        topic: string;
        course: string[];
        version: string;
        output?: string;
      }) => {
        const obj = scaffoldAcademyObject(opts.topic, {
          courseNames: opts.course,
          version: opts.version,
        });
        const yamlContent = yaml.dump(obj, { lineWidth: 120, noRefs: true });

        cliCapture('academy scaffolded', {
          topic: opts.topic,
          course_count: obj.courses.length,
        });

        if (opts.output) {
          fs.writeFileSync(opts.output, yamlContent);
          output(
            { file: opts.output, topic: opts.topic, courses: obj.courses.length },
            `Academy scaffold written to ${opts.output}`,
          );
        } else {
          console.log(yamlContent);
        }
      },
    );
}

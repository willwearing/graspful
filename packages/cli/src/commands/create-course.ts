import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';

export function scaffoldCourse(topic: string, options: { hours?: number; source?: string }): string {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return yaml.dump({
    course: {
      id: slug,
      name: topic,
      description: `Adaptive course on ${topic}`,
      estimatedHours: options.hours || 10,
      version: '2026.1',
      sourceDocument: options.source || 'TODO: Add source document',
    },
    sections: [
      { id: 'foundations', name: 'Foundations', description: 'Core concepts' },
      { id: 'application', name: 'Application', description: 'Applied concepts' },
    ],
    concepts: [
      {
        id: `${slug}-intro`,
        name: `Introduction to ${topic}`,
        section: 'foundations',
        difficulty: 2,
        estimatedMinutes: 15,
        tags: ['foundational'],
        prerequisites: [],
        knowledgePoints: [],
      },
    ],
  }, { lineWidth: 120, noRefs: true });
}

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
      const yamlContent = scaffoldCourse(opts.topic, {
        hours: parseInt(opts.hours, 10),
        source: opts.source,
      });

      cliCapture('course scaffolded', { topic: opts.topic, estimated_hours: parseInt(opts.hours, 10) });

      if (opts.output) {
        fs.writeFileSync(opts.output, yamlContent);
        output(
          { file: opts.output, topic: opts.topic },
          `Scaffold written to ${opts.output}`,
        );
      } else {
        // Output raw YAML to stdout (not wrapped in JSON even in json mode for piping)
        console.log(yamlContent);
      }
    });

  return create;
}

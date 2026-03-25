#!/usr/bin/env node
import { Command } from 'commander';
import { setOutputFormat, OutputFormat } from './lib/output';
import { registerValidateCommand } from './commands/validate';
import { registerImportCommand } from './commands/import';
import { registerPublishCommand } from './commands/publish';
import { registerReviewCommand } from './commands/review';
import { registerCreateCourseCommand } from './commands/create-course';
import { registerCreateBrandCommand } from './commands/create-brand';
import { registerFillConceptCommand } from './commands/fill-concept';
import { registerDescribeCommand } from './commands/describe';
import { registerLoginCommand } from './commands/login';
import { registerRegisterCommand } from './commands/register';
import { registerInitCommand } from './commands/init';

const program = new Command();

program
  .name('graspful')
  .description('Create adaptive learning courses from YAML')
  .version('0.1.0')
  .option('--format <format>', 'Output format: human or json', 'human')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.format) {
      setOutputFormat(opts.format as OutputFormat);
    }
  });

registerValidateCommand(program);
registerImportCommand(program);
registerPublishCommand(program);
registerReviewCommand(program);
const createCmd = registerCreateCourseCommand(program);
registerCreateBrandCommand(createCmd);
const fillCmd = registerFillConceptCommand(program);
registerDescribeCommand(program);
registerLoginCommand(program);
registerRegisterCommand(program);
registerInitCommand(program);

program.parse();

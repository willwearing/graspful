import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { scaffoldBrandObject } from '@graspful/shared';
import { output } from '../lib/output';
import { cliCapture } from '../lib/analytics';

export function registerCreateBrandCommand(createCmd: Command) {
  createCmd
    .command('brand')
    .description('Generate a brand YAML scaffold')
    .requiredOption('--niche <niche>', 'Brand niche (education, healthcare, finance, tech, legal)')
    .option('--name <name>', 'Brand name')
    .option('--topic <topic>', 'Academy topic for more specific landing-page copy')
    .option('--domain <domain>', 'Custom domain')
    .option('--org <slug>', 'Organization slug')
    .option('-o, --output <file>', 'Output file path (defaults to stdout)')
    .action(async (opts: { niche: string; name?: string; topic?: string; domain?: string; org?: string; output?: string }) => {
      const obj = scaffoldBrandObject(opts.niche, {
        name: opts.name,
        topic: opts.topic,
        domain: opts.domain,
        orgSlug: opts.org,
      });
      const yamlContent = yaml.dump(obj, { lineWidth: 120, noRefs: true });

      cliCapture('brand scaffolded', { niche: opts.niche });
      if (opts.output) {
        fs.writeFileSync(opts.output, yamlContent);
        output(
          { file: opts.output, niche: opts.niche },
          `Brand scaffold written to ${opts.output}`,
        );
      } else {
        console.log(yamlContent);
      }
    });
}

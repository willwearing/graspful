import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { output } from '../lib/output';

const NICHE_PRESETS: Record<string, { preset: string; tagline: string; headline: string }> = {
  education: { preset: 'blue', tagline: 'Learn smarter, not harder', headline: 'Master any subject with adaptive learning' },
  healthcare: { preset: 'emerald', tagline: 'Training that saves lives', headline: 'Adaptive healthcare education for professionals' },
  finance: { preset: 'slate', tagline: 'Build financial expertise', headline: 'Master finance with adaptive learning' },
  tech: { preset: 'indigo', tagline: 'Level up your skills', headline: 'Adaptive tech training that meets you where you are' },
  legal: { preset: 'amber', tagline: 'Know the law, pass the exam', headline: 'Adaptive legal education for exam success' },
  default: { preset: 'blue', tagline: 'Learn adaptively', headline: 'Personalized learning that works' },
};

export function scaffoldBrand(niche: string, options: { name?: string; domain?: string; orgSlug?: string }): string {
  const config = NICHE_PRESETS[niche] || NICHE_PRESETS['default'];
  const slug = (options.name || niche).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const name = options.name || `${niche.charAt(0).toUpperCase() + niche.slice(1)} Academy`;
  const domain = options.domain || `${slug}.graspful.com`;

  return yaml.dump({
    brand: {
      id: slug,
      name,
      domain,
      tagline: config.tagline,
      logoUrl: '/icon.svg',
      orgSlug: options.orgSlug || 'TODO: your-org-slug',
    },
    theme: {
      preset: config.preset,
      radius: '0.5rem',
    },
    landing: {
      hero: {
        headline: config.headline,
        subheadline: `${name} uses adaptive learning to help you master concepts faster.`,
        ctaText: 'Start Learning',
      },
      features: {
        heading: 'Why choose us?',
        items: [
          { title: 'Adaptive Learning', description: 'Content adapts to your knowledge level', icon: 'brain' },
          { title: 'Spaced Repetition', description: 'Review at optimal intervals for lasting memory', icon: 'clock' },
          { title: 'Progress Tracking', description: 'See exactly where you stand', icon: 'chart' },
        ],
      },
      howItWorks: {
        heading: 'How it works',
        items: [
          { title: 'Take a diagnostic', description: 'We assess what you already know' },
          { title: 'Learn adaptively', description: 'Focus on gaps, skip what you know' },
          { title: 'Master the material', description: 'Prove mastery through progressive challenges' },
        ],
      },
      faq: [],
    },
    pricing: {
      monthly: 0,
      currency: 'usd',
      trialDays: 0,
    },
    seo: {
      title: `${name} — Adaptive Learning`,
      description: config.tagline,
      keywords: [niche, 'learning', 'adaptive', 'education'],
    },
  }, { lineWidth: 120, noRefs: true });
}

export function registerCreateBrandCommand(createCmd: Command) {
  createCmd
    .command('brand')
    .description('Generate a brand YAML scaffold')
    .requiredOption('--niche <niche>', 'Brand niche (education, healthcare, finance, tech, legal)')
    .option('--name <name>', 'Brand name')
    .option('--domain <domain>', 'Custom domain')
    .option('--org <slug>', 'Organization slug')
    .option('-o, --output <file>', 'Output file path (defaults to stdout)')
    .action(async (opts: { niche: string; name?: string; domain?: string; org?: string; output?: string }) => {
      const yamlContent = scaffoldBrand(opts.niche, {
        name: opts.name,
        domain: opts.domain,
        orgSlug: opts.org,
      });

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

import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { CourseYamlSchema } from '../schemas';
import { output, outputError } from '../lib/output';

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

      const parsed = CourseYamlSchema.safeParse(raw);
      if (!parsed.success) {
        outputError(`Invalid course YAML: ${parsed.error.issues[0]?.message ?? 'unknown error'}`);
        process.exit(1);
      }

      const data = parsed.data;
      const concept = data.concepts.find((c) => c.id === conceptId);
      if (!concept) {
        outputError(`Concept "${conceptId}" not found. Available: ${data.concepts.map((c) => c.id).join(', ')}`);
        process.exit(1);
      }

      if (concept.knowledgePoints.length > 0) {
        output(
          { conceptId, existingKps: concept.knowledgePoints.length, action: 'skipped' },
          `Concept "${conceptId}" already has ${concept.knowledgePoints.length} KP(s). Use --force to overwrite (not yet implemented).`,
        );
        return;
      }

      const kpCount = parseInt(opts.kps, 10);
      const problemsPerKp = parseInt(opts.problems, 10);

      const newKps = [];
      for (let i = 1; i <= kpCount; i++) {
        const problems = [];
        for (let j = 1; j <= problemsPerKp; j++) {
          problems.push({
            id: `${conceptId}-kp${i}-p${j}`,
            type: 'multiple_choice',
            question: `TODO: Write question ${j} for ${conceptId} KP${i}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct: 0,
            explanation: 'TODO: Explain the correct answer',
            difficulty: Math.min(j + 1, 5),
          });
        }

        newKps.push({
          id: `${conceptId}-kp${i}`,
          instruction: `TODO: Write instruction for ${concept.name} — knowledge point ${i}`,
          workedExample: `TODO: Write a worked example for ${concept.name} — knowledge point ${i}`,
          problems,
        });
      }

      // Rebuild the raw object to preserve structure, then replace the concept's KPs
      const rawObj = raw as Record<string, unknown>;
      const concepts = (rawObj['concepts'] as Array<Record<string, unknown>>);
      const targetConcept = concepts.find((c) => c['id'] === conceptId);
      if (targetConcept) {
        targetConcept['knowledgePoints'] = newKps;
      }

      const updatedYaml = yaml.dump(rawObj, { lineWidth: 120, noRefs: true });
      fs.writeFileSync(file, updatedYaml);

      output(
        { conceptId, kpsAdded: kpCount, problemsPerKp, file },
        `Added ${kpCount} KP stub(s) with ${problemsPerKp} problem(s) each to "${conceptId}" in ${file}`,
      );
    });

  return fill;
}

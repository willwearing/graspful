/**
 * Learning-gain eval: how much of a hidden exam a simulated student can answer from the course alone.
 * Run: bun content/tools/learning-gain/cli.ts <command> [flags]. See README.md in this folder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { checkExam, type Exam, type ExamItem, loadExam, scoredItems } from './exam';
import { type Answer, decide, gradeItem, type ItemResult, majorityCorrect, type Outcome, type Report, summarize } from './grade';
import { affectedConcepts, hashText, loadCourse, type Mode, readingFor } from './lesson';
import { studentPrompt } from './prompt';
import { runQualityGate } from '../../../packages/shared/src/index';

const { positionals, values: flags } = parseArgs({
  allowPositionals: true,
  options: {
    course: { type: 'string' },
    exam: { type: 'string' },
    mode: { type: 'string', default: 'taught' },
    samples: { type: 'string', default: '1' },
    concepts: { type: 'string' },
    out: { type: 'string' },
    dir: { type: 'string' },
    before: { type: 'string' },
    after: { type: 'string' },
    target: { type: 'string' },
    oracle: { type: 'string' },
    guess: { type: 'string' },
    model: { type: 'string', default: 'claude-haiku-5-5' },
  },
});

// Roughly 40k tokens: comfortable for one Haiku subagent to read and answer.
const MAX_BATCH_CHARS = 150_000;

interface Packet {
  name: string;
  conceptId: string;
  sample: number;
  itemIds: string[];
  readingHash: string | null;
}

interface Manifest {
  course: string;
  exam: string;
  mode: Mode;
  samples: number;
  packets: Packet[];
}

function need(name: keyof typeof flags): string {
  const value = flags[name];
  if (typeof value !== 'string' || !value) throw new Error(`--${name} is required`);
  return path.resolve(value);
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function selectConcepts(course: any): string[] {
  const all: string[] = course.concepts.map((c: any) => c.id);
  if (!flags.concepts) return all;
  const picked = flags.concepts.split(',').map((s) => s.trim());
  const unknown = picked.filter((id) => !all.includes(id));
  if (unknown.length) throw new Error(`unknown concepts: ${unknown.join(', ')}`);
  return picked;
}

function itemsByConcept(exam: Exam, concepts: string[]): Map<string, ExamItem[]> {
  const grouped = new Map<string, ExamItem[]>();
  for (const id of concepts) {
    const items = scoredItems(exam).filter((item) => item.conceptId === id);
    if (items.length) grouped.set(id, items);
  }
  return grouped;
}

/** Writes one prompt file per concept per sample. Subagents answer them; `grade` scores the answers. */
function prepare(): Manifest {
  const coursePath = need('course');
  const examPath = need('exam');
  const out = need('out');
  const mode = flags.mode as Mode;
  if (!['taught', 'guess', 'oracle'].includes(mode)) throw new Error('--mode must be taught, guess, or oracle');
  const samples = Number(flags.samples);
  const course = loadCourse(coursePath);
  const exam = loadExam(examPath);
  const manifest: Manifest = { course: coursePath, exam: examPath, mode, samples, packets: [] };
  fs.rmSync(out, { recursive: true, force: true });
  const batches: string[][] = [];
  for (let sample = 1; sample <= samples; sample++) {
    // Each batch is one subagent. Samples never share one, and big readings split across several.
    let batch: string[] = [];
    let size = 0;
    for (const [conceptId, items] of itemsByConcept(exam, selectConcepts(course))) {
      const name = `${conceptId}.${mode}.s${sample}`;
      const reading = readingFor(mode, conceptId, course, exam);
      const packetPath = path.join(out, 'packets', `${name}.md`);
      const packet = studentPrompt(mode, reading, items, path.join(out, 'answers', `${name}.json`));
      fs.mkdirSync(path.dirname(packetPath), { recursive: true });
      fs.writeFileSync(packetPath, packet);
      manifest.packets.push({ name, conceptId, sample, itemIds: items.map((i) => i.id), readingHash: reading === null ? null : hashText(reading) });
      if (batch.length && size + packet.length > MAX_BATCH_CHARS) {
        batches.push(batch);
        batch = [];
        size = 0;
      }
      batch.push(packetPath);
      size += packet.length;
    }
    if (batch.length) batches.push(batch);
  }
  batches.forEach((batch, i) => fs.writeFileSync(path.join(out, `batch-${i + 1}.txt`), `${batch.join('\n')}\n`));
  fs.mkdirSync(path.join(out, 'answers'), { recursive: true });
  writeJson(path.join(out, 'manifest.json'), manifest);
  return manifest;
}

function parseAnswers(raw: string): Answer[] {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) return [];
  try {
    return JSON.parse(raw.slice(start, end + 1)).answers ?? [];
  } catch {
    return [];
  }
}

/** Scores answer files against the exam. Refuses if the course changed since `prepare`. */
function grade(dir: string): Report {
  const manifest = readJson<Manifest>(path.join(dir, 'manifest.json'));
  const course = loadCourse(manifest.course);
  const exam = loadExam(manifest.exam);
  const byId = new Map(exam.items.map((item) => [item.id, item]));
  const results = new Map<string, ItemResult>();
  const missing: string[] = [];
  for (const packet of manifest.packets) {
    const reading = readingFor(manifest.mode, packet.conceptId, course, exam);
    if ((reading === null ? null : hashText(reading)) !== packet.readingHash) {
      throw new Error(`${packet.name}: course changed since prepare. Re-run prepare.`);
    }
    const answerPath = path.join(dir, 'answers', `${packet.name}.json`);
    if (!fs.existsSync(answerPath)) missing.push(packet.name);
    const answers = fs.existsSync(answerPath) ? parseAnswers(fs.readFileSync(answerPath, 'utf8')) : [];
    const answerById = new Map(answers.map((a) => [a.id, a]));
    for (const id of packet.itemIds) {
      const item = byId.get(id)!;
      const result = (results.get(id) ?? { id, conceptId: item.conceptId, split: item.split, objective: item.objective, outcomes: [] }) as ItemResult;
      result.outcomes.push(gradeItem(manifest.mode, item, answerById.get(id), reading));
      results.set(id, result);
    }
  }
  if (missing.length) console.error(`warning: no answers for ${missing.join(', ')} (scored as abstain)`);
  const report = summarize(manifest.mode, manifest.samples, [...results.values()], new Set(exam.guessable ?? []));
  writeJson(path.join(dir, 'report.json'), report);
  // Item-level outcomes stay next to the answers for calibration. They are ids only, never question text.
  writeJson(path.join(dir, 'items.json'), [...results.values()].map(({ id, outcomes }) => ({ id, outcomes })));
  return report;
}

async function callModel(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set. Use prepare + subagents + grade instead.');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: flags.model, max_tokens: 4096, temperature: 0, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(`Anthropic API ${response.status}: ${await response.text()}`);
  const body: any = await response.json();
  return body.content.map((block: any) => block.text ?? '').join('');
}

/** prepare + answer every packet through the API + grade, in one step. */
async function run(): Promise<Report> {
  const manifest = prepare();
  const dir = need('out');
  const course = loadCourse(manifest.course);
  const exam = loadExam(manifest.exam);
  const byId = new Map(exam.items.map((item) => [item.id, item]));
  for (const packet of manifest.packets) {
    const reading = readingFor(manifest.mode, packet.conceptId, course, exam);
    const items = packet.itemIds.map((id) => byId.get(id)!);
    fs.writeFileSync(path.join(dir, 'answers', `${packet.name}.json`), await callModel(studentPrompt(manifest.mode, reading, items, null)));
  }
  return grade(dir);
}

/** Broken items (the source-taught student misses them) stop counting. Guessable items don't count as hard. */
function calibrate() {
  const examPath = need('exam');
  const exam = loadExam(examPath);
  const items = (dir: string) => readJson<{ id: string; outcomes: Outcome[] }[]>(path.join(dir, 'items.json'));
  exam.excluded = items(need('oracle')).filter((r) => !majorityCorrect(r.outcomes)).map((r) => r.id);
  const excluded = new Set(exam.excluded);
  const guessed = items(need('guess')).filter((r) => !excluded.has(r.id));
  const dev = new Set(exam.items.filter((i) => i.split === 'dev').map((i) => i.id));
  exam.guessable = guessed.filter((r) => dev.has(r.id) && majorityCorrect(r.outcomes)).map((r) => r.id);
  const devGuessed = guessed.filter((r) => dev.has(r.id));
  exam.guessRate = devGuessed.length ? exam.guessable.length / devGuessed.length : 0;
  writeJson(examPath, exam);
  return { items: exam.items.length, excluded: exam.excluded.length, guessable: exam.guessable.length, hardDev: devGuessed.length - exam.guessable.length, guessRate: exam.guessRate };
}

function printReport(report: Report, exam?: Exam) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  console.log(`${report.mode} x${report.samples}: dev ${report.dev.correct}/${report.dev.total} (${pct(report.dev.score)}), test ${report.test.correct}/${report.test.total} (${pct(report.test.score)})`);
  if (report.mode === 'taught' && exam?.guessable) {
    console.log(`learning gain: ${report.hard.correct}/${report.hard.total} hard items taught (${pct(report.hard.score)}). Guess floor: ${pct(exam.guessRate ?? 0)} of dev items.`);
  }
  for (const [id, concept] of Object.entries(report.concepts)) {
    console.log(`  ${id}: ${concept.correct}/${concept.total}`);
    for (const miss of concept.failed) console.log(`    - [${miss.outcome}] ${miss.objective}`);
  }
}

async function main() {
  const command = positionals[0];
  if (command === 'gate') {
    const result = runQualityGate(loadCourse(need('course')));
    console.log(JSON.stringify({ passed: result.passed, score: result.score, failures: result.failures, warnings: result.warnings.map((w) => w.check) }));
    process.exit(result.passed ? 0 : 1);
  } else if (command === 'check') {
    const exam = loadExam(need('exam'));
    const errors = checkExam(exam, loadCourse(need('course')));
    const scored = scoredItems(exam);
    console.log(errors.length ? errors.join('\n') : `OK: ${exam.items.length} items (${scored.length} scored), ${scored.filter((i) => i.split === 'test').length} held-out test`);
    process.exit(errors.length ? 1 : 0);
  } else if (command === 'prepare') {
    const manifest = prepare();
    const batches = fs.readdirSync(need('out')).filter((f) => f.startsWith('batch-')).sort();
    console.log(`${manifest.packets.length} packets in ${need('out')}. One subagent per batch: ${batches.join(', ')}`);
  } else if (command === 'grade') {
    const dir = need('dir');
    printReport(grade(dir), loadExam(readJson<Manifest>(path.join(dir, 'manifest.json')).exam));
  } else if (command === 'run') {
    printReport(await run(), loadExam(need('exam')));
  } else if (command === 'calibrate') {
    console.log(JSON.stringify(calibrate()));
  } else if (command === 'decide') {
    console.log(JSON.stringify(decide(readJson(need('before')), readJson(need('after')), flags.target ?? '')));
  } else if (command === 'affected') {
    console.log(affectedConcepts(loadCourse(need('course')), flags.target ?? '').join(','));
  } else {
    console.error('commands: gate | check | prepare | grade | run | calibrate | decide | affected');
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

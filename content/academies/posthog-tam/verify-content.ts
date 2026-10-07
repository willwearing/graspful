/** Offline content contract and relational fixtures. Run: bun content/academies/posthog-tam/verify-content.ts */
import fs from 'node:fs';
import path from 'node:path';
import { Database } from 'bun:sqlite';
import { readYamlFile } from '../../../packages/client/src/yaml';
import { CourseYamlSchema, runQualityGate } from '../../../packages/shared/src/index';

const manifest: any = readYamlFile(path.join(import.meta.dir, 'academy.yaml')).raw;
const courses: any[] = manifest.courses.map((c: any) => readYamlFile(path.join(import.meta.dir, c.file)).raw);
const invariant = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const original = JSON.parse(fs.readFileSync(path.join(import.meta.dir, 'original-identities.json'), 'utf8'));
const inventory: any[] = [];
const scoped = (course: string, id: string) => id.includes(':') ? id : `${course}:${id}`;
const composed: any = { course: { id: 'posthog-tam-composed-audit', name: 'TAM composed content audit', estimatedHours: 14, version: '2026.3' }, sections: [], concepts: [] };
const ids = new Set<string>();
const stats: any[] = [];
for (const d of courses) {
  const validation = CourseYamlSchema.safeParse(d);
  invariant(validation.success, `${d.course.id}: schema validation failed`);
  const s = { course: d.course.id, concepts: d.concepts.length, knowledgePoints: 0, practice: 0, exam: 0, transferPractice: 0, exams: d.sections.length };
  for (const section of d.sections) {
    invariant(section.sectionExam?.enabled, `${section.id}: exam disabled`);
    const exam = section.sectionExam;
    invariant(exam.minTransferQuestions === exam.questionCount, `${section.id}: transfer quota`);
    const available = d.concepts.filter((c: any) => c.section === section.id).flatMap((c: any) => c.knowledgePoints.flatMap((k: any) => k.problems.filter((p: any) => p.purpose === 'exam')));
    invariant(available.length >= exam.questionCount * 2, `${section.id}: insufficient fresh retake pool`);
    for (const b of exam.blueprint) {
      const concept = d.concepts.find((c: any) => c.id === b.conceptId);
      const pool = concept.knowledgePoints.flatMap((k: any) => k.problems.filter((p: any) => p.purpose === 'exam'));
      invariant(pool.length >= b.minQuestions * 2, `${b.conceptId}: insufficient retake blueprint`);
    }
    composed.sections.push({ ...section, id: scoped(d.course.id, section.id), sectionExam: { ...exam, blueprint: exam.blueprint.map((b: any) => ({ ...b, conceptId: scoped(d.course.id, b.conceptId) })) } });
  }
  for (const c of d.concepts) {
    const n = structuredClone(c);
    n.id = scoped(d.course.id, c.id); n.section = scoped(d.course.id, c.section);
    n.prerequisites = c.prerequisites.map((p: string) => scoped(d.course.id, p));
    n.encompassing = c.encompassing.map((e: any) => ({ ...e, concept: scoped(d.course.id, e.concept) }));
    n.knowledgePoints = c.knowledgePoints.map((k: any) => ({ ...k, keyPrerequisite: scoped(d.course.id, k.keyPrerequisite) }));
    composed.concepts.push(n);
    for (const k of c.knowledgePoints) {
      s.knowledgePoints++;
      const practice = k.problems.filter((p: any) => p.purpose === 'practice');
      const exam = k.problems.filter((p: any) => p.purpose === 'exam');
      invariant(practice.length === 3 && exam.length === 2, `${c.id}/${k.id}: expected 3 practice + 2 exam`);
      invariant(!practice[0].isTransfer && !practice[1].isTransfer && practice[2].isTransfer, `${c.id}/${k.id}: missing final transfer`);
      invariant(exam.every((p: any) => p.isTransfer), `${c.id}/${k.id}: exam lacks transfer`);
      invariant(k.instruction && k.workedExample && k.keyPrerequisite, `${c.id}/${k.id}: incomplete staircase`);
      for (const p of k.problems) {
        invariant(!ids.has(p.id), `Duplicate problemID:${p.id}`); ids.add(p.id);
        const text = [k.instruction, k.workedExample, p.question, p.explanation, ...(p.options ?? [])].join('\n');
        const merged = text.match(/\b(?:and|Both|Neither|for|retain|until|same|after|before|over|from|with|count|counts|gives|cost|are|validated|At|returns|reaches|has|is|at|of|created|by|receives|gets)(?:[A-Z][a-zA-Z]*|[0-9][a-zA-Z0-9:]*)\b/g) ?? [];
        invariant(merged.length === 0, `${p.id}: merged prose words:${merged.join(',')}`);
        invariant(!text.includes('—'), `${p.id}: em dash`);
        inventory.push({ course: d.course.id, concept: c.id, kp: k.id, ...p });
        if (p.purpose === 'practice') { s.practice++; if (p.isTransfer) s.transferPractice++; } else if (p.purpose === 'exam') s.exam++;
      }
    }
  }
  stats.push(s);
}
for (const course of original.courses) {
  const actual = courses.find((d: any) => d.course.id === course.id);
  invariant(actual, `Removed course:${course.id}`);
  for (const section of course.sections) invariant(actual.sections.some((s: any) => s.id === section), `Removed section:${section}`);
  for (const c of course.concepts) {
    const a = actual.concepts.find((x: any) => x.id === c.id);
    invariant(a, `Removed concept:${c.id}`);
    for (const k of c.knowledgePoints) invariant(a.knowledgePoints.some((x: any) => x.id === k), `Removed KP:${c.id}/${k}`);
  }
}
for (const id of original.problems) invariant(ids.has(id), `Removed original problem:${id}`);
const conceptIds = new Set(composed.concepts.map((c: any) => c.id));
let checkedConceptReferences = 0;
for (const c of composed.concepts) {
  const references = [
    ...c.prerequisites.map((target: string) => ({ kind: 'prerequisite', target })),
    ...c.encompassing.map((e: any) => ({ kind: 'encompassing', target: e.concept })),
    ...c.knowledgePoints.map((k: any) => ({ kind: `key prerequisite for ${k.id}`, target: k.keyPrerequisite })),
  ];
  for (const { kind, target } of references) {
    invariant(conceptIds.has(target), `${c.id}: ${kind} must resolve to a concept: ${target}`);
    checkedConceptReferences++;
  }
}
const originalConcepts = new Set(original.courses.flatMap((d: any) => d.concepts.map((c: any) => scoped(d.id, c.id))));
const newConcepts = composed.concepts.filter((c: any) => !originalConcepts.has(c.id));
invariant(newConcepts.length === 9, 'New skills must remain nine independent frontier nodes');
const frontierAfterOriginalMastery = newConcepts.filter((c: any) => c.prerequisites.every((p: string) => originalConcepts.has(p))).map((c: any) => c.id);
invariant(frontierAfterOriginalMastery.length === 4, 'Expected four new entry skills after original mastery');
for (const c of newConcepts) invariant(!originalConcepts.has(c.id), `New node reused mastered identity:${c.id}`);
const gate = runQualityGate(composed);
invariant(gate.passed, `Composed graph quality gate:${JSON.stringify(gate.failures)}`);
const db = new Database(':memory:');
db.exec(`CREATE TABLE orders(id TEXT PRIMARY KEY, amount INTEGER); INSERT INTO orders VALUES ('A',20),('B',20); CREATE TABLE detail(order_id TEXT,tag TEXT); INSERT INTO detail VALUES ('A','x'),('A','y'),('B','z'); CREATE TABLE paying_accounts(account_id TEXT PRIMARY KEY); INSERT INTO paying_accounts VALUES ('A'),('B'),('C'); CREATE TABLE usage(account_id TEXT); INSERT INTO usage VALUES ('A'),('A'),('C'); CREATE TABLE times(timestamp TEXT); INSERT INTO times VALUES ('2026-10-01 00:00:00'),('2026-10-01 12:00:00'),('2026-10-02 00:00:00');`);
const first = (sql: string) => Object.values(db.query(sql).get() as object)[0];
const queries = [
  ['direct join duplicates order contribution', 'SELECT sum(o.amount) FROM orders o JOIN detail d ON o.id=d.order_id', 60],
  ['order-key repair preserves equal legitimate amounts', 'SELECT sum(o.amount) FROM orders o JOIN (SELECT order_id FROM detail GROUP BY order_id) d ON o.id=d.order_id', 40],
  ['numeric DISTINCT loses a legitimate equal-price order', 'SELECT sum(DISTINCT o.amount) FROM orders o JOIN detail d ON o.id=d.order_id', 20],
  ['half-open day excludes the next midnight', "SELECT count(*) FROM times WHERE timestamp >= '2026-10-01 00:00:00' AND timestamp < '2026-10-02 00:00:00'", 2],
] as const;
const fixtureResults = queries.map(([name, sql, expected]) => { const actual = first(sql); invariant(actual === expected, name); return { name, sql, expected, actual }; });
const rows = db.query('SELECT p.account_id, coalesce(u.n,0) AS n FROM paying_accounts p LEFT JOIN (SELECT account_id,count(*) AS n FROM usage GROUP BY account_id) u ON p.account_id=u.account_id ORDER BY p.account_id').all();
invariant(JSON.stringify(rows) === JSON.stringify([{ account_id: 'A', n: 2 }, { account_id: 'B', n: 0 }, { account_id: 'C', n: 1 }]), 'zero-usage population');
const cues = (selected: any[]) => {
 const items = selected.filter((p: any) => ['scenario', 'multiple_choice'].includes(p.type));
 const winners = (fn: typeof Math.max) => items.filter((p: any) => p.correct === p.options.map((x: string) => x.length).indexOf(fn(...p.options.map((x: string) => x.length)))).length;
 return { selectable: items.length, longestFirstTieCorrect: winners(Math.max), shortestFirstTieCorrect: winners(Math.min), positions: [0,1,2,3].map(i => items.filter(p => p.correct === i).length) };
};
const report = { date: '2026-10-07', stats, originalIdentitiesPreserved: original.problems.length, questionCount: inventory.length, checkedConceptReferences, newConceptIds: newConcepts.map((c: any) => c.id), newFrontierAfterOriginalMastery: frontierAfterOriginalMastery, newNodesHaveNoOriginalMasteryState: true, composedAcademyQualityGate: gate, cueBaselines: { practice: cues(inventory.filter(p => p.purpose === 'practice')), transferPractice: cues(inventory.filter(p => p.purpose === 'practice' && p.isTransfer)), exam: cues(inventory.filter(p => p.purpose === 'exam')) }, portableSqlFixtures: fixtureResults, zeroUsageRows: rows, limits: ['This offline fixture verifies relational results in SQLite; it does not prove every HogQL engine/type/identity behavior.', 'Mechanical 10/10 does not independently establish factual correctness or cognitive depth.', 'Parent separately verified the equal-price join in live HogQL and the actual passing-path selector.'] };
fs.writeFileSync(path.join(import.meta.dir, 'quality-verification.json'), JSON.stringify(report, null, 2)+'\n');
fs.writeFileSync('/tmp/tam-revised-question-inventory.json', JSON.stringify(inventory, null, 2));
console.log(JSON.stringify(report, null, 2));

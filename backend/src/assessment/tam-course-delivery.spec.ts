import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { CourseYamlSchema } from '@graspful/shared';
import { selectNextKPProblem } from './kp-remediation-selector';
import { GraphValidationService } from '../knowledge-graph/graph-validation.service';

const courseDirectory = path.resolve(__dirname, '../../../content/academies/posthog-tam/courses');
const files = fs.readdirSync(courseDirectory).filter((file) => file.endsWith('.yaml'));

describe('TAM academy delivery contract', () => {
  it('keeps new skills reachable after original mastery and resolves the full academy graph', () => {
    const courses = files.map((file) => CourseYamlSchema.parse(
      yaml.load(fs.readFileSync(path.join(courseDirectory, file), 'utf8')),
    ));
    const original = JSON.parse(fs.readFileSync(
      path.join(courseDirectory, '../original-identities.json'), 'utf8',
    )) as { courses: { id: string; concepts: { id: string }[] }[] };
    const qualified = (course: string, ref: string) => ref.includes(':') ? ref : `${course}:${ref}`;
    const mastered = new Set(original.courses.flatMap((course) =>
      course.concepts.map((concept) => qualified(course.id, concept.id)),
    ));
    const nodes = courses.flatMap((course) => course.concepts.map((concept) => ({
      ...concept, id: qualified(course.course.id, concept.id), courseSlug: course.course.id,
    })));
    const ids = new Set(nodes.map((node) => node.id));
    const prerequisites = nodes.flatMap((node) => node.prerequisites.map((ref) => ({
      source: node.id, target: qualified(node.courseSlug, ref),
    })));
    const encompassing = nodes.flatMap((node) => node.encompassing.map((edge) => ({
      source: node.id, target: qualified(node.courseSlug, edge.concept), weight: edge.weight,
    })));
    for (const edge of [...prerequisites, ...encompassing]) expect(ids.has(edge.target)).toBe(true);
    for (const node of nodes) for (const kp of node.knowledgePoints) {
      expect(ids.has(qualified(node.courseSlug, kp.keyPrerequisite ?? node.id))).toBe(true);
    }
    const graph = new GraphValidationService().validateAcademy(
      courses.map((course) => course.course.id), nodes, prerequisites, encompassing,
    );
    expect(graph.errors).toEqual([]);
    const added = nodes.filter((node) => !mastered.has(node.id));
    expect(added).toHaveLength(9);
    expect(added.every((node) => node.knowledgePoints.length === 1)).toBe(true);
    expect(added.filter((node) => node.prerequisites.every((ref) =>
      mastered.has(qualified(node.courseSlug, ref)),
    ))).toHaveLength(4);
  });

  it.each(files)('%s serves every applied practice question on a perfect first pass', (file) => {
    const course = CourseYamlSchema.parse(yaml.load(fs.readFileSync(path.join(courseDirectory, file), 'utf8')));
    for (const section of course.sections) {
      expect(section.sectionExam?.enabled).toBe(true);
      expect(section.sectionExam?.minTransferQuestions).toBe(section.sectionExam?.questionCount);
    }
    for (const concept of course.concepts) {
      const states = concept.knowledgePoints.map((kp, sortOrder) => ({
        knowledgePointId: kp.id, sortOrder, passed: false, consecutiveCorrect: 0, attempts: 0,
        requiresTransfer: kp.problems.some((p) => (!p.purpose || p.purpose === 'practice') && p.isTransfer),
      }));
      const bank = concept.knowledgePoints.flatMap((kp) => {
        const practice = kp.problems.filter((p) => !p.purpose || p.purpose === 'practice');
        const exams = kp.problems.filter((p) => p.purpose === 'exam');
        expect(practice.length).toBeGreaterThanOrEqual(3);
        expect(practice.at(-1)?.isTransfer).toBe(true);
        expect(exams.length).toBeGreaterThanOrEqual(2);
        expect(exams.every((p) => p.isTransfer)).toBe(true);
        return practice.map((p, sortOrder) => ({
          problemId: p.id, knowledgePointId: kp.id, sortOrder, isTransfer: Boolean(p.isTransfer),
        }));
      });
      const seen = new Set<string>();
      const applied = new Set<string>();
      let current = bank[0];
      let completed = false;
      for (let step = 0; current && step <= bank.length; step++) {
        seen.add(current.problemId);
        const state = states.find((s) => s.knowledgePointId === current.knowledgePointId)!;
        state.attempts++;
        state.consecutiveCorrect++;
        if (current.isTransfer) applied.add(state.knowledgePointId);
        state.passed = state.consecutiveCorrect >= 2 && applied.has(state.knowledgePointId);
        const hint = selectNextKPProblem({
          currentKPId: current.knowledgePointId, lastProblemId: current.problemId, lastAnswerCorrect: true,
          problemBank: bank, kpStates: states, seenProblemIdsThisSession: seen,
        });
        if (hint.lessonComplete) {
          completed = true;
          break;
        }
        current = bank.find((p) => p.problemId === hint.nextProblemId)!;
      }
      expect(completed).toBe(true);
      expect(states.every((s) => s.passed)).toBe(true);
      expect(seen.size).toBe(bank.length);
      expect(applied.size).toBe(concept.knowledgePoints.length);
    }
  });
});

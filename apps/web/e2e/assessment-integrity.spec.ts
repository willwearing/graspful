import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { getBrowserAccessToken, getSupabaseUserIdByEmail, signUpAsCreator } from "./helpers/auth";

const prisma = new PrismaClient();
const api = "http://localhost:3000/api/v1";
const organizations: string[] = [randomUUID(), randomUUID()];
const academies: string[] = [randomUUID(), randomUUID()];
const courses: string[] = [randomUUID(), randomUUID(), randomUUID()];
const sections: string[] = courses.map(() => randomUUID());
const concepts: string[] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const problems: string[][] = concepts.map(() => [randomUUID(), randomUUID(), randomUUID()]);
const draftCourseId = randomUUID();
const draftSectionId = randomUUID();
const draftConceptIds: string[] = [randomUUID(), randomUUID()];
const createdUsers: string[] = [];
type Actor = { userId: string; token: string };
let learner: Actor;
let otherLearner: Actor;
let member: Actor;

function requireLocalServices() {
  const local = ["localhost", "127.0.0.1", "[::1]"];
  for (const key of ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const) {
    const value = process.env[key];
    if (!value || !local.includes(new URL(value).hostname)) {
      throw new Error(`Assessment fixtures require a local ${key}; production writes are forbidden`);
    }
  }
  if (process.env.SUPABASE_URL && !local.includes(new URL(process.env.SUPABASE_URL).hostname)) {
    throw new Error("Assessment fixtures require a local backend SUPABASE_URL");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Assessment fixtures require the local Supabase service-role key");
  }
}

function courseUrl(courseId = courses[0], orgId = organizations[0]) {
  return `${api}/orgs/${orgId}/courses/${courseId}`;
}

function academyUrl(academyId = academies[0], orgId = organizations[0]) {
  return `${api}/orgs/${orgId}/academies/${academyId}`;
}

function reviewUrl(action: string, conceptId = concepts[0], courseId = courses[0], orgId = organizations[0]) {
  return `${courseUrl(courseId, orgId)}/reviews/${conceptId}/${action}`;
}

function post(request: APIRequestContext, url: string, actor?: Actor, data: object = {}) {
  return request.post(url, {
    headers: actor ? { Authorization: `Bearer ${actor.token}` } : {},
    data,
  });
}

async function json(response: APIResponse, status = 201) {
  expect(response.status(), await response.text()).toBe(status);
  return response.json();
}

async function snapshot(userId: string) {
  const [states, xp, attempts, academyEnrollments, courseEnrollments, sectionStates, kpStates] = await Promise.all([
    prisma.studentConceptState.findMany({
      where: { userId, conceptId: { in: [...concepts, ...draftConceptIds] } }, orderBy: { conceptId: "asc" },
    }),
    prisma.xPEvent.findMany({ where: { userId, courseId: { in: courses } }, orderBy: { id: "asc" } }),
    prisma.problemAttempt.findMany({
      where: { userId, problemId: { in: problems.flat() } }, orderBy: { id: "asc" },
    }),
    prisma.academyEnrollment.findMany({
      where: { userId, academyId: { in: academies } }, orderBy: { id: "asc" },
    }),
    prisma.courseEnrollment.findMany({
      where: { userId, courseId: { in: [...courses, draftCourseId] } }, orderBy: { id: "asc" },
    }),
    prisma.studentSectionState.findMany({
      where: { userId, sectionId: { in: [...sections, draftSectionId] } }, orderBy: { id: "asc" },
    }),
    prisma.studentKPState.findMany({
      where: { userId, knowledgePoint: { conceptId: { in: concepts } } }, orderBy: { id: "asc" },
    }),
  ]);
  return { states, xp, attempts, academyEnrollments, courseEnrollments, sectionStates, kpStates };
}

test.beforeAll(async ({ browser, request }) => {
  test.setTimeout(120_000);
  requireLocalServices();
  for (let index = 0; index < organizations.length; index++) {
    await prisma.organization.create({ data: {
      id: organizations[index], slug: `e2e-assessment-${organizations[index]}`,
      name: "Assessment integrity fixture", niche: "education",
      academies: { create: { id: academies[index], slug: "arithmetic", name: "Arithmetic" } },
    } });
  }
  for (let index = 0; index < courses.length; index++) {
    const orgIndex = index === 2 ? 1 : 0;
    await prisma.course.create({ data: {
      id: courses[index], orgId: organizations[orgIndex], academyId: academies[orgIndex],
      slug: `course-${index}`, name: `Arithmetic ${index}`, isPublished: true,
      sections: { create: { id: sections[index], slug: "addition", name: "Addition" } },
    } });
  }
  for (let index = 0; index < concepts.length; index++) {
    const courseIndex = Math.max(0, index - 1);
    await prisma.concept.create({ data: {
      id: concepts[index], orgId: organizations[courseIndex === 2 ? 1 : 0],
      courseId: courses[courseIndex], sectionId: sections[courseIndex],
      slug: `addition-${index}`, name: `Addition ${index}`,
      knowledgePoints: { create: {
        slug: `add-two-${index}`, instructionText: "Add two numbers to find their combined total.",
        workedExampleText: "Two apples and two apples make four apples.",
        problems: { create: problems[index].map((id, question) => ({
          id, authoredId: `addition-${index}-${question}`, type: "multiple_choice" as const,
          questionText: `What is ${question + 1} + 2?`, difficulty: question + 1,
          options: [String(question + 3), String(question + 4), "0", "99"],
          correctAnswer: 0, explanation: `Adding two gives ${question + 3}.`,
        })) },
      } },
    } });
  }

  const actors: Actor[] = [];
  for (let index = 0; index < 3; index++) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const email = await signUpAsCreator(page);
      const userId = await getSupabaseUserIdByEmail(email);
      createdUsers.push(userId);
      const token = await getBrowserAccessToken(page);
      expect(token).toBeTruthy();
      const actor = { userId, token: token! };
      actors.push(actor);
      await prisma.orgMembership.createMany({
        data: organizations.map((orgId) => ({ orgId, userId, role: "member" as const })),
      });
      if (index < 2) {
        for (let orgIndex = 0; orgIndex < organizations.length; orgIndex++) {
          await json(await post(request,
            `${api}/orgs/${organizations[orgIndex]}/academies/${academies[orgIndex]}/enroll`, actor));
        }
        await prisma.studentConceptState.updateMany({
          where: { userId, conceptId: { in: concepts } }, data: { masteryState: "in_progress" },
        });
        await prisma.studentConceptState.update({
          where: { userId_conceptId: { userId, conceptId: concepts[0] } },
          data: { masteryState: "needs_review" },
        });
      }
    } finally {
      await context.close();
    }
  }
  [learner, otherLearner, member] = actors;
  // A stale progress row must not grant access without an enrollment.
  await prisma.studentConceptState.create({
    data: { userId: member.userId, conceptId: concepts[0], masteryState: "in_progress" },
  });
  // The academy enrollment predates this draft. Keep one stale progress row
  // to prove both access checks and academy result filtering use publication.
  await prisma.course.create({ data: {
    id: draftCourseId, orgId: organizations[0], academyId: academies[0],
    slug: "draft-course", name: "Unpublished arithmetic", isPublished: false,
    sections: { create: { id: draftSectionId, slug: "draft", name: "Draft section" } },
  } });
  await prisma.concept.createMany({ data: draftConceptIds.map((id, index) => ({
    id, orgId: organizations[0], courseId: draftCourseId, sectionId: draftSectionId,
    slug: `draft-concept-${index}`, name: `Draft concept ${index}`,
  })) });
  await prisma.studentConceptState.create({
    data: { userId: learner.userId, conceptId: draftConceptIds[0], masteryState: "in_progress" },
  });
});

test.beforeEach(async () => {
  // Each test works alone and after Playwright replaces a failed worker.
  for (const actor of [learner, otherLearner]) {
    await prisma.studentConceptState.updateMany({
      where: { userId: actor.userId, conceptId: { in: concepts } },
      data: { masteryState: "in_progress", memory: 1, repNum: 0, speed: 1, interval: 1 },
    });
    await prisma.studentConceptState.update({
      where: { userId_conceptId: { userId: actor.userId, conceptId: concepts[0] } },
      data: { masteryState: "needs_review", memory: 0.3 },
    });
    await prisma.studentSectionState.updateMany({
      where: { userId: actor.userId, sectionId: { in: sections } },
      data: { status: "lesson_in_progress" },
    });
  }
});

test.afterAll(async () => {
  requireLocalServices();
  try {
    await prisma.organization.deleteMany({ where: { id: { in: organizations } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    for (const userId of createdUsers) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: "DELETE", headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
      });
      expect(response.ok, `Local test-user cleanup returned ${response.status}`).toBe(true);
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("anonymous callers cannot start, answer, or complete assessments", async ({ request }) => {
  const sessionId = randomUUID();
  const answer = { problemId: problems[0][0], answer: 0, responseTimeMs: 3000 };
  const endpoints: Array<[string, object]> = [
    [reviewUrl("start"), {}], [reviewUrl("answer"), { ...answer, sessionId }], [reviewUrl("complete"), { sessionId }],
    [`${courseUrl()}/quizzes/generate`, {}], [`${courseUrl()}/quizzes/${sessionId}/answer`, answer],
    [`${courseUrl()}/quizzes/${sessionId}/complete`, {}],
    [`${courseUrl()}/lessons/${concepts[0]}/answer`, answer],
  ];
  for (const [url, data] of endpoints) {
    await json(await post(request, url, undefined, data), 401);
  }
});

test("org membership and stale progress do not grant assessment enrollment", async ({ request }) => {
  const before = await snapshot(member.userId);
  expect(before.academyEnrollments).toHaveLength(0);
  expect(before.courseEnrollments).toHaveLength(0);
  const review = await json(await post(request, reviewUrl("start"), learner));
  const quiz = await json(await post(request, `${courseUrl()}/quizzes/generate`, learner));
  const answer = { problemId: review.currentProblem.id, answer: 0, responseTimeMs: 3000 };
  for (const [url, data] of [
    [reviewUrl("start"), {}], [reviewUrl("answer"), { ...answer, sessionId: review.sessionId }],
    [reviewUrl("complete"), { sessionId: review.sessionId }],
    [`${courseUrl()}/quizzes/generate`, {}], [`${courseUrl()}/quizzes/${quiz.quizId}/answer`, answer],
    [`${courseUrl()}/quizzes/${quiz.quizId}/complete`, {}],
    [`${courseUrl()}/lessons/${concepts[0]}/answer`, answer],
  ] as Array<[string, object]>) {
    await json(await post(request, url, member, data), 404);
  }
  expect(await snapshot(member.userId)).toEqual(before);
});

test("review sessions reject another learner and mismatched org, course, or concept routes", async ({ request }) => {
  const review = await json(await post(request, reviewUrl("start"), learner));
  const answer = { sessionId: review.sessionId, problemId: review.currentProblem.id, answer: 0, responseTimeMs: 3000 };
  const before = await snapshot(learner.userId);
  const otherBefore = await snapshot(otherLearner.userId);
  for (const route of [
    { actor: otherLearner, concept: concepts[0], course: courses[0], org: organizations[0] },
    { actor: learner, concept: concepts[1], course: courses[0], org: organizations[0] },
    { actor: learner, concept: concepts[2], course: courses[1], org: organizations[0] },
    { actor: learner, concept: concepts[3], course: courses[2], org: organizations[1] },
  ]) {
    await json(await post(request, reviewUrl("answer", route.concept, route.course, route.org), route.actor, answer), 404);
    await json(await post(request, reviewUrl("complete", route.concept, route.course, route.org), route.actor,
      { sessionId: review.sessionId }), 404);
  }
  await json(await post(request, reviewUrl("start", concepts[2]), learner), 404);
  await json(await post(request, reviewUrl("start", concepts[0], courses[0], organizations[1]), learner), 404);
  expect(await snapshot(learner.userId)).toEqual(before);
  expect(await snapshot(otherLearner.userId)).toEqual(otherBefore);
});

test("a review cannot bypass an unfinished lesson", async ({ request }) => {
  for (const masteryState of ["in_progress", "unstarted"] as const) {
    await prisma.studentConceptState.update({
      where: { userId_conceptId: { userId: learner.userId, conceptId: concepts[1] } },
      data: { masteryState },
    });
    const before = await snapshot(learner.userId);
    await json(await post(request, reviewUrl("start", concepts[1]), learner), 400);
    expect(await snapshot(learner.userId)).toEqual(before);
  }
  await prisma.studentConceptState.update({
    where: { userId_conceptId: { userId: learner.userId, conceptId: concepts[1] } },
    data: { masteryState: "in_progress" },
  });
});

test("review requires every assigned answer and applies completion only once", async ({ request }) => {
  const review = await json(await post(request, reviewUrl("start"), learner));
  expect(review.totalProblems).toBe(3);
  expect(review.currentProblem).not.toHaveProperty("correctAnswer");
  const completion = { sessionId: review.sessionId };
  const firstAnswer = { ...completion, problemId: review.currentProblem.id, answer: 0, responseTimeMs: 3000 };
  const before = await snapshot(learner.userId);
  await json(await post(request, reviewUrl("answer"), learner, { ...firstAnswer, problemId: problems[1][0] }), 404);
  await json(await post(request, reviewUrl("complete"), learner, completion), 400);
  expect(await snapshot(learner.userId)).toEqual(before);

  // A replay after a lost response returns the same result and writes once.
  const answers = await Promise.all([
    post(request, reviewUrl("answer"), learner, firstAnswer),
    post(request, reviewUrl("answer"), learner, firstAnswer),
  ]);
  const firstAnswerResult = await json(answers[0]);
  expect(await json(answers[1])).toEqual(firstAnswerResult);
  let result = firstAnswerResult;
  expect(result.correct).toBe(true);
  await json(await post(request, reviewUrl("complete"), learner, completion), 400);
  const partial = await snapshot(learner.userId);
  expect(partial.attempts).toHaveLength(before.attempts.length + 1);
  expect(partial.xp.reduce((sum, event) => sum + event.amount, 0)
    - before.xp.reduce((sum, event) => sum + event.amount, 0)).toBe(firstAnswerResult.xpAwarded);
  expect(partial.states.find((state) => state.conceptId === concepts[0])?.masteryState).toBe("needs_review");
  expect(await json(await post(request, reviewUrl("answer"), learner, firstAnswer))).toEqual(firstAnswerResult);
  await json(await post(request, reviewUrl("answer"), learner, { ...firstAnswer, answer: 1 }), 400);
  expect(await snapshot(learner.userId)).toEqual(partial);
  while (result.hasMore) {
    expect(result.nextProblem).not.toHaveProperty("correctAnswer");
    result = await json(await post(request, reviewUrl("answer"), learner, {
      ...firstAnswer, problemId: result.nextProblem.id,
    }));
  }
  const completed = await Promise.all([
    post(request, reviewUrl("complete"), learner, completion),
    post(request, reviewUrl("complete"), learner, completion),
  ]);
  const firstResult = await json(completed[0]);
  expect(await json(completed[1])).toEqual(firstResult);
  expect(firstResult).toMatchObject({ passed: true, score: 1, correctCount: 3, totalCount: 3, updatedMasteryState: "mastered" });
  const after = await snapshot(learner.userId);
  expect(after.attempts).toHaveLength(before.attempts.length + 3);
  const state = after.states.find((row) => row.conceptId === concepts[0])!;
  expect(state.masteryState).toBe("mastered");
  expect(state.memory).toBeGreaterThan(before.states.find((row) => row.conceptId === concepts[0])!.memory);
  expect(state.repNum).toBeGreaterThan(before.states.find((row) => row.conceptId === concepts[0])!.repNum);
  expect(await json(await post(request, reviewUrl("complete"), learner, completion))).toEqual(firstResult);
  await json(await post(request, reviewUrl("answer"), learner, { ...firstAnswer, answer: 1 }), 400);
  expect(await snapshot(learner.userId)).toEqual(after);
});

test("quizzes enforce ownership, route scope, unique answers, and stable completion", async ({ request }) => {
  await prisma.studentConceptState.updateMany({
    where: { userId: learner.userId, conceptId: { in: concepts.slice(0, 2) } },
    data: { masteryState: "in_progress" },
  });
  const quiz = await json(await post(request, `${courseUrl()}/quizzes/generate`, learner));
  expect(quiz.totalProblems).toBe(2);
  const answer = { problemId: quiz.problems[0].id, answer: 0, responseTimeMs: 3000 };
  const before = await snapshot(learner.userId);
  const otherBefore = await snapshot(otherLearner.userId);
  for (const route of [
    { actor: otherLearner, base: courseUrl() },
    { actor: learner, base: courseUrl(courses[1]) },
    { actor: learner, base: courseUrl(courses[2], organizations[1]) },
  ]) {
    await json(await post(request, `${route.base}/quizzes/${quiz.quizId}/answer`, route.actor, answer), 404);
    await json(await post(request, `${route.base}/quizzes/${quiz.quizId}/complete`, route.actor), 404);
  }
  const quizUrl = `${courseUrl()}/quizzes/${quiz.quizId}`;
  await json(await post(request, `${quizUrl}/answer`, learner, { ...answer, problemId: problems[2][0] }), 404);
  await json(await post(request, `${quizUrl}/complete`, learner), 400);
  expect(await snapshot(learner.userId)).toEqual(before);
  expect(await snapshot(otherLearner.userId)).toEqual(otherBefore);
  const answers = await Promise.all([
    post(request, `${quizUrl}/answer`, learner, answer),
    post(request, `${quizUrl}/answer`, learner, answer),
  ]);
  const firstAnswerResult = await json(answers[0]);
  expect(await json(answers[1])).toEqual(firstAnswerResult);
  const partial = await snapshot(learner.userId);
  expect(partial.attempts).toHaveLength(before.attempts.length + 1);
  expect(partial.xp).toEqual(before.xp);
  expect(await json(await post(request, `${quizUrl}/answer`, learner, answer))).toEqual(firstAnswerResult);
  await json(await post(request, `${quizUrl}/answer`, learner, { ...answer, answer: 1 }), 400);
  await json(await post(request, `${quizUrl}/complete`, learner), 400);
  expect(await snapshot(learner.userId)).toEqual(partial);
  for (const problem of quiz.problems.slice(1)) {
    expect(problem).not.toHaveProperty("correctAnswer");
    await json(await post(request, `${quizUrl}/answer`, learner, { ...answer, problemId: problem.id }));
  }
  const completed = await Promise.all([
    post(request, `${quizUrl}/complete`, learner), post(request, `${quizUrl}/complete`, learner),
  ]);
  const result = await json(completed[0]);
  expect(await json(completed[1])).toEqual(result);
  expect(result).toMatchObject({ score: 1, correctCount: 2, totalCount: 2, failedConcepts: [] });
  const after = await snapshot(learner.userId);
  expect(after.attempts).toHaveLength(before.attempts.length + 2);
  expect(after.xp.filter((event) => event.source === "quiz")).toHaveLength(
    before.xp.filter((event) => event.source === "quiz").length + 1,
  );
  expect(await json(await post(request, `${quizUrl}/complete`, learner))).toEqual(result);
  await json(await post(request, `${quizUrl}/answer`, learner, { ...answer, answer: 1 }), 400);
  expect(await snapshot(learner.userId)).toEqual(after);
});

test("lesson answers validate org, course, concept, and problem before writing progress", async ({ request }) => {
  const answer = { problemId: problems[1][0], answer: 0, responseTimeMs: 3000 };
  const before = await snapshot(otherLearner.userId);
  for (const [base, conceptId] of [
    [courseUrl(), concepts[0]],
    [courseUrl(courses[1]), concepts[1]],
    [courseUrl(courses[0], organizations[1]), concepts[1]],
  ]) {
    await json(await post(request, `${base}/lessons/${conceptId}/answer`, otherLearner, answer), 404);
  }
  expect(await snapshot(otherLearner.userId)).toEqual(before);
  const result = await json(await post(request,
    `${courseUrl()}/lessons/${concepts[1]}/answer`, otherLearner, answer));
  expect(result.correct).toBe(true);
  expect((await snapshot(otherLearner.userId)).attempts).toHaveLength(before.attempts.length + 1);
});

test("learner reads validate enrollment and org scope before creating progress", async ({ request }) => {
  const routes = [
    ...["mastery", "sections", "profile", "next-task", "session"].map((path) => ({
      entitled: `${courseUrl()}/${path}`,
      mismatched: `${courseUrl(courses[2], organizations[0])}/${path}`,
    })),
    ...["mastery", "course-mastery", "profile", "next-task", "study-session"].map((path) => ({
      entitled: `${academyUrl()}/${path}`,
      mismatched: `${academyUrl(academies[1], organizations[0])}/${path}`,
    })),
  ];
  const memberBefore = await snapshot(member.userId);
  const learnerBefore = await snapshot(learner.userId);
  expect(memberBefore.sectionStates).toHaveLength(0);
  for (const route of routes) {
    await json(await request.get(route.entitled), 401);
    await json(await request.get(route.entitled, {
      headers: { Authorization: `Bearer ${member.token}` },
    }), 404);
    await json(await request.get(route.mismatched, {
      headers: { Authorization: `Bearer ${learner.token}` },
    }), 404);
  }
  // Some reads hydrate progress rows or apply memory decay. Denied reads must
  // leave all concept and section rows, timestamps, and enrollments untouched.
  expect(await snapshot(member.userId)).toEqual(memberBefore);
  expect(await snapshot(learner.userId)).toEqual(learnerBefore);
  for (const route of routes) {
    await json(await request.get(route.entitled, {
      headers: { Authorization: `Bearer ${learner.token}` },
    }), 200);
  }
});

test("lesson lifecycle rejects mismatched scopes without recording practice", async ({ request }) => {
  const before = await snapshot(otherLearner.userId);
  const memberBefore = await snapshot(member.userId);
  for (const action of ["start", "complete"]) {
    await json(await post(request, `${courseUrl()}/lessons/${concepts[0]}/${action}`), 401);
    await json(await post(request, `${courseUrl()}/lessons/${concepts[0]}/${action}`, member), 404);
    for (const [base, conceptId] of [
      [courseUrl(courses[1]), concepts[1]],
      [courseUrl(), concepts[2]],
      [courseUrl(courses[2], organizations[0]), concepts[3]],
    ]) {
      await json(await post(request, `${base}/lessons/${conceptId}/${action}`, otherLearner), 404);
    }
  }
  expect(await snapshot(otherLearner.userId)).toEqual(before);
  expect(await snapshot(member.userId)).toEqual(memberBefore);
  const lesson = `${courseUrl()}/lessons/${concepts[1]}`;
  expect(await json(await post(request, `${lesson}/start`, otherLearner))).toMatchObject({
    conceptId: concepts[1],
  });
  expect(await json(await post(request, `${lesson}/complete`, otherLearner))).toEqual({
    conceptId: concepts[1], status: "lesson_complete",
  });
  const after = await snapshot(otherLearner.userId);
  expect(after.states.find((state) => state.conceptId === concepts[1])?.lastPracticedAt).not.toBeNull();
});

test("academy enrollment cannot expose draft course content or stale draft progress", async ({ request }) => {
  const before = await snapshot(learner.userId);
  expect(before.academyEnrollments.some((enrollment) => enrollment.academyId === academies[0])).toBe(true);
  const staleDraft = before.states.filter((state) => draftConceptIds.includes(state.conceptId));
  expect(staleDraft).toHaveLength(1);
  expect(staleDraft[0].conceptId).toBe(draftConceptIds[0]);
  const headers = { Authorization: `Bearer ${learner.token}` };
  const draftUrl = courseUrl(draftCourseId);
  for (const path of ["mastery", "sections", "profile", "next-task", "session"]) {
    await json(await request.get(`${draftUrl}/${path}`, { headers }), 404);
  }
  for (const conceptId of draftConceptIds) {
    for (const action of ["start", "complete"]) {
      await json(await post(request, `${draftUrl}/lessons/${conceptId}/${action}`, learner), 404);
    }
  }
  expect(await snapshot(learner.userId)).toEqual(before);

  const mastery = await json(await request.get(`${academyUrl()}/mastery`, { headers }), 200);
  expect(mastery.map((state: { conceptId: string }) => state.conceptId).sort()).toEqual(concepts.slice(0, 3).sort());
  const courseMastery = await json(await request.get(`${academyUrl()}/course-mastery`, { headers }), 200);
  expect(courseMastery.map((course: { courseId: string }) => course.courseId).sort()).toEqual(courses.slice(0, 2).sort());
  const profile = await json(await request.get(`${academyUrl()}/profile`, { headers }), 200);
  expect(profile.totalConcepts).toBe(3);
  const after = await snapshot(learner.userId);
  expect(after.states.filter((state) => draftConceptIds.includes(state.conceptId))).toEqual(staleDraft);
  expect(after.sectionStates.filter((state) => state.sectionId === draftSectionId)).toHaveLength(0);
  expect(after.courseEnrollments.filter((enrollment) => enrollment.courseId === draftCourseId)).toHaveLength(0);
});

test("lesson answer retries preserve one attempt, one KP update, and one XP award", async ({ request }) => {
  const lessonUrl = `${courseUrl(courses[1])}/lessons/${concepts[2]}/answer`;
  const problem = await prisma.problem.findUniqueOrThrow({ where: { id: problems[2][0] } });
  const answer = { requestId: randomUUID(), problemId: problem.id, answer: 0, responseTimeMs: 3000 };
  const before = await snapshot(otherLearner.userId);
  const priorKPAttempts = before.kpStates.find((state) => state.knowledgePointId === problem.knowledgePointId)?.attempts ?? 0;
  const responses = await Promise.all([
    post(request, lessonUrl, otherLearner, answer),
    post(request, lessonUrl, otherLearner, answer),
  ]);
  const result = await json(responses[0]);
  expect(await json(responses[1])).toEqual(result);
  expect(result.correct).toBe(true);
  expect(result.xpAwarded).toBeGreaterThan(0);
  const after = await snapshot(otherLearner.userId);
  expect(after.attempts).toHaveLength(before.attempts.length + 1);
  expect(after.kpStates.find((state) => state.knowledgePointId === problem.knowledgePointId)?.attempts).toBe(priorKPAttempts + 1);
  expect(after.xp).toHaveLength(before.xp.length + 1);
  expect(after.xp.reduce((sum, event) => sum + event.amount, 0)
    - before.xp.reduce((sum, event) => sum + event.amount, 0)).toBe(result.xpAwarded);
  const newAttempt = after.attempts.find((attempt) => !before.attempts.some((prior) => prior.id === attempt.id));
  expect(newAttempt?.submissionReceipt).toMatchObject({ version: 1, result });

  expect(await json(await post(request, lessonUrl, otherLearner, answer))).toEqual(result);
  await json(await post(request, lessonUrl, otherLearner, { ...answer, answer: 1 }), 409);
  expect(await snapshot(otherLearner.userId)).toEqual(after);

  const nextResult = await json(await post(request, lessonUrl, otherLearner, { ...answer, requestId: randomUUID() }));
  expect(nextResult.correct).toBe(true);
  const intentionalRetry = await snapshot(otherLearner.userId);
  expect(intentionalRetry.attempts).toHaveLength(after.attempts.length + 1);
  expect(intentionalRetry.kpStates.find((state) => state.knowledgePointId === problem.knowledgePointId)?.attempts).toBe(priorKPAttempts + 2);
});

test("section exams enforce session scope and award completion once", async ({ request }) => {
  await prisma.courseSection.update({
    where: { id: sections[0] },
    data: { sectionExamConfig: {
      enabled: true, questionCount: 2, passingScore: 0.75, timeLimitMinutes: 12,
      blueprint: concepts.slice(0, 2).map((conceptId) => ({ conceptId, minQuestions: 1 })),
    } },
  });
  await prisma.studentConceptState.updateMany({
    where: { userId: learner.userId, conceptId: { in: concepts.slice(0, 2) } },
    data: { masteryState: "mastered" },
  });
  await prisma.studentSectionState.update({
    where: { userId_sectionId: { userId: learner.userId, sectionId: sections[0] } },
    data: { status: "exam_ready" },
  });
  const base = `${courseUrl()}/sections/${sections[0]}/exam`;
  await json(await post(request, `${base}/start`), 401);
  await json(await post(request, `${base}/start`, member), 404);
  await json(await request.get(`${base}/status`), 401);
  await json(await request.get(`${base}/status`, { headers: { Authorization: `Bearer ${member.token}` } }), 404);
  const exam = await json(await post(request, `${base}/start`, learner));
  expect(exam.totalProblems).toBe(2);
  expect(await json(await request.get(`${base}/status`, {
    headers: { Authorization: `Bearer ${learner.token}` },
  }), 200)).toMatchObject({ activeSession: { sessionId: exam.sessionId, totalProblems: 2, answeredCount: 0 } });
  const sessionUrl = `${base}/${exam.sessionId}`;
  const answer = { problemId: exam.problems[0].id, answer: 0, responseTimeMs: 3000 };
  const before = await snapshot(learner.userId);
  const otherBefore = await snapshot(otherLearner.userId);
  const readSession = () => prisma.sectionExamSession.findUniqueOrThrow({
    where: { id: exam.sessionId }, include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  const sessionBefore = await readSession();
  await json(await post(request, `${sessionUrl}/answer`, undefined, answer), 401);
  await json(await post(request, `${sessionUrl}/complete`), 401);
  for (const route of [
    { actor: member, base },
    { actor: otherLearner, base },
    { actor: learner, base: `${courseUrl(courses[1])}/sections/${sections[1]}/exam` },
    { actor: learner, base: `${courseUrl(courses[2], organizations[1])}/sections/${sections[2]}/exam` },
  ]) {
    await json(await post(request, `${route.base}/${exam.sessionId}/answer`, route.actor, answer), 404);
    await json(await post(request, `${route.base}/${exam.sessionId}/complete`, route.actor), 404);
  }
  await json(await post(request, `${sessionUrl}/answer`, learner, { ...answer, problemId: problems[2][0] }), 404);
  await json(await post(request, `${sessionUrl}/complete`, learner), 400);
  expect(await snapshot(learner.userId)).toEqual(before);
  expect(await snapshot(otherLearner.userId)).toEqual(otherBefore);
  expect(await readSession()).toEqual(sessionBefore);

  const answers = await Promise.all([
    post(request, `${sessionUrl}/answer`, learner, answer),
    post(request, `${sessionUrl}/answer`, learner, answer),
  ]);
  const firstAnswerResult = await json(answers[0]);
  expect(firstAnswerResult).toEqual({ answeredCount: 1, totalProblems: 2 });
  expect(await json(answers[1])).toEqual(firstAnswerResult);
  const partial = await snapshot(learner.userId);
  expect(partial.attempts).toHaveLength(before.attempts.length + 1);
  expect(partial.xp).toEqual(before.xp);
  expect(await json(await post(request, `${sessionUrl}/answer`, learner, answer))).toEqual(firstAnswerResult);
  await json(await post(request, `${sessionUrl}/answer`, learner, { ...answer, answer: 1 }), 400);
  await json(await post(request, `${sessionUrl}/complete`, learner), 400);
  expect(await snapshot(learner.userId)).toEqual(partial);
  for (const problem of exam.problems.slice(1)) {
    expect(problem).not.toHaveProperty("correctAnswer");
    await json(await post(request, `${sessionUrl}/answer`, learner, { ...answer, problemId: problem.id }));
  }
  const completions = await Promise.all([
    post(request, `${sessionUrl}/complete`, learner), post(request, `${sessionUrl}/complete`, learner),
  ]);
  const firstCompletion = await json(completions[0]);
  const secondCompletion = await json(completions[1]);
  const { alreadyCompleted: firstRepeated, ...result } = firstCompletion;
  const { alreadyCompleted: secondRepeated, ...secondResult } = secondCompletion;
  expect([firstRepeated, secondRepeated].sort()).toEqual([false, true]);
  expect(secondResult).toEqual(result);
  expect(result).toMatchObject({ passed: true, score: 1, correctCount: 2, totalCount: 2, failedConcepts: [] });
  const after = await snapshot(learner.userId);
  const completedSession = await readSession();
  expect(after.attempts).toHaveLength(before.attempts.length + 2);
  expect(after.xp).toHaveLength(before.xp.length + 1);
  expect(after.xp.reduce((sum, event) => sum + event.amount, 0)
    - before.xp.reduce((sum, event) => sum + event.amount, 0)).toBe(result.xpAwarded);
  expect(after.sectionStates.find((state) => state.sectionId === sections[0])?.status).toBe("certified");
  expect(await json(await post(request, `${sessionUrl}/complete`, learner))).toEqual({ ...result, alreadyCompleted: true });
  expect(await snapshot(learner.userId)).toEqual(after);
  expect(await readSession()).toEqual(completedSession);
});

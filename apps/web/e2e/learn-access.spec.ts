import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import {
  getBrowserAccessToken,
  getSupabaseUserIdByEmail,
  signUpAsCreator,
} from "./helpers/auth";

const prisma = new PrismaClient();
const orgId = randomUUID();
const orgSlug = `e2e-learn-access-${orgId}`;
const academyId = randomUUID();
const academySlug = "test-academy";
const courseId = randomUUID();
const courseSlug = "test-course";
const conceptId = randomUUID();
const draftCourseId = randomUUID();
const draftCourseSlug = "unpublished-course";
const draftConceptId = randomUUID();
const draftInstruction = "This draft instruction must remain private until publication.";
const hubHref = `/learn/${orgSlug}`;
const lessonHref = `${hubHref}/courses/${courseSlug}/study/lesson/${conceptId}`;
const studyRoutes = [
  { scope: "course", href: `${hubHref}/courses/${courseSlug}/study` },
  { scope: "academy", href: `${hubHref}/academies/${academySlug}/study` },
];

function requireLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(databaseUrl).hostname)) {
    throw new Error("Learner access fixtures require a local DATABASE_URL");
  }
}

async function grantLearnerMembership(email: string) {
  const userId = await getSupabaseUserIdByEmail(email);
  await prisma.orgMembership.create({ data: { orgId, userId, role: "member" } });
  return userId;
}

async function enrollLearner(page: Page) {
  const token = await getBrowserAccessToken(page);
  expect(token).toBeTruthy();
  const response = await page.request.post(
    `http://localhost:3000/api/v1/orgs/${orgSlug}/academies/${academyId}/enroll`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(response.ok(), await response.text()).toBe(true);
}

async function expectLearnerShell(page: Page) {
  await expect(page.getByRole("link", { name: "Learning Hub", exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("complementary").getByRole("button", { name: /log out/i })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("button", { name: /log out/i })).toBeVisible();
}

test.beforeAll(async () => {
  requireLocalDatabase();
  await prisma.organization.create({
    data: {
      id: orgId,
      slug: orgSlug,
      name: "Learner access test organization",
      niche: "education",
      academies: {
        create: {
          id: academyId,
          slug: academySlug,
          name: "Learner access test academy",
          courses: {
            create: {
              id: courseId,
              orgId,
              slug: courseSlug,
              name: "Learner access test course",
              isPublished: true,
              concepts: {
                create: {
                  id: conceptId,
                  orgId,
                  slug: "addition",
                  name: "Adding two numbers",
                  knowledgePoints: {
                    create: {
                      slug: "add-two",
                      instructionText: "Add two numbers by counting their combined total.",
                      workedExampleText: "Two apples plus two apples makes four apples.",
                      problems: {
                        create: {
                          authoredId: "addition-question",
                          type: "multiple_choice",
                          questionText: "What is 2 + 2?",
                          options: ["4", "3", "5", "6"],
                          correctAnswer: 0,
                          explanation: "Two plus two equals four.",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  await prisma.course.create({
    data: {
      id: draftCourseId,
      orgId,
      academyId,
      slug: draftCourseSlug,
      name: "Unpublished test course",
      isPublished: false,
      sortOrder: -1,
      concepts: {
        create: {
          id: draftConceptId,
          orgId,
          slug: "unpublished-concept",
          name: "Unpublished test concept",
          difficulty: 1,
          knowledgePoints: {
            create: {
              slug: "unpublished-instruction",
              instructionText: draftInstruction,
              workedExampleText: "Draft material is available to its author before publication.",
              problems: {
                create: {
                  authoredId: "unpublished-question",
                  type: "multiple_choice",
                  questionText: "Who can preview draft material?",
                  options: ["Its author", "Every learner", "Anonymous visitors", "Nobody"],
                  correctAnswer: 0,
                },
              },
            },
          },
        },
      },
    },
  });
});

test.afterAll(async () => {
  requireLocalDatabase();
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.$disconnect();
});

test.describe("Platform learner access", () => {
  test("an unentitled user cannot open the learning hub or acquire membership", async ({ page }) => {
    const email = await signUpAsCreator(page);
    const userId = await getSupabaseUserIdByEmail(email);

    await page.goto(hubHref);
    await expect(page.getByText(/could not be found/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Learning Hub")).toHaveCount(0);
    expect(await prisma.orgMembership.count({ where: { orgId, userId } })).toBe(0);
  });

  test("an entitled learner sees authenticated chrome and academy content", async ({ page }) => {
    const email = await signUpAsCreator(page);
    await grantLearnerMembership(email);

    await page.goto(hubHref);
    await expectLearnerShell(page);
    await expect(page.getByRole("heading", { name: "Learning Hub" })).toBeVisible();
    await expect(page.getByText("Learner access test academy", { exact: true })).toBeVisible();
  });

  test("an enrolled member can access published courses while drafts stay private", async ({ page }) => {
    const email = await signUpAsCreator(page);
    const userId = await grantLearnerMembership(email);
    await enrollLearner(page);
    const token = await getBrowserAccessToken(page);
    expect(token).toBeTruthy();
    const headers = { Authorization: `Bearer ${token}` };
    const basePath = `http://localhost:3000/api/v1/orgs/${orgSlug}`;

    const publishedCourse = await page.request.get(`${basePath}/courses/slug/${courseSlug}`, { headers });
    expect(publishedCourse.status()).toBe(200);
    expect(await publishedCourse.json()).toMatchObject({ id: courseId });

    for (const path of [
      `/courses/slug/${draftCourseSlug}`,
      `/courses/${draftCourseId}/graph`,
    ]) {
      const response = await page.request.get(`${basePath}${path}`, { headers });
      expect(response.status(), `Draft read ${path}: ${await response.text()}`).toBe(404);
    }

    const yaml = await page.request.get(`${basePath}/courses/${draftCourseId}/yaml`, { headers });
    expect(yaml.status()).toBe(403);

    const enrollment = await page.request.post(`${basePath}/courses/${draftCourseId}/enroll`, { headers });
    expect(enrollment.status(), await enrollment.text()).toBe(404);

    const academyCourses = await page.request.get(`${basePath}/academies/${academyId}/courses`, { headers });
    expect(academyCourses.status()).toBe(200);
    const listedCourses = await academyCourses.json() as Array<{ id: string }>;
    expect(listedCourses.map((course) => course.id)).toEqual([courseId]);
    expect(await prisma.courseEnrollment.count({ where: { courseId: draftCourseId, userId } })).toBe(0);
    expect(await prisma.studentConceptState.count({ where: { conceptId: draftConceptId, userId } })).toBe(0);

    await page.goto(`${hubHref}/courses/${draftCourseSlug}/study`);
    await expect(page.getByText(/could not be found/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(draftInstruction, { exact: true })).toHaveCount(0);
    await expect(page.getByText("Unpublished test concept", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Knowledge Point 1 of 1", { exact: true })).toHaveCount(0);
  });

  for (const route of studyRoutes) {
    test(`anonymous ${route.scope} study access goes to sign-in without learner chrome`, async ({ page }) => {
      await page.goto(route.href);
      await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
      await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Learning Hub", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /log out/i })).toHaveCount(0);
    });

    test(`unentitled ${route.scope} study access is denied without enrollment or learner chrome`, async ({ page }) => {
      const email = await signUpAsCreator(page);
      const userId = await getSupabaseUserIdByEmail(email);

      await page.goto(route.href);
      await expect(page.getByText(/could not be found/i)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("link", { name: "Learning Hub", exact: true })).toHaveCount(0);
      await expect(page.getByText("Adding two numbers", { exact: true })).toHaveCount(0);
      expect(await prisma.orgMembership.count({ where: { orgId, userId } })).toBe(0);
      expect(await prisma.academyEnrollment.count({ where: { academyId, userId } })).toBe(0);
    });

    test(`entitled ${route.scope} study access dispatches to a real lesson with learner chrome`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const email = await signUpAsCreator(page);
      await grantLearnerMembership(email);
      await enrollLearner(page);

      await page.goto(route.href);
      // A successful server response alone misses functions passed across the
      // server/client boundary. The browser must execute StudyRouter and render the lesson.
      await expect(page).toHaveURL(lessonHref, { timeout: 15_000 });
      await expectLearnerShell(page);
      await expect(page.getByText("Knowledge Point 1 of 1", { exact: true })).toBeVisible();
      await expect(page.getByText("Add two numbers by counting their combined total.")).toBeVisible();
      await expect(page.getByText("Lesson Unavailable", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Session Complete", { exact: true })).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    });
  }
});

import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { getE2eEnvironment } from "../../../backend/scripts/e2e-env";

// Validate every service URL before constructing fixtures that write to the database.
const env = getE2eEnvironment(process.env);
const prisma = new PrismaClient();
const api = env.NEXT_PUBLIC_BACKEND_URL;
const password = "SecurityTestPassword123!";
const prefix = `security-${randomUUID()}`;
const fixtureOrgs: string[] = [];
const users: Array<{ id: string; token: string }> = [];

type Tenant = { id: string; slug: string; academyId: string; courseId: string };
let orgA: Tenant;
let orgB: Tenant;
let owner: { id: string; token: string };
let learner: { id: string; token: string };
let unenrolled: { id: string; token: string };
let courseOnlyLearner: { id: string; token: string };
let outsider: { id: string; token: string };
let provisionUser: { id: string; token: string };
let orgAKey: string;

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function register(request: APIRequestContext, label: string) {
  const email = `${label.slice(0, 20)}-${randomUUID()}@test.example.com`;
  const response = await request.post(`${api}/auth/register`, { data: { email, password } });
  expect(response.status(), await response.text()).toBe(201);
  const registration = await response.json() as { userId: string; orgSlug: string };
  fixtureOrgs.push(registration.orgSlug);
  // Track cleanup before requesting a token so a failed sign-in cannot leave a user behind.
  const user = { id: registration.userId, token: "" };
  users.push(user);
  const signIn = await request.post(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    data: { email, password },
  });
  expect(signIn.status()).toBe(200);
  const session = await signIn.json() as { access_token: string };
  user.token = session.access_token;
  expect(user.token).toBeTruthy();
  return user;
}

async function createTenant(label: string): Promise<Tenant> {
  const id = randomUUID();
  const academyId = randomUUID();
  const courseId = randomUUID();
  const slug = `${prefix}-${label}`;
  fixtureOrgs.push(slug);
  await prisma.organization.create({
    data: {
      id, slug, name: `Security fixture ${label}`, niche: "education",
      academies: {
        create: {
          id: academyId, slug: "academy", name: `Private academy ${label}`,
          courses: {
            create: {
              id: courseId, orgId: id, slug: "course", name: `Private course ${label}`, isPublished: true,
              concepts: { create: {
                orgId: id, slug: "addition", name: "Addition",
                knowledgePoints: { create: {
                  slug: "add", instructionText: "Add two numbers.", workedExampleText: "Two plus two equals four.",
                  problems: { create: {
                    authoredId: "add-question", type: "multiple_choice", questionText: "What is two plus two?",
                    options: ["4", "3", "5", "6"], correctAnswer: 0,
                  } },
                } },
              } },
            },
          },
        },
      },
    },
  });
  return { id, slug, academyId, courseId };
}

function brandData(org: Tenant, domain: string, slug = `${prefix}-candidate`) {
  return { slug, name: "Security brand", domain, tagline: "Security test", orgSlug: org.slug, theme: {}, landing: {}, seo: {} };
}

test.beforeAll(async ({ request }) => {
  orgA = await createTenant("a");
  orgB = await createTenant("b");
  owner = await register(request, "owner");
  learner = await register(request, "learner");
  unenrolled = await register(request, "unenrolled");
  courseOnlyLearner = await register(request, "course-only");
  outsider = await register(request, "outsider");
  provisionUser = await register(request, "provision");

  await prisma.orgMembership.createMany({ data: [
    { orgId: orgA.id, userId: owner.id, role: "owner" },
    { orgId: orgB.id, userId: owner.id, role: "owner" },
    { orgId: orgA.id, userId: learner.id, role: "member" },
    { orgId: orgA.id, userId: unenrolled.id, role: "member" },
    { orgId: orgA.id, userId: courseOnlyLearner.id, role: "member" },
  ] });
  await prisma.academyEnrollment.create({ data: { academyId: orgA.academyId, userId: learner.id } });
  await prisma.courseEnrollment.create({ data: { courseId: orgA.courseId, userId: courseOnlyLearner.id } });
  await prisma.brand.create({ data: { ...brandData(orgB, `${prefix}.example.com`, `${prefix}-existing`), logoUrl: "/icon.svg" } });

  const key = await request.post(`${api}/orgs/${orgA.slug}/api-keys`, {
    headers: headers(owner.token), data: { name: "Security org A key" },
  });
  expect(key.status(), await key.text()).toBe(201);
  orgAKey = (await key.json() as { key: string }).key;
  expect(orgAKey).toMatch(/^gsk_/);
});

for (const scope of ["academy", "course"] as const) {
  test.describe(`Security: ${scope} diagnostic session scope`, () => {
    function path(tenant: Tenant, resource: Tenant = tenant) {
      const segment = scope === "academy" ? `academies/${resource.academyId}` : `courses/${resource.courseId}`;
      return `${api}/orgs/${tenant.slug}/${segment}/diagnostic`;
    }

    async function startSession(request: APIRequestContext) {
      const user = await register(request, `diagnostic-${randomUUID()}`);
      for (const org of [orgA, orgB]) {
        await prisma.orgMembership.create({ data: { orgId: org.id, userId: user.id, role: "member" } });
        const enroll = await request.post(`${api}/orgs/${org.slug}/academies/${org.academyId}/enroll`, {
          headers: headers(user.token),
        });
        expect(enroll.status(), await enroll.text()).toBe(201);
      }
      const started = await request.post(`${path(orgA)}/start`, { headers: headers(user.token) });
      expect(started.status(), await started.text()).toBe(201);
      const session = await started.json() as { sessionId: string; question: { id: string } | null };
      expect(session.question).toBeTruthy();
      return { user, sessionId: session.sessionId };
    }

    test("rejects a resource from another org before a diagnostic can start", async ({ request }) => {
      const { user } = await startSession(request);
      const response = await request.post(`${path(orgB, orgA)}/start`, { headers: headers(user.token) });
      expect(response.status(), await response.text()).toBe(404);
    });

    for (const attack of ["wrong route org", "another academy's session"] as const) {
      test(`rejects ${attack} when the same user is enrolled in both tenants`, async ({ request }) => {
        const { user, sessionId } = await startSession(request);
        const wrongPath = attack === "wrong route org" ? path(orgB, orgA) : path(orgB);
        const before = await prisma.diagnosticSession.findUniqueOrThrow({ where: { id: sessionId } });
        const deniedResult = await request.get(`${wrongPath}/result/${sessionId}`, { headers: headers(user.token) });
        expect.soft(deniedResult.status(), await deniedResult.text()).toBe(404);
        const deniedAnswer = await request.post(`${wrongPath}/answer`, {
          headers: headers(user.token), data: { sessionId, answer: 0, responseTimeMs: 1500 },
        });
        expect(deniedAnswer.status(), await deniedAnswer.text()).toBe(404);
        expect(await prisma.diagnosticSession.findUniqueOrThrow({ where: { id: sessionId } })).toEqual(before);

        // The denial must not consume the question or block its authorized route.
        const allowed = await request.post(`${path(orgA)}/answer`, {
          headers: headers(user.token), data: { sessionId, answer: 0, responseTimeMs: 1500 },
        });
        expect(allowed.status(), await allowed.text()).toBe(201);
        const after = await prisma.diagnosticSession.findUniqueOrThrow({ where: { id: sessionId } });
        expect(after.questionCount).toBe(before.questionCount + 1);
        const allowedResult = await request.get(`${path(orgA)}/result/${sessionId}`, { headers: headers(user.token) });
        expect(allowedResult.status(), await allowedResult.text()).toBe(200);
        expect(await allowedResult.json()).toMatchObject({ questionsAnswered: before.questionCount + 1 });
      });
    }
  });
}

test.afterAll(async ({ request }) => {
  await prisma.brand.deleteMany({ where: { orgSlug: { in: fixtureOrgs } } });
  await prisma.organization.deleteMany({ where: { slug: { in: fixtureOrgs } } });
  for (const user of users) {
    const response = await request.delete(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      headers: { ...headers(env.SUPABASE_SERVICE_ROLE_KEY), apikey: env.SUPABASE_SERVICE_ROLE_KEY },
    });
    expect(response.ok(), `Could not delete security fixture user ${user.id}`).toBe(true);
  }
  await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  await prisma.$disconnect();
});

test.describe("Security: organization membership", () => {
  test("anonymous callers cannot join the platform or provision memberships", async ({ request }) => {
    for (const path of ["/orgs/graspful/join", "/auth/provision"]) {
      const response = await request.post(`${api}${path}`, { data: { brandOrgSlug: orgB.slug } });
      expect(response.status(), path).toBe(401);
    }
  });

  test("joining the platform grants only member and never promotes a repeated join", async ({ request }) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request.post(`${api}/orgs/graspful/join`, {
        headers: headers(outsider.token), data: { role: "owner" },
      });
      expect(response.status(), await response.text()).toBe(201);
      expect(await response.json()).toMatchObject({ role: "member" });
    }
    const membership = await prisma.orgMembership.findFirst({
      where: { userId: outsider.id, org: { slug: "graspful" } },
    });
    expect(membership?.role).toBe("member");
    const privilegedRoute = await request.get(`${api}/orgs/graspful/api-keys`, { headers: headers(outsider.token) });
    expect(privilegedRoute.status()).toBe(403);
  });

  test("direct joins cannot grant membership in another tenant", async ({ request }) => {
    const response = await request.post(`${api}/orgs/${orgB.slug}/join`, { headers: headers(outsider.token) });
    expect(response.status()).toBe(403);
    expect(await prisma.orgMembership.count({ where: { orgId: orgB.id, userId: outsider.id } })).toBe(0);
  });

  test("provisioning ignores private workspaces and inactive brands", async ({ request }) => {
    for (const inactiveBrand of [false, true]) {
      if (inactiveBrand) {
        await prisma.brand.create({ data: {
          ...brandData(orgA, `${prefix}-inactive.example.com`, `${prefix}-inactive`),
          logoUrl: "/icon.svg", isActive: false,
        } });
      }
      const response = await request.post(`${api}/auth/provision`, {
        headers: headers(provisionUser.token), data: { brandOrgSlug: orgA.slug },
      });
      expect(response.status(), await response.text()).toBe(201);
      expect(await prisma.orgMembership.count({ where: { orgId: orgA.id, userId: provisionUser.id } })).toBe(0);
    }
  });

  test("provisioning an active public brand grants member and keeps owner permissions separate", async ({ request }) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request.post(`${api}/auth/provision`, {
        headers: headers(provisionUser.token), data: { brandOrgSlug: orgB.slug, role: "owner" },
      });
      expect(response.status(), await response.text()).toBe(201);
    }
    const membership = await prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId: orgB.id, userId: provisionUser.id } },
    });
    expect(membership?.role).toBe("member");
    const response = await request.get(`${api}/orgs/${orgB.slug}/api-keys`, { headers: headers(provisionUser.token) });
    expect(response.status()).toBe(403);
  });
});

for (const scope of ["academy", "course"] as const) {
  test.describe(`Security: ${scope} leaderboard`, () => {
    function path(tenant: Tenant, resource: Tenant = tenant) {
      const segment = scope === "academy" ? `academies/${resource.academyId}` : `courses/${resource.courseId}`;
      return `${api}/orgs/${tenant.slug}/${segment}/leaderboard`;
    }

    test("requires authentication", async ({ request }) => {
      expect((await request.get(path(orgA))).status()).toBe(401);
    });

    test("conceals another tenant's resource even from an enrolled member", async ({ request }) => {
      const response = await request.get(path(orgA, orgB), { headers: headers(learner.token) });
      expect(response.status(), await response.text()).toBe(404);
      const foreignOrg = await request.get(path(orgB), { headers: headers(learner.token) });
      expect(foreignOrg.status()).toBe(403);
    });

    test("conceals the leaderboard from a member without enrollment", async ({ request }) => {
      expect((await request.get(path(orgA), { headers: headers(unenrolled.token) })).status()).toBe(404);
    });

    test("returns the leaderboard to an enrolled member", async ({ request }) => {
      const response = await request.get(path(orgA), { headers: headers(learner.token) });
      expect(response.status(), await response.text()).toBe(200);
      expect(await response.json()).toEqual([]);
    });

    if (scope === "course") {
      test("a legacy course enrollment cannot expose the academy-wide leaderboard", async ({ request }) => {
        const response = await request.get(path(orgA), { headers: headers(courseOnlyLearner.token) });
        expect(response.status(), await response.text()).toBe(404);
        expect(await prisma.academyEnrollment.count({ where: { academyId: orgA.academyId, userId: courseOnlyLearner.id } })).toBe(0);
        expect(await prisma.courseEnrollment.count({ where: { courseId: orgA.courseId, userId: courseOnlyLearner.id } })).toBe(1);
      });
    }
  });
}

test.describe("Security: API key tenant boundary", () => {
  test("an org A key can manage A, while its owner JWT can manage both orgs", async ({ request }) => {
    for (const route of ["api-keys", "courses", "academies"]) {
      const ownOrg = await request.get(`${api}/orgs/${orgA.slug}/${route}`, { headers: headers(orgAKey) });
      expect(ownOrg.status(), route).toBe(200);
    }
    for (const org of [orgA, orgB]) {
      expect((await request.get(`${api}/orgs/${org.slug}/api-keys`, { headers: headers(owner.token) })).status()).toBe(200);
    }
  });

  test("an org A key cannot read or mint keys in B using its slug or UUID", async ({ request }) => {
    const count = await prisma.apiKey.count({ where: { orgId: orgB.id } });
    for (const orgReference of [orgB.slug, orgB.id]) {
      const url = `${api}/orgs/${orgReference}/api-keys`;
      for (const route of ["api-keys", "courses", "academies"]) {
        const response = await request.get(`${api}/orgs/${orgReference}/${route}`, { headers: headers(orgAKey) });
        expect(response.status(), route).toBe(403);
      }
      expect((await request.post(url, { headers: headers(orgAKey), data: { name: "Forbidden key" } })).status()).toBe(403);
    }
    expect(await prisma.apiKey.count({ where: { orgId: orgB.id } })).toBe(count);
  });

  test("an org A key cannot create a brand for B when its user owns both", async ({ request }) => {
    const slug = `${prefix}-cross-org`;
    const response = await request.post(`${api}/brands`, {
      headers: headers(orgAKey), data: brandData(orgB, `${slug}.example.com`, slug),
    });
    expect(response.status(), await response.text()).toBe(403);
    expect(await prisma.brand.findUnique({ where: { slug } })).toBeNull();
  });
});

test.describe("Security: brand domain ownership", () => {
  for (const [label, domain, status] of [
    ["platform apex", "graspful.ai", 403], ["platform www host", "www.graspful.ai", 403],
    ["Vercel deployment host", "x.vercel.app", 403],
    ["another organization's domain", `${prefix}.example.com`, 403],
    ["non-hostname", "not a hostname", 400], ["URL with a scheme and path", "https://example.com/path", 400],
  ] as const) {
    test(`rejects ${label} without creating a brand`, async ({ request }) => {
      const slug = `${prefix}-${randomUUID()}`;
      const response = await request.post(`${api}/brands`, {
        headers: headers(orgAKey), data: brandData(orgA, domain, slug),
      });
      expect(response.status(), await response.text()).toBe(status);
      expect(await prisma.brand.findUnique({ where: { slug } })).toBeNull();
      expect(await prisma.brand.findUnique({ where: { domain: `${prefix}.example.com` } })).toMatchObject({ orgSlug: orgB.slug });
    });
  }

  test("only an entitled owner can create and reimport an available hostname", async ({ request }) => {
    const slug = `${prefix}-allowed`;
    const domain = `${slug}.example.com`;
    const data = brandData(orgA, domain, slug);
    expect((await request.post(`${api}/brands`, { data })).status()).toBe(401);
    expect((await request.post(`${api}/brands`, { headers: headers(unenrolled.token), data })).status()).toBe(403);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request.post(`${api}/brands`, { headers: headers(orgAKey), data });
      expect(response.status(), await response.text()).toBe(201);
      expect(await response.json()).toMatchObject({ brand: { slug, domain, orgSlug: orgA.slug } });
    }
    expect(await prisma.brand.count({ where: { slug } })).toBe(1);
  });
});

import {
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  INestApplication,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { generateKeyPair, SignJWT } from 'jose';
import { AddressInfo } from 'node:net';
import { AcademyGraphController } from '../../knowledge-graph/academy-graph.controller';
import { KnowledgeGraphController } from '../../knowledge-graph/knowledge-graph.controller';
import { AcademyDiagnosticController } from '../../diagnostic/academy-diagnostic.controller';
import { DiagnosticController } from '../../diagnostic/diagnostic.controller';
import { AcademyLearningEngineController } from '../../learning-engine/academy-learning-engine.controller';
import { LearningEngineController } from '../../learning-engine/learning-engine.controller';
import { AcademyStudentModelController } from '../../student-model/academy-student-model.controller';
import { StudentModelController } from '../../student-model/student-model.controller';
import { AssessmentController } from '../../assessment/assessment.controller';
import { AcademyGamificationController } from '../../gamification/academy-gamification.controller';
import { GamificationController } from '../../gamification/gamification.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { RequireEnrollment, REQUIRE_ENROLLMENT_KEY } from '../decorators/require-enrollment.decorator';
import { AcademyScopeGuard } from './academy-scope.guard';
import { CourseScopeGuard } from './course-scope.guard';
import type { CourseContext } from './course-scope.guard';
import { CurrentCourse } from '../decorators/current-course.decorator';
import type { OrgContext } from '../org-context';
import { OrgMembershipGuard } from './org-membership.guard';
import { JwtOrApiKeyGuard } from './jwt-or-apikey.guard';
import { SupabaseAuthGuard } from './supabase-auth.guard';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_ORG_ID = '00000000-0000-0000-0000-000000000002';
const USER_ID = 'user-1';
const orgContext: OrgContext = {
  orgId: ORG_ID,
  userId: USER_ID,
  email: 'learner@example.test',
  role: 'member',
};

type Row = Record<string, any>;

// Evaluate the small Prisma where subset used by these guards against fixtures.
// This lets tests fail if a tenant, archive, or enrollment predicate is removed.
function matchesWhere(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === 'OR') return expected.some((clause: Row) => matchesWhere(row, clause));
    if (key === 'AND') return expected.every((clause: Row) => matchesWhere(row, clause));
    const actual = row[key];
    if (expected !== null && typeof expected === 'object') {
      if ('some' in expected) {
        return Array.isArray(actual) && actual.some((item) => matchesWhere(item, expected.some));
      }
      return actual != null && matchesWhere(actual, expected);
    }
    return actual === expected;
  });
}

function findFirst(rows: Row[]) {
  return jest.fn(async ({ where, select }: { where: Row; select: Row }) => {
    const row = rows.find((candidate) => matchesWhere(candidate, where));
    if (!row) return null;
    return Object.fromEntries(Object.keys(select).map((key) => [key, row[key]]));
  });
}

function academy(overrides: Row = {}): Row {
  return {
    id: 'academy-1',
    orgId: ORG_ID,
    org: { isActive: true },
    archivedAt: null,
    enrollments: [{ userId: USER_ID }],
    ...overrides,
  };
}

function course(overrides: Row = {}): Row {
  return {
    id: 'course-1',
    orgId: ORG_ID,
    academyId: 'academy-1',
    org: { isActive: true },
    academy: academy({ enrollments: [] }),
    archivedAt: null,
    isPublished: true,
    enrollments: [{ userId: USER_ID }],
    ...overrides,
  };
}

function context(
  params: Row,
  options: { org?: OrgContext | null; enrollment?: boolean; methodEnrollment?: boolean } = {},
): ExecutionContext {
  class TestController {}
  const handler = () => undefined;
  if (options.enrollment !== undefined) {
    Reflect.defineMetadata(REQUIRE_ENROLLMENT_KEY, options.enrollment, TestController);
  }
  if (options.methodEnrollment !== undefined) {
    Reflect.defineMetadata(REQUIRE_ENROLLMENT_KEY, options.methodEnrollment, handler);
  }
  const request = { params, orgContext: options.org === undefined ? orgContext : options.org };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => TestController,
  } as unknown as ExecutionContext;
}

describe('CourseScopeGuard', () => {
  function setup(rows: Row[] = [course()]) {
    const prisma = { course: { findFirst: findFirst(rows) } };
    return { prisma, guard: new CourseScopeGuard(prisma as unknown as PrismaService, new Reflector()) };
  }

  it('requires an organization context before looking up a course', async () => {
    const { guard, prisma } = setup();
    await expect(guard.canActivate(context({ courseId: 'course-1' }, { org: null })))
      .rejects.toThrow(ForbiddenException);
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
  });

  it('allows scoped collection routes without a course lookup', async () => {
    const { guard, prisma } = setup();
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    ['another organization', course({ orgId: OTHER_ORG_ID })],
    ['an academy in another organization', course({ academy: academy({ orgId: OTHER_ORG_ID }) })],
    ['an archived course', course({ archivedAt: new Date() })],
    ['an archived academy', course({ academy: academy({ archivedAt: new Date() }) })],
    ['an inactive organization', course({ org: { isActive: false } })],
  ])('hides %s even when enrollment is not required', async (_name, row) => {
    const { guard } = setup([row]);
    await expect(guard.canActivate(context({ courseId: 'course-1' }))).rejects.toThrow(NotFoundException);
  });

  it('hides a course ID that does not exist in the organization', async () => {
    const { guard } = setup();
    await expect(guard.canActivate(context({ courseId: 'missing-course' }))).rejects.toThrow(NotFoundException);
  });

  it('preserves scoped creator access to an unpublished course', async () => {
    const { guard } = setup([course({ isPublished: false, enrollments: [] })]);
    await expect(guard.canActivate(context({ courseId: 'course-1' }))).resolves.toBe(true);
  });

  it('attaches the authorized resource with the resolved organization', async () => {
    const { guard } = setup();
    const ctx = context({ orgId: 'an-unresolved-slug', courseId: 'course-1' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().courseContext).toEqual({
      id: 'course-1', orgId: ORG_ID, academyId: 'academy-1',
    });
  });

  it.each([
    ['an unpublished course', course({ isPublished: false })],
    ['no enrollment', course({ enrollments: [] })],
    ['another user enrollment', course({ enrollments: [{ userId: 'other-user' }] })],
  ])('rejects %s on learner routes', async (_name, row) => {
    const { guard } = setup([row]);
    await expect(guard.canActivate(context({ courseId: 'course-1' }, { enrollment: true })))
      .rejects.toThrow(NotFoundException);
  });

  it.each([
    ['course enrollment', course()],
    ['academy enrollment', course({ enrollments: [], academy: academy() })],
  ])('allows learner access through %s', async (_name, row) => {
    const { guard } = setup([row]);
    await expect(guard.canActivate(context({ courseId: 'course-1' }, { enrollment: true })))
      .resolves.toBe(true);
  });

  it('allows an explicit enrollment exception to override the controller requirement', async () => {
    const { guard } = setup([course({ enrollments: [] })]);
    await expect(guard.canActivate(context({ courseId: 'course-1' }, {
      enrollment: true, methodEnrollment: false,
    }))).resolves.toBe(true);
  });

  it('enforces a method enrollment requirement on a controller without one', async () => {
    const { guard } = setup([course({ enrollments: [] })]);
    await expect(guard.canActivate(context({ courseId: 'course-1' }, { methodEnrollment: true })))
      .rejects.toThrow(NotFoundException);
  });
});

describe('AcademyScopeGuard', () => {
  function setup(rows: Row[] = [academy()]) {
    const prisma = { academy: { findFirst: findFirst(rows) } };
    return { prisma, guard: new AcademyScopeGuard(prisma as unknown as PrismaService, new Reflector()) };
  }

  it('requires an organization context before looking up an academy', async () => {
    const { guard, prisma } = setup();
    await expect(guard.canActivate(context({ academyId: 'academy-1' }, { org: null })))
      .rejects.toThrow(ForbiddenException);
    expect(prisma.academy.findFirst).not.toHaveBeenCalled();
  });

  it('allows scoped collection routes without an academy lookup', async () => {
    const { guard, prisma } = setup();
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
    expect(prisma.academy.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    ['another organization', academy({ orgId: OTHER_ORG_ID })],
    ['an archived academy', academy({ archivedAt: new Date() })],
    ['an inactive organization', academy({ org: { isActive: false } })],
  ])('hides %s even when enrollment is not required', async (_name, row) => {
    const { guard } = setup([row]);
    await expect(guard.canActivate(context({ academyId: 'academy-1' }))).rejects.toThrow(NotFoundException);
  });

  it('hides an academy ID that does not exist in the organization', async () => {
    const { guard } = setup();
    await expect(guard.canActivate(context({ academyId: 'missing-academy' }))).rejects.toThrow(NotFoundException);
  });

  it('enforces a method enrollment requirement on a controller without one', async () => {
    const { guard } = setup([academy({ enrollments: [] })]);
    await expect(guard.canActivate(context({ academyId: 'academy-1' }, { methodEnrollment: true })))
      .rejects.toThrow(NotFoundException);
  });

  it('attaches the authorized academy context', async () => {
    const { guard } = setup();
    const ctx = context({ academyId: 'academy-1' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().academyContext).toEqual({ id: 'academy-1', orgId: ORG_ID });
  });

  it.each([{ enrollments: [] }, { enrollments: [{ userId: 'another-user' }] }])('rejects missing caller enrollment (%j)', async ({ enrollments }) => {
    const { guard } = setup([academy({ enrollments })]);
    await expect(guard.canActivate(context({ academyId: 'academy-1' }, { enrollment: true })))
      .rejects.toThrow(NotFoundException);
  });

  it('allows enrolled learner access', async () => {
    const { guard } = setup();
    await expect(guard.canActivate(context({ academyId: 'academy-1' }, { enrollment: true })))
      .resolves.toBe(true);
  });

  it('allows the enrollment action to override the controller requirement', async () => {
    const { guard } = setup([academy({ enrollments: [] })]);
    await expect(guard.canActivate(context({ academyId: 'academy-1' }, {
      enrollment: true, methodEnrollment: false,
    }))).resolves.toBe(true);
  });
});

const controllerCall = jest.fn();

@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard, CourseScopeGuard)
@RequireEnrollment()
class CourseProbeController {
  @Get('study')
  study(@CurrentCourse() course: CourseContext) {
    controllerCall();
    return course;
  }

  @Post('enroll')
  @RequireEnrollment(false)
  enroll(@Req() request: Row) {
    controllerCall();
    return request.courseContext;
  }
}

@Controller('orgs/:orgId/academies/:academyId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard, AcademyScopeGuard)
@RequireEnrollment()
class AcademyProbeController {
  @Get('study')
  study(@Req() request: Row) {
    controllerCall();
    return request.academyContext;
  }

  @Post('enroll')
  @RequireEnrollment(false)
  enroll(@Req() request: Row) {
    controllerCall();
    return request.academyContext;
  }
}

describe('Scope guard HTTP authorization', () => {
  let app: INestApplication;
  let baseUrl: string;
  let token: string;
  let nonMemberToken: string;
  let prisma: Row;

  beforeAll(async () => {
    const keys = await generateKeyPair('ES256');
    const signToken = (userId: string) => new SignJWT({ sub: userId, email: 'learner@example.test' })
      .setProtectedHeader({ alg: 'ES256' })
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(keys.privateKey);
    [token, nonMemberToken] = await Promise.all([signToken(USER_ID), signToken('non-member')]);
    prisma = {
      course: { findFirst: jest.fn() },
      academy: { findFirst: jest.fn() },
      organization: {
        findUnique: jest.fn(async () => ({ id: ORG_ID, isActive: true })),
      },
      orgMembership: {
        findUnique: jest.fn(async ({ where }: Row) => where.orgId_userId.userId === USER_ID
          ? { role: 'member', org: { isActive: true } }
          : null),
      },
    };
    const module = await Test.createTestingModule({
      controllers: [CourseProbeController, AcademyProbeController],
      providers: [
        SupabaseAuthGuard,
        OrgMembershipGuard,
        CourseScopeGuard,
        AcademyScopeGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: new ConfigService({ SUPABASE_URL: 'https://example.test' }) },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    module.get(SupabaseAuthGuard).setJwks(async () => keys.publicKey);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.course.findFirst.mockImplementation(findFirst([course()]));
    prisma.academy.findFirst.mockImplementation(findFirst([academy()]));
  });

  afterAll(async () => { await app?.close(); });

  const paths = [
    ['course', 'courses/course-1'],
    ['academy', 'academies/academy-1'],
  ];

  async function request(path: string, authToken?: string, method = 'GET', org = ORG_ID) {
    return fetch(`${baseUrl}/orgs/${org}/${path}`, {
      method,
      headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    });
  }

  it.each(paths)('rejects anonymous %s requests before controller execution', async (_kind, path) => {
    expect((await request(`${path}/study`)).status).toBe(401);
    expect(controllerCall).not.toHaveBeenCalled();
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
    expect(prisma.academy.findFirst).not.toHaveBeenCalled();
  });

  it.each(paths)('rejects %s requests without organization membership', async (_kind, path) => {
    expect((await request(`${path}/study`, nonMemberToken)).status).toBe(403);
    expect(controllerCall).not.toHaveBeenCalled();
  });

  it.each(paths)('rejects %s requests across organizations', async (_kind, path) => {
    expect((await request(`${path}/study`, token, 'GET', OTHER_ORG_ID)).status).toBe(404);
    expect(controllerCall).not.toHaveBeenCalled();
  });

  it.each(paths)('rejects signed-in %s learners without enrollment', async (kind, path) => {
    const fixture = kind === 'course' ? course({ enrollments: [] }) : academy({ enrollments: [] });
    prisma[kind].findFirst.mockImplementation(findFirst([fixture]));
    expect((await request(`${path}/study`, token)).status).toBe(404);
    expect(controllerCall).not.toHaveBeenCalled();
  });

  it.each(paths)('allows entitled %s learners and attaches the scoped resource', async (kind, path) => {
    const response = await request(`${path}/study`, token);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: `${kind}-1`, orgId: ORG_ID });
    expect(controllerCall).toHaveBeenCalledTimes(1);
  });

  it.each(paths)('allows the %s enrollment action before a learner has enrolled', async (kind, path) => {
    const fixture = kind === 'course' ? course({ enrollments: [] }) : academy({ enrollments: [] });
    prisma[kind].findFirst.mockImplementation(findFirst([fixture]));
    expect((await request(`${path}/enroll`, token, 'POST')).status).toBe(201);
    expect(controllerCall).toHaveBeenCalledTimes(1);
  });

  it.each(paths)('still rejects the %s enrollment action across organizations', async (_kind, path) => {
    expect((await request(`${path}/enroll`, token, 'POST', OTHER_ORG_ID)).status).toBe(404);
    expect(controllerCall).not.toHaveBeenCalled();
  });

  it('allows course access through academy enrollment', async () => {
    prisma.course.findFirst.mockImplementation(findFirst([course({ enrollments: [], academy: academy() })]));
    expect((await request('courses/course-1/study', token)).status).toBe(200);
    expect(controllerCall).toHaveBeenCalledTimes(1);
  });

  it('resolves organization slugs before applying the course scope', async () => {
    expect((await request('courses/course-1/study', token, 'GET', 'my-academy')).status).toBe(200);
    expect(controllerCall).toHaveBeenCalledTimes(1);
  });
});

describe('Production controller authorization coverage', () => {
  it.each([
    StudentModelController,
    AcademyStudentModelController,
    DiagnosticController,
    AcademyDiagnosticController,
    LearningEngineController,
    AcademyLearningEngineController,
    AssessmentController,
    GamificationController,
    AcademyGamificationController,
  ])('%p requires enrollment on every learner action except enrollment itself', (controller) => {
    const reflector = new Reflector();
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      if (name === 'constructor') continue;
      const handler = (controller.prototype as unknown as Record<string, unknown>)[name];
      if (typeof handler !== 'function') continue;
      const required = reflector.getAllAndOverride(REQUIRE_ENROLLMENT_KEY, [handler, controller]);
      expect({ controller: controller.name, action: name, enrollment: required }).toEqual({
        controller: controller.name, action: name, enrollment: name !== 'enroll',
      });
    }
  });

  it.each([
    [KnowledgeGraphController, CourseScopeGuard, false],
    [AcademyGraphController, AcademyScopeGuard, false],
    [DiagnosticController, CourseScopeGuard, true],
    [LearningEngineController, CourseScopeGuard, true],
    [StudentModelController, CourseScopeGuard, true],
    [AssessmentController, CourseScopeGuard, true],
    [GamificationController, CourseScopeGuard, true],
    [AcademyDiagnosticController, AcademyScopeGuard, true],
    [AcademyLearningEngineController, AcademyScopeGuard, true],
    [AcademyStudentModelController, AcademyScopeGuard, true],
    [AcademyGamificationController, AcademyScopeGuard, true],
  ])('%p keeps organization scope ahead of %p', (controller, scopeGuard, enrollmentRequired) => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[];
    expect(guards[0]).toBe(enrollmentRequired ? SupabaseAuthGuard : JwtOrApiKeyGuard);
    expect(guards).toContain(OrgMembershipGuard);
    expect(guards).toContain(scopeGuard);
    expect(guards.indexOf(OrgMembershipGuard)).toBeLessThan(guards.indexOf(scopeGuard));
    if (enrollmentRequired) {
      expect(Reflect.getMetadata(REQUIRE_ENROLLMENT_KEY, controller)).toBe(true);
    }
  });
});

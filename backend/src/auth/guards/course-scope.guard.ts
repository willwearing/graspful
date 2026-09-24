import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import type { OrgContext } from '@/auth/org-context';
import { REQUIRE_ENROLLMENT_KEY } from '../decorators/require-enrollment.decorator';

export interface CourseContext {
  id: string;
  orgId: string;
  academyId: string;
}

@Injectable()
export class CourseScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { courseId?: string };
      orgContext?: OrgContext;
      courseContext?: CourseContext;
    }>();
    const org = request.orgContext;
    if (!org) throw new ForbiddenException('Missing org context');
    const { courseId } = request.params;
    // Collection and slug routes enforce their scope in the query service.
    if (!courseId) return true;

    const requiresEnrollment = this.reflector.getAllAndOverride<boolean>(REQUIRE_ENROLLMENT_KEY, [
      context.getHandler(), context.getClass(),
    ]) ?? false;
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        orgId: org.orgId,
        archivedAt: null,
        org: { isActive: true },
        academy: { orgId: org.orgId, archivedAt: null },
        ...(requiresEnrollment ? {
          isPublished: true,
          OR: [
            { enrollments: { some: { userId: org.userId } } },
            { academy: { enrollments: { some: { userId: org.userId } } } },
          ],
        } : {}),
      },
      select: { id: true, orgId: true, academyId: true },
    });
    if (!course) throw new NotFoundException('Course or enrollment not found');
    request.courseContext = course;
    return true;
  }
}

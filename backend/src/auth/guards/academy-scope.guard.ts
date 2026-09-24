import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import type { OrgContext } from '@/auth/org-context';
import { REQUIRE_ENROLLMENT_KEY } from '../decorators/require-enrollment.decorator';

export interface AcademyContext {
  id: string;
  orgId: string;
}

@Injectable()
export class AcademyScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { academyId?: string };
      orgContext?: OrgContext;
      academyContext?: AcademyContext;
    }>();
    const org = request.orgContext;
    if (!org) throw new ForbiddenException('Missing org context');
    const { academyId } = request.params;
    if (!academyId) return true;

    const requiresEnrollment = this.reflector.getAllAndOverride<boolean>(REQUIRE_ENROLLMENT_KEY, [
      context.getHandler(), context.getClass(),
    ]) ?? false;
    const academy = await this.prisma.academy.findFirst({
      where: {
        id: academyId,
        orgId: org.orgId,
        archivedAt: null,
        org: { isActive: true },
        ...(requiresEnrollment ? { enrollments: { some: { userId: org.userId } } } : {}),
      },
      select: { id: true, orgId: true },
    });
    if (!academy) throw new NotFoundException('Academy or enrollment not found');
    request.academyContext = academy;
    return true;
  }
}

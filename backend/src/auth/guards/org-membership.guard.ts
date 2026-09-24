import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { OrgRole } from '@prisma/client';
import type { OrgContext } from '@/auth/org-context';
import { hasMinRole } from '../roles';

export const MIN_ROLE_KEY = 'minRole';

@Injectable()
export class OrgMembershipGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    let orgId = request.params.orgId;

    if (!user || !orgId) {
      throw new ForbiddenException('Missing user or org context');
    }

    // Resolve org slugs to the canonical ID before checking access.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(orgId)) {
      const org = await this.prisma.organization.findUnique({
        where: { slug: orgId },
        select: { id: true },
      });
      if (!org) {
        throw new ForbiddenException('Organization not found');
      }
      orgId = org.id;
    }

    if (user.apiKeyOrgId && user.apiKeyOrgId !== orgId) {
      throw new ForbiddenException('API key is not valid for this organization');
    }

    const membership = await this.prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId, userId: user.userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const minRole = this.reflector.getAllAndOverride<OrgRole>(MIN_ROLE_KEY, [context.getHandler(), context.getClass()]) ?? 'member';

    if (!hasMinRole(membership.role, minRole)) {
      throw new ForbiddenException('Insufficient role');
    }

    request.orgContext = {
      userId: user.userId,
      email: user.email,
      orgId,
      role: membership.role,
    } satisfies OrgContext;

    return true;
  }
}

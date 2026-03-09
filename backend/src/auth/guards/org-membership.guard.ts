import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { OrgRole } from '@prisma/client';

export interface OrgContext {
  userId: string;
  email: string;
  orgId: string;
  role: OrgRole;
}

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

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
    const orgId = request.params.orgId;

    if (!user || !orgId) {
      throw new ForbiddenException('Missing user or org context');
    }

    const membership = await this.prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId, userId: user.userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const minRole = this.reflector.get<OrgRole>(MIN_ROLE_KEY, context.getHandler()) ?? 'member';

    if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[minRole]) {
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

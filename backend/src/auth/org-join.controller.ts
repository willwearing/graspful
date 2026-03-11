import {
  Controller,
  Param,
  Post,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseAuthGuard, CurrentUser } from '@/auth';
import { AuthUser } from '@/auth/guards/supabase-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Allows authenticated users to join an organization.
 * Only SupabaseAuthGuard is used — no OrgMembershipGuard (the user isn't a member yet).
 * Idempotent: if already a member, returns existing membership.
 */
@Controller('orgs/:orgSlug/join')
@UseGuards(SupabaseAuthGuard)
export class OrgJoinController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async joinOrg(
    @Param('orgSlug') orgSlug: string,
    @CurrentUser() user: AuthUser,
  ) {
    // Resolve org slug to UUID
    const org = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, isActive: true },
    });

    if (!org || !org.isActive) {
      throw new NotFoundException('Organization not found');
    }

    // Upsert membership — idempotent
    const membership = await this.prisma.orgMembership.upsert({
      where: { orgId_userId: { orgId: org.id, userId: user.userId } },
      update: {},
      create: {
        orgId: org.id,
        userId: user.userId,
        role: 'member',
      },
    });

    return { orgId: org.id, role: membership.role };
  }
}

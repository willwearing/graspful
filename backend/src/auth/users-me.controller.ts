import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard, CurrentUser } from '@/auth';
import type { AuthUser } from '@/auth/guards/supabase-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('users/me')
@UseGuards(SupabaseAuthGuard)
export class UsersMeController {
  constructor(private prisma: PrismaService) {}

  @Get('orgs')
  async listMyOrgs(@CurrentUser() user: AuthUser) {
    const memberships = await this.prisma.orgMembership.findMany({
      where: { userId: user.userId },
      include: {
        org: {
          select: {
            id: true,
            slug: true,
            name: true,
            niche: true,
            isActive: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      orgId: m.org.id,
      slug: m.org.slug,
      name: m.org.name,
      niche: m.org.niche,
      isActive: m.org.isActive,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }
}

import { SetMetadata } from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { MIN_ROLE_KEY } from '../guards/org-membership.guard';

export const MinRole = (role: OrgRole) => SetMetadata(MIN_ROLE_KEY, role);

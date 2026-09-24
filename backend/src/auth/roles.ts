import type { OrgRole } from '@prisma/client';

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function hasMinRole(role: OrgRole, minimum: OrgRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

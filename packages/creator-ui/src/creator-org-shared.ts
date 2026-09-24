export const CREATOR_ORG_COOKIE = "creator-org";

export interface CreatorOrgMembership {
  orgId: string;
  slug: string;
  name: string;
  role: string;
  isActive: boolean;
}

export function getEligibleCreatorOrgs(orgs: CreatorOrgMembership[]): CreatorOrgMembership[] {
  return orgs.filter((org) => org.role === "owner" || org.role === "admin");
}

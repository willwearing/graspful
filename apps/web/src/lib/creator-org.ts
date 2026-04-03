import { cookies } from "next/headers";
import { createApiFetcher } from "@/lib/api";
import {
  CREATOR_ORG_COOKIE,
  getEligibleCreatorOrgs,
  type CreatorOrgMembership,
} from "@/lib/creator-org.shared";

export type { CreatorOrgMembership } from "@/lib/creator-org.shared";
export { CREATOR_ORG_COOKIE } from "@/lib/creator-org.shared";

/**
 * Resolves the active creator org, honoring an explicit cookie override when valid.
 */
export async function resolveCreatorOrgSlug(
  accessToken: string | undefined,
  brandOrgSlug: string
): Promise<string> {
  if (!accessToken) return brandOrgSlug;

  const cookieStore = await cookies();
  const preferredOrgSlug = cookieStore.get(CREATOR_ORG_COOKIE)?.value;
  const serverApiFetch = createApiFetcher(accessToken);

  try {
    const orgs = await serverApiFetch<CreatorOrgMembership[]>("/users/me/orgs");
    const eligibleOrgs = getEligibleCreatorOrgs(orgs);

    if (preferredOrgSlug) {
      const preferredOrg = eligibleOrgs.find((org) => org.slug === preferredOrgSlug);
      if (preferredOrg) return preferredOrg.slug;
    }

    const nonBrandOrg = eligibleOrgs.find((org) => org.slug !== brandOrgSlug);
    if (nonBrandOrg) return nonBrandOrg.slug;

    if (eligibleOrgs.length > 0) return eligibleOrgs[0].slug;
  } catch {
    // Fall back to the brand org if memberships cannot be loaded.
  }

  return brandOrgSlug;
}

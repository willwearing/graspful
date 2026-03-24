import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createApiFetcher } from "@/lib/api";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { CreatorOrgProvider } from "@/lib/contexts/creator-org-context";

interface OrgMembership {
  orgId: string;
  slug: string;
  name: string;
  role: string;
  isActive: boolean;
}

/**
 * Determines the org slug the creator dashboard should use.
 * Prefers the user's own org (owner/admin) over the brand org.
 */
async function resolveCreatorOrgSlug(accessToken: string | undefined, brandOrgSlug: string): Promise<string> {
  if (!accessToken) return brandOrgSlug;

  const serverApiFetch = createApiFetcher(accessToken);
  try {
    const orgs = await serverApiFetch<OrgMembership[]>("/users/me/orgs");
    const ownedOrgs = orgs.filter((o) => o.role === "owner" || o.role === "admin");
    const ownOrg = ownedOrgs.find((o) => o.slug !== brandOrgSlug);
    if (ownOrg) return ownOrg.slug;
    if (ownedOrgs.length > 0) return ownedOrgs[0].slug;
  } catch {
    // Fall back to brand org if the endpoint fails
  }
  return brandOrgSlug;
}

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const brand = await resolvePageBrand();
  const orgSlug = await resolveCreatorOrgSlug(session?.access_token, brand.orgSlug);

  return <CreatorOrgProvider orgSlug={orgSlug}>{children}</CreatorOrgProvider>;
}

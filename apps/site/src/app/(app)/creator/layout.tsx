import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createApiFetcher } from "@/lib/api";
import { CreatorOrgProvider } from "@/lib/contexts/creator-org-context";

interface OrgMembership {
  orgId: string;
  slug: string;
  name: string;
  role: string;
  isActive: boolean;
}

async function resolveCreatorOrgSlug(accessToken: string | undefined): Promise<string> {
  if (!accessToken) return "graspful";

  const serverApiFetch = createApiFetcher(accessToken);
  try {
    const orgs = await serverApiFetch<OrgMembership[]>("/users/me/orgs");
    const ownedOrgs = orgs.filter((o) => o.role === "owner" || o.role === "admin");
    // Prefer user's own org over the default
    const ownOrg = ownedOrgs.find((o) => o.slug !== "graspful");
    if (ownOrg) return ownOrg.slug;
    if (ownedOrgs.length > 0) return ownedOrgs[0].slug;
  } catch {
    // Fall back
  }
  return "graspful";
}

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: { session } } = await supabase.auth.getSession();
  const orgSlug = await resolveCreatorOrgSlug(session?.access_token);

  return <CreatorOrgProvider orgSlug={orgSlug}>{children}</CreatorOrgProvider>;
}

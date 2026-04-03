import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { CreatorOrgProvider } from "@/lib/contexts/creator-org-context";
import { OrgSwitcher } from "@/components/creator/org-switcher";
import { resolveCreatorOrgSlug } from "@/lib/creator-org";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const brand = await resolvePageBrand();
  const orgSlug = await resolveCreatorOrgSlug(session?.access_token, brand.orgSlug);

  return (
    <CreatorOrgProvider orgSlug={orgSlug}>
      {session?.access_token ? (
        <div className="mx-auto w-full max-w-4xl px-4 pt-6 md:px-8">
          <div className="flex justify-end">
            <OrgSwitcher token={session.access_token} currentOrgSlug={orgSlug} />
          </div>
        </div>
      ) : null}
      {children}
    </CreatorOrgProvider>
  );
}

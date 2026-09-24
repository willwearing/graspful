import { requireAppSession } from "@/lib/app-session";
import { CreatorOrgProvider } from "@/lib/contexts/creator-org-context";
import { OrgSwitcher } from "@/components/creator/org-switcher";
import { resolveCreatorOrgSlug } from "@/lib/creator-org";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const { token, brand } = await requireAppSession();
  const orgSlug = await resolveCreatorOrgSlug(token, brand.orgSlug);

  return (
    <CreatorOrgProvider orgSlug={orgSlug}>
      {token ? (
        <div className="mx-auto w-full max-w-4xl px-4 pt-6 md:px-8">
          <div className="flex justify-end">
            <OrgSwitcher token={token} currentOrgSlug={orgSlug} />
          </div>
        </div>
      ) : null}
      {children}
    </CreatorOrgProvider>
  );
}

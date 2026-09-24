import { requireAppSession } from "@/lib/app-session";
import { resolveCreatorOrgSlug } from "@/lib/creator-org";
import { CreatorOrgProvider } from "@/lib/contexts/creator-org-context";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const { token } = await requireAppSession();
  const orgSlug = await resolveCreatorOrgSlug(token, "graspful");
  return <CreatorOrgProvider orgSlug={orgSlug}>{children}</CreatorOrgProvider>;
}

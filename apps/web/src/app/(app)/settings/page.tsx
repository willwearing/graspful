import { resolveCreatorOrgSlug } from "@/lib/creator-org";
import { requireAppSession } from "@/lib/app-session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingSettings } from "@/components/app/billing-settings";
import { ApiKeysSettings } from "@/components/app/api-keys-settings";

export default async function SettingsPage() {
  const { user, token, brand } = await requireAppSession();

  const orgSlug = await resolveCreatorOrgSlug(token, brand.orgSlug);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm text-foreground">{user.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <BillingSettings orgId={orgSlug} />

        <ApiKeysSettings orgId={orgSlug} />

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Playback speed, daily goals, and notification settings coming in a future update.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

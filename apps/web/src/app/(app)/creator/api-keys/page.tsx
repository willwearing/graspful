"use client";

import { useCreatorOrg } from "@/lib/contexts/creator-org-context";
import { ApiKeysSettings } from "@/components/app/api-keys-settings";
import { Card, CardContent } from "@/components/ui/card";

export default function ApiKeysPage() {
  const { orgSlug } = useCreatorOrg();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
      <p className="mb-8 mt-1 text-muted-foreground">Manage API keys for the CLI and MCP integrations.</p>
      <Card className="mb-8 bg-muted/50"><CardContent>
        <p className="mb-2 font-medium text-foreground">Quick Start</p>
        <pre className="overflow-x-auto rounded-lg bg-background p-4 font-mono text-xs text-foreground">{`export GRASPFUL_API_KEY="gsk_..."
npx @graspful/cli login
npx @graspful/cli import course.yaml`}</pre>
      </CardContent></Card>
      <ApiKeysSettings orgId={orgSlug} />
    </div>
  );
}

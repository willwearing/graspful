"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { apiClientFetch } from "@/lib/api-client";
import {
  CREATOR_ORG_COOKIE,
  getEligibleCreatorOrgs,
  type CreatorOrgMembership,
} from "@/lib/creator-org.shared";

type OrgSwitcherProps = {
  token: string;
  currentOrgSlug: string;
};

export function OrgSwitcher({ token, currentOrgSlug }: OrgSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [orgs, setOrgs] = useState<CreatorOrgMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const data = await apiClientFetch<CreatorOrgMembership[]>("/users/me/orgs", token);
        setOrgs(getEligibleCreatorOrgs(data));
      } catch {
        // Silently fail — org switcher is non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();
  }, [token]);

  // Hide if only one org or still loading
  if (loading || orgs.length <= 1) return null;

  const current = orgs.find((o) => o.slug === currentOrgSlug);

  function handleOrgChange(org: CreatorOrgMembership) {
    if (org.slug === currentOrgSlug || switching) return;

    setSwitching(true);
    document.cookie = `${CREATOR_ORG_COOKIE}=${encodeURIComponent(org.slug)}; path=/; max-age=31536000; samesite=lax`;

    const shouldResetToDashboard = /^\/creator\/manage\/[^/]+$/.test(pathname);
    if (shouldResetToDashboard) {
      router.replace("/creator");
      return;
    }

    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2" disabled={switching} />
        }
      >
        <Building2 className="h-4 w-4" />
        <span className="truncate max-w-[140px]">{current?.name ?? currentOrgSlug}</span>
        <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8}>
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.orgId}
            onClick={() => handleOrgChange(org)}
            className={org.slug === currentOrgSlug ? "bg-accent" : ""}
          >
            {org.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

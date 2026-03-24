"use client";

import { useEffect, useState } from "react";
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

interface Org {
  id: string;
  slug: string;
  name: string;
}

interface OrgSwitcherProps {
  token: string;
  currentOrgSlug: string;
  onOrgChange: (org: Org) => void;
}

export function OrgSwitcher({ token, currentOrgSlug, onOrgChange }: OrgSwitcherProps) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const data = await apiClientFetch<Org[]>("/users/me/orgs", token);
        setOrgs(data);
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2" />
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
            key={org.id}
            onClick={() => onOrgChange(org)}
            className={org.slug === currentOrgSlug ? "bg-accent" : ""}
          >
            {org.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

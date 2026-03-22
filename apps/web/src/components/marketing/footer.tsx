"use client";

import Link from "next/link";
import { useBrand } from "@/lib/brand/context";

const productLinks = [
  { href: "/agents", label: "AI Agents" },
  { href: "/pricing", label: "Pricing" },
  { href: "/sign-up", label: "Get Started" },
];

const resourceLinks = [
  { href: "/docs", label: "Documentation" },
  { href: "/docs/quickstart", label: "Quickstart" },
  { href: "/docs/mcp", label: "MCP Server" },
  { href: "/docs/course-schema", label: "Course Schema" },
];

export function MarketingFooter() {
  const brand = useBrand();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              {brand.name}
            </span>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              {brand.tagline}
            </p>
          </div>

          {/* Product links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Product
            </p>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resource links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Resources
            </p>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border/30 pt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            &copy; {year} {brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

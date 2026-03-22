"use client";

import { useBrand } from "@/lib/brand/context";

export function MarketingFooter() {
  const brand = useBrand();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/30 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-lg font-bold text-foreground tracking-tight">
            {brand.name}
          </span>
          <p className="text-sm text-muted-foreground">
            {brand.tagline}
          </p>
          <p className="text-xs text-muted-foreground/60">
            &copy; {year} {brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

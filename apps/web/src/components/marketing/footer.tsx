"use client";

import { useBrand } from "@/lib/brand/context";

export function MarketingFooter() {
  const brand = useBrand();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-lg font-bold text-foreground">
            {brand.name}
          </span>
          <p className="text-sm text-muted-foreground max-w-md">
            {brand.tagline}
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; {year} {brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

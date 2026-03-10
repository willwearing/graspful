"use client";

import Link from "next/link";
import { useBrand } from "@/lib/brand/context";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  const brand = useBrand();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">
            {brand.name}
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
          <Button size="sm" render={<Link href="/sign-up" />}>
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
}

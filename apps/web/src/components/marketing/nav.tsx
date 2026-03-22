"use client";

import Link from "next/link";
import { useBrand } from "@/lib/brand/context";

export function MarketingNav() {
  const brand = useBrand();

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 border-b border-[#0F172A]/[0.06] bg-transparent">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground tracking-tight">
            {brand.name}
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="btn-gradient px-5 py-2 text-sm font-medium"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

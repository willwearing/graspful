"use client";

import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { useBrand } from "@/lib/brand/context";
import { useTheme } from "@/lib/theme/theme-provider";

const platformLinks = [
  { href: "/agents", label: "Agents" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

const learnerLinks = [
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  const brand = useBrand();
  const { theme, toggleTheme } = useTheme();
  const navLinks = brand.id === "graspful" ? platformLinks : learnerLinks;

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 border-b border-[#0F172A]/[0.06] dark:border-white/[0.06] bg-transparent">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground tracking-tight">
              {brand.name}
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
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

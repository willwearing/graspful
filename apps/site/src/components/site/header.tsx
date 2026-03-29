"use client";

import Link from "next/link";
import { useTheme } from "@/lib/theme";

const navigationItems = [
  { href: "/how-graspful-works", label: "Agents" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

function SunIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 border-b border-foreground/[0.06] bg-transparent">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-foreground">
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-bold text-foreground tracking-tight no-underline"
            aria-label="Go to the Graspful homepage"
          >
            Graspful
          </Link>
          <div className="hidden sm:flex items-center gap-6" role="navigation" aria-label="Primary">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors no-underline"
              >
                {item.label}
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
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors no-underline"
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

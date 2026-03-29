"use client";

import Link from "next/link";
import { useTheme } from "@/lib/theme";

const navigationItems = [
  { href: "/how-graspful-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="site-width header-inner">
        <Link href="/" className="wordmark" aria-label="Go to the Graspful homepage">
          <span className="wordmark-mark" />
          <span>Graspful</span>
        </Link>
        <div className="header-actions">
          <nav aria-label="Primary" className="header-nav">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href} className="header-link">
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            className="theme-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>
    </header>
  );
}

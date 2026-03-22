"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Rocket,
  Terminal,
  Bot,
  FileCode,
  Palette,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

const sidebarLinks = [
  { href: "/docs", label: "Overview", icon: BookOpen },
  { href: "/docs/quickstart", label: "Quickstart", icon: Rocket },
  { href: "/docs/cli", label: "CLI Reference", icon: Terminal },
  { href: "/docs/mcp", label: "MCP Server", icon: Bot },
  { href: "/docs/course-schema", label: "Course Schema", icon: FileCode },
  { href: "/docs/brand-schema", label: "Brand Schema", icon: Palette },
  { href: "/docs/billing", label: "Billing", icon: CreditCard },
  { href: "/docs/review-gate", label: "Review Gate", icon: ShieldCheck },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-7xl px-6 py-12 md:px-12 gap-10">
      {/* Sidebar */}
      <aside className="hidden md:block w-56 shrink-0">
        <nav className="sticky top-[97px] space-y-1">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Documentation
          </p>
          {sidebarLinks.map((link) => {
            const isActive =
              link.href === "/docs"
                ? pathname === "/docs"
                : pathname.startsWith(link.href) && link.href !== "/docs";
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex overflow-x-auto px-4 py-2 gap-1">
          {sidebarLinks.map((link) => {
            const isActive =
              link.href === "/docs"
                ? pathname === "/docs"
                : pathname.startsWith(link.href) && link.href !== "/docs";
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  isActive
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <article className="min-w-0 flex-1 pb-20 md:pb-0">{children}</article>
    </div>
  );
}

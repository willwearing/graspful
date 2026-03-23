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
  Brain,
  Network,
  Target,
  BarChart3,
  Repeat,
  ListChecks,
  Gamepad2,
  TrendingUp,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

const sidebarGroups = [
  {
    label: "Getting Started",
    links: [
      { href: "/docs", label: "Overview", icon: BookOpen },
      { href: "/docs/how-it-works", label: "How It Works", icon: Brain },
      { href: "/docs/quickstart", label: "Quickstart", icon: Rocket },
      { href: "/docs/glossary", label: "Glossary", icon: GraduationCap },
    ],
  },
  {
    label: "Building Courses",
    links: [
      { href: "/docs/course-creation-guide", label: "Course Creation Guide", icon: ArrowRight },
      { href: "/docs/course-schema", label: "Course Schema", icon: FileCode },
      { href: "/docs/brand-schema", label: "Brand Schema", icon: Palette },
      { href: "/docs/review-gate", label: "Review Gate", icon: ShieldCheck },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/docs/cli", label: "CLI Reference", icon: Terminal },
      { href: "/docs/mcp", label: "MCP Server", icon: Bot },
    ],
  },
  {
    label: "Concepts",
    links: [
      { href: "/docs/concepts/knowledge-graph", label: "Knowledge Graph", icon: Network },
      { href: "/docs/concepts/mastery-learning", label: "Mastery Learning", icon: Target },
      { href: "/docs/concepts/adaptive-diagnostics", label: "Adaptive Diagnostics", icon: BarChart3 },
      { href: "/docs/concepts/spaced-repetition", label: "Spaced Repetition", icon: Repeat },
      { href: "/docs/concepts/task-selection", label: "Task Selection", icon: ListChecks },
      { href: "/docs/concepts/gamification", label: "Gamification", icon: Gamepad2 },
      { href: "/docs/concepts/learning-staircase", label: "Learning Staircase", icon: TrendingUp },
    ],
  },
  {
    label: "Business",
    links: [
      { href: "/docs/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

const allLinks = sidebarGroups.flatMap((g) => g.links);

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
        <nav className="sticky top-[97px] space-y-6">
          {sidebarGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.links.map((link) => {
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
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex overflow-x-auto px-4 py-2 gap-1">
          {allLinks.map((link) => {
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

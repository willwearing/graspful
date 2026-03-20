"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Settings } from "lucide-react";
import { useBrand } from "@/lib/brand/context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/browse", label: "Browse", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const brand = useBrand();
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const activePath = pendingPath ?? pathname;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card border-r border-border
          transform transition-transform duration-300
          md:relative md:translate-x-0 md:h-full
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand */}
        <div className="flex min-h-16 items-center gap-3 border-b border-border px-5">
          <span className="text-lg font-bold text-foreground">{brand.name}</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-2.5">
          {navItems.map((item) => {
            const isActive = activePath.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setPendingPath(item.href === pathname ? null : item.href);
                  onClose();
                }}
                className={`
                  flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium
                  transition-colors duration-200
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

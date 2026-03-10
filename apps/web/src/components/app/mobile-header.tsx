"use client";

import { Menu } from "lucide-react";
import { useBrand } from "@/lib/brand/context";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const brand = useBrand();

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-6 w-6" />
      </Button>
      <span className="text-lg font-bold text-foreground">{brand.name}</span>
      <div className="w-10" />
    </header>
  );
}

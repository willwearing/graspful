"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme/theme-provider";

const STORAGE_KEY = "theme-preference";

/**
 * Defaults marketing pages to light mode unless the user
 * has explicitly chosen a theme via the toggle.
 */
export function MarketingThemeForcer() {
  const { setTheme } = useTheme();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setTheme("light");
    }
  }, [setTheme]);

  return null;
}

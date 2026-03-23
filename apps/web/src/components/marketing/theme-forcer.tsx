"use client";

import { useEffect } from "react";

/**
 * Forces light mode on marketing pages.
 * Removes dark class from html, sets body bg to white.
 * Restores on unmount when navigating to app pages.
 */
export function MarketingThemeForcer() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const prevScheme = root.style.colorScheme;

    root.classList.remove("dark");
    root.style.colorScheme = "light";
    document.body.style.background = "#FFFFFF";
    document.body.style.color = "#0F172A";

    return () => {
      if (wasDark) {
        root.classList.add("dark");
        root.style.colorScheme = prevScheme;
        document.body.style.background = "";
        document.body.style.color = "";
      }
    };
  }, []);

  return null;
}

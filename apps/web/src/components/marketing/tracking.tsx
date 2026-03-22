"use client";

import { useEffect, useRef } from "react";
import { useBrand } from "@/lib/brand/context";
import { trackLandingScrollDepth } from "@/lib/posthog/events";

export function ScrollDepthTracker() {
  const brand = useBrand();
  const firedRef = useRef(new Set<number>());

  useEffect(() => {
    function handleScroll() {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const percent = Math.round((window.scrollY / scrollHeight) * 100);

      const thresholds = [25, 50, 75, 100] as const;
      for (const t of thresholds) {
        if (percent >= t && !firedRef.current.has(t)) {
          firedRef.current.add(t);
          trackLandingScrollDepth(t, brand.id);
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [brand.id]);

  return null;
}

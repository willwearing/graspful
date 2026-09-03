"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useBrand } from "@/lib/brand/context";
import {
  type LandingCtaLocation,
  trackLandingCtaClick,
} from "@/lib/posthog/events";

interface TrackedMarketingLinkProps {
  href: string;
  location: LandingCtaLocation;
  className?: string;
  children: ReactNode;
}

export function TrackedMarketingLink({
  href,
  location,
  className,
  children,
}: TrackedMarketingLinkProps) {
  const brand = useBrand();

  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackLandingCtaClick(location, brand.id, href)}
    >
      {children}
    </Link>
  );
}

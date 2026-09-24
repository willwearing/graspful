"use client";

import { createContext, useContext, type ReactNode } from "react";

interface CreatorOrgContextValue {
  orgSlug: string;
}

const CreatorOrgContext = createContext<CreatorOrgContextValue | null>(null);

export function CreatorOrgProvider({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: ReactNode;
}) {
  return (
    <CreatorOrgContext.Provider value={{ orgSlug }}>
      {children}
    </CreatorOrgContext.Provider>
  );
}

/**
 * Returns the signed-in user's active org slug for creator pages.
 * Must be used within a <CreatorOrgProvider>.
 */
export function useCreatorOrg(): CreatorOrgContextValue {
  const ctx = useContext(CreatorOrgContext);
  if (!ctx) {
    throw new Error("useCreatorOrg must be used within <CreatorOrgProvider>");
  }
  return ctx;
}

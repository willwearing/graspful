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

export function useCreatorOrg(): CreatorOrgContextValue {
  const ctx = useContext(CreatorOrgContext);
  if (!ctx) {
    throw new Error("useCreatorOrg must be used within <CreatorOrgProvider>");
  }
  return ctx;
}

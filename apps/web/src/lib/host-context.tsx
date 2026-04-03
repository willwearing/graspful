"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { HostSurface } from "@/lib/hosts";

const HostSurfaceContext = createContext<HostSurface>("local");

export function HostSurfaceProvider({
  surface,
  children,
}: {
  surface: HostSurface;
  children: ReactNode;
}) {
  return (
    <HostSurfaceContext.Provider value={surface}>
      {children}
    </HostSurfaceContext.Provider>
  );
}

export function useHostSurface(): HostSurface {
  return useContext(HostSurfaceContext);
}

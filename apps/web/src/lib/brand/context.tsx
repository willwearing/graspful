"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BrandConfig } from "./config";
import { defaultBrand } from "./defaults";

const BrandContext = createContext<BrandConfig>(defaultBrand);

export function BrandProvider({
  brand,
  children,
}: {
  brand: BrandConfig;
  children: ReactNode;
}) {
  return (
    <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
  );
}

export function useBrand(): BrandConfig {
  return useContext(BrandContext);
}

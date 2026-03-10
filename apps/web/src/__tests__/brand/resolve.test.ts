import { describe, it, expect } from "vitest";
import { resolveBrand } from "@/lib/brand/resolve";
import { defaultBrand } from "@/lib/brand/defaults";

describe("resolveBrand", () => {
  it("returns firefighter brand for localhost", async () => {
    const brand = await resolveBrand("localhost:3001");
    expect(brand.id).toBe("firefighter");
    expect(brand.name).toBe("FirefighterPrep");
  });

  it("returns default brand for unknown hosts", async () => {
    const brand = await resolveBrand("unknown-domain.com");
    expect(brand.id).toBe(defaultBrand.id);
  });

  it("strips port from hostname before resolving", async () => {
    const brand = await resolveBrand("localhost:3001");
    expect(brand.id).toBe("firefighter");
  });
});

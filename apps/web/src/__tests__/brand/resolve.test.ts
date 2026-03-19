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

  it("resolves known domain firefighterprep.audio", async () => {
    const brand = await resolveBrand("firefighterprep.audio");
    expect(brand.id).toBe("firefighter");
    expect(brand.name).toBe("FirefighterPrep");
  });

  it("falls back to default brand for unknown domains", async () => {
    const brand = await resolveBrand("totally-random-site.org");
    expect(brand).toEqual(defaultBrand);
  });

  it("brand config has correct orgId", async () => {
    const brand = await resolveBrand("localhost");
    expect(brand.orgSlug).toBe("firefighter-prep");
  });

  it("resolves 127.0.0.1 the same as localhost", async () => {
    const brand = await resolveBrand("127.0.0.1:3001");
    expect(brand.id).toBe("firefighter");
  });
});

import { describe, it, expect } from "vitest";
import { resolveBrand } from "../resolve";

describe("resolveBrand", () => {
  it("should resolve electricianprep.vercel.app to electrician brand", async () => {
    const brand = await resolveBrand("electricianprep.vercel.app");
    expect(brand.id).toBe("electrician");
    expect(brand.name).toBe("ElectricianPrep");
    expect(brand.domain).toBe("electricianprep.vercel.app");
  });

  it("should resolve firefighterprep.vercel.app to firefighter brand", async () => {
    const brand = await resolveBrand("firefighterprep.vercel.app");
    expect(brand.id).toBe("firefighter");
  });

  it("should resolve localhost with DEV_BRAND_ID=electrician", async () => {
    const origEnv = process.env.DEV_BRAND_ID;
    process.env.DEV_BRAND_ID = "electrician";
    const brand = await resolveBrand("localhost:3001");
    expect(brand.id).toBe("electrician");
    process.env.DEV_BRAND_ID = origEnv;
  });

  it("should fall back to default for unknown domain", async () => {
    const brand = await resolveBrand("unknown.example.com");
    expect(brand).toBeDefined();
    expect(brand.id).toBeDefined();
  });
});

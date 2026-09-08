import { describe, expect, test } from "bun:test";
import { assertLocalUrl, getE2eEnvironment } from "./e2e-env";

const local = {
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "local-service-key",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-key",
};

describe("E2E environment safety", () => {
  test("requires explicit local credentials before starting a test server", () => {
    expect(() => getE2eEnvironment({})).toThrow("E2E requires DATABASE_URL");
    expect(() => getE2eEnvironment({ ...local, SUPABASE_SERVICE_ROLE_KEY: "" })).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  test.each(["DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_BACKEND_URL"])(
    "rejects a hosted %s without printing credentials",
    (name) => {
      const value = name.endsWith("DATABASE_URL") || name === "DIRECT_URL"
        ? "postgresql://secret:password@db.example.com/database"
        : "https://example.com";
      try {
        getE2eEnvironment({ ...local, [name]: value });
        throw new Error("Expected hosted environment to fail");
      } catch (error) {
        expect(String(error)).toContain(`E2E refuses non-loopback ${name}`);
        expect(String(error)).not.toContain("secret");
        expect(String(error)).not.toContain("password");
      }
    },
  );

  test("requires matching frontend and backend Supabase origins", () => {
    expect(() => getE2eEnvironment({ ...local, SUPABASE_URL: "http://localhost:54321" })).toThrow("same local Supabase origin");
  });

  test("uses the local database for direct migrations and disables live integrations", () => {
    const result = getE2eEnvironment({ ...local, POSTHOG_API_KEY: "live-key", POSTHOG_PERSONAL_API_KEY: "live-key", POSTHOG_PROJECT_ID: "live-project", STRIPE_SECRET_KEY: "live-key", VERCEL_API_TOKEN: "live-key" });
    expect(result.DIRECT_URL).toBe(local.DATABASE_URL);
    expect(result.NEXT_PUBLIC_BACKEND_URL).toBe("http://localhost:3000/api/v1");
    expect(result.POSTHOG_API_KEY).toBe("");
    expect(result.POSTHOG_PERSONAL_API_KEY).toBe("");
    expect(result.POSTHOG_PROJECT_ID).toBe("");
    expect(result.STRIPE_SECRET_KEY).toBe("");
    expect(result.VERCEL_API_TOKEN).toBe("");
  });

  test("rejects a mismatched local backend port", () => {
    expect(() => getE2eEnvironment({ ...local, NEXT_PUBLIC_BACKEND_URL: "http://localhost:3333/api/v1" })).toThrow("local port 3000");
  });

  test("accepts IPv6 loopback and rejects host names that only contain localhost", () => {
    expect(assertLocalUrl("http://[::1]:54321", "test")).toBe("http://[::1]:54321");
    expect(() => assertLocalUrl("http://localhost.example.com", "test")).toThrow("non-loopback");
  });
});

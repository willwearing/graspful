type Environment = Record<string, string | undefined>;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function required(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`E2E requires ${name} from local Supabase. See docs/local-e2e.md. Application .env files are not used for test credentials.`);
  }
  return value;
}

export function assertLocalUrl(value: string, name: string, protocols = ["http:"]): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`E2E requires a valid local ${name}. See docs/local-e2e.md.`);
  }
  if (!LOOPBACK_HOSTS.has(url.hostname) || !protocols.includes(url.protocol)) {
    throw new Error(`E2E refuses non-loopback ${name}. Tests create and delete records. Use isolated local Supabase; see docs/local-e2e.md.`);
  }
  return value;
}

/** Validate before Playwright starts servers or imports tests that mutate data. */
export function getE2eEnvironment(env: Environment): Record<string, string> {
  const databaseUrl = assertLocalUrl(required(env, "DATABASE_URL"), "DATABASE_URL", ["postgres:", "postgresql:"]);
  const directUrl = assertLocalUrl(env.DIRECT_URL || databaseUrl, "DIRECT_URL", ["postgres:", "postgresql:"]);
  const supabaseUrl = assertLocalUrl(required(env, "SUPABASE_URL"), "SUPABASE_URL");
  const publicSupabaseUrl = assertLocalUrl(required(env, "NEXT_PUBLIC_SUPABASE_URL"), "NEXT_PUBLIC_SUPABASE_URL");
  if (new URL(supabaseUrl).origin !== new URL(publicSupabaseUrl).origin) {
    throw new Error("E2E requires SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL to use the same local Supabase origin.");
  }
  const backendUrl = assertLocalUrl(env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1", "NEXT_PUBLIC_BACKEND_URL");
  if (new URL(backendUrl).port !== "3000" || new URL(backendUrl).pathname.replace(/\/$/, "") !== "/api/v1") {
    throw new Error("E2E requires NEXT_PUBLIC_BACKEND_URL to use local port 3000 and /api/v1, matching the API fixtures.");
  }

  return {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
    SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_URL: publicSupabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: required(env, "SUPABASE_SERVICE_ROLE_KEY"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: required(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_BACKEND_URL: backendUrl,
    APP_URL: "http://localhost:3001",
    ALLOWED_ORIGINS: "http://localhost:3001,http://localhost:3002,http://graspful.ai:3001,http://app.graspful.ai:3001",
    // Override optional settings from app .env files when a local server starts.
    POSTHOG_API_KEY: "",
    POSTHOG_PERSONAL_API_KEY: "",
    POSTHOG_PROJECT_ID: "",
    NEXT_PUBLIC_POSTHOG_KEY: "",
    VERCEL_API_TOKEN: "",
    VERCEL_PROJECT_ID: "",
    VERCEL_TEAM_ID: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    STRIPE_PRICE_INDIVIDUAL_MONTHLY: "",
    STRIPE_PRICE_INDIVIDUAL_YEARLY: "",
    STRIPE_PRICE_TEAM_MONTHLY: "",
    STRIPE_PRICE_TEAM_YEARLY: "",
  };
}

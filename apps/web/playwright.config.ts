import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { config as dotenvConfig } from "dotenv";

const backendDir = path.resolve(__dirname, "../../backend");

// Load backend .env for SUPABASE_SERVICE_ROLE_KEY (needed by e2e auth helpers)
dotenvConfig({ path: path.resolve(backendDir, ".env") });
// Load web app .env.local for NEXT_PUBLIC_SUPABASE_URL
dotenvConfig({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun run start:prod",
      cwd: backendDir,
      url: "http://localhost:3000/api/v1/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "bun run dev",
      url: "http://localhost:3001",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});

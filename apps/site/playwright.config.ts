import { defineConfig, devices } from "@playwright/test";
import { getE2eEnvironment } from "../../scripts/e2e-env";

const testEnv = getE2eEnvironment(process.env);
Object.assign(process.env, testEnv);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run dev",
    env: testEnv,
    url: "http://localhost:3002",
    reuseExistingServer: process.env.E2E_REUSE_EXISTING_SERVER === "1",
    timeout: 120_000,
  },
});

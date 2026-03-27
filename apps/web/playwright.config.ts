import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const backendDir = path.resolve(__dirname, "../../backend");

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

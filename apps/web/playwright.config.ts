import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { getE2eEnvironment } from "../../scripts/e2e-env";

const backendDir = path.resolve(__dirname, "../../backend");

const testEnv = getE2eEnvironment(process.env);
Object.assign(process.env, testEnv);
const reuseExistingServer = process.env.E2E_REUSE_EXISTING_SERVER === "1";

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
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--host-resolver-rules=MAP graspful.ai 127.0.0.1,MAP app.graspful.ai 127.0.0.1,MAP firefighterprep.vercel.app 127.0.0.1",
          ],
        },
      },
    },
  ],
  webServer: [
    {
      command: "bun run build && TS_NODE_PROJECT=tsconfig.runtime.json node -r tsconfig-paths/register dist/main.js",
      cwd: backendDir,
      env: { ...testEnv, NODE_ENV: "development" },
      url: "http://localhost:3000/api/v1/health",
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: "bun run dev",
      env: testEnv,
      url: "http://localhost:3001",
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});

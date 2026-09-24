import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "./src/test-server-only.ts"),
      "@": path.resolve(__dirname, "./src"),
      "@graspful/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
});

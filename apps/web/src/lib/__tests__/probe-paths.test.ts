import { describe, expect, it } from "vitest";
import { isProbePath } from "@/lib/probe-paths";

describe("isProbePath", () => {
  // Paths seen in Vercel request logs from scanners hitting graspful.ai hosts.
  it.each([
    "/.env",
    "/%2eenv",
    "/.env%3Ffoo=bar",
    "/static/app/.env",
    "/settings%2F.env",
    "/.git/config%3F.css",
    "/.aws/credentials%3F.txt",
    "/google-credentials.json",
    "/gcp-credentials.json",
    "/proc/self/environ",
    "/var/run/secrets/kubernetes.io/serviceaccount/token",
    "/..../..../..../..../.env",
    "/img../.env",
    "/laravel../config/database.php",
    "/wp-json/wp/v2/users/me",
    "/wp-admin/install.php",
    "/wp-login.php",
    "/xmlrpc.php",
    "/cgi-bin/luci",
    "/phpinfo.php",
    "/admin/config.ini",
    "/backup.sql",
  ])("blocks %s", (path) => {
    expect(isProbePath(path)).toBe(true);
  });

  it.each([
    "/",
    "/sign-in",
    "/sign-up",
    "/dashboard",
    "/creator/settings/api-keys",
    "/docs/concepts/learning-staircase",
    "/docs/brand-schema",
    "/learn/posthog-use-case-selling",
    "/study/abc-123",
    "/.well-known",
    "/auth/callback",
    "/academies",
  ])("allows %s", (path) => {
    expect(isProbePath(path)).toBe(false);
  });

  it("does not throw on malformed percent encoding", () => {
    expect(isProbePath("/%E0%A4%A")).toBe(false);
  });
});

import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";

const nextConfig: NextConfig = {
  transpilePackages: ["@niche-audio-prep/shared"],
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
};

const enablePostHogSourceMaps =
  process.env.NODE_ENV === "production" &&
  Boolean(process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID);

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY || "",
  projectId: process.env.POSTHOG_PROJECT_ID,
  host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
  sourcemaps: {
    enabled: enablePostHogSourceMaps,
    releaseName: "graspful-web",
    releaseVersion:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    deleteAfterUpload: true,
  },
});

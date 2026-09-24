import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@graspful/shared", "@graspful/creator-ui"],
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@graspful/shared", "@graspful/creator-ui"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // Cloud assets (cloud.png) and avatar (data: URLs) are local / inline,
  // so we don't need remotePatterns. Keep the option open for future use.
  images: {
    remotePatterns: [],
  },
  allowedDevOrigins: ["*.space-z.ai", "*.vercel.app"],
};

export default nextConfig;

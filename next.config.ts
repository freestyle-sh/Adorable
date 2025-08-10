import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: false,
  reactStrictMode: false, // Disable React strict mode to prevent double rendering
  experimental: {
    reactCompiler: false, // Disable React compiler if it's causing issues
  },
};

export default nextConfig;

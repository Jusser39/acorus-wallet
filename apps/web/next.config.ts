import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@acorus/shared", "@acorus/wallet-core"],
};

export default nextConfig;

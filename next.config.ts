import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  assetPrefix: "/_assets/portal",
  images: {
    path: "/_assets/portal/_next/image",
  },
};

export default nextConfig;

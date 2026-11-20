import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Content is edited live through the admin panel and read from Postgres on
  // each request, so pages render dynamically rather than at build time.
  cacheComponents: false,
  partialPrefetching: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;

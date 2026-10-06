import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security Hardening: Never emit browser source maps in production to prevent code inspection
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;

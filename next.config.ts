import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@tanstack/react-query",
      "date-fns",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.airtableusercontent.com" },
      { protocol: "https", hostname: "*.cloudflarestream.com" },
      { protocol: "https", hostname: "imagedelivery.net" },
      { protocol: "https", hostname: "videodelivery.net" },
    ],
  },
};

export default nextConfig;

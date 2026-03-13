import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@tanstack/react-query",
      "date-fns",
      "framer-motion",
      "recharts",
      "zod",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "sonner",
      "react-hook-form",
      "@hookform/resolvers",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000, // 1년 — Cloudflare/Supabase 이미지는 immutable
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "*.airtableusercontent.com" },
      { protocol: "https", hostname: "*.cloudflarestream.com" },
      { protocol: "https", hostname: "imagedelivery.net" },
      { protocol: "https", hostname: "videodelivery.net" },
      { protocol: "https", hostname: "pub-r2.hamkkebom.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  headers: async () => [
    {
      source: "/:path*.(js|css|woff2|png|jpg|svg|ico)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
      ],
    },
  ],
};

export default nextConfig;

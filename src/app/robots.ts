import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/stars/",
          "/auth/",
          "/api/",
          "/bookmarks",
          "/likes",
          "/library",
          "/followers",
          "/following",
          "/offline",
          "/install",
        ],
      },
    ],
    sitemap: "https://hamkkebom.com/sitemap.xml",
  };
}

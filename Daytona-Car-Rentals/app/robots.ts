import type { MetadataRoute } from "next";

import { BASE_URL } from "@/lib/data/localBusinessSchema";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dashboard/", "/booking/", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

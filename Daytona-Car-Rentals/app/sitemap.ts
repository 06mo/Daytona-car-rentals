import type { MetadataRoute } from "next";

import { BASE_URL } from "@/lib/data/localBusinessSchema";
import { vehicles } from "@/lib/data/vehicles";

const staticPages = [
  { path: "/", priority: 1 },
  { path: "/fleet", priority: 0.9 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.6 },
  { path: "/rentals/daytona-beach-airport", priority: 0.85 },
  { path: "/rentals/suv", priority: 0.85 },
  { path: "/rentals/luxury", priority: 0.85 },
  { path: "/rentals/van", priority: 0.85 },
  { path: "/rentals/daytona-500", priority: 0.85 },
  { path: "/rentals/bike-week", priority: 0.85 },
  { path: "/rentals/spring-break", priority: 0.85 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${BASE_URL}${page.path}`,
    lastModified: new Date(),
    priority: page.priority,
  }));

  const vehicleEntries: MetadataRoute.Sitemap = vehicles.map((vehicle) => ({
    url: `${BASE_URL}/fleet/${vehicle.id}`,
    lastModified: new Date(),
    priority: 0.7,
  }));

  return [...staticEntries, ...vehicleEntries];
}

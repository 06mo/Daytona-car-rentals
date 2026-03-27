import type { MetadataRoute } from "next";

import { BASE_URL } from "@/lib/data/localBusinessSchema";
import { FirebaseConfigError } from "@/lib/firebase/firestore";
import { listVehicles } from "@/lib/services/vehicleService";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${BASE_URL}${page.path}`,
    lastModified: new Date(),
    priority: page.priority,
  }));

  try {
    const vehicles = await listVehicles();

    return [
      ...staticEntries,
      ...vehicles.map((vehicle) => ({
        url: `${BASE_URL}/fleet/${vehicle.id}`,
        lastModified: vehicle.updatedAt,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    if (!(error instanceof FirebaseConfigError)) {
      console.error("[sitemap] Failed to include vehicle pages:", error);
    }

    return staticEntries;
  }
}

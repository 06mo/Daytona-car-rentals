import type { Partner } from "@/types";

const createdAt = new Date("2026-01-01T12:00:00Z");
const updatedAt = new Date("2026-01-01T12:00:00Z");

export const partnersSeed: Omit<Partner, "id">[] = [
  {
    name: "Hilton Daytona Beach Resort",
    code: "hilton-daytona",
    contactEmail: "concierge@hiltondaytona.example.com",
    status: "active",
    createdAt,
    updatedAt,
  },
  {
    name: "Ocean Walk Resort",
    code: "ocean-walk",
    contactEmail: "front-desk@oceanwalk.example.com",
    status: "active",
    createdAt,
    updatedAt,
  },
  {
    name: "The Plaza Hotel",
    code: "plaza-hotel",
    contactEmail: "concierge@plazadaytona.example.com",
    status: "active",
    createdAt,
    updatedAt,
  },
];

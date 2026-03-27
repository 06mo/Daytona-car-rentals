import { notFound } from "next/navigation";

import { BookingWizard } from "@/components/booking/BookingWizard";
import { getVehicleById } from "@/lib/services/vehicleService";

type PageProps = {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ end?: string; location?: string; start?: string }>;
};

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { vehicleId } = await params;
  const resolvedSearchParams = await searchParams;
  const vehicle = await getVehicleById(vehicleId);

  if (!vehicle) {
    notFound();
  }

  return (
    <BookingWizard
      initialEndDate={resolvedSearchParams.end}
      initialLocation={resolvedSearchParams.location}
      initialStartDate={resolvedSearchParams.start}
      vehicle={vehicle}
    />
  );
}

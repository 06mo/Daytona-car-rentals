export type VehicleCategory =
  | "economy"
  | "suv"
  | "luxury"
  | "van"
  | "truck"
  | "convertible";

export type TransmissionType = "automatic" | "manual";

export type MileagePolicy = "unlimited" | number;

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  dailyRate: number;
  depositAmount: number;
  images: string[];
  features: string[];
  seats: number;
  transmission: TransmissionType;
  mileagePolicy: MileagePolicy;
  available: boolean;
  location: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type VehicleFilters = {
  available?: boolean;
  category?: VehicleCategory;
  location?: string;
  maxDailyRate?: number;
};

export type FleetFilters = {
  categories: VehicleCategory[];
  minPrice: number;
  maxPrice: number;
  minSeats: number;
  transmission: TransmissionType | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
};

export type VehicleSort = "price_asc" | "price_desc" | "newest";

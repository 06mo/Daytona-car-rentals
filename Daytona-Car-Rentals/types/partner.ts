export type PartnerStatus = "active" | "inactive";

export type Partner = {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  status: PartnerStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PartnerStats = {
  partner: Partner;
  totalBookings: number;
  last30DayBookings: number;
  totalRevenueCents: number;
};

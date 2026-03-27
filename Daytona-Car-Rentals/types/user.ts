export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type UserRole = "customer" | "admin";

export type UserAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  smsOptIn?: boolean;
  dateOfBirth: string;
  address?: UserAddress;
  verificationStatus: VerificationStatus;
  role: UserRole;
  stripeCustomerId?: string;
  completedBookingsCount?: number;
  repeatCustomer?: boolean;
  repeatCustomerSince?: Date;
  fastTrackEligible?: boolean;
  loyaltyDiscountEligible?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
};

export type UpsertUserProfileInput = Omit<UserProfile, "createdAt" | "updatedAt"> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type AuthUser = {
  email: string | null;
  role: UserRole;
  token: string;
  userId: string;
};

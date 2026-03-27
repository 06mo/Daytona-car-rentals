export const BOOKING_DRAFT_KEY_PREFIX = "daytona-booking-draft";
export const BOOKING_RESUME_KEY_PREFIX = "daytona-booking-resume";

export function getBookingDraftStorageKey(vehicleId: string) {
  return `${BOOKING_DRAFT_KEY_PREFIX}:${vehicleId}`;
}

export function getBookingResumeStorageKey(vehicleId: string) {
  return `${BOOKING_RESUME_KEY_PREFIX}:${vehicleId}`;
}

export type RentalTermsSection = {
  title: string;
  body: string[];
};

export const rentalTermsSections: RentalTermsSection[] = [
  {
    title: "Eligibility and Driver Requirements",
    body: [
      "The renter and any approved additional driver must hold a valid driver's license and meet Daytona Car Rentals age requirements at pickup.",
      "The named renter is responsible for the vehicle, all authorized drivers, and all charges connected to the reservation.",
      "We may refuse or cancel a rental if identification, payment, or insurance requirements are not satisfied at pickup.",
    ],
  },
  {
    title: "Reservations, Payment, and Deposit",
    body: [
      "The deposit charged at booking secures the vehicle and reservation window. Remaining balance, approved adjustments, tolls, fuel, damage, and other eligible charges may still be due.",
      "Pricing is based on the selected rental period, protection package, and extras. Changes to the booking may change the final total.",
      "Chargebacks or payment disputes do not cancel the renter's responsibility for valid rental charges.",
    ],
  },
  {
    title: "Pickup, Return, and Late Fees",
    body: [
      "The vehicle must be picked up and returned at the agreed location and time unless Daytona Car Rentals approves a change in writing.",
      "Late returns may result in additional daily rental charges, extension adjustments, or recovery action if the vehicle is not returned when due.",
      "The renter must return the vehicle in substantially the same condition, with normal wear excepted.",
    ],
  },
  {
    title: "Protection, Insurance, and Damage Responsibility",
    body: [
      "Protection package terms shown during booking become part of this rental agreement. Coverage decisions remain subject to Daytona review and any required verification.",
      "If the renter selects Basic protection, the renter confirms they maintain valid qualifying insurance and may be required to provide proof before pickup.",
      "The renter remains responsible for excluded losses, misuse, unauthorized drivers, prohibited use, interior damage, smoking damage, missing equipment, towing, impound fees, and administrative costs to the extent allowed by law.",
    ],
  },
  {
    title: "Prohibited Use",
    body: [
      "The vehicle may not be used for illegal activity, racing, towing unless approved, off-road use, driver training, commercial haulage, or by any unauthorized or impaired driver.",
      "Use that violates law, this agreement, partner/platform requirements, or insurer/provider restrictions may void protection or trigger additional liability.",
    ],
  },
  {
    title: "Accidents, Tolls, and Violations",
    body: [
      "The renter must report accidents, damage, theft, warning lights, or mechanical issues as soon as practical and cooperate with claims handling.",
      "The renter is responsible for tolls, tickets, traffic violations, parking charges, towing, storage, and related admin fees incurred during the rental period.",
      "Claims evidence, inspection checklists, photos, signatures, and booking records may be used to resolve disputes and damage responsibility.",
    ],
  },
  {
    title: "Cancellations and Changes",
    body: [
      "Cancellation, refund, and no-show treatment depend on when the request is made, booking status, and whether the vehicle has already been placed on hold for the renter.",
      "Booking changes, including date extensions, location changes, or protection changes, are subject to availability and repricing.",
    ],
  },
  {
    title: "Acceptance",
    body: [
      "By continuing to payment, the renter confirms that they reviewed these rental terms, the booking summary, and the selected protection package.",
      "These terms supplement any pickup checklist, damage acknowledgment, signature capture, platform rules, or partner-specific booking obligations associated with the reservation.",
    ],
  },
];

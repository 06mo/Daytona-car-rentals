import "server-only";

import type {
  EmbeddedPolicyBindRequest,
  EmbeddedPolicyBindResult,
  EmbeddedPolicyQuoteRequest,
  EmbeddedPolicyQuoteResult,
  ProviderAdapter,
  RenterPolicyVerificationRequest,
  RenterPolicyVerificationResult,
} from "@/lib/insurance/providers/types";

const MOCK_PROVIDER_ID = "mock-embedded";

function getMockBehavior() {
  const behavior = process.env.MOCK_EMBEDDED_POLICY_BEHAVIOR?.trim().toLowerCase();

  if (behavior === "manual_review" || behavior === "unavailable" || behavior === "bound") {
    return behavior;
  }

  return "manual_review";
}

function getMockRenterPolicyBehavior() {
  const behavior = process.env.MOCK_RENTER_POLICY_PROVIDER_BEHAVIOR?.trim().toLowerCase();

  if (behavior === "verified" || behavior === "rejected" || behavior === "manual_review" || behavior === "unavailable") {
    return behavior;
  }

  return "manual_review";
}

const mockEmbeddedProvider: ProviderAdapter = {
  id: MOCK_PROVIDER_ID,
  async getQuote(input: EmbeddedPolicyQuoteRequest): Promise<EmbeddedPolicyQuoteResult> {
    const behavior = getMockBehavior();
    const providerReferenceId = `quote-${input.bookingId}-${Date.now()}`;

    if (behavior === "unavailable") {
      return {
        status: "unavailable",
        providerId: MOCK_PROVIDER_ID,
        providerReferenceId,
        blockingReasons: ["provider_unavailable"],
        errorMessage: "Mock embedded provider is configured as unavailable.",
        rawPayload: { behavior },
      };
    }

    if (behavior === "manual_review") {
      return {
        status: "manual_review",
        providerId: MOCK_PROVIDER_ID,
        providerReferenceId,
        blockingReasons: ["manual_review_required"],
        approvalReasons: [],
        rawPayload: { behavior },
      };
    }

    return {
      status: "quoted",
      providerId: MOCK_PROVIDER_ID,
      providerReferenceId,
      premiumCents: 0,
      blockingReasons: [],
      approvalReasons: ["Mock embedded provider returned a quote."],
      rawPayload: { behavior },
    };
  },
  async bindPolicy(input: EmbeddedPolicyBindRequest): Promise<EmbeddedPolicyBindResult> {
    const behavior = getMockBehavior();
    const providerReferenceId = input.quoteReferenceId ?? `bind-${input.bookingId}-${Date.now()}`;

    if (behavior === "unavailable") {
      return {
        status: "failed",
        providerId: MOCK_PROVIDER_ID,
        providerReferenceId,
        blockingReasons: ["provider_unavailable"],
        errorMessage: "Mock embedded provider bind failed because the provider is unavailable.",
        rawPayload: { behavior },
      };
    }

    if (behavior === "manual_review") {
      return {
        status: "manual_review",
        providerId: MOCK_PROVIDER_ID,
        providerReferenceId,
        blockingReasons: ["manual_review_required"],
        approvalReasons: [],
        rawPayload: { behavior },
      };
    }

    return {
      status: "bound",
      providerId: MOCK_PROVIDER_ID,
      providerReferenceId,
      policyNumber: `MOCK-${Date.now()}`,
      blockingReasons: [],
      approvalReasons: ["Embedded mock policy bound successfully."],
      rawPayload: { behavior },
    };
  },
  async verifyRenterPolicy(input: RenterPolicyVerificationRequest): Promise<RenterPolicyVerificationResult> {
    const behavior = getMockRenterPolicyBehavior();
    const providerReferenceId = `verify-${input.bookingId}-${Date.now()}`;

    if (behavior === "unavailable") {
      return {
        status: "unverifiable",
        providerId: MOCK_PROVIDER_ID,
        providerReferenceId,
        blockingReasons: ["provider_unavailable"],
        errorMessage: "Mock renter policy provider is unavailable.",
        rawPayload: { behavior },
      };
    }

    if (behavior === "rejected") {
      return {
        status: "rejected",
        providerId: MOCK_PROVIDER_ID,
        providerReferenceId,
        blockingReasons: ["manual_review_required"],
        carrierName: input.carrierName,
        errorMessage: "Mock renter policy provider rejected the submitted policy.",
        rawPayload: { behavior },
      };
    }

    if (behavior === "manual_review") {
      return {
        status: "manual_review",
        providerId: MOCK_PROVIDER_ID,
        providerReferenceId,
        blockingReasons: ["manual_review_required"],
        carrierName: input.carrierName,
        rawPayload: { behavior },
      };
    }

    return {
      status: "verified",
      providerId: MOCK_PROVIDER_ID,
      providerReferenceId,
      blockingReasons: [],
      carrierName: input.carrierName,
      namedInsuredMatch: true,
      hasComprehensiveCollision: true,
      rentalUseConfirmed: true,
      approvalReasons: ["Mock renter policy provider verified the policy."],
      rawPayload: { behavior },
    };
  },
};

export function getEmbeddedInsuranceProvider(): ProviderAdapter {
  const configuredProvider = process.env.INSURANCE_EMBEDDED_PROVIDER?.trim().toLowerCase();

  if (!configuredProvider || configuredProvider === "mock") {
    return mockEmbeddedProvider;
  }

  return mockEmbeddedProvider;
}

export { mockEmbeddedProvider };

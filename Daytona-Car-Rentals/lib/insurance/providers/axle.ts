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

const AXLE_PROVIDER_ID = "axle";
const DEFAULT_TIMEOUT_MS = 8_000;

function getAxleConfig() {
  return {
    apiKey: process.env.AXLE_API_KEY?.trim(),
    verifyPolicyUrl: process.env.AXLE_VERIFY_POLICY_URL?.trim(),
    quoteUrl: process.env.AXLE_EMBEDDED_QUOTE_URL?.trim(),
    bindUrl: process.env.AXLE_EMBEDDED_BIND_URL?.trim(),
    timeoutMs: Number(process.env.AXLE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
  };
}

function createAbortSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function postJson<TRequest, TResponse>(url: string | undefined, apiKey: string | undefined, body: TRequest): Promise<TResponse> {
  if (!url || !apiKey) {
    throw new Error("Axle provider is not configured.");
  }

  const { signal, clear } = createAbortSignal(getAxleConfig().timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    const data = (await response.json().catch(() => null)) as TResponse | null;

    if (!response.ok || !data) {
      throw new Error(`Axle request failed with status ${response.status}.`);
    }

    return data;
  } finally {
    clear();
  }
}

type AxleVerifyPolicyResponse = {
  id?: string;
  status?: string;
  carrier_name?: string;
  named_insured_match?: boolean;
  effective_date?: string;
  expiration_date?: string;
  comp_collision_present?: boolean;
  liability_limits_cents?: number;
  rental_use_confirmed?: boolean;
  reasons?: string[];
};

type AxleQuoteResponse = {
  id?: string;
  status?: string;
  premium_cents?: number;
  reasons?: string[];
};

type AxleBindResponse = {
  id?: string;
  status?: string;
  policy_number?: string;
  reasons?: string[];
};

function parseDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function normalizeReasons(reasons: string[] | undefined) {
  return (reasons ?? []).filter(Boolean) as RenterPolicyVerificationResult["blockingReasons"];
}

export const axleProvider: ProviderAdapter = {
  id: AXLE_PROVIDER_ID,
  async getQuote(input: EmbeddedPolicyQuoteRequest): Promise<EmbeddedPolicyQuoteResult> {
    const config = getAxleConfig();

    try {
      const response = await postJson<EmbeddedPolicyQuoteRequest, AxleQuoteResponse>(config.quoteUrl, config.apiKey, input);

      if (response.status === "quoted") {
        return {
          status: "quoted",
          providerId: AXLE_PROVIDER_ID,
          providerReferenceId: response.id,
          premiumCents: response.premium_cents,
          blockingReasons: [],
          approvalReasons: ["Axle returned an embedded coverage quote."],
          rawPayload: response,
        };
      }

      return {
        status: "manual_review",
        providerId: AXLE_PROVIDER_ID,
        providerReferenceId: response.id,
        blockingReasons: normalizeReasons(response.reasons).length ? normalizeReasons(response.reasons) : ["manual_review_required"],
        errorMessage: "Axle did not return a quotable embedded coverage response.",
        rawPayload: response,
      };
    } catch (error) {
      return {
        status: "unavailable",
        providerId: AXLE_PROVIDER_ID,
        blockingReasons: ["provider_unavailable"],
        errorMessage: error instanceof Error ? error.message : "Axle quote request failed.",
      };
    }
  },
  async bindPolicy(input: EmbeddedPolicyBindRequest): Promise<EmbeddedPolicyBindResult> {
    const config = getAxleConfig();

    try {
      const response = await postJson<EmbeddedPolicyBindRequest, AxleBindResponse>(config.bindUrl, config.apiKey, input);

      if (response.status === "bound") {
        return {
          status: "bound",
          providerId: AXLE_PROVIDER_ID,
          providerReferenceId: response.id,
          policyNumber: response.policy_number,
          blockingReasons: [],
          approvalReasons: ["Axle embedded policy bound successfully."],
          rawPayload: response,
        };
      }

      return {
        status: "manual_review",
        providerId: AXLE_PROVIDER_ID,
        providerReferenceId: response.id,
        blockingReasons: normalizeReasons(response.reasons).length ? normalizeReasons(response.reasons) : ["manual_review_required"],
        errorMessage: "Axle could not bind the embedded policy.",
        rawPayload: response,
      };
    } catch (error) {
      return {
        status: "failed",
        providerId: AXLE_PROVIDER_ID,
        blockingReasons: ["provider_unavailable"],
        errorMessage: error instanceof Error ? error.message : "Axle bind request failed.",
      };
    }
  },
  async verifyRenterPolicy(input: RenterPolicyVerificationRequest): Promise<RenterPolicyVerificationResult> {
    const config = getAxleConfig();

    try {
      const response = await postJson<RenterPolicyVerificationRequest, AxleVerifyPolicyResponse>(
        config.verifyPolicyUrl,
        config.apiKey,
        input,
      );

      const blockingReasons = normalizeReasons(response.reasons);

      if (response.status === "verified") {
        return {
          status: "verified",
          providerId: AXLE_PROVIDER_ID,
          providerReferenceId: response.id,
          blockingReasons,
          carrierName: response.carrier_name,
          namedInsuredMatch: response.named_insured_match,
          effectiveDate: parseDate(response.effective_date),
          expirationDate: parseDate(response.expiration_date),
          hasComprehensiveCollision: response.comp_collision_present,
          liabilityLimitsCents: response.liability_limits_cents,
          rentalUseConfirmed: response.rental_use_confirmed,
          approvalReasons: ["Axle verified the renter policy."],
          rawPayload: response,
        };
      }

      if (response.status === "expired") {
        return {
          status: "expired",
          providerId: AXLE_PROVIDER_ID,
          providerReferenceId: response.id,
          blockingReasons: blockingReasons.length ? blockingReasons : ["coverage_expired"],
          carrierName: response.carrier_name,
          expirationDate: parseDate(response.expiration_date),
          rawPayload: response,
        };
      }

      if (response.status === "rejected") {
        return {
          status: "rejected",
          providerId: AXLE_PROVIDER_ID,
          providerReferenceId: response.id,
          blockingReasons: blockingReasons.length ? blockingReasons : ["manual_review_required"],
          carrierName: response.carrier_name,
          namedInsuredMatch: response.named_insured_match,
          effectiveDate: parseDate(response.effective_date),
          expirationDate: parseDate(response.expiration_date),
          hasComprehensiveCollision: response.comp_collision_present,
          liabilityLimitsCents: response.liability_limits_cents,
          rentalUseConfirmed: response.rental_use_confirmed,
          rawPayload: response,
        };
      }

      return {
        status: "manual_review",
        providerId: AXLE_PROVIDER_ID,
        providerReferenceId: response.id,
        blockingReasons: blockingReasons.length ? blockingReasons : ["manual_review_required"],
        carrierName: response.carrier_name,
        rawPayload: response,
      };
    } catch (error) {
      return {
        status: "unverifiable",
        providerId: AXLE_PROVIDER_ID,
        blockingReasons: ["provider_unavailable"],
        errorMessage: error instanceof Error ? error.message : "Axle verification request failed.",
      };
    }
  },
};

export function getAxleProvider() {
  return axleProvider;
}

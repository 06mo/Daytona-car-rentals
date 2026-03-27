import "server-only";

import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitPolicy = {
  id: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const globalRateLimitStore = globalThis as typeof globalThis & {
  __daytonaRateLimitStore?: Map<string, RateLimitEntry>;
};

const store = globalRateLimitStore.__daytonaRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalRateLimitStore.__daytonaRateLimitStore) {
  globalRateLimitStore.__daytonaRateLimitStore = store;
}

export const rateLimitPolicies = {
  adminMutation: { id: "admin-mutation", limit: 60, windowMs: 10 * 60 * 1000 },
  availabilityLookup: { id: "availability-lookup", limit: 60, windowMs: 60 * 1000 },
  bookingCancel: { id: "booking-cancel", limit: 6, windowMs: 60 * 60 * 1000 },
  bookingCreate: { id: "booking-create", limit: 5, windowMs: 10 * 60 * 1000 },
  completeRegistration: { id: "complete-registration", limit: 10, windowMs: 60 * 60 * 1000 },
  documentUpload: { id: "document-upload", limit: 20, windowMs: 60 * 60 * 1000 },
  magicLink: { id: "magic-link", limit: 3, windowMs: 10 * 60 * 1000 },
  paymentIntentCreate: { id: "payment-intent-create", limit: 10, windowMs: 10 * 60 * 1000 },
  profileUpdate: { id: "profile-update", limit: 15, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, RateLimitPolicy>;

export function enforceRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  subject?: string,
): NextResponse | null {
  const result = checkRateLimit(policy, subject ?? getRequestFingerprint(request));

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Too many requests. Please wait before trying again.",
    },
    {
      status: 429,
      headers: buildRateLimitHeaders(result),
    },
  );
}

function checkRateLimit(policy: RateLimitPolicy, subject: string): RateLimitResult {
  const now = Date.now();
  const key = `${policy.id}:${subject}`;

  pruneExpiredEntries(now);

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + policy.windowMs;
    store.set(key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      limit: policy.limit,
      remaining: Math.max(policy.limit - 1, 0),
      resetAt,
      retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
    };
  }

  if (current.count >= policy.limit) {
    return {
      allowed: false,
      limit: policy.limit,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    limit: policy.limit,
    remaining: Math.max(policy.limit - current.count, 0),
    resetAt: current.resetAt,
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}

function getRequestFingerprint(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  const ip = realIp || cloudflareIp || forwardedFor?.split(",")[0]?.trim();

  if (ip) {
    return ip;
  }

  const userAgent = request.headers.get("user-agent");
  return userAgent ? `ua:${userAgent}` : "anonymous";
}

function buildRateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfterSeconds),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
}

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

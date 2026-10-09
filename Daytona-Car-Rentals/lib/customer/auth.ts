import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { PilotError } from "../pilot/errors";
import { limit } from "../pilot/http";
import { query } from "../pilot/database";
import { z } from "zod";
export type CustomerIdentity = { id: string; email: string };
export const emailHash = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
export function authClient() {
  const url = process.env.DCR_SUPABASE_AUTH_URL,
    key = process.env.DCR_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new PilotError(
      "Email sign-in is not configured yet. You can still browse and plan your trip.",
      503,
    );
  const u = new URL(url);
  const hosted = !!process.env.VERCEL || ["preview", "production"].includes(process.env.VERCEL_ENV || "");
  if (hosted && (
    process.env.NODE_ENV === "test" ||
    !/^[a-z0-9]{20}$/.test(process.env.DCR_SUPABASE_PROJECT_REF || "") ||
    u.protocol !== "https:" || u.port || u.username || u.password ||
    u.pathname !== "/" || u.search || u.hash ||
    u.hostname !== process.env.DCR_SUPABASE_PROJECT_REF + ".supabase.co" ||
    !/^(sb_publishable_|eyJ)/.test(key) ||
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ||
    /dns-fixture|auth-fixture/.test(process.env.NODE_OPTIONS || "")
  )) throw new PilotError("Test authentication configuration is forbidden in hosted environments.", 503);
  if (
    u.protocol !== "https:" &&
    !(
      process.env.NODE_ENV === "test" &&
      ["localhost", "127.0.0.1"].includes(u.hostname)
    )
  )
    throw new PilotError("Invalid authentication configuration.", 503);
  if (
    process.env.NODE_ENV !== "test" &&
    (!process.env.DCR_SUPABASE_PROJECT_REF ||
      u.hostname !== process.env.DCR_SUPABASE_PROJECT_REF + ".supabase.co")
  )
    throw new PilotError(
      "Authentication project does not match Daytona configuration.",
      503,
    );
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export function safeReturn(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 1500 ||
    /[\\\r\n]/.test(value)
  )
    return "/my-trip";
  let u: URL;
  try {
    u = new URL(value, "https://local.invalid");
  } catch {
    return "/my-trip";
  }
  if (
    u.origin !== "https://local.invalid" ||
    !["/booking", "/my-trip"].includes(u.pathname)
  )
    return "/my-trip";
  // Only non-sensitive journey fields can survive in a link (no quote or contact details).
  const p = new URLSearchParams();
  for (const k of ["vehicle", "start", "end", "period", "location", "draft", "step"]) {
    const v = u.searchParams.get(k);
    if (v && v.length < 100) p.set(k, v);
  }
  return u.pathname + (p.size ? "?" + p : "");
}
async function saveSession(session: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}) {
  const jar = await cookies(),
    options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
  jar.set("dcr_customer_access", session.access_token, {
    ...options,
    maxAge: session.expires_in,
  });
  jar.set("dcr_customer_refresh", session.refresh_token, {
    ...options,
    maxAge: 30 * 86400,
  });
}
export async function requireCustomer(): Promise<CustomerIdentity> {
  const jar = await cookies();
  const access = jar.get("dcr_customer_access")?.value;
  const refresh = jar.get("dcr_customer_refresh")?.value;
  if (!access && !refresh)
    throw new PilotError("Sign in with your email before continuing.", 401);
  const client = authClient();
  let user = access ? (await client.auth.getUser(access)).data.user : null;
  if (!user && refresh) {
    const r = await client.auth.refreshSession({ refresh_token: refresh });
    if (r.data.session) {
      await saveSession(r.data.session);
      user = (await client.auth.getUser(r.data.session.access_token)).data.user;
    }
  }
  if (!user?.email || !user.email_confirmed_at)
    throw new PilotError(
      "Your sign-in has expired. Request a new email link.",
      401,
    );
  return { id: user.id, email: user.email.toLowerCase() };
}
export async function sendLink(input: unknown) {
  const a = z
    .object({
      email: z.string().email().max(200),
      next: z.string().max(1500).optional(),
    })
    .parse(input);
  const origin = process.env.DCR_SITE_ORIGIN;
  if (!origin) throw new PilotError("Sign-in origin is not configured.", 503);
  const client = authClient();
  // No Preview messages can go to arbitrary real customers.
  if (
    process.env.DCR_DEMO_MODE === "true" &&
    !(process.env.DCR_AUTH_TEST_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .includes(a.email.toLowerCase())
  )
    throw new PilotError(
      "Preview sign-in is limited to approved test recipients.",
      403,
    );
  await limit("auth:" + emailHash(a.email), 3, 15 * 60000);
  await limit("auth-global", 30, 3600000);
  const intent = randomBytes(32).toString("hex");
  await query("INSERT INTO dcr_private.auth_intents VALUES($1,$2,$3)", [
    intent,
    safeReturn(a.next),
    Date.now() + 3600000,
  ]);
  const { error } = await client.auth.signInWithOtp({
    email: a.email,
    options: { emailRedirectTo: origin + "/auth/confirm?intent=" + intent },
  });
  if (error)
    throw new PilotError(
      "Unable to send a sign-in link. Try again later.",
      503,
    );
  return {
    message:
      "Check your email for a sign-in link. It does not approve a rental.",
  };
}
export async function confirmLink(input: unknown) {
  const a = z
    .object({
      token: z.string().min(10).max(200),
      intent: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    })
    .parse(input);
  await limit("auth-confirm", 100, 3600000);
  const { data, error } = await authClient().auth.verifyOtp({
    token_hash: a.token,
    type: "email",
  });
  if (error || !data.session || !data.user?.email_confirmed_at)
    throw new PilotError(
      "This link has expired or was already used. Request a new sign-in link.",
      401,
    );
  await saveSession(data.session);
  const row = a.intent
    ? (
        await query(
          "DELETE FROM dcr_private.auth_intents WHERE id=$1 AND expires>$2 RETURNING path",
          [a.intent, Date.now()],
        )
      ).rows[0]
    : null;
  return { next: safeReturn(row?.path) };
}
export async function logout() {
  const jar = await cookies(),
    access = jar.get("dcr_customer_access")?.value,
    refresh = jar.get("dcr_customer_refresh")?.value;
  if (refresh) {
    const client = authClient();
    const { error } = access
      ? await client.auth.setSession({
          access_token: access,
          refresh_token: refresh,
        })
      : await client.auth.refreshSession({ refresh_token: refresh });
    if (!error) {
      const result = await client.auth.signOut({ scope: "global" });
      if (result.error)
        throw new PilotError(
          "Unable to revoke your session. Please try again.",
          503,
        );
    }
  }
  jar.delete("dcr_customer_access");
  jar.delete("dcr_customer_refresh");
}

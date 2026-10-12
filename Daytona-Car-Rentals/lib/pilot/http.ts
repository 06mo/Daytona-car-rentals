import { TripDateError } from "./model";
import { NextResponse } from "next/server";
import {
  randomBytes,
  createHash,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { PilotError } from "./errors";
import { query, transaction } from "./database";
import { adminLoginNetwork, loginClient, loginCookie, loginLimitKeys, loginWindowMs } from "./admin-login";

export function sameOrigin(request: Request) {
  if (process.env.NODE_ENV === "production" && !process.env.DCR_SITE_ORIGIN)
    throw new PilotError(
      "Set DCR_SITE_ORIGIN before accepting production requests.",
      503,
    );
  const origin = request.headers.get("origin");
  const expected = process.env.DCR_SITE_ORIGIN || new URL(request.url).origin;
  if (origin !== expected)
    throw new PilotError("Please submit from this website.", 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new PilotError("Send JSON only.", 415);
}
export async function body(request: Request, maximumBytes = 12000) {
  sameOrigin(request);
  const reader = request.body?.getReader();
  if (!reader) throw new PilotError("Request body is required.");
  const decoder = new TextDecoder();
  let text = "",
    bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > maximumBytes) {
      await reader.cancel();
      throw new PilotError("Request is too large.", 413);
    }
    text += decoder.decode(part.value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text);
  } catch {
    throw new PilotError("Invalid request.");
  }
}
export function responseError(error: unknown) {
  if (error instanceof TripDateError)
    return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Check your information." },
      { status: 400 },
    );
  if (error instanceof PilotError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  return NextResponse.json(
    {
      error: "Unable to complete this action. Please try again or contact us.",
    },
    { status: 500 },
  );
}
export async function limit(id: string, maximum: number, windowMs: number) {
  const now = Date.now();
  const row = (
    await query(
      "INSERT INTO dcr_private.attempts(id,count,reset) VALUES($1,1,$2) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN attempts.reset<=$3 THEN 1 ELSE attempts.count+1 END, reset=CASE WHEN attempts.reset<=$3 THEN $2 ELSE attempts.reset END RETURNING count",
      [id, now + windowMs, now],
    )
  ).rows[0];
  if (Number(row.count) > maximum)
    throw new PilotError("Too many attempts. Please try again later.", 429);
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function requireAdmin() {
  const token = (await cookies()).get("dcr_admin")?.value;
  if (!token) throw new PilotError("Sign in to continue.", 401);
  const row = (
    await query("SELECT expires FROM dcr_private.sessions WHERE hash=$1", [
      digest(token),
    ])
  ).rows[0];
  if (!row || Number(row.expires) <= Date.now())
    throw new PilotError("Session expired. Sign in again.", 401);
  return "owner:" + digest(token).slice(0, 16);
}
export async function checkAdminPassword(password: unknown, network: string, client: string) {
  const hash = process.env.DCR_ADMIN_PASSWORD_HASH;
  if (!hash) throw new PilotError("Admin access has not been configured.", 503);
  const keys = loginLimitKeys(network, client, hash);
  // Cookie rotation cannot remove the network budget. There is no site-wide lockout.
  await limit(keys.network, 100, loginWindowMs);
  await limit(keys.client, 5, loginWindowMs);
  if (typeof password !== "string" || password.length > 200)
    throw new PilotError("Incorrect password.", 401);
  const [salt, expected] = hash.split(":");
  if (!salt || !expected || expected.length !== 128)
    throw new PilotError("Admin configuration is invalid.", 503);
  const actual = scryptSync(password, salt, 64),
    target = Buffer.from(expected, "hex");
  if (actual.length !== target.length || !timingSafeEqual(actual, target))
    throw new PilotError("Incorrect password.", 401);
  return keys.client;
}
export async function signIn(password: unknown, request: Request) {
  const hash = process.env.DCR_ADMIN_PASSWORD_HASH;
  if (!hash) throw new PilotError("Admin access has not been configured.", 503);
  const network = adminLoginNetwork(request);
  const jar = await cookies();
  const prior = jar.get(loginCookie)?.value;
  const client = loginClient(prior, hash);
  if (client !== prior) jar.set(loginCookie, client, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/api/admin", maxAge: loginWindowMs / 1000,
  });
  const clientKey = await checkAdminPassword(password, network, client);
  const token = randomBytes(32).toString("hex");
  await transaction(async () => {
    await query("DELETE FROM dcr_private.attempts WHERE id=$1", [clientKey]);
    await query("DELETE FROM dcr_private.attempts WHERE (id LIKE 'admin-client:%' OR id LIKE 'admin-network:%') AND reset<=$1", [Date.now()]);
    await query("DELETE FROM dcr_private.sessions WHERE expires<=$1", [
      Date.now(),
    ]);
    await query("INSERT INTO dcr_private.sessions VALUES($1,$2)", [
      digest(token),
      Date.now() + 8 * 3600000,
    ]);
  });
  jar.set("dcr_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 3600,
  });
}
export async function signOut() {
  const jar = await cookies(),
    token = jar.get("dcr_admin")?.value;
  if (token)
    await query("DELETE FROM dcr_private.sessions WHERE hash=$1", [
      digest(token),
    ]);
  jar.delete("dcr_admin");
}

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
import { db, PilotError } from "./store";

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.DCR_SITE_ORIGIN || new URL(request.url).origin;
  if (origin !== expected)
    throw new PilotError("Please submit from this website.", 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new PilotError("Send JSON only.", 415);
}
export async function body(request: Request) {
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
    if (bytes > 12000) {
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
  if (error instanceof TripDateError) return NextResponse.json({ error: error.message }, { status: 400 });
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
export function limit(id: string, maximum: number, windowMs: number) {
  const now = Date.now();
  db()
    .prepare(
      "INSERT INTO attempts(id,count,reset) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN reset<=? THEN 1 ELSE count+1 END, reset=CASE WHEN reset<=? THEN ? ELSE reset END",
    )
    .run(id, now + windowMs, now, now, now + windowMs);
  const row = db().prepare("SELECT count FROM attempts WHERE id=?").get(id);
  if (Number(row?.count) > maximum)
    throw new PilotError("Too many attempts. Please try again later.", 429);
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function requireAdmin() {
  const token = (await cookies()).get("dcr_admin")?.value;
  if (!token) throw new PilotError("Sign in to continue.", 401);
  const row = db()
    .prepare("SELECT expires FROM sessions WHERE hash=?")
    .get(digest(token));
  if (!row || Number(row.expires) <= Date.now())
    throw new PilotError("Session expired. Sign in again.", 401);
}
export async function signIn(password: unknown) {
  const hash = process.env.DCR_ADMIN_PASSWORD_HASH;
  if (!hash) throw new PilotError("Admin access has not been configured.", 503);
  limit("admin-login", 5, 15 * 60000);
  if (typeof password !== "string" || password.length > 200)
    throw new PilotError("Incorrect password.", 401);
  const [salt, expected] = hash.split(":");
  if (!salt || !expected || expected.length !== 128)
    throw new PilotError("Admin configuration is invalid.", 503);
  const actual = scryptSync(password, salt, 64),
    target = Buffer.from(expected, "hex");
  if (actual.length !== target.length || !timingSafeEqual(actual, target))
    throw new PilotError("Incorrect password.", 401);
  db().prepare("DELETE FROM attempts WHERE id='admin-login'").run();
  db().prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("INSERT INTO sessions VALUES(?,?)")
    .run(digest(token), Date.now() + 8 * 3600000);
  (await cookies()).set("dcr_admin", token, {
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
    db().prepare("DELETE FROM sessions WHERE hash=?").run(digest(token));
  jar.delete("dcr_admin");
}

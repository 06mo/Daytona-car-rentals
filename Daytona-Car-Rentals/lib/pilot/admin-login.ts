import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { PilotError } from "./errors";

export const loginCookie = "dcr_login_client";
export const loginWindowMs = 15 * 60000;
const hmac = (secret: string, value: string) =>
  createHmac("sha256", secret).update(value).digest("hex");

/** Trust the platform header only on Vercel. Never trust arbitrary forwarding headers. */
export function adminLoginNetwork(request: Request) {
  if (process.env.VERCEL === "1") {
    const address = request.headers.get("x-vercel-forwarded-for")?.trim() || "";
    const family = isIP(address);
    if (!family) throw new PilotError("Trusted login client address is unavailable.", 503);
    return "vercel:" + (family === 6 ? new URL(`http://[${address}]`).hostname : address);
  }
  const local = (host: string) => ["localhost", "127.0.0.1", "[::1]"].includes(host);
  const origin = process.env.DCR_SITE_ORIGIN;
  if (!origin || !local(new URL(origin).hostname) || !local(new URL(request.url).hostname))
    throw new PilotError("Owner login requires a trusted hosting ingress or the private loopback preview.", 503);
  // The approved local preview is private, loopback-bound and SSH-tunnelled.
  // All local browsers share this network ceiling, but not their browser allowance.
  return "private-loopback";
}

export function loginClient(value: string | undefined, secret: string) {
  if (value && /^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(value)) {
    const [token, signature] = value.split(".");
    if (timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(hmac(secret, "login-client:" + token), "hex")))
      return value;
  }
  const token = randomBytes(32).toString("hex");
  return token + "." + hmac(secret, "login-client:" + token);
}

export function loginLimitKeys(network: string, client: string, secret: string) {
  return {
    network: "admin-network:" + hmac(secret, network),
    client: "admin-client:" + hmac(secret, network + ":" + client),
  };
}

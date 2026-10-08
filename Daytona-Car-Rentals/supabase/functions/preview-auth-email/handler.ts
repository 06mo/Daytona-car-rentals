import { Webhook } from "standardwebhooks";
import { z } from "zod";

const recipient = "msooijir@gmail.com";
const sender = "Daytona Car Rentals <notifications@notify.daytonacarrentals.com>";
const projectURL = "https://moxcovrhondqpjykslkh.supabase.co";
type Environment = (name: string) => string | undefined;
const payloadSchema = z.object({
  user: z.object({ id: z.string().uuid(), email: z.string().email().max(254) }),
  email_data: z.object({
    email_action_type: z.enum(["signup", "magiclink"]),
    token_hash: z.string().regex(/^[a-zA-Z0-9_-]{10,200}$/),
    redirect_to: z.string().max(2000),
  }),
});
function reply(status: number, message?: string) {
  return Response.json(message ? { error: { http_code: status, message } } : {}, {
    status, headers: { "Cache-Control": "no-store" },
  });
}
async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw Error();
  const decoder = new TextDecoder();
  let size = 0, body = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) { await reader.cancel(); throw Error(); }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

/** No database, log output, browser cookies, service-role key or SMTP fallback. */
export function previewAuthEmail(env: Environment, deliver: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply(405, "POST required.");
    let origin: URL, verifier: Webhook, key: string;
    try {
      if (env("DCR_AUTH_HOOK_ENABLED") !== "true" ||
          env("DCR_AUTH_HOOK_ENV") !== "preview" || env("SUPABASE_URL") !== projectURL ||
          env("DCR_AUTH_TEST_EMAILS") !== recipient) throw Error();
      const configuredOrigin = env("DCR_AUTH_HOOK_ORIGIN") || "";
      origin = new URL(configuredOrigin);
      // This preparation targets Vercel's protected branch URL, never a custom/production domain.
      if (origin.protocol !== "https:" || !origin.hostname.endsWith(".vercel.app") ||
          origin.username || origin.password || origin.port || origin.origin !== configuredOrigin) throw Error();
      key = env("DCR_AUTH_RESEND_KEY") || "";
      const secret = env("DCR_AUTH_HOOK_SIGNING_SECRET") || "";
      if (!/^re_[A-Za-z0-9_\-]{10,}$/.test(key) || !/^v1,whsec_[A-Za-z0-9+/]{43}=$/.test(secret)) throw Error();
      verifier = new Webhook(secret.slice(3));
    } catch { return reply(503, "Preview email hook is not configured."); }
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
      return reply(415, "JSON required.");
    let raw: string;
    try { raw = await boundedBody(request); }
    catch { return reply(413, "Invalid hook body."); }
    let verified: unknown;
    try { verified = verifier.verify(raw, Object.fromEntries(request.headers)); }
    catch { return reply(401, "Invalid hook authentication."); }
    const parsed = payloadSchema.safeParse(verified);
    if (!parsed.success) return reply(400, "Unsupported authentication email.");
    const { user, email_data: email } = parsed.data;
    // Match an exact mailbox (case-insensitive); never apply Gmail dot/plus/domain aliases.
    if (user.email.toLowerCase() !== recipient) return reply(403, "Preview recipient is not approved.");
    let callback: URL;
    try {
      callback = new URL(email.redirect_to);
      if (callback.origin !== origin.origin || callback.pathname !== "/auth/confirm" ||
          callback.username || callback.password || callback.hash) throw Error();
      const entries = [...callback.searchParams];
      if (entries.some(([k]) => k !== "intent") || entries.length > 1 ||
          (entries.length === 1 && !/^[a-f0-9]{64}$/.test(entries[0][1]))) throw Error();
      // No intent is allowed for a direct Auth request: confirmation returns to My trips.
      callback.searchParams.set("token_hash", email.token_hash);
    } catch { return reply(400, "Invalid Preview callback."); }
    // Hash avoids placing tokens or recipient PII in provider idempotency headers.
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(
      JSON.stringify([user.id, recipient, email.email_action_type, email.token_hash, callback.href]),
    ));
    const idempotency = "daytona-auth-" + [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    try {
      const response = await deliver("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(2500),
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "Idempotency-Key": idempotency },
        body: JSON.stringify({ from: sender, to: [recipient], subject: "Sign in to Daytona Car Rentals Preview",
          text: "Use this link to continue signing in to the synthetic Daytona Preview:\n" + callback.href +
            "\n\nChoose Continue securely on the page. Signing in does not verify a driver or confirm a rental. If you did not request this link, ignore it.",
        }),
      });
      // Never echo provider responses, which can contain sensitive request details.
      if (!response.ok) return reply(502, "Authentication email provider unavailable.");
      await response.body?.cancel();
      return reply(200);
    } catch { return reply(502, "Authentication email provider unavailable."); }
  };
}

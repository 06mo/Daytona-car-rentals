// Local GoTrue protocol fixture: verifies app behavior, NOT hosted Supabase delivery/security.
import { createServer } from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export async function authFixture() {
  const directory = mkdtempSync(join(tmpdir(), "dcr-auth-"));
  const cert = join(directory, "cert.pem"),
    key = join(directory, "key.pem");
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-keyout",
      key,
      "-out",
      cert,
      "-subj",
      "/CN=portal-fixture.supabase.co",
      "-addext",
      "subjectAltName=DNS:portal-fixture.supabase.co",
    ],
    { stdio: "ignore" },
  );
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "renter@example.invalid",
    email_confirmed_at: new Date().toISOString(),
    aud: "authenticated",
    role: "authenticated",
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  };
  const tokens = new Map<string, typeof user>();
  const refreshes = new Map<string, typeof user>();
  const links = new Map<string, { email: string; redirect: string }>();
  let lastLink = "";
  function session(u = user) {
    const access =
      Buffer.from("{}").toString("base64url") +
      "." +
      Buffer.from(
        JSON.stringify({
          sub: u.id,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url") +
      "." +
      randomUUID();
    const refresh = randomUUID();
    tokens.set(access, u);
    refreshes.set(refresh, u);
    return {
      access_token: access,
      refresh_token: refresh,
      token_type: "bearer",
      expires_in: 3600,
      user: u,
    };
  }
  const server = createServer(
    { cert: readFileSync(cert), key: readFileSync(key) },
    async (req, res) => {
      const url = new URL(req.url!, "https://fixture");
      let raw = "";
      for await (const c of req) raw += c;
      let b: any = {};
      try {
        b = JSON.parse(raw || "{}");
      } catch {}
      const send = (status: number, data: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };
      if (url.pathname === "/auth/v1/otp") {
        const token = randomUUID().replaceAll("-", "");
        links.set(token, {
          email: b.email,
          redirect: url.searchParams.get("redirect_to") || "",
        });
        lastLink =
          (url.searchParams.get("redirect_to") ||
            "http://127.0.0.1:3000/auth/confirm") +
          "&token_hash=" +
          token;
        return send(200, {});
      }
      if (url.pathname === "/auth/v1/verify") {
        const l = links.get(b.token_hash);
        if (!l)
          return send(403, {
            msg: "Expired or used",
            error_code: "otp_expired",
          });
        links.delete(b.token_hash);
        return send(200, session({ ...user, email: l.email }));
      }
      if (url.pathname === "/auth/v1/user") {
        const u = tokens.get(
          (req.headers.authorization || "").replace("Bearer ", ""),
        );
        return u ? send(200, u) : send(401, { msg: "Invalid token" });
      }
      if (url.pathname === "/auth/v1/token") {
        const u = refreshes.get(b.refresh_token);
        return u
          ? send(200, session(u))
          : send(401, { msg: "Expired refresh" });
      }
      if (url.pathname === "/auth/v1/logout") {
        tokens.clear();
        refreshes.clear();
        return send(204, {});
      }
      // Control endpoints are available only on this loopback test server, never in application routes.
      if (url.pathname === "/fixture/session")
        return send(
          200,
          session(
            url.searchParams.has("other")
              ? {
                  ...user,
                  id: "22222222-2222-4222-8222-222222222222",
                  email: "other@example.invalid",
                }
              : user,
          ),
        );
      if (url.pathname === "/fixture/link")
        return send(200, { link: lastLink });
      return send(404, {});
    },
  );
  await new Promise<void>((resolve) =>
    server.listen(4447, "127.0.0.1", resolve),
  );
  return {
    cert,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

import { request, type BrowserContext } from "@playwright/test";
export async function customerSession(context: BrowserContext, other = false) {
  const api = await request.newContext({ ignoreHTTPSErrors: true });
  const r = await api.get(
    "https://127.0.0.1:4447/fixture/session" + (other ? "?other=1" : ""),
  );
  const d = await r.json();
  await api.dispose();
  await context.addCookies([
    {
      name: "dcr_customer_access",
      value: d.access_token,
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "dcr_customer_refresh",
      value: d.refresh_token,
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return d;
}

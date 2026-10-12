import { test, expect, type Page } from "@playwright/test";
import { customerSession, preparedRequest } from "./auth-helper";
import { checks } from "../../lib/pilot/model";
import sharp from "sharp";

async function request(page: Page, path: string, data?: unknown) {
  return page.evaluate(async ({ path, data }) => {
    const response = await fetch(path, data === undefined ? {} : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return { status: response.status, data: await response.json() };
  }, { path, data });
}

test("five failed logins do not lock another owner browser out; session boundaries stay intact", async ({ page, browser }) => {
  await page.goto("/admin");
  for (let i = 0; i < 5; i++) expect((await request(page, "/api/admin/session", { password: "synthetic incorrect" })).status).toBe(401);
  expect((await request(page, "/api/admin/session", { password: process.env.DCR_E2E_PASSWORD })).status).toBe(429);
  const context = await browser.newContext();
  try {
    const owner = await context.newPage(); await owner.goto("http://127.0.0.1:3000/admin");
    expect((await request(owner, "/api/admin/state")).status).toBe(401);
    await owner.getByLabel("Admin password").fill(process.env.DCR_E2E_PASSWORD!);
    await owner.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(owner.getByRole("button", { name: "Reservations", exact: true })).toBeVisible();
    expect((await request(owner, "/api/admin/state")).status).toBe(200);
    expect((await request(page, "/api/admin/state")).status).toBe(401);
    const cookie = (await context.cookies()).find(c => c.name === "dcr_admin")!;
    expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe("Strict");
    if (process.env.DCR_E2E_PRODUCTION === "true") expect(cookie.secure).toBe(true);
    await owner.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(owner.getByLabel("Admin password")).toBeVisible();
    expect((await request(owner, "/api/admin/state")).status).toBe(401);
  } finally { await context.close(); }
});

test("replacement correction, explicit confirmation and owner cancellation complete without refunds", async ({ page, browser }) => {
  await customerSession(page.context());
  await page.goto("/my-trip");
  const trip = { vehicleId: "corolla-3275798", start: "2044-12-01T10:00", end: "2044-12-08T10:00", location: "local", period: "weekly" };
  const quoted = await request(page, "/api/pilot/quote", trip);
  expect(quoted.status, JSON.stringify(quoted.data)).toBe(200);
  const q = quoted.data;
  const draft = await preparedRequest(page, q);
  const submitted = await request(page, "/api/pilot/requests", draft);
  expect(submitted.status, JSON.stringify(submitted.data)).toBe(201);
  const id = submitted.data.id;
  const image = (await sharp({ create: { width: 20, height: 20, channels: 3, background: "#ccc" } }).png().toBuffer()).toString("base64");
  const before = (await request(page, "/api/customer/trips")).data.trips.find((r: any) => r.id === id);
  const bad = await request(page, "/api/customer/documents", { id, kind: "insurance", content: image, validUntil: "2020-01-01" });
  expect(bad.status).toBe(409); expect(bad.data.error).toContain("valid through");
  expect((await request(page, "/api/customer/trips")).data.trips.find((r: any) => r.id === id).documents).toEqual(before.documents);
  expect((await request(page, "/api/customer/documents", { id, kind: "insurance", content: image, validUntil: "2044-12-08" })).status).toBe(200);
  expect((await request(page, "/api/customer/trips", { action: "submit", id })).status).toBe(200);
  const denied = await browser.newContext();
  try {
    expect((await denied.request.post("http://127.0.0.1:3000/api/admin/state", { headers: { Origin: "http://127.0.0.1:3000" }, data: { action: "status", id, revision: 1, status: "cancelled", reason: "Unauthorized attempt" } })).status()).toBe(401);
  } finally { await denied.close(); }
  await page.goto("/admin");
  await page.getByLabel("Admin password").fill(process.env.DCR_E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reservations", exact: true })).toBeVisible();
  const current = async () => (await request(page, "/api/admin/state")).data.reservations.find((r: any) => r.id === id);
  for (const action of ["documents", "approved"])
    expect((await request(page, "/api/admin/portal", { action, id, revision: (await current()).revision, reason: "Synthetic owner evidence" })).status).toBe(200);
  for (const check of checks)
    expect((await request(page, "/api/admin/state", { action: "review", id, revision: (await current()).revision, check, checked: true, evidence: "Synthetic manual evidence" })).status).toBe(200);
  expect((await request(page, "/api/admin/state", { action: "status", id, revision: (await current()).revision, status: "confirmed" })).status).toBe(200);
  await page.reload();
  await page.getByRole("button", { name: "Reservations", exact: true }).click();
  await page.locator(".request-list button").filter({ hasText: id.slice(0, 8) }).click();
  const reason = page.getByLabel("Cancellation reason visible to customer");
  await reason.fill("Synthetic renter requested cancellation");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await reason.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/safeguards-cancellation-${width}.png`, fullPage: true });
  }
  await reason.focus(); await page.keyboard.press("Tab");
  const cancel = page.getByRole("button", { name: "Cancel confirmed rental", exact: true });
  await expect(cancel).toBeFocused();
  page.once("dialog", d => d.dismiss()); await page.keyboard.press("Enter");
  expect((await current()).status).toBe("confirmed");
  await expect(reason).toHaveValue("Synthetic renter requested cancellation");
  page.once("dialog", d => d.accept()); await cancel.click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  expect((await current()).status).toBe("cancelled");
  await expect(cancel).toHaveCount(0);
  expect((await request(page, "/api/pilot/quote", trip)).status).toBe(200);
  await page.goto("/my-trip");
  await expect(page.getByText("Synthetic renter requested cancellation", { exact: true })).toBeVisible();
});

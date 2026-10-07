import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
const origin = "http://127.0.0.1:3000";
async function readyImages(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map(async (image) => {
        image.loading = "eager";
        await image.decode();
      }),
    );
  });
  expect(
    await page.evaluate(() =>
      Array.from(document.images).every((i) => i.naturalWidth > 0),
    ),
  ).toBe(true);
}
test("desktop and mobile homepage are usable without overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your days. Your plans/ }),
  ).toBeVisible();
  await expect(page.locator(".hero-actions").getByRole("link", { name: "Browse cars" })).toBeVisible();
  await readyImages(page);
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".hero-actions").getByRole("link", { name: "Browse cars" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await readyImages(page);
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
});
test("three-screen request flow shows totals and never claims confirmation", async ({
  page,
}) => {
  await page.goto("/booking?vehicle=corolla-3275798");
  await page.getByLabel("Pickup date & time").fill("2030-10-01T10:00");
  await page.getByLabel("Return date & time").fill("2030-10-04T10:00");
  await page.getByRole("button", { name: "See my trip total" }).click();
  await expect(page.getByText("Trip total", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue to verify" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s get you ready." }),
  ).toBeVisible();
  await page.getByLabel("Full name").fill("Sample Renter");
  await page
    .getByLabel("Email", { exact: true })
    .fill("sample@example.invalid");
  await page.getByLabel("Phone", { exact: true }).fill("3865550100");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(
    page.getByRole("heading", { name: "One last look." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try booking request" }),
  ).toBeDisabled();
  await readyImages(page);
  await page.screenshot({
    path: "test-results/booking-review.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-booking.png",
    fullPage: true,
  });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Try booking request" }).click();
  await expect(
    page.getByRole("heading", { name: "Preview request complete." }),
  ).toBeVisible();
  await expect(page.getByText(/No personal details were saved/)).toBeVisible();
});
test("unauthenticated admin access and foreign-origin writes are rejected", async ({
  request,
}) => {
  expect((await request.get("/api/admin/state")).status()).toBe(401);
  expect(
    (
      await request.post("/api/admin/state", {
        headers: { Origin: origin },
        data: { action: "settings" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/pilot/quote", {
        headers: { Origin: "https://evil.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
test("competing submissions atomically allocate one internal hold", async ({
  request,
}) => {
  const trip = {
    vehicleId: "ecosport-3580557",
    start: "2030-11-01T10:00",
    end: "2030-11-04T10:00",
    location: "local",
  };
  const q1 = await (
    await request.post("/api/pilot/quote", {
      headers: { Origin: origin },
      data: trip,
    })
  ).json();
  const q2 = await (
    await request.post("/api/pilot/quote", {
      headers: { Origin: origin },
      data: trip,
    })
  ).json();
  const submit = (id: string) =>
    request.post("/api/pilot/requests", {
      headers: { Origin: origin },
      data: {
        quoteId: id,
        idempotencyKey: randomUUID(),
        name: "Sample Renter",
        email: "sample@example.invalid",
        phone: "3865550100",
        acknowledged: true,
        website: "",
        totalCents: 1,
      },
    });
  const responses = await Promise.all([submit(q1.id), submit(q2.id)]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
});
test("authenticated operator can change a rate and see readiness gates", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Admin password").fill(process.env.DCR_E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
  await readyImages(page);
  await page.screenshot({
    path: "test-results/admin-today.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-admin.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Fleet & rates", exact: true })
    .click();
  const row = page.locator("form.rate-row").filter({ has: page.locator("#corolla-3275798-daily") });
  await row.getByLabel("Daily rate ($)").fill("59.00");
  await row.getByRole("button", { name: "Save rate" }).click();
  await expect(page.getByRole("status")).toContainText("Saved.");
  // Use the browser context: Chromium trusts loopback for Secure cookies, unlike APIRequestContext over HTTP.
  const state = await page.evaluate(async () => (await fetch("/api/admin/state")).json());
  expect(state.rates.find((r: {vehicleId:string}) => r.vehicleId === "corolla-3275798").dailyCents).toBe(5900);
  const pending = state.reservations.find(
    (r: { status: string }) => r.status === "pending",
  );
  const result = await page.evaluate(async ({id, revision}) => {
    const response = await fetch("/api/admin/state", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({action:"status",id,revision,status:"confirmed"}),
    });
    return {status: response.status, data: await response.json()};
  }, {id: pending.id, revision: pending.revision});
  expect(result.status).toBe(409);
  expect(result.data.error).toContain("release check");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/state")).status()).toBe(401);
});

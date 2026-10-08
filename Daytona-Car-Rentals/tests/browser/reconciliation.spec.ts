import { customerSession } from "./auth-helper";
import { test, expect } from "@playwright/test";
import { money } from "../../lib/pilot/model";

for (const change of ["vehicle", "dates", "pickup"] as const) {
  test(`F1 delayed ${change} change discards obsolete quote and submits the reviewed server quote`, async ({ page, request }) => {
    const month = change === "vehicle" ? "04" : change === "dates" ? "05" : "06";
    const start = `2033-${month}-01T10:00`, end = `2033-${month}-08T10:00`;
    await customerSession(page.context());
    await page.goto(`/booking?vehicle=santafe-3143340&period=monthly&start=${start}&end=${end}`);
    let release!: () => void, received!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const ready = new Promise<void>(resolve => { received = resolve; });
    let oldId = "";
    await page.route("**/api/pilot/quote", async route => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      oldId = (await response.json()).id;
      received(); await gate; await route.fulfill({ response });
    });
    await page.getByRole("button", { name: "See my trip total" }).click();
    await ready;
    await expect(page.getByRole("button", { name: "Continue to contact details" })).toHaveCount(0);
    if (change === "vehicle") {
      await page.locator(".change-car summary").click();
      await page.locator("#vehicle").selectOption("corolla-3275798");
      await page.locator("#booking-period").selectOption("weekly");
    } else if (change === "dates") {
      await page.locator("#pickup-time").fill(`2033-${month}-02T10:00`);
      await page.locator("#return-time").fill(`2033-${month}-10T10:00`);
    } else await page.locator("#location").selectOption("airport");
    const stale = page.waitForResponse(r => r.url().endsWith("/api/pilot/quote") && r.request().method() === "POST");
    release(); await stale; await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Continue to contact details" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Try booking request" })).toHaveCount(0);
    await expect(page.locator(".quote-ready")).toHaveCount(0);
    await page.unroute("**/api/pilot/quote");
    const response = page.waitForResponse(r => r.url().endsWith("/api/pilot/quote") && r.request().method() === "POST");
    await page.getByRole("button", { name: "See my trip total" }).click();
    const quote = await (await response).json();
    expect(quote.id).not.toBe(oldId);
    expect(quote.vehicleId).toBe(change === "vehicle" ? "corolla-3275798" : "santafe-3143340");
    expect(quote.period).toBe(change === "vehicle" ? "weekly" : "monthly");
    expect(quote.start).toBe(change === "dates" ? `2033-${month}-02T10:00` : start);
    expect(quote.end).toBe(change === "dates" ? `2033-${month}-10T10:00` : end);
    expect(quote.location).toBe(change === "pickup" ? "airport" : "local");
    await page.getByRole("button", { name: "Continue to contact details" }).click();
    await page.getByLabel("Full name").fill("Synthetic Review Renter");
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue("renter@example.invalid");
    await page.getByLabel("Phone", { exact: true }).fill("3865550100");
    await page.getByRole("button", { name: "Continue to review" }).click();
    await expect(page.locator(".selected-car")).toContainText(change === "vehicle" ? "2020 Toyota Corolla" : "2018 Hyundai Santa Fe Sport");
    await expect(page.locator(".review-trip")).toContainText(quote.start.replace("T", " at "));
    await expect(page.locator(".review-trip")).toContainText(quote.end.replace("T", " at "));
    await expect(page.locator(".review-trip")).toContainText(`Rental period: ${quote.period}`);
    await expect(page.locator(".review-trip")).toContainText(change === "pickup" ? "DAB airport delivery" : "Daytona Beach appointment pickup");
    await expect(page.locator(".booking-main .price-summary .total")).toContainText(money(quote.totalCents));
    const submission = page.waitForRequest(r => r.url().endsWith("/api/pilot/requests") && r.method() === "POST");
    const receipt = page.waitForResponse(r => r.url().endsWith("/api/pilot/requests") && r.request().method() === "POST");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Try booking request" }).click();
    const payload = (await submission).postDataJSON();
    expect(payload.quoteId).toBe(quote.id);
    expect(payload.idempotencyKey).toBeTruthy();
    const saved = await (await receipt).json();
    await expect(page.getByRole("heading", { name: "Preview request complete." })).toBeVisible();
    const replay = await page.request.post("/api/pilot/requests", { data: payload, headers: { Origin: "http://127.0.0.1:3000" } });
    expect(replay.ok()).toBeTruthy();
    expect((await replay.json()).id).toBe(saved.id);
  });
}

for (const width of [390, 320]) {
  test(`F2/F3 ${width}px Back/Forward restores trip and keyboard Back focuses Choose`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/booking?vehicle=santafe-3143340&period=monthly&start=2034-01-01T10:00&end=2034-01-31T10:00");
    await page.getByRole("button", { name: "See my trip total" }).click();
    await expect(page.locator(".quote-ready")).toBeVisible();
    await page.locator(".change-car summary").click();
    await page.locator("#vehicle").selectOption("ecosport-3580557");
    await page.locator("#booking-period").selectOption("weekly");
    await page.locator("#pickup-time").fill("2034-02-01T10:00");
    await page.locator("#return-time").fill("2034-02-08T10:00");
    await page.locator("#location").selectOption("airport");
    const editedURL = page.url();
    await expect(page.locator(".quote-ready")).toHaveCount(0);
    await page.locator("main").getByRole("link", { name: "Help me choose", exact: true }).click();
    await page.waitForURL("**/assistant?**");
    await page.locator("#rental-period").selectOption("monthly");
    const assistantURL = page.url();
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.goBack(); await page.waitForLoadState("networkidle");
      expect(page.url()).toBe(editedURL);
      await expect(page.locator("#vehicle")).toHaveValue("ecosport-3580557");
      await expect(page.locator("#booking-period")).toHaveValue("weekly");
      await expect(page.locator("#pickup-time")).toHaveValue("2034-02-01T10:00");
      await expect(page.locator("#return-time")).toHaveValue("2034-02-08T10:00");
      await expect(page.locator("#location")).toHaveValue("airport");
      await expect(page.locator(".selected-car")).toContainText("Ford EcoSport");
      await expect(page.locator(".quote-ready")).toHaveCount(0);
      if (attempt === 0) {
        await page.getByRole("button", { name: "See my trip total" }).click();
        await expect(page.locator(".quote-ready")).toBeVisible();
        await page.goForward(); await page.waitForLoadState("networkidle");
        expect(page.url()).toBe(assistantURL);
        await expect(page.locator("#rental-period")).toHaveValue("monthly");
        await expect(page.locator("#journey-start")).toHaveValue("2034-02-01T10:00");
        await expect(page.locator("#journey-end")).toHaveValue("2034-02-08T10:00");
      }
    }
    // Also enter the request via Forward, rather than only restoring the assistant.
    await page.locator(".change-car summary").click();
    await page.locator("main").getByRole("link", { name: "Help me choose", exact: true }).click();
    await page.waitForURL("**/assistant?**");
    await page.getByRole("button", { name: "Compare SUVs" }).click();
    await page.locator('[data-vehicle="ecosport-3580557"]').getByRole("link", { name: "Request this car" }).click();
    await page.waitForURL("**/booking?**");
    const forwardURL = page.url();
    await page.getByRole("button", { name: "See my trip total" }).click();
    await expect(page.locator(".quote-ready")).toBeVisible();
    await page.goBack(); await page.waitForURL("**/assistant?**");
    await expect(page.getByRole("button", { name: "Compare SUVs" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.goForward();
    await expect(page).toHaveURL(forwardURL);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#vehicle")).toHaveValue("ecosport-3580557");
    await expect(page.locator("#booking-period")).toHaveValue("weekly");
    await expect(page.locator("#pickup-time")).toHaveValue("2034-02-01T10:00");
    await expect(page.locator("#return-time")).toHaveValue("2034-02-08T10:00");
    await expect(page.locator("#location")).toHaveValue("airport");
    await expect(page.locator(".selected-car")).toContainText("Ford EcoSport");
    await expect(page.locator(".quote-ready")).toHaveCount(0);
    await page.getByRole("button", { name: "See my trip total" }).click();
    await page.getByRole("button", { name: "Continue to contact details" }).click();
    await page.getByRole("button", { name: "Back", exact: true }).focus();
    await page.keyboard.press("Enter");
    const heading = page.getByRole("heading", { name: "Plan your rental." });
    await expect(heading).toBeFocused();
    expect(await heading.evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }))).toEqual({ style: "solid", width: "3px" });
    await page.keyboard.press("Tab");
    await expect(page.locator(".change-car summary")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#vehicle")).toBeVisible();
  });
}

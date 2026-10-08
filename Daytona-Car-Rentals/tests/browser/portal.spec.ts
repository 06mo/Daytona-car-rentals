import sharp from "sharp";
import { test, expect, request as apiRequest } from "@playwright/test";
import { customerSession } from "./auth-helper";
test("magic link cross-device continuation, reused/expired link denial and logout", async ({
  page,
  browser,
}) => {
  const next =
    "/booking?vehicle=ecosport-3580557&period=monthly&start=2038-01-01T10%3A00&end=2038-01-31T10%3A00&location=airport";
  await page.goto("/my-trip");
  await page.getByLabel("Email address").fill("renter@example.invalid");
  const result = await page.request.post("/api/customer/auth", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: { email: "renter@example.invalid", next },
  });
  expect(result.ok()).toBeTruthy();
  const fixture = await apiRequest.newContext({ ignoreHTTPSErrors: true });
  const link = (
    await (await fixture.get("https://127.0.0.1:4447/fixture/link")).json()
  ).link;
  await fixture.dispose();
  const other = await browser.newContext();
  const cross = await other.newPage();
  const response = await cross.goto(link);
  expect(response!.headers()["referrer-policy"]).toBe("no-referrer");
  await cross.getByRole("button", { name: "Continue securely" }).click();
  await cross.waitForURL("**/booking?**");
  await expect(cross.locator("#booking-period")).toHaveValue("monthly");
  await expect(cross.locator("#pickup-time")).toHaveValue("2038-01-01T10:00");
  await expect(cross.locator(".selected-car")).toContainText("EcoSport");
  await expect(cross.locator("#location")).toHaveValue("airport");
  await expect(cross.locator(".quote-ready")).toHaveCount(0);
  await page.goto(link);
  await page.getByRole("button", { name: "Continue securely" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "expired or was already used",
  );
  await page.goto("/auth/confirm?token_hash=expired-synthetic-token-hash");
  await page.getByRole("button", { name: "Continue securely" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "expired",
  );
  await cross.goto("/my-trip");
  await cross.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    cross.getByRole("heading", { name: "Sign in to My trips" }),
  ).toBeVisible();
  expect((await cross.request.get("/api/customer/trips")).status()).toBe(401);
  await other.close();
});
test("customer reference never bypasses authentication and owner endpoints deny customers", async ({
  page,
}) => {
  await page.goto("/my-trip");
  expect((await page.request.get("/api/customer/trips")).status()).toBe(401);
  const denied = await page.request.post("/api/pilot/requests", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: {},
  });
  expect(denied.status()).toBe(401);
  await customerSession(page.context());
  expect((await page.request.get("/api/admin/portal")).status()).toBe(401);
  expect(
    (
      await page.request.post("/api/admin/state", {
        headers: { Origin: "http://127.0.0.1:3000" },
        data: { action: "settings" },
      })
    ).status(),
  ).toBe(401);
  const cross = await page.request.get(
    "/api/customer/documents?id=33333333-3333-4333-8333-333333333333",
  );
  expect(cross.status()).toBe(404);
});
for (const width of [1440, 390, 320])
  test(`portal visual and date panel keyboard layout at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    for (const [name, path] of [
      ["home", "/"],
      ["fleet", "/fleet"],
      ["assistant", "/assistant"],
      ["request", "/booking?vehicle=corolla-3275798&period=weekly"],
      ["trips", "/my-trip"],
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.evaluate(async () => {
        await Promise.all(
          Array.from(document.images).map(async (img) => {
            img.loading = "eager";
            await img.decode();
          }),
        );
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      if (name === "home") {
        const photo = await page.locator(".hero-photo").boundingBox(),
          panel = await page.locator(".hero-search").boundingBox();
        expect(panel!.y - (photo!.y + photo!.height)).toBeGreaterThanOrEqual(
          width === 1440 ? 32 : 24,
        );
        const hero = await page.locator(".home-hero").boundingBox();
        expect(Math.abs(panel!.x - hero!.x)).toBeLessThanOrEqual(24);
      }
      if (name === "fleet") {
        await page.locator(".optional-dates summary").focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#journey-start")).toBeVisible();
      }
      await page.screenshot({
        path: `/projects/daytona-handoff/renter-portal/screenshots/${width}-${name}.png`,
        fullPage: true,
      });
    }
  });
test("renter intake, private images and owner review queue work together", async ({
  page,
  browser,
}) => {
  await customerSession(page.context());
  await page.goto("/my-trip");
  const q = await (
    await page.request.post("/api/pilot/quote", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: {
        vehicleId: "focus-3139374",
        start: "2039-05-01T10:00",
        end: "2039-05-08T10:00",
        location: "local",
        period: "weekly",
      },
    })
  ).json();
  const saved = await (
    await page.request.post("/api/pilot/requests", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: {
        quoteId: q.id,
        idempotencyKey: crypto.randomUUID(),
        name: "Synthetic renter",
        email: "renter@example.invalid",
        phone: "0000000000",
        acknowledged: true,
        website: "",
      },
    })
  ).json();
  expect(saved.id).toBeTruthy();
  await page.reload();
  const card = page.locator(".trip-card").filter({ hasText: saved.id });
  await expect(card).toContainText("Documents needed");
  await card.getByLabel("Legal name").fill("Synthetic Driver");
  await card.getByLabel("Date of birth").fill("1990-01-01");
  await card.getByLabel("License issuing state / country").fill("FL");
  await card.getByLabel("License expiration").fill("2040-01-01");
  await card
    .getByLabel("Residential address for agreement")
    .fill("Synthetic address for test only");
  await card.getByLabel("I confirm these fields").check();
  await card.getByRole("button", { name: "Save renter information" }).click();
  await card.getByText(/Private documents ·/).click();
  for (const kind of ["license", "insurance"]) {
    await card.getByLabel("Document type").selectOption(kind);
    await card.locator("input[type=file]").setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: await sharp({
        create: { width: 20, height: 20, channels: 3, background: "#cccccc" },
      })
        .png()
        .toBuffer(),
    });
    await card.getByLabel("This is a synthetic test image").check();
    await card.getByRole("button", { name: "Upload privately" }).click();
    await expect(card).toContainText(
      "Private documents · " + (kind === "license" ? 1 : 2) + " submitted",
    );
    await card.getByText(/Private documents ·/).click();
  }
  await card
    .getByRole("button", { name: "Send information for owner review" })
    .click();
  await expect(card).toContainText("Under review");
  const unauthorized = await browser.newContext();
  const other = await unauthorized.newPage();
  await customerSession(unauthorized, true);
  await other.goto("/my-trip");
  await expect(
    other.locator(".trip-card").filter({ hasText: saved.id }),
  ).toHaveCount(0);
  const detail = await page.evaluate(
    async () => await (await fetch("/api/customer/trips")).json(),
  );
  const doc = detail.trips.find((t: { id: string }) => t.id === saved.id)
    .documents[0];
  expect(
    (await other.request.get("/api/customer/documents?id=" + doc.id)).status(),
  ).toBe(404);
  await unauthorized.close();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.evaluate(()=>window.scrollTo(0,0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `/projects/daytona-handoff/renter-portal/screenshots/${width}-trips-intake.png`,
      fullPage: true,
    });
  }
  await page.goto("/admin");
  await page.getByLabel("Admin password").fill(process.env.DCR_E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Reservations", exact: true }).click();
  await page
    .locator(".request-list button")
    .filter({ hasText: saved.id.slice(0, 8) })
    .click();
  await expect(
    page.getByRole("heading", { name: "Renter intake and delivery queue" }),
  ).toBeVisible();
  await expect(page.locator(".portal-tools")).toContainText("Synthetic Driver");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `/projects/daytona-handoff/renter-portal/screenshots/${width}-owner-review.png`,
      fullPage: true,
    });
  }
});
test("unsent contact draft survives same-tab reauthentication and never crosses accounts", async ({
  page,
}) => {
  await customerSession(page.context());
  await page.goto(
    "/booking?vehicle=elantra-3321200&period=monthly&start=2040-01-01T10:00&end=2040-01-31T10:00",
  );
  await page.getByRole("button", { name: "See my trip total" }).click();
  await page
    .getByRole("button", { name: "Continue to contact details" })
    .click();
  await page.getByLabel("Full name").fill("Synthetic unsent draft");
  await page.getByLabel("Phone", { exact: true }).fill("0000000000");
  await page.context().clearCookies();
  await customerSession(page.context());
  await page.reload();
  await page.getByRole("button", { name: "See my trip total" }).click();
  await page
    .getByRole("button", { name: "Continue to contact details" })
    .click();
  await expect(page.getByLabel("Full name")).toHaveValue(
    "Synthetic unsent draft",
  );
  await expect(page.getByLabel("Phone", { exact: true })).toHaveValue(
    "0000000000",
  );
  await page.context().clearCookies();
  await customerSession(page.context(), true);
  await page.reload();
  await page.getByRole("button", { name: "See my trip total" }).click();
  await page
    .getByRole("button", { name: "Continue to contact details" })
    .click();
  await expect(page.getByLabel("Full name")).toHaveValue("");
});

import { test, expect, type Page } from "@playwright/test";
import {
  customerSession,
  completeDriver,
  preparedRequest,
} from "./auth-helper";
const folder = "/projects/daytona-handoff/quote-recovery/after";
let trip = {
  vehicleId: "corolla-3275798",
  start: "2044-09-01T10:00",
  end: "2044-09-08T10:00",
  location: "local",
  period: "weekly",
};
let url =
  "/booking?vehicle=corolla-3275798&period=weekly&start=2044-09-01T10:00&end=2044-09-08T10:00";
test.beforeEach(async ({}, info) => {
  const month =
    1 + info.parallelIndex + (info.project.name === "webkit" ? 6 : 0) + (info.title.startsWith("wizard step") ? 1 : 0);
  const day =
    1 +
    (info.title.includes("320")
      ? 0
      : info.title.includes("390")
        ? 1
        : info.title.includes("1440")
          ? 2
          : info.title.includes("valid quote")
            ? 3
            : 4);
  const start = `2044-${String(month).padStart(2, "0")}-${String(day * 4).padStart(2, "0")}T10:00`;
  const end =
    start.slice(0, 8) + String(day * 4 + 2).padStart(2, "0") + "T10:00";
  trip = { ...trip, start, end };
  url =
    "/booking?" +
    new URLSearchParams({
      vehicle: trip.vehicleId,
      period: trip.period,
      start,
      end,
    });
});
async function review(page: Page, savedOnly = false) {
  await customerSession(page.context());
  await page.goto(url);
  const q = await (
    await page.request.post("/api/pilot/quote", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: trip,
    })
  ).json();
  const d = await preparedRequest(page, q);
  if (!savedOnly)
    await page.evaluate(
      ({ q, trip }) =>
        sessionStorage.setItem(
          "dcr-quote-reference",
          JSON.stringify({
            id: q.id,
            trip: JSON.stringify([
              trip.vehicleId,
              trip.start,
              trip.end,
              trip.location,
              trip.period,
            ]),
          }),
        ),
      { q, trip },
    );
  await page.goto(url + "&draft=" + d.draftId + "&step=3");
  await expect(
    page.getByText("license: Uploaded — awaiting owner review"),
  ).toBeVisible();
  return { q, d };
}
for (const width of [320, 390, 1440])
  test(`Review recovery and focused mobile layout ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    const { d } = await review(page, true);
    const refresh = page.getByRole("button", {
      name: "Refresh quote",
      exact: true,
    });
    await expect(refresh).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Submit request", exact: true }),
    ).toBeDisabled();
    for (const scale of [1, 2]) {
      await page.evaluate(
        (s) => (document.documentElement.style.fontSize = `${s * 100}%`),
        scale,
      );
      await refresh.focus();
      await expect
        .poll(async () =>
          refresh.evaluate(
            (el) =>
              el.getBoundingClientRect().top >=
                document.querySelector(".site-nav")!.getBoundingClientRect()
                  .bottom +
                  8 && el.getBoundingClientRect().bottom <= innerHeight,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `${folder}/${info.project.name}-${width}-missing-${scale}x.png`,
      });
      const overflow = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("body *")]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 15)
          .map((e) => ({
            tag: e.tagName,
            cls: e.className,
            right: e.getBoundingClientRect().right,
          })),
      }));
      expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
        width + 1,
      );
    }
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "100%"),
    );
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route("**/api/pilot/quote", async (r) => {
      if (r.request().method() === "POST") {
        await gate;
        return r.fulfill({
          status: 503,
          json: { error: "Synthetic quote service unavailable. Please retry." },
        });
      }
      return r.continue();
    });
    await refresh.click();
    await expect(
      page.getByRole("button", { name: "Checking quote…" }),
    ).toBeDisabled();
    await expect(page.locator(".review-trip")).toContainText("weekly");
    await page.screenshot({
      path: `${folder}/${info.project.name}-${width}-loading.png`,
    });
    release();
    await expect(
      page.locator(".review-quote").getByRole("alert"),
    ).toContainText("Synthetic quote service unavailable");
    await expect(page.locator(".review-quote h2")).toBeFocused();
    expect(await page.locator(".review-quote h2").evaluate(el => el.getBoundingClientRect().top >= document.querySelector(".site-nav")!.getBoundingClientRect().bottom + 8)).toBe(true);
    await page.screenshot({
      path: `${folder}/${info.project.name}-${width}-retry.png`,
    });
    await page.unroute("**/api/pilot/quote");
    await page.route("**/api/pilot/quote", (r) =>
      r.request().method() === "POST"
        ? r.fulfill({
            status: 409,
            json: {
              error:
                "This car has a reservation or calendar block for those dates. Try another car or time.",
            },
          })
        : r.continue(),
    );
    await refresh.click();
    await expect(
      page.locator(".review-quote").getByRole("alert"),
    ).toContainText("calendar block");
    await expect(page.getByRole("button", { name: "Edit trip" })).toBeEnabled();
    await page.screenshot({
      path: `${folder}/${info.project.name}-${width}-unavailable.png`,
    });
    await page.unroute("**/api/pilot/quote");
    await refresh.click();
    const accept = page.getByRole("checkbox", {
      name: /I accept the displayed/,
    });
    await expect(accept).toBeEnabled();
    await expect(accept).not.toBeChecked();
    await expect(
      page.getByRole("button", { name: "Submit request", exact: true }),
    ).toBeDisabled();
    await page.getByRole("heading", { name: "One last look." }).focus();
    await page.screenshot({
      path: `${folder}/${info.project.name}-${width}-review-full.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `${folder}/${info.project.name}-${width}-ready.png`,
    });
    await accept.check();
    const receipt = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/pilot/requests") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Submit request", exact: true })
      .dblclick();
    const response = await receipt;
    expect(response.status()).toBe(201);
    const body = response.request().postDataJSON();
    const repeated = await page.request.post("/api/pilot/requests", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: body,
    });
    expect((await repeated.json()).id).toBe((await response.json()).id);
    await expect(
      page.getByRole("heading", {
        name: "Request submitted — awaiting approval",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `${folder}/${info.project.name}-${width}-submitted.png`,
    });
    expect(body.draftId).toBe(d.draftId);
  });

test("valid quote survives uploads, same-trip history, reload and authentication return without stale acceptance", async ({
  page,
}) => {
  await customerSession(page.context());
  await page.goto(url);
  const rq = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/pilot/quote") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "See my trip total" }).click();
  const q = await (await rq).json();
  await page
    .getByRole("button", { name: "Driver & documents", exact: true })
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("Synthetic Renter");
  await page.getByLabel("Phone", { exact: true }).fill("0000000000");
  await completeDriver(page);
  // Same-trip history during a pending save must not remount and erase edits.
  let releaseSave!: () => void, startedSave!: () => void;
  const saveGate = new Promise<void>((r) => (releaseSave = r));
  const saveStarted = new Promise<void>((r) => (startedSave = r));
  await page.route("**/api/customer/drafts", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().postDataJSON().action === "save"
    ) {
      startedSave();
      await saveGate;
    }
    await route.continue();
  });
  await page
    .getByLabel("Legal name", { exact: true })
    .fill("Synthetic Updated Driver");
  await page.getByLabel("I confirm these fields").check();
  await saveStarted;
  await page.evaluate(() => {
    history.pushState(null, "", location.href + "#editing");
    history.back();
  });
  await expect(page.getByLabel("Legal name", { exact: true })).toHaveValue(
    "Synthetic Updated Driver",
  );
  releaseSave();
  await expect(
    page.getByRole("status").filter({ hasText: "Draft saved privately" }),
  ).toBeVisible();
  await page.unroute("**/api/customer/drafts");
  await page.getByRole("button", { name: "Continue to review" }).click();
  const accept = page.getByRole("checkbox", { name: /I accept the displayed/ });
  await expect(accept).toBeEnabled();
  await accept.check();
  await page.evaluate(() => {
    history.pushState(null, "", location.href + "#same");
    history.back();
  });
  await expect(accept).not.toBeChecked();
  await expect(accept).toBeEnabled();
  await page.reload();
  await expect(accept).toBeEnabled();
  await expect(accept).not.toBeChecked();
  await page.context().clearCookies();
  await page.reload();
  // A Review URL without an authenticated draft must never permit submission.
  await expect(
    page.getByRole("heading", { name: "Sign in to My trips" }),
  ).toBeVisible();
  await customerSession(page.context());
  await page.reload();
  await expect(accept).toBeEnabled();
  const ref = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem("dcr-quote-reference")!).id,
  );
  expect(ref).toBe(q.id);
});

test("expiry during intake, refresh price changes and server expiry rejection require fresh acceptance", async ({
  page,
}) => {
  const { q } = await review(page);
  const accept = page.getByRole("checkbox", { name: /I accept the displayed/ });
  await expect(accept).toBeEnabled();
  await accept.check();
  // Real quote response with shortened browser lifetime; server expiry is tested separately against Postgres.
  await page.route("**/api/pilot/quote", async (r) => {
    if (r.request().method() !== "POST") return r.continue();
    const response = await r.fetch();
    const data = await response.json();
    await r.fulfill({
      response,
      json: { ...data, expiresAt: Date.now() + 1200 },
    });
  });
  await page
    .getByRole("button", { name: "Refresh quote", exact: true })
    .click();
  await expect(accept).toBeEnabled();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  // Let the quote expire while a real replacement upload is in flight.
  let held = false;
  await page.route("**/api/customer/drafts", async (route) => {
    if (
      !held &&
      route.request().method() === "POST" &&
      route.request().postDataJSON().action === "upload"
    ) {
      held = true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    await route.continue();
  });
  await completeDriver(page);
  expect(held).toBe(true);
  await page.unroute("**/api/customer/drafts");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(accept).toBeDisabled();
  await expect(
    page.getByRole("status").filter({ hasText: /quote expired/ }),
  ).toBeVisible();
  await page.unroute("**/api/pilot/quote");
  // Price-change UI fixture only; never submit the intercepted quote.
  await page.route("**/api/pilot/quote", async (r) => {
    const response = await r.fetch();
    const data = await response.json();
    await r.fulfill({
      response,
      json: {
        ...data,
        rentalCents: data.rentalCents + 1000,
        totalCents: data.totalCents + 1000,
      },
    });
  });
  await page
    .getByRole("button", { name: "Refresh quote", exact: true })
    .click();
  await expect(page.getByRole("list", { name: "Quote changes" })).toContainText(
    "Trip total",
  );
  await expect(accept).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Submit request", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: `${folder}/${test.info().project.name}-price-change.png`,
    fullPage: true,
  });
  await page.unroute("**/api/pilot/quote");
  await page
    .getByRole("button", { name: "Refresh quote", exact: true })
    .click();
  await accept.check();
  await page.route("**/api/pilot/requests", (r) =>
    r.fulfill({
      status: 409,
      json: {
        error:
          "The quote expired or settings changed. Refresh the quote and accept the current total.",
      },
    }),
  );
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(accept).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "One last look." }),
  ).toBeVisible();
  await expect(
    page.getByText("license: Uploaded — awaiting owner review"),
  ).toBeVisible();
});

// Browser history can change inputs even while buttons are disabled during refresh.
test("late Review refresh cannot attach an obsolete quote after history changes", async ({
  page,
}) => {
  await review(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let received!: () => void;
  const ready = new Promise<void>((r) => (received = r));
  await page.route("**/api/pilot/quote", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch();
    received();
    await gate;
    await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "Refresh quote", exact: true })
    .click();
  await ready;
  await page.evaluate(() => {
    const u = new URL(location.href);
    u.searchParams.set("vehicle", "santafe-3143340");
    u.searchParams.set("period", "monthly");
    u.searchParams.set("start", "2044-11-01T10:00");
    u.searchParams.set("end", "2044-11-08T10:00");
    history.pushState(null, "", u);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  const late = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/pilot/quote") && r.request().method() === "POST",
  );
  release();
  await late;
  await expect(page.locator(".selected-car")).toContainText("Santa Fe");
  await expect(page.locator(".review-trip")).toContainText("monthly");
  await expect(page.locator(".review-trip")).toContainText("2044-11-01");
  await expect(
    page.getByRole("checkbox", { name: /I accept the displayed/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Submit request", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("license: Uploaded — awaiting owner review"),
  ).toBeVisible();
});

for (const width of [320, 390, 1440])
  test(`wizard step focus and intake text reflow ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await review(page);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    const heading = page.getByRole("heading", { name: "Let’s get you ready." });
    await expect(heading).toBeFocused();
    for (const scale of [1, 2]) {
      await page.evaluate(
        (s) => (document.documentElement.style.fontSize = `${s * 100}%`),
        scale,
      );
      await heading.focus();
      await expect
        .poll(() =>
          heading.evaluate(
            (el) =>
              el.getBoundingClientRect().top >=
              document.querySelector(".site-nav")!.getBoundingClientRect()
                .bottom +
                8,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `${folder}/${info.project.name}-${width}-driver-${scale}x.png`,
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      const boundaries = await page
        .locator(".booking-main input, .document-card")
        .evaluateAll((elements) =>
          elements.every(
            (el) =>
              el.getBoundingClientRect().left >= 0 &&
              el.getBoundingClientRect().right <= innerWidth,
          ),
        );
      expect(boundaries).toBe(true);
      if (scale === 1) {
        await page.evaluate(() => window.scrollTo({top:0, behavior:"instant"}));
        await page.screenshot({path:`${folder}/${info.project.name}-${width}-driver-full.png`,fullPage:true});
      }
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Full name", { exact: true })).toBeFocused();
    }
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "100%"),
    );
    await page.getByRole("button", { name: "Continue to review" }).click();
    await expect(
      page.getByRole("heading", { name: "One last look." }),
    ).toBeFocused();
  });

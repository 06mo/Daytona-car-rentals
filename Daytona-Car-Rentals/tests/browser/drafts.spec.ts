import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { customerSession } from "./auth-helper";
test.use({ hasTouch: true });
const origin = "http://127.0.0.1:3000";
async function fill(page: any) {
  await page.getByLabel("Full name", { exact: true }).fill("Synthetic Driver");
  await page.getByLabel("Phone", { exact: true }).fill("0000000000");
  for (const [label, value] of [
    ["Legal name", "Synthetic Driver"],
    ["Date of birth", "1990-01-01"],
    ["License issuing state / country", "FL"],
    ["License expiration", "2045-01-01"],
    ["Residential address for agreement", "123 Synthetic Street"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("I confirm these fields").check();
  await expect(
    page.getByRole("status").filter({ hasText: "Draft saved privately" }),
  ).toBeVisible();
}
function documentCard(page: any, kind: string) {
  return page.getByRole("form", {
    name: kind === "license" ? "Driver’s license" : "Insurance document",
    exact: true,
  });
}
async function upload(page: any, kind: string) {
  const card = documentCard(page, kind);
  const chooser = page.waitForEvent("filechooser");
  await card
    .getByRole("button", {
      name: /^(Upload image|Replace image)$/,
      exact: true,
    })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 40, height: 30, channels: 3, background: "#aaa" },
    })
      .png()
      .toBuffer(),
  });
  await expect(card.getByText(/Selected image — not uploaded/)).toBeVisible();
  await card.getByLabel("Expiration date").fill("2045-01-01");
  await card.getByLabel("This is a synthetic test image").check();
  await card.getByRole("button", { name: "Save image", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText(
    "Uploaded — awaiting review",
  );
  await expect(card.getByText(/Selected image — not uploaded/)).toHaveCount(0);
}
for (const width of [1440, 390, 320])
  test(`private draft full journey, upload failure and review at ${width}`, async ({
    page,
  }) => {
    await customerSession(page.context());
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    const day = width === 1440 ? "01" : width === 390 ? "11" : "21";
    await page.goto(
      `/booking?vehicle=corolla-3275798&period=weekly&start=2041-05-${day}T10:00&end=2041-05-${String(+day + 4).padStart(2, "0")}T10:00`,
    );
    await page.getByRole("button", { name: "See my trip total" }).click();
    await page
      .getByRole("button", { name: "Continue to driver & documents" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Let’s get you ready." }),
    ).toBeFocused();
    await expect(page.getByLabel("Full name", { exact: true })).toBeEnabled();
    await page.getByRole("heading", { name: "Let’s get you ready." }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Full name", { exact: true })).toBeFocused();
    await fill(page);
    await expect(
      page.getByRole("button", { name: "Use camera", exact: true }),
    ).toHaveCount(0);
    const initialCard = documentCard(page, "license");
    await initialCard
      .getByRole("button", { name: "Upload image", exact: true })
      .focus();
    await expect(
      initialCard.getByRole("button", { name: "Upload image", exact: true }),
    ).toBeFocused();
    await upload(page, "license");
    await upload(page, "insurance");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `/projects/daytona-handoff/document-card-native-picker/regressions/${width}-driver-documents.png`,
      fullPage: true,
    });
    const id = new URL(page.url()).searchParams.get("draft");
    expect(id).toBeTruthy();
    // No request yet, and the document is never in local/session storage.
    expect(
      JSON.stringify(
        await page.evaluate(() => ({ ...localStorage, ...sessionStorage })),
      ),
    ).not.toContain("data:image");
    await page.route("**/api/customer/drafts", async (route) => {
      if (
        route.request().method() === "POST" &&
        route.request().postDataJSON().action === "upload"
      )
        return route.abort();
      return route.continue();
    });
    await documentCard(page, "license")
      .getByLabel(/image file/)
      .setInputFiles({
        name: "synthetic.png",
        mimeType: "image/png",
        buffer: await sharp({
          create: { width: 20, height: 20, channels: 3, background: "#bbb" },
        })
          .png()
          .toBuffer(),
      });
    await documentCard(page, "license")
      .getByLabel("Expiration date")
      .fill("2045-01-01");
    await documentCard(page, "license")
      .getByLabel("This is a synthetic test image")
      .check();
    await documentCard(page, "license")
      .getByRole("button", { name: "Save image", exact: true })
      .click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Connection interrupted",
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `/projects/daytona-handoff/document-card-native-picker/regressions/${width}-replacement-failure.png`,
      fullPage: true,
    });
    await page.unroute("**/api/customer/drafts");
    const failedCard = documentCard(page, "license");
    await expect(
      failedCard.getByRole("button", { name: "Retry save" }),
    ).toBeVisible();
    await failedCard.getByRole("button", { name: "Retry save" }).click();
    await expect(
      failedCard.getByText(/Selected image — not uploaded/),
    ).toHaveCount(0);
    await failedCard
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await expect(failedCard.getByRole("status")).toHaveText("Missing");
    await expect(failedCard.getByRole("button", {name:"Upload image",exact:true})).toBeFocused();
    await upload(page, "license");
    await expect(
      documentCard(page, "license").getByText("Uploaded — awaiting review", {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page
      .getByRole("button", { name: "Continue to driver & documents" })
      .click();
    await expect(page.getByLabel("Legal name")).toHaveValue("Synthetic Driver");
    await expect(
      documentCard(page, "insurance").getByText("Uploaded — awaiting review", {
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `/projects/daytona-handoff/document-card-native-picker/regressions/${width}-upload-retry.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continue to review" }).click();
    await expect(
      page.getByRole("heading", { name: "One last look." }),
    ).toBeFocused();
    await expect(
      page.getByText("license: Uploaded — awaiting owner review"),
    ).toBeVisible();
    await page
      .getByRole("checkbox", { name: /I accept the displayed trip total/ })
      .check();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `/projects/daytona-handoff/document-card-native-picker/regressions/${width}-review.png`,
      fullPage: true,
    });
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/pilot/requests") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Try booking request" }).click();
    const res = await response;
    expect(res.status(), await res.text()).toBe(201);
    const body = res.request().postDataJSON();
    const again = await page.request.post("/api/pilot/requests", {
      headers: { Origin: origin },
      data: body,
    });
    expect(again.status()).toBe(201);
    expect((await again.json()).id).toBe((await res.json()).id);
    await page.getByRole("link", { name: "View My trips" }).click();
    const card = page
      .locator(".trip-card")
      .filter({ hasText: (await res.json()).id });
    await expect(card).toContainText("Under review");
    await expect(
      card.getByRole("button", { name: "Send information for owner review" }),
    ).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `/projects/daytona-handoff/document-card-native-picker/regressions/${width}-my-trips.png`,
      fullPage: true,
    });
  });
test("private draft resumes after auth and cannot cross accounts; fresh quote preserves information", async ({
  page,
  browser,
}) => {
  await customerSession(page.context());
  await page.goto(
    "/booking?vehicle=focus-3139374&period=monthly&start=2042-02-01T10:00&end=2042-02-20T10:00&step=2",
  );
  await fill(page);
  await upload(page, "license");
  const url = page.url(),
    id = new URL(url).searchParams.get("draft")!;
  await page.context().clearCookies();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign in to My trips" }),
  ).toBeVisible();
  await customerSession(page.context());
  await page.reload();
  await expect(page.getByLabel("Legal name")).toHaveValue("Synthetic Driver");
  await expect(
    documentCard(page, "license").getByText("Uploaded — awaiting review", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "See my trip total" }).click();
  await page
    .getByRole("button", { name: "Continue to driver & documents" })
    .click();
  await upload(page, "insurance");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page
    .getByRole("checkbox", { name: /I accept the displayed trip total/ })
    .check();
  await page.route("**/api/pilot/requests", (r) =>
    r.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: "Quote expired. Obtain a fresh total." }),
    }),
  );
  await page.getByRole("button", { name: "Try booking request" }).click();
  await expect(
    page.getByRole("button", { name: "See my trip total" }),
  ).toBeVisible();
  await page.unroute("**/api/pilot/requests");
  await page.getByRole("button", { name: "See my trip total" }).click();
  await page
    .getByRole("button", { name: "Continue to driver & documents" })
    .click();
  await expect(page.getByLabel("Legal name")).toHaveValue("Synthetic Driver");
  await expect(
    documentCard(page, "license").getByText("Uploaded — awaiting review", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(
    page.getByRole("checkbox", { name: /I accept the displayed trip total/ }),
  ).not.toBeChecked();
  const other = await browser.newContext();
  await customerSession(other, true);
  const p = await other.newPage();
  await p.goto(url);
  await expect(p.getByText("Draft not found or expired.")).toBeVisible();
  expect((await p.request.get("/api/customer/drafts?id=" + id)).status()).toBe(
    404,
  );
  await expect(p.getByLabel("Legal name")).toHaveCount(0);
  await other.close();
});

test("returning renter explicitly reuses documents, saves later and resumes an owned draft", async ({
  page,
}) => {
  const { preparedRequest } = await import("./auth-helper");
  await customerSession(page.context());
  await page.goto("/my-trip");
  const q = await (
    await page.request.post("/api/pilot/quote", {
      headers: { Origin: origin },
      data: {
        vehicleId: "elantra-3321200",
        start: "2043-03-01T10:00",
        end: "2043-03-08T10:00",
        location: "local",
        period: "weekly",
      },
    })
  ).json();
  const submitted = await page.request.post("/api/pilot/requests", {
    headers: { Origin: origin },
    data: await preparedRequest(page, q),
  });
  expect(submitted.status()).toBe(201);
  await page.goto(
    "/booking?vehicle=elantra-3321200&start=2043-04-01T10:00&end=2043-04-08T10:00&period=weekly&step=2",
  );
  await expect(page.getByLabel("Legal name")).toHaveValue("Synthetic Driver");
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Synthetic Driver",
  );
  await expect(page.getByLabel("I confirm these fields")).not.toBeChecked();
  await expect(
    page.getByText("Uploaded — awaiting review", { exact: true }),
  ).toHaveCount(0);
  const reuse = page.getByText("Reuse a saved document", { exact: true });
  await reuse.focus();
  await page.keyboard.press("Enter");
  for (const kind of ["license", "insurance"]) {
    await page
      .getByRole("button", {
        name: new RegExp("Reuse " + kind + " valid through"),
      })
      .click();
    await expect(
      documentCard(page, kind).getByText("Uploaded — awaiting review", {
        exact: true,
      }),
    ).toBeVisible();
  }
  await page.getByLabel("I confirm these fields").check();
  await page.getByRole("button", { name: "Save and finish later" }).click();
  await page.waitForURL("**/my-trip");
  await page.getByRole("link", { name: "Resume driver & documents" }).click();
  await expect(page.getByLabel("Legal name")).toHaveValue("Synthetic Driver");
  await expect(
    documentCard(page, "license").getByText("Uploaded — awaiting review", {
      exact: true,
    }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("period")).toBe("weekly");
  await page.goBack();
  await page.waitForURL("**/my-trip");
  await page.goForward();
  await expect(page.getByLabel("Legal name")).toHaveValue("Synthetic Driver");
  await expect(
    documentCard(page, "insurance").getByText("Uploaded — awaiting review", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("#pickup-time")).toHaveValue("2043-04-01T10:00");
  await expect(page.locator("#booking-period")).toHaveValue("weekly");
  await expect(page.locator(".quote-ready")).toHaveCount(0);
});

test("account switch discards delayed previous-customer My trips and draft responses", async ({
  page,
}) => {
  await customerSession(page.context());
  await page.goto("/my-trip");
  const user = (await (await page.request.get("/api/customer/auth")).json())
    .customer;
  const saved = await page.request.post("/api/customer/drafts", {
    headers: { Origin: origin },
    data: {
      action: "save",
      expectedOwner: user.id,
      id: crypto.randomUUID(),
      revision: 0,
      data: {
        trip: {
          vehicleId: "focus-3139374",
          start: "",
          end: "",
          location: "local",
          period: "monthly",
        },
        contact: { name: "Synthetic previous account", phone: "0000000000" },
        intake: { confirmed: false },
      },
    },
  });
  expect(saved.ok()).toBeTruthy();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Resume driver & documents" }),
  ).toBeVisible();
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>((r) => (release = r)),
    ready = new Promise<void>((r) => (started = r));
  let first = true;
  await page.route("**/api/customer/trips", async (route) => {
    if (first && route.request().method() === "GET") {
      first = false;
      const original = await route.fetch();
      started();
      await gate;
      return route.fulfill({ response: original });
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "Refresh trips" }).click();
  await ready;
  await page.context().clearCookies();
  await customerSession(page.context(), true);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Resume driver & documents" }),
  ).toHaveCount(0);
  const late = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/customer/trips") && r.request().method() === "GET",
  );
  release();
  await late;
  await page.waitForLoadState("networkidle");
  await page.unroute("**/api/customer/trips");
  await expect(
    page.getByRole("link", { name: "Resume driver & documents" }),
  ).toHaveCount(0);
  await expect(page.getByText("Synthetic previous account")).toHaveCount(0);
});

test("document cards use one native picker, validate inline and follow quote requirements", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await customerSession(page.context());
  await page.route("**/api/pilot/quote", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch();
    const quote = await response.json();
    // UI-only policy fixture: never submitted as an authoritative quote.
    quote.policy.requiredDocuments = ["license"];
    await route.fulfill({ response, json: quote });
  });
  await page.goto(
    "/booking?vehicle=corolla-3275798&period=weekly&start=2044-06-01T10:00&end=2044-06-08T10:00",
  );
  await page.getByRole("button", { name: "See my trip total" }).click();
  await page
    .getByRole("button", { name: "Continue to driver & documents" })
    .click();
  await fill(page);
  const card = documentCard(page, "license");
  await expect(card.getByText("Required", { exact: true })).toBeVisible();
  await expect(
    documentCard(page, "insurance").getByText("Optional", { exact: true }),
  ).toBeVisible();
  await card
    .getByLabel(/image file/)
    .setInputFiles({
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("synthetic"),
    });
  await expect(card.getByRole("alert")).toContainText("JPEG or PNG");
  const image = async (background: string) =>
    sharp({ create: { width: 30, height: 20, channels: 3, background } })
      .png()
      .toBuffer();
  await card
    .getByLabel(/image file/)
    .setInputFiles({
      name: "first.png",
      mimeType: "image/png",
      buffer: await image("#aaa"),
    });
  const replacement = await image("#bbb");
  const chooser = page.waitForEvent("filechooser");
  await card.getByRole("button", { name: "Replace image" }).click();
  await (
    await chooser
  ).setFiles({ name: "replacement.png", mimeType: "image/png", buffer: replacement });
  await expect(card.getByRole("img")).toHaveCount(1);
  await expect(card.getByRole("status")).toHaveText("Missing");
  await card.getByRole("button", { name: "Save image", exact: true }).click();
  await expect(card.getByRole("alert")).toContainText("expiration date");
  await card.getByLabel("Expiration date").fill("2045-01-01");
  await card.getByLabel("This is a synthetic test image").check();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/api/customer/drafts", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().postDataJSON().action === "upload"
    ) {
      expect(route.request().postDataJSON().content).toBe(
        replacement.toString("base64"),
      );
      await gate;
    }
    await route.continue();
  });
  await card.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText("Uploading");
  release();
  await expect(card.getByRole("status")).toHaveText(
    "Uploaded — awaiting review",
  );
  await expect(card.getByRole("img")).toHaveCount(1);
  await page.unroute("**/api/customer/drafts");
  const savedImage = await card.getByRole("img").getAttribute("src");
  await page.route("**/api/customer/drafts", async (route) => {
    if (
      route.request().method() === "POST" &&
      route.request().postDataJSON().action === "upload"
    )
      return route.fulfill({
        status: 422,
        json: { error: "Synthetic rejection" },
      });
    return route.continue();
  });
  await card.getByRole("button", { name: "Replace image", exact: true }).focus();
  await expect(
    card.getByRole("button", { name: "Replace image", exact: true }),
  ).toBeFocused();
  await card
    .getByLabel(/image file/)
    .setInputFiles({
      name: "replace.png",
      mimeType: "image/png",
      buffer: await image("#ccc"),
    });
  await card.getByLabel("This is a synthetic test image").check();
  await card.getByRole("button", { name: "Save image", exact: true }).click();
  await expect(card.getByRole("alert")).toContainText("Synthetic rejection");
  await card.getByRole("button", { name: "Remove selected image" }).click();
  await expect(card.getByRole("img")).toHaveAttribute("src", savedImage!);
  expect((await page.request.get(savedImage!)).ok()).toBeTruthy();
});

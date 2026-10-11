import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { customerSession, preparedRequest } from "./auth-helper";

test("owner review sequence preserves corrections and blocks premature confirmation", async ({
  page,
  browser,
}, info) => {
  const headers = { Origin: "http://127.0.0.1:3000" };
  await customerSession(page.context());
  const month = info.project.name === "webkit" ? "09" : "08";
  const q = await (
    await page.request.post("/api/pilot/quote", {
      headers,
      data: {
        vehicleId: "corolla-3275798",
        start: `2043-${month}-01T10:00`,
        end: `2043-${month}-04T10:00`,
        period: "weekly",
        location: "local",
      },
    })
  ).json();
  const draft = await preparedRequest(page, q);
  const response = await page.request.post("/api/pilot/requests", {
    headers,
    data: draft,
  });
  expect(response.status()).toBe(201);
  const r = await response.json();
  const denied = await browser.newContext();
  expect(
    (
      await denied.request.get("http://127.0.0.1:3000/api/admin/portal")
    ).status(),
  ).toBe(401);
  await page.goto("/admin");
  await page.getByLabel("Admin password").fill(process.env.DCR_E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Reservations", exact: true }).click();
  await page
    .locator(".request-list button")
    .filter({ hasText: r.id.slice(0, 8) })
    .click();
  await expect(
    page.getByRole("heading", { name: "Renter details", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Review action", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("Alternative car", { exact: true })).toHaveCount(
    0,
  );
  const decision = page.getByRole("button", {
    name: "Record review decision",
    exact: true,
  });
  await expect(decision).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Confirm after review", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".owner-document-grid")).toContainText(
    "2045-01-01",
  );
  const docUrl = await page
    .getByRole("link", { name: /View private document/ })
    .first()
    .getAttribute("href");
  expect((await page.request.get(docUrl!)).status()).toBe(200);
  expect(
    (await denied.request.get("http://127.0.0.1:3000" + docUrl)).status(),
  ).toBe(401);
  await denied.close();
  const headings = await page.locator(".admin-content h2").allTextContents();
  expect(headings.indexOf("Renter details")).toBeLessThan(
    headings.indexOf("Documents"),
  );
  expect(headings.indexOf("Documents")).toBeLessThan(
    headings.indexOf("Review decision"),
  );
  expect(headings.indexOf("Review decision")).toBeLessThan(
    headings.indexOf("Final booking confirmation"),
  );
  await page
    .getByLabel("Review action", { exact: true })
    .selectOption("alternative");
  await expect(
    page.getByLabel("Alternative car", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Review action", { exact: true })
    .selectOption("corrections");
  await expect(page.getByLabel("Alternative car", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByLabel("Reason / instructions visible to customer")
    .fill("Please confirm the corrected agreement address.");
  await page.getByLabel("Review action", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel("Reason / instructions visible to customer"),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(decision).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Saved.");
  await expect(page.getByLabel("Review action", { exact: true })).toHaveValue(
    "",
  );
  await page.goto("/my-trip");
  await expect(
    page.getByText("Please confirm the corrected agreement address.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByText("Renter information", { exact: true }).click();
  await page
    .getByLabel("Residential address for agreement")
    .fill("456 Synthetic Corrected Street");
  await page.getByLabel("I confirm these fields").check();
  await page
    .getByRole("button", { name: "Save renter information", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Send information for owner review",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Send information for owner review",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Reservations", exact: true }).click();
  await page
    .locator(".request-list button")
    .filter({ hasText: r.id.slice(0, 8) })
    .click();
  await expect(page.locator(".owner-facts")).toContainText([
    "Synthetic Driver",
  ]);
  await expect(page.locator(".portal-tools")).toContainText(
    "456 Synthetic Corrected Street",
  );
  const state = await (await page.request.get("/api/admin/state")).json();
  const current = state.reservations.find((x: any) => x.id === r.id);
  const blocked = await page.request.post("/api/admin/state", {
    headers,
    data: {
      action: "status",
      id: r.id,
      revision: current.revision,
      status: "confirmed",
    },
  });
  expect(blocked.status()).toBe(409);
  await expect(
    page.getByRole("button", { name: "Confirm after review", exact: true }),
  ).toBeDisabled();
  expect(current.reviewStage).toBe("under_review");
  expect(Object.values(current.checks).every((x: any) => !x.checked)).toBe(
    true,
  );
  await mkdir("/projects/daytona-handoff/owner-review/screenshots", {
    recursive: true,
  });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/projects/daytona-handoff/owner-review/screenshots/${info.project.name}-${width}.png`,
      fullPage: true,
    });
    await page.getByLabel("Review action", { exact: true }).focus();
    await expect(
      page.getByLabel("Review action", { exact: true }),
    ).toBeFocused();
  }
  for (const action of ["documents", "approved"]) {
    await page
      .getByLabel("Review action", { exact: true })
      .selectOption(action);
    await page
      .getByLabel("Reason / instructions visible to customer")
      .fill("Synthetic manual review completed for this test.");
    await page
      .getByRole("button", { name: "Record review decision", exact: true })
      .click();
    await expect(page.getByLabel("Review action", { exact: true })).toHaveValue(
      "",
    );
  }
  const updated = (
    await (await page.request.get("/api/admin/state")).json()
  ).reservations.find((x: any) => x.id === r.id);
  expect(updated.reviewStage).toBe("approved");
  expect(Object.values(updated.checks).every((x: any) => !x.checked)).toBe(
    true,
  );
  await expect(
    page.getByRole("button", { name: "Confirm after review", exact: true }),
  ).toBeDisabled();
  const releaseBlocked = await page.request.post("/api/admin/state", {
    headers,
    data: {
      action: "status",
      id: r.id,
      revision: updated.revision,
      status: "confirmed",
    },
  });
  expect(releaseBlocked.status()).toBe(409);
  expect((await releaseBlocked.json()).error).toContain("release check");
});

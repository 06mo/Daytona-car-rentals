import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { customerSession, preparedRequest } from "./auth-helper";
const baseline = process.env.DCR_LAYOUT_BASELINE === "1";
const root =
  "/projects/daytona-handoff/intake-layout/" + (baseline ? "before" : "after");
async function inspect(page: Page, scope: string, label: string) {
  const controls = await page
    .locator(scope + " input:not([type=checkbox]):not([type=file])")
    .evaluateAll((elements) =>
      elements
        .filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => {
          const input = e as HTMLInputElement;
          const parent = e.parentElement!;
          const box = e.getBoundingClientRect();
          const ps = getComputedStyle(parent);
          const pr = parent.getBoundingClientRect();
          const cs = getComputedStyle(e);
          const ancestors = [];
          let ancestor = parent;
          while (ancestor && !ancestor.matches("body")) {
            const style = getComputedStyle(ancestor);
            const rect = ancestor.getBoundingClientRect();
            if (style.display !== "inline" && rect.width > 0) {
              const contentLeft =
                rect.left +
                parseFloat(style.borderLeftWidth) +
                parseFloat(style.paddingLeft);
              const contentRight =
                rect.right -
                parseFloat(style.borderRightWidth) -
                parseFloat(style.paddingRight);
              ancestors.push({
                element: ancestor.tagName + "." + ancestor.className,
                contained:
                  box.left >= contentLeft - 1 && box.right <= contentRight + 1,
              });
            }
            ancestor = ancestor.parentElement!;
          }
          const left =
            pr.left +
            parseFloat(ps.borderLeftWidth) +
            parseFloat(ps.paddingLeft);
          const right =
            pr.right -
            parseFloat(ps.borderRightWidth) -
            parseFloat(ps.paddingRight);
          return {
            name: input.name || input.id || parent.textContent?.trim(),
            type: input.type,
            value: input.value,
            left: box.left,
            right: box.right,
            parentLeft: left,
            parentRight: right,
            width: box.width,
            parentWidth: right - left,
            boxSizing: cs.boxSizing,
            minWidth: cs.minWidth,
            padding: cs.padding,
            fontSize: cs.fontSize,
            appearance: cs.appearance,
            grid: ps.gridTemplateColumns,
            contained:
              box.left >= left - 1 &&
              box.right <= right + 1 &&
              ancestors.every((a) => a.contained),
            ancestors,
          };
        }),
    );
  await writeFile(
    root + "/" + label + ".json",
    JSON.stringify(controls, null, 2),
  );
  if (!baseline)
    for (const c of controls) expect(c.contained, JSON.stringify(c)).toBe(true);
  return controls;
}
for (const width of [320, 390, 1440])
  test(`populated request and My trips date bounds ${width}`, async ({
    page,
  }, info) => {
    await mkdir(root, { recursive: true });
    await customerSession(page.context());
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    const month = info.project.name === "webkit" ? "08" : "07",
      day = width === 320 ? 4 : width === 390 ? 8 : 12;
    const trip = {
      vehicleId: "corolla-3275798",
      start: `2044-${month}-${String(day).padStart(2, "0")}T10:00`,
      end: `2044-${month}-${String(day + 2).padStart(2, "0")}T10:00`,
      location: "local",
      period: "weekly",
    };
    const url =
      "/booking?" +
      new URLSearchParams({
        vehicle: trip.vehicleId,
        start: trip.start,
        end: trip.end,
        period: trip.period,
      });
    const name = `${info.project.name}-${width}`;
    await page.goto(url);
    await expect(page.locator("#pickup-time")).toHaveValue(trip.start);
    for (const scale of [1, 2]) {
      await page.evaluate(
        (s) => (document.documentElement.style.fontSize = s + "%"),
        scale * 100,
      );
      await inspect(page, ".booking-main", `${name}-choose-${scale}x`);
    }
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "100%"),
    );
    const qResponse = await page.request.post("/api/pilot/quote", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: trip,
    });
    expect(qResponse.ok()).toBe(true);
    const q = await qResponse.json();
    const draft = await preparedRequest(page, q);
    await page.goto(url + "&draft=" + draft.draftId + "&step=2");
    await expect(page.getByLabel("Legal name", { exact: true })).toHaveValue(
      "Synthetic Driver",
    );
    const image = {
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: await sharp({
        create: { width: 24, height: 24, channels: 3, background: "#aaa" },
      })
        .png()
        .toBuffer(),
    };
    const doc = page.getByRole("form", {
      name: "Driver’s license",
      exact: true,
    });
    await doc.getByLabel(/image file/).setInputFiles(image);
    await doc.getByLabel("Expiration date").fill("2045-01-01");
    for (const scale of [1, 2]) {
      await page.evaluate(
        (s) => (document.documentElement.style.fontSize = s + "%"),
        scale * 100,
      );
      await inspect(
        page,
        '[aria-label="Private driver draft"]',
        `${name}-intake-${scale}x`,
      );
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.screenshot({
        path: root + `/${name}-intake-${scale}x.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Continue to review", exact: true })
        .focus();
      await page.screenshot({ path: root + `/${name}-actions-${scale}x.png` });
      if (!baseline) {
        const primary = page.getByRole("button", {
          name: "Continue to review",
          exact: true,
        });
        const save = page.getByRole("button", {
          name: "Save draft",
          exact: true,
        });
        const back = page.getByRole("button", { name: "Back", exact: true });
        const p = (await primary.boundingBox())!,
          s = (await save.boundingBox())!,
          b = (await back.boundingBox())!;
        expect(p.height).toBeGreaterThanOrEqual(44);
        expect(s.height).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
        if (width < 640) {
          expect(Math.abs(s.y - b.y)).toBeLessThan(1);
          expect(s.y - p.y - p.height).toBeGreaterThanOrEqual(11);
          expect(b.x - s.x - s.width).toBeGreaterThanOrEqual(11);
          expect(Math.abs(p.width - (b.x + b.width - s.x))).toBeLessThan(1);
          if (scale === 1) {
            expect(p.height).toBeLessThanOrEqual(60);
            expect(s.height).toBeLessThanOrEqual(60);
          }
        }
        await page.keyboard.press("Tab");
        await expect(save).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(back).toBeFocused();
      }
    }
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "100%"),
    );
    // Submit the already-saved synthetic versions, not the unsaved selected image.
    const submitted = await page.request.post("/api/pilot/requests", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: draft,
    });
    expect(submitted.status()).toBe(201);
    await page.goto("/my-trip");
    await page.getByText("Renter information", { exact: true }).click();
    await expect(page.getByLabel("Date of birth", { exact: true })).toHaveValue(
      "1990-01-01",
    );
    await page.getByText(/Private documents ·/).click();
    const portalDoc = page.getByRole("form", {
      name: "Driver’s license",
      exact: true,
    });
    await portalDoc.getByLabel(/image file/).setInputFiles(image);
    await portalDoc.getByLabel("Expiration date").fill("2045-01-01");
    for (const scale of [1, 2]) {
      await page.evaluate(
        (s) => (document.documentElement.style.fontSize = s + "%"),
        scale * 100,
      );
      await inspect(page, ".portal", `${name}-portal-${scale}x`);
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.screenshot({
        path: root + `/${name}-portal-${scale}x.png`,
        fullPage: true,
      });
    }
  });

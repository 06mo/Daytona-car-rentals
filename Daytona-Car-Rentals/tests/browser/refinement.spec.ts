import { test, expect } from "@playwright/test";

test("homepage chips and period control stay synchronized; date panel validates before browsing", async ({page}) => {
  await page.goto("/");
  const panel=page.locator(".hero-search");
  await page.getByRole("button",{name:"Monthly",exact:true}).click();
  await expect(page.locator("#rental-period")).toHaveValue("monthly");
  await expect(page.getByRole("button",{name:"Monthly",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.locator("#rental-period").selectOption("weekly");
  await expect(page.getByRole("button",{name:"Weekly",exact:true})).toHaveAttribute("aria-pressed","true");
  await panel.getByRole("button",{name:"Browse cars",exact:true}).click();
  await page.waitForURL("**/fleet?**");
  await expect(page.locator("#rental-period")).toHaveValue("weekly");
  await page.goto("/");
  await page.locator("#journey-start").fill("2035-02-01T10:00");
  await panel.getByRole("button",{name:"Browse cars with these dates"}).click();
  await expect(page.getByRole("alert").filter({hasText:"Enter both"})).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
  await page.locator("#journey-end").fill("2035-02-01T10:00");
  await panel.getByRole("button",{name:"Browse cars with these dates"}).click();
  await expect(page.getByRole("alert").filter({hasText:"Return must be after"})).toBeVisible();
  await page.locator("#journey-end").fill("2035-03-04T10:00");
  await panel.getByRole("button",{name:"Browse cars with these dates"}).click();
  await expect(page.getByRole("alert").filter({hasText:"up to 30 days"})).toBeVisible();
  await page.locator("#journey-end").fill("2035-02-08T10:00");
  await page.getByRole("button",{name:"Weekly",exact:true}).click();
  await panel.getByRole("button",{name:"Browse cars with these dates"}).click();
  await page.waitForURL("**/fleet?**");
  await expect(page.locator("#journey-start")).toHaveValue("2035-02-01T10:00");
  await expect(page.locator("#journey-end")).toHaveValue("2035-02-08T10:00");
  await expect(page.locator("#rental-period")).toHaveValue("weekly");
});

for(const width of [390,320]) test(`${width}px disclosures preserve values and recommendations precede dates`, async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/fleet?period=monthly&start=2035-04-01T10:00&end=2035-04-30T10:00");
  const summary=page.locator(".optional-dates summary");
  await expect(page.locator("#journey-start")).toBeHidden();
  await summary.focus();await page.keyboard.press("Enter");
  await expect(page.locator("#journey-start")).toBeVisible();
  await expect(page.locator("#journey-start")).toHaveValue("2035-04-01T10:00");
  await summary.focus();await page.keyboard.press("Enter");
  await expect(page.locator("#journey-start")).toBeHidden();
  await page.locator("main").getByRole("link",{name:"Help me choose",exact:true}).click();
  await page.waitForURL("**/assistant?**");
  await page.getByRole("button",{name:"Compare SUVs"}).click();
  await expect(page.locator("#rental-period")).toHaveValue("monthly");
  const cards=await page.locator(".comparison-grid").boundingBox();const dates=await page.locator(".optional-dates").boundingBox();
  expect(cards!.y+cards!.height).toBeLessThan(dates!.y);
  await expect(page.locator("#journey-end")).toHaveValue("2035-04-30T10:00");
  await page.locator('[data-vehicle="santafe-3143340"]').getByRole("link",{name:"Request this car"}).click();
  const change=page.locator(".change-car summary");await change.focus();await page.keyboard.press("Enter");
  await page.locator("#vehicle").selectOption("ecosport-3580557");
  await expect(page.locator("#pickup-time")).toHaveValue("2035-04-01T10:00");
  await expect(page.locator("#booking-period")).toHaveValue("monthly");
  await change.focus();await page.keyboard.press("Enter");
  await expect(page.locator("#vehicle")).toBeHidden();
  await expect(page.locator(".selected-car")).toContainText("Ford EcoSport");
});

test("changing car invalidates a ready or in-flight quote and preserves trip preferences",async({page})=>{
  await page.goto("/booking?vehicle=santafe-3143340&period=monthly&location=airport&start=2035-05-01T10:00&end=2035-05-08T10:00");
  await expect(page.locator(".booking-aside")).toContainText("Select ‘See my trip total’ to calculate your quote.");
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  let received!:()=>void;const ready=new Promise<void>(resolve=>received=resolve);
  await page.route("**/api/pilot/quote",async route=>{
    if(route.request().method()!=="POST") return route.continue();
    const response=await route.fetch();received();await gate;await route.fulfill({response});
  });
  await page.getByRole("button",{name:"See my trip total"}).click();await ready;
  await page.locator(".change-car summary").click();
  await page.locator("#vehicle").selectOption("ecosport-3580557");
  const stale=page.waitForResponse(r=>r.url().endsWith("/api/pilot/quote")&&r.request().method()==="POST");release();await stale;
  await expect(page.getByRole("button",{name:"Continue to contact details"})).toHaveCount(0);
  await page.unroute("**/api/pilot/quote");
  await expect(page.locator("#booking-period")).toHaveValue("monthly");
  await expect(page.locator("#location")).toHaveValue("airport");
  await expect(page.locator("#pickup-time")).toHaveValue("2035-05-01T10:00");
  await expect(page.locator("#return-time")).toHaveValue("2035-05-08T10:00");
  await page.getByRole("button",{name:"See my trip total"}).click();
  await expect(page.getByRole("button",{name:"Continue to contact details"})).toBeVisible();
  await page.locator("#vehicle").selectOption("focus-3139374");
  await expect(page.getByRole("button",{name:"Continue to contact details"})).toHaveCount(0);
  await expect(page.locator(".booking-aside")).toContainText("Select ‘See my trip total’ to calculate your quote.");
});

test("edited draft survives browser Back and wizard Back restores heading focus",async({page})=>{
  await page.goto("/booking?vehicle=santafe-3143340&period=monthly&start=2035-06-01T10:00&end=2035-06-30T10:00");
  await page.locator(".change-car summary").click();
  await page.locator("#vehicle").selectOption("ecosport-3580557");
  await page.locator("#booking-period").selectOption("weekly");
  await page.locator("#pickup-time").fill("2035-07-01T10:00");await page.locator("#return-time").fill("2035-07-08T10:00");
  await page.locator("main").getByRole("link",{name:"Help me choose",exact:true}).click();await page.waitForURL("**/assistant?**");await page.locator("#rental-period").waitFor();
  await page.goBack();await expect(page.locator("#pickup-time")).toHaveValue("2035-07-01T10:00");
  await expect(page.locator("#vehicle")).toHaveValue("ecosport-3580557");await expect(page.locator("#booking-period")).toHaveValue("weekly");
  await page.getByRole("button",{name:"See my trip total"}).click();await page.getByRole("button",{name:"Continue to contact details"}).click();
  await page.getByRole("button",{name:"Back",exact:true}).focus();await page.keyboard.press("Enter");
  await expect(page.getByRole("heading",{name:"Plan your rental."})).toBeFocused();
});

import { test, expect } from "@playwright/test";
import { vehicles } from "../../lib/data/vehicles";
import { isDirectRental } from "../../lib/data/rentalChannels";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
const evidence = process.env.DAYTONA_EVIDENCE_DIR || "test-results/experience";

for (const period of ["weekly", "monthly"]) {
  test(`${period} survives homepage, fleet, comparison, selection, and request roundtrip`, async ({page}) => {
    await page.goto("/");
    await page.getByRole("button", { name: period === "weekly" ? "Weekly" : "Monthly", exact:true }).click();
    await page.locator(".hero-search").getByRole("button", { name:"Browse cars", exact:true }).click();
    await page.waitForURL("**/fleet?**");
    await expect(page.getByRole("combobox",{name:"Rental period",exact:true})).toHaveValue(period);
    await page.locator(".optional-dates summary").click();
    await page.getByLabel("Pickup (optional)").fill("2032-04-01T10:00");
    await page.getByLabel("Return (optional)").fill("2032-04-08T10:00");
    await page.locator("main").getByRole("link",{name:"Help me choose"}).click();
    await page.getByRole("button",{name:"Compare SUVs"}).click();
    await expect(page.getByRole("combobox",{name:"Rental period",exact:true})).toHaveValue(period);
    await page.locator('[data-vehicle="santafe-3143340"]').getByRole("link",{name:"Request this car"}).click();
    await expect(page.getByRole("combobox",{name:"Rental period",exact:true})).toHaveValue(period);
    await expect(page.locator("#vehicle")).toHaveValue("santafe-3143340");
    await expect(page.getByLabel("Pickup date & time")).toHaveValue("2032-04-01T10:00");
    await expect(page.getByLabel("Return date & time")).toHaveValue("2032-04-08T10:00");
    await page.locator(".change-car summary").click();
    await page.locator("main").getByRole("link",{name:"Browse cars",exact:true}).click();
    await page.locator("main").getByRole("link",{name:"Help me choose"}).click();
    expect(new URL(page.url()).searchParams.get("vehicle")).toBe("santafe-3143340");
    await page.getByRole("button",{name:"Compare SUVs"}).click();
    await page.locator('[data-vehicle="ecosport-3580557"]').getByRole("link",{name:"Request this car"}).click();
    await expect(page.locator("#vehicle")).toHaveValue("ecosport-3580557");
    await expect(page.getByRole("combobox",{name:"Rental period",exact:true})).toHaveValue(period);
    await page.reload();
    await expect(page.getByLabel("Return date & time")).toHaveValue("2032-04-08T10:00");
  });
}

test("channel filters, original Turo destinations, and URL/API boundary", async ({page,request}) => {
  await page.goto("/fleet");
  await expect(page.locator("[data-vehicle]")).toHaveCount(12);
  for (const v of vehicles) {
    const card = page.locator(`[data-vehicle="${v.id}"]`);
    if (isDirectRental(v.id)) await expect(card.getByRole("link",{name:"Request this car"})).toBeVisible();
    else {
      await expect(card.getByRole("link",{name:"Book on Turo ↗",exact:true})).toHaveAttribute("href",v.turoUrl);
      await expect(card.getByRole("link",{name:"Request this car"})).toHaveCount(0);
      const response = await request.post("/api/pilot/quote",{headers:{Origin:"http://127.0.0.1:3000"},data:{vehicleId:v.id,start:"2032-01-01T10:00",end:"2032-01-05T10:00",location:"local"}});
      expect(response.status()).toBe(409);
      expect((await response.json()).error).toContain("Turo-only");
    }
  }
  await page.getByRole("button",{name:"Direct rental",exact:true}).click();
  await expect(page.locator("[data-vehicle]")).toHaveCount(5);
  await page.getByRole("button",{name:"Vans",exact:true}).click();
  await expect(page.getByText("No cars in this combination.",{exact:false})).toBeVisible();
  await page.goto("/fleet?category=suv&channel=direct&period=weekly");
  await expect(page.locator("[data-vehicle]")).toHaveCount(2);
  await page.reload();
  await expect(page.locator("[data-vehicle]")).toHaveCount(2);
  await page.goto("/booking?vehicle=corolla-2943051");
  await expect(page.getByRole("heading",{name:"Book this car on Turo"})).toBeVisible();
  await expect(page.getByRole("button",{name:"See my trip total"})).toHaveCount(0);
});

test("server date errors are visible and recoverable; quote is not a confirmation", async ({page}) => {
  await page.goto("/booking?vehicle=focus-3139374&period=monthly");
  await page.getByLabel("Pickup date & time").fill("2032-01-01T10:00");
  await page.getByLabel("Return date & time").fill("2032-02-01T10:00");
  await page.getByRole("button",{name:"See my trip total"}).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("1–30");
  await page.getByLabel("Return date & time").fill("2032-01-01T10:00");
  await page.getByRole("button",{name:"See my trip total"}).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Return must be after pickup");
  await page.getByLabel("Return date & time").fill("2032-01-31T10:00");
  await page.getByRole("button",{name:"See my trip total"}).click();
  await expect(page.getByText("Rental · 30 days")).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByText(/Your draft is unsent/)).toBeVisible();
});

test("mobile menu supports keyboard, Escape, destination focus and support links", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  const toggle=page.getByRole("button",{name:"Toggle navigation"});
  await toggle.focus(); await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  await page.keyboard.press("Escape"); await expect(toggle).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("navigation",{name:"Mobile navigation"}).getByRole("link",{name:"Browse cars"}).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading",{level:1})).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded","false");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox",{name:"Rental period",exact:true})).toBeFocused();
  await page.locator("footer").getByRole("link",{name:"About Daytona"}).click();
  await expect(page.getByRole("heading",{level:1})).toBeFocused();
  await page.locator("footer summary").focus(); await page.keyboard.press("Enter");
  await expect(page.locator('footer a[href="/rentals/suv"]')).toBeVisible();
});

for (const [name,width,height] of [["desktop",1440,900],["mobile",390,844],["narrow",320,844]] as const) {
  test(`${name} appearance and image checks`, async ({page}) => {
    mkdirSync(evidence,{recursive:true});
    await page.setViewportSize({width,height});
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(message.type() === "error") errors.push(message.text());});
    for (const [label,url] of [["home","/"],["fleet","/fleet"],["assistant","/assistant?period=monthly"],["request","/booking?vehicle=santafe-3143340&period=monthly&start=2032-03-01T10:00&end=2032-03-31T10:00"]]) {
      await page.goto(url);
      await expect(page.getByRole("heading",{level:1})).toBeVisible();
      if(label === "request") await expect(page.locator(".selected-car")).toBeVisible();
      if(label === "home") for(const action of ["Browse cars","Help me choose"]) {
        const box=await page.locator(".hero-actions").getByRole("link",{name:action}).boundingBox();
        expect(box!.y+box!.height).toBeLessThan(height);
      }
      await page.waitForLoadState("networkidle");
      await page.evaluate(async()=>{ await Promise.all(Array.from(document.images).map(async i=>{i.loading="eager";await i.decode();})); });
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path:join(evidence,`${name}-${label}.png`),fullPage:true});
    }
    expect(errors).toEqual([]);
  });
}

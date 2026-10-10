import { request, test, type BrowserContext } from "@playwright/test";
export async function customerSession(context: BrowserContext, other = false) {
  const api = await request.newContext({ ignoreHTTPSErrors: true });
  const r = await api.get(
    "https://127.0.0.1:4447/fixture/session?test=" +
      encodeURIComponent(test.info().testId) +
      (other ? "&other=1" : ""),
  );
  const d = await r.json();
  await api.dispose();
  await context.addCookies([
    {
      name: "dcr_customer_access",
      value: d.access_token,
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "dcr_customer_refresh",
      value: d.refresh_token,
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return d;
}

export async function completeDriver(page: import("@playwright/test").Page) {
  const { default: sharp } = await import("sharp");
  for (const [label, value] of [
    ["Legal name", "Synthetic Driver"],
    ["Date of birth", "1990-01-01"],
    ["License issuing state / country", "FL"],
    ["License expiration", "2045-01-01"],
    ["Residential address for agreement", "123 Synthetic Street"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("I confirm these fields").check();
  for (const kind of ["license", "insurance"]) {
    const doc = page.getByRole("form", {
      name: kind === "license" ? "Driver’s license" : "Insurance document",
      exact: true,
    });
    await doc.getByLabel(/image file/).setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: await sharp({
        create: { width: 20, height: 20, channels: 3, background: "#aaa" },
      })
        .png()
        .toBuffer(),
    });
    await doc.getByLabel("Expiration date").fill("2045-01-01");
    await doc.getByLabel("This is a synthetic test image").check();
    await doc
      .getByRole("button", { name: "Save image", exact: true })
      .click();
    await doc
      .getByText("Uploaded — awaiting review", { exact: true })
      .waitFor();
    await doc
      .getByText(/Selected image — not uploaded/)
      .waitFor({ state: "hidden" });
  }
}
export async function preparedRequest(
  page: import("@playwright/test").Page,
  q: any,
) {
  const { default: sharp } = await import("sharp");
  const headers = { Origin: "http://127.0.0.1:3000" };
  const user = (await (await page.request.get("/api/customer/auth")).json())
    .customer;
  const image = (
    await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#aaa" },
    })
      .png()
      .toBuffer()
  ).toString("base64");
  let d = await (
    await page.request.post("/api/customer/drafts", {
      headers,
      data: {
        action: "save",
        expectedOwner: user.id,
        id: crypto.randomUUID(),
        revision: 0,
        data: {
          trip: {
            vehicleId: q.vehicleId,
            start: q.start,
            end: q.end,
            location: q.location,
            period: q.period || "",
          },
          contact: { name: "Synthetic Driver", phone: "0000000000" },
          intake: {
            legalName: "Synthetic Driver",
            birthDate: "1990-01-01",
            licenseRegion: "FL",
            licenseExpiry: "2045-01-01",
            address: "123 Synthetic Street",
            confirmed: true,
          },
        },
      },
    })
  ).json();
  for (const kind of ["license", "insurance"])
    d = await (
      await page.request.post("/api/customer/drafts", {
        headers,
        data: {
          action: "upload",
          expectedOwner: user.id,
          id: d.id,
          revision: d.revision,
          kind,
          validUntil: "2045-01-01",
          content: image,
        },
      })
    ).json();
  return {
    draftId: d.id,
    draftRevision: d.revision,
    quoteId: q.id,
    acknowledged: true,
    website: "",
  };
}

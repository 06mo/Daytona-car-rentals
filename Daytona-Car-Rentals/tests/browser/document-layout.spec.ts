import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { customerSession } from "./auth-helper";

for (const width of [320, 390, 1440]) {
  test(`document card boundaries and states at ${width}`, async ({ page }, info) => {
    await customerSession(page.context());
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto('/booking?vehicle=corolla-3275798&period=weekly&start=2044-08-01T10:00&end=2044-08-08T10:00');
    await page.getByRole('button', { name: 'See my trip total' }).click();
    await page.getByRole('button', { name: 'Continue to driver & documents' }).click();
    const card = page.getByRole('form', { name: 'Driver’s license', exact: true });
    const picker = card.locator('input[type=file]');
    await expect(picker).toHaveCount(1);
    await expect(picker).not.toHaveAttribute('capture');
    await expect(card.getByRole('button', { name: 'Use camera' })).toHaveCount(0);
    await expect(card.locator('input[type=date]')).toHaveCount(0);
    const capture = async (state: string) => {
      await card.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, window.scrollY));
      await card.screenshot({ style: "header, .skip-link { visibility: hidden !important; }", path: `/projects/daytona-handoff/document-card-native-picker/after/${info.project.name}-${width}-${state}.png` });
    };
    await capture('empty');
    const choose = page.waitForEvent('filechooser');
    await card.getByRole('button', { name: 'Upload image', exact: true }).focus();
    await card.getByRole('button', { name: 'Upload image', exact: true }).click();
    await (await choose).setFiles({ name:'synthetic.png', mimeType:'image/png', buffer: await sharp({create:{width:120,height:80,channels:3,background:'#087f82'}}).png().toBuffer() });
    await expect(card.getByRole('button', { name:'Upload image', exact:true })).toHaveCount(0);
    await expect(card.getByRole('button', { name:'Replace image', exact:true })).toHaveCount(1);
    await card.getByLabel('Expiration date').fill('2045-01-01');
    for (const scale of [1,2]) {
      await page.evaluate(scale => document.documentElement.style.fontSize = `${scale*100}%`,scale);
      const bounds = await card.evaluate(el => {
        const c = el.getBoundingClientRect();
        const i = el.querySelector('input[type=date]')!.getBoundingClientRect();
        const controls = [...el.querySelectorAll('button,input[type=date]')].map(e => e.getBoundingClientRect());
        return { left:i.left-c.left, right:c.right-i.right, outside:controls.some(r=>r.left<c.left || r.right>c.right+1), scroll:el.scrollWidth, width:el.clientWidth };
      });
      expect(bounds.outside).toBe(false);
      expect(Math.abs(bounds.left-bounds.right)).toBeLessThan(2);
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.width+1);
      await capture(`selected-${scale}x`);
    }
    await page.evaluate(()=>document.documentElement.style.fontSize='100%');
    await card.getByLabel('This is a synthetic test image').check();
    await card.getByRole('button',{name:'Save image',exact:true}).click();
    await expect(card.getByRole('status')).toHaveText('Uploaded — awaiting review');
    await expect(card.locator('input[type=date]')).toHaveCount(0);
    await expect(card.locator('time')).toHaveText('2045-01-01');
    await expect(card.getByRole('button',{name:'Replace image',exact:true})).toHaveCount(1);
    await expect(card.getByRole('button',{name:'Upload image',exact:true})).toHaveCount(0);
    await capture('saved');
    const replace = card.getByRole('button', { name: 'Replace image', exact: true });
    await expect(replace).toBeEnabled();
    const keyboardChooser = page.waitForEvent('filechooser');
    await replace.press('Enter');
    await (await keyboardChooser).setFiles([]);
    await expect(card.getByRole('status')).toHaveText('Uploaded — awaiting review');
    await expect(card.locator('time')).toHaveText('2045-01-01');
  });
}

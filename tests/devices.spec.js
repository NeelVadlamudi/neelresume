import { test, expect, devices } from '@playwright/test';
import matrix from './support/device-matrix.cjs';

const { deviceCases, emulateFeatures, inspectLayout } = matrix;
// Each context uses its own descriptor, not the outer desktop/mobile viewport.
// Run the matrix once, rather than repeating it under both existing projects.
test.describe('adaptable display', () => {
  for (const device of deviceCases(devices)) {
    test(`${device.id}: usable without sideways scrolling or hidden content`, async ({ browser }, testInfo) => {
      const context = await browser.newContext({ ...device.options, baseURL: testInfo.project.use.baseURL });
      try {
        const page = await context.newPage();
        await emulateFeatures(context, page, device);
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => document.fonts.ready);
        for (const wait of [0, 100, 200, 1200]) {
          if (wait) await page.waitForTimeout(wait);
          const result = await page.evaluate(inspectLayout, device);
          expect(result.checks, JSON.stringify(result.details)).toEqual(Object.fromEntries(Object.keys(result.checks).map(key => [key, true])));
        }
        // The normally clipped skip link must also be a usable target when focused.
        await page.keyboard.press('Tab');
        const skip = await page.locator('.skip').boundingBox();
        expect(skip.width).toBeGreaterThanOrEqual(44);
        expect(skip.height).toBeGreaterThanOrEqual(44);
        if (device.hinge) {
          // The single reading pane must remain scrollable and all sections reachable.
          for (const [name, id] of [['Work', 'work-title'], ['Experience', 'experience-title'], ['Contact', 'contact-title']]) {
            await page.getByRole('link', { name, exact: true }).click();
            const heading = await page.locator(`#${id}`).boundingBox();
            const header = await page.locator('.site-header').boundingBox();
            expect(heading.y).toBeGreaterThanOrEqual(header.height - 1);
            const readingHeight = device.hinge.orientation === 'horizontal' ? device.hinge.offset : device.options.viewport.height;
            expect(heading.y + heading.height).toBeLessThanOrEqual(readingHeight);
          }
        }
      } finally { await context.close(); }
    });
  }
});

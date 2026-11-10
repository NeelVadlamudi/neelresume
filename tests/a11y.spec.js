import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('axe finds no serious or critical issues', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blocking = results.violations.filter((violation) => (
    violation.impact === 'serious' || violation.impact === 'critical'
  ));
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

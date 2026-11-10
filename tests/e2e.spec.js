import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { extractNumbers } from './numbers.mjs';

const allow = JSON.parse(readFileSync(new URL('./allowlist.json', import.meta.url), 'utf8'));

const liveSites = [
  ['Open live Lantern (opens in a new tab)', 'https://neelvadlamudi.github.io/lantern/'],
  ['Open live Demand Pulse (opens in a new tab)', 'https://neelvadlamudi.github.io/demand-pulse/'],
  ['Open live CDC (opens in a new tab)', 'https://neelvadlamudi.github.io/cdc-outbreak-dashboard/'],
  ['Open live Mirage (opens in a new tab)', 'https://neelvadlamudi.github.io/mirage/'],
];

const repositories = [
  ['Repository for Lantern (opens in a new tab)', 'https://github.com/NeelVadlamudi/lantern'],
  ['Repository for Demand Pulse (opens in a new tab)', 'https://github.com/NeelVadlamudi/demand-pulse'],
  ['Repository for CDC (opens in a new tab)', 'https://github.com/NeelVadlamudi/cdc-outbreak-dashboard'],
  ['Repository for Mirage (opens in a new tab)', 'https://github.com/NeelVadlamudi/mirage'],
];

const shots = [
  [/Screenshot of the live Lantern board/, 'https://neelvadlamudi.github.io/lantern/'],
  [/Screenshot of the live Demand Pulse board/, 'https://neelvadlamudi.github.io/demand-pulse/'],
  [/Screenshot of the live CDC respiratory virus dashboard/, 'https://neelvadlamudi.github.io/cdc-outbreak-dashboard/'],
  [/Screenshot of the live Mirage board/, 'https://neelvadlamudi.github.io/mirage/'],
];

test.beforeEach(async ({ page }, testInfo) => {
  const problems = [];
  testInfo.problems = problems;
  page.on('pageerror', (error) => problems.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText || '';
    if (reason === 'net::ERR_ABORTED') return;
    problems.push(`${reason} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (!response.url().startsWith(testInfo.project.use.baseURL)) return;
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({}, testInfo) => {
  const problems = testInfo.problems || [];
  expect(problems, problems.join('\n')).toEqual([]);
});

test('nav links scroll to the right section', async ({ page }) => {
  const header = page.locator('.site-header');
  for (const [name, id] of [['Work', 'work-title'], ['Experience', 'experience-title'], ['Contact', 'contact-title']]) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id.replace('-title', '')}$`));
    const heading = page.locator(`#${id}`);
    await expect(heading).toBeInViewport();
    const headingBox = await heading.boundingBox();
    const headerBox = await header.boundingBox();
    expect(headingBox.y).toBeGreaterThanOrEqual(headerBox.height - 1);
  }
});

test('project links open the live sites and repositories', async ({ page }) => {
  const cases = [...liveSites, ...repositories, ...shots];
  for (const [name, url] of cases) {
    const link = page.getByRole('link', { name }).first();
    await expect(link).toHaveAttribute('href', url);
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await popup.waitForURL((opened) => opened.href.startsWith(url), { waitUntil: 'commit', timeout: 20000 });
    await popup.close();
  }
});

test('live project sites return 200', async ({ request }) => {
  for (const [, url] of liveSites) {
    const response = await request.get(url, { timeout: 30000 });
    expect(response.status(), url).toBe(200);
  }
});

test('hover and focus states are visible', async ({ page }) => {
  const work = page.getByRole('link', { name: 'Work', exact: true });
  const before = await work.evaluate((element) => getComputedStyle(element).color);
  await work.hover();
  await expect.poll(() => work.evaluate((element) => getComputedStyle(element).color)).not.toBe(before);

  const button = page.getByRole('link', { name: 'See the work' });
  const fill = await button.evaluate((element) => getComputedStyle(element).backgroundColor);
  await button.hover();
  await expect.poll(() => button.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(fill);

  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  const outline = await skip.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  expect(outline.width).toBe('2px');
  expect(outline.style).toBe('solid');
});

test('keyboard tab order follows the page', async ({ page }) => {
  const expected = [
    'Skip to content',
    'Neel Vadlamudi',
    'Work',
    'Experience',
    'Contact',
    'See the work',
    'Email',
    /Open live Lantern/,
    /Repository for Lantern/,
    /Screenshot of the live Lantern board/,
    /Open live Demand Pulse/,
    /Repository for Demand Pulse/,
    /Screenshot of the live Demand Pulse board/,
    /Open live CDC/,
    /Repository for CDC/,
    /Screenshot of the live CDC/,
    /Open live Mirage/,
    /Repository for Mirage/,
    /Screenshot of the live Mirage board/,
    'v.n.v.bharath@gmail.com',
    /LinkedIn/,
    /GitHub/,
  ];

  for (const name of expected) {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAccessibleName(name);
  }
});

test('the page does not scroll sideways', async ({ page }) => {
  const widths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);
});

test('contact links are the published addresses', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'v.n.v.bharath@gmail.com' })).toHaveAttribute('href', 'mailto:v.n.v.bharath@gmail.com');
  await expect(page.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/neel109');
  await expect(page.getByRole('link', { name: 'GitHub (opens in a new tab)' })).toHaveAttribute('href', 'https://github.com/NeelVadlamudi');
  await expect(page.getByRole('link', { name: 'Email', exact: true })).toHaveAttribute('href', 'mailto:v.n.v.bharath@gmail.com');
});

test('every visible number is on the allowlist, and banned figures are absent', async ({ page }) => {
  const text = await page.evaluate(() => {
    const parts = [document.body.innerText];
    document.querySelectorAll('[alt], [aria-label], [title]').forEach((element) => {
      parts.push(element.getAttribute('alt') || '');
      parts.push(element.getAttribute('aria-label') || '');
      parts.push(element.getAttribute('title') || '');
    });
    return parts.join('\n');
  });
  const allowed = new Set(allow.allowed.map((item) => item.value));
  const unknown = [...new Set(extractNumbers(text).filter((value) => !allowed.has(value)))];
  expect(unknown).toEqual([]);

  const html = await page.content();
  for (const banned of allow.banned) {
    expect(html, banned.label).not.toMatch(new RegExp(banned.pattern, 'i'));
  }
});

test('reduced motion removes transitions', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    reducedMotion: 'reduce',
    viewport: testInfo.project.use.viewport,
  });
  const page = await context.newPage();
  await page.goto('/');
  const motion = await page.locator('.hero .btn-primary').evaluate((element) => {
    const style = getComputedStyle(element);
    const root = getComputedStyle(document.documentElement);
    return {
      duration: style.transitionDuration,
      scroll: root.scrollBehavior,
    };
  });
  expect(motion.scroll).toBe('auto');
  const durations = motion.duration.split(',').map((part) => part.trim());
  expect(durations.every((part) => {
    const value = Number.parseFloat(part);
    if (part.endsWith('ms')) return value <= 1;
    if (part.endsWith('s')) return value <= 0.001;
    return false;
  })).toBe(true);
  await context.close();
});

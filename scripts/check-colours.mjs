// WCAG 2.2 sRGB contrast checks for the portfolio's semantic colour roles.
// Usage: node scripts/check-colours.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const css = readFileSync(new URL('styles.css', root), 'utf8');
const block = css.match(/:root\s*\{([^}]+)\}/)[1];
const tokens = Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
function colour(name, overrides = {}) {
  const value = overrides[name] || tokens[name];
  assert(value, `Missing token ${name}`);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (alias) return colour(alias[1], overrides);
  assert.match(value, /^#[\da-f]{6}$/i, `Expected solid sRGB hex for ${name}`);
  return value;
}
function luminance(hex) {
  const linear = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function ratio(a, b) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}
// Reference values ensure the calculation itself does not silently regress.
assert.equal(ratio('#000000', '#ffffff'), 21);
assert.equal(ratio('#202326', '#202326'), 1);
let count = 0;
function check(fg, bg, min, overrides) {
  const a = colour(fg, overrides);
  const b = colour(bg, overrides);
  const value = ratio(a, b);
  console.log(`${value >= min ? 'PASS' : 'FAIL'} ${fg} ${a} / ${bg} ${b}: ${value.toFixed(3)}:1 (minimum ${min}:1)`);
  assert(value >= min, `${fg} / ${bg} below ${min}:1`);
  count++;
}

console.log('Text: all normal text held to 4.5:1, including large headings.');
const surfaces = ['--bg', '--surface', '--surface-raised', '--surface-hover'];
for (const bg of surfaces) {
  for (const fg of ['--text', '--muted', '--text-hover']) check(fg, bg, 4.5);
  check('--line', bg, 3);
  check('--text', bg, 3); // External keyboard focus outline.
}
// Accent is used on bg/surface, and as a filled primary action with dark text.
for (const bg of ['--bg', '--surface']) check('--accent', bg, 4.5);
check('--bg', '--accent', 4.5);
check('--bg', '--accent-hover', 4.5);
for (const bg of ['--bg', '--surface']) check('--accent-hover', bg, 3);
const categories = {
  'analytics-engineering': 'Analytics engineering',
  'data-science': 'Data science',
  'business-analysis': 'Business analysis',
};
console.log('Category chips: dark text >= 4.5:1; fill against card >= 3:1.');
for (const category of Object.keys(categories)) {
  check('--tag-text', `--tag-${category}`, 4.5);
  check(`--tag-${category}`, '--surface', 3);
}
console.log('Increased-contrast overrides:');
const more = css.match(/@media \(prefers-contrast: more\)\s*\{\s*:root\s*\{([^}]+)\}/)[1];
const overrides = Object.fromEntries([...more.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
for (const bg of surfaces) {
  check('--muted', bg, 4.5, overrides);
  check('--line', bg, 3, overrides);
  check('--line-strong', bg, 3, overrides);
}
for (const [alias, target] of [['--fg', '--text'], ['--fg-hover', '--text-hover'], ['--card', '--surface'], ['--card-03', '--surface-raised'], ['--card-04', '--surface-hover']]) {
  assert.equal(colour(alias), colour(target), `Legacy alias ${alias} drifted`);
}
assert.notEqual(colour('--bg'), '#000000');
assert.notEqual(colour('--text'), '#ffffff');
const projects = JSON.parse(readFileSync(new URL('projects.json', root), 'utf8'));
const html = readFileSync(new URL('index.html', root), 'utf8');
const cards = html.slice(html.indexOf('<!-- cards:start -->'), html.indexOf('<!-- cards:end -->'));
assert.equal((cards.match(/class="category-tag"/g) || []).length, projects.length);
for (const project of projects) {
  assert(categories[project.category], `Unsupported category for ${project.id}`);
  assert(!/\d/.test(categories[project.category]), 'Tags must not introduce numbers');
  const card = cards.split(`id="${project.id}"`)[1]?.split('</li>')[0];
  assert(card?.includes(`<span class="category-tag" data-category="${project.category}">${categories[project.category]}</span>`), `Missing labelled chip for ${project.id}`);
}
console.log(`${count} contrast pairs pass; every project has one supported, digit-free labelled chip.`);
console.log('Scope: authored HTML text/UI, not pixels embedded in unchanged project screenshots. Decorative shadows/dot patterns are not meaningful UI.');

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'styles.css'), 'utf8');

function values(source, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'gi');
  return [...source.matchAll(re)].map((match) => match[1]);
}

const hrefs = values(html, 'href');
const srcs = values(html, 'src');
const cssUrls = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((match) => match[1]);
const ids = new Set([...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]));
const failures = [];
const checked = [];

for (const href of hrefs) {
  if (!href.startsWith('#')) continue;
  const id = decodeURIComponent(href.slice(1));
  if (!ids.has(id)) failures.push(`missing target for ${href}`);
  else checked.push({ url: href, status: 'id' });
}

function localFile(url) {
  const clean = url.split('#')[0].split('?')[0];
  if (!clean || /^(?:https?:|mailto:|tel:|#)/i.test(clean)) return null;
  return resolve(root, decodeURIComponent(clean));
}

for (const url of [...hrefs, ...srcs, ...cssUrls]) {
  const path = localFile(url);
  if (!path) continue;
  try {
    readFileSync(path);
    checked.push({ url, status: 'file' });
  } catch {
    failures.push(`missing file ${url}`);
  }
}

const external = [...new Set(hrefs.filter((href) => /^https?:/i.test(href)))];

async function statusFor(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    await response.body?.cancel();
    return { status: response.status, error: '' };
  } catch (error) {
    const message = error.name === 'AbortError' ? 'timeout' : error.message;
    return { status: 0, error: message };
  } finally {
    clearTimeout(timer);
  }
}

function acceptable(url, status) {
  if (status === 404 || status === 410) return false;
  if (status >= 200 && status < 400) return true;
  // LinkedIn answers bots with 999 or 403 instead of the public profile.
  if (url.includes('linkedin.com') && [401, 403, 429, 999].includes(status)) return true;
  return false;
}

await Promise.all(external.map(async (url) => {
  let result = { status: 0, error: 'not requested' };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    result = await statusFor(url);
    if (result.status === 404 || result.status === 410) break;
    if (acceptable(url, result.status)) break;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 400 * attempt));
  }
  checked.push({ url, status: result.status, error: result.error });
  if (!acceptable(url, result.status)) {
    failures.push(`${result.status || result.error} ${url}`);
  }
}));

mkdirSync(resolve(root, 'reports'), { recursive: true });
writeFileSync(resolve(root, 'reports/links.json'), `${JSON.stringify({ checked, failures }, null, 2)}\n`);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`checked ${checked.length} links`);

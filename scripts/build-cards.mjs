// Renders the project cards in index.html from projects.json.
// Usage: node scripts/build-cards.mjs            (updates index.html)
//        node scripts/build-cards.mjs --repeat 12 (writes a stress-test page to test-results/cards-12.html)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const projects = JSON.parse(readFileSync(new URL('projects.json', root), 'utf8'));
const indexPath = new URL('index.html', root);
const start = '<!-- cards:start -->';
const end = '<!-- cards:end -->';
const categories = {
  'analytics-engineering': 'Analytics engineering',
  'data-science': 'Data science',
  'business-analysis': 'Business analysis',
};

const esc = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function card(project, index, suffix = '') {
  const [width, height] = project.shotSize;
  const small = `${project.shot}-800.webp`;
  if (!existsSync(new URL(small, root))) throw new Error(`Missing ${small}. Add an 800px-wide copy of the screenshot.`);
  const lazy = index === 0 ? '' : ' loading="lazy" decoding="async"';
  const name = esc(project.title);
  if (!Object.hasOwn(categories, project.category)) throw new Error(`Unsupported category for ${project.id}: ${project.category}`);
  const category = categories[project.category];
  // Wide strips are shown whole (letterboxed) instead of cropped.
  const fit = project.fit === 'contain' ? ' data-fit="contain"' : '';
  return `          <li class="card reveal" id="${esc(project.id)}${suffix}">
            <a class="shot" href="${esc(project.live)}" target="_blank" rel="noopener noreferrer">
              <span class="browser">
                <span class="browser-chrome" aria-hidden="true">
                  <span class="browser-dots"><span></span><span></span><span></span></span>
                  <span class="browser-url">${esc(project.live)}</span>
                </span>
                <img src="${esc(project.shot)}.webp" srcset="${esc(small)} 800w, ${esc(project.shot)}.webp 1600w" sizes="(width < 50rem) 100vw, 36rem" width="${width}" height="${height}" alt="${esc(project.alt)}"${fit}${lazy}>
              </span>
              <span class="sr-only"> Opens in a new tab</span>
            </a>
            <div class="card-body">
              <span class="category-tag" data-category="${esc(project.category)}">${esc(category)}</span>
              <h3 class="card-title">${name}</h3>
              <p class="card-line">${esc(project.line)}</p>
              <p class="meta">${esc(project.source)}</p>
              <div class="actions">
                <a class="btn btn-primary btn-sm" href="${esc(project.live)}" target="_blank" rel="noopener noreferrer">Open live<span class="sr-only"> ${name} (opens in a new tab)</span></a>
                <a class="btn btn-ghost btn-sm" href="${esc(project.repo)}" target="_blank" rel="noopener noreferrer">Repository<span class="sr-only"> for ${name} (opens in a new tab)</span></a>
              </div>
            </div>
          </li>`;
}

const html = readFileSync(indexPath, 'utf8');
const a = html.indexOf(start);
const b = html.indexOf(end);
if (a < 0 || b < a) throw new Error('index.html is missing the cards markers');

const repeatAt = process.argv.indexOf('--repeat');
const repeat = repeatAt > 0 ? Number(process.argv[repeatAt + 1]) : 0;
const list = repeat
  ? Array.from({ length: repeat }, (_, i) => [projects[i % projects.length], i, i < projects.length ? '' : `-${i}`])
  : projects.map((project, i) => [project, i, '']);
const body = list.map(([project, i, suffix]) => card(project, i, suffix)).join('\n');
const out = `${html.slice(0, a + start.length)}\n${body}\n          ${html.slice(b)}`;

if (repeat) {
  mkdirSync(new URL('test-results/', root), { recursive: true });
  const target = new URL(`test-results/cards-${repeat}.html`, root);
  writeFileSync(target, out.replaceAll('href="styles.css"', 'href="../styles.css"').replaceAll('src="script.js"', 'src="../script.js"').replaceAll('src="assets/', 'src="../assets/').replaceAll('srcset="assets/', 'srcset="../assets/').replaceAll(', assets/', ', ../assets/').replaceAll('href="favicon.svg"', 'href="../favicon.svg"').replaceAll('href="fonts/', 'href="../fonts/'));
  console.log(`Wrote ${target.pathname}`);
} else {
  writeFileSync(indexPath, out);
  console.log(`Rendered ${projects.length} cards into index.html`);
}

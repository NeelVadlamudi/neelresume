// Shared by CI and the local screenshot audit. Dimensions are CSS pixels.
function deviceCases(devices) {
  const mobile = (id, name, width, height, descriptor = 'Galaxy S8', extra = {}) => ({
    id, name, options: { ...devices[descriptor], viewport: { width, height }, screen: { width, height } }, ...extra,
  });
  const desktop = (id, width, height, name = id) => ({ id, name,
    options: { viewport: { width, height }, deviceScaleFactor: 1, isMobile: false, hasTouch: false } });
  return [
    mobile('fold-280', 'Galaxy Fold folded', 280, 653),
    mobile('se-320', 'iPhone SE', 320, 568, 'iPhone SE'),
    mobile('se-375', 'iPhone SE 3', 375, 667, 'iPhone SE (3rd gen)'),
    mobile('s8-360', 'Galaxy S8', 360, 740),
    mobile('iphone12-390', 'iPhone 12', 390, 844, 'iPhone 12'),
    mobile('iphone13-390', 'iPhone 13', 390, 844, 'iPhone 13'),
    mobile('iphone14-390', 'iPhone 14', 390, 844, 'iPhone 14'),
    mobile('promax-430', 'iPhone 14 Pro Max', 430, 932, 'iPhone 14 Pro Max'),
    mobile('pixel-412', 'Pixel 7', 412, 839, 'Pixel 7'),
    mobile('fold-cover-344', 'Fold cover', 344, 882, 'Galaxy Z Fold 6 Cover'),
    mobile('fold-open-673', 'Fold open', 673, 841, 'Galaxy Z Fold 6'),
    mobile('fold-open-884', 'Fold open large', 884, 1104, 'Galaxy Z Fold 7'),
    mobile('duo-single', 'Duo single', 540, 720),
    mobile('duo-single-landscape', 'Duo single landscape', 720, 540),
    mobile('duo-spanned', 'Duo spanned', 1114, 720, 'Galaxy S8', { hinge: { orientation: 'vertical', offset: 540, maskLength: 34 } }),
    mobile('duo-spanned-landscape', 'Duo spanned landscape', 720, 1114, 'Galaxy S8', { hinge: { orientation: 'horizontal', offset: 540, maskLength: 34 } }),
    mobile('ipad-mini', 'iPad mini', 744, 1133, 'iPad Mini'),
    mobile('ipad-mini-landscape', 'iPad mini landscape', 1133, 744, 'iPad Mini landscape'),
    mobile('ipad-air', 'iPad Air', 820, 1180, 'iPad Pro 11'),
    mobile('ipad-air-landscape', 'iPad Air landscape', 1180, 820, 'iPad Pro 11 landscape'),
    mobile('ipad-pro', 'iPad Pro', 1024, 1366, 'iPad Pro 11'),
    mobile('ipad-pro-landscape', 'iPad Pro landscape', 1366, 1024, 'iPad Pro 11 landscape'),
    mobile('phone-landscape-844', 'iPhone landscape', 844, 390, 'iPhone 12 landscape'),
    mobile('phone-landscape-932', 'Pro Max landscape', 932, 430, 'iPhone 14 Pro Max landscape'),
    desktop('laptop-1280', 1280, 800),
    desktop('laptop-1366', 1366, 768),
    desktop('laptop-1440', 1440, 900),
    desktop('desktop-1920', 1920, 1080),
    desktop('desktop-2560', 2560, 1440),
    desktop('desktop-3840', 3840, 2160),
    desktop('zoom-200', 640, 400, '1280 at 200% (CSS reflow equivalent)'),
    desktop('short-568', 1024, 568, 'Short desktop'),
    mobile('notch-portrait', 'iPhone notch portrait', 390, 844, 'iPhone 12', { safeArea: { top: 47, right: 0, bottom: 34, left: 0 } }),
    mobile('notch-landscape', 'iPhone notch landscape', 844, 390, 'iPhone 12 landscape', { safeArea: { top: 0, right: 47, bottom: 21, left: 47 } }),
  ];
}

async function emulateFeatures(context, page, device) {
  if (!device.hinge && !device.safeArea) return;
  const session = await context.newCDPSession(page);
  if (device.hinge) {
    const { width, height } = device.options.viewport;
    // Metrics override populates both the segment env() values and media queries.
    await session.send('Emulation.setDeviceMetricsOverride', {
      width, height, screenWidth: width, screenHeight: height,
      deviceScaleFactor: device.options.deviceScaleFactor, mobile: true,
      displayFeature: device.hinge, devicePosture: { type: 'folded' },
    });
  }
  if (device.safeArea) await session.send('Emulation.setSafeAreaInsetsOverride', { insets: device.safeArea });
}

// Runs in the page. Off-screen reveal animations are intentional; in-view ones are not.
function inspectLayout(device) {
  const box = (el) => el.getBoundingClientRect();
  const shown = (el) => {
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && box(el).width > 1 && box(el).height > 1;
  };
  const label = (el) => el.id || el.getAttribute('aria-label') || el.textContent.trim().slice(0, 60);
  const intersects = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  const scrollRoot = getComputedStyle(document.body).overflowY === 'auto' ? document.body : document.scrollingElement;
  const readHeight = Math.min(innerHeight, scrollRoot.clientHeight);
  const hidden = [...document.querySelectorAll('.reveal')].filter(el => {
    const r = box(el);
    return r.top < readHeight && r.bottom > box(document.querySelector('.site-header')).bottom && Number(getComputedStyle(el).opacity) < 0.99;
  }).map(label);
  const targets = [...document.querySelectorAll('a,button')].filter(el => shown(el) && !el.matches('.skip:not(:focus)'));
  const smallTargets = targets.filter(el => box(el).width < 43.99 || box(el).height < 43.99)
    .map(el => ({ element: label(el), width: box(el).width, height: box(el).height }));
  const clipped = [];
  const textRects = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode, el = node.parentElement;
    if (!node.textContent.trim() || !shown(el) || el.closest('script,style,[aria-hidden="true"],.sr-only,.skip:not(:focus)')) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      textRects.push({ el, r });
      const textBox = el.closest('p,h1,h2,h3,a,.category-tag');
      if (textBox) {
        const t = box(textBox);
        // Glyph metrics may extend above a line box (Inter headings do).
        // Vertical clipping is a defect only at an actual clipping ancestor below.
        if (r.left < t.left - 1 || r.right > t.right + 1) clipped.push(label(textBox));
      }
      let ancestor = el;
      while (ancestor && ancestor !== document.body) {
        const s = getComputedStyle(ancestor), a = box(ancestor);
        if ((['hidden','clip'].includes(s.overflowX) && (r.left < a.left - 1 || r.right > a.right + 1)) ||
            (['hidden','clip'].includes(s.overflowY) && (r.top < a.top - 2 || r.bottom > a.bottom + 2))) {
          clipped.push(label(el)); break;
        }
        ancestor = ancestor.parentElement;
      }
    }
  }
  const header = [...document.querySelector('.header-bar').children].map(box);
  const headerCollision = header.some((r, i) => header.slice(i + 1).some(s => intersects(r,s))) ||
    header.some(r => r.left < 0 || r.right > innerWidth + 1 || r.top < 0);
  const overlaps = [];
  for (const parent of document.querySelectorAll('.hero-grid,.card-body,.tl-card,.role-top')) {
    const children = [...parent.children].filter(el => shown(el) && !el.matches('.tl-kicker,.caret'));
    children.forEach((el, i) => children.slice(i + 1).forEach(other => {
      if (intersects(box(el), box(other))) overlaps.push(`${label(el)} / ${label(other)}`);
    }));
  }
  const rows = new Map();
  document.querySelectorAll('.card').forEach(el => { const r = box(el), key = Math.round(r.top); rows.set(key, [...(rows.get(key) || []), r.height]); });
  const unevenRows = [...rows.values()].filter(heights => Math.max(...heights) - Math.min(...heights) > 1);
  const images = [...document.images].filter(shown).filter(img => {
    const s = getComputedStyle(img);
    return !['cover','contain'].includes(s.objectFit) && img.naturalWidth && Math.abs(box(img).width / box(img).height - img.naturalWidth / img.naturalHeight) > 0.01;
  }).map(label);
  const containers = [...document.querySelectorAll('.container')].map(box);
  const centred = innerWidth < 1180 || device.hinge || containers.every(r => r.width <= 1181 && Math.abs(r.left - (innerWidth - r.right)) <= 1);
  const hero = box(document.querySelector('.hero'));
  const heroContent = [...document.querySelectorAll('.hero-copy,.pipe')].map(box);
  const heroCut = heroContent.some(r => r.top < hero.top - 1 || r.bottom > hero.bottom + 1);
  const pipe = document.querySelector('.pipe'), pipeBounds = box(pipe);
  const pipelineFits = [...pipe.children].every(el => box(el).left >= pipeBounds.left - 1 && box(el).right <= pipeBounds.right + 1);
  const hinge = device.hinge;
  let hingeCrossing = [];
  if (hinge) {
    const [start, end] = [hinge.offset, hinge.offset + hinge.maskLength];
    hingeCrossing = textRects.filter(({r}) => hinge.orientation === 'vertical' ? r.left < end && r.right > start : r.top < end && r.bottom > start)
      .filter(({r}) => r.top < readHeight && r.bottom > 0).map(({el}) => label(el));
    for (const el of targets) { const r = box(el); if (r.top >= readHeight || r.bottom <= 0) continue;
      if (hinge.orientation === 'vertical' ? r.left < end && r.right > start : r.top < end && r.bottom > start) hingeCrossing.push(label(el));
    }
  }
  let safeAreaOK = true;
  if (device.safeArea) {
    const {top,left,right,bottom} = device.safeArea;
    safeAreaOK = header.every(r => r.top >= top - 1 && r.left >= left - 1 && r.right <= innerWidth - right + 1);
    const content = document.querySelector('.hero-grid'), s = getComputedStyle(content);
    safeAreaOK &&= box(content).left + parseFloat(s.paddingLeft) >= left && box(content).right - parseFloat(s.paddingRight) <= innerWidth - right;
    safeAreaOK &&= parseFloat(getComputedStyle(document.querySelector('.site-footer')).paddingBottom) >= bottom;
  }
  const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  return {
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, scrollWidth,
    checks: { overflow: scrollWidth <= innerWidth && innerWidth <= device.options.viewport.width + 1, pipeline: pipelineFits, targets44: !smallTargets.length, hiddenAtLoad: !hidden.length,
      textClipping: !clipped.length, overlap: !overlaps.length, header: !headerCollision,
      equalCards: !unevenRows.length, images: !images.length, cappedCentred: !!centred, hero: !heroCut,
      hinge: !hingeCrossing.length,
      hingeEmulated: !hinge || matchMedia(hinge.orientation === 'vertical' ? '(horizontal-viewport-segments: 2)' : '(vertical-viewport-segments: 2)').matches,
      safeArea: safeAreaOK },
    details: { smallTargets, hidden, clipped: [...new Set(clipped)], overlaps, unevenRows, images, hingeCrossing: [...new Set(hingeCrossing)] },
    segments: { horizontal: matchMedia('(horizontal-viewport-segments: 2)').matches, vertical: matchMedia('(vertical-viewport-segments: 2)').matches },
  };
}
module.exports = { deviceCases, emulateFeatures, inspectLayout };

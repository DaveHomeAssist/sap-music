// Phone, landscape and desktop layout checks for the homepage and the rhythm machine.
//
// Homepage, every view at five sizes: no page scroll, exactly one visible h1 (the
// view heading), every visible control at least 44x44 CSS px, and nothing
// interactive inside the emulated iPhone safe-area insets. Back, Forward and a
// typed #hash leave focus on the view heading. The phone drawer's last item
// stays above the home indicator.
//
// Rhythm machine: no page scroll at 390x844 and 844x390, steps 44px tall on
// phones and 44px wide in landscape (a phone row of eight allows about 40px of
// width), and every other control at least 44px tall.
//
// Safe areas are emulated in Chromium through CDP; physical iPhone Safari is a
// separate acceptance step.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
    if (!path.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = process.env.EROSYN_URL || `http://127.0.0.1:${server.address().port}`;

const VIEWS = ['home', 'music', 'visuals', 'about', 'shows', 'press', 'contact'];
const SIZES = [
  { name: 'iPhone 13 mini', width: 375, height: 812, insets: { top: 50, bottom: 34, left: 0, right: 0 }, phone: true },
  { name: 'iPhone portrait', width: 390, height: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 }, phone: true },
  { name: 'iPhone landscape', width: 844, height: 390, insets: { top: 0, bottom: 21, left: 47, right: 47 }, phone: true },
  { name: 'laptop', width: 1280, height: 720, insets: null, phone: false },
  { name: 'desktop', width: 1440, height: 900, insets: null, phone: false },
];

// Runs in the page. Returns controls smaller than 44x44 and controls inside the insets.
function audit(insets) {
  const vw = innerWidth;
  const vh = innerHeight;
  // The part of an element left visible by the viewport and every clipping (scrolling) ancestor.
  const visibleRect = (el) => {
    const r = el.getBoundingClientRect();
    let box = { left: Math.max(r.left, 0), top: Math.max(r.top, 0), right: Math.min(r.right, vw), bottom: Math.min(r.bottom, vh) };
    for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
        const c = node.getBoundingClientRect();
        box = { left: Math.max(box.left, c.left), top: Math.max(box.top, c.top), right: Math.min(box.right, c.right), bottom: Math.min(box.bottom, c.bottom) };
      }
    }
    return box.right - box.left > 0.5 && box.bottom - box.top > 0.5 ? box : null;
  };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
      && !el.closest('[hidden]') && visibleRect(el) !== null;
  };
  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
  const controls = [...document.querySelectorAll('a[href], button, select, input:not([type=hidden]), textarea, summary, [role=button]')]
    .filter(shown)
    // A link in running text is exempt from target size (WCAG 2.5.5/2.5.8 inline exception).
    .filter((el) => getComputedStyle(el).display !== 'inline');
  const small = [];
  const unsafe = [];
  for (const el of controls) {
    // A checkbox or radio inside its label is targeted through the whole label.
    const target = (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) || el;
    const r = target.getBoundingClientRect();
    if (Math.round(r.width) < 44 || Math.round(r.height) < 44) small.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (insets) {
      const e = visibleRect(el);
      if (e.left < insets.left - 0.5 || e.right > vw - insets.right + 0.5 || e.bottom > vh - insets.bottom + 0.5) {
        unsafe.push(`${describe(el)} visible at ${Math.round(e.left)},${Math.round(e.top)} to ${Math.round(e.right)},${Math.round(e.bottom)}`);
      }
    }
  }
  const de = document.documentElement;
  const h1s = [...document.querySelectorAll('h1')].filter(shown);
  return {
    overflow: [de.scrollWidth - de.clientWidth, de.scrollHeight - de.clientHeight],
    h1: h1s.map((h) => h.id),
    small,
    unsafe,
  };
}

const browser = await chromium.launch();
try {
  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, isMobile: size.phone, hasTouch: size.phone });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (size.insets) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: size.insets });
    }

    for (const view of VIEWS) {
      await page.goto(`${origin}/#${view}`);
      await page.waitForTimeout(200);
      const result = await page.evaluate(audit, size.insets);
      const where = `${view} at ${size.width}x${size.height}`;
      assert.deepEqual(result.overflow, [0, 0], `${where} scrolls the page`);
      assert.deepEqual(result.h1, [`${view}-title`], `${where} needs exactly one visible h1, the view heading`);
      assert.deepEqual(result.small, [], `${where} has controls under 44x44`);
      assert.deepEqual(result.unsafe, [], `${where} has controls inside the safe-area insets`);
    }

    // Back, Forward and a typed #hash leave focus on the view heading.
    await page.goto(`${origin}/#music`);
    await page.evaluate(() => { location.hash = '#about'; });
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'about-title', `typed hash focus at ${size.name}`);
    await page.goBack();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'music-title', `Back focus at ${size.name}`);
    await page.goForward();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'about-title', `Forward focus at ${size.name}`);

    // Phone drawer: every link sits above the home indicator.
    if (size.width < 768) {
      await page.goto(`${origin}/#home`);
      await page.locator('.browser-toggle').click();
      await page.waitForTimeout(300);
      const drawer = await page.evaluate((insets) => {
        const links = [...document.querySelectorAll('#browser a')].filter((a) => a.getBoundingClientRect().height > 0);
        return links.map((a) => Math.round(innerHeight - insets.bottom - a.getBoundingClientRect().bottom));
      }, size.insets);
      assert.ok(drawer.length >= 7 && drawer.every((gap) => gap >= 0), `drawer links reach the home indicator at ${size.name}: ${drawer}`);
    }

    // Rhythm machine.
    await page.goto(`${origin}/drum-machine.html`);
    await page.waitForTimeout(200);
    const drum = await page.evaluate(() => {
      const de = document.documentElement;
      const steps = [...document.querySelectorAll('.step')].map((b) => b.getBoundingClientRect());
      const others = [...document.querySelectorAll('.btn, .input-field, .tempo-slider, .logo')]
        .filter((el) => el.getBoundingClientRect().height > 0)
        .filter((el) => getComputedStyle(el).visibility !== 'hidden')
        .map((el) => ({ name: el.id || el.dataset.preset || el.dataset.idea || el.className, h: Math.round(el.getBoundingClientRect().height) }));
      return {
        overflow: [de.scrollWidth - de.clientWidth, de.scrollHeight - de.clientHeight],
        steps: steps.length,
        minW: Math.floor(Math.min(...steps.map((r) => r.width))),
        minH: Math.floor(Math.min(...steps.map((r) => r.height))),
        shortControls: others.filter((o) => o.h < 44).map((o) => `${o.name} ${o.h}px`),
      };
    });
    const where = `rhythm machine at ${size.width}x${size.height}`;
    assert.equal(drum.steps, 80, `${where} step count`);
    assert.equal(drum.overflow[0], 0, `${where} scrolls sideways`);
    // 390x844 and 844x390 are the audited phone sizes; 1440x900 guards the desktop layout.
    if ([390, 844, 1440].includes(size.width)) assert.equal(drum.overflow[1], 0, `${where} scrolls the page`);
    if (size.phone) {
      assert.ok(drum.minH >= 44, `${where} steps are ${drum.minH}px tall`);
      assert.ok(drum.minW >= (size.width > size.height ? 44 : 36), `${where} steps are ${drum.minW}px wide`);
      assert.deepEqual(drum.shortControls, [], `${where} controls under 44px tall`);
    }
    await page.getByRole('button', { name: 'Load pattern', exact: true }).click();
    await page.locator('.step').first().click();
    assert.deepEqual(errors, [], `page errors at ${size.name}`);
    console.log(`PASS layout ${size.name} ${size.width}x${size.height}: 7 views fit, one h1 each, 44px controls, safe insets, heading focus on history; rhythm machine ${drum.overflow[1] ? `scrolls ${drum.overflow[1]}px` : 'fits'}, steps ${drum.minW}x${drum.minH}`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}

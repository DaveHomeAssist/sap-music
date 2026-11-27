// Checks the published security policy in vercel.json.
//
// Local (default): serves the repository with the vercel.json headers applied,
// then drives every live page in Chromium (all seven homepage views, the
// SoundCloud player, the booking draft, the brand guide and the rhythm
// machine) and fails on any Content Security Policy violation.
//
// Live: EROSYN_URL=https://erosynmusic.com node tests/security.mjs also checks
// that production sends exactly the vercel.json headers and that the retired
// Notion intake is gone. No request writes anything.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';

const config = JSON.parse(await readFile('vercel.json', 'utf8'));
const rule = (config.headers || []).find((entry) => entry.source === '/(.*)');
assert.ok(rule, 'vercel.json needs a header rule for "/(.*)"');
const policy = Object.fromEntries(rule.headers.map(({ key, value }) => [key.toLowerCase(), value]));

const csp = policy['content-security-policy'];
assert.ok(csp, 'Content-Security-Policy is missing');
const directives = Object.fromEntries(csp.split(';').map((part) => part.trim()).filter(Boolean)
  .map((part) => { const [name, ...values] = part.split(/\s+/); return [name, values]; }));
for (const [name, expected] of Object.entries({
  'default-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
  'frame-src': ['https://w.soundcloud.com'],
})) {
  assert.deepEqual(directives[name], expected, `CSP ${name} should be ${expected.join(' ')}`);
}
assert.ok(!/(^|\s)\*(\s|;|$)|https:(\s|;|$)|fonts\.googleapis|unsafe-eval/.test(csp), 'CSP must not allow wildcards, any https: source, Google Fonts or eval');
assert.equal(policy['x-content-type-options'], 'nosniff');
assert.equal(policy['x-frame-options'], 'DENY');
assert.equal(policy['referrer-policy'], 'strict-origin-when-cross-origin');
assert.match(policy['permissions-policy'] || '', /camera=\(\)/);
assert.match(policy['permissions-policy'] || '', /microphone=\(\)/);
assert.match(policy['permissions-policy'] || '', /geolocation=\(\)/);

const root = process.cwd();
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain', '.xml': 'application/xml', '.md': 'text/markdown' };
const server = createServer(async (req, res) => {
  for (const [key, value] of Object.entries(policy)) res.setHeader(key, value);
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
    if (!path.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const live = process.env.EROSYN_URL;
const origin = live || `http://127.0.0.1:${server.address().port}`;

if (live) {
  for (const path of ['/', '/erosyn/brand.html', '/drum-machine.html', '/robots.txt']) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    assert.equal(response.status, 200, `${path} status`);
    for (const [key, value] of Object.entries(policy)) {
      assert.equal(response.headers.get(key), value, `${path} ${key}`);
    }
  }
  const intake = await fetch(origin + '/api/notion-intake', { redirect: 'manual' });
  assert.equal(intake.status, 404, 'the retired Notion intake should be gone');
  console.log('PASS live headers match vercel.json on four paths; /api/notion-intake returns 404');
}

const browser = await chromium.launch();
try {
  for (const [width, height] of [[375, 812], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        window.__cspViolations.push(`${event.violatedDirective} blocked ${event.blockedURI || 'inline'} on ${location.pathname}`);
      });
    });
    const page = await context.newPage();
    const errors = [];
    const violations = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (/Content Security Policy/i.test(message.text())) violations.push(message.text()); });
    const collect = async () => violations.push(...await page.evaluate(() => window.__cspViolations.splice(0)));

    const first = await page.goto(`${origin}/`);
    if (!live) assert.equal(first.headers()['content-security-policy'], csp, 'local server applies the policy');
    for (const view of ['home', 'music', 'visuals', 'about', 'shows', 'press', 'contact']) {
      await page.goto(`${origin}/#${view}`);
      await page.waitForTimeout(250);
      await collect();
    }

    await page.goto(`${origin}/#music`);
    await page.locator('#deck-play').click();
    const frame = page.locator('#deck-player iframe');
    await frame.waitFor({ state: 'attached' });
    assert.match(await frame.getAttribute('src'), /^https:\/\/w\.soundcloud\.com\/player\//);
    await page.waitForTimeout(1500);
    await collect();

    await page.goto(`${origin}/#contact`);
    await page.locator('#f-name').fill('Policy Check');
    await page.locator('#f-email').fill('test@example.com');
    await page.locator('#f-reason').selectOption('booking');
    await page.locator('#f-message').fill('Date: 12 December');
    await page.getByRole('button', { name: 'Prepare email', exact: true }).click();
    assert.equal(await page.locator('#email-draft').isVisible(), true);
    await collect();

    await page.goto(`${origin}/erosyn/brand.html`);
    await page.waitForLoadState('networkidle');
    await page.mouse.wheel(0, 20000);
    await page.waitForTimeout(500);
    await collect();

    await page.goto(`${origin}/drum-machine.html`);
    await page.getByRole('textbox', { name: 'Describe a style' }).fill('warehouse halftime');
    await page.getByRole('button', { name: 'Load pattern', exact: true }).click();
    await page.locator('#playBtn').click();
    await page.waitForTimeout(500);
    await page.locator('#playBtn').click();
    await collect();

    assert.deepEqual(violations, [], 'no CSP violations');
    assert.deepEqual(errors, [], 'no page errors');
    console.log(`PASS security policy ${width}x${height}${live ? ' (live)' : ''}: seven views, SoundCloud player, booking draft, brand guide and rhythm machine run with zero CSP violations`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}

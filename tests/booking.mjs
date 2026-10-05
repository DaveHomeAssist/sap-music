import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
    if (!path.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = process.env.EROSYN_URL || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [[375,812], [844,390], [1440,900], [3840,1080]]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'dark' });
      if (theme === 'dark') await context.addInitScript(() => localStorage.setItem('erosyn-theme','dark'));
      await context.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Clipboard unavailable'); } } }));
      const page = await context.newPage();
      const errors = [], posts = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => { if (r.method() === 'POST') posts.push(r.url()); });
      await page.goto(`${origin}/#contact`);
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      await page.getByRole('button', { name: 'Prepare email', exact: true }).click();
      assert.equal(await page.locator('#f-name').getAttribute('aria-invalid'), 'true');
      assert.equal(await page.locator('#email-draft').isVisible(), false);
      await page.locator('#f-name').fill('Test & <Visitor>');
      await page.locator('#f-email').fill('test@example.com');
      await page.locator('#f-reason').selectOption('booking');
      const message = 'Date: 12 December\nVenue: <script>alert(1)</script> & friends?\nBudget: #test';
      await page.locator('#f-message').fill(message);
      await page.getByRole('button', { name: 'Prepare email', exact: true }).click();
      const draft = new URL(await page.locator('#email-draft').getAttribute('href'));
      assert.equal(draft.pathname, 'erosynmusic@gmail.com');
      assert.equal(draft.searchParams.get('subject'), 'Erosyn — Booking inquiry');
      assert.equal(draft.searchParams.get('body'), `Name: Test & <Visitor>\nReply to: test@example.com\n\n${message}`);
      assert.match(await page.locator('#form-status').innerText(), /Nothing has been sent yet/);
      assert.equal(await page.locator('#email-draft').evaluate(el => el === document.activeElement), true);
      await page.getByRole('button', { name: 'Copy inquiry', exact: true }).click();
      assert.equal(await page.locator('#email-copy').inputValue(), draft.searchParams.get('body'));
      assert.equal(await page.locator('#email-copy').isVisible(), true);
      await page.locator('#f-message').fill('A revised inquiry to prepare');
      assert.equal(await page.locator('#email-draft').isVisible(), false);
      assert.equal(await page.locator('#email-copy').isVisible(), false);
      assert.equal(await page.locator('#form-status').innerText(), '');
      assert.deepEqual(posts, []);
      for (const view of ['shows', 'press', 'contact']) {
        await page.goto(`${origin}/#${view}`);
        const bounds = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, innerWidth, innerHeight }));
        assert.ok(bounds.width <= width + 1 && bounds.height <= height + 1, `${view} ${width}x${height} overflows: ${JSON.stringify(bounds)}`);
        if (view === 'shows') assert.match(await page.locator('#shows-empty').innerText(), /No confirmed dates/);
        if (view === 'press') assert.equal(await page.locator('#press blockquote').count(), 0);
        await page.waitForTimeout(250);
        if (process.env.SCREENSHOTS && width === 375) await page.screenshot({ path: `/tmp/erosyn-${view}-${theme}.png` });
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}x${height} ${theme}: validation, encoded draft, copy fallback, edit invalidation, honest content, bounded layout`);
      await context.close();
    }
  }
} finally { await browser.close(); await new Promise(r => server.close(r)); }

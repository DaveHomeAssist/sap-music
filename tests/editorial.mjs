import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
    if (!path.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf' })[extname(path)] || 'text/plain');
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = process.env.EROSYN_URL || `http://127.0.0.1:${server.address().port}`;
const copy = JSON.parse(await readFile('erosyn/02-press-kit/press-copy.json', 'utf8'));
const browser = await chromium.launch();
try {
  for (const [width, height] of [[375,812], [844,390], [1440,900], [3840,1080]]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript(t => localStorage.setItem('erosyn-theme', t), theme);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      for (const view of ['home','music','visuals','about','shows','press','contact']) {
        await page.goto(`${origin}/#${view}`);
        await page.waitForTimeout(200);
        const bounds = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight }));
        assert.ok(bounds.w <= bounds.cw && bounds.h <= bounds.ch, `${view} overflow at ${width}x${height}`);
        if (view === 'about') assert.match(await page.locator('#about').innerText(), /I'm Connor/);
        if (view === 'press') {
          assert.ok((await page.locator('#press').innerText()).includes(copy.bio));
          assert.equal(await page.getByRole('link', { name: 'Download text bio', exact: true }).count(), 1);
          const link = page.getByRole('link', { name: 'Download press sheet', exact: true });
          assert.equal(await link.count(), 1);
          const url = await link.getAttribute('href');
          assert.equal((await page.request.get(`${origin}/${url}`)).status(), 200);
        }
        if (process.env.SCREENSHOTS && [375,1440].includes(width) && ['about','press','contact'].includes(view)) {
          await page.screenshot({ path: `${process.env.SCREENSHOTS}/editorial-${view}-${width}-${theme}.png` });
        }
      }
      await page.goto(`${origin}/sap.html`);
      await page.waitForURL(`${origin}/`);
      assert.match(await page.title(), /Erosyn/);
      await page.goto(`${origin}/brand.html`);
      await page.waitForURL(`${origin}/erosyn/brand.html`);
      assert.match(await page.title(), /Erosyn/);
      await page.goto(`${origin}/drum-machine.html`);
      await page.getByRole('textbox', { name: 'Describe a style' }).fill('warehouse halftime');
      await page.getByRole('button', { name: 'Load pattern', exact: true }).click();
      assert.match(await page.locator('#statusMessage').innerText(), /pattern loaded/i);
      assert.deepEqual(errors, []);
      console.log(`PASS editorial ${width}x${height} ${theme}: seven views, usable press links, retired routes, honest rhythm label`);
      await context.close();
    }
  }
} finally { await browser.close(); await new Promise(r => server.close(r)); }

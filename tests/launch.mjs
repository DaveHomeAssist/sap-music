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
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.jpg': 'image/jpeg', '.png': 'image/png' })[extname(path)] || 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = process.env.EROSYN_URL || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of [[375, 812], [844, 390], [1440, 900], [3840, 1080]]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript(value => localStorage.setItem('erosyn-theme', value), theme);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('https://w.soundcloud.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Player test</p>' }));
      await page.goto(origin);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://erosynmusic.com/');
      assert.equal(await page.locator('.hero__headline').innerText(), 'Scorcher is out now.');
      const links = page.getByRole('navigation', { name: 'Listen to Scorcher' }).getByRole('link');
      assert.equal(await links.count(), 3);
      for (const link of await links.all()) {
        await link.scrollIntoViewIfNeeded();
        const box = await link.boundingBox();
        assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `Home link clipped at ${width}x${height}`);
        assert.match(await link.getAttribute('href'), /^https:\/\/(open.spotify.com|music.apple.com|soundcloud.com)\//);
      }
      await page.getByRole('link', { name: 'Listen to Scorcher', exact: true }).click();
      assert.equal(await page.locator('[data-track]').count(), 11);
      assert.equal(await page.locator('#deck-title').innerText(), 'Scorcher');
      assert.equal(await page.locator('#deck-runtime').innerText(), '3:30');
      assert.equal(await page.locator('#deck-player iframe').count(), 0);
      await page.locator('#deck-art').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.getElementById('deck-art').naturalWidth > 0);
      assert.ok(await page.locator('#deck-art').evaluate(img => img.naturalWidth > 0));
      await page.locator('[data-track]').nth(1).click();
      assert.equal(await page.locator('#deck-title').innerText(), 'TO THE FUTURE');
      await page.reload();
      assert.equal(await page.locator('#deck-title').innerText(), 'TO THE FUTURE');
      assert.equal(await page.locator('#deck-player iframe').count(), 0);
      await page.locator('[data-track]').first().click();
      await page.locator('#deck-play').click();
      const src = new URL(await page.locator('#deck-player iframe').getAttribute('src'));
      assert.equal(src.searchParams.get('url'), 'https://soundcloud.com/erosynmusic/scorcher');
      for (const view of ['home', 'music']) {
        await page.goto(`${origin}/#${view}`);
        const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight }));
        assert.ok(size.w <= size.cw && size.h <= size.ch, `${view} overflow: ${JSON.stringify(size)}`);
        await page.waitForTimeout(250);
        if (process.env.SCREENSHOTS && [375, 1440].includes(width)) await page.screenshot({ path: `${process.env.SCREENSHOTS}/launch-${view}-${width}-${theme}.png` });
      }
      assert.deepEqual(errors, []);
      console.log(`PASS launch ${width}x${height} ${theme}: links, cover, deck, saved selection, lazy player, bounded views`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}

// Checks which sites may call the API function, and that the retired Notion
// intake stays gone. No network and no browser: the handler is called with a
// stand-in request and stops at its origin check.
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

delete process.env.SAP_ALLOWED_HOSTS; // test the built-in list, not a local override
const require = createRequire(import.meta.url);
const generateBeat = require('../api/generate-beat.js');

// The legacy Notion intake (api/notion-intake.js) was retired on 2026-11-27:
// nothing called it and a forged Origin header was its only gate. Any new
// function under api/ needs its own abuse controls and a test here.
const functions = readdirSync(new URL('../api/', import.meta.url)).sort();
assert.deepEqual(functions, ['generate-beat.js'], `unexpected API functions: ${functions.join(', ')}`);

function respond() {
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json() { return this; },
    end() { return this; },
  };
  return res;
}

async function call(handler, method, origin) {
  const res = respond();
  await handler({ method, headers: origin ? { origin } : {}, body: {} }, res);
  return res;
}

const allowed = [
  'https://erosynmusic.com',
  'https://www.erosynmusic.com',
  'https://standardacidprocedure.com',
  'https://www.standardacidprocedure.com',
];
const refused = [
  'https://example.org',
  'https://erosynmusic.com.example.org',
  'https://anything.vercel.app',
  '',
];

for (const origin of allowed) {
  const preflight = await call(generateBeat, 'OPTIONS', origin);
  assert.equal(preflight.statusCode, 204, `generate-beat should accept ${origin}`);
  assert.equal(preflight.headers['access-control-allow-origin'], origin);
}

for (const origin of refused) {
  const preflight = await call(generateBeat, 'OPTIONS', origin);
  assert.equal(preflight.statusCode, 403, `generate-beat should refuse "${origin}"`);
  assert.equal(preflight.headers['access-control-allow-origin'], undefined);

  const post = await call(generateBeat, 'POST', origin);
  assert.equal(post.statusCode, 403, `generate-beat should refuse a POST from "${origin}"`);
}

console.log(`PASS api origins: ${allowed.length} accepted, ${refused.length} refused; only generate-beat.js is deployed`);

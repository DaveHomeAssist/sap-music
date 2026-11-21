// Checks which sites may call the API functions. No network and no browser:
// each handler is called with a stand-in request and stops at its origin check.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

delete process.env.SAP_ALLOWED_HOSTS; // test the built-in lists, not a local override
const require = createRequire(import.meta.url);
const generateBeat = require('../api/generate-beat.js');
const notionIntake = require('../api/notion-intake.js');

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
const refused = ['https://example.org', 'https://erosynmusic.com.example.org', ''];

for (const origin of allowed) {
  const preflight = await call(generateBeat, 'OPTIONS', origin);
  assert.equal(preflight.statusCode, 204, `generate-beat should accept ${origin}`);
  assert.equal(preflight.headers['access-control-allow-origin'], origin);

  // A GET from an accepted site gets past the origin check and is refused for its method.
  const intake = await call(notionIntake, 'GET', origin);
  assert.equal(intake.statusCode, 405, `notion-intake should accept ${origin}`);
  assert.equal(intake.headers['access-control-allow-origin'], origin);
}

for (const origin of refused) {
  const preflight = await call(generateBeat, 'OPTIONS', origin);
  assert.equal(preflight.statusCode, 403, `generate-beat should refuse "${origin}"`);
  assert.equal(preflight.headers['access-control-allow-origin'], undefined);

  const post = await call(generateBeat, 'POST', origin);
  assert.equal(post.statusCode, 403, `generate-beat should refuse a POST from "${origin}"`);

  const intake = await call(notionIntake, 'GET', origin);
  assert.equal(intake.statusCode, 403, `notion-intake should refuse "${origin}"`);
}

console.log(`PASS api origins: ${allowed.length} accepted, ${refused.length} refused, on both functions`);

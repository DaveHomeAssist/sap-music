const ALLOWED_HOSTS = (process.env.SAP_ALLOWED_HOSTS
  ? process.env.SAP_ALLOWED_HOSTS.split(',').map((entry) => entry.trim()).filter(Boolean)
  : [
      'davehomeassist.github.io',
      'standardacidprocedure.com',
      'www.standardacidprocedure.com',
      'localhost',
      '127.0.0.1',
    ]);

const VALID_PRESETS = ['techno', 'house', 'trap', 'breakbeat', 'minimal'];
const ACCESS_TOKEN_HEADER = 'x-sap-access-token';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateBuckets = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const hits = (rateBuckets.get(ip) || []).filter((ts) => ts > cutoff);
  if (hits.length >= RATE_MAX) {
    rateBuckets.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  if (rateBuckets.size > 5000) {
    for (const [key, list] of rateBuckets) {
      if (!list.some((ts) => ts > cutoff)) rateBuckets.delete(key);
    }
  }
  return true;
}

function hostFromOrigin(origin) {
  return String(origin || '').replace(/^https?:\/\//, '').split(':')[0];
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function accessTokenFromRequest(req) {
  const explicit = req.headers[ACCESS_TOKEN_HEADER];
  if (explicit) return String(explicit).trim();
  const authorization = req.headers.authorization || '';
  const match = String(authorization).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const host = hostFromOrigin(origin);
  const originAllowed = host && ALLOWED_HOSTS.includes(host);

  if (originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-SAP-Access-Token');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(originAllowed ? 204 : 403).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!originAllowed) return res.status(403).json({ error: 'Origin not allowed' });

  const requestAccessToken = process.env.SAP_GENERATE_BEAT_TOKEN;
  if (!requestAccessToken) {
    return res.status(503).json({ error: 'AI generation disabled' });
  }

  if (accessTokenFromRequest(req) !== requestAccessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!rateLimit(clientIp(req))) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { description } = req.body || {};
  if (!description || typeof description !== 'string' || description.length > 200) {
    return res.status(400).json({ error: 'Invalid description' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 20,
        messages: [{
          role: 'user',
          content: `Given this drum beat description: "${description}", classify it into exactly one of these categories: techno, house, trap, breakbeat, minimal. Respond with ONLY the category name in lowercase, nothing else.`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', response.status, err);
      return res.status(502).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const preset = (data.content?.[0]?.text || '').trim().toLowerCase();

    if (VALID_PRESETS.includes(preset)) {
      return res.status(200).json({ preset });
    }
    return res.status(200).json({ preset: 'techno' });
  } catch (err) {
    console.error('generate-beat error:', err.message);
    return res.status(502).json({ error: 'AI service error' });
  }
};

const CONTACT_DATABASE_ID =
  process.env.NOTION_CONTACT_DATABASE_ID || 'cac04740-36f0-45e4-b7c3-d11937e34196';
const NEWSLETTER_DATABASE_ID =
  process.env.NOTION_NEWSLETTER_DATABASE_ID || '68347904-6a05-4cd8-94a1-c71e96e60ca4';
const NOTION_API_URL = 'https://api.notion.com/v1/pages';
const NOTION_VERSION = '2022-06-28';
const DEFAULT_ALLOWED_HOSTS = [
  'davehomeassist.github.io',
  'standardacidprocedure.com',
  'www.standardacidprocedure.com',
  'localhost',
  '127.0.0.1'
];
const SUBJECTS = new Set([
  'Booking Inquiry',
  'Remix Request',
  'Press / Interview',
  'Label Submission',
  'Other'
]);

function getAllowedHosts() {
  const extraHosts = (process.env.SAP_ALLOWED_HOSTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return DEFAULT_ALLOWED_HOSTS.concat(extraHosts);
}

function isAllowedOrigin(origin) {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    return (
      getAllowedHosts().includes(hostname) ||
      hostname.endsWith('.vercel.app')
    );
  } catch (error) {
    return false;
  }
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function normalizeText(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function splitRichText(value) {
  const text = normalizeText(value, '');
  if (!text) return [];

  const chunks = [];
  for (let index = 0; index < text.length; index += 1900) {
    chunks.push({
      type: 'text',
      text: {
        content: text.slice(index, index + 1900)
      }
    });
  }
  return chunks;
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function createNotionPage(body) {
  const response = await fetch(NOTION_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Notion request failed');
  }

  return response.json();
}

function buildContactPayload(payload) {
  const name = normalizeText(payload.name, 'Website Inquiry');
  const email = normalizeText(payload.email, '');
  const subject = SUBJECTS.has(payload.subject) ? payload.subject : 'Other';
  const message = normalizeText(payload.message, '');
  const sourceUrl = normalizeText(payload.sourceUrl, '');

  if (!email || !message) {
    throw new Error('Missing required contact fields');
  }

  return {
    parent: {
      database_id: CONTACT_DATABASE_ID
    },
    properties: {
      Name: {
        title: [
          {
            type: 'text',
            text: {
              content: name.slice(0, 200)
            }
          }
        ]
      },
      Email: { email },
      Subject: {
        select: { name: subject }
      },
      Message: {
        rich_text: splitRichText(message)
      },
      Status: {
        status: { name: 'Not started' }
      },
      'Source URL': sourceUrl ? { url: sourceUrl } : { url: null }
    }
  };
}

function buildNewsletterPayload(payload) {
  const email = normalizeText(payload.email, '');
  const sourceUrl = normalizeText(payload.sourceUrl, '');

  if (!email) {
    throw new Error('Missing required newsletter fields');
  }

  return {
    parent: {
      database_id: NEWSLETTER_DATABASE_ID
    },
    properties: {
      Subscriber: {
        title: [
          {
            type: 'text',
            text: {
              content: email.slice(0, 200)
            }
          }
        ]
      },
      Email: { email },
      Status: {
        status: { name: 'Not started' }
      },
      'Source URL': sourceUrl ? { url: sourceUrl } : { url: null },
      Notes: {
        rich_text: splitRichText('Newsletter signup captured from the SAP landing page.')
      }
    }
  };
}

module.exports = async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!isAllowedOrigin(req.headers.origin)) {
    sendJson(res, 403, { ok: false, error: 'Origin not allowed' });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  if (!process.env.NOTION_TOKEN) {
    sendJson(res, 500, { ok: false, error: 'Missing NOTION_TOKEN' });
    return;
  }

  try {
    const body = await parseBody(req);
    const type = normalizeText(body.type, '');
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};

    let notionPayload;
    if (type === 'contact') {
      notionPayload = buildContactPayload(payload);
    } else if (type === 'newsletter') {
      notionPayload = buildNewsletterPayload(payload);
    } else {
      sendJson(res, 400, { ok: false, error: 'Unsupported intake type' });
      return;
    }

    const page = await createNotionPage(notionPayload);
    sendJson(res, 200, { ok: true, pageId: page.id });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

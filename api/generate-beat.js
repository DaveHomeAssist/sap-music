const ALLOWED_HOSTS = [
  'davehomeassist.github.io',
  'standardacidprocedure.com',
  'www.standardacidprocedure.com',
  'localhost',
  '127.0.0.1'
];

const VALID_PRESETS = ['techno', 'house', 'trap', 'breakbeat', 'minimal'];

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const host = origin.replace(/^https?:\/\//, '').split(':')[0];
  if (ALLOWED_HOSTS.includes(host)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

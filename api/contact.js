/**
 * Vercel Serverless Function — contact form → Resend
 * Env: RESEND_API_KEY, CONTACT_TO (optional), RESEND_FROM (optional)
 */

const RATE_LIMIT_MS = 60_000;
const MIN_FORM_MS = 3000;
const recentByIp = new Map();

function getIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function cleanupRateMap() {
  const now = Date.now();
  for (const [ip, t] of recentByIp) {
    if (now - t > RATE_LIMIT_MS * 2) recentByIp.delete(ip);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  const allowed =
    !origin ||
    origin.includes('nestfigure.com') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    (host && origin.includes(host.replace(/:\d+$/, '')));

  if (origin && !allowed) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ ok: false, error: 'Email service is not configured' });
  }

  cleanupRateMap();
  const ip = getIp(req);
  const last = recentByIp.get(ip) || 0;
  if (Date.now() - last < RATE_LIMIT_MS) {
    return res.status(429).json({ ok: false, error: 'Please wait a minute before sending again.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON' });
    }
  }
  body = body || {};

  // Honeypot — real users leave empty
  if (body.website || body.company_url || body.fax) {
    // Pretend success so bots don't retry
    return res.status(200).json({ ok: true });
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();
  const startedAt = Number(body.startedAt) || 0;
  const challengeA = Number(body.challengeA);
  const challengeB = Number(body.challengeB);
  const challengeAnswer = Number(body.challengeAnswer);

  if (!name || name.length < 2 || name.length > 100) {
    return res.status(400).json({ ok: false, error: 'Please enter your name (2–100 characters).' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }
  if (!subject || subject.length < 3 || subject.length > 150) {
    return res.status(400).json({ ok: false, error: 'Please enter a subject (3–150 characters).' });
  }
  if (!message || message.length < 10 || message.length > 5000) {
    return res.status(400).json({ ok: false, error: 'Please enter a message (10–5000 characters).' });
  }

  // Time trap — forms submitted too fast are likely bots
  if (!startedAt || Date.now() - startedAt < MIN_FORM_MS) {
    return res.status(400).json({ ok: false, error: 'Please take a moment to complete the form, then try again.' });
  }
  // Reject absurd future/old timestamps (replay)
  if (Date.now() - startedAt > 1000 * 60 * 60 * 6) {
    return res.status(400).json({ ok: false, error: 'This form session expired. Please refresh the page.' });
  }

  // Simple math captcha
  if (
    !Number.isFinite(challengeA) ||
    !Number.isFinite(challengeB) ||
    !Number.isFinite(challengeAnswer) ||
    challengeA + challengeB !== challengeAnswer
  ) {
    return res.status(400).json({ ok: false, error: 'Spam check failed. Please solve the math question.' });
  }
  if (challengeA < 1 || challengeA > 12 || challengeB < 1 || challengeB > 12) {
    return res.status(400).json({ ok: false, error: 'Spam check failed. Please refresh and try again.' });
  }

  const to = 'info@nestfigure.com';
  // Hard-coded From — domain must be verified in Resend for delivery.
  const from = 'Nestfigure <info@nestfigure.com>';

  const text = [
    `New contact form message from nestfigure.com`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
    `IP: ${ip}`,
    ``,
    `Message:`,
    message,
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1f24">
      <p><strong>New contact form message</strong> from nestfigure.com</p>
      <p><strong>Name:</strong> ${escapeHtml(name)}<br/>
      <strong>Email:</strong> ${escapeHtml(email)}<br/>
      <strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      <p style="color:#5c6d75;font-size:12px">IP: ${escapeHtml(ip)}</p>
    </div>
  `;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Nestfigure Contact] ${subject}`,
        text,
        html,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Resend error', r.status, data);
      return res.status(502).json({
        ok: false,
        error: 'Could not send email right now. Please try again later or email info@nestfigure.com directly.',
      });
    }

    recentByIp.set(ip, Date.now());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact handler error', err);
    return res.status(500).json({
      ok: false,
      error: 'Could not send email right now. Please try again later or email info@nestfigure.com directly.',
    });
  }
}

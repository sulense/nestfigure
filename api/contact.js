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

  const to = process.env.CONTACT_TO || process.env.RESEND_TO;
  if (!to) {
    console.error('CONTACT_TO is not set');
    return res.status(500).json({ ok: false, error: 'Email service is not configured' });
  }
  // Hard-coded From — domain must be verified in Resend for delivery.
  const from = 'Nestfigure <info@nestfigure.com>';

  const receivedAt = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const text = [
    `Nestfigure — new contact form message`,
    ``,
    `From: ${name} <${email}>`,
    `Subject: ${subject}`,
    `Received (UTC): ${receivedAt}`,
    `IP: ${ip}`,
    ``,
    `——— Message ———`,
    message,
    ``,
    `———`,
    `Reply directly to this email to respond to ${email}.`,
    `https://nestfigure.com/contact/`,
  ].join('\n');

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
  const safeIp = escapeHtml(ip);
  const safeReceived = escapeHtml(receivedAt);

  // Table-based layout for email clients; Nestfigure brand colors
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>New contact message</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f5fe;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f5fe;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 20px 0;text-align:left;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.03em;color:#1a1f24;line-height:1;">
                    Nest<span style="color:#2563eb;">figure</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e3e8ea;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(39,44,48,0.06);">
              <!-- Accent bar -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#2563eb,#3b82f6);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:28px 28px 8px 28px;">
                    <p style="margin:0 0 6px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#2563eb;">
                      Contact form
                    </p>
                    <h1 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;letter-spacing:-0.02em;line-height:1.25;color:#1a1f24;">
                      New message received
                    </h1>
                    <p style="margin:0 0 24px 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#334048;">
                      Someone submitted the form on nestfigure.com.
                    </p>
                  </td>
                </tr>
                <!-- Meta panel -->
                <tr>
                  <td style="padding:0 28px 24px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e3e8ea;border-radius:6px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 12px 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#4a5a61;width:88px;vertical-align:top;">
                                From
                              </td>
                              <td style="padding:0 0 12px 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#1a1f24;vertical-align:top;">
                                ${safeName}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:0 0 12px 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#4a5a61;width:88px;vertical-align:top;border-top:1px solid #e3e8ea;">
                                <span style="display:inline-block;padding-top:12px;">Email</span>
                              </td>
                              <td style="padding:0 0 12px 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1a1f24;vertical-align:top;border-top:1px solid #e3e8ea;">
                                <a href="mailto:${safeEmail}" style="display:inline-block;padding-top:12px;color:#1d4ed8;text-decoration:none;font-weight:500;">${safeEmail}</a>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#4a5a61;width:88px;vertical-align:top;border-top:1px solid #e3e8ea;">
                                <span style="display:inline-block;padding-top:12px;">Subject</span>
                              </td>
                              <td style="padding:0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;color:#1a1f24;vertical-align:top;border-top:1px solid #e3e8ea;">
                                <span style="display:inline-block;padding-top:12px;">${safeSubject}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Message -->
                <tr>
                  <td style="padding:0 28px 8px 28px;">
                    <p style="margin:0 0 10px 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#4a5a61;">
                      Message
                    </p>
                    <div style="margin:0;padding:18px 18px;background-color:#ffffff;border:1px solid #e3e8ea;border-left:3px solid #2563eb;border-radius:0 6px 6px 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#1a1f24;">
                      ${safeMessage}
                    </div>
                  </td>
                </tr>
                <!-- CTA -->
                <tr>
                  <td style="padding:24px 28px 28px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius:6px;background-color:#2563eb;">
                          <a href="mailto:${safeEmail}?subject=${encodeURIComponent('Re: ' + subject)}" style="display:inline-block;padding:12px 20px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                            Reply to ${safeName}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:14px 0 0 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.45;color:#4a5a61;">
                      Or hit reply in your inbox — Reply-To is set to the sender.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 8px 0 8px;">
              <p style="margin:0 0 6px 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#4a5a61;">
                Received <strong style="color:#334048;font-weight:600;">${safeReceived} UTC</strong>
                · IP <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;">${safeIp}</span>
              </p>
              <p style="margin:0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#4a5a61;">
                <a href="https://nestfigure.com/" style="color:#1d4ed8;text-decoration:none;">nestfigure.com</a>
                · Personal finance calculators
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
        subject: `[Nestfigure] ${subject}`,
        text,
        html,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Resend error', r.status, data);
      return res.status(502).json({
        ok: false,
        error: 'Could not send email right now. Please try again later.',
      });
    }

    recentByIp.set(ip, Date.now());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact handler error', err);
    return res.status(500).json({
      ok: false,
      error: 'Could not send email right now. Please try again later.',
    });
  }
}

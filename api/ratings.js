/**
 * Star ratings API (no auth)
 * GET  /api/ratings?tool=cd-calculator&clientId=...
 * POST /api/ratings  { tool, stars, clientId }
 *
 * Storage: Upstash Redis REST (or Vercel KV env names)
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   or KV_REST_API_URL + KV_REST_API_TOKEN
 */

const ALLOWED_TOOLS = new Set(['cd-calculator']);
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_ACTIONS_PER_WINDOW = 30;
const ipActions = new Map();

// In-memory fallback when Redis is not configured (single-instance / dev only)
const memoryStore = new Map();

function getIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisCmd(cfg, ...args) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Redis error ${res.status}`);
  }
  return data.result;
}

function memGet(key) {
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}
function memSet(key, value) {
  memoryStore.set(key, value);
}

async function getAggregate(cfg, tool) {
  const key = `ratings:${tool}`;
  if (cfg) {
    const raw = await redisCmd(cfg, 'GET', key);
    if (!raw) return { sum: 0, count: 0 };
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        sum: Number(parsed.sum) || 0,
        count: Number(parsed.count) || 0,
      };
    } catch {
      return { sum: 0, count: 0 };
    }
  }
  const v = memGet(key);
  return v ? { sum: v.sum, count: v.count } : { sum: 0, count: 0 };
}

async function setAggregate(cfg, tool, agg) {
  const key = `ratings:${tool}`;
  const payload = JSON.stringify({ sum: agg.sum, count: agg.count });
  if (cfg) {
    await redisCmd(cfg, 'SET', key, payload);
  } else {
    memSet(key, { sum: agg.sum, count: agg.count });
  }
}

async function getVote(cfg, tool, clientId) {
  const key = `vote:${tool}:${clientId}`;
  if (cfg) {
    const raw = await redisCmd(cfg, 'GET', key);
    if (raw == null) return null;
    const n = Number(raw);
    return n >= 1 && n <= 5 ? n : null;
  }
  const v = memGet(key);
  return v == null ? null : Number(v);
}

async function setVote(cfg, tool, clientId, stars) {
  const key = `vote:${tool}:${clientId}`;
  if (cfg) {
    await redisCmd(cfg, 'SET', key, String(stars));
  } else {
    memSet(key, stars);
  }
}

function summary(agg, userRating) {
  const count = agg.count;
  const average = count > 0 ? Math.round((agg.sum / count) * 10) / 10 : 0;
  return { average, count, userRating: userRating ?? null };
}

function checkIpRate(ip) {
  const now = Date.now();
  let entry = ipActions.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    entry = { start: now, count: 0 };
    ipActions.set(ip, entry);
  }
  entry.count += 1;
  return entry.count <= MAX_ACTIONS_PER_WINDOW;
}

function isValidClientId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(id);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const cfg = redisConfig();

  try {
    if (req.method === 'GET') {
      const tool = String(req.query.tool || '').trim();
      const clientId = String(req.query.clientId || '').trim();
      if (!ALLOWED_TOOLS.has(tool)) {
        return res.status(400).json({ ok: false, error: 'Unknown tool' });
      }
      const agg = await getAggregate(cfg, tool);
      let userRating = null;
      if (isValidClientId(clientId)) {
        userRating = await getVote(cfg, tool, clientId);
      }
      return res.status(200).json({
        ok: true,
        tool,
        storage: cfg ? 'redis' : 'memory',
        ...summary(agg, userRating),
      });
    }

    if (req.method === 'POST') {
      const ip = getIp(req);
      if (!checkIpRate(ip)) {
        return res.status(429).json({ ok: false, error: 'Too many rating attempts. Try again later.' });
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

      // Honeypot
      if (body.website || body.company_url) {
        return res.status(200).json({ ok: true, average: 0, count: 0, userRating: null });
      }

      const tool = String(body.tool || '').trim();
      const clientId = String(body.clientId || '').trim();
      const stars = Number(body.stars);

      if (!ALLOWED_TOOLS.has(tool)) {
        return res.status(400).json({ ok: false, error: 'Unknown tool' });
      }
      if (!isValidClientId(clientId)) {
        return res.status(400).json({ ok: false, error: 'Invalid client id' });
      }
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return res.status(400).json({ ok: false, error: 'Stars must be an integer from 1 to 5' });
      }

      const agg = await getAggregate(cfg, tool);
      const prev = await getVote(cfg, tool, clientId);

      if (prev == null) {
        agg.sum += stars;
        agg.count += 1;
      } else if (prev !== stars) {
        agg.sum += stars - prev;
      }

      // Guard against bad state
      if (agg.count < 0) agg.count = 0;
      if (agg.sum < 0) agg.sum = 0;

      await setAggregate(cfg, tool, agg);
      await setVote(cfg, tool, clientId, stars);

      return res.status(200).json({
        ok: true,
        tool,
        storage: cfg ? 'redis' : 'memory',
        ...summary(agg, stars),
      });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('ratings API error', err);
    return res.status(500).json({ ok: false, error: 'Could not load ratings right now.' });
  }
}

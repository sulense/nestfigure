import sharp from 'sharp';

async function writeWebp(path, svg) {
  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(path);
  console.log('wrote', path);
}

const featureSvg = `<svg width="960" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0f5fe"/>
      <stop offset="55%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e8f0fe"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3e79ea"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="48" y="48" width="864" height="624" rx="24" fill="#ffffff" stroke="#e3e8ea" stroke-width="2"/>
  <text x="88" y="120" font-family="system-ui,Segoe UI,sans-serif" font-size="22" font-weight="600" fill="#5c6670" letter-spacing="0.08em">NESTFIGURE</text>
  <text x="88" y="190" font-family="Georgia,serif" font-size="52" fill="#1a1f24">Raise Calculator</text>
  <text x="88" y="240" font-family="system-ui,Segoe UI,sans-serif" font-size="24" fill="#5c6670">Percent and salary increase estimates</text>
  <rect x="88" y="300" width="360" height="18" rx="9" fill="#e8eef3"/>
  <rect x="88" y="300" width="240" height="18" rx="9" fill="#94a3b8"/>
  <text x="470" y="315" font-family="ui-monospace,monospace" font-size="18" fill="#5c6670">Before $60,000</text>
  <rect x="88" y="350" width="360" height="18" rx="9" fill="#e8eef3"/>
  <rect x="88" y="350" width="300" height="18" rx="9" fill="url(#bar)"/>
  <text x="470" y="365" font-family="ui-monospace,monospace" font-size="18" fill="#1a1f24">After $63,000</text>
  <rect x="88" y="400" width="360" height="18" rx="9" fill="#e8eef3"/>
  <rect x="88" y="400" width="60" height="18" rx="9" fill="#22c55e"/>
  <text x="470" y="415" font-family="ui-monospace,monospace" font-size="18" fill="#14532d">Raise +$3,000</text>
  <rect x="88" y="480" width="200" height="56" rx="12" fill="#2563eb"/>
  <text x="118" y="515" font-family="system-ui,Segoe UI,sans-serif" font-size="22" font-weight="600" fill="#ffffff">5% sample</text>
  <text x="88" y="590" font-family="system-ui,Segoe UI,sans-serif" font-size="18" fill="#5c6670">Educational arithmetic · Free · No signup</text>
</svg>`;

const ogSvg = `<svg width="1200" height="675" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eef4ff"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="80" y="160" font-family="system-ui,Segoe UI,sans-serif" font-size="28" font-weight="600" fill="#5c6670" letter-spacing="0.1em">NESTFIGURE</text>
  <text x="80" y="280" font-family="Georgia,serif" font-size="72" fill="#1a1f24">Raise Calculator</text>
  <text x="80" y="360" font-family="system-ui,Segoe UI,sans-serif" font-size="32" fill="#5c6670">Free salary increase estimates · No signup</text>
  <rect x="80" y="420" width="300" height="64" rx="14" fill="#2563eb"/>
  <text x="110" y="462" font-family="system-ui,Segoe UI,sans-serif" font-size="28" font-weight="600" fill="#ffffff">$60k to $63k</text>
</svg>`;

const guideSvg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <rect x="60" y="60" width="1080" height="680" rx="20" fill="#fff" stroke="#e3e8ea"/>
  <text x="100" y="180" font-family="system-ui,sans-serif" font-size="26" fill="#5c6670" letter-spacing="0.08em">GUIDE</text>
  <text x="100" y="280" font-family="Georgia,serif" font-size="56" fill="#1a1f24">How to calculate</text>
  <text x="100" y="360" font-family="Georgia,serif" font-size="56" fill="#1a1f24">a raise percentage</text>
  <rect x="100" y="420" width="900" height="80" rx="12" fill="#f0f5fe" stroke="#d7e4fb"/>
  <text x="130" y="470" font-family="ui-monospace,monospace" font-size="26" fill="#1a1f24">raise % = (new - current) / current x 100</text>
  <text x="100" y="580" font-family="system-ui,sans-serif" font-size="24" fill="#5c6670">Nestfigure · Educational only</text>
</svg>`;

await writeWebp('public/images/feature-raise-calculator.webp', featureSvg);
await writeWebp('public/images/og-raise-calculator.webp', ogSvg);
await writeWebp('public/images/guide-how-to-calculate-a-raise.webp', guideSvg);

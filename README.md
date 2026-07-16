# Nestfigure

**https://nestfigure.com** — personal finance calculators. **CD calculator** first.

## Stack

- [Astro](https://astro.build) (static / SSG)
- Design tokens from `../DESIGN.md` (Reworkd daylight system)
- SEO: sitemap, robots, FAQ + WebApplication JSON-LD

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Pages

| Path | Purpose |
|------|---------|
| `/` | Home |
| `/cd-calculator/` | Flagship CD calculator |
| `/about/` | Methodology & trust |
| `/privacy/` | Privacy policy |

## Deploy

Static `dist/` output. Vercel / Cloudflare Pages / Netlify all work.

Production domain is set to `https://nestfigure.com` in `astro.config.mjs`.

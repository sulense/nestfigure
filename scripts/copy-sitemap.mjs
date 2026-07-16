/**
 * Copy the generated URL set to /sitemap.xml so Search Console and
 * common crawlers find it at the conventional path.
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const source = path.join(dist, 'sitemap-0.xml');
const target = path.join(dist, 'sitemap.xml');

if (!fs.existsSync(source)) {
  console.error('copy-sitemap: dist/sitemap-0.xml not found — did @astrojs/sitemap run?');
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log('copy-sitemap: wrote dist/sitemap.xml');

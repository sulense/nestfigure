import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';

const srcDir =
  'C:\\Users\\balai\\.grok\\sessions\\C%3A%5CCoding%5Cads%20websites%5Ctools\\019f6be6-8803-7db1-aa01-bba9c4983c21\\images';
const outDir = path.resolve('public/images');
fs.mkdirSync(outDir, { recursive: true });

/** @type {{ src: string; out: string; width: number; quality: number }[]} */
const jobs = [
  { src: '1.jpg', out: 'og-default.webp', width: 1200, quality: 78 },
  { src: '3.jpg', out: 'hero-product.webp', width: 1600, quality: 80 },
  { src: '2.jpg', out: 'feature-cd-calculator.webp', width: 960, quality: 80 },
  { src: '4.jpg', out: 'guide-how-cd-interest.webp', width: 1200, quality: 78 },
  { src: '5.jpg', out: 'guide-cd-vs-savings.webp', width: 1200, quality: 78 },
];

for (const job of jobs) {
  const input = path.join(srcDir, job.src);
  const output = path.join(outDir, job.out);
  await sharp(input)
    .rotate()
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: job.quality, effort: 6 })
    .toFile(output);
  const stat = fs.statSync(output);
  console.log(`${job.out}: ${(stat.size / 1024).toFixed(1)} KB`);
}

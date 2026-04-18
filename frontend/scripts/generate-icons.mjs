import { mkdirSync } from "fs";
import sharp from "sharp";

const sizes = [192, 512];

const svgTemplate = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981"/>
      <stop offset="100%" style="stop-color:#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="${size * 0.55}">🎾</text>
</svg>
`;

mkdirSync("public", { recursive: true });

for (const size of sizes) {
  const svg = Buffer.from(svgTemplate(size));
  await sharp(svg).png().toFile(`public/pwa-${size}x${size}.png`);
  console.log(`Created pwa-${size}x${size}.png`);
}

// يولّد أيقونات PWA من app/icon.svg: نسخة maskable بهوامش أمان (المحتوى ~65% من
// المساحة كي لا يقصّه قناع أندرويد الدائري) وأيقونة iOS (apple-icon 180x180 بلا شفافية).
// التشغيل مرة واحدة:  node scripts/make-pwa-icons.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const svg = fs.readFileSync('app/icon.svg');
const BG = '#7c3aed';

async function onSolid(size, inner, out) {
  const glyph = await sharp(svg).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toFile(out);
  console.log('wrote', out);
}

await onSolid(512, 332, 'public/icon-512-maskable.png');
await onSolid(180, 150, 'app/apple-icon.png');

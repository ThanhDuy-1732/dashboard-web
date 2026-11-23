import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.join(process.cwd(), 'public/icons');
await mkdir(dir, { recursive: true });

const source = path.join(dir, 'icon.svg');

await sharp(source).resize(192, 192).png().toFile(path.join(dir, 'icon-192.png'));
await sharp(source).resize(512, 512).png().toFile(path.join(dir, 'icon-512.png'));

const inner = await sharp(source).resize(384, 384).png().toBuffer();
await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: '#2f6b4f',
  },
})
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(path.join(dir, 'icon-maskable-512.png'));

const adminSource = path.join(dir, 'admin-icon.svg');
await sharp(adminSource)
  .resize(192, 192)
  .png()
  .toFile(path.join(dir, 'admin-icon-192.png'));
await sharp(adminSource)
  .resize(512, 512)
  .png()
  .toFile(path.join(dir, 'admin-icon-512.png'));

const adminInner = await sharp(adminSource).resize(384, 384).png().toBuffer();
await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: '#0f172a',
  },
})
  .composite([{ input: adminInner, gravity: 'center' }])
  .png()
  .toFile(path.join(dir, 'admin-icon-maskable-512.png'));

console.log('icons generated');

// Chụp ảnh xem trước cho các app đang hiển thị và lưu vào public/previews/.
//
//   npm run previews
//
// Ảnh chỉ được tạo ở bước này; trang chủ phục vụ file tĩnh trong public/ nên
// không phụ thuộc dịch vụ ngoài lúc chạy. Script in ra câu SQL ghi preview_url.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const APPS = [
  { slug: 'secret-story', url: 'https://secret-story-seven.vercel.app' },
  { slug: 'dashboard-games', url: 'https://dashboard-games-iota.vercel.app' },
  { slug: 'money-app', url: 'https://money-app-brown-eight.vercel.app' },
  { slug: 'english-sudy-web', url: 'https://english-sudy-web-taupe.vercel.app' },
  // App này fade-in nội dung bằng CSS nên thum.io (noanimate) chỉ ra bầu trời trống.
  // Microlink render đúng viewport và đợi animation xong.
  { slug: 'qr-app', url: 'https://qr-app-gamma-silk.vercel.app', waitMs: 6000 },
  { slug: 'smart-social-shopping-app', url: 'https://smart-social-shopping-app.vercel.app' },
];

const WIDTH = 1200;
const HEIGHT = 750;
const QUALITY = 78;
const TIMEOUT_MS = 90_000;

async function shotFromMicrolink(url, waitMs) {
  const params = new URLSearchParams({
    url,
    screenshot: 'true',
    meta: 'false',
    'viewport.width': String(WIDTH),
    'viewport.height': String(HEIGHT),
    waitForTimeout: String(waitMs),
    waitFor: String(waitMs + 500),
  });

  const response = await fetch(`https://api.microlink.io/?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const payload = await response.json();
  const imageUrl = payload?.data?.screenshot?.url;

  if (payload?.status !== 'success' || !imageUrl) {
    throw new Error(`microlink: ${payload?.message ?? payload?.status ?? 'no screenshot'}`);
  }

  return download(imageUrl);
}

async function shotFromThum(url) {
  const response = await fetch(
    `https://image.thum.io/get/width/${WIDTH}/viewport/${WIDTH}x${HEIGHT}/crop/${HEIGHT}/noanimate/${url}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' },
  );
  if (!response.ok) {
    throw new Error(`thum.io: HTTP ${response.status}`);
  }
  return download(response.url);
}

async function download(link) {
  const response = await fetch(link, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`download: HTTP ${response.status}`);
  }
  const type = response.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) {
    throw new Error(`download: unexpected content-type ${type || 'none'}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const outDir = path.join(process.cwd(), 'public', 'previews');
await mkdir(outDir, { recursive: true });

let failed = 0;

for (const app of APPS) {
  const target = path.join(outDir, `${app.slug}.webp`);
  const attempts = [
    ['microlink', () => shotFromMicrolink(app.url, app.waitMs ?? 3000)],
    ['thum.io', () => shotFromThum(app.url)],
  ];

  try {
    let bytes;
    for (const [name, run] of attempts) {
      try {
        bytes = await run();
        break;
      } catch (error) {
        console.error(`  ${name} lỗi cho ${app.slug}: ${error.message}`);
      }
    }

    if (!bytes) {
      throw new Error('cả hai nguồn đều lỗi');
    }

    // Encode vào buffer trước rồi mới ghi: ảnh hỏng không được ghi đè ảnh tốt.
    const encoded = await sharp(bytes)
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'top' })
      .webp({ quality: QUALITY })
      .toBuffer();

    if (encoded.byteLength < 5_000) {
      throw new Error(`ảnh quá nhỏ (${encoded.byteLength} bytes) — có thể trang chưa render`);
    }

    await writeFile(target, encoded);
    console.log(`ok   ${app.slug} (${Math.round(encoded.byteLength / 1024)} KB)`);
  } catch (error) {
    failed += 1;
    console.error(`fail ${app.slug}: ${error instanceof Error ? error.message : error}`);
  }
}

console.log('\nSQL để ghi vào DB:');
for (const app of APPS) {
  console.log(
    `update apps set preview_url = '/previews/${app.slug}.webp' where slug = '${app.slug}';`,
  );
}

if (failed > 0) {
  console.error(`\n${failed} ảnh lỗi — chạy lại script hoặc chụp tay.`);
  process.exitCode = 1;
}

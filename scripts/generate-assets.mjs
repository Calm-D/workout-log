import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const svg = fs.readFileSync('public/icon.svg', 'utf8');
const foregroundSvg = svg.replace(
  /<rect width="512" height="512" rx="120" fill="#0d1015"\/>/,
  '',
);
const outDir = path.resolve('assets');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });

const render = async (html, width, height, file, transparent = false) => {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({
    path: path.join(outDir, file),
    omitBackground: transparent,
    clip: { x: 0, y: 0, width, height },
  });
  console.log(`generated assets/${file}`);
};

await render(
  `<!doctype html><html><head><style>
    html,body{margin:0;width:1024px;height:1024px;background:#0d1015;overflow:hidden}
    svg{display:block;width:1024px;height:1024px}
  </style></head><body>${svg}</body></html>`,
  1024,
  1024,
  'icon-only.png',
);

await render(
  `<!doctype html><html><head><style>
    html,body{margin:0;width:1024px;height:1024px;background:transparent;overflow:hidden}
    svg{display:block;width:1024px;height:1024px}
  </style></head><body>${foregroundSvg}</body></html>`,
  1024,
  1024,
  'icon-foreground.png',
  true,
);

await render(
  `<!doctype html><html><head><style>
    html,body{margin:0;width:1024px;height:1024px;background:#0d1015;overflow:hidden}
  </style></head><body></body></html>`,
  1024,
  1024,
  'icon-background.png',
);

await render(
  `<!doctype html><html><head><style>
    html,body{margin:0;width:2732px;height:2732px;background:#0e1116;overflow:hidden}
    .wrap{width:2732px;height:2732px;display:flex;align-items:center;justify-content:center}
    svg{display:block;width:760px;height:760px;filter:drop-shadow(0 30px 80px rgba(0,0,0,.35))}
  </style></head><body><div class="wrap">${svg}</div></body></html>`,
  2732,
  2732,
  'splash.png',
);

await browser.close();

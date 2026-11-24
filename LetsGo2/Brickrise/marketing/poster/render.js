/**
 * poster.html의 각 섹션을 PNG로 저장한다.
 *   node render.js [사이트주소]
 * 사이트 주소(기본 https://brickrise.vercel.app/make)로 QR(qr.svg)을 다시 만든 뒤 렌더링한다.
 * 필요: playwright, qrcode (npm). 사진 픽셀을 읽어야 해서 Brickrise 폴더를 로컬 HTTP로 띄워 연다.
 */
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const QRCode = require("qrcode");

const ROOT = path.resolve(__dirname, "../..");           // LetsGo2/Brickrise
const OUT = path.resolve(__dirname, "../output");
const SITE_URL = process.argv[2] || "https://brickrise.vercel.app/make";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };

(async () => {
  fs.writeFileSync(path.join(__dirname, "qr.svg"), await QRCode.toString(SITE_URL, { type: "svg", margin: 0, errorCorrectionLevel: "M" }));
  const server = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/marketing/poster/poster.html`);
  await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  fs.mkdirSync(OUT, { recursive: true });
  for (const el of await page.$$("section[data-out]")) {
    const name = await el.getAttribute("data-out");
    await el.screenshot({ path: path.join(OUT, name) });
    console.log("saved", name);
  }
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });

import fs from "node:fs";
const pw = await import("playwright-core");
const W = "/tmp/claude-0/-home-user/631b1caf-7e2d-5951-8737-7c4a8796b469/scratchpad/neu2/";
const O = "/home/user/SB-KIMTool-Point/assets/img/";
const b64 = (p, t) => `data:image/${t};base64,` + fs.readFileSync(p).toString("base64");
const reihen = [
  ["jetzt live (900 px, ohne Filter)", b64(O + "banner-markt.webp", "webp")],
  ["neu · Kontrast 1,10 · Sättigung 1,08", b64(W + "markt-110108.webp", "webp")],
  ["neu · Kontrast 1,18 · Sättigung 1,14", b64(W + "markt-118114.webp", "webp")],
  ["neu · Kontrast 1,26 · Sättigung 1,20", b64(W + "markt-126120.webp", "webp")],
];
const html = `<!doctype html><meta charset="utf-8"><style>
 body{background:#0c0f12;color:#cfe;font:13px system-ui;margin:0;padding:14px}
 h3{font-size:13px;margin:0 0 4px;color:#8fe;font-weight:600}
 .karte{width:335px;display:inline-block;margin:0 10px 16px 0;vertical-align:top}
 img{display:block;width:100%;height:180px;object-fit:contain;border-radius:12px 12px 0 0;
     background:radial-gradient(70% 90% at 50% 40%, rgba(54,214,195,.10), transparent 70%),
                linear-gradient(135deg,#14201f,#0e1419);border-bottom:1px solid #2a3a38}
</style>
<p style="opacity:.75">So groß, wie die Karte auf der Startseite wirklich ist (335 × 180)</p>
${reihen.map(([t, d]) => `<div class="karte"><h3>${t}</h3><img src="${d}"></div>`).join("")}`;
const b = await pw.chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"]});
const page = await b.newPage({viewport:{width:1440,height:300},deviceScaleFactor:2});
await page.setContent(html); await page.waitForTimeout(700);
await page.screenshot({path:"/tmp/claude-0/-home-user/631b1caf-7e2d-5951-8737-7c4a8796b469/scratchpad/markt-stufen.png"});
await b.close(); process.exit(0);

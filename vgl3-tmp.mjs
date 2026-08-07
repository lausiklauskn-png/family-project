import fs from "node:fs";
const pw = await import("playwright-core");
const W="/tmp/claude-0/-home-user/631b1caf-7e2d-5951-8737-7c4a8796b469/scratchpad/";
const b64=(p,t)=>`data:image/${t};base64,`+fs.readFileSync(p).toString("base64");
// 900px-Fassung aus dem gemergten Stand zurückholen -> vorher per git show abgelegt
const reihen=[
  ["Original-PNG (1150 px, 1194 KiB)", b64(W+"orig/banner-werkzeuge.png","png")],
  ["WebP 900 px (64 KiB) — was live war", b64(W+"w900.webp","webp")],
  ["WebP 1150 px voll (111 KiB) — neu", b64("/home/user/SB-KIMTool-Point/assets/img/banner-werkzeuge.webp","webp")],
];
const html=`<!doctype html><meta charset="utf-8"><style>
 body{background:#0c0f12;color:#cfe;font:13px system-ui;margin:0;padding:14px}
 h3{font-size:13px;margin:0 0 4px;color:#8fe}
 .k{width:850px;display:inline-block;margin:0 12px 14px 0;vertical-align:top}
 img{display:block;width:100%;height:566px;object-fit:contain;background:#0e1419}
</style><p style="opacity:.75">Auf 850 px Breite gezogen — ungefähr so, wie Klaus es beim Hineinzoomen sieht</p>
${reihen.map(([t,d])=>`<div class="k"><h3>${t}</h3><img src="${d}"></div>`).join("")}`;
const b=await pw.chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"]});
const page=await b.newPage({viewport:{width:2640,height:660},deviceScaleFactor:1});
await page.setContent(html); await page.waitForTimeout(800);
await page.screenshot({path:W+"schaerfe.png"});
await b.close(); process.exit(0);

/* Farbkontrast messen — gegen den WIRKLICH gemalten Grund.
 *
 *   cd /home/user/family-project
 *   LH_ROOT=/home/user/Sage-Protokol node tools/kontrast-messen.mjs index.html \
 *     ".card-tag" ".mod-row .mod-num" ".foot a"
 *
 * Ohne Selektoren nimmt es eine Standard-Liste (siehe STANDARD unten).
 *
 * WARUM ES DIESES WERKZEUG GIBT. Lighthouse sagt, WELCHE Elemente durchfallen,
 * aber nicht, um wie viel und was helfen würde. Zweimal am 2026-08-03/04 hat
 * genau das die Zeit gekostet:
 *
 *   1. Ein erster Versuch rechnete die Farbe gegen WEISS. Tomys Hub hat aber
 *      acht Themes, und hinter allem liegt ein halbdurchsichtiger Canvas —
 *      die Rechnung ging an der sichtbaren Seite vorbei.
 *   2. Eine Deckkraft am ELTERN-Element (`opacity:.62` an der ganzen Karte)
 *      dimmt Text UND Grund gemeinsam und schlägt jede Farbwahl. Wer nur die
 *      Textfarbe ansieht, sucht ewig.
 *
 * Darum rechnet dieses Werkzeug drei Dinge mit, die man von Hand übersieht:
 *   - rgba-Textfarben werden über den echten Grund AUSGEMISCHT,
 *   - der Grund ist der erste Vorfahr mit deckender Hintergrundfarbe,
 *   - `opacity` an Vorfahren legt Text und Grund gemeinsam über die Seite.
 *
 * Und es sagt, WAS reichen würde: die nötige Deckkraft je Fundstelle. Das ist
 * der Unterschied zwischen „ist rot" und „setz 0.47, dann steht es".
 *
 * Chromium gibt eine `color-mix()` als `color(srgb …)` zurück, nicht als
 * `rgb()` — beide Schreibweisen werden gelesen (daran ist der erste Anlauf
 * gescheitert).
 *
 * Grenze, ehrlich: gerechnet wird, was im Stilblock steht. Ein Bild oder ein
 * Verlauf hinter dem Text ist damit NICHT erfasst — dort bleibt nur der Blick.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.LH_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEITE = process.argv[2] || "index.html";
const SELEKTOREN = process.argv.slice(3);
const STANDARD = ["p", "a", "footer", "footer a", "h1", "h2", "h3", "small"];

const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",
  ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",
  ".jpg":"image/jpeg",".woff2":"font/woff2",".webm":"video/webm",".mp4":"video/mp4",
  ".ico":"image/x-icon",".webmanifest":"application/manifest+json" };

const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end("404"); return; }
  r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const pw = (await import("playwright-core")).default;
const browser = await pw.chromium.launch({
  executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${base}/${SEITE}`, { waitUntil: "load" });
await page.waitForTimeout(2000);

const out = await page.evaluate(({ sel }) => {
  const lin = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const leucht = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const farbe = (t) => {
    t = String(t);
    let m = t.match(/color\(srgb\s+([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p[3] === undefined ? 1 : p[3] }; }
    m = t.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const misch = (f, g) => ({ r: f.r * f.a + g.r * (1 - f.a), g: f.g * f.a + g.g * (1 - f.a), b: f.b * f.a + g.b * (1 - f.a) });
  const verh = (f, g) => { const a = leucht(f), b = leucht(g);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  /* Der Grund: der erste Vorfahr mit DECKENDER Hintergrundfarbe. */
  const grundVon = (el) => { let n = el;
    while (n) { const c = farbe(getComputedStyle(n).backgroundColor); if (c && c.a >= 0.999) return c; n = n.parentElement; }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  /* Deckkraft an Vorfahren: legt Text UND Grund gemeinsam über die Seite. */
  const dimmung = (el) => { let n = el, f = 1;
    while (n && n !== document.documentElement) { const o = parseFloat(getComputedStyle(n).opacity);
      if (isFinite(o) && o < 1) f *= o; n = n.parentElement; }
    return f;
  };

  const res = [];
  for (const s of sel) {
    const el = document.querySelector(s);
    if (!el) { res.push({ s, fehlt: true }); continue; }
    const cs = getComputedStyle(el);
    const vorn = farbe(cs.color);
    if (!vorn) { res.push({ s, fehlt: true }); continue; }
    const grund = grundVon(el);
    const seite = farbe(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    const d = dimmung(el);
    // erst die Textfarbe auf ihren Grund, dann beide gemeinsam gedimmt
    const t0 = misch(vorn, grund);
    const text = d < 1 ? misch({ ...t0, a: d }, seite) : t0;
    const hinten = d < 1 ? misch({ ...grund, a: d }, seite) : grund;

    const px = parseFloat(cs.fontSize), fett = parseInt(cs.fontWeight, 10) >= 700;
    const gross = px >= 24 || (px >= 18.66 && fett);
    const soll = gross ? 3 : 4.5;

    // Was würde reichen? Dieselbe Farbe, höhere Deckkraft.
    let noetig = null;
    for (let a = Math.max(1, Math.round(vorn.a * 100)); a <= 100; a++) {
      const p0 = misch({ ...vorn, a: a / 100 }, grund);
      const p = d < 1 ? misch({ ...p0, a: d }, seite) : p0;
      if (verh(p, hinten) >= soll) { noetig = a; break; }
    }
    res.push({ s, farbe: cs.color, px, gross, dimmung: Math.round(d * 100) / 100,
      grund: `rgb(${Math.round(hinten.r)},${Math.round(hinten.g)},${Math.round(hinten.b)})`,
      ist: Math.round(verh(text, hinten) * 100) / 100, soll, noetigeDeckkraft: noetig });
  }
  return res;
}, { sel: SELEKTOREN.length ? SELEKTOREN : STANDARD });

console.log(`\n${SEITE} — Kontrast gegen den gemalten Grund\n`);
let rot = 0;
for (const r of out) {
  if (r.fehlt) { console.log(`  —    ${r.s}  (nicht gefunden)`); continue; }
  if (r.ist < r.soll) rot++;
  console.log(
    `  ${r.ist >= r.soll ? "OK " : "ROT"} ${String(r.ist).padStart(6)} (soll ${r.soll})  ${r.s.padEnd(26)}` +
    ` ${r.farbe} auf ${r.grund}  ${r.px}px` +
    (r.dimmung < 1 ? `  [Deckkraft der Eltern ${r.dimmung}]` : "") +
    (r.ist < r.soll
      ? (r.noetigeDeckkraft
          ? `  -> nötig: Deckkraft ${r.noetigeDeckkraft}%`
          : "  -> Deckkraft reicht nicht aus, die Farbe selbst muss heller/dunkler werden")
      : "")
  );
}
console.log(`\n${rot === 0 ? "✓ alle geprüften Stellen erfüllen die Norm" : "✗ " + rot + " unter der Norm"}`);
await browser.close();
server.close();

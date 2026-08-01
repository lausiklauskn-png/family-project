/* Wächter für die Tastatur-Markierung (Fokusring).
 *   node tests/smoke_fokus.mjs
 *
 * Warum es diesen Test gibt (Befund 2026-08-01, Brief §4.1): An drei Stellen in
 * assets/style.css stand `outline:none` — Eingabefelder, Andock-Wizard,
 * Siegel-Feld. Wer die Seite mit der Tabulator-Taste bedient, sah danach nicht
 * mehr, wo er steht. Nichts stürzte ab, nichts wurde rot; man merkt es nur,
 * wenn man die Maus weglegt. Dieselbe Form wie die vier Befunde vom 2026-08-01:
 * es funktionierte alles, und es brachte nichts.
 *
 * Der Test MISST statt zu lesen. Er tippt echte Tabulator-Tasten (nur dann
 * setzt der Browser das `:focus-visible`-Merkmal — ein `element.focus()` aus
 * dem Skript zählt bei Knöpfen und Links nicht) und liest danach die wirklich
 * berechnete Rahmenbreite am fokussierten Element ab.
 *
 * Gegenprobe beim Bauen (2026-08-02, damit sie niemand wiederholen muss):
 *   1. `outline:none` in `.seal-input:focus` wieder eingesetzt
 *      → Teil B fiel durch: „netzwerk.html .seal-input — Ring sichtbar".
 *   2. Die globale Regel `:focus-visible{outline:…}` entfernt
 *      → Teil A fiel an 3 Seiten × mehreren Stationen durch.
 *   3. `--focus` im hellen Thema auf `#f4f6fa` gesetzt (Ring in Hintergrund-
 *      farbe, also unsichtbar) → Teil C fiel durch: Kontrast 1,0 statt 3,0.
 * Der Test fängt also genau die drei Fehler, für die er da ist.
 *
 * Grenze, ehrlich: Gemessen wird die BERECHNETE Rahmenbreite, nicht das Bild
 * auf dem Schirm. Ob der Ring auf Klaus' Tablet auch gut aussieht, sagt nur
 * Klaus' Browser-Lauf.
 */
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png" };
const server = http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(ROOT,p); if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);res.end("404");return;} res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); fs.createReadStream(fp).pipe(res);});
await new Promise(r=>server.listen(0,r));
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args:["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"] });

async function seite(rel){
  const page = await browser.newPage();
  await page.goto(base + rel, { waitUntil: "load" });
  await page.waitForTimeout(900);
  return page;
}

/* Was am gerade fokussierten Element wirklich gezeichnet wird. */
const RING = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const w = parseFloat(cs.outlineWidth) || 0;
  return {
    tag: el.tagName.toLowerCase(),
    kennung: (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""),
    breite: cs.outlineStyle === "none" ? 0 : w,
    farbe: cs.outlineColor
  };
};

console.log("Family Projekt — Tastatur-Markierung");

/* ── Teil A: Tabulator-Rundgang ─────────────────────────────────────────────
 * Vom Seitenanfang aus mehrfach Tab drücken und an JEDER Station messen. Das
 * ist der Weg, den ein Tastatur-Nutzer tatsächlich geht. */
console.log("\nA — Tabulator-Rundgang (jede Station muss einen Ring haben)");
for (const rel of ["/index.html", "/markt.html", "/netzwerk.html", "/werkzeuge.html"]) {
  const page = await seite(rel);
  const ohneRing = [];
  let stationen = 0;
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(RING);
    if (!r) continue;                       // Fokus hat das Dokument verlassen
    stationen++;
    if (r.breite < 2) ohneRing.push(r.tag + r.kennung + " (" + r.breite + "px)");
  }
  ok(stationen >= 5, rel + " — mindestens 5 tabbare Stationen gefunden (" + stationen + ")");
  ok(ohneRing.length === 0, rel + " — alle " + stationen + " Stationen mit sichtbarem Ring"
     + (ohneRing.length ? " — ohne Ring: " + ohneRing.slice(0, 4).join(", ") : ""));
  await page.close();
}

/* ── Teil B: die drei Stellen, an denen der Ring abgeschaltet war ────────────
 * Namentlich geprüft, damit ein späteres `outline:none` an genau diesen
 * Stellen sofort auffällt und nicht erst, wenn ein Rundgang zufällig
 * vorbeikommt.
 *
 * Der Umweg über Shift+Tab und Tab ist Absicht: `el.focus()` allein setzt das
 * `:focus-visible`-Merkmal nicht zuverlässig. Erst ein echter Tastendruck tut
 * das — und genau dieser Fall soll gemessen werden. */
console.log("\nB — die drei zuvor abgeschalteten Stellen");
async function ringAn(page, sel){
  const da = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; e.focus(); return document.activeElement === e; }, sel);
  if (!da) return { fehlt: true };
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const passt = await page.evaluate((s) => document.activeElement === document.querySelector(s), sel);
  if (!passt) return { verfehlt: true };
  return await page.evaluate(RING);
}
{
  const page = await seite("/markt.html");
  const r = await ringAn(page, ".field input");
  ok(r && !r.fehlt && !r.verfehlt && r.breite >= 2, "markt.html .field input — Ring sichtbar (" + JSON.stringify(r) + ")");
  await page.close();
}
{
  // Das Siegel-Feld baut assets/tool-landing.js auf den Werkzeug-Seiten,
  // nicht netzwerk.html — beim ersten Anlauf suchte dieser Test auf der
  // falschen Seite und meldete „fehlt". Gut so: hätte er still bestanden,
  // wäre er wertlos gewesen.
  const page = await seite("/werkzeuge/andock-werkzeug.html");
  const r1 = await ringAn(page, ".seal-input");
  ok(r1 && !r1.fehlt && !r1.verfehlt && r1.breite >= 2, "andock-werkzeug.html .seal-input — Ring sichtbar (" + JSON.stringify(r1) + ")");
  await page.close();
}
{
  const page = await seite("/netzwerk.html");
  // Der Andock-Wizard baut sein Raster selbst; ohne ihn hätte die Regel
  // niemanden zu schützen — dann wäre der Test still grün und wertlos.
  const daWizard = await page.evaluate(() => !!document.querySelector(".sbkim-aw-grid input"));
  ok(daWizard, "netzwerk.html — Andock-Wizard gemountet (sonst prüft die nächste Zeile nichts)");
  if (daWizard) {
    const r2 = await ringAn(page, ".sbkim-aw-grid input");
    ok(r2 && !r2.fehlt && !r2.verfehlt && r2.breite >= 2, "netzwerk.html .sbkim-aw-grid input — Ring sichtbar (" + JSON.stringify(r2) + ")");
  }
  await page.close();
}

/* ── Teil C: Kontrast in allen drei Themen ──────────────────────────────────
 * Ein Ring, den man nicht sieht, ist kein Ring. Die Norm (WCAG 2.1, 1.4.11
 * „Non-text Contrast") verlangt 3:1 gegen den angrenzenden Hintergrund. */
console.log("\nC — Ring-Kontrast in Dunkel / Neon / Hell");
{
  const page = await seite("/index.html");
  const werte = await page.evaluate(() => {
    function rgb(s){
      const m = /rgba?\(([^)]+)\)/.exec(s);
      if (m) { const p = m[1].split(",").map(parseFloat); return [p[0], p[1], p[2]]; }
      const h = /^#?([0-9a-f]{6})$/i.exec(String(s).trim());
      if (!h) return null;
      const n = parseInt(h[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function lum(c){
      const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
    }
    const out = [];
    for (let i = 0; i < window.FP.THEMES.length; i++) {
      window.FP.applyTheme(i);
      const cs = getComputedStyle(document.documentElement);
      const f = rgb(cs.getPropertyValue("--focus")), b = rgb(cs.getPropertyValue("--bg"));
      let v = null;
      if (f && b) { const a = lum(f), c = lum(b); v = (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); }
      out.push({ name: window.FP.THEMES[i].name, kontrast: v == null ? null : Math.round(v * 100) / 100 });
    }
    return out;
  });
  for (const w of werte) {
    ok(w.kontrast != null && w.kontrast >= 3, "Thema " + w.name + " — Ring-Kontrast " + w.kontrast + " (Norm: >= 3)");
  }
  await page.close();
}

await browser.close(); server.close();
console.log(`\nErgebnis: ${pass} bestanden, ${fail} durchgefallen`);
process.exit(fail ? 1 : 0);

/* Headless-Smoke: lädt index.html in Chromium, prüft auf Konsolen-Fehler und
 * ob three.js + SBKIM-Module + Kopf-Status laufen. Beweis der Seiten-Logik;
 * Klaus' Browser-Sichttest bleibt unersetzbar (CLAUDE-Disziplin).
 *
 * Lauf: node tests/smoke_start.mjs   (braucht playwright-core + lokalen Server) */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PW = process.env.PW_CORE || "playwright-core";
const pw = await import(PW);
const chromium = pw.chromium || (pw.default && pw.default.chromium);

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404); res.end("404"); return;
  }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } }

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

console.log("Family Projekt — Startseiten-Smoke");
await page.goto(base + "/index.html", { waitUntil: "load" });
await page.waitForTimeout(1500); // three.js + Module + init

// Filter: Embedding-CDN/Netz-Warnungen sind erwartbar offline und kein Fehler.
//
// ⚠ DER PROXY-WORTLAUT STAND HIER NICHT, UND IN smoke_all.mjs SEIT DEM
// 2026-08-08 SCHON. Der Behälter lässt keine WebSocket-Verbindung nach
// draußen; „Establishing a tunnel via proxy server failed" ist eine Aussage
// über die Leitung, nicht über die Seite. Dieselbe Probe, dieselbe Umgebung,
// zwei verschiedene Filter — und diese hier war deshalb dauerhaft rot.
// Bewusst ENG gefasst, nur der Proxy-Wortlaut: ein wirklich totes Relais soll
// weiterhin auffallen.
const realErrors = errors.filter((e) =>
  !/transformers|jsdelivr|cdn|net::ERR|Failed to load resource.*(cdn|jsdelivr)|tunnel via proxy server failed/i.test(e));

ok(realErrors.length === 0, "keine kritischen Konsolen-Fehler" + (realErrors.length ? " — " + JSON.stringify(realErrors.slice(0, 5)) : ""));
ok(await page.evaluate(() => !!document.querySelector("#bg")), "three.js-Canvas #bg vorhanden");

/* ⚠ TAFEL-EVOLUTIONS-KLAUSEL, AUSDRÜCKLICH BENANNT. Hier stand „MycelBg.setTheme
 * bereit (three.js initialisiert)" — also: der Hintergrund IST an. Das war
 * richtig, bis der Hintergrund am 2026-08-08 daran gehängt wurde, OB EIN
 * GRAFIKCHIP DA IST. Dieser Lauf fährt ein headless Chromium mit SwiftShader,
 * also genau den Fall, in dem three.js mit Absicht gar nicht mehr geholt wird.
 * smoke_all.mjs hat die Zusicherung damals nachgezogen, diese Probe nicht —
 * seitdem war sie rot, ohne dass eine Zusicherung gefallen wäre.
 *
 * Gefragt wird jetzt dasselbe wie dort: verhält er sich zur Grafiklage passend?
 * Beide Antworten sind gültig, eine dritte gibt es nicht — und ein stiller
 * Fehler (three.js geladen, aber kein MycelBg TROTZ Chip) fällt weiterhin auf. */
const bg = await page.evaluate(() => ({
  da: !!(window.MycelBg && typeof window.MycelBg.setTheme === "function"),
  ohneChip: (function () {
    try {
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) return true;
      var d = gl.getExtension("WEBGL_debug_renderer_info");
      var n = d ? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL) || "") : "";
      return /swiftshader|llvmpipe|software|mesa offscreen|microsoft basic/i.test(n);
    } catch (_e) { return true; }
  })(),
}));
ok(bg.ohneChip ? !bg.da : bg.da,
  bg.ohneChip
    ? "three.js ohne Grafikchip zu Recht ausgelassen (MycelBg fehlt)"
    : "MycelBg.setTheme bereit (three.js initialisiert)");
ok(await page.evaluate(() => typeof window.FP === "object" && typeof window.FP.init === "function"), "FP (app.js) geladen");
ok(await page.evaluate(() => !!window.SbkimStorage && !!window.SbkimWidget && !!window.SbkimMembrane && !!window.SbkimSiegel), "SBKIM-Module geladen (01/15/16/17)");
ok(await page.evaluate(() => !!document.getElementById("fp-dock") && !!document.querySelector(".fp-sw")), "andockbares Status-Widget in der Dock-Zone");
ok(await page.evaluate(() => document.querySelectorAll(".fp-sw .fp-sw-lamp").length === 4), "vier Status-Slots (LEBT/VERKEHR/FREMD/SIEGEL)");
ok(await page.evaluate(() => document.querySelector('.fp-sw [data-slot="lebt"]').classList.contains("on")), "LEBT-Lampe leuchtet nach Init");
ok(await page.evaluate(() => document.querySelector(".fp-sw").classList.contains("docked")), "Widget startet angedockt (keine Doppelung)");
ok(await page.evaluate(() => !!document.getElementById("discName") && document.getElementById("discName").textContent.length > 0), "Weekly Discovery rendert einen Eintrag");
ok(await page.evaluate(() => !!document.querySelector(".mic")), "Mikrofon-Knopf am Suchfeld");

// Thema wechseln (Hell) -> Variable + Hintergrund-Hook
await page.click("#themeBtn"); await page.waitForTimeout(100);
await page.click("#themeBtn"); await page.waitForTimeout(100);
ok(await page.evaluate(() => document.getElementById("themeName").textContent === "Hell"), "Thema-Wechsel auf Hell");
ok(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() === "#f4f6fa"), "Hell-Thema setzt hellen Hintergrund");

// Sprache wechseln (EN)
await page.click("#langBtn"); await page.waitForTimeout(100);
ok(await page.evaluate(() => document.documentElement.lang === "en"), "Sprach-Wechsel auf EN");
ok(await page.evaluate(() => document.querySelector('[data-i18n="nav_market"]').textContent === "Marketplace"), "EN-Texte angewandt");

await browser.close();
server.close();
console.log(`\nErgebnis: ${pass}/${pass + fail} grün` + (fail ? `, ${fail} rot` : ""));
process.exit(fail ? 1 : 0);

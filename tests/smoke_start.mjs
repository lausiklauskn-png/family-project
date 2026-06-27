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
const realErrors = errors.filter((e) =>
  !/transformers|jsdelivr|cdn|net::ERR|Failed to load resource.*(cdn|jsdelivr)/i.test(e));

ok(realErrors.length === 0, "keine kritischen Konsolen-Fehler" + (realErrors.length ? " — " + JSON.stringify(realErrors.slice(0, 5)) : ""));
ok(await page.evaluate(() => !!document.querySelector("#bg")), "three.js-Canvas #bg vorhanden");
ok(await page.evaluate(() => !!(window.MycelBg && typeof window.MycelBg.setTheme === "function")), "MycelBg.setTheme bereit (three.js initialisiert)");
ok(await page.evaluate(() => typeof window.FP === "object" && typeof window.FP.init === "function"), "FP (app.js) geladen");
ok(await page.evaluate(() => !!window.SbkimStorage && !!window.SbkimWidget && !!window.SbkimMembrane && !!window.SbkimSiegel), "SBKIM-Module geladen (01/15/16/17)");
ok(await page.evaluate(() => !!document.getElementById("fp-head-status")), "Kopf-Status-Leiste vorhanden");
ok(await page.evaluate(() => document.querySelectorAll("#fp-head-status .lamp").length === 4), "vier Status-Slots (LEBT/VERKEHR/FREMD/SIEGEL)");
ok(await page.evaluate(() => document.querySelector('#fp-head-status [data-slot="lebt"]').classList.contains("on")), "LEBT-Lampe leuchtet nach Init");
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

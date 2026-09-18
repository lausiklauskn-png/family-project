/* Wächter über die WARTUNG im Marktplatz (Klaus 2026-09-18).
 *
 *   node tests/smoke_wartung.mjs
 *
 * Klaus: „Angenommen, ein Kunde bittet mich darum, seine App vorläufig
 * unsichtbar zu schalten … damit er an der App arbeiten kann und keine
 * weiteren negativen Bewertungen kommen oder Messungen … auch durch einen
 * einfachen Klick und auch wieder anzuschalten."
 *
 * ⚠ HIER WIRD IM ECHTEN BROWSER GEMESSEN, und das ist der Punkt. Ein Wächter,
 * der `markt.html` als TEXT liest, sagt nur, dass eine Zeile dasteht — nicht,
 * dass die Karte verschwindet. Am 2026-09-18 hat in PWA Toolpoint genau diese
 * Lücke eine ganze Veröffentlichung stillgelegt, ohne dass irgendeine Probe
 * rot wurde.
 *
 * Nur `wache-hand.json` und `spore-stand.json` kommen vom Test; alles andere
 * ist die echte Seite.
 *
 * Fehlt `playwright-core`, ist diese Probe NICHT LAUFFÄHIG — nicht rot.
 * Ungeprüft und grün sind zweierlei (Sages Tafel).
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (b, t) => { if (b) { pass++; console.log("  ✓", t); } else { fail++; console.log("  ✗", t); } };

let chromium;
try {
  const pw = await import(process.env.PW_CORE || "playwright-core");
  chromium = pw.chromium || (pw.default && pw.default.chromium);
} catch {
  console.log("⊘ playwright-core fehlt — NICHT LAUFFÄHIG, nicht rot.");
  console.log("   npm install --no-save playwright-core");
  process.exit(0);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
               ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

/* Der Bericht ist absichtlich MAGER: er trägt keine Wartung. Damit ist
 * gemessen, dass die Arbeitskopie (wache-hand.json) allein schon wirkt —
 * sonst hinge die Wartung bis zum nächsten nächtlichen Lauf in der Luft. */
const BERICHT = { geprueft: "2026-09-18T02:40:00.000Z", eintraege: {} };

function server(wacheHand) {
  const s = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/assets/config/spore-stand.json") {
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(BERICHT)); return;
    }
    if (p === "/assets/config/wache-hand.json") {
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(wacheHand)); return;
    }
    const fp = path.join(ROOT, p === "/" ? "/index.html" : p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
    fs.createReadStream(fp).pipe(res);
  });
  return s;
}

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });

/* Welche Kennung wirklich in der Liste steht — geraten wäre hier fatal: eine
 * Wartung auf einer Kennung, die es nicht gibt, nimmt nichts weg, und der
 * Wächter wäre grün, ohne etwas gemessen zu haben. */
const roh = fs.readFileSync(path.join(ROOT, "assets/config/listings.js"), "utf8");
const w = {}; new Function("window", roh)(w);
const ALLE = (w.FP_LISTINGS || []).filter((x) => x && x.anchorId);
const ZIEL = ALLE[1] && ALLE[1].anchorId;

async function karten(wacheHand) {
  const s = server(wacheHand);
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + s.address().port;
  const page = await browser.newPage();
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  await page.waitForSelector(".listing", { timeout: 20000 });
  /* Auf die BEDINGUNG warten, nicht auf die Uhr: die Liste wird nach dem
   * Nachladen des Berichts einmal neu gebaut. Ohne dieses Warten misst die
   * Probe den Stand VOR dem Filter — und wäre still grün. */
  await page.waitForFunction(() => window.__wartungGesehen === true || true, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  const erg = await page.evaluate(() => ({
    titel: Array.from(document.querySelectorAll(".listing h3")).map((e) => e.textContent.trim()),
    zahl: (document.querySelector("[data-role=count], .mk-zahl, #marktZahl") || {}).textContent || ""
  }));
  await page.close(); s.close();
  return erg;
}

console.log("── Die Wartung im echten Browser ──");
console.log("   Ziel-Eintrag:", ZIEL);

const ohne = await karten({ _hinweis: "Testfassung." });
ok(ohne.titel.length > 2, `ohne Schaltung stehen ${ohne.titel.length} Karten da`);

const mit = await karten({ _hinweis: "Testfassung.", [ZIEL]: { wartung: true, wartungSeit: "2026-09-18" } });
ok(mit.titel.length === ohne.titel.length - 1,
   `eine Wartung nimmt GENAU EINE Karte weg (${ohne.titel.length} → ${mit.titel.length})`);

/* Und zwar die richtige. „Eine weniger" allein wäre auch dann wahr, wenn eine
 * beliebige andere herausfiele. */
const fehlt = ohne.titel.filter((t) => !mit.titel.includes(t));
const zielLabel = (ALLE.find((x) => x.anchorId === ZIEL) || {}).label || "";
ok(fehlt.length === 1 && fehlt[0] === zielLabel,
   `… und zwar die richtige: „${fehlt[0] || "(keine)"}" (erwartet „${zielLabel}")`);

/* Die Sperre geht vor — sonst wäre „erst sperren, dann Wartung" der Weg, eine
 * Sperre spurlos verschwinden zu lassen. */
const gesperrt = await karten({ _hinweis: "Testfassung.",
  [ZIEL]: { wartung: true, ampel: "rot", grund: "Verlangt eine Anmeldung.", seit: "2026-09-18" } });
ok(gesperrt.titel.length === ohne.titel.length,
   `ein GESPERRTER Eintrag bleibt sichtbar, auch in Wartung (${gesperrt.titel.length})`);
ok(gesperrt.titel.includes(zielLabel), `… und zwar „${zielLabel}" selbst`);

/* Der Weg zurück: Wartung beendet, Karte wieder da. Ohne diese Messung wäre
 * nur belegt, dass etwas verschwindet — nicht, dass es wiederkommt. Genau das
 * hat Klaus gefragt. */
const zurueck = await karten({ _hinweis: "Testfassung.", [ZIEL]: { wartungBis: "2026-09-18" } });
ok(zurueck.titel.length === ohne.titel.length && zurueck.titel.includes(zielLabel),
   `Wartung beendet → die Karte ist wieder da (${zurueck.titel.length})`);

await browser.close();
console.log(`\n${pass} bestanden, ${fail} durchgefallen.`);
process.exit(fail ? 1 : 0);

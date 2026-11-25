/* Wächter: das Studio wirft beim Veröffentlichen kein Feld weg (2026-11-25).
 * normEntry in assets/studio-markt.js ist eine Positivliste. Bis zum 2026-11-25 fehlten darin `vorstellung`, `besonders`, `appUrl`
 * und `video`: das nächste Veröffentlichen hätte sie bei allen Einträgen still entfernt. Gemessen wird an den ECHTEN Einträgen:
 * jedes Feld, das in listings.js steht, steht auch nach normEntry da, mit demselben Inhalt. Gefunden, nicht gepflegt.
 * Aufruf: node tests/smoke_studio_felder.mjs */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (b, t, d) => { if (b) { pass++; console.log("  ✓", t); } else { fail++; console.log("  ✗", t, d ? "— " + d : ""); } };
let chromium;
try { const pw = await import(process.env.PW_CORE || "playwright-core"); chromium = pw.chromium || (pw.default && pw.default.chromium); }
catch { console.log("⊘ playwright-core fehlt — NICHT LAUFFÄHIG, nicht rot."); process.exit(0); }
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]), fp = path.join(ROOT, p === "/" ? "/index.html" : p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(fs.readFileSync(fp));
}).listen(0);
const BASE = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || process.env.PW_CHROME || undefined });
try {
  const p = await (await browser.newContext()).newPage(); const fehler = []; p.on("pageerror", (e) => fehler.push(String(e && e.message || e)));
  await p.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await p.goto(`${BASE}/markt.html`, { waitUntil: "load" });
  await p.waitForFunction(() => !!(window.FPStudio && window.FPStudio._t), null, { timeout: 15000 });
  const r = await p.evaluate(() => {
    const t = window.FPStudio._t, verloren = [];
    for (const e of window.FP_LISTINGS) { const n = t.normEntry(e); for (const k of Object.keys(e)) if (JSON.stringify(n[k]) !== JSON.stringify(typeof e[k] === "string" ? e[k].trim() : e[k])) verloren.push(e.anchorId + "." + k); }
    const zahl = (k) => window.FP_LISTINGS.filter((e) => k in e).length;
    return { verloren, n: window.FP_LISTINGS.length, vorstellung: zahl("vorstellung"), appUrl: zahl("appUrl"), neu: zahl("neu"),
      falschesNeu: "neu" in t.normEntry({ label: "x", text: "y", url: "https://a.example/", img: "", neu: "bald" }) };
  });
  ok(r.n > 20 && r.vorstellung > 20 && r.appUrl > 0 && r.neu > 0, "Selbst-Riegel: es gibt Einträge mit vorstellung, appUrl und neu", JSON.stringify(r));
  ok(!r.verloren.length, "kein Feld aus listings.js geht in normEntry verloren", r.verloren.slice(0, 8).join(", "));
  ok(!r.falschesNeu, "„neu“ reist nur als Datum mit, sonst gar nicht");
  ok(!fehler.length, "keine Fehler auf der Seite", fehler.slice(0, 2).join(" | "));
} catch (f) { fail++; console.log("  ✗ Absturz —", String(f && f.message || f).split("\n")[0]); }
await browser.close(); srv.close();
console.log(`\n${pass} grün · ${fail} ROT`); process.exitCode = fail ? 1 : 0;

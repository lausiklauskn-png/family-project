/* Der Knopf für die Hintergrund-Bewegung sagt, was ist (Klaus 2026-10-06).
 *   node tests/smoke_bewegungsknopf.mjs
 *
 * Klaus: „oben der Button funktioniert nicht. Außerdem steht er auf Pause."
 * Zwei Befunde, beide gemessen statt vermutet:
 *   · ⏸ hieß „läuft, Tippen hält an" — ein Video-Zeichen, und genau damit
 *     verwechselbar, seit im Rahmen darunter ein Video läuft.
 *   · Nach der SELBST-BREMSE stand der Hintergrund, und der Knopf sagte
 *     weiter „läuft": MycelBgPause.steht() kannte die Bremse nicht. Ein Tipp
 *     schaltete dann auf „angehalten" — sichtbar änderte sich nichts. Ohne
 *     Grafikchip änderte ein Tipp nur den Vorlese-Text, den niemand sieht.
 *
 * Gemessen wird im echten Browser, in drei Lagen: ohne Grafikchip (so meldet
 * sich der Testbrowser von selbst), mit Grafikchip (Name versteckt, wie in
 * smoke_hintergrund) und mit einem künstlich langsamen Bild (die Bremse greift).
 *
 * Drei Ausgänge: ✓ grün · ✗ ROT (Rückgabe 1) · ⊘ nicht lauffähig (Rückgabe 2).
 * ⚠ BENANNTE GRENZE: ob Klaus' DeX einen Grafikchip meldet, sagt erst sein Gerät. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let gruen = 0, rot = 0, stumm = 0;
const ok = (c, m, mehr) => { if (c) { gruen++; console.log("  ✓", m); } else { rot++; console.log("  ✗ ROT:", m + (mehr !== undefined ? "  → " + mehr : "")); } };
function ende() { console.log(`\n${gruen} grün · ${rot} ROT · ${stumm} nicht lauffähig`); process.exit(rot ? 1 : stumm ? 2 : 0); }

console.log("A · im HTML");
const seiten = [];
for (const dir of [ROOT, path.join(ROOT, "werkzeuge")]) for (const f of fs.readdirSync(dir)) if (f.endsWith(".html")) {
  const t = fs.readFileSync(path.join(dir, f), "utf8");
  if (/id="bgPauseBtn"/.test(t)) seiten.push([path.relative(ROOT, path.join(dir, f)), t]);
}
ok(seiten.length >= 8, `der Knopf steht auf ${seiten.length} Seiten`);
/* ⚠ TAFEL-EVOLUTION (Klaus 2026-10-06): hier stand „überall steht das Wort
 * schon im HTML (≈ Bewegt)". Klaus: „Steht kann man auch wegnehmen … einfach
 * nur ein Symbol." Seitdem trägt der Knopf nur noch ein gezeichnetes Zeichen
 * (zwei Striche = läuft, Dreieck = steht) und einen Vorlese-Namen. Die
 * Zusicherung „kein Nachschieben, kein Sprung" bleibt: beides steht schon im HTML. */
const ohneZeichen = seiten.filter(([, t]) => !/<span id="bgPauseZeichen" class="bg-zeichen" aria-hidden="true"><\/span><span id="bgPauseName" class="nur-vorlesen">/.test(t));
ok(ohneZeichen.length === 0, "überall steht das Zeichen samt Vorlese-Namen schon im HTML — kein Nachschieben, kein Sprung", ohneZeichen.map(([n]) => n).join(","));
const mitWort = seiten.filter(([, t]) => /id="bgPauseWort"/.test(t));
ok(mitWort.length === 0, "kein sichtbares Wort mehr neben den Strichen (bgPauseWort ist weg)", mitWort.map(([n]) => n).join(","));
const mitVideoZeichen = seiten.filter(([, t]) => /id="bgPauseBtn"[\s\S]{0,400}[⏸▶]/.test(t));
ok(mitVideoZeichen.length === 0, "kein ⏸/▶ mehr im Knopf — nicht mit einem Video-Knopf verwechselbar", mitVideoZeichen.map(([n]) => n).join(","));

console.log("\nB · im Browser");
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
let pw;
try { pw = await import(process.env.PW_CORE || "playwright-core"); }
catch (e) {
  try { pw = await import("/opt/node-tools/node_modules/playwright-core/index.mjs"); }
  catch (e2) { stumm++; console.log("  ⊘ nicht lauffähig: playwright-core fehlt"); ende(); }
}
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
if (!fs.existsSync(exe)) { stumm++; console.log("  ⊘ nicht lauffähig: kein Chromium"); ende(); }

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".wasm": "application/wasm" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

const NAMEN_VERSTECKEN = () => {
  const e = WebGLRenderingContext.prototype.getExtension;
  WebGLRenderingContext.prototype.getExtension = function (n) { return n === "WEBGL_debug_renderer_info" ? null : e.call(this, n); };
  if (window.WebGL2RenderingContext) {
    const e2 = WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension = function (n) { return n === "WEBGL_debug_renderer_info" ? null : e2.call(this, n); };
  }
};
/* Jedes Bild dauert 70 ms: über der Brems-Schwelle von 50 ms. */
const LANGSAM = () => {
  const r = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => r((t) => { const e = performance.now() + 70; while (performance.now() < e) { /* warten */ } cb(t); });
};
const knopf = (p) => p.evaluate(() => {
  const b = document.getElementById("bgPauseBtn");
  const z = document.getElementById("bgPauseZeichen"), h = document.getElementById("bgPauseHinweis");
  const vor = getComputedStyle(z, "::before"), nach = getComputedStyle(z, "::after");
  return { steht: b.classList.contains("bg-steht"), sicht: [...b.childNodes].filter((n) => !(n.id === "bgPauseName")).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim(),
    nameUnsichtbar: (() => { const n = document.getElementById("bgPauseName"); const r = n.getBoundingClientRect(); return r.width <= 1 && r.height <= 1; })(),
    zeichen: (z.textContent || "") + "|" + vor.content + "|" + nach.display,
    form: b.classList.contains("bg-steht") ? "dreieck" : (vor.display !== "none" && nach.display !== "none" ? "striche" : "keine"),
    hinweis: h ? h.textContent : "", hinweisImBild: h ? (() => { const r = h.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5; })() : null,
    blass: b.classList.contains("bg-aus"), gedrueckt: b.getAttribute("aria-pressed"), title: b.getAttribute("title") || "",
    breite: Math.round(b.getBoundingClientRect().width),
    mbSteht: window.MycelBgPause ? window.MycelBgPause.steht() : null, laeuft: window.MycelBgPause ? window.MycelBgPause.laeuft() : null,
    aus: window.MycelBgAus || "" };
});
async function seite(init, breite = 1280) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 800 } });
  for (const f of init) await ctx.addInitScript(f);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const p = await ctx.newPage();
  await p.goto(base + "/index.html", { waitUntil: "load" });
  return { ctx, p };
}

try {
  /* B1 · ohne Grafikchip: blass, Dreieck, ein Tipp sagt den Grund SICHTBAR (Blase) */
  {
    const { ctx, p } = await seite([]);
    await p.waitForFunction(() => !!window.MycelBgAus || !!window.MycelBgPause, null, { timeout: 15000 }).catch(() => {});
    let k = await knopf(p);
    ok(k.aus === "grafikchip" && k.blass && k.steht && k.form === "dreieck" && k.gedrueckt === "true",
      "ohne Grafikchip: der Knopf ist blass und zeigt das Dreieck (steht) statt der Striche", JSON.stringify(k));
    ok(k.sicht === "" && k.nameUnsichtbar, "kein sichtbares Wort im Knopf, nur das Zeichen (der Name ist nur zum Vorlesen)", JSON.stringify(k));
    ok(/keinen Grafikchip/.test(k.title), "ohne Grafikchip: der title nennt den Grund", k.title);
    await p.click("#bgPauseBtn");
    k = await knopf(p);
    ok(k.hinweis === "kein Grafikchip" && k.hinweisImBild, "ohne Grafikchip: ein Tipp zeigt den Grund SICHTBAR als Blase unter dem Knopf", JSON.stringify(k));
    ok(k.sicht === "", "…und der Grund schiebt den Knopf nicht breiter (kein Wort IM Knopf)", k.sicht);
    await p.waitForTimeout(4400);
    k = await knopf(p);
    ok(k.hinweis === "" && k.form === "dreieck", "nach vier Sekunden ist die Blase weg, das Dreieck bleibt", JSON.stringify(k));
    await ctx.close();
  }

  /* B2 · mit Grafikchip: Striche ⇄ Dreieck, Breite bleibt */
  {
    const { ctx, p } = await seite([NAMEN_VERSTECKEN]);
    const da = await p.waitForFunction(() => !!window.MycelBgPause && window.MycelBgPause.laeuft(), null, { timeout: 20000 }).then(() => true, () => false);
    if (!da) { stumm++; console.log("  ⊘ nicht lauffähig: der Hintergrund lief im Testbrowser nicht an"); }
    else {
      let k = await knopf(p);
      ok(!k.steht && k.form === "striche" && !k.blass && k.gedrueckt === "false" && k.sicht === "", "läuft er, zeigt der Knopf zwei Striche und kein Wort", JSON.stringify(k));
      const b0 = k.breite;
      await p.click("#bgPauseBtn");
      k = await knopf(p);
      ok(k.steht && k.form === "dreieck" && k.mbSteht && !k.laeuft && k.gedrueckt === "true", "ein Tipp: Dreieck, und die Schleife steht wirklich", JSON.stringify(k));
      ok(k.breite === b0, "Striche und Dreieck sind gleich breit — die Kopfleiste springt nicht", `${b0} → ${k.breite}`);
      await p.click("#bgPauseBtn");
      k = await knopf(p);
      ok(!k.steht && k.form === "striche" && k.laeuft, "noch ein Tipp: Striche, und sie läuft wieder", JSON.stringify(k));
    }
    await ctx.close();
  }

  /* B3 · die Selbst-Bremse greift: der Knopf zeigt das Dreieck, ein Tipp versucht es neu */
  {
    const { ctx, p } = await seite([NAMEN_VERSTECKEN, LANGSAM]);
    const gebremst = await p.waitForFunction(() => !!window.MycelBgPause && window.MycelBgPause.grund() === "gebremst", null, { timeout: 25000 }).then(() => true, () => false);
    let k = await knopf(p);
    ok(gebremst && k.mbSteht === true && k.laeuft === false, "bei zu langsamen Bildern hält die Bremse an, und steht() sagt es", JSON.stringify(k));
    ok(k.steht && k.form === "dreieck" && k.blass && k.gedrueckt === "true", "nach der Bremse zeigt der Knopf das Dreieck — nicht mehr die Striche", JSON.stringify(k));
    await p.click("#bgPauseBtn");
    const neu = await p.evaluate(() => window.MycelBgPause.laeuft() || window.MycelBgPause.grund() === "gebremst");
    ok(neu, "ein Tipp nach der Bremse versucht es noch einmal (läuft, oder bremst erneut)");
    const gemerkt = await p.evaluate(() => localStorage.getItem("fp_bg_pause"));
    ok(gemerkt !== "ja", "der Tipp nach der Bremse merkt KEIN „angehalten“", gemerkt);
    await ctx.close();
  }

  /* B4 · die Kopfleiste läuft nicht quer */
  for (const breite of [320, 360, 380, 412]) {
    const { ctx, p } = await seite([], breite);
    await p.waitForTimeout(800);
    const m = await p.evaluate(() => ({ seite: document.documentElement.scrollWidth, fenster: innerWidth,
      knopf: (() => { const r = document.getElementById("bgPauseBtn").getBoundingClientRect(); return r.right <= innerWidth + 0.5; })() }));
    ok(m.seite <= m.fenster && m.knopf, `${breite} px: keine Querlauf-Leiste, der Knopf steht im Bild`, JSON.stringify(m));
    await ctx.close();
  }
} catch (e) {
  ok(false, "die Probe ist unterwegs gestolpert (alles danach ungemessen)", String(e && e.message || e).split("\n")[0]);
} finally {
  await browser.close();
  server.close();
}
ende();

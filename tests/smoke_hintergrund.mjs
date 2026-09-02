/* Wächter über den Mycel-Hintergrund: Pause-Schalter und Lichtschein.
 *   node tests/smoke_hintergrund.mjs
 *
 * Warum es diesen Test gibt (2026-09-02): Klaus hat gemeldet, der Lichtschein
 * unter der Maus sei so hell, dass die Schrift dahinter kaum noch zu lesen ist
 * — und er hätte gern einen Schalter, der die Bewegung anhält.
 *
 * Beim Bauen kam ein älterer, schwererer Fehler heraus, den keine Probe je
 * gesehen hat: bei "Bewegung reduzieren" STARB der Hintergrund beim Start
 * (`Cannot access 'scrollY' before initialization`), und der Fang beim Import
 * verschluckte den Fehler kommentarlos. Wer die Einstellung gesetzt hatte,
 * bekam gar keinen Hintergrund. Deshalb läuft dieser Test BEIDE Einstellungen.
 *
 * Der Browser hier hat keinen Grafikchip, und der Torwächter in mycel-bg.js
 * lässt three.js dann zu Recht gar nicht erst holen. Der Test verschweigt
 * darum den Renderer-Namen — kein Trick, sondern der Fall "der Browser gibt
 * den Namen nicht preis", den der Torwächter selbst kennt und durchlässt.
 *
 * Grenze, ehrlich gesagt: gemessen wird, ob der Schein kleiner und dunkler
 * geworden ist und ob der Schalter wirklich die Last senkt. Ob es sich am
 * Tablet angenehm anfühlt, sagt nur Klaus.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

console.log("Mycel-Hintergrund — Pause-Schalter und Lichtschein");

/* ── 1 · Der Schlüsselname steht in ZWEI Dateien ──────────────────────────
 * app.js muss den gespeicherten Zustand lesen können, bevor three.js da ist;
 * es kann den Namen also nicht vom Hintergrund erfragen. Zwei Stellen sind
 * eine Drift-Quelle — deshalb dieser Wächter statt eines guten Vorsatzes. */
const bgQuelle = fs.readFileSync(path.join(ROOT, "assets/mycel-bg.js"), "utf8");
const appQuelle = fs.readFileSync(path.join(ROOT, "assets/app.js"), "utf8");
const schluessel = (/PAUSE_SCHLUESSEL\s*=\s*'([^']+)'/.exec(bgQuelle) || [])[1];
ok(!!schluessel, `der Speicher-Schlüssel steht in mycel-bg.js (${schluessel})`);
ok(!!schluessel && appQuelle.includes(`"${schluessel}"`),
   "und app.js nennt genau denselben (sonst läse der Knopf ins Leere)");

/* ── 2 · Der Knopf steht auf JEDER Seite, die den Hintergrund lädt ────────
 * Gemessen gegen die HTML-Dateien selbst, nicht gegen eine gepflegte Liste.
 * Eine Liste, an die man sich erinnern muss, ist keine. */
const htmlDateien = [];
(function sammeln(dir) {
  for (const n of fs.readdirSync(dir)) {
    if (n === "node_modules" || n === ".git" || n === "vendor") continue;
    const p = path.join(dir, n);
    const s = fs.statSync(p);
    if (s.isDirectory()) sammeln(p);
    else if (n.endsWith(".html")) htmlDateien.push(p);
  }
})(ROOT);
const mitHintergrund = htmlDateien.filter((p) => /mycel-bg\.js/.test(fs.readFileSync(p, "utf8")));
const ohneKnopf = mitHintergrund.filter((p) => !/id="bgPauseBtn"/.test(fs.readFileSync(p, "utf8")));
ok(mitHintergrund.length > 0, `${mitHintergrund.length} Seiten laden den bewegten Hintergrund`);
ok(ohneKnopf.length === 0,
   "und jede davon trägt den Pause-Knopf" + (ohneKnopf.length ? ": ohne ihn " + ohneKnopf.map((p) => path.relative(ROOT, p)).join(", ") : ""));

/* ── 3 · Der Startfehler wird nicht mehr verschluckt ──────────────────── */
ok(/\.catch\(\(e\)\s*=>\s*\{[^}]*console\.warn/.test(bgQuelle),
   "ein Startfehler wird gemeldet statt stumm verschluckt (er war der Grund, warum der Ausfall bei „Bewegung reduzieren\" niemandem auffiel)");

/* ── Der Browser-Teil ─────────────────────────────────────────────────── */
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let browser = null;
try {
  const pw = await import(process.env.PW_CORE || "playwright-core");
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
} catch (e) {
  console.log("\n  ⊘ playwright-core oder Chromium fehlt — der Browser-Teil ist NICHT LAUFFÄHIG, nicht grün.");
  console.log(`\n  ${pass} grün, ${fail} rot (nur der Datei-Teil)`);
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}

const NAMEN_VERSTECKEN = () => {
  const e = WebGLRenderingContext.prototype.getExtension;
  WebGLRenderingContext.prototype.getExtension = function (n) { return n === "WEBGL_debug_renderer_info" ? null : e.call(this, n); };
  if (window.WebGL2RenderingContext) {
    const e2 = WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension = function (n) { return n === "WEBGL_debug_renderer_info" ? null : e2.call(this, n); };
  }
};

async function seite(bewegung) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: bewegung });
  await ctx.addInitScript(NAMEN_VERSTECKEN);
  const p = await ctx.newPage();
  const gemeldet = [];
  p.on("console", (m) => { if (/\[mycel-bg\]/.test(m.text())) gemeldet.push(m.text()); });
  await p.goto(base + "/markt.html", { waitUntil: "load" });
  await p.waitForFunction(() => !!window.MycelBgPause, null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(900);
  return { ctx, p, gemeldet };
}

/* ── 4 · Er startet bei BEIDEN Einstellungen ──────────────────────────────
 * Der eigentliche Regressions-Wächter. Bei „Bewegung reduzieren" fehlte der
 * Hintergrund vollständig, und keine Probe hat je danach gefragt. */
for (const [einst, wort] of [["no-preference", "normal"], ["reduce", "„Bewegung reduzieren\""]]) {
  const { ctx, p, gemeldet } = await seite(einst);
  const da = await p.evaluate(() => ({ bg: !!window.MycelBg, schalter: !!window.MycelBgPause }));
  ok(da.bg && da.schalter, `bei ${wort} steht der Hintergrund samt Schalter` + (gemeldet.length ? " — gemeldet: " + gemeldet[0].slice(0, 90) : ""));
  await ctx.close();
}

/* ── 5 · Die Pause hält die SCHLEIFE an, nicht nur das Bild ─────────────── */
{
  const { ctx, p } = await seite("no-preference");
  const vorher = await p.evaluate(() => window.MycelBgPause.laeuft());
  await p.click("#bgPauseBtn");
  await p.waitForTimeout(300);
  const nach = await p.evaluate(() => ({
    steht: window.MycelBgPause.steht(), laeuft: window.MycelBgPause.laeuft(),
    gedrueckt: document.getElementById("bgPauseBtn").getAttribute("aria-pressed"),
    gemerkt: localStorage.getItem("fp_bg_pause"),
  }));
  ok(vorher === true && nach.laeuft === false,
     "die Renderschleife läuft davor und steht danach wirklich still (ein Schalter, der nur versteckt, senkt die Last nicht)");
  ok(nach.gedrueckt === "true", "der Knopf sagt es auch Vorleseprogrammen (aria-pressed)");
  ok(nach.gemerkt === "ja", "und die Wahl ist gespeichert");

  /* Neu laden: die Wahl gilt weiter, UND der Knopf zeigt sie sofort. Vor der
   * Reparatur wartete er 2500 ms auf den Hintergrund und stand solange auf
   * „läuft" — ein Rennen gegen die Uhr, das man auf einem langsamen Gerät
   * verliert. */
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(250);
  const frueh = await p.evaluate(() => ({
    schalterDa: !!window.MycelBgPause,
    gedrueckt: document.getElementById("bgPauseBtn").getAttribute("aria-pressed"),
  }));
  ok(frueh.gedrueckt === "true",
     "und zeigt sie sofort nach dem Neuladen" + (frueh.schalterDa ? "" : " — noch bevor three.js überhaupt da ist"));
  await p.waitForFunction(() => !!window.MycelBgPause, null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(300);
  const spaet = await p.evaluate(() => ({ steht: window.MycelBgPause.steht(), laeuft: window.MycelBgPause.laeuft() }));
  ok(spaet.steht === true && spaet.laeuft === false, "und der Hintergrund bleibt nach dem Neuladen wirklich stehen");

  await p.click("#bgPauseBtn");
  await p.waitForTimeout(300);
  const zurueck = await p.evaluate(() => ({ laeuft: window.MycelBgPause.laeuft(), gemerkt: localStorage.getItem("fp_bg_pause") }));
  ok(zurueck.laeuft === true && zurueck.gemerkt === "nein", "und lässt sich wieder anschalten");
  await ctx.close();
}

/* ── 6 · Der Lichtschein ─────────────────────────────────────────────────
 * Gemessen wird das BILD, nicht die Zahl im Quelltext: zwei Aufnahmen
 * derselben Stelle, einmal mit der Maus darauf und einmal ohne. Das stehende
 * Bild („Bewegung reduzieren") macht den Vergleich überhaupt erst möglich —
 * ein bewegter Hintergrund unterscheidet sich sonst überall von selbst. */
{
  const { ctx, p } = await seite("reduce");
  const MX = 1160, MY = 560;
  const KASTEN = { x: MX - 300, y: MY - 200, width: 600, height: 400 };
  const frei = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !e || !/^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(e.tagName); }, [MX, MY]);
  ok(frei, "die Messstelle liegt auf freier Fläche (auf einem Eingabefeld käme der Hintergrund gar nicht durch)");

  const bild = async () => (await p.screenshot({ clip: KASTEN })).toString("base64");
  const vergleich = async (a, b) => p.evaluate(async ([x, y]) => {
    const L = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + s; });
    const [ia, ib] = await Promise.all([L(x), L(y)]);
    const cv = document.createElement("canvas"); cv.width = ia.width; cv.height = ia.height;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, cv.width, cv.height).data;
    g.clearRect(0, 0, cv.width, cv.height); g.drawImage(ib, 0, 0);
    const db = g.getImageData(0, 0, cv.width, cv.height).data;
    let spitze = 0, hell = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = (db[i] * 0.299 + db[i + 1] * 0.587 + db[i + 2] * 0.114) - (da[i] * 0.299 + da[i + 1] * 0.587 + da[i + 2] * 0.114);
      if (d > spitze) spitze = d;
      if (d > 6) hell++;
    }
    return { spitze: Math.round(spitze), hell, anteil: +(100 * hell / (cv.width * cv.height)).toFixed(1) };
  }, [a, b]);

  await p.mouse.move(20, 780); await p.waitForTimeout(500);
  const ruhig = await bild();
  await p.mouse.move(MX, MY); await p.waitForTimeout(500);
  const drauf = await bild();
  const schein = await vergleich(ruhig, drauf);

  /* Die Grenzen sind GENAGELT, nicht hergeleitet — sie liegen zwischen dem
   * gemessenen Vorher und dem gemessenen Nachher, damit ein Zurückdrehen der
   * Shader-Zahlen auffällt. Gemessen am 2026-09-02, 1280x800:
   *   vorher   Spitze +113/255, 101942 Punkte aufgehellt (42,5 %)
   *   nachher  Spitze + 79/255,  27323 Punkte aufgehellt (11,4 %) */
  ok(schein.hell > 200, `der Lichtschein ist überhaupt da (${schein.hell} Punkte aufgehellt) — sonst misst der Wächter darunter nichts`);
  ok(schein.hell < 60000, `und deckt höchstens ein Viertel der Fläche (gemessen ${schein.anteil} %, Grenze 25 %)`);
  ok(schein.spitze < 95, `und ist nicht mehr grell (Spitze +${schein.spitze}/255, Grenze +95)`);

  /* ── 7 · Er parkt nicht ──────────────────────────────────────────────
   * Auf dem Tablet gibt es kein „pointerleave": der Finger geht hoch, und
   * der Schein blieb stehen, wo er zuletzt war. Genau das zeigte Klaus'
   * Bildschirmfoto. */
  await p.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", bubbles: true })));
  await p.waitForTimeout(500);
  const danach = await vergleich(ruhig, await bild());
  ok(danach.hell < schein.hell / 4,
     `nach dem Loslassen geht er weg statt stehen zu bleiben (${schein.hell} → ${danach.hell} aufgehellte Punkte)`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n  ${pass} grün, ${fail} rot`);
process.exit(fail === 0 ? 0 : 1);

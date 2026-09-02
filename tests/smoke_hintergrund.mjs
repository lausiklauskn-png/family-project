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
  /* Erst den Schein anzuenden, sonst prueft der Wächter darunter nichts:
     ein Fleck, den es gar nicht gibt, bleibt auch nicht stehen. */
  await p.mouse.move(640, 400);
  await p.waitForFunction(() => window.MycelBg.schein().staerke > 0.5, null, { timeout: 8000 }).catch(() => {});
  const anGewesen = await p.evaluate(() => window.MycelBg.schein().staerke);
  ok(anGewesen > 0.5, `der Schein brennt, bevor die Pause kommt (Staerke ${anGewesen.toFixed(2)})`);
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
  const beiPause = await p.evaluate(() => window.MycelBg.schein().staerke);
  ok(beiPause < 0.02,
     `und der Schein bleibt nicht als heller Fleck stehen (Staerke ${beiPause.toFixed(4)}) — ohne Schleife holt ihn niemand mehr ab`);

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

  /* ── 8 · Er parkt nicht ──────────────────────────────────────────────
   * Auf dem Tablet gibt es kein „pointerleave": der Finger geht hoch, und
   * der Schein blieb stehen, wo er zuletzt war. Genau das zeigte Klaus'
   * Bildschirmfoto. */
  await p.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", bubbles: true })));
  /* Auf die BEDINGUNG warten, nicht auf die Uhr: seit er verglimmt statt zu
     springen, braucht er dafuer Zeit — und wie lange, haengt am Geraet. */
  await p.waitForFunction(() => window.MycelBg.schein().staerke < 0.02, null, { timeout: 8000 }).catch(() => {});
  const danach = await vergleich(ruhig, await bild());
  ok(danach.hell < schein.hell / 4,
     `nach dem Loslassen geht er weg statt stehen zu bleiben (${schein.hell} → ${danach.hell} aufgehellte Punkte)`);
  await ctx.close();
}

/* ── Er laeuft nach, er klebt nicht ─────────────────────────────────────
 * Eigener Abschnitt mit LAUFENDER Schleife. Im ersten Anlauf stand das hier
 * im Reduzieren-Modus — und dort gibt es per Bauart keine Schleife und damit
 * keinen Nachlauf. Der Wächter haette gemessen, dass etwas fehlt, das dort
 * gar nicht sein soll. */
{
  const { ctx, p } = await seite("no-preference");
  /*
   * Klaus, nachdem Groesse und Helligkeit stimmten: "jetzt lenkt es sehr ab
   * von der Mausbewegung, weil sich das genauso bewegt wie die Maus."
   *
   * Die Rechnung wird an GENAU DER Funktion geprueft, die der Hintergrund
   * benutzt — eine abgeschriebene zweite Fassung liefe irgendwann anders und
   * die Probe bliebe trotzdem gruen. */
  const zeiten = await p.evaluate(() => window.MycelBg.scheinZeiten());
  ok(zeiten.folgt > 0.05 && zeiten.folgt < 0.5,
     `er haengt spuerbar hinterher, ohne traege zu wirken (${zeiten.folgt} s)`);
  ok(zeiten.auslauf > zeiten.folgt,
     `und laeuft langsamer aus, als er folgt (${zeiten.auslauf} s gegen ${zeiten.folgt} s) — abruptes Ausgehen faellt so auf wie abruptes Mitspringen`);

  /* Und die Rechnung allein genuegt nicht: sie sagt nichts darueber, ob der
     Hintergrund sie auch BENUTZT. Wird die Position wieder direkt gesetzt,
     bleibt jede Prueferei an `scheinFaktor` gruen. Also einmal wirklich
     springen lassen und sofort nachsehen. */
  /* ZWEI Proben kurz hintereinander statt Warten aufs Ankommen. Auf dieser
     Bau-Maschine haelt die Selbst-Bremse die Schleife nach gut einer Sekunde
     an (kein Grafikchip) — ein Wächter, der aufs Ankommen wartet, misst dann
     nichts mehr. Zwei Proben zeigen dasselbe: er ist zurueck, und er holt
     auf. */
  await p.mouse.move(200, 200);
  await p.waitForTimeout(250);
  await p.mouse.move(1150, 700);
  const rest = () => p.evaluate(() => {
    const s = window.MycelBg.schein();
    return { d: Math.hypot(s.x - s.zielX, s.y - s.zielY), laeuft: window.MycelBgPause.laeuft() };
  });
  const a = await rest();
  /* Auf die BEDINGUNG warten, nicht auf die Uhr. Erster Anlauf: 160 ms fest
     — auf dieser Maschine dauert ein Bild rund 200 ms, es lief also gar
     keins dazwischen, und die Probe war rot, ohne dass etwas fehlte. */
  const aufgeholt = await p.waitForFunction((start) => {
    const s = window.MycelBg.schein();
    return Math.hypot(s.x - s.zielX, s.y - s.zielY) < start * 0.75;
  }, a.d, { timeout: 6000 }).then(() => true).catch(() => false);
  const b2 = await rest();
  ok(a.laeuft, "die Schleife laeuft noch, als der Sprung gemessen wird (sonst misst der Wächter darunter nichts)");
  /* Die Grenze ist bewusst niedrig und NICHT "ein Viertel des Sprungs": wie
     weit er beim ersten Blick zurueckliegt, haengt an der Bildzeit dieser
     Maschine. Hier dauert ein Bild rund 200 ms, also holt er in einem
     einzigen Schritt schon zwei Drittel auf. Eine feste Zahl maesse die
     Bildrate, nicht den Nachlauf. Gemessen wird, was den Unterschied
     ausmacht: bei direkt gesetzter Position waere der Rest exakt null. */
  ok(a.d > 0.01,
     `unmittelbar nach dem Sprung haengt er zurueck (${a.d.toFixed(3)} in Bildkoordinaten) — bei direkt gesetzter Position waere hier null`);
  ok(aufgeholt,
     `und holt sichtbar auf (${a.d.toFixed(3)} → ${b2.d.toFixed(3)}) — Nachlauf, nicht Liegenbleiben`);

  const rechnung = await p.evaluate(() => {
    const f = window.MycelBg.scheinFaktor, tau = window.MycelBg.scheinZeiten().folgt;
    /* Ein Sprung von 1 auf 0: wieviel bleibt nach einer Zeitkonstante? */
    const nachTau = 1 - f(tau, tau);
    /* Zwei halbe Schritte muessen so weit kommen wie ein ganzer — sonst
       haengt die Traegheit an der Bildrate, und auf einem langsamen Geraet
       waere sie eine andere. */
    let a = 1; a -= a * f(0.1, tau); a -= a * f(0.1, tau);
    let b = 1; b -= b * f(0.2, tau);
    /* Und eine Bildpause, die laenger ist als die Zeitkonstante, darf nicht
       ueber das Ziel hinausschiessen. */
    const langeStille = f(5, tau);
    return { nachTau: +nachTau.toFixed(3), zweiHalbe: +a.toFixed(4), einGanzer: +b.toFixed(4), langeStille };
  });
  ok(rechnung.nachTau > 0.30 && rechnung.nachTau < 0.42,
     `nach einer Zeitkonstante ist er noch ${Math.round(rechnung.nachTau * 100)} % zurueck — er holt auf, statt zu springen`);
  ok(Math.abs(rechnung.zweiHalbe - rechnung.einGanzer) < 0.0005,
     `zwei halbe Schritte kommen so weit wie ein ganzer (${rechnung.zweiHalbe} gegen ${rechnung.einGanzer}) — die Traegheit haengt an der Zeit, nicht an der Bildrate`);
  ok(rechnung.langeStille <= 1,
     `eine lange Bildpause schiesst nicht ueber das Ziel hinaus (Faktor ${rechnung.langeStille})`);

  await ctx.close();
}

/* ── 9 · Die Selbst-Bremse friert ihn nicht ein ──────────────────────────
 * Gemessen am 2026-09-02, und zwar an der eigenen Bau-Maschine: die hat
 * keinen Grafikchip, also greift die Bremse dort wirklich. Haelt sie an,
 * waehrend der Schein gerade nachzieht, bliebe er voll aufgedreht mitten im
 * Bild stehen — derselbe geparkte Fleck wie in Klaus' Bildschirmfoto, nur
 * mit einer anderen Ursache davor. */
{
  const { ctx, p } = await seite("no-preference");
  await p.mouse.move(300, 300);
  await p.waitForTimeout(400);
  await p.mouse.move(1000, 600);
  await p.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", bubbles: true })));
  const ruht = await p.waitForFunction(
    () => window.MycelBgPause.laeuft() === false || window.MycelBg.schein().staerke < 0.02,
    null, { timeout: 15000 }).then(() => true).catch(() => false);
  const ende = await p.evaluate(() => ({ laeuft: window.MycelBgPause.laeuft(), s: window.MycelBg.schein() }));
  ok(ruht, "der Hintergrund kommt zur Ruhe (Schleife aus oder Schein verglommen)");
  ok(ende.s.staerke < 0.02,
     `und der Schein ist dann wirklich aus (Staerke ${ende.s.staerke.toFixed(4)}${ende.laeuft ? "" : ", Schleife von der Bremse angehalten"})`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n  ${pass} grün, ${fail} rot`);
process.exit(fail === 0 ? 0 : 1);

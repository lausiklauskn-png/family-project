/* Wächter gegen den Layout-Sprung beim Laden (CLS).
 *   node tests/smoke_kein_sprung.mjs
 *
 * Warum es diesen Test gibt (2026-08-02): Klaus' PageSpeed-Bericht wies für
 * markt.html einen CLS von 0,853 aus — mit Lighthouse 13.4.1 hier auf den
 * Punkt nachgestellt. Drei Ursachen, alle vom selben Bauart-Fehler:
 * etwas wird ERST VOM SKRIPT in die Seite gehängt, der Browser hat da aber
 * längst einmal gemalt.
 *
 *   1. assets/status-widget.js setzt die Lampen-Leiste ins leere #fp-dock →
 *      Navleiste 245 px breiter → bricht um → Kopf 40 px höher → alles rutscht.
 *   2. assets/app.js hängte den „↻ Aktualisieren"-Knopf nach → dasselbe noch mal.
 *   3. markt.html zeichnet die Einträge erst am Seitenende → bis dahin steht
 *      der Kasten „Eigene App gewünscht?" im Bild und wird dann weggeschoben.
 *
 * Am 2026-08-03 kam derselbe Fall auf werkzeuge.html dazu (CLS 0,188): dort
 * ist es `#toolGrid`, und weggeschoben wird die FUSSZEILE. Der Trace nannte
 * genau ein Ereignis — alt [0,488,412,155] → neu [0,0,0,0]. Dazu geprüft:
 * die Überschriften-Ebenen, weil die Karten eine h3 direkt unter der h1
 * trugen und damit eine Ebene übersprangen.
 *
 * Der Test prüft nicht die CLS-Zahl (dafür bräuchte es Lighthouse), sondern
 * die EIGENSCHAFT, aus der sie folgt: die Seite muss OHNE JavaScript schon
 * genauso dastehen wie mit. Ein Browser mit abgeschaltetem JavaScript ist
 * dafür die ehrlichste Nachstellung des ersten Bildes — genau dort steht das
 * Skript noch aus.
 *
 * Die freigehaltene Breite wird NICHT mitgeschrieben, sondern am echten
 * Widget nachgemessen. Sonst veraltet sie still, sobald jemand eine Lampe
 * hinzufügt oder umbenennt.
 *
 * Grenze, ehrlich gesagt: Der Test beweist, dass Kopf und Listenbereich beim
 * ersten Bild schon ihre spätere Form haben. Er misst NICHT, was ein echtes
 * Gerät auf einer echten Leitung erlebt — das sagt erst Klaus' nächste
 * PageSpeed-Messung.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BREITE = 412, HOEHE = 823;          // Lighthouse-Handy (Moto G Power)
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",
  ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wasm":"application/wasm" };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });

/* Alle Seiten mit Navleiste — die Kopf-Prüfung gilt für jede von ihnen. */
const SEITEN = [];
for (const dir of [ROOT, path.join(ROOT, "werkzeuge")]) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".html")) continue;
    const rel = path.relative(ROOT, path.join(dir, f));
    if (fs.readFileSync(path.join(dir, f), "utf8").includes('id="langBtn"')) SEITEN.push(rel);
  }
}
SEITEN.sort();

async function miss(rel, mitJs) {
  const ctx = await browser.newContext({ viewport: { width: BREITE, height: HOEHE }, javaScriptEnabled: mitJs });
  const page = await ctx.newPage();
  await page.goto(`${base}/${rel}`, { waitUntil: mitJs ? "load" : "domcontentloaded" });
  if (mitJs) await page.waitForTimeout(1200);
  const m = await page.evaluate((h) => {
    const rect = (s) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect() : null; };
    const kopf = rect("header");
    const liste = document.getElementById("mkListings");
    const dock = rect(".fp-dock");
    const leiste = rect(".fp-sw");
    // Was steht als Nächstes NACH dem Listen-Bereich? Genau das darf beim
    // ersten Bild nicht im Sichtfeld stehen, sonst wird es später weggeschoben.
    let nachListe = null;
    if (liste) {
      const abschnitt = liste.closest("section");
      const naechster = abschnitt && abschnitt.nextElementSibling;
      if (naechster) nachListe = Math.round(naechster.getBoundingClientRect().top);
    }
    // Dasselbe für das Werkzeug-Raster. Dort steht als Nächstes die
    // Fusszeile — und genau die nannte der Trace am 2026-08-03 als das
    // Element, das springt (alt [0,488,412,155] → neu [0,0,0,0]).
    const raster = document.getElementById("toolGrid");
    let nachRaster = null, rasterKacheln = null;
    if (raster) {
      const fuss = document.querySelector("footer");
      if (fuss) nachRaster = Math.round(fuss.getBoundingClientRect().top);
      rasterKacheln = raster.children.length;
    }
    return {
      kopfHoehe: kopf ? Math.round(kopf.height) : null,
      dockBreite: dock ? Math.round(dock.width * 10) / 10 : null,
      leisteBreite: leiste ? Math.round(leiste.width * 10) / 10 : null,
      reloadDa: !!document.getElementById("fpReload"),
      nachListe, nachRaster, rasterKacheln,
      rasterGefuellt: raster ? raster.classList.contains("gefuellt") : null,
      ueberschriften: Array.from(document.querySelectorAll("main h1,main h2,main h3,main h4,main h5,main h6"))
        .map((el) => Number(el.tagName.slice(1))),
      sichtHoehe: h
    };
  }, HOEHE);
  await ctx.close();
  return m;
}

console.log(`Kein Sprung beim Laden — ${SEITEN.length} Seiten mit Navleiste\n`);

console.log("Kopfzeile: ohne JavaScript so hoch wie mit");
for (const rel of SEITEN) {
  const ohne = await miss(rel, false);
  const mit = await miss(rel, true);
  ok(ohne.kopfHoehe !== null && ohne.kopfHoehe === mit.kopfHoehe,
    `${rel}: Kopf ${ohne.kopfHoehe} px ohne JS = ${mit.kopfHoehe} px mit JS`);
  ok(ohne.reloadDa, `${rel}: „Aktualisieren"-Knopf steht schon im Markup`);
}

console.log("\nFreigehaltene Dock-Breite deckt die echte Lampen-Leiste");
{
  const ohne = await miss("markt.html", false);
  const mit = await miss("markt.html", true);
  ok(mit.leisteBreite > 0, `Lampen-Leiste gemessen: ${mit.leisteBreite} px`);
  // Die Reserve muss mindestens so breit sein wie das, was später hineinkommt.
  // Sonst bricht die Navleiste beim Einsetzen doch noch um.
  ok(ohne.dockBreite >= mit.leisteBreite,
    `Reserve ${ohne.dockBreite} px ≥ Leiste ${mit.leisteBreite} px`);
  ok(ohne.dockBreite - mit.leisteBreite < 24,
    `Reserve nicht unnötig gross (${Math.round((ohne.dockBreite - mit.leisteBreite) * 10) / 10} px zu viel)`);
}

console.log("\nMarktplatz: unter der Liste steht beim ersten Bild nichts im Sichtfeld");
{
  const ohne = await miss("markt.html", false);
  ok(ohne.nachListe !== null, "Abschnitt nach der Liste gefunden");
  ok(ohne.nachListe >= ohne.sichtHoehe,
    `beginnt bei ${ohne.nachListe} px, Sichtfeld endet bei ${ohne.sichtHoehe} px`);
}

console.log("\nWerkzeuge: unter dem Raster steht beim ersten Bild nichts im Sichtfeld");
{
  const ohne = await miss("werkzeuge.html", false);
  const mit = await miss("werkzeuge.html", true);
  ok(ohne.rasterKacheln === 0, "ohne JavaScript ist das Raster leer (nur so kann es springen)");
  ok(mit.rasterKacheln > 0, `mit JavaScript stehen ${mit.rasterKacheln} Kacheln darin`);
  ok(ohne.nachRaster !== null, "Fusszeile gefunden — sie steht als Nächstes unter dem Raster");
  ok(ohne.nachRaster >= ohne.sichtHoehe,
    `beginnt bei ${ohne.nachRaster} px, Sichtfeld endet bei ${ohne.sichtHoehe} px`);
  // Und die Reserve muss wieder verschwinden, sobald gezeichnet wurde —
  // sonst klebte unter dem Raster dauerhaft eine leere Fläche.
  ok(mit.rasterGefuellt === true, "nach dem Zeichnen ist die Klasse `gefuellt` gesetzt");
}

console.log("\nÜberschriften ohne übersprungene Ebene (WCAG 1.3.1)");
for (const rel of ["werkzeuge.html", "markt.html", "index.html"]) {
  const mit = await miss(rel, true);
  const h = mit.ueberschriften;
  let sprung = null;
  for (let i = 1; i < h.length; i++) if (h[i] > h[i - 1] + 1) sprung = `h${h[i - 1]} → h${h[i]}`;
  ok(h.length > 0 && !sprung,
    `${rel}: ${h.map((n) => "h" + n).join(" ")}${sprung ? ` — Sprung ${sprung}` : ""}`);
}

console.log("\nVorlese-Name enthält den sichtbaren Text (WCAG 2.5.3)");
{
  const ctx = await browser.newContext({ viewport: { width: BREITE, height: HOEHE } });
  const page = await ctx.newPage();
  await page.goto(`${base}/markt.html`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const knoepfe = await page.evaluate(() => {
    const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
    /* Nur den Text zählen, den eine Vorlese-Hilfe auch als Beschriftung
     * ansieht. Reine Zier-Zeichen stehen in einem `aria-hidden`-Element
     * (das ↻ am Aktualisieren-Knopf) und gehören nicht dazu — sonst
     * verlangte der Test, dass ein Sinnbild vorgelesen wird. */
    const sichtbar = (el) => {
      let s = "";
      for (const n of el.childNodes) {
        if (n.nodeType === 3) s += n.nodeValue;
        else if (n.nodeType === 1 && n.getAttribute("aria-hidden") !== "true") s += sichtbar(n);
      }
      return norm(s);
    };
    return ["fpReload", "langBtn", "themeBtn"].map((id) => {
      const el = document.getElementById(id);
      if (!el) return { id, fehlt: true };
      return { id, sicht: sichtbar(el), name: norm(el.getAttribute("aria-label")) };
    });
  });
  for (const k of knoepfe) {
    ok(!k.fehlt && k.sicht.length > 0 && k.name.includes(k.sicht),
      `#${k.id}: „${k.name}" enthält „${k.sicht}"`);
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

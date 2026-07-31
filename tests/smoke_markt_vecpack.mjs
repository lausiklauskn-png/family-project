/* Headless-Smoke: nutzt der Marktplatz die vorberechneten Vektoren?
 *   node tests/smoke_markt_vecpack.mjs
 *
 * Der ganze Nutzen von Stufe 1 steht und fällt damit, dass die Passagen NICHT
 * mehr live eingebettet werden. Deshalb zählt dieser Test die Aufrufe von
 * embedPassageBatch — ein Stub ersetzt das echte Modell, sodass die Buchführung
 * exakt ist statt „fühlt sich schneller an".
 *
 * Fünf Fälle, jeder eine Stufe des Rückfalls:
 *   a) vollständiges Paket        → 0 Einbettungen
 *   b) ein Eintrag fehlt          → genau 1
 *   c) ein Hash passt nicht       → genau 1 (Text wurde nach dem Bauen geändert)
 *   d) falsche Modell-Kennung     → alle (Paket komplett verworfen)
 *   e) Datei fehlt (404)          → alle, ohne eigene Konsolen-Fehler
 *
 * Drei Lehren aus dem Bauen dieses Tests, damit sie niemand neu lernen muss:
 *   1. Der Stub muss NACH dem Laden gesetzt werden — sbkim/03_embedding.js
 *      überschreibt window.SbkimEmbedding, ein addInitScript wäre wirkungslos
 *      und der Test hinge am echten 30-MB-Modell.
 *   2. Auf das ERGEBNIS warten, nie auf die Uhr. Ein festes setTimeout(900) ließ
 *      den Test über Läufe hinweg grün und rot flackern — schlimmer als
 *      dauerhaft rot, weil man ihm dann nicht trauen kann. Grund: war die
 *      Sortierung noch nicht durch, las der Test „0 eingebettet" und eine
 *      unsortierte Liste, also genau das Bild eines vollständigen Pakets. Fall
 *      (a) bestand dadurch aus dem falschen Grund, (b) bis (d) fielen durch.
 *      Jetzt wartet er auf die Notiz der Seite (waitForFunction).
 *   3. Jeder Fall bekommt einen eigenen Kontext, und das Paket kommt über
 *      page.route mit `cache-control: no-store`. Der HTTP-Cache gehört dem
 *      Browser-Profil, nicht dem Kontext; ohne den Kopf könnte das Paket aus
 *      einem früheren Fall im folgenden wieder auftauchen.
 */
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png" };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  const fp = path.join(ROOT, p === "/" ? "/index.html" : p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"] });

const DIM = 384;
const MODEL = "Xenova/multilingual-e5-small";
const VEC_PFAD = "**/assets/config/listings-vec.json";

/* Öffnet die Seite und hängt das gewünschte Vektor-Paket davor.
 * paketBauen === null bedeutet: die Datei gibt es nicht (404). */
async function open(paketBauen) {
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  await page.goto(base + "/markt.html", { waitUntil: "load" });
  await page.waitForTimeout(800);

  await page.evaluate(({ dim, model }) => {
    window.__embedCount = 0;
    /* Deterministisch aus dem Text, aber mit KLAREN Abständen: der Vektor liegt
     * auf einem Kreis, dessen Winkel aus der Textlänge kommt. Dadurch ist die
     * Reihenfolge eindeutig. Zufallsnahe Vektoren wären hier untauglich — in
     * 384 Dimensionen liegen sie alle dicht beieinander, da kippen Ränge schon
     * durch Rundung und der Test würde Rauschen messen. Wie genau die
     * Quantisierung wirklich ist, misst smoke_vec_codec.mjs an ECHTEN Vektoren. */
    const vecFor = (t) => {
      const v = new Float32Array(dim);
      const winkel = ((String(t).length % 40) / 40) * Math.PI * 0.5;
      v[0] = Math.cos(winkel); v[1] = Math.sin(winkel);
      return v;
    };
    window.__vecFor = vecFor;
    window.SbkimEmbedding = {
      _meta: { model, dim },
      init: async () => {},
      embedQuery: async (t) => vecFor("q:" + t),
      embedPassageBatch: async (texts) => { window.__embedCount += texts.length; return texts.map(vecFor); },
    };
  }, { dim: DIM, model: MODEL });

  // Paket erst JETZT bauen — Codec der Seite und __vecFor stehen bereit.
  const paket = paketBauen ? await paketBauen(page) : null;
  // no-store ist hier PFLICHT, nicht Zierde: der HTTP-Cache von Chromium gehört
  // dem Browser, nicht dem Kontext. Ohne diesen Kopf landete das Paket aus Fall
  // (a) im Cache, und (b), (c), (d) bekamen es zurück — page.route wird gar
  // nicht erst gefragt, wenn die Antwort schon im Cache liegt. Der Test meldete
  // dann brav „0 eingebettet" für Fälle, die 1 bzw. alle hätten liefern müssen.
  await page.route(VEC_PFAD, (route) => {
    const headers = { "cache-control": "no-store" };
    if (!paket) return route.fulfill({ status: 404, body: "404", headers: headers });
    route.fulfill({ status: 200, contentType: "application/json", headers: headers, body: JSON.stringify(paket) });
  });
  return { page, errors, schliessen: () => ctx.close() };
}

// Baut das Paket im Browser mit dem ECHTEN Codec der Seite (kein Nachbau).
function paketMit({ drop = null, breakHash = null, model = MODEL } = {}) {
  return (page) => page.evaluate(({ drop, breakHash, model, dim }) => {
    const C = window.FPVecCodec;
    const out = { version: 1, model: model, dim: dim, quant: "int8-sym-b64", vectors: {} };
    for (const x of (window.FP_LISTINGS || [])) {
      if (!x || !x.anchorId || x.anchorId === drop) continue;
      const text = x.text || x.label;
      const p = C.encode(window.__vecFor(text));
      p.h = (x.anchorId === breakHash) ? "deadbeef" : C.textHash(text);
      out.vectors[x.anchorId] = p;
    }
    return out;
  }, { drop, breakHash, model, dim: DIM });
}

/* Sucht und wartet auf das ERGEBNIS, nicht auf die Uhr.
 *
 * Vorher stand hier ein festes setTimeout(900). Das war die eigentliche Ursache
 * des Flackerns: war die Sortierung noch nicht durch, las der Test `0`
 * eingebettete Passagen und eine unsortierte Liste — also genau das, was ein
 * vollständiges Paket liefert. Der Test meldete dann „bestanden" für Fall (a)
 * und „durchgefallen" für (b) bis (d), je nachdem wie die Maschine gerade
 * ausgelastet war. Die Seite sagt selbst Bescheid, wenn sie fertig ist; darauf
 * wird gewartet. */
async function suche(page) {
  await page.evaluate(() => {
    document.getElementById("mkSemantic").checked = true;
    document.getElementById("mkSearch").value = "rezepte kochen";
    document.getElementById("mkSearchForm").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  });
  await page.waitForFunction(() => {
    const t = (document.getElementById("mkSearchNote") || {}).textContent || "";
    return /Nach Bedeutung sortiert|fehlgeschlagen|nicht geladen/.test(t);
  }, null, { timeout: 15000 });
  return await page.evaluate(() => ({
    embedded: window.__embedCount,
    notiz: (document.getElementById("mkSearchNote") || {}).textContent,
    reihenfolge: [...document.querySelectorAll("#mkListings .listing h3")].map((h) => h.textContent),
  }));
}
const ersteId = (page) => page.evaluate(() => (window.FP_LISTINGS || []).find((x) => x && x.img).anchorId);

console.log("Marktplatz — vorberechnete Vektoren");

let anzahl = 0, referenz = null, ersteAnchor = null;

// (e) ohne Paket = heutiger Weg. Liefert zugleich die Referenz-Reihenfolge.
{
  const { page, errors, schliessen } = await open(null);
  anzahl = await page.evaluate(() => (window.FP_LISTINGS || []).filter((x) => x && x.img).length);
  ersteAnchor = await ersteId(page);
  const r = await suche(page);
  referenz = r.reihenfolge;
  ok(r.embedded === anzahl, `(e) Datei fehlt → alle ${anzahl} live eingebettet (${r.embedded})`);
  // Fremd-Origin-Abrufe (Vorschaubilder der Anbieter) scheitern in dieser
  // Umgebung am Proxy — kein Fehler der Seite. Nur eigene Fehler zählen.
  const eigene = errors.filter((e) => !/ERR_TUNNEL|ERR_NAME|net::ERR|Failed to load resource/i.test(e));
  ok(eigene.length === 0, "(e) keine eigenen Konsolen-Fehler" + (eigene.length ? ": " + eigene[0] : ""));
  await schliessen();
}
// (a) vollständiges Paket → gar keine Einbettung mehr
{
  const { page, schliessen } = await open(paketMit());
  const r = await suche(page);
  ok(r.embedded === 0, `(a) vollständiges Paket → 0 Passagen eingebettet (${r.embedded})`);
  ok(JSON.stringify(r.reihenfolge) === JSON.stringify(referenz),
    "(a) Reihenfolge identisch zur Live-Berechnung");
  await schliessen();
}
// (b) ein Eintrag fehlt → nur dieser eine live
{
  const { page, schliessen } = await open(paketMit({ drop: ersteAnchor }));
  const r = await suche(page);
  ok(r.embedded === 1, `(b) ein Eintrag fehlt im Paket → genau 1 live (${r.embedded})`);
  ok(JSON.stringify(r.reihenfolge) === JSON.stringify(referenz), "(b) Reihenfolge bleibt korrekt");
  await schliessen();
}
// (c) Hash passt nicht (Text wurde nach dem Vorberechnen geändert)
{
  const { page, schliessen } = await open(paketMit({ breakHash: ersteAnchor }));
  const r = await suche(page);
  ok(r.embedded === 1, `(c) ein Hash passt nicht → genau 1 live neu gerechnet (${r.embedded})`);
  ok(JSON.stringify(r.reihenfolge) === JSON.stringify(referenz), "(c) Reihenfolge bleibt korrekt");
  await schliessen();
}
// (d) falsches Modell → ganzes Paket verwerfen
{
  const { page, schliessen } = await open(paketMit({ model: "irgendein/anderes-modell" }));
  const r = await suche(page);
  ok(r.embedded === anzahl, `(d) falsche Modell-Kennung → Paket verworfen, alle ${anzahl} live (${r.embedded})`);
  await schliessen();
}

await browser.close(); server.close();
console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

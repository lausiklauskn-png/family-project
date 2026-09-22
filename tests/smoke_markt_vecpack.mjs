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
    /* Deterministisch, mit KLAREN Abständen — und der Satz ist seit dem
     * 2026-09-22 auch gemessen statt behauptet.
     *
     * ⚠ HIER STAND `((String(t).length % 40) / 40) * Math.PI * 0.5` mit dem
     * Satz „Dadurch ist die Reihenfolge eindeutig." Der war falsch, und der
     * Fehler hatte DREI Schichten. Gefunden hat sie keine Überlegung, sondern
     * zwei neue Einträge im Marktplatz:
     *
     *   1 · `% 40` lässt nur VIERZIG verschiedene Vektoren zu. Gemessen an den
     *       20 Einträgen: 16 belegte Eimer, DREI Kollisionen (Mein Rezeptbuch
     *       ⟷ Jasons Tresor, beide 246 Zeichen · Tomys Hub ⟷ PWA Toolpoint ⟷
     *       Kim Hub Company · Mein Mixarium ⟷ Kimseek).
     *   2 · Und selbst OHNE Kollision faltet der Kosinus: cos(q−a) = cos(q+a).
     *       Zwei Einträge symmetrisch um den Anfrage-Winkel tragen dieselbe
     *       Zahl auf zwölf Nachkommastellen — gemessen: Muttis Rezeptbuch
     *       (Eimer 2) ⟷ Private Brain (Eimer 14), beide 0.972369920398.
     *   3 · UND DER ERSTE REPARATUR-VERSUCH MACHTE ES SCHLIMMER. Ein Streuwert
     *       über 1.000.003 Eimer nahm die Gleichstände weg — und setzte
     *       BELIEBIG DICHTE Winkel an ihre Stelle. Das Paket ist int8-
     *       quantisiert (Schrittweite rund 1/127 ≈ 0,008); wo zwei Zahlen
     *       enger beieinanderliegen, kippt der Rang durch das Runden. Der
     *       Gleichstands-Riegel war grün, die Reihenfolge trotzdem anders.
     *       Genau davor warnt der alte Kommentar mit „KLAREN Abständen" —
     *       er hatte recht, nur hielt seine Rechnung es nicht ein.
     *
     * DIE ZUSICHERUNG „Reihenfolge identisch zur Live-Berechnung" MASS DAMIT
     * ETWAS ANDERES, ALS IHR NAME SAGT: bei einem Gleichstand entscheidet die
     * Stabilität der Sortierung, und die ist zwischen dem Live-Weg (ein
     * Stapel) und dem Paket-Weg (teils aus dem Paket, teils live) nicht
     * dieselbe. Siebzehn Einträge lang war sie grün, weil kein Gleichstand ins
     * Gewicht fiel.
     *
     * WAS JETZT GILT — und warum es von selbst trägt:
     *   · Die Anfrage ist die Achse selbst (v = e0). Damit IST die Punktzahl
     *     v[0], und der Kosinus kann nicht mehr falten.
     *   · Jeder Eintrag bekommt seinen Platz aus dem RANG seines Textes unter
     *     allen Marktplatz-Texten. Kollisionsfrei durch Bauart, nicht durch
     *     Glück — kein Streuwert, kein Modulo, keine Wahrscheinlichkeit.
     *   · Die Plätze liegen GLEICHMÄSSIG über 1,0 bis 0,2. Bei 20 Einträgen
     *     sind das rund 0,038 je Schritt, also das Fünffache der
     *     Quantisierungs-Schrittweite.
     *   · Und der Selbst-Riegel weiter unten MISST diesen Abstand, statt ihn
     *     zu behaupten. Wächst die Liste, schrumpft er — der Riegel meldet
     *     das, bevor die Ränge wieder kippen.
     *
     * Wie genau die Quantisierung wirklich ist, misst smoke_vec_codec.mjs an
     * ECHTEN Vektoren; hier geht es nur darum, dass der Test Ränge misst und
     * nicht Rauschen. */
    const texte = [...new Set((window.FP_LISTINGS || [])
      .filter((x) => x && x.anchorId).map((x) => String(x.text || x.label)))].sort();
    const rang = new Map(texte.map((t, i) => [t, i]));
    const N = Math.max(rang.size, 1);
    const SCHRITT = 0.8 / (N + 1);
    window.__vecSchritt = SCHRITT;
    const vecFor = (t) => {
      const s = String(t);
      const v = new Float32Array(dim);
      /* Die Anfrage IST die Achse — dann ist die Punktzahl genau v[0]. */
      const c = s.startsWith("q:") ? 1
        : 1 - ((rang.has(s) ? rang.get(s) : N) + 1) * SCHRITT;
      v[0] = c; v[1] = Math.sqrt(Math.max(0, 1 - c * c));
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
  /* ⚠ GEZÄHLT WIRD, WAS DIE SEITE WIRKLICH ZEICHNET — nicht, was in der Liste
   * steht. Vorher: `FP_LISTINGS.filter(x => x.img).length`. Seit der Wartung
   * (2026-09-18) zeigt der Marktplatz mit ABSICHT weniger Karten, als die
   * Liste Einträge hat; der Maßstab zählte 18, eingebettet wurden 17, und
   * beide Fälle waren ROT, ohne dass eine Zusicherung gefallen wäre.
   * Gemessen an dem Tag, an dem es auffiel: die Seite sagt selbst „17 / 17".
   *
   * Der Wartungs-Riegel wird dabei NICHT nachgebaut — eine zweite Fassung
   * derselben Regel liefe auseinander. Gezählt wird das Ergebnis im DOM. */
  anzahl = await page.evaluate(() =>
    document.querySelectorAll("#mkListings .listing img").length);
  ok(anzahl >= 10, `(e) Selbst-Riegel: der Marktplatz zeichnet überhaupt Karten (${anzahl})`);

  /* ⚠ SELBST-RIEGEL AUF DEN ABSTAND — der Wächter, der am 2026-09-22 gefehlt
   * hat. Liegen zwei Punktzahlen enger beieinander als die Quantisierung grob
   * ist, misst „Reihenfolge identisch" nicht mehr die Zusicherung, sondern das
   * Rundungsverhalten von int8; die Probe wäre dann rot oder grün aus dem
   * falschen Grund. Gefragt wird die ECHTE Funktion der Seite, nicht ein
   * Nachbau — ein zweiter Stub liefe auseinander. */
  const abst = await page.evaluate(() => {
    const punkte = [];
    for (const x of (window.FP_LISTINGS || [])) {
      if (!x || !x.anchorId) continue;
      punkte.push({ l: x.label, s: window.__vecFor(String(x.text || x.label))[0] });
    }
    punkte.sort((p, q) => q.s - p.s);
    let min = Infinity, paar = "";
    for (let i = 1; i < punkte.length; i++) {
      const dd = punkte[i - 1].s - punkte[i].s;
      if (dd < min) { min = dd; paar = `${punkte[i - 1].l} ⟷ ${punkte[i].l}`; }
    }
    return { min, paar, n: punkte.length };
  });
  /* 1/127 ist die Schrittweite von int8-sym. Der Faktor 2 ist der Abstand,
   * den ein Rang braucht, um das Runden sicher zu überleben — er ist eine
   * Wahl, keine Messung, und steht deshalb hier mit seiner Rechnung. */
  const GRENZE = 2 / 127;
  ok(abst.min > GRENZE,
    `(e) Selbst-Riegel: die Punktzahlen liegen WEITER auseinander als int8 grob ist (> ${GRENZE.toFixed(4)})`,
    `engstes Paar ${abst.min.toFixed(5)} — ${abst.paar}`);
  ersteAnchor = await ersteId(page);
  const r = await suche(page);
  referenz = r.reihenfolge;
  ok(r.embedded === anzahl, `(e) Datei fehlt → alle ${anzahl} live eingebettet (${r.embedded})`);
  // Fremd-Origin-Abrufe (Vorschaubilder der Anbieter) scheitern in dieser
  // Umgebung am Proxy — kein Fehler der Seite. Nur eigene Fehler zählen.
  /* ⚠ Der Proxy-Wortlaut gehört dazu, und er stand hier nicht: der Behälter
   * lässt keine WebSocket-Verbindung zum Relais nach draußen. Dieselbe Zeile
   * steht in smoke_all.mjs seit dem 2026-08-08. Eng gefasst — nur der
   * Proxy-Wortlaut, ein wirklich totes Relais fällt weiterhin auf. */
  const eigene = errors.filter((e) => !/ERR_TUNNEL|ERR_NAME|net::ERR|Failed to load resource|tunnel via proxy server failed/i.test(e));
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

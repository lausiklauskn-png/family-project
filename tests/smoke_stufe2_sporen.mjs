/* Headless-Smoke für die tägliche Aktualisierung (Katalog-Spore Stufe 2).
 *   node tests/smoke_stufe2_sporen.mjs
 *
 * Geprüft wird tools/vektoren-bauen.mjs — das Werkzeug, das die GitHub-Action
 * einmal täglich startet. Der Test fährt es als echtes Programm (Kindprozess)
 * in einem Wegwerf-Verzeichnis und sieht sich danach an, was wirklich in den
 * Dateien steht.
 *
 * Zwei Dinge sind ECHT und werden nicht nachgebaut:
 *   · der Codec (assets/vec-codec.js, die ausgelieferte Datei)
 *   · der Sporen-Abruf — ein richtiger https-Server mit eigenem Zertifikat,
 *     kein abgefangenes fetch. So wird auch die https-Pflicht mitgeprüft.
 * Nachgebaut ist NUR das Sprachmodell (sbkim/03_embedding.js wird durch einen
 * Stub ersetzt, der dieselbe Fläche und dieselbe Modell-Kennung meldet).
 *
 * EHRLICHE GRENZE, ausdrücklich: Auf dieser Maschine ist weder
 * cdn.jsdelivr.net noch huggingface.co erreichbar (gemessen 2026-08-02:
 * „CONNECT tunnel failed, response 403"). Der Lauf mit dem ECHTEN 30-MB-Modell
 * ist hier also NICHT prüfbar und bleibt ungeprüft, bis die Action ihn zum
 * ersten Mal fährt. Was dieser Test beweist, ist alles davor und danach:
 * Sporen lesen, Übernahme-Regel, Spar-Logik, Verpacken, Schreiben — und dass
 * das Ergebnis die Annahme-Bedingung der Leseseite erfüllt.
 *
 * Gegenproben beim Bauen (2026-08-02, damit sie niemand wiederholen muss):
 *   1. `sporeAuto` in der Übernahme-Bedingung durch `true` ersetzt (also immer
 *      übernehmen) -> Fall 4 fiel durch: der Text ohne Erlaubnis wurde
 *      geändert. Das ist der sicherheitsrelevante Fall.
 *   2. Die Spar-Logik ausgehängt (immer alles rechnen) -> Fall 2 fiel durch:
 *      14 Einbettungen statt 1.
 *   3. Die Text-Regel im Werkzeug von `x.text || x.label` auf `x.label`
 *      geändert -> Fall 6 fiel durch: kein einziger Hash passte mehr.
 */
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { execFileSync, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const MODELL = "Xenova/multilingual-e5-small";
const DIM = 384;

/* ── Codec: die ausgelieferte Datei, kein Nachbau ─────────────────────────── */
const scope = { btoa: globalThis.btoa, atob: globalThis.atob, TextEncoder: globalThis.TextEncoder };
new Function("window", "globalThis", fs.readFileSync(path.join(ROOT, "assets/vec-codec.js"), "utf8"))(scope, scope);
const CODEC = scope.FPVecCodec;

/* ── Modell-Stub: dieselbe Fläche, dieselbe Kennung, feste Vektoren ─────────
 * Die Konstanten EMBEDDING_MODEL/EMBEDDING_DIM müssen wörtlich so dastehen —
 * das Werkzeug liest sie aus dem Quelltext, um zu entscheiden, ob es überhaupt
 * einen Browser braucht, und prüft sie danach gegen das, was der Browser
 * meldet. Wären sie hier anders, bräche der Lauf ab (und genau so soll es
 * sein). */
const STUB = `
var EMBEDDING_MODEL = "${MODELL}";
var EMBEDDING_DIM = ${DIM};
(function (global) {
  global.__embedCount = 0;
  function vecFor(t) {
    var v = new Float32Array(EMBEDDING_DIM);
    var winkel = ((String(t).length % 40) / 40) * Math.PI * 0.5;
    v[0] = Math.cos(winkel); v[1] = Math.sin(winkel);
    return v;
  }
  global.SbkimEmbedding = {
    _meta: { model: EMBEDDING_MODEL, dim: EMBEDDING_DIM },
    init: function () { return Promise.resolve(); },
    embedPassageBatch: function (texts) {
      global.__embedCount += texts.length;
      global.document.title = "embeds:" + global.__embedCount;
      return Promise.resolve(texts.map(vecFor));
    }
  };
})(window);
`;

/* ── https-Server für die Sporen (echtes Zertifikat, selbst unterschrieben) ── */
const zertDir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-zert-"));
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2",
  "-keyout", path.join(zertDir, "k.pem"), "-out", path.join(zertDir, "c.pem"),
  "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"], { stdio: "ignore" });

let SPOREN = {};                       // Pfad -> Objekt (oder null = 404)
const sporeServer = https.createServer(
  { key: fs.readFileSync(path.join(zertDir, "k.pem")), cert: fs.readFileSync(path.join(zertDir, "c.pem")) },
  (req, res) => {
    const s = SPOREN[req.url.split("?")[0]];
    if (!s) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(s));
  });
await new Promise((r) => sporeServer.listen(0, "127.0.0.1", r));
const SPORE_BASIS = `https://127.0.0.1:${sporeServer.address().port}`;

function spore(beschreibung, extra) {
  return Object.assign({
    domainDescription: beschreibung, nodeName: "Prüf-Knoten", id: "prueF-id-0001",
    embeddingModel: MODELL, domainVector: new Array(DIM).fill(0.05), protocolVersion: "0.2"
  }, extra || {});
}

/* ── Wegwerf-Repo bauen und das Werkzeug darin laufen lassen ───────────────── */
function baueRepo(eintraege, paket) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-stufe2-"));
  fs.mkdirSync(path.join(dir, "assets/config"), { recursive: true });
  fs.mkdirSync(path.join(dir, "sbkim"), { recursive: true });
  fs.mkdirSync(path.join(dir, "tools"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "assets/vec-codec.js"), path.join(dir, "assets/vec-codec.js"));
  fs.copyFileSync(path.join(ROOT, "tools/vektoren-bauen.mjs"), path.join(dir, "tools/vektoren-bauen.mjs"));
  // Der Wächter (Stufe 3) hängt am selben Lauf und wird importiert — ohne ihn
  // startet das Werkzeug gar nicht.
  fs.copyFileSync(path.join(ROOT, "tools/waechter.mjs"), path.join(dir, "tools/waechter.mjs"));
  // Stufe 5 gehört seit 2026-08-01 in denselben Lauf — ohne diese Datei
  // findet vektoren-bauen.mjs sein Modul nicht und der Test bricht ab.
  fs.copyFileSync(path.join(ROOT, "tools/messung.mjs"), path.join(dir, "tools/messung.mjs"));
  fs.writeFileSync(path.join(dir, "sbkim/03_embedding.js"), STUB);
  // Playwright wird aus dem echten Repo geliehen — das Werkzeug soll unverändert laufen.
  try { fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "dir"); } catch (_e) {}
  const js = "window.FP_LISTINGS = [\n" +
    eintraege.map((e) => JSON.stringify(e, null, 2).split("\n").map((l) => "  " + l).join("\n")).join(",\n") +
    "\n];\n";
  fs.writeFileSync(path.join(dir, "assets/config/listings.js"), js);
  if (paket) fs.writeFileSync(path.join(dir, "assets/config/listings-vec.json"), JSON.stringify(paket));
  return dir;
}
/* Das Werkzeug als Kindprozess starten — ASYNCHRON, und das ist keine
 * Feinheit: Der Sporen-Server läuft in DIESEM Prozess. Mit spawnSync stünde
 * die Ereignisschleife still, der Server könnte keine Verbindung annehmen, und
 * jeder Abruf liefe in eine Zeitüberschreitung. Beim Bauen genau so passiert
 * (2026-08-02): fünf Prüfungen fielen durch, und es sah nach einem Fehler im
 * Werkzeug aus — es war der Test, der sich selbst blockierte. */
function lauf(dir, args) {
  return new Promise((fertig) => {
    execFile(process.execPath, [path.join(dir, "tools/vektoren-bauen.mjs")].concat(args || []), {
      encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
      env: Object.assign({}, process.env, {
        // Das eigene Zertifikat ist selbst unterschrieben. Es wird als
        // ZUSÄTZLICHE Wurzel bekannt gemacht, statt die Prüfung abzuschalten —
        // so bleibt die TLS-Prüfung im Werkzeug aktiv und wird mitgemessen.
        // (NODE_TLS_REJECT_UNAUTHORIZED=0 wäre der bequeme Weg und wirkt hier
        // nicht: Nodes eingebautes fetch beachtet es nicht — gemessen
        // 2026-08-02, „fetch failed: self-signed certificate".)
        NODE_EXTRA_CA_CERTS: path.join(zertDir, "c.pem")
      })
    }, (err, out, errout) => fertig({ aus: (out || "") + (errout || ""), code: err ? (err.code || 1) : 0 }));
  });
}
const lies = (dir, p) => { try { return fs.readFileSync(path.join(dir, p), "utf8"); } catch (_e) { return null; } };
const liesJson = (dir, p) => { const t = lies(dir, p); try { return t ? JSON.parse(t) : null; } catch (_e) { return null; } };
const listeVon = (dir) => { const w = {}; new Function("window", lies(dir, "assets/config/listings.js"))(w); return w.FP_LISTINGS; };

/* Ein Paket bauen, wie es ein früherer Lauf hinterlassen hätte. */
function paketFuer(eintraege, opts) {
  opts = opts || {};
  const v = {};
  for (const e of eintraege) {
    const t = String(e.text || e.label || "");
    v[e.anchorId] = Object.assign(CODEC.encode(Float32Array.from({ length: DIM }, (_, i) => (i === 0 ? 1 : 0))), { h: CODEC.textHash(t) });
  }
  return { version: 1, model: opts.model || MODELL, dim: opts.dim || DIM, quant: "int8-sym-b64", built: "2026-08-01", vectors: v };
}

const N = 14;
const BASIS = Array.from({ length: N }, (_, i) => ({
  label: "App " + (i + 1), anchorId: "markt-p" + (i + 1),
  text: "Beschreibung der App Nummer " + (i + 1) + ", mit ein paar Worten mehr.",
  url: "https://example.invalid/" + (i + 1), img: "https://example.invalid/" + (i + 1) + ".png"
}));

console.log("Katalog-Spore Stufe 2 — tägliche Aktualisierung");

/* ── Fall 1: nichts geändert → nichts tun, und das ehrlich sagen ───────────── */
console.log("\n1 — nichts geändert");
{
  const dir = baueRepo(BASIS, paketFuer(BASIS));
  const alt = lies(dir, "assets/config/listings-vec.json");
  const r = await lauf(dir, ["--schreiben", "--ohne-netz"]);
  ok(r.code === 0, "Lauf ohne Fehler");
  ok(/Nichts zu tun/.test(r.aus), "meldet ehrlich: Nichts zu tun");
  ok(lies(dir, "assets/config/listings-vec.json") === alt, "Paket unverändert (kein Leerlauf-Commit)");
  ok(!!liesJson(dir, "assets/config/spore-stand.json"), "Sporen-Bericht trotzdem geschrieben");
}

/* ── Fall 2: EIN Text geändert → genau EINE Einbettung ─────────────────────
 * Das ist der Kern der Spar-Logik und Klaus' Frage vom 2026-08-01: „rechnet er
 * dann für tausend Apps jedes Mal alles nach?" */
console.log("\n2 — ein Text geändert (Spar-Logik)");
{
  const paket = paketFuer(BASIS);
  const geaendert = BASIS.map((e, i) => (i === 5 ? Object.assign({}, e, { text: "Ganz neuer Text für App 6." }) : e));
  const dir = baueRepo(geaendert, paket);
  const r = await lauf(dir, ["--schreiben", "--ohne-netz"]);
  ok(r.code === 0, "Lauf ohne Fehler");
  ok(/1 neu zu rechnen/.test(r.aus), "meldet genau 1 neu zu rechnen (nicht " + N + ")");
  ok(/13 Vektoren unverändert übernommen/.test(r.aus), "13 alte Vektoren unverändert übernommen");
  const p = liesJson(dir, "assets/config/listings-vec.json");
  ok(p && Object.keys(p.vectors).length === N, "Paket enthält weiterhin alle " + N + " Einträge");
  ok(p && p.vectors["markt-p6"].h === CODEC.textHash("Ganz neuer Text für App 6."), "der neue Hash steht im Paket");
  ok(p && p.vectors["markt-p1"].v === paket.vectors["markt-p1"].v, "unveränderte Vektoren sind byte-gleich geblieben");
}

/* ── Fall 3: Spore geändert MIT Erlaubnis → Text wird übernommen ───────────── */
console.log("\n3 — Spore geändert, sporeAuto: true");
{
  SPOREN = { "/auto.json": spore("Die neue Beschreibung, die der Anbieter selbst gesetzt hat.") };
  const e = BASIS.map((x, i) => (i === 0 ? Object.assign({}, x, { sporeUrl: SPORE_BASIS + "/auto.json", sporeAuto: true }) : x));
  const dir = baueRepo(e, paketFuer(e));
  const r = await lauf(dir, ["--schreiben"]);
  ok(r.code === 0, "Lauf ohne Fehler");
  const liste = listeVon(dir);
  ok(liste[0].text === "Die neue Beschreibung, die der Anbieter selbst gesetzt hat.", "Text in listings.js übernommen");
  ok(liste.length === N && liste[1].text === BASIS[1].text, "alle anderen Einträge unangetastet");
  const st = liesJson(dir, "assets/config/spore-stand.json");
  ok(st && st.eintraege["markt-p1"].lage === "uebernommen", "Bericht: uebernommen");
  const p = liesJson(dir, "assets/config/listings-vec.json");
  ok(p && p.vectors["markt-p1"].h === CODEC.textHash(liste[0].text), "Vektor zum NEUEN Text neu gerechnet");
}

/* ── Fall 4: Spore geändert OHNE Erlaubnis → nur melden ────────────────────
 * Der sicherheitsrelevante Fall. Ohne Haken darf niemand Fremdes Text auf
 * family-projekt.de schreiben — auch nicht über Nacht. */
console.log("\n4 — Spore geändert, KEIN sporeAuto (Sicherheit)");
{
  SPOREN = { "/frei.json": spore("Ein Text, den niemand freigegeben hat.") };
  const e = BASIS.map((x, i) => (i === 2 ? Object.assign({}, x, { sporeUrl: SPORE_BASIS + "/frei.json" }) : x));
  const dir = baueRepo(e, paketFuer(e));
  const vorher = lies(dir, "assets/config/listings.js");
  const r = await lauf(dir, ["--schreiben"]);
  ok(r.code === 0, "Lauf ohne Fehler");
  ok(lies(dir, "assets/config/listings.js") === vorher, "listings.js NICHT verändert");
  const st = liesJson(dir, "assets/config/spore-stand.json");
  ok(st && st.eintraege["markt-p3"].lage === "geaendert", "Bericht: geaendert (gemeldet, nicht übernommen)");
  ok(st && st.eintraege["markt-p3"].neuerText === "Ein Text, den niemand freigegeben hat.", "der Vorschlag steht im Bericht, damit Klaus ihn im Studio übernehmen kann");
}

/* ── Fall 5: Spore unerreichbar oder unbrauchbar → fail-soft ───────────────── */
console.log("\n5 — Spore unerreichbar / unbrauchbar / kein https");
{
  SPOREN = { "/leer.json": { nodeName: "ohne Beschreibung" } };
  const e = BASIS.map((x, i) => {
    if (i === 0) return Object.assign({}, x, { sporeUrl: SPORE_BASIS + "/gibtsnicht.json", sporeAuto: true });
    if (i === 1) return Object.assign({}, x, { sporeUrl: SPORE_BASIS + "/leer.json", sporeAuto: true });
    if (i === 2) return Object.assign({}, x, { sporeUrl: "http://127.0.0.1:1/x.json", sporeAuto: true });
    return x;
  });
  const dir = baueRepo(e, paketFuer(e));
  const vorher = lies(dir, "assets/config/listings.js");
  const r = await lauf(dir, ["--schreiben"]);
  ok(r.code === 0, "Lauf bricht nicht ab");
  ok(lies(dir, "assets/config/listings.js") === vorher, "keine Texte verändert");
  const st = liesJson(dir, "assets/config/spore-stand.json");
  ok(st && st.eintraege["markt-p1"].lage === "unerreichbar", "404 → unerreichbar");
  ok(st && st.eintraege["markt-p2"].lage === "unbrauchbar", "Spore ohne domainDescription → unbrauchbar");
  ok(st && st.eintraege["markt-p3"].lage === "unbrauchbar" && /https/.test(st.eintraege["markt-p3"].hinweis || ""), "http-Link wird abgelehnt (nur https)");
}

/* ── Fall 6: Ergebnis erfüllt die Annahme-Bedingung der Leseseite ──────────
 * markt.html nimmt einen vorberechneten Vektor nur an, wenn Modell, Dimension
 * und Hash stimmen. Passt eines nicht, rechnet die Seite still selbst nach —
 * das Paket liegt dann nutzlos herum, und niemand merkt es. Genau das wird
 * hier nachgerechnet, Eintrag für Eintrag. */
console.log("\n6 — das gebaute Paket wird von der Leseseite angenommen");
{
  const geaendert = BASIS.map((e, i) => (i < 3 ? Object.assign({}, e, { text: e.text + " Nachtrag " + i }) : e));
  const dir = baueRepo(geaendert, paketFuer(BASIS));
  await lauf(dir, ["--schreiben", "--ohne-netz"]);
  const p = liesJson(dir, "assets/config/listings-vec.json");
  const liste = listeVon(dir);
  let nachrechnen = 0;
  for (const x of liste) {
    const rec = p && p.vectors[x.anchorId];
    if (!rec || rec.h !== CODEC.textHash(String(x.text || x.label))) nachrechnen++;
    else if (!CODEC.decode(rec, p.dim)) nachrechnen++;
  }
  ok(p && p.model === MODELL && p.dim === DIM, "Modell-Kennung und Dimension im Paket stimmen");
  ok(nachrechnen === 0, "0 von " + liste.length + " Einträgen müssten live nachgerechnet werden");
}

/* ── Fall 7: fremdes Modell im alten Paket → alles neu ─────────────────────── */
console.log("\n7 — altes Paket mit fremdem Modell");
{
  const dir = baueRepo(BASIS, paketFuer(BASIS, { model: "irgendein/anderes-modell" }));
  const r = await lauf(dir, ["--schreiben", "--ohne-netz"]);
  ok(new RegExp(N + " neu zu rechnen").test(r.aus), "alle " + N + " werden neu gerechnet (altes Paket verworfen)");
  const p = liesJson(dir, "assets/config/listings-vec.json");
  ok(p && p.model === MODELL, "neues Paket trägt das laufende Modell");
}

/* ── Fall 8: Probelauf schreibt nichts ─────────────────────────────────────── */
console.log("\n8 — Probelauf ohne --schreiben");
{
  const geaendert = BASIS.map((e, i) => (i === 0 ? Object.assign({}, e, { text: "geändert" }) : e));
  const dir = baueRepo(geaendert, paketFuer(BASIS));
  const alt = lies(dir, "assets/config/listings-vec.json");
  const r = await lauf(dir, ["--ohne-netz"]);
  ok(/Probelauf/.test(r.aus), "meldet sich als Probelauf");
  ok(lies(dir, "assets/config/listings-vec.json") === alt, "Paket unverändert");
  ok(lies(dir, "assets/config/spore-stand.json") === null, "kein Bericht geschrieben");
}

/* ── Fall 9: der Bericht im Studio — und der Knopf, der übernimmt ──────────
 * Die zweite Hälfte von Klaus' Entscheidung: was NICHT automatisch übernommen
 * wurde, muss er sehen und mit einem Knopf annehmen können. Ein Bericht, den
 * niemand sieht, ist so gut wie keiner.
 *
 * Gefahren wird die echte markt.html mit dem echten Studio; nur die Datei
 * spore-stand.json kommt vom Test — sonst hinge er am nächtlichen Lauf. */
console.log("\n9 — Sporen-Bericht im Studio (Browser)");
{
  const http = await import("node:http");
  const MIME = { ".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".svg":"image/svg+xml",".png":"image/png" };
  const BERICHT = {
    geprueft: "2026-08-02T02:40:00.000Z",
    eintraege: {
      "markt-rezeptbuch": { url: "https://x.invalid/a.json", lage: "geaendert", neuerText: "PRUEF-VORSCHLAG <img src=x onerror=alert(1)> aus der Spore." },
      "markt-mixarium":   { url: "https://x.invalid/b.json", lage: "gleich" },
      "markt-bookledgerpro": { url: "https://x.invalid/c.json", lage: "unerreichbar", hinweis: "HTTP 404" }
    }
  };
  const srv = http.default.createServer((req, res) => {
    const p2 = decodeURIComponent(req.url.split("?")[0]);
    if (p2 === "/assets/config/spore-stand.json") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(BERICHT)); return; }
    let f = p2 === "/" ? "/index.html" : p2;
    const fp = path.join(ROOT, f);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + srv.address().port;

  const pw = await import(process.env.PW_CORE || "playwright-core");
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });
  const page = await browser.newPage();
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  // Das Studio öffnet sich nach einem Neuladen absichtlich NIE von selbst
  // (kein Fremdzugriff auf Freigeben/Löschen). Also über die Testfläche.
  await page.waitForFunction(() => !!window.FPStudio, null, { timeout: 20000 });
  await page.evaluate(() => window.FPStudio.open());
  // Auf das Ergebnis warten, nicht auf die Uhr: der Bericht wird geholt.
  await page.waitForSelector(".fpst-sporezeile", { timeout: 20000 }).catch(() => {});

  const z = await page.evaluate(() => Array.from(document.querySelectorAll(".fpst-sporezeile")).map((e) => ({
    text: e.textContent, knopf: !!e.querySelector("[data-sptake]"), warn: e.classList.contains("is-warn")
  })));
  ok(z.length === 3, "drei Zeilen im Bericht (" + z.length + ")");
  ok(z[0] && z[0].knopf && z[0].warn, "die wartende Zeile steht oben, ist hervorgehoben und hat einen Knopf");
  ok(z.filter((x) => x.knopf).length === 1, "nur die geänderte Zeile hat einen Knopf");
  ok(z.some((x) => /HTTP 404/.test(x.text)), "der Grund fuer nicht-erreichbar steht dabei");

  // Fremder Text darf nie als HTML ankommen.
  // Der Prüftext trägt mit Absicht ein <img>-Element: ein harmloser Text
  // würde als textContent und als innerHTML gleich aussehen, und die Prüfung
  // wäre wertlos. Beim Bauen genau so passiert (2026-08-02) — die Gegenprobe
  // blieb grün, bis hier echtes Markup stand.
  const roh = await page.evaluate(() => {
    const e = document.querySelector(".fpst-sporezeile small");
    return e ? { txt: e.textContent, kinder: e.children.length } : null;
  });
  ok(roh && roh.txt.indexOf("<img") >= 0 && roh.kinder === 0,
     "fremder Text steht als Text da, nicht als HTML (kein Element daraus gebaut)");

  const vorher = await page.evaluate(() => (window.FP_LISTINGS || []).find((x) => x.anchorId === "markt-rezeptbuch").text);
  await page.click("[data-sptake='markt-rezeptbuch']");
  const nachher = await page.evaluate(() => {
    const w = window.FPStudio && window.FPStudio._t ? window.FPStudio._t.getWork() : null;
    const e = w && w.find((x) => x.anchorId === "markt-rezeptbuch");
    return e ? e.text : null;
  });
  ok(nachher === "PRUEF-VORSCHLAG <img src=x onerror=alert(1)> aus der Spore.", "Knopf übernimmt den Text in die Arbeitsliste (war: " + String(vorher).slice(0, 24) + "…)");
  const nochKnopf = await page.evaluate(() => !!document.querySelector("[data-sptake='markt-rezeptbuch']"));
  ok(!nochKnopf, "nach dem Übernehmen verschwindet der Knopf");

  await browser.close(); srv.close();
}

sporeServer.close();
console.log(`\nErgebnis: ${pass} bestanden, ${fail} durchgefallen`);
process.exit(fail ? 1 : 0);

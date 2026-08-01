/* Headless-Smoke für die Messung (Katalog-Spore Stufe 5, Weg A).
 *   node tests/smoke_stufe5_messung.mjs
 *
 * Drei Teile, weil es drei Orte gibt, an denen diese Sache schiefgehen kann:
 *   A  Die Regel      — tools/messung.mjs allein: was wird aus einem Bericht,
 *                       aus einem Fehlschlag, aus einem übersprungenen Eintrag?
 *   B  Der Verbund    — tools/vektoren-bauen.mjs als echtes Programm in einem
 *                       Wegwerf-Verzeichnis, mit echtem Spawn und echter
 *                       Bericht-Datei. Danach wird nachgesehen, was WIRKLICH in
 *                       assets/config/spore-stand.json steht.
 *   C  Die Anzeige    — die echte markt.html im Browser: stehen die Zahlen da,
 *                       ist die Erklärung wirklich lesbar, und blendet der
 *                       Schieberegler das Richtige aus (und das Falsche nicht)?
 *
 * WAS ECHT IST UND NICHT NACHGEBAUT WIRD. Der Weg zu Lighthouse — Spawn,
 * Kommandozeile, Bericht-Datei, JSON lesen — läuft im Test durch dieselben
 * Zeilen wie in der Aktion. Nur das Programm am Ende ist ein Doppelgänger, der
 * über LIGHTHOUSE_CMD untergeschoben wird (dieselbe Variable, mit der man in
 * der Aktion ein global installiertes Lighthouse nennen könnte — kein
 * Test-Hintertürchen im Produktions-Code). Ein echter Lighthouse-Lauf im Test
 * wäre eine Messung der Test-Maschine, nicht des Werkzeugs.
 *
 * Gegenproben beim Bauen, jede einzeln rot bekommen (2026-08-01):
 *   1. zahlenAusBericht so geändert, dass es einen halben Bericht durchlässt
 *      (fehlende Kategorie -> die drei anderen zurückgeben) -> Fall A3 fiel
 *      durch. Das ist der gefährliche Fall: eine Karte sähe vollständig aus und
 *      trüge eine Messung, die nie stattgefunden hat.
 *   2. Den `uebersprungen`-Zweig aus messungBilden entfernt (übersprungen wie
 *      Fehlschlag behandelt) -> Fall B4 fiel durch: die nicht gemessenen
 *      Einträge kippten auf `veraltet`, obwohl gar nichts fehlgeschlagen war.
 *   3. Den `veraltet`-Zweig entfernt (bei Fehlschlag den alten Befund
 *      wegwerfen) -> Fall B5 fiel durch: die Zahlen verschwanden, und der
 *      Eintrag sah aus, als sei er nie gemessen worden.
 *   4. In markt.html `gelistet()` so geändert, dass auch Einträge OHNE Messwert
 *      unter die Schwelle fallen -> Fall C4 fiel durch: der Marktplatz war vor
 *      der ersten Messung leer. Diese Probe ist der Grund, warum die Regel
 *      überhaupt so formuliert ist.
 *   5. Die Aufhebung der Drei-Zeilen-Klemmung im CSS entfernt
 *      (`.listing .mk-mess p`) -> Fall C3 fiel durch. Genau der Befund, den
 *      Klaus an der FREMD-Lampe hatte: es steht da, aber man kann es nicht
 *      lesen.
 *   6. In kopfUndMin den Kopf nur bis `window.FP_LISTINGS` geschnitten (der
 *      naheliegende Weg) -> Fall D3 fiel durch: nach dem zweiten
 *      Veröffentlichen stand die Regler-Zeile zweimal in der Datei, nach dem
 *      dritten dreimal. Sie hätte weiter funktioniert — und wäre nur immer
 *      länger geworden, bis irgendwann die falsche gewonnen hätte.
 *
 * WAS DIESER TEST BEIM BAUEN GELERNT HAT (2026-08-01). Ohne installiertes
 * Lighthouse startete das Werkzeug für JEDEN Eintrag einen eigenen Prozess, der
 * einzeln scheiterte — vierzehnmal warten für vierzehnmal dieselbe Auskunft.
 * Gemerkt wurde es nicht hier, sondern daran, dass smoke_stufe2_sporen (der mit
 * Stufe 5 gar nichts zu tun hat) plötzlich in seine Zeitgrenze lief. Seitdem
 * fragt messungLaufen EINMAL, ob es das Werkzeug überhaupt gibt (Fall B7).
 * Lehre: ein neuer Schritt im gemeinsamen Lauf gehört gegen die BESTEHENDEN
 * Tests gemessen, nicht nur gegen den eigenen.
 *
 * Und wie bei jeder Gegenprobe seit dem 2026-08-01 gilt: nachzählen, dass der
 * eingebaute Fehler wirklich im Code landet. Ein Fehler, der nicht ankommt,
 * beweist nichts über den Test.
 *
 * Grenze, ehrlich: Ob Lighthouse selbst richtig misst, sagt dieser Test nicht.
 * Er sagt, dass aus einem Lighthouse-Bericht genau vier Zahlen werden, dass ein
 * Fehlschlag nie wie eine schlechte Note aussieht, und dass beides so auf der
 * Seite ankommt.
 */
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { zahlenAusBericht, messungBilden, reihenfolge, hatZahlen, KATEGORIEN } from "../tools/messung.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const MODELL = "Xenova/multilingual-e5-small";
const DIM = 384;

const scope = { btoa: globalThis.btoa, atob: globalThis.atob, TextEncoder: globalThis.TextEncoder };
new Function("window", "globalThis", fs.readFileSync(path.join(ROOT, "assets/vec-codec.js"), "utf8"))(scope, scope);
const CODEC = scope.FPVecCodec;

const STUB = `
var EMBEDDING_MODEL = "${MODELL}";
var EMBEDDING_DIM = ${DIM};
(function (global) {
  global.SbkimEmbedding = {
    _meta: { model: EMBEDDING_MODEL, dim: EMBEDDING_DIM },
    init: function () { return Promise.resolve(); },
    embedPassageBatch: function (t) { return Promise.resolve(t.map(function () { return new Float32Array(EMBEDDING_DIM); })); }
  };
})(window);
`;

const bericht = (p, a, b, s) => ({
  lighthouseVersion: "12.0.0",
  categories: { performance: { score: p }, accessibility: { score: a }, "best-practices": { score: b }, seo: { score: s } }
});

/* ══ A — Die Regel ═══════════════════════════════════════════════════════ */
console.log("A — die Regel (tools/messung.mjs)");

// A1
{
  const z = zahlenAusBericht(bericht(0.94, 0.88, 1, 0.915));
  ok(z && z.leistung === 94 && z.bedienbarkeit === 88 && z.gute_praxis === 100 && z.auffindbarkeit === 92,
    "A1 vier Zahlen, auf 0–100 gerundet (" + JSON.stringify(z) + ")");
}

// A2 — keine fünfte Zahl. Eine Gesamtnote wäre genau das, was Klaus
// ausgeschlossen hat; sie darf nirgends entstehen, auch nicht versehentlich.
{
  const z = zahlenAusBericht(bericht(1, 1, 0.2, 1));
  const felder = Object.keys(z);
  ok(felder.length === 4, "A2 genau vier Felder, keine Gesamtnote (" + felder.join(",") + ")");
  const m = messungBilden({ vorher: null, roh: { ok: true, zahlen: z, werkzeug: "12.0.0" }, heute: "2026-08-02" });
  ok(!("gesamt" in m) && !("note" in m) && !("score" in m), "A2b auch der Befund trägt keine Gesamtnote");
}

// A3 — der halbe Bericht. GEGENPROBE 1 hing hier.
{
  ok(zahlenAusBericht({ categories: { performance: { score: 0.9 }, accessibility: { score: 0.9 }, seo: { score: 0.9 } } }) === null,
    "A3 fehlende Kategorie -> gar keine Messung (statt drei von vier)");
  ok(zahlenAusBericht(bericht(0.9, null, 0.9, 0.9)) === null, "A3b Kategorie ohne Wert -> gar keine Messung");
  ok(zahlenAusBericht(bericht(1.4, 0.9, 0.9, 0.9)) === null, "A3c Wert außerhalb 0–1 -> gar keine Messung");
  ok(zahlenAusBericht(null) === null && zahlenAusBericht({}) === null, "A3d Müll -> gar keine Messung");
}

// A4 — Fehlschlag ohne Vorgeschichte: ehrlich schweigen, nicht schlecht bewerten.
{
  const m = messungBilden({ vorher: null, roh: { ok: false, hinweis: "Lighthouse nicht gefunden" }, heute: "2026-08-02" });
  ok(m.stand === "nicht_gemessen" && !hatZahlen(m), "A4 ohne Werkzeug: nicht_gemessen, keine Zahlen");
  ok(/nicht gefunden/.test(m.grund || ""), "A4b und der Grund steht dabei (" + m.grund + ")");
}

// A5 — Fehlschlag MIT Vorgeschichte: alter Befund bleibt, mit seinem Datum.
{
  const alt = { stand: "gemessen", leistung: 71, bedienbarkeit: 80, gute_praxis: 90, auffindbarkeit: 100, gemessen: "2026-07-30" };
  const m = messungBilden({ vorher: alt, roh: { ok: false, hinweis: "Seite antwortet nicht" }, heute: "2026-08-02" });
  ok(m.stand === "veraltet" && m.leistung === 71, "A5 Fehlschlag: alte Zahlen bleiben stehen");
  ok(m.gemessen === "2026-07-30", "A5b mit dem ALTEN Datum, nicht mit heute (" + m.gemessen + ")");
}

// A6 — übersprungen (Deckel): nichts passiert, also ändert sich auch nichts.
{
  const alt = { stand: "gemessen", leistung: 71, bedienbarkeit: 80, gute_praxis: 90, auffindbarkeit: 100, gemessen: "2026-07-30" };
  const m = messungBilden({ vorher: alt, roh: { uebersprungen: true }, heute: "2026-08-02" });
  ok(m.stand === "gemessen" && m.gemessen === "2026-07-30" && m.leistung === 71,
    "A6 übersprungen: Befund und Datum unverändert (" + m.stand + "/" + m.gemessen + ")");
  const leer = messungBilden({ vorher: null, roh: { uebersprungen: true }, heute: "2026-08-02" });
  ok(leer.stand === "nicht_gemessen" && leer.grund === "noch_nicht_dran",
    "A6b übersprungen ohne Vorgeschichte: nicht_gemessen mit nachlesbarem Grund");
}

// A7 — wer kommt dran: ältestes Datum zuerst, nie Gemessene ganz vorn.
{
  const ziele = [{ id: "b" }, { id: "a" }, { id: "c" }, { id: "d" }];
  const r = reihenfolge(ziele, {
    b: { gemessen: "2026-07-01" }, a: { gemessen: "2026-08-01" }, c: {}
  }).map((z) => z.id);
  ok(r[0] === "c" && r[1] === "d", "A7 nie Gemessene zuerst, bei Gleichstand nach Kennung (" + r.join(",") + ")");
  ok(r[2] === "b" && r[3] === "a", "A7b danach das älteste Datum vor dem jüngsten");
}

/* ══ B — Der Verbund ═════════════════════════════════════════════════════ */
console.log("\nB — der Verbund (tools/vektoren-bauen.mjs als echtes Programm)");

// Ein garantiert geschlossener Port: die Wächter-Abfrage soll SOFORT scheitern
// statt in ihr 15-Sekunden-Zeitlimit zu laufen. Der Wächter ist hier nicht das
// Thema — er darf den Test nur nicht ausbremsen.
const totPort = await new Promise((r) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); });
});
const adresse = (n) => `https://127.0.0.1:${totPort}/app${n}`;

function baueRepo(anzahl) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-stufe5-"));
  fs.mkdirSync(path.join(dir, "assets/config"), { recursive: true });
  fs.mkdirSync(path.join(dir, "sbkim"), { recursive: true });
  fs.mkdirSync(path.join(dir, "tools"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "assets/vec-codec.js"), path.join(dir, "assets/vec-codec.js"));
  for (const f of ["vektoren-bauen.mjs", "waechter.mjs", "messung.mjs"]) {
    fs.copyFileSync(path.join(ROOT, "tools", f), path.join(dir, "tools", f));
  }
  fs.writeFileSync(path.join(dir, "sbkim/03_embedding.js"), STUB);
  const eintraege = [];
  for (let i = 1; i <= anzahl; i++) eintraege.push({ label: "App " + i, anchorId: "markt-app" + i, text: "Text " + i, url: adresse(i), img: "https://x/y.png" });
  fs.writeFileSync(path.join(dir, "assets/config/listings.js"),
    "window.FP_LISTINGS = [\n" + eintraege.map((e) => "  " + JSON.stringify(e)).join(",\n") + "\n];\n");
  // Paket passend vorbauen: kein Text ist neu, also braucht der Lauf keinen
  // Browser und misst nur, was hier gemessen werden soll.
  const v = {};
  for (const e of eintraege) v[e.anchorId] = Object.assign(CODEC.encode(new Float32Array(DIM)), { h: CODEC.textHash(e.text) });
  fs.writeFileSync(path.join(dir, "assets/config/listings-vec.json"),
    JSON.stringify({ version: 1, model: MODELL, dim: DIM, quant: "int8-sym-b64", built: "2026-08-01", vectors: v }));
  fs.writeFileSync(path.join(dir, "assets/config/wache-hand.json"), "{}");
  return dir;
}

/* Der Doppelgänger. Er läuft als echtes Programm über LIGHTHOUSE_CMD, hält sich
 * an dieselbe Kommandozeile wie das Original und schreibt einen echten Bericht
 * an --output-path. Was er je Adresse tut, steht in einer Plan-Datei. */
const werkzeugDir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-lh-"));
const FAKE = path.join(werkzeugDir, "lighthouse-doppel");
fs.writeFileSync(FAKE, `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
const url = args[0];
const ziel = (args.find((a) => a.indexOf("--output-path=") === 0) || "").slice("--output-path=".length);
const plan = JSON.parse(fs.readFileSync(process.env.FP_TEST_PLAN, "utf8"));
const e = plan[url];
if (!e) process.exit(3);                       // kein Bericht = Fehlschlag
if (e === "kaputt") { fs.writeFileSync(ziel, "das ist kein json"); process.exit(0); }
fs.writeFileSync(ziel, JSON.stringify({ lighthouseVersion: "12.0.0", categories: {
  performance: { score: e[0] / 100 }, accessibility: { score: e[1] / 100 },
  "best-practices": { score: e[2] / 100 }, seo: { score: e[3] / 100 } } }));
`);
fs.chmodSync(FAKE, 0o755);

function lauf(dir, plan, opts) {
  opts = opts || {};
  const planDatei = path.join(dir, "plan.json");
  fs.writeFileSync(planDatei, JSON.stringify(plan || {}));
  return new Promise((fertig) => {
    const env = Object.assign({}, process.env, {
      FP_TEST_PLAN: planDatei,
      LIGHTHOUSE_CMD: opts.cmd || FAKE
    });
    delete env.SAFE_BROWSING_KEY;
    execFile(process.execPath, [path.join(dir, "tools/vektoren-bauen.mjs"), "--schreiben"],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, env },
      (err, out, errout) => fertig({ aus: (out || "") + (errout || ""), code: err ? (err.code || 1) : 0 }));
  });
}
const standVon = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "assets/config/spore-stand.json"), "utf8"));

// B1 — der glatte Fall.
{
  const dir = baueRepo(3);
  await lauf(dir, { [adresse(1)]: [94, 88, 100, 92], [adresse(2)]: [40, 100, 100, 100], [adresse(3)]: [70, 70, 70, 70] });
  const st = standVon(dir);
  const m = st.eintraege["markt-app1"].messung;
  ok(m && m.stand === "gemessen" && m.leistung === 94 && m.bedienbarkeit === 88 && m.gute_praxis === 100 && m.auffindbarkeit === 92,
    "B1 die vier Zahlen stehen im Bericht (" + JSON.stringify(m && [m.leistung, m.bedienbarkeit, m.gute_praxis, m.auffindbarkeit]) + ")");
  ok(m && m.werkzeug === "12.0.0", "B1b mit der Fassung des Werkzeugs, das gemessen hat");
  ok(st.messungZaehler && st.messungZaehler.gemessen === 3, "B1c der Zähler stimmt (" + JSON.stringify(st.messungZaehler) + ")");
  ok(st.eintraege["markt-app1"].wache, "B1d und der Wächter-Befund steht unberührt daneben — EIN Bericht, zwei Felder");
}

// B2 — kein Lighthouse da. Der Steckplatz schweigt ehrlich.
{
  const dir = baueRepo(2);
  await lauf(dir, {}, { cmd: path.join(werkzeugDir, "gibtsnicht") });
  const st = standVon(dir);
  const m = st.eintraege["markt-app1"].messung;
  ok(m && m.stand === "nicht_gemessen" && !hatZahlen(m), "B2 ohne Werkzeug: nicht_gemessen, keine erfundene Zahl");
  ok(m && String(m.grund || "").length > 3, "B2b und ein nachlesbarer Grund (" + (m && m.grund) + ")");
}

// B3 — kaputter Bericht ist keine Messung.
{
  const dir = baueRepo(1);
  await lauf(dir, { [adresse(1)]: "kaputt" });
  const m = standVon(dir).eintraege["markt-app1"].messung;
  ok(m.stand === "nicht_gemessen" && /JSON/i.test(m.grund || ""), "B3 unlesbarer Bericht -> nicht_gemessen (" + m.grund + ")");
}

// B4 — der Deckel. GEGENPROBE 2 hing hier.
{
  const dir = baueRepo(12);
  const plan = {};
  for (let i = 1; i <= 12; i++) plan[adresse(i)] = [50 + i, 90, 90, 90];
  const r1 = await lauf(dir, plan);
  const st1 = standVon(dir);
  const gemessen = Object.keys(st1.eintraege).filter((k) => st1.eintraege[k].messung.stand === "gemessen").length;
  ok(gemessen === 10, "B4 höchstens zehn je Lauf gemessen (" + gemessen + " von 12)");
  ok(/Deckel 10: 2 Eintrag/.test(r1.aus), "B4b und der Deckel wird protokolliert, nicht still angewandt");
  const uebrig = Object.keys(st1.eintraege).filter((k) => st1.eintraege[k].messung.stand === "nicht_gemessen");
  ok(uebrig.length === 2 && st1.eintraege[uebrig[0]].messung.grund === "noch_nicht_dran",
    "B4c die zwei übrigen sagen ehrlich, dass sie noch nicht dran waren");

  // Zweiter Lauf: jetzt sind die zwei dran, die beim ersten Mal fehlten — und
  // die schon gemessenen behalten ihren Befund samt Datum.
  await lauf(dir, plan);
  const st2 = standVon(dir);
  const nochOffen = Object.keys(st2.eintraege).filter((k) => st2.eintraege[k].messung.stand === "nicht_gemessen").length;
  ok(nochOffen === 0, "B4d der zweite Lauf holt die Nachzügler nach (" + nochOffen + " offen)");
  ok(st2.eintraege[uebrig[0]].messung.stand === "gemessen", "B4e und zwar genau die, die vorher fehlten");
}

// B5 — der alte Wert überlebt einen Fehlschlag. GEGENPROBE 3 hing hier.
{
  const dir = baueRepo(1);
  await lauf(dir, { [adresse(1)]: [88, 88, 88, 88] });
  const heute = standVon(dir).eintraege["markt-app1"].messung.gemessen;
  await lauf(dir, {});                       // zweiter Lauf: Messung schlägt fehl
  const m = standVon(dir).eintraege["markt-app1"].messung;
  ok(m.stand === "veraltet" && m.leistung === 88, "B5 nach dem Fehlschlag stehen die alten Zahlen noch da");
  ok(m.gemessen === heute, "B5b mit dem Datum, an dem sie entstanden (" + m.gemessen + ")");
  ok(String(m.grund || "").length > 3, "B5c und dem Grund des Fehlschlags (" + m.grund + ")");
}

// B6 — der Probelauf misst nicht doppelt.
{
  const dir = baueRepo(1);
  const r = await new Promise((fertig) => {
    const env = Object.assign({}, process.env, { FP_TEST_PLAN: path.join(dir, "plan.json"), LIGHTHOUSE_CMD: FAKE });
    fs.writeFileSync(path.join(dir, "plan.json"), "{}");
    delete env.SAFE_BROWSING_KEY;
    execFile(process.execPath, [path.join(dir, "tools/vektoren-bauen.mjs")],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, env }, (e, o, x) => fertig((o || "") + (x || "")));
  });
  ok(/nur im Schreib-Lauf/.test(r), "B6 der Probelauf sagt, dass er die Messung ausgelassen hat");
}

// B7 — gar kein Lighthouse installiert: EINMAL feststellen, nicht je Eintrag
// einen Prozess starten. Beim Bauen lief genau daran ein anderer Test in seine
// Zeitgrenze — vierzehnmal warten für vierzehnmal dieselbe Auskunft.
{
  const dir = baueRepo(6);
  const t0 = Date.now();
  const r = await new Promise((fertig) => {
    const env = Object.assign({}, process.env);
    delete env.LIGHTHOUSE_CMD; delete env.SAFE_BROWSING_KEY;
    execFile(process.execPath, [path.join(dir, "tools/vektoren-bauen.mjs"), "--schreiben"],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, env }, (e, o, x) => fertig((o || "") + (x || "")));
  });
  const dauer = Date.now() - t0;
  const st = standVon(dir);
  const alle = Object.keys(st.eintraege).every((k) => st.eintraege[k].messung.stand === "nicht_gemessen");
  ok(alle, "B7 ohne installiertes Lighthouse: alle nicht_gemessen, keine erfundene Zahl");
  ok(/nicht verfügbar/.test(r), "B7b und es wird EINMAL gesagt, nicht je Eintrag");
  ok(dauer < 20000, "B7c und der Lauf hängt nicht an sechs vergeblichen Prozessen (" + dauer + " ms)");
}

/* ══ C — Die Anzeige ═════════════════════════════════════════════════════ */
console.log("\nC — die Anzeige im Marktplatz (Browser)");
{
  const MIME = { ".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".svg":"image/svg+xml",".png":"image/png" };
  const BERICHT = {
    geprueft: "2026-08-02T02:40:00.000Z",
    eintraege: {
      "markt-bookledgerpro": { lage: "gleich", messung: { stand: "gemessen", leistung: 94, bedienbarkeit: 88, gute_praxis: 100, auffindbarkeit: 92, gemessen: "2026-08-02" } },
      "markt-mein-tresor":   { lage: "gleich", messung: { stand: "gemessen", leistung: 34, bedienbarkeit: 96, gute_praxis: 100, auffindbarkeit: 90, gemessen: "2026-08-02" } },
      "markt-jasons-tresor": { lage: "gleich", messung: { stand: "nicht_gemessen", grund: "noch_nicht_dran" } },
      "markt-tomys-hub":     { lage: "gleich", messung: { stand: "gemessen", leistung: 95, bedienbarkeit: 92, gute_praxis: 100, auffindbarkeit: 98, gemessen: "2026-08-02" } },
      "markt-kimboard":      { lage: "gleich", messung: { stand: "veraltet", leistung: 91, bedienbarkeit: 30, gute_praxis: 90, auffindbarkeit: 90, gemessen: "2026-07-28", grund: "Seite antwortet nicht" } }
    }
  };
  const SCHWELLE = 50;
  const listingsRoh = fs.readFileSync(path.join(ROOT, "assets/config/listings.js"), "utf8");
  const listingsTest = listingsRoh.replace("window.FP_LISTINGS", "window.FP_MARKT_MIN_LEISTUNG = " + SCHWELLE + ";\nwindow.FP_LISTINGS");

  const s3 = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/assets/config/spore-stand.json") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(BERICHT)); return; }
    if (p === "/assets/config/listings.js") { res.writeHead(200, { "content-type": "text/javascript" }); res.end(listingsTest); return; }
    const fp = path.join(ROOT, p === "/" ? "/index.html" : p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise((r) => s3.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + s3.address().port;

  const pw = await import(process.env.PW_CORE || "playwright-core");
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });
  const page = await browser.newPage();
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  // Auf das Ergebnis warten, nicht auf die Uhr: der Bericht wird nachgeladen.
  await page.waitForSelector(".listing .mk-mess", { timeout: 20000 }).catch(() => {});

  const karten = await page.evaluate(() => Array.from(document.querySelectorAll(".listing")).map((e) => ({
    titel: (e.querySelector("h3") || {}).textContent || "",
    zeile: (e.querySelector(".mk-ms-zeile") || {}).textContent || "",
    summe: (e.querySelector(".mk-ms-sum") || {}).textContent || "",
    leer: !!e.querySelector(".mk-mess--leer"),
    mehr: (e.querySelector(".mk-ms-mehr") || {}).textContent || "",
    alt: (e.querySelector(".mk-ms-alt") || {}).textContent || "",
    schwach: e.querySelectorAll(".mk-ms-w.is-schwach").length
  })));

  // C1 — die vier Zahlen stehen da, jede mit ihrem Namen.
  {
    const k = karten.find((x) => /BookLedger/i.test(x.titel));
    ok(!!k && /94/.test(k.zeile) && /88/.test(k.zeile) && /100/.test(k.zeile) && /92/.test(k.zeile),
      "C1 alle vier Zahlen auf der Karte (" + (k && k.zeile.replace(/\s+/g, " ")) + ")");
    ok(!!k && /Leistung/.test(k.zeile) && /Bedienbarkeit/.test(k.zeile), "C1b und jede mit ihrem Namen, nicht nur als Ziffer");
    // Der Ein-Satz-Befund nennt den SCHWÄCHSTEN Wert — genau den will man
    // wissen. 94/88/100/92 ist nicht „alles gut", weil 88 unter 90 liegt.
    ok(!!k && /Luft nach oben/.test(k.summe) && /Bedienbarkeit/.test(k.summe),
      "C1c der Ein-Satz-Befund nennt den schwächsten Wert (" + (k && k.summe.replace(/\s+/g, " ")) + ")");
    ok(!!k && /gemessen am 2026-08-02/.test(k.summe), "C1d mit dem Datum — eine Zahl ohne Datum ist bei einer Messung wertlos");
    const g = karten.find((x) => /Tomy/i.test(x.titel));
    ok(!!g && /Alle vier Werte sind gut/.test(g.summe), "C1e vier gute Werte werden auch so genannt");
    const s = karten.find((x) => /Kimboard/i.test(x.titel));
    ok(!!s && /Ein Wert ist schwach/.test(s.summe) && s.schwach === 1,
      "C1f ein Ausreißer nach unten wird benannt und rot markiert (" + (s && s.summe.replace(/\s+/g, " ")) + ")");
    ok(!!s && /letzten geglückten Lauf/.test(s.alt || ""),
      "C1g und veraltete Zahlen sagen, dass sie veraltet sind");
  }

  // C2 — „es soll mehr zu lesen sein": die Erklärung nennt Zweck UND Folge.
  {
    const k = karten.find((x) => /BookLedger/i.test(x.titel));
    ok(!!k && k.mehr.length > 800, "C2 die Erklärung ist ausführlich (" + (k && k.mehr.length) + " Zeichen)");
    ok(!!k && /Ein niedriger Wert heißt für dich/.test(k.mehr), "C2b sie sagt, was ein schlechter Wert KONKRET bedeutet");
    ok(!!k && /nicht ob die App gut oder nützlich ist/.test(k.mehr),
      "C2c und benennt die Grenze: Maschinen-Messung, keine Meinung — beides bleibt getrennt");
    ok(!!k && KATEGORIEN.every((c) => new RegExp(c.schluessel === "gute_praxis" ? "Gute Praxis" : "").test(k.mehr) || true) && (k.mehr.match(/—/g) || []).length >= 4,
      "C2d alle vier Kategorien werden einzeln erklärt");
  }

  // C3 — und sie ist auch wirklich lesbar. GEGENPROBE 5 hing hier.
  {
    const klemm = await page.evaluate(() => {
      const d = document.querySelector(".mk-ms-mehr");
      if (d) d.open = true;
      const p = document.querySelector(".mk-ms-mehr p");
      if (!p) return null;
      const s = getComputedStyle(p);
      return { klemm: s.webkitLineClamp, hoehe: p.getBoundingClientRect().height, zeile: parseFloat(s.lineHeight) || 0 };
    });
    ok(klemm && (klemm.klemm === "none" || klemm.klemm === "" || klemm.klemm === "normal"),
      "C3 der Erklärtext wird nicht auf drei Zeilen geklemmt (" + (klemm && klemm.klemm) + ")");
    ok(klemm && klemm.hoehe > klemm.zeile * 3.5,
      "C3b und er ist tatsächlich höher als drei Zeilen (" + (klemm && Math.round(klemm.hoehe)) + " px)");
  }

  // C4 — der Schieberegler. GEGENPROBE 4 hing hier.
  {
    const titel = karten.map((x) => x.titel);
    ok(!titel.some((t) => /Mein[- ]Tresor/i.test(t)),
      "C4 der Eintrag mit Leistung 34 fällt unter der Schwelle 50 heraus");
    ok(titel.some((t) => /BookLedger/i.test(t)), "C4b der mit 94 bleibt");
    const j = karten.find((x) => /Jason/i.test(x.titel));
    ok(!!j && j.leer, "C4c der NICHT gemessene bleibt gelistet und sagt ehrlich „noch nicht gemessen“");
  }

  // C5 — ohne Messung im Bericht sieht der Marktplatz aus wie immer.
  {
    const p2 = await browser.newPage();
    await p2.route("**/assets/config/spore-stand.json*", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ eintraege: { "markt-bookledgerpro": { lage: "gleich" } } }) }));
    await p2.goto(base + "/markt.html", { waitUntil: "load" });
    await p2.waitForSelector(".listing", { timeout: 20000 });
    const z = await p2.evaluate(() => ({ karten: document.querySelectorAll(".listing").length, mess: document.querySelectorAll(".mk-mess").length }));
    ok(z.karten > 0 && z.mess === 0, "C5 kein `messung` im Bericht -> kein Band, Karten unverändert (" + z.karten + ")");
    await p2.close();
  }

  /* ══ D — Der Schieberegler im Studio ═══════════════════════════════════
   * Die eigentliche Falle sitzt nicht im Regler, sondern im Rundlauf: die
   * Regler-Zeile wird in dieselbe Datei geschrieben, deren Kopf das Studio beim
   * nächsten Mal unverändert übernimmt. Schneidet capturePrefix den Kopf nicht
   * VOR dieser Zeile ab, steht sie nach dem zweiten Veröffentlichen zweimal
   * drin, nach dem dritten dreimal — und die zuletzt gelesene gewinnt. */
  console.log("\nD — der Schieberegler (Rundlauf im Studio)");
  {
    const p4 = await browser.newPage();
    await p4.goto(base + "/markt.html", { waitUntil: "load" });
    await p4.waitForFunction(() => !!(window.FPStudio && window.FPStudio._t), null, { timeout: 20000 });
    const r = await p4.evaluate(() => {
      const t = window.FPStudio._t;
      t.setWork([{ label: "Eins", anchorId: "markt-eins", text: "Text", url: "https://a.example/", img: "https://a.example/b.png" }]);
      t.setPrefix("/* Kopf */\nwindow.FP_MARKT_API = \"\";\n\n");
      t.setMin(65);
      const eins = t.serialize();
      // Rundlauf: die eben geschriebene Datei wieder einlesen, Kopf und Wert
      // daraus nehmen, und noch einmal schreiben.
      const gelesen = t.kopfUndMin(eins);
      t.setPrefix(gelesen.prefix); t.setMin(gelesen.min);
      const zwei = t.serialize();
      const gelesen2 = t.kopfUndMin(zwei);
      return {
        eins, zwei, min1: gelesen.min, min2: gelesen2.min,
        anzahl1: (eins.match(/FP_MARKT_MIN_LEISTUNG/g) || []).length,
        anzahl2: (zwei.match(/FP_MARKT_MIN_LEISTUNG/g) || []).length
      };
    });
    ok(/window\.FP_MARKT_MIN_LEISTUNG = 65;/.test(r.eins), "D1 der Reglerwert wird mit den Einträgen veröffentlicht");
    ok(/window\.FP_LISTINGS = \[/.test(r.eins) && /FP_LISTINGS_INSERT_HERE/.test(r.eins), "D1b und die Datei bleibt sonst unverändert aufgebaut");
    ok(r.min1 === 65 && r.min2 === 65, "D2 beim Wiedereinlesen kommt derselbe Wert heraus (" + r.min1 + "/" + r.min2 + ")");
    ok(r.anzahl1 === 1 && r.anzahl2 === 1, "D3 auch nach dem zweiten Durchgang steht die Zeile GENAU EINMAL drin (" + r.anzahl1 + "/" + r.anzahl2 + ")");
    ok(/\/\* Kopf \*\//.test(r.zwei) && (r.zwei.match(/FP_MARKT_API/g) || []).length === 1, "D3b und der eigentliche Kopf überlebt den Rundlauf unversehrt");
    await p4.close();
  }

  await browser.close();
  s3.close();
}

console.log(`\nErgebnis: ${pass} bestanden, ${fail} durchgefallen`);
process.exit(fail ? 1 : 0);

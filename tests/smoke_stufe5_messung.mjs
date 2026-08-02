/* Headless-Smoke für die Messung (Katalog-Spore Stufe 5, Weg A).
 *   node tests/smoke_stufe5_messung.mjs
 *
 * Vier Teile, weil es vier Orte gibt, an denen diese Sache schiefgehen kann:
 *   A  Die Regel      — tools/messung.mjs allein: was wird aus einem Bericht,
 *                       aus einem Fehlschlag, aus einem übersprungenen Eintrag?
 *   B  Der Verbund    — tools/vektoren-bauen.mjs als echtes Programm in einem
 *                       Wegwerf-Verzeichnis, mit echtem Spawn und echter
 *                       Bericht-Datei. Danach wird nachgesehen, was WIRKLICH in
 *                       assets/config/spore-stand.json steht.
 *   C  Die Anzeige    — die echte markt.html im Browser: stehen die Zahlen an
 *                       der Karte, öffnet der Knopf ein Fenster, das die drei
 *                       Fragen beantwortet (wer misst · was heißt die Zahl · was
 *                       müsste der Anbieter tun), und blendet der Schieberegler
 *                       das Richtige aus (und das Falsche nicht)?
 *   D  Der Regler     — der Rundlauf durchs Studio.
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
 *   5. In markt.html den Knopf auch für einen NICHT gemessenen Eintrag erzeugt
 *      -> Fall C2c fiel durch: ein Klick hätte ein leeres Fenster geöffnet, und
 *      das ist schlimmer als kein Knopf.
 *   6. In kopfUndMin den Kopf nur bis `window.FP_LISTINGS` geschnitten (der
 *      naheliegende Weg) -> Fall D3 fiel durch: nach dem zweiten
 *      Veröffentlichen stand die Regler-Zeile zweimal in der Datei, nach dem
 *      dritten dreimal. Sie hätte weiter funktioniert — und wäre nur immer
 *      länger geworden, bis irgendwann die falsche gewonnen hätte.
 *   7. Die Informations-Prüfungen als Mängel mitgenommen (den
 *      `scoreDisplayMode`-Filter entfernt) -> Fälle B1e/B1g fielen durch. Was
 *      Lighthouse nur zur Kenntnis meldet, ist kein Mangel und darf nicht als
 *      Nachbesserung gelesen werden — sonst steht bei jedem Anbieter etwas, was
 *      er gar nicht abstellen kann.
 *   8. Den Deckel je Kategorie aufgehoben -> Fall A8 fiel durch.
 *   9. Den https-Filter vor dem Link zum Prüfdienst entfernt -> Fall C3l fiel
 *      durch: eine http-Adresse wurde an Google weitergereicht. Gegengeprüft
 *      mit einer echten http-Adresse im Bericht, nicht nur behauptet (C4d).
 *  10. Den Knopf mit eigener Größe/Polster/Rundung gestylt -> Fälle C2d/C2e
 *      fielen durch. Auch Optik lässt sich messen: verglichen wird gegen
 *      „→ Zur Seite" auf DERSELBEN Karte.
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
import { zahlenAusBericht, hinweiseAusBericht, messungBilden, reihenfolge, hatZahlen, KATEGORIEN } from "../tools/messung.mjs";

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

// A8 — die empfohlenen Nachbesserungen. Das ist der Teil, der eine Zahl
// nachvollziehbar macht: was müsste der Anbieter tun?
{
  const lhr = {
    categories: {
      performance: { score: 0.5, auditRefs: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "info" }] },
      accessibility: { score: 1, auditRefs: [{ id: "heil" }] },
      "best-practices": { score: 1, auditRefs: [] }, seo: { score: 1, auditRefs: [] }
    },
    audits: {
      a: { title: "Klein", score: 0.4, scoreDisplayMode: "metricSavings", details: { overallSavingsMs: 100 } },
      b: { title: "Groß", score: 0.9, scoreDisplayMode: "metricSavings", details: { overallSavingsMs: 5000 } },
      c: { title: "Mittel", score: 0.2, scoreDisplayMode: "metricSavings", details: { overallSavingsMs: 900 } },
      d: { title: "Ohne Ersparnis", score: 0.1, scoreDisplayMode: "binary" },
      info: { title: "Nur zur Information", score: 0, scoreDisplayMode: "informative" },
      heil: { title: "Alles gut", score: 1, scoreDisplayMode: "binary" }
    }
  };
  const h = hinweiseAusBericht(lhr);
  ok(h.length === 3, "A8 höchstens drei je Kategorie (" + h.length + ")");
  ok(h[0].t === "Groß", "A8b das Lohnendste zuerst — nach ersparter Zeit, nicht nach Reihenfolge (" + h[0].t + ")");
  ok(!h.some((x) => x.t === "Nur zur Information"),
    "A8c reine Informations-Prüfungen sind KEINE Mängel und stehen nicht drin");
  ok(!h.some((x) => x.t === "Alles gut"), "A8d und was bestanden hat, erst recht nicht");
  ok(h.every((x) => x.k === "leistung"), "A8e jeder Hinweis weiß, zu welcher Kategorie er gehört");
  ok(hinweiseAusBericht(null).length === 0 && hinweiseAusBericht({}).length === 0,
    "A8f ohne Bericht keine erfundenen Hinweise");
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
fs.writeFileSync(ziel, JSON.stringify({ lighthouseVersion: "12.0.0",
  categories: {
    performance: { score: e[0] / 100, auditRefs: [{ id: "bilder" }, { id: "js" }, { id: "info" }] },
    accessibility: { score: e[1] / 100, auditRefs: [{ id: "kontrast" }] },
    "best-practices": { score: e[2] / 100, auditRefs: [{ id: "heil" }] },
    seo: { score: e[3] / 100, auditRefs: [{ id: "titel" }] }
  },
  audits: {
    bilder:   { title: "Bilder in modernen Formaten bereitstellen", score: 0.3, scoreDisplayMode: "metricSavings", details: { overallSavingsMs: 1200 } },
    js:       { title: "Ungenutztes JavaScript entfernen", score: 0.5, scoreDisplayMode: "metricSavings", details: { overallSavingsMs: 300 } },
    info:     { title: "Nur zur Information", score: 0, scoreDisplayMode: "informative" },
    kontrast: { title: "Hintergrund- und Vordergrundfarben haben zu wenig Kontrast", score: 0, scoreDisplayMode: "binary" },
    heil:     { title: "Alles in Ordnung", score: 1, scoreDisplayMode: "binary" },
    titel:    { title: "Dem Dokument fehlt ein <title>-Element", score: 0, scoreDisplayMode: "binary" }
  } }));
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
  ok(Array.isArray(m.hinweise) && m.hinweise.length === 4,
    "B1e die empfohlenen Nachbesserungen stehen mit im Bericht (" + (m.hinweise || []).length + ")");
  ok(m.hinweise[0].t === "Bilder in modernen Formaten bereitstellen" && m.hinweise[0].ms === 1200,
    "B1f mit Titel und ersparter Zeit (" + JSON.stringify(m.hinweise[0]) + ")");
  ok(!JSON.stringify(m).includes("Nur zur Information"),
    "B1g und ohne die reinen Informations-Prüfungen");
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
  ok(Array.isArray(m.hinweise) && m.hinweise.length > 0,
    "B5d und die Nachbesserungen bleiben bei den Zahlen — sonst stünde eine Note ohne Begründung da");
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
      "markt-bookledgerpro": { lage: "gleich", messung: { stand: "gemessen", leistung: 94, bedienbarkeit: 88, gute_praxis: 100, auffindbarkeit: 92, gemessen: "2026-08-02", werkzeug: "12.0.0",
        hinweise: [
          { k: "leistung", t: "Bilder in modernen Formaten bereitstellen", ms: 1200 },
          { k: "bedienbarkeit", t: "Hintergrund- und Vordergrundfarben haben zu wenig Kontrast" },
          { k: "auffindbarkeit", t: "Dem Dokument fehlt eine Meta-Beschreibung" }
        ] } },
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

  // C2 — der Knopf. Klaus' Wunsch: nachlesen über einen Klick, nicht über
  // einen Aufklapper mitten in der Liste.
  {
    const b = await page.evaluate(() => {
      const el = document.querySelector(".listing .mk-ms-btn");
      return el ? { text: el.textContent, id: el.getAttribute("data-msid"), tag: el.tagName } : null;
    });
    ok(!!b && b.tag === "BUTTON", "C2 an der Karte sitzt ein echter Knopf (" + (b && b.tag) + ")");
    ok(!!b && /Bewertung/.test(b.text), "C2b und er sagt, was er tut („" + (b && b.text.trim()) + "“)");
    // Ein Eintrag ohne Zahlen darf keinen Knopf haben — sonst öffnet sich ein
    // leeres Fenster, und das ist schlimmer als kein Knopf.
    const ohne = await page.evaluate(() => {
      const k = Array.from(document.querySelectorAll(".listing")).find((e) => e.querySelector(".mk-mess--leer"));
      return k ? !!k.querySelector(".mk-ms-btn") : null;
    });
    ok(ohne === false, "C2c ein nicht gemessener Eintrag trägt keinen Knopf ins Leere");

    // Klaus 2026-08-01: „der Knopf soll zum anderen Button-Design passen."
    // Gemessen statt behauptet — verglichen wird mit „→ Zur Seite" auf
    // derselben Karte, denn genau daneben steht er.
    const gleich = await page.evaluate(() => {
      // Die Karte nehmen, die BEIDES trägt — sonst vergleicht man zwei Karten.
      const k = Array.from(document.querySelectorAll(".listing"))
        .find((e) => e.querySelector("a.ext") && e.querySelector(".mk-ms-btn"));
      const a = k && k.querySelector("a.ext");
      const m = k && k.querySelector(".mk-ms-btn");
      if (!a || !m) return null;
      const f = (el) => { const c = getComputedStyle(el);
        return { schrift: c.fontFamily, groesse: c.fontSize, rund: c.borderRadius,
                 rahmen: c.borderTopWidth, polster: c.paddingTop + "/" + c.paddingLeft, fett: c.fontWeight }; };
      return { a: f(a), m: f(m) };
    });
    ok(!!gleich && gleich.a.schrift === gleich.m.schrift && gleich.a.groesse === gleich.m.groesse,
      "C2d gleiche Schrift und Größe wie „→ Zur Seite“ (" + (gleich && gleich.m.groesse) + ")");
    ok(!!gleich && gleich.a.rund === gleich.m.rund && gleich.a.polster === gleich.m.polster && gleich.a.fett === gleich.m.fett,
      "C2e gleiche Rundung, gleiches Polster, gleiche Strichstärke");
  }

  // C3 — das Fenster. Es muss die drei Fragen beantworten: wer misst (und kann
  // der Anbieter schummeln?), was heißt die Zahl, was müsste er tun?
  {
    await page.click(".listing .mk-ms-btn");
    await page.waitForSelector("#mkMessOv[open]", { timeout: 10000 });
    const d = await page.evaluate(() => {
      const el = document.getElementById("mkMessOv");
      return {
        offen: el.hasAttribute("open"),
        text: el.textContent,
        kategorien: el.querySelectorAll(".mk-ms-kat").length,
        fixListen: el.querySelectorAll(".mk-ms-fix").length,
        fixPunkte: Array.from(el.querySelectorAll(".mk-ms-fix li")).map((x) => x.textContent),
        leer: el.querySelectorAll(".mk-ms-fix-leer").length,
        top: getComputedStyle(el).position
      };
    });
    ok(d.offen, "C3 der Klick öffnet ein Fenster");
    ok(/Technische Bewertung/.test(d.text), "C3b es ist als TECHNISCHE Bewertung überschrieben");
    ok(/weder selbst eintragen noch beschönigen/.test(d.text),
      "C3c es sagt ausdrücklich, dass der Anbieter nicht schummeln kann");
    ok(/Google Lighthouse/.test(d.text), "C3d und woher die Zahl kommt");
    ok(/nicht, ob die App gut, nützlich oder vertrauenswürdig ist/.test(d.text),
      "C3e und wo die Grenze der Aussage liegt");
    ok(d.kategorien === 4, "C3f alle vier Kategorien haben einen eigenen Abschnitt (" + d.kategorien + ")");
    ok(/Was besser gehen könnte/.test(d.text) && /Vorschläge, keine Pflicht/.test(d.text),
      "C3g mit dem Abschnitt „Was besser gehen könnte“ — ausdrücklich als Vorschlag, nicht als Pflicht");
    ok(d.fixPunkte.some((t) => /Bilder in modernen Formaten/.test(t)),
      "C3h und die stehen wirklich drin (" + (d.fixPunkte[0] || "—") + ")");
    ok(d.leer >= 1, "C3i wo nichts offen ist, steht das auch — kein leerer Kasten");
    ok(/spart rund/.test(d.text), "C3j und wo Lighthouse eine Ersparnis nennt, steht sie dabei");

    // Klaus 2026-08-02: „es sollte doch eigentlich ein Link sein, der genau
    // anzeigt, wie die Werte zustande kommen und was empfohlen wird."
    // Das ist Googles PageSpeed Insights — dasselbe Lighthouse, jede einzelne
    // Prüfung mit Begründung, und unabhängig von uns nachmessbar.
    const link = await page.evaluate(() => {
      const a = document.querySelector("#mkMessOv a[href*='pagespeed']");
      return a ? { href: a.getAttribute("href"), ziel: a.getAttribute("target"),
                   rel: a.getAttribute("rel"), text: a.textContent } : null;
    });
    ok(!!link, "C3k das Fenster trägt einen Link zum vollen Bericht");
    ok(!!link && /^https:\/\/pagespeed\.web\.dev\/analyze\?url=https%3A%2F%2F/.test(link.href),
      "C3l und er zeigt auf die gemessene Adresse, sauber kodiert (" + (link && link.href.slice(0, 72)) + "…)");
    ok(!!link && link.ziel === "_blank" && /noopener/.test(link.rel) && /noreferrer/.test(link.rel),
      "C3m neuer Tab, mit noopener/noreferrer wie jeder Außen-Link");
    ok(/können die Zahlen ein paar Punkte von unseren abweichen/.test(d.text),
      "C3n und es steht ehrlich dabei, dass Google neu misst und leicht abweichen kann");

  }

  // C3b — Escape schließt, der Fokus kehrt zum Knopf zurück.
  {
    await page.keyboard.press("Escape");
    const zu = await page.evaluate(() => ({
      weg: !document.getElementById("mkMessOv"),
      fokus: document.activeElement && document.activeElement.className || ""
    }));
    ok(zu.weg, "C4 Escape schließt das Fenster und räumt es aus dem Dokument");
    ok(/mk-ms-btn/.test(zu.fokus), "C4b und der Fokus kehrt auf den Knopf zurück, der geöffnet hat");
  }

  // C4c — eine unverschlüsselte Adresse bekommt GAR KEINEN Link zum Prüfdienst.
  // Ein Marktplatz, der http-Adressen an einen Dienst weiterreicht, hilft
  // niemandem — und der Wächter meldet so einen Eintrag ohnehin schon gelb.
  {
    const p5 = await browser.newPage();
    await p5.route("**/assets/config/spore-stand.json*", (r) => r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ eintraege: { "markt-bookledgerpro": { lage: "gleich", messung: {
        stand: "gemessen", leistung: 90, bedienbarkeit: 90, gute_praxis: 90, auffindbarkeit: 90,
        gemessen: "2026-08-02", url: "http://unverschluesselt.example/" } } } })
    }));
    await p5.goto(base + "/markt.html", { waitUntil: "load" });
    await p5.waitForSelector(".listing .mk-ms-btn", { timeout: 20000 });
    await p5.click(".listing .mk-ms-btn");
    await p5.waitForSelector("#mkMessOv[open]", { timeout: 10000 });
    const l = await p5.evaluate(() => ({
      link: !!document.querySelector("#mkMessOv a[href*='pagespeed']"),
      zahlen: /90/.test(document.getElementById("mkMessOv").textContent)
    }));
    ok(l.zahlen && !l.link, "C4d bei einer http-Adresse: Zahlen ja, Link zum Prüfdienst nein");
    await p5.close();
  }

  // C5 — der Schieberegler. GEGENPROBE 4 hing hier.
  {
    const titel = karten.map((x) => x.titel);
    ok(!titel.some((t) => /Mein[- ]Tresor/i.test(t)),
      "C5 der Eintrag mit Leistung 34 fällt unter der Schwelle 50 heraus");
    ok(titel.some((t) => /BookLedger/i.test(t)), "C5b der mit 94 bleibt");
    const j = karten.find((x) => /Jason/i.test(x.titel));
    ok(!!j && j.leer, "C5c der NICHT gemessene bleibt gelistet und sagt ehrlich „noch nicht gemessen“");
  }

  // C6 — zwei verschiedene Nichts, und sie sehen unterschiedlich aus.
  // Klaus' Befund 2026-08-01: „ich sehe gar nichts." Der Bericht lag vor,
  // stammte aber von VOR dem Bau und trug kein `messung`. Ein Besucher konnte
  // nicht unterscheiden, ob nicht gemessen wurde oder ob es die Messung
  // überhaupt nicht gibt.
  {
    // (a) Bericht da, aber ohne `messung` -> der Platz ist da und sagt es.
    const p2 = await browser.newPage();
    await p2.route("**/assets/config/spore-stand.json*", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ eintraege: { "markt-bookledgerpro": { lage: "gleich", wache: { ampel: "gruen", grund: "unveraendert" } } } }) }));
    await p2.goto(base + "/markt.html", { waitUntil: "load" });
    await p2.waitForSelector(".listing .mk-mess--leer", { timeout: 20000 }).catch(() => {});
    const z = await p2.evaluate(() => ({
      karten: document.querySelectorAll(".listing").length,
      leer: document.querySelectorAll(".mk-mess--leer").length,
      knopf: document.querySelectorAll(".mk-ms-btn").length,
      text: (document.querySelector(".mk-mess--leer") || {}).textContent || ""
    }));
    ok(z.karten > 0 && z.leer === z.karten,
      "C6 Bericht ohne Messung -> jede Karte sagt es (" + z.leer + " von " + z.karten + ")");
    ok(/Noch nicht gemessen/.test(z.text), "C6b und zwar im Klartext („" + z.text.trim() + "“)");
    ok(z.knopf === 0, "C6c aber ohne Knopf — es gibt ja nichts nachzulesen");
    await p2.close();

    // (b) GAR KEIN Bericht -> der Marktplatz sieht aus wie immer. Ein Wächter,
    // der die Seite verändert, wenn er selbst ausfällt, wäre schlimmer als keiner.
    const p3 = await browser.newPage();
    await p3.route("**/assets/config/spore-stand.json*", (r) => r.fulfill({ status: 404, body: "no" }));
    await p3.goto(base + "/markt.html", { waitUntil: "load" });
    await p3.waitForSelector(".listing", { timeout: 20000 });
    const z3 = await p3.evaluate(() => ({
      karten: document.querySelectorAll(".listing").length,
      mess: document.querySelectorAll(".mk-mess").length,
      links: document.querySelectorAll(".listing a.ext").length
    }));
    ok(z3.karten > 0 && z3.mess === 0, "C6d ohne Bericht gar kein Band (" + z3.karten + " Karten)");
    ok(z3.links === z3.karten, "C6e und alle Links funktionieren wie bisher");
    await p3.close();
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

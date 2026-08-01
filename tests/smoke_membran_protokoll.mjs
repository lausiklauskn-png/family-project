/* Headless-Smoke für Modul 15 Sub (e) — das Fremdzugriff-Protokoll.
 *   node tests/smoke_membran_protokoll.mjs
 *
 * HERKUNFT: die Regel steht im Sage-Kanon (src/modules/15_membran.js), dieser
 * Test ist die Kopie von dort (tests/smoke_bau15c_protokoll.mjs), auf die
 * hiesigen Pfade gestellt. Er läuft hier mit, weil family-projekt.de das Modul
 * NICHT byte-1:1 trägt: die Datei ist ein bewusster Fork (eigener A5-Antwort-
 * pfad mit Synonym-Karte, kein queryJudge). Die Protokoll-Pflege wurde deshalb
 * als Delta aufgesetzt statt überschrieben — und genau darum wird sie hier
 * nachgemessen und nicht nur in Sage.
 *
 * ANLASS, und der ist echt. Am 2026-08-01 stand im DuckDuckGo-Browser die
 * FREMD-Lampe auf Rot. Klaus klickte sie an und las genau das hier:
 *
 *     membrane-postmessage   origin: —   decision: ignored
 *
 * Die Membran hatte also etwas gefangen und richtig abgewiesen — der erste
 * Live-Beleg, dass sie im Feld etwas Echtes fängt. Aber WER gesendet hat, stand
 * nicht da. Und „ignored" deckt vier verschiedene Sachlagen ab, die alle gleich
 * aussehen. Klaus' Wort: „es soll mehr zu lesen sein — wer hat zugegriffen,
 * wann, unter welchen Umständen."
 *
 * Dieser Test misst beides: dass die Auskunft da ist, UND dass die PII-Grenze
 * hält. Das zweite ist der wichtigere Teil — ein Protokoll, das mehr erzählt,
 * ist genau der Ort, an dem versehentlich etwas landet, das dort nicht hingehört.
 *
 * Was NICHT geprüft wird, und das ehrlich: ob DuckDuckGos KI der Absender war.
 * Der Test kann nur zeigen, dass die Membran die Frage künftig beantwortbar
 * macht. Wer es wirklich war, sagt erst Klaus' nächster Blick ins Fenster.
 *
 * Gegenproben beim Bauen, jede einzeln rot bekommen:
 *   1. `grund` aus dem Typ-Mismatch-Zweig entfernt -> Fall 2 fiel durch: alle
 *      vier Abweis-Arten sahen wieder gleich aus. Genau Klaus' Befund.
 *   2. In `feldNamen` die Werte statt der Namen aufgenommen -> Fall 6 fiel
 *      durch. Das ist die Probe, die es wirklich braucht.
 *   3. Die Ziffern-Maskierung in `kurzText` entfernt -> Fall 7 fiel durch: eine
 *      Kontonummer stand im Protokoll.
 *   4. Den Deckel MESSAGE_FIELDS_MAX aufgehoben -> Fall 8 fiel durch.
 */
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

function makeStubGlobal() {
  const stub = {};
  const listeners = { message: [] };
  stub.location = { origin: "https://eigene-zelle.example" };
  stub.addEventListener = function (type, cb) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(cb);
  };
  stub.removeEventListener = function (type, cb) {
    const i = (listeners[type] || []).indexOf(cb);
    if (i >= 0) listeners[type].splice(i, 1);
  };
  stub.__send = function (event) {
    for (const cb of listeners.message.slice()) { try { cb(event); } catch (e) { console.error(e); } }
  };
  stub.document = null;                       // kein DOM — Lampe/Modal optional
  stub.navigator = { userAgent: "SmokeTest/1.0 (Node)", storage: { estimate: async () => ({ usage: 1, quota: 2 }) } };
  // Die „Umstände": eine Uhr, die etwas meldet, und ein sichtbarer Tab.
  stub.performance = { now: () => 1234 };
  stub.crypto = webcrypto;
  stub.btoa = (s) => Buffer.from(s, "binary").toString("base64");
  stub.atob = (s) => Buffer.from(s, "base64").toString("binary");
  stub.console = console;
  stub.setTimeout = setTimeout; stub.clearTimeout = clearTimeout;
  stub.BroadcastChannel = undefined;
  stub.TextEncoder = TextEncoder; stub.TextDecoder = TextDecoder;
  stub.Date = Date; stub.JSON = JSON; stub.Math = Math; stub.Promise = Promise;
  stub.Map = Map; stub.Array = Array; stub.Object = Object;
  stub.opener = null;
  stub.frames = { length: 0 };
  stub.MessageEvent = function (type, init) {
    this.type = type;
    this.origin = (init && init.origin) || "";
    this.data = init && init.data;
    this.source = (init && init.source) || null;
  };
  return { stub };
}

function loadModuleInto(g, relPath) {
  const src = readFileSync(resolve(repoRoot, relPath), "utf8");
  const wrapped = new Function(
    "window", "globalThis", "self", "console",
    "crypto", "btoa", "atob", "TextEncoder", "TextDecoder",
    "navigator", "document", "addEventListener", "removeEventListener",
    "setTimeout", "clearTimeout", "BroadcastChannel", "MessageEvent",
    "Date", "JSON", "Math", "Promise", "Map", "Array", "Object", "performance",
    src
  );
  wrapped(
    g, g, g, console, g.crypto, g.btoa, g.atob, g.TextEncoder, g.TextDecoder,
    g.navigator, g.document, g.addEventListener.bind(g), g.removeEventListener.bind(g),
    g.setTimeout, g.clearTimeout, g.BroadcastChannel, g.MessageEvent,
    g.Date, g.JSON, g.Math, g.Promise, g.Map, g.Array, g.Object, g.performance
  );
}

const { stub: g } = makeStubGlobal();
loadModuleInto(g, "sbkim/15_membran.js");
const M = g.SbkimMembrane;
if (!M) throw new Error("SbkimMembrane wurde nicht registriert");
await M.init({ lampSelector: null, mountModal: false, allowedOrigins: ["https://freund.example"] });

const senden = (data, origin, source) => {
  M.fremdzugriff.clear();
  // Absichtlich KEIN `||`: der leere origin ist Klaus' eigentlicher Fall und
  // darf nicht versehentlich durch einen Standardwert ersetzt werden.
  var o = (origin === undefined) ? "https://fremd.example" : origin;
  g.__send(new g.MessageEvent("message", { origin: o, data, source: source || null }));
  const l = M.fremdzugriff.list();
  return l[l.length - 1] || null;
};

console.log("Modul 15 Sub (e) — das Fremdzugriff-Protokoll");

// 1 — Klaus' Fall, nachgestellt: eine browser-eigene Nachricht ohne Herkunft.
{
  const e = senden({ type: "duckduckgo-message", action: "ping", id: "x1" }, "");
  ok(!!e && e.kind === "membrane-postmessage" && e.decision === "ignored",
    "1 die Membran fängt und weist ab — wie im Feld am 2026-08-01");
  ok(!!e && e.details && e.details.grund === "fremder-typ",
    "1b und sagt jetzt WARUM (" + (e && e.details && e.details.grund) + ")");
  ok(!!e && e.details.typ === "duckduckgo-message",
    "1c wofür sich die Nachricht ausgab (" + (e && e.details.typ) + ")");
}

// 2 — die vier gleich aussehenden Fälle sind auseinanderzuhalten. GEGENPROBE 1.
{
  const a = senden({ type: "duckduckgo-message" }, "https://fremd.example");
  const b = senden({ type: "sbkim/membrane/v1", op: "query", nonce: "n1" }, "https://fremd.example");
  const c = senden({ type: "sbkim/membrane/v1", op: "query" }, "https://freund.example");
  const d = senden({ type: "sbkim/membrane/v1", op: "handshake", nonce: "n2" }, "https://freund.example");
  const gruende = [a, b, c, d].map((x) => x && x.details && x.details.grund);
  ok(gruende[0] === "fremder-typ" && gruende[1] === "nicht-erlaubt" && gruende[2] === "kein-nonce" && gruende[3] === "unbekannte-op",
    "2 vier verschiedene Abweis-Gründe, vier verschiedene Meldungen (" + gruende.join(" · ") + ")");
  ok(new Set(gruende).size === 4, "2b und keine zwei davon lesen sich gleich");
}

// 3 — WER hat gesendet.
{
  const rahmen = {};
  g.frames = { length: 1, 0: rahmen };
  const e1 = senden({ type: "fremd" }, "", rahmen);
  ok(e1.details.absender === "eingebetteter-rahmen", "3 ein eingebetteter Rahmen wird als solcher benannt");
  g.frames = { length: 0 };
  const opener = {};
  g.opener = opener;
  const e2 = senden({ type: "fremd" }, "", opener);
  ok(e2.details.absender === "oeffnendes-fenster", "3b das öffnende Fenster ebenso");
  g.opener = null;
  const e3 = senden({ type: "fremd" }, "", {});
  ok(e3.details.absender === "anderes-fenster", "3c und alles andere ehrlich als „anderes Fenster“");
  const e4 = senden({ type: "fremd" }, "");
  ok(e4.details.absender === "unbekannt", "3d kein Absender-Fenster -> „unbekannt“, nicht geraten");
}

// 4 — WANN und unter welchen Umständen.
{
  const e = senden({ type: "fremd" }, "");
  ok(e.details.nachLadenMs === 1234, "4 wie lange nach dem Laden (" + e.details.nachLadenMs + " ms)");
  ok(e.details.sichtbar === null || e.details.sichtbar === undefined,
    "4b ohne Sichtbarkeits-Auskunft steht das Feld gar nicht erst da");
}

// 5 — der Klartext, den Klaus im Fenster liest.
{
  const e = senden({ type: "duckduckgo-message", action: "ping" }, "");
  const t = M._meta.erklaerung(e);
  ok(/nicht für SBKIM bestimmt/.test(t), "5 der Satz nennt den Grund im Klartext");
  ok(/duckduckgo-message/.test(t), "5b und wofür sich die Nachricht ausgab");
  ok(/Herkunft: nicht feststellbar/.test(t) && /Erweiterungen/.test(t),
    "5c der Strich aus Klaus' Befund wird ausgeschrieben statt jedes Mal neu erraten");
  ok(/nach dem Laden/.test(t), "5d und wann sie kam");
  ok(t.length > 150, "5e „es soll mehr zu lesen sein“ — und es steht auch etwas da (" + t.length + " Zeichen)");
}

// 6 — die PII-Grenze: NUR Namen, nie Werte. GEGENPROBE 2.
{
  const e = senden({ type: "fremd", kunde: "Erika Mustermann", mail: "erika@example.org" }, "");
  const roh = JSON.stringify(e);
  ok(Array.isArray(e.details.felder) && e.details.felder.indexOf("kunde") >= 0,
    "6 die Feld-NAMEN stehen im Protokoll (" + (e.details.felder || []).join(",") + ")");
  ok(roh.indexOf("Erika") < 0 && roh.indexOf("example.org") < 0,
    "6b die WERTE nicht — kein Name, keine Adresse im Eintrag");
}

// 7 — Text-Nachrichten: gekappt und Ziffern maskiert. GEGENPROBE 3.
{
  const e = senden("Überweisung an DE89370400440532013000 von Herrn M.", "");
  ok(e.details.form === "text" && typeof e.details.text === "string", "7 eine reine Text-Nachricht wird als solche erkannt");
  ok(!/\d/.test(e.details.text), "7b jede Ziffernfolge ist ersetzt („" + e.details.text + "“)");
  ok(e.details.text.length <= 49, "7c und der Auszug ist gekappt (" + e.details.text.length + " Zeichen)");
}

// 8 — Deckel auf der Feld-Liste. GEGENPROBE 4.
{
  const viele = { type: "fremd" };
  for (let i = 0; i < 30; i++) viele["f" + i] = i;
  const e = senden(viele, "");
  ok(e.details.felder.length <= 8, "8 höchstens acht Feld-Namen (" + e.details.felder.length + ")");
  ok(e.details.felderMehr > 0, "8b und der Rest wird gezählt, nicht verschwiegen (" + e.details.felderMehr + " weitere)");
  const seltsam = { type: "fremd" };
  seltsam["ein sehr langer Name mit Leerzeichen und <b>Markup</b>"] = 1;
  const e2 = senden(seltsam, "");
  ok(e2.details.felder.indexOf("?") >= 0 && !/Markup/.test(JSON.stringify(e2)),
    "8c ein Name außerhalb des erlaubten Alphabets wird zu „?“, nicht durchgereicht");
}

// 9 — das Protokoll darf nie selbst der Fehler sein.
{
  const boese = { type: "fremd" };
  Object.defineProperty(boese, "kaputt", { enumerable: true, get() { throw new Error("nope"); } });
  let geworfen = false;
  try { senden(boese, ""); } catch (_e) { geworfen = true; }
  ok(!geworfen, "9 ein Objekt, das beim Anfassen wirft, legt die Membran nicht lahm");
}

// 10 — die Pflicht aus CLAUDE.md: Sicherheits-Modul berührt -> Aspekt im Siegel.
{
  const g2 = makeStubGlobal().stub;
  loadModuleInto(g2, "sbkim/16_siegel.js");
  const asp = (g2.SbkimSiegel && g2.SbkimSiegel.getAspects && g2.SbkimSiegel.getAspects()) || [];
  const neu = asp.filter((a) => a.module === "15" && a.since === "2026-08-01");
  ok(neu.length === 1, "10 der Aspekt zu dieser Pflege steht in ZERTIFIKAT_ASPEKTE");
  ok(neu.length === 1 && /Fremdzugriff/i.test(neu[0].aspect), "10b und er nennt, worum es geht (" + (neu[0] && neu[0].aspect) + ")");
}

console.log(`\nErgebnis: ${pass} bestanden, ${fail} durchgefallen`);
process.exit(fail ? 1 : 0);

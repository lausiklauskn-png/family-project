#!/usr/bin/env node
/* ============================================================================
 * Family Projekt — den Inhalt der Werkzeug-Seiten in die Seiten BACKEN.
 *
 * ⛔ WARUM ES DAS GIBT — die Tafel, nicht die Bequemlichkeit.
 *
 * Gemessen am 2026-09-22, sichtbarer Text ohne Skripte:
 *
 *     188 Zeichen   werkzeuge/andock-werkzeug.html
 *     188 Zeichen   werkzeuge/ki-schulung.html
 *     188 Zeichen   werkzeuge/knoten-werkzeug.html
 *     190 Zeichen   werkzeuge/such-werkzeug.html
 *
 * Das sind Navigation und Fusszeile, sonst nichts. Der ganze Rumpf entstand
 * erst im Browser aus `assets/tool-landing.js`. Fuer einen Crawler, der kein
 * JavaScript ausfuehrt — und das sind nach ausgewerteten Zugriffsdaten GPTBot,
 * ClaudeBot und PerplexityBot durchgehend —, waren diese vier Seiten LEER.
 * Und sie standen dabei in der Sitemap.
 *
 * Die Tafel des Plans sagt: KEIN SICHTBARER INHALT HAENGT AN JAVASCRIPT.
 *
 * ⚠ EINE QUELLE, NICHT ZWEI. Gebacken wird mit DERSELBEN Funktion, die der
 * Browser ruft (`FPToolLanding.seiteHtml`). Ein Nachbau waere eine zweite
 * Fassung desselben Markups; sie liefen auseinander, und dann spraenge die
 * Seite im Augenblick des ersten Neuzeichnens, weil die gebackene anders hoch
 * ist als die gezeichnete. Dasselbe Muster wie assets/karte.js.
 *
 * ⚠ DIE LISTE WIRD GEFUNDEN, NICHT GEPFLEGT. Jede Datei unter `werkzeuge/`,
 * die ein `<main id="toolMain">` traegt, ist dabei. Eine gepflegte Liste macht
 * denselben Fehler wie ein vergessener Eintrag, nur dauerhaft — und niemand
 * merkt es, weil eine gepflegte Liste immer vollstaendig AUSSIEHT.
 *
 * ⚠ GEBACKEN WIRD DEUTSCH. `FP.getLang()` gibt es in Node nicht, und eine
 * Sprache zu erraten waere schlimmer als eine zu benennen. Der Browser zeichnet
 * beim Sprachwechsel neu (`fp:lang`), also bekommt ein Mensch weiter beide
 * Sprachen; eine Suchmaschine liest die deutsche. Die englischen Adressen sind
 * ein eigener Schritt (Plan § Vorgemerkt: Englisch).
 *
 * ⚠ ES WIRD NICHT FAIL-SOFT GESCHWIEGEN. Laesst sich `FP_TOOL` nicht lesen,
 * bricht der Lauf ab. Eine still leer gebliebene Seite ist genau der Fehler,
 * gegen den dieses Werkzeug gebaut ist — sie saehe aus wie erledigte Arbeit.
 *
 *   node tools/werkzeug-seiten.mjs            schreiben
 *   node tools/werkzeug-seiten.mjs --pruefen  nur nachsehen (Rueckgabewert 2 bei Abweichung)
 * ========================================================================== */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => readFileSync(join(WURZEL, p), "utf8");

/* Die Marken sagen dem naechsten Leser, dass hier nichts von Hand steht. */
export const MARKE_AUF = "<!-- GEBACKEN von tools/werkzeug-seiten.mjs — nicht von Hand aendern, der Inhalt steht in FP_TOOL -->";
export const MARKE_ZU = "<!-- /GEBACKEN -->";

/** Jede Werkzeug-Seite mit einem `toolMain` — gefunden, nicht gepflegt. */
export function seitenFinden() {
  return readdirSync(join(WURZEL, "werkzeuge"))
    .filter((n) => n.endsWith(".html"))
    .map((n) => "werkzeuge/" + n)
    .filter((p) => /<main\s+id="toolMain"/.test(lies(p)))
    .sort();
}

/**
 * Das `FP_TOOL` aus der Seite holen.
 * ⚠ Ausgewertet wird der Skript-Block, nicht mit einem Muster zerlegt — ein
 * Objekt-Literal mit verschachtelten Klammern und Anfuehrungszeichen laesst
 * sich nicht zuverlaessig mit einem regulaeren Ausdruck lesen. Derselbe Weg,
 * den `eintraege()` fuer listings.js seit jeher geht.
 */
export function toolAus(html, wo) {
  const bloecke = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    .filter((q) => /window\.FP_TOOL\s*=/.test(q));
  if (bloecke.length !== 1) {
    throw new Error(`${wo}: genau EIN Skript-Block muss window.FP_TOOL setzen, gefunden: ${bloecke.length}`);
  }
  const fenster = {};
  new Function("window", bloecke[0]).call(fenster, fenster);
  if (!fenster.FP_TOOL) throw new Error(`${wo}: FP_TOOL blieb leer`);
  return fenster.FP_TOOL;
}

/** `assets/config/spenden.js` genauso lesen — sonst backte der Lauf den
 *  "bald"-Platzhalter, waehrend der Browser den scharfen Knopf zeigt. */
export function spendenLesen() {
  const fenster = {};
  new Function("window", lies("assets/config/spenden.js")).call(fenster, fenster);
  return fenster.FP_SPENDEN || {};
}

/** Den Zeichner in Node laden. Er traegt seit dem 2026-09-22 einen DOM-Riegel
 *  um seinen Selbstlauf, deshalb geht das ohne `document`. */
export function zeichnerLaden() {
  const fenster = { addEventListener() {} };
  new Function("window", "document", lies("assets/tool-landing.js") + "\n;window.FPToolLanding=window.FPToolLanding;")
    .call(fenster, fenster, undefined);
  if (!fenster.FPToolLanding || typeof fenster.FPToolLanding.seiteHtml !== "function") {
    throw new Error("assets/tool-landing.js gibt kein FPToolLanding.seiteHtml heraus");
  }
  return fenster.FPToolLanding.seiteHtml;
}

/** Den gebackenen Rumpf in die Seite setzen. Gibt die neue Seite zurueck. */
export function einsetzen(html, rumpf, wo) {
  const m = /(<main\s+id="toolMain"[^>]*>)([\s\S]*?)(<\/main>)/i.exec(html);
  if (!m) throw new Error(`${wo}: kein <main id="toolMain"> gefunden`);
  const neu = `${m[1]}\n${MARKE_AUF}\n${rumpf}\n${MARKE_ZU}\n  ${m[3]}`;
  return html.slice(0, m.index) + neu + html.slice(m.index + m[0].length);
}

export function baue() {
  const seiteHtml = zeichnerLaden();
  const sp = spendenLesen();
  return seitenFinden().map((p) => {
    const roh = lies(p);
    const T = toolAus(roh, p);
    const rumpf = seiteHtml(T, "de", sp);
    if (!rumpf || rumpf.length < 500) throw new Error(`${p}: der gebackene Rumpf ist zu duenn (${rumpf ? rumpf.length : 0} Zeichen)`);
    return { pfad: p, alt: roh, neu: einsetzen(roh, rumpf, p), zeichen: rumpf.length };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pruefen = process.argv.includes("--pruefen");
  let ab = 0;
  for (const s of baue()) {
    if (s.alt === s.neu) { console.log(`  = ${s.pfad} (${s.zeichen} Zeichen)`); continue; }
    ab++;
    if (pruefen) console.log(`  ≠ ${s.pfad} weicht ab (${s.zeichen} Zeichen gebacken)`);
    else { writeFileSync(join(WURZEL, s.pfad), s.neu); console.log(`  ✎ ${s.pfad} (${s.zeichen} Zeichen)`); }
  }
  if (pruefen && ab) { console.log(`❌ ${ab} Seite(n) weichen ab — \`node tools/werkzeug-seiten.mjs\` ausfuehren`); process.exit(2); }
  console.log(pruefen ? "✅ alle Werkzeug-Seiten sind auf dem Stand" : `✅ fertig (${ab} geaendert)`);
}

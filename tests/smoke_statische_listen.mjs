/* Wächter über die statischen Listen (tools/statische-listen.mjs).
 *
 *   node tests/smoke_statische_listen.mjs
 *
 * Prüft NUR das ausgelieferte HTML — kein Browser, kein JavaScript. Das ist
 * der Punkt: gemessen wird, was ein Crawler sieht, bevor irgendein Skript
 * gelaufen ist. Ein Test, der die Seite erst rendern lässt, würde genau die
 * Lücke übersehen, um die es hier geht.
 *
 * Die sechs Prüfungen aus dem Brief, plus die Sitemap:
 *   1 · Zahl gegen Zahl — jeder Eintrag der Datendatei steht als <a href> drin.
 *   2 · Die Adressen stimmen überein, nicht bloß irgendwelche Links.
 *   3 · Rote Ampel → kein statischer Link.
 *   4 · Fremde tragen rel="nofollow ugc", eigene nicht.
 *   5 · Nachbauen und vergleichen — wer die Datendatei ändert und das
 *       Neubauen vergisst, wird rot.
 *   6 · Zweimal bauen ändert nichts (Idempotenz).
 *   7 · Jede Adresse in der sitemap.xml zeigt auf eine Datei, die es gibt.
 *
 * JEDE dieser Prüfungen ist gegengeprüft worden (Lehre 5 in
 * forschung/LEHREN.md: „Ein Wächter ohne Gegenprobe ist nur ein grüner
 * Haken"). Die Gegenproben stehen im PR und in docs/ — sie werden hier nicht
 * automatisch gefahren, weil sie die Seiten absichtlich kaputt machen.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANFANG, ENDE, EIGENE_HOSTS,
  leseConfig, leseWache, markteintraege, werkzeugeintraege,
  marktHtml, werkzeugeHtml, einsetzen, safeUrl, istEigenerHost
} from "../tools/statische-listen.mjs";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lies = (f) => fs.readFileSync(path.join(WURZEL, f), "utf8");

let pass = 0, fail = 0;
function ok(bedingung, text) {
  if (bedingung) { pass++; console.log("  ✓", text); }
  else { fail++; console.log("  ✗", text); }
}

/* Nur der statische Block, nicht die ganze Seite. Sonst zählt man die
 * Vorlagen-Zeichenketten im JavaScript mit und der Test wird grün, weil er
 * das Falsche gefunden hat. */
function block(html) {
  const a = html.indexOf(ANFANG), e = html.indexOf(ENDE);
  return a < 0 || e < 0 ? "" : html.slice(a + ANFANG.length, e);
}

/* Alle <a>-Tags eines Blocks als { href, rel, target }. */
function links(text) {
  return [...text.matchAll(/<a\b([^>]*)>/g)].map((m) => {
    const attr = (n) => (m[1].match(new RegExp(`\\b${n}="([^"]*)"`)) || [, ""])[1];
    return { href: attr("href"), rel: attr("rel"), target: attr("target") };
  });
}

console.log("Family Projekt — statische Listen");

const wache = leseWache();
const listings = leseConfig("listings.js").FP_LISTINGS || [];
const tools = leseConfig("werkzeuge.js").FP_WERKZEUGE || [];
const markt = markteintraege(listings, wache);
const werkz = werkzeugeintraege(tools);

/* ── markt.html ────────────────────────────────────────────────────────────── */
console.log("\nmarkt.html");
{
  const html = lies("markt.html");
  const b = block(html);
  ok(b.length > 0, "der statische Block steht zwischen den Marken");

  const gefunden = links(b);
  const sollLinks = markt.filter((e) => e.url);

  // 1 · Zahl gegen Zahl.
  ok(gefunden.length === sollLinks.length,
    `${sollLinks.length} Einträge mit Link erwartet, ${gefunden.length} gefunden`);

  // 2 · Adresse für Adresse, nicht „mindestens einer".
  const fehlend = sollLinks.filter((e) => !gefunden.some((l) => l.href === e.url));
  ok(fehlend.length === 0,
    fehlend.length ? `nicht verlinkt: ${fehlend.map((e) => e.label).join(", ")}`
                   : "jede Adresse aus listings.js steht als <a href> im HTML");

  // …und nichts Zusätzliches, das in der Datendatei gar nicht steht.
  const erlaubt = new Set(sollLinks.map((e) => e.url));
  const fremdLink = gefunden.filter((l) => !erlaubt.has(l.href));
  ok(fremdLink.length === 0,
    fremdLink.length ? `Link ohne Eintrag in listings.js: ${fremdLink.map((l) => l.href).join(", ")}`
                     : "kein Link im HTML, der nicht aus listings.js stammt");

  // 3 · Rote Ampel → kein Link. Der Eintrag selbst bleibt sichtbar.
  const rot = markt.filter((e) => e.aufEis);
  const rotVerlinkt = rot.filter((e) => {
    const url = safeUrl(listings.find((x) => x.anchorId === e.anchorId)?.url);
    return url && gefunden.some((l) => l.href === url);
  });
  ok(rotVerlinkt.length === 0,
    rot.length ? `${rot.length} Eintrag/Einträge auf Eis, keiner davon verlinkt`
               : "kein Eintrag steht auf Eis (nichts zu prüfen — die Regel ist gegengeprüft)");
  for (const e of rot) {
    ok(b.includes(`>${e.label}<`), `Eintrag auf Eis bleibt sichtbar: ${e.label}`);
  }

  // 4 · Fremde bürgt niemand.
  let relOk = true, relFehler = [];
  for (const e of sollLinks) {
    const l = gefunden.find((x) => x.href === e.url);
    if (!l) continue;
    const hatNofollow = /\bnofollow\b/.test(l.rel) && /\bugc\b/.test(l.rel);
    const hatNoopener = /\bnoopener\b/.test(l.rel);
    const hatNoreferrer = /\breferrer\b/.test(l.rel);
    if (!hatNoopener) { relOk = false; relFehler.push(`${e.label}: noopener fehlt`); }
    if (e.eigen && hatNofollow) { relOk = false; relFehler.push(`${e.label}: eigen, aber nofollow`); }
    if (e.eigen && hatNoreferrer) { relOk = false; relFehler.push(`${e.label}: eigen, aber noreferrer`); }
    if (!e.eigen && !hatNofollow) { relOk = false; relFehler.push(`${e.label}: fremd, aber kein nofollow ugc`); }
    if (!e.eigen && !hatNoreferrer) { relOk = false; relFehler.push(`${e.label}: fremd, aber kein noreferrer`); }
  }
  ok(relOk, relOk
    ? `rel stimmt bei allen ${sollLinks.length} (eigen: noopener · fremd: nofollow ugc noopener noreferrer)`
    : relFehler.join(" | "));

  // Jeder Außen-Link öffnet im neuen Tab — sonst verlässt der Besucher die Seite.
  ok(gefunden.every((l) => l.target === "_blank"), "alle Markt-Links mit target=\"_blank\"");
}

/* ── werkzeuge.html ────────────────────────────────────────────────────────── */
console.log("\nwerkzeuge.html");
{
  const html = lies("werkzeuge.html");
  const b = block(html);
  ok(b.length > 0, "der statische Block steht zwischen den Marken");

  const gefunden = links(b);
  ok(gefunden.length === werkz.length,
    `${werkz.length} Werkzeug-Kacheln erwartet, ${gefunden.length} gefunden`);

  const fehlend = werkz.filter((w) => !gefunden.some((l) => l.href === w.href));
  ok(fehlend.length === 0,
    fehlend.length ? `nicht verlinkt: ${fehlend.map((w) => w.id).join(", ")}`
                   : "jedes Ziel aus werkzeuge.js steht als <a href> im HTML");

  /* Der eigentliche Gewinn: die eigenen Unterseiten. Bis 2026-08-05 hatten sie
   * genau EINEN statischen Link im ganzen Auftritt. */
  const innen = werkz.filter((w) => !w.extern);
  ok(innen.length >= 4,
    `${innen.length} Links auf eigene Unterseiten (vorher: 1 im ganzen Auftritt)`);
  for (const w of innen) {
    ok(fs.existsSync(path.join(WURZEL, w.href.split("#")[0])),
      `die verlinkte Datei gibt es: ${w.href}`);
  }

  // Falle 7 aus dem Bauwerkzeug: kein fremdes Werkzeug schleicht sich als
  // „eigen" durch. Wird das je verletzt, muss jemand entscheiden — nicht raten.
  const fremdeHosts = werkz.filter((w) => w.extern && !istEigenerHost(w.href));
  ok(fremdeHosts.length === 0,
    fremdeHosts.length
      ? `werkzeuge.js verlinkt einen fremden Host, der als eigen behandelt würde: ` +
        fremdeHosts.map((w) => w.href).join(", ") + ` — erlaubt: ${EIGENE_HOSTS.join(", ")}`
      : "alle externen Werkzeug-Adressen liegen auf Klaus' eigenen Hosts");

  const aussen = gefunden.filter((l) => /^https?:/i.test(l.href));
  ok(aussen.every((l) => /\bnoopener\b/.test(l.rel) && !/\breferrer\b/.test(l.rel)),
    "externe Werkzeug-Links: noopener, kein noreferrer (eigene Apps)");
  ok(gefunden.filter((l) => !/^https?:/i.test(l.href)).every((l) => !l.target),
    "interne Links ohne target — sie bleiben auf der Seite");
}

/* ── 5 + 6 · Nachbauen, vergleichen, zweimal laufen ────────────────────────── */
console.log("\nNachbau und Idempotenz");
{
  for (const [datei, behaelter, neuBlock] of [
    ["markt.html", "mkListings", marktHtml(markt)],
    ["werkzeuge.html", "toolGrid", werkzeugeHtml(werkz)]
  ]) {
    const ist = lies(datei);
    const soll = einsetzen(ist, behaelter, neuBlock);
    // 5 · Passt die Datei zur Datendatei?
    ok(ist === soll,
      ist === soll ? `${datei} ist auf dem Stand der Datendatei`
                   : `${datei} weicht ab — node tools/statische-listen.mjs behebt das`);
    // 6 · Zweimal einsetzen ändert nichts mehr.
    ok(einsetzen(soll, behaelter, neuBlock) === soll,
      `${datei}: zweimal bauen ändert nichts (keine angehäuften Zeilen)`);
  }
}

/* ── 7 · Sitemap ───────────────────────────────────────────────────────────── */
console.log("\nsitemap.xml");
{
  const xml = lies("sitemap.xml");
  const adressen = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  ok(adressen.length >= 12, `${adressen.length} Adressen gelistet (vor 2026-08-05: 4)`);

  /* Eine Sitemap, die auf 404 zeigt, ist schlimmer als eine kurze — sie kostet
   * Vertrauen bei genau der Stelle, der man etwas beweisen will. */
  const tot = [];
  for (const a of adressen) {
    const rel = a.replace(/^https?:\/\/family-projekt\.de\/?/, "") || "index.html";
    if (!fs.existsSync(path.join(WURZEL, rel))) tot.push(a);
  }
  ok(tot.length === 0,
    tot.length ? `Sitemap zeigt auf Dateien, die es nicht gibt: ${tot.join(", ")}`
               : "jede Adresse der Sitemap zeigt auf eine Datei, die es gibt");

  const doppelt = adressen.filter((a, i) => adressen.indexOf(a) !== i);
  ok(doppelt.length === 0,
    doppelt.length ? `doppelt in der Sitemap: ${doppelt.join(", ")}` : "keine Adresse doppelt");

  /* Die vier Werkzeug-Unterseiten sind der Grund, warum die Sitemap überhaupt
   * angefasst wurde. Wenn eine davon wieder herausfällt, soll es auffallen. */
  for (const p of ["geschenkbox", "such-werkzeug", "andock-werkzeug", "knoten-werkzeug"]) {
    ok(xml.includes(`/werkzeuge/${p}.html`), `Sitemap führt werkzeuge/${p}.html`);
  }
}

console.log(`\n${pass} bestanden, ${fail} durchgefallen.`);
process.exit(fail ? 1 : 0);

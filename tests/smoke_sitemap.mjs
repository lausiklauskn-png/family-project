/* Wächter: die Sitemap ist eine Einladung, die sich nicht widerspricht.
 *   node tests/smoke_sitemap.mjs
 *
 * ⚠ OHNE DIESEN WÄCHTER WÄRE S9 VON SEINEM FEHLEN NICHT ZU UNTERSCHEIDEN.
 * Trügen morgen alle Seiten wieder `noindex`, fielen sie aus der Sitemap
 * heraus, das Werkzeug schriebe sie ohne sie neu — und jede andere Prüfung
 * bliebe grün: „jede Adresse existiert" über drei Adressen, „die Gegenrichtung"
 * über null indexierbare Seiten, „auf dem Stand" trivial wahr. Die Seiten
 * stünden live und unsichtbar da, ohne dass es irgendwo stünde.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seitenFinden, adresseAusPfad, pruefeSeite, bauen } from "../tools/sitemap-bauen.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m, d ? " → " + d : ""); } };

/* ⚠ DIE ADRESSE WIRD IN EINEN DATEIPFAD ZURÜCKGERECHNET, UND ZWAR AN EINER
 * STELLE. Eine Verzeichnis-Adresse (`/apps/x/`) ist auf der Platte
 * `apps/x/index.html`; `existsSync` sagt für das Verzeichnis TRUE (blinder
 * Wächter) und `readFileSync` wirft EISDIR (Absturz mit dem Namen eines
 * Ladefehlers statt dem einer Zusicherung). Beides ist in PWA Toolpoint am
 * 2026-09-21 zugeschnappt. */
export function sitemapDatei(adresse) {
  let rel = adresse.replace(/^https?:\/\/[^/]+\//, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  return rel;
}

/* ══ 1 · der Sammler findet überhaupt etwas ═════════════════════════════════ */
const alle = seitenFinden();
ok(alle.length > 10, "der Sammler findet die Seiten des Depots", `${alle.length} gefunden`);

const urteile = alle.map((p) => pruefeSeite(p, lies(p)));
const drin = urteile.filter((u) => u.drin);
ok(drin.length >= 10, "… und mehr als zehn davon sind indexierbar", `${drin.length}`);

/* ══ 2 · die Sitemap ist auf dem Stand ══════════════════════════════════════ */
const jetzt = lies("sitemap.xml");
ok(jetzt === bauen().text, "die Sitemap ist auf dem Stand der Seiten",
   "`node tools/sitemap-bauen.mjs` ausführen");

const angemeldet = [...jetzt.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

/* ══ 3 · beide Richtungen ═══════════════════════════════════════════════════ */
for (const a of angemeldet) {
  const d = sitemapDatei(a);
  ok(fs.existsSync(path.join(ROOT, d)) && fs.statSync(path.join(ROOT, d)).isFile(),
     `Sitemap-Adresse existiert als Datei: ${a}`, d);
}
for (const u of drin) {
  ok(angemeldet.includes(u.soll), `Sitemap: die indexierbare Seite ${u.pfad} ist angemeldet`, u.soll);
}

/* ══ 4 · keine Adresse widerspricht sich selbst ═════════════════════════════ */
for (const a of angemeldet) {
  const d = sitemapDatei(a);
  if (!fs.existsSync(path.join(ROOT, d))) continue;
  const h = lies(d);
  ok(!/\bnoindex\b/i.test((/<meta[^>]+name=["']robots["'][^>]*>/i.exec(h) || [""])[0]),
     `Sitemap: ${a} trägt KEIN noindex`);
  const can = (/<link[^>]+rel=["']canonical["'][^>]*>/i.exec(h) || [""])[0];
  ok(can.includes(a), `Sitemap: ${a} kanonisiert auf sich selbst`, can.slice(0, 120));
}

/* ══ 5 · die Regeln EINZELN gefragt, an gestellten Lagen ════════════════════
 * ⚠ Am Bestand ist heute jede Seite entweder sauber indexierbar oder trägt
 * `noindex`; die anderen zwei Ausgänge kann er gar nicht erzeugen. Eine
 * Rechnung, die man nicht einzeln fragen kann, kann man auch nicht einzeln
 * gegenprüfen. */
const kopf = (extra) => `<html><head><title>x</title>${extra}</head><body></body></html>`;
const stelle = "sicherheit.html";
const soll = adresseAusPfad(stelle);

ok(pruefeSeite(stelle, kopf(`<meta name="robots" content="noindex, follow"><link rel="canonical" href="${soll}">`)).grund === "noindex",
   "Sitemap-Regel: noindex → raus, und zwar als ABSICHT");
ok(pruefeSeite(stelle, kopf("")).grund === "kein-canonical",
   "Sitemap-Regel: kein Canonical → raus, und zwar als MANGEL");
ok(pruefeSeite(stelle, kopf('<link rel="canonical" href="https://family-projekt.de/woanders.html">')).grund === "fremdes-canonical",
   "Sitemap-Regel: fremdes Canonical → raus");
ok(pruefeSeite(stelle, `<link rel="canonical" href="${soll}">`).grund === "keine-seite",
   "Sitemap-Regel: was kein <html> und kein <head> trägt, ist KEINE SEITE");
ok(pruefeSeite(stelle, kopf(`<link rel="canonical" href="${soll}">`)).drin === true,
   "Sitemap-Regel: sauber kanonisiert und ohne noindex → drin");

/* ⚠ „noindex" UND „kein Canonical" VERLANGEN DAS GEGENTEIL VONEINANDER: das
 * eine ist eine Absicht, das andere ein Mangel an der Seite. Wer beide als
 * „fällt raus" zusammenwirft, kann den Mangel nie melden — und eine
 * indexierbare Seite ohne Canonical stünde live da, ohne dass sie je jemand
 * angemeldet hätte. */
ok(pruefeSeite(stelle, kopf("")).grund !== pruefeSeite(stelle, kopf('<meta name="robots" content="noindex">')).grund,
   "… und die zwei Gründe werden NICHT zusammengeworfen");

/* ══ 6 · das Impressum ist erreichbar, aber nicht eingeladen ════════════════ */
ok(/\bnoindex\b/i.test(lies("impressum.html")), "impressum.html trägt noindex");
ok(!angemeldet.some((a) => a.endsWith("/impressum.html")), "… und steht deshalb NICHT in der Sitemap");
ok(/href="[^"]*impressum\.html"/.test(lies("index.html")), "… bleibt aber von der Startseite verlinkt (§ 5 DDG)");

/* ══ 6b · KEINE VERWAISTE SEITE ═════════════════════════════════════════════
 * ⚠ DEN FUND HAT KLAUS GEMACHT, NICHT EINE PROBE (2026-09-22):
 * „bei PWA Toolpoint gibt es den Button Einzelheiten … in Family Project
 * nicht." Die achtzehn Seiten unter /apps/ standen in der Sitemap und waren
 * von KEINER Seite verlinkt. Eine verwaiste Seite ist für einen Menschen
 * unerreichbar und für Google ein schlechtes Zeichen: sie steht in der
 * Einladung und nirgendwo im Haus.
 *
 * Gemessen wird deshalb die ERREICHBARKEIT, nicht die Anwesenheit des Knopfes:
 * jede angemeldete /apps/-Adresse muss aus dem ausgelieferten HTML heraus
 * verlinkt sein. */
const marktRoh = lies("markt.html");
const appsAdressen = angemeldet.filter((a) => /\/apps\//.test(a));
ok(appsAdressen.length >= 10, "es gibt überhaupt /apps/-Adressen in der Sitemap", `${appsAdressen.length}`);

const verlinkt = new Set([...marktRoh.matchAll(/href="(apps\/[^"]*)"/g)].map((m) => m[1]));
for (const a of appsAdressen) {
  const rel = a.replace(/^https?:\/\/[^/]+\//, "");
  /* ⚠ KEINE AUSNAHME FUER DIE UEBERSICHT. Mein erster Anlauf hat `apps/` hier
   * mit `continue` uebersprungen — und genau sie war dann als EINZIGE verwaist,
   * in BEIDEN Depots. Eine Ausnahme in einem Waechter ist der Ort, an dem der
   * naechste Fund sitzt. */
  ok(verlinkt.has(rel), `keine verwaiste Seite: ${rel} ist von markt.html verlinkt`);
}

/* ⚠ UND DER LAUFZEIT-ZEICHNER MUSS DIESELBE REGEL TRAGEN. Nach einer Suche
 * baut `card(x)` in markt.html die Karten NEU — ohne den Knopf dort
 * verschwände er in dem Augenblick, in dem jemand sucht, und die gebackene
 * Fassung sähe anders aus als die gezeichnete. Genau dieser Unterschied ist
 * von einer Probe auf das gebaute HTML allein NICHT zu sehen. */
ok(/href="apps\/' \+ esc\(x\.anchorId\)/.test(marktRoh) || /apps\/' \+ esc\(x\.anchorId\)/.test(marktRoh),
   "… und der Laufzeit-Zeichner in markt.html baut denselben Knopf");
ok(/mk_details:/.test(marktRoh) && (marktRoh.match(/mk_details:/g) || []).length >= 2,
   "… und er ist in BEIDEN Sprachen beschriftet",
   `${(marktRoh.match(/mk_details:/g) || []).length}× mk_details`);

/* ══ 7 · die Arbeitsabläufe ═════════════════════════════════════════════════
 * ⚠ DIE LISTE DER LÄUFE WIRD GEFUNDEN, NICHT GEPFLEGT. Wer morgen einen
 * zweiten Lauf anlegt, der die statische Liste schreibt, und dabei die
 * Detailseiten vergisst, bekommt eine Karte mit den Zahlen von heute Nacht
 * und eine Detailseite mit denen vom letzten Lauf von Hand — und eine neu
 * freigegebene App NIE eine eigene Seite.
 *
 * ⚠ UND GEBAUT REICHT NICHT, ES MUSS COMMITTET WERDEN. Ein Lauf, dessen
 * Arbeit weggeworfen wird, ist teurer als einer, der gar nicht läuft: er
 * sieht aus, als hätte er gewirkt. */
const laeufe = fs.readdirSync(".github/workflows").filter((n) => n.endsWith(".yml"));
ok(laeufe.length >= 1, "der Sammler findet die Arbeitsabläufe überhaupt", `${laeufe.length}`);
const bauende = laeufe.filter((n) => /tools\/statische-listen\.mjs/.test(lies(".github/workflows/" + n)));
ok(bauende.length >= 1, "… und mindestens einer schreibt die statische Liste", bauende.join(", "));
for (const n of bauende) {
  const y = lies(".github/workflows/" + n);
  ok(/tools\/detailseiten\.mjs/.test(y), `${n}: baut auch die Detailseiten`);
  ok(/tools\/werkzeug-seiten\.mjs/.test(y), `${n}: backt auch die Werkzeug-Seiten`);
  ok(/tools\/sitemap-bauen\.mjs/.test(y), `${n}: baut auch die Sitemap`);
  /* ⚠ KOMMENTARE RAUS, BEVOR GESUCHT WIRD. Der erste Anlauf traf die Zeile
   * „# `git add <pfad>` statt `git add -A`." — einen ERKLÄRTEXT — und hörte
   * dort auf; der echte Befehl zwei Zeilen tiefer wurde nie gelesen. Ein
   * Wächter, der Prosa mitliest, misst nicht, was er zu messen glaubt.
   * Dieselbe Falle wie beim Caddyfile-Leser eine Datei weiter. */
  const ohneProsa = y.split("\n").filter((z) => !/^\s*#/.test(z)).join("\n");
  const gadd = (ohneProsa.match(/git add(?:[^\n]*\\\n)*[^\n]*/g) || []).join(" ");
  ok(/\bapps\b/.test(gadd) && /\bsitemap\.xml\b/.test(gadd) && /\bwerkzeuge\b/.test(gadd),
     `${n}: … und committet sie`, gadd.slice(0, 160));
  /* ⚠ DIE REIHENFOLGE IST DIE ZUSICHERUNG, NICHT DIE ANWESENHEIT: die Sitemap
   * LIEST die gebauten Seiten. Stünde sie davor, lüde sie den Stand von
   * gestern ein — und alle vier Zeilen darüber blieben grün. */
  ok(y.indexOf("tools/sitemap-bauen.mjs") > y.indexOf("tools/detailseiten.mjs") &&
     y.indexOf("tools/sitemap-bauen.mjs") > y.indexOf("tools/werkzeug-seiten.mjs"),
     `${n}: … und die Sitemap steht NACH den Seiten, die sie liest`);
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

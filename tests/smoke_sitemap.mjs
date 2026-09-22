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

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

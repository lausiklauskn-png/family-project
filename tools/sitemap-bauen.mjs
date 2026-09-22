/* ── DIE SITEMAP WIRD GEFUNDEN, NICHT GEPFLEGT (2026-09-22) ──────────────────
 *
 *   node tools/sitemap-bauen.mjs             schreibt sitemap.xml
 *   node tools/sitemap-bauen.mjs --pruefen   meldet nur, ob sie auf dem Stand ist
 *
 * Bis heute stand sie von Hand da: dreizehn Adressen, eingetippt. Mit den
 * Detailseiten unter /apps/ wären es über dreißig — und eine von Hand
 * gepflegte Liste macht denselben Fehler wie ein vergessener Eintrag, nur
 * dauerhaft und unsichtbar, weil eine gepflegte Liste immer vollständig
 * AUSSIEHT.
 *
 * Dieses Netz hat die Lehre mehrfach bezahlt: der Kanon-Verteiler in Sage
 * (BookLedgerPro fiel aus einem Rollout), die Mess-Liste hier (2026-09-21),
 * und der Sprachriegel-Block in PWA Toolpoint, der 26 Seiten nie gesehen hat.
 *
 * ── DIE VIER BEDINGUNGEN, und sie werden GEMESSEN statt angenommen ──────────
 *
 *   1 · es gibt die Datei wirklich        → sie wird gefunden, nicht genannt
 *   2 · sie antwortet mit HTTP 200        → statisch ausgeliefert heisst:
 *                                           die Datei IST die Antwort
 *   3 · sie trägt KEIN `noindex`          → aus dem `<meta name="robots">`
 *                                           GELESEN, nicht aus einer Liste
 *   4 · sie kanonisiert auf SICH SELBST   → das `<link rel="canonical">` muss
 *                                           mit der abgeleiteten Adresse
 *                                           übereinstimmen
 *
 * ⚠ BEDINGUNG 4 IST DER GRUND, WARUM DIE ADRESSE AUS DEM CANONICAL KOMMT und
 * nicht aus dem Dateipfad. Nähme man den Pfad, stünde `/index.html` in der
 * Sitemap, während die Seite auf `/` kanonisiert — eine Einladung zu einer
 * Adresse, die selbst sagt, sie sei nicht die richtige.
 *
 * ── ZWEI GEMESSENE WIDERSPRÜCHE, die dieses Werkzeug aufräumt (2026-09-22) ──
 *
 *   · `impressum.html` stand in der Sitemap UND trug `noindex` — eine
 *     Einladung und eine Absage zugleich. Es bleibt erreichbar und von jeder
 *     Seite verlinkt (§ 5 DDG verlangt Erreichbarkeit, nicht Indexierung),
 *     steht nur nicht mehr in der Einladung.
 *   · `sicherheit.html` stand darin OHNE Canonical. Das ist kein Vorsatz,
 *     sondern ein Mangel an der Seite — und deshalb wird er BEIM NAMEN
 *     GENANNT, statt still zu verschwinden.
 *
 * ⚠ „noindex" UND „kein Canonical" VERLANGEN DAS GEGENTEIL VONEINANDER: das
 * eine ist eine Absicht, das andere ein Mangel. Wer beide als „fällt raus"
 * zusammenwirft, kann den Mangel nie melden.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative, sep } from "node:path";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASIS = "https://family-projekt.de";
const lies = (p) => readFileSync(join(WURZEL, p), "utf8");

/* Verzeichnisse, die NICHT zur ausgelieferten Seite gehören.
 * Das ist keine gepflegte Seiten-Liste, sondern eine Grenze zwischen Werkstatt
 * und Auslieferung — jedes mit eigenem Grund:
 *   tools/     · Werkzeuge und Vorlagen (`vorlagen/detail.html` trägt {{…}})
 *   tests/     · Proben
 *   docs/      · Doku, kein Auftritt
 *   server/    · PHP, von Caddy gesperrt (handle /server/*)
 *   node_modules, .git, .github · offensichtlich */
const NICHT_SEITE = new Set(["tools", "tests", "docs", "server", "node_modules", ".git", ".github"]);

export function seitenFinden(wurzel = WURZEL) {
  const aus = [];
  const gehe = (rel) => {
    const abs = rel ? join(wurzel, rel) : wurzel;
    for (const d of readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = rel ? `${rel}/${d.name}` : d.name;
      if (d.isDirectory()) {
        if (!NICHT_SEITE.has(d.name) && !d.name.startsWith(".")) gehe(p);
      } else if (d.name.endsWith(".html")) {
        aus.push(p);
      }
    }
  };
  gehe("");
  return aus;
}

/* Aus dem Dateipfad die Adresse, unter der die Seite WIRKLICH ausgeliefert
   wird — ein Verzeichnis endet auf einem Schrägstrich, `index.html` fällt weg.
   Genau diese Form muss das Canonical tragen. */
export function adresseAusPfad(pfad) {
  const p = String(pfad).split(sep).join("/");
  if (p === "index.html") return `${BASIS}/`;
  if (p.endsWith("/index.html")) return `${BASIS}/${p.slice(0, -"index.html".length)}`;
  return `${BASIS}/${p}`;
}

export function robotsAus(html) {
  const m = /<meta\s+name="robots"\s+content="([^"]*)"/i.exec(html);
  return m ? m[1] : "";
}
export function canonicalAus(html) {
  const m = /<link\s+rel="canonical"\s+href="([^"]*)"/i.exec(html);
  return m ? m[1] : "";
}

export function rang(pfad) {
  const p = String(pfad).split(sep).join("/");
  if (p === "index.html") return { changefreq: "weekly", priority: "1.0" };
  if (p === "markt.html" || p === "apps/index.html") return { changefreq: "weekly", priority: "0.8" };
  if (p.startsWith("apps/")) return { changefreq: "monthly", priority: "0.6" };
  return { changefreq: "monthly", priority: "0.8" };
}

/* Die Entscheidung je Seite, EINZELN fragbar. Eine Rechnung, die man nicht
   einzeln fragen kann, kann man auch nicht einzeln gegenprüfen — deshalb gibt
   sie den GRUND zurück, nicht nur ja/nein. */
export function pruefeSeite(pfad, html) {
  const soll = adresseAusPfad(pfad);

  /* ⚠ ERST: IST DAS ÜBERHAUPT EINE SEITE?
   *
   * `google9616ba6b6bbe62ad.html` ist die Bestätigungsdatei der Search Console —
   * 54 Bytes Klartext mit `.html` am Namen, kein `<html>`, kein `<head>`, kein
   * Titel. Ohne diese Frage meldete der Lauf sie als „kein-canonical", also als
   * MANGEL AN EINER SEITE — und das ist eine falsche Anklage: es ist keine.
   *
   * Eine Ausnahme NACH NAMEN wäre wieder etwas zu Pflegendes, und sie machte
   * denselben Fehler wie ein vergessener Eintrag, nur dauerhaft. Gefragt wird
   * deshalb der INHALT: was kein `<html` und kein `<head` trägt, ist keine Seite.
   * Das deckt jede weitere Bestätigungsdatei von selbst mit. */
  if (!/<html[\s>]/i.test(html) && !/<head[\s>]/i.test(html)) {
    return { pfad, drin: false, grund: "keine-seite", soll };
  }

  const robots = robotsAus(html);
  if (/\bnoindex\b/i.test(robots)) return { pfad, drin: false, grund: "noindex", soll };
  const can = canonicalAus(html);
  if (!can) return { pfad, drin: false, grund: "kein-canonical", soll };
  if (can !== soll) return { pfad, drin: false, grund: "fremdes-canonical", soll, can };
  return { pfad, drin: true, grund: "indexierbar", soll: can, ...rang(pfad) };
}

const KOPF = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  ⚠ DIESE DATEI WIRD GEBAUT, NICHT VON HAND GEPFLEGT.

      node tools/sitemap-bauen.mjs

  Die Seiten werden GEFUNDEN, und jede muss VIER Bedingungen erfüllen: die
  Datei gibt es · sie antwortet mit 200 · sie trägt kein \`noindex\` · sie
  kanonisiert auf sich selbst. Die Adresse kommt AUS dem Canonical — damit ist
  die vierte Bedingung gemessen statt behauptet.

  Eine Sitemap ist eine EINLADUNG. Eine Adresse, die eingeladen wird und
  gleichzeitig \`noindex\` trägt, ist eine Einladung und eine Absage zugleich.

  Nicht hier, und jedes aus eigenem Grund: \`impressum.html\` trägt \`noindex\`
  (§ 5 DDG verlangt Erreichbarkeit, nicht Indexierung) · eine Seite ohne
  Canonical fällt heraus und wird beim Namen genannt, weil das ein MANGEL ist
  und keine Absicht.

  \`tests/smoke_sitemap.mjs\` prüft in BEIDE Richtungen: jede Adresse hier gibt
  es als Datei, und keine indexierbare Seite fehlt.
-->
`;

export function sitemapText(seiten) {
  const zeilen = seiten.map((s) =>
    `  <url>\n    <loc>${s.soll}</loc>\n    <changefreq>${s.changefreq}</changefreq>\n    <priority>${s.priority}</priority>\n  </url>`);
  return `${KOPF}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${zeilen.join("\n")}\n</urlset>\n`;
}

/* Sortiert nach Gewicht, dann nach Adresse — sonst stünde die Startseite
   mitten in der Liste, weil alphabetisch gefunden wird. An der Wirkung ändert
   das nichts (eine Sitemap ist eine Menge), aber eine Datei, die ein Mensch
   aufmacht, soll lesbar sein. */
export function bauen() {
  const befunde = seitenFinden().map((p) => pruefeSeite(p, lies(p)));
  const drin = befunde.filter((b) => b.drin)
    .sort((a, b) => (Number(b.priority) - Number(a.priority)) || a.soll.localeCompare(b.soll));
  return { befunde, drin, text: sitemapText(drin) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { befunde, drin, text } = bauen();
  for (const m of befunde.filter((b) => b.grund === "kein-canonical" || b.grund === "fremdes-canonical")) {
    console.log(`  ⊘ ${m.pfad} fehlt in der Sitemap — ${m.grund}${m.can ? ` (zeigt auf ${m.can})` : ""}`);
  }
  const alt = existsSync(join(WURZEL, "sitemap.xml")) ? lies("sitemap.xml") : "";
  if (process.argv.includes("--pruefen")) {
    if (alt === text) {
      console.log(`✅ sitemap.xml ist auf dem Stand (${drin.length} Adressen)`);
    } else {
      console.log("❌ sitemap.xml weicht ab — `node tools/sitemap-bauen.mjs` ausführen");
      process.exit(2);
    }
  } else {
    writeFileSync(join(WURZEL, "sitemap.xml"), text, "utf8");
    console.log(`✅ sitemap.xml geschrieben (${drin.length} Adressen, ${befunde.length - drin.length} übersprungen)`);
  }
}

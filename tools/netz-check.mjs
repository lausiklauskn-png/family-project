/* Netzweite Prüfung: was findet Google, und was bräuchte der Play Store?
 *
 *   node tools/netz-check.mjs
 *
 * Klaus 2026-08-05: „Prüfe bitte alle Tools, ob derartige Anpassungen sinnvoll
 * sind und vorgenommen wurden — vor allem wenn ich diese Apps in native Apps
 * umwandeln möchte oder Google-Play-Store-Apps, und die Internetseiten live
 * schalten möchte."
 *
 * Zwei getrennte Fragen, die leicht verwechselt werden:
 *
 *   SUCHMASCHINE — Titel, Beschreibung, canonical, Open Graph, robots, sitemap.
 *     Achtung: Lighthouses SEO-Note prüft nur, DASS eine Beschreibung da ist,
 *     nicht ob sie in ein Suchergebnis passt. Eine Seite kann 100 haben und im
 *     Suchergebnis trotzdem mitten im Satz abgeschnitten werden.
 *
 *   PLAY STORE (TWA) — Manifest mit `id` und `short_name`, Icons 192/512 samt
 *     maskable, ein Service Worker (ohne den ist die Seite NICHT installierbar
 *     und lässt sich nicht paketieren) und `.well-known/assetlinks.json` (ohne
 *     die zeigt die App oben die Browser-Adressleiste — der „native" Eindruck
 *     ist dahin).
 *
 * Liest AUSSCHLIESSLICH `origin/main` — nie den lokalen Arbeitsstand. Ein
 * lokaler Klon kann Monate alt sein.
 *
 * Erster Anlauf war falsch und hat es prompt gezeigt: `/^<title>/m` verlangt
 * den Titel am Zeilenanfang, und die Seiten haben ihn eingerückt. Ergebnis:
 * „Titel FEHLT" für Seiten, die einen haben. Bei `<meta>` ist die Reihenfolge
 * der Angaben ohnehin frei (`content` kann vor `name` stehen). Beides wird
 * jetzt tolerant gelesen.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const AUSGABE = "/tmp/claude-0/-home-user/8a2977b7-8947-56bd-8239-7ce139899f5a/scratchpad/audit.json";

const REPOS = fs.readdirSync("/home/user", { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(`/home/user/${e.name}/.git`))
  .map((e) => e.name).sort();

const zeig = (repo, pfad) => {
  try {
    return execFileSync("git", ["-C", `/home/user/${repo}`, "show", `origin/main:${pfad}`],
      { encoding: "utf8", maxBuffer: 80e6, stdio: ["ignore", "pipe", "ignore"] });
  } catch { return null; }
};
const liste = (repo) => {
  try {
    return execFileSync("git", ["-C", `/home/user/${repo}`, "ls-tree", "-r", "origin/main", "--name-only"],
      { encoding: "utf8", maxBuffer: 20e6, stdio: ["ignore", "pipe", "ignore"] }).split("\n");
  } catch { return []; }
};

const ergebnis = [];
for (const repo of REPOS) {
  const dateien = liste(repo);
  const html = zeig(repo, "index.html");
  if (!html) continue;
  /* HTML-Kommentare zuerst raus. Ein echter Browser ignoriert sie, ein
   * Zeichenketten-Prüfer nicht — und in Mein-WorkFloh steht in einem
   * Erklär-Kommentar der Text `<title>WorkFloh</title>`. Der Prüfer las
   * daraufhin genau den und meldete „kurz" für einen Titel mit 52 Zeichen.
   * Zweiter Fehlalarm desselben Prüfers an einem Tag. */
  const kopf = html.split("</head>")[0].replace(/<!--[\s\S]*?-->/g, "");

  const titel = ((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(kopf) || [])[1] || "").trim();

  /* Jedes <meta>-Element einzeln ansehen, statt eine feste Attribut-Reihenfolge
   * zu erwarten. */
  const metas = kopf.match(/<meta\b[^>]*>/gi) || [];
  const metaWert = (schluessel, art) => {
    for (const m of metas) {
      const nameRe = new RegExp(art + "\\s*=\\s*[\"']" + schluessel + "[\"']", "i");
      if (!nameRe.test(m)) continue;
      const c = /content\s*=\s*"([\s\S]*?)"/i.exec(m) || /content\s*=\s*'([\s\S]*?)'/i.exec(m);
      return c ? c[1].trim() : "";
    }
    return "";
  };

  const mPfad = dateien.find((f) => /^(app-)?manifest\.(webmanifest|json)$/.test(f));
  let man = null;
  if (mPfad) { try { man = JSON.parse(zeig(repo, mPfad) || "{}"); } catch { man = {}; } }
  const iconGr = Array.isArray(man && man.icons) ? man.icons.map((i) => String(i.sizes || "")).join(" ") : "";
  const maskable = Array.isArray(man && man.icons) && man.icons.some((i) => /maskable/i.test(String(i.purpose || "")));

  const besch = metaWert("description", "name");

  ergebnis.push({
    repo,
    titel, titelLen: titel.length,
    besch: besch.length,
    canonical: /rel\s*=\s*["']canonical["']/i.test(kopf),
    og: ["og:title", "og:description", "og:url", "og:image"].filter((k) => metaWert(k, "property")).length,
    lang: (/<html[^>]*lang\s*=\s*["']([^"']+)["']/i.exec(html) || [])[1] || "",
    robots: dateien.includes("robots.txt"),
    sitemap: dateien.includes("sitemap.xml"),
    manifest: mPfad || "",
    mName: !!(man && man.name), mShort: !!(man && man.short_name), mId: !!(man && man.id),
    mDisplay: (man && man.display) || "", mBesch: !!(man && man.description),
    mScreens: Array.isArray(man && man.screenshots) ? man.screenshots.length : 0,
    icon192: /\b192x192\b/.test(iconGr), icon512: /\b512x512\b/.test(iconGr), maskable,
    sw: dateien.some((f) => /^(sw|app-sw|sbkim-sw|service-worker)\.js$/.test(f)),
    assetlinks: dateien.some((f) => f.includes(".well-known/assetlinks.json"))
  });
}
fs.writeFileSync(AUSGABE, JSON.stringify(ergebnis, null, 1));

const j = (b) => (b ? "✓" : "·");
console.log(`\n${ergebnis.length} Repos mit index.html auf origin/main geprüft.`);

console.log("\n═══ SUCHMASCHINE — was Google von der Startseite sieht ═══\n");
console.log("Repo                        Titel    Beschr   canon  OG   robots sitemap");
for (const r of ergebnis) {
  const t = r.titelLen === 0 ? "FEHLT " : r.titelLen < 13 ? "kurz  "
    : r.titelLen > 62 ? String(r.titelLen) + "!  " : " ok   ";
  const b = r.besch === 0 ? "FEHLT " : r.besch > 165 ? (String(r.besch) + "!").padEnd(6)
    : r.besch < 80 ? (String(r.besch) + "?").padEnd(6) : " ok   ";
  console.log(r.repo.padEnd(27), t, " ", b, " ", j(r.canonical), "  ",
    r.og + "/4", " ", j(r.robots), "    ", j(r.sitemap));
}

console.log("\n═══ PLAY STORE / native App (TWA) — was ein Store-Paket braucht ═══\n");
console.log("Repo                        Manif name short  id  display     192 512 mask  SW  assetlinks");
for (const r of ergebnis) {
  console.log(r.repo.padEnd(27), j(!!r.manifest), " ", j(r.mName), " ", j(r.mShort), "  ",
    j(r.mId), " ", (r.mDisplay || "—").padEnd(11), j(r.icon192), "  ", j(r.icon512), "  ",
    j(r.maskable), "  ", j(r.sw), " ", j(r.assetlinks));
}

/* Der harte Riegel zuerst: ohne Service Worker ist eine Seite nicht
 * installierbar, und dann lässt sie sich auch nicht paketieren. Ein Manifest
 * ohne Service Worker sieht dagegen fertig aus — das ist die Falle. */
const riegel = ergebnis.filter((r) => r.manifest && !r.sw);
if (riegel.length) {
  console.log("\n⚠ Manifest da, aber KEIN Service Worker — nicht installierbar, nicht paketierbar:");
  for (const r of riegel) console.log("   " + r.repo);
}
const ohneManifest = ergebnis.filter((r) => !r.manifest);
if (ohneManifest.length) {
  console.log("\n· Ohne Manifest (für den Store wäre alles neu zu bauen):");
  console.log("   " + ohneManifest.map((r) => r.repo).join(", "));
}
console.log("");

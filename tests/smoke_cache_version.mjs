/* Wächter gegen den vergessenen Cache-Bump.
 *   node tests/smoke_cache_version.mjs
 *
 * Warum es diesen Test gibt (2026-07-31): Der Melde-Knopf bekam neue Regeln in
 * assets/style.css, CACHE_VERSION in sw.js blieb auf v65. Der Service-Worker
 * lieferte die alte Datei weiter, `position:fixed` kam nie an, und im Browser
 * hing das Melde-Fenster unten im Seitenfluss statt zu schweben. Der
 * Seiten-Smoke war 22/22 grün, weil er ohne Service-Worker läuft.
 *
 * Der Test vergleicht den Arbeitsstand mit origin/main: wurde eine Datei aus
 * der CORE-Liste des Service-Workers geändert, MUSS sich CACHE_VERSION
 * ebenfalls geändert haben. Rein lesend, kein Netz.
 *
 * Grenze, ehrlich: Der Test greift nur, solange origin/main erreichbar ist.
 * Ohne git-Vergleich meldet er das und hält nicht auf (fail-soft).
 */
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

function git(...args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}
function versionOf(text) {
  const m = /CACHE_VERSION\s*=\s*"([^"]+)"/.exec(text);
  return m ? m[1] : null;
}
/* Die CORE-Liste aus dem Service-Worker selbst lesen, damit der Test nicht
 * veraltet, wenn jemand eine Datei aufnimmt oder herausnimmt. */
function coreListOf(text) {
  const m = /var\s+CORE\s*=\s*\[([\s\S]*?)\]/.exec(text);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)]
    .map((x) => x[1])
    /* Der Versions-Anhang MUSS weg, bevor verglichen wird (Befund 2026-08-01).
     * In CORE steht "assets/app.js?v=77", git meldet "assets/app.js" — der
     * Vergleich `core.includes(datei)` traf deshalb NIE zu. Ausgerechnet die
     * beiden meistgeänderten Dateien, style.css und app.js, waren damit von der
     * Prüfung ausgenommen: der Wächter meldete brav „nichts zu prüfen", während
     * genau das Gegenteil stimmte. Derselbe Fehlertyp wie bei den
     * Playwright-Umleitungen, die an einem angehängten ?ts= zerbrechen. */
    .map((p) => p.split("?")[0])
    .filter((p) => p !== "./" && !p.startsWith("http"));
}

console.log("Service-Worker — Cache-Version");

const swNow = readFileSync(resolve(repoRoot, "sw.js"), "utf8");
const verNow = versionOf(swNow);
const core = coreListOf(swNow);

ok(!!verNow, `CACHE_VERSION lesbar (${verNow})`);
ok(core.length > 0, `CORE-Liste gelesen (${core.length} Dateien)`);
ok(core.some((p) => p.startsWith("assets/style.css")), "assets/style.css steht in CORE (wird gecacht)");
/* status-widget.js stand weder in CORE noch trug es ein ?v= (Befund
 * 2026-08-01): es hing frei am HTTP-Cache des Browsers, den niemand bustet.
 * Eine Änderung daran wäre auf Klaus' Tablet unter Umständen nie angekommen. */
ok(core.includes("assets/status-widget.js"), "assets/status-widget.js steht in CORE (wird gecacht)");

/* ---- Versions-Anhang der Assets (?v=NN) -------------------------------------
 * Ohne geänderte Adresse sieht ein Besucher nach einem Deploy die neue Seite mit
 * dem ALTEN Aussehen — genau das ist am 2026-07-31 passiert. Ein Service-Worker
 * hilft nicht, weil der HTTP-Cache vor ihm greift. Darum: ?v=NN an jeder
 * Asset-Adresse, überall dieselbe Zahl.
 *
 * Korrektur 2026-08-01: Hier stand „Caddy liefert mit sieben Tagen aus
 * (Caddyfile.example)". Am Server nachgemessen — diese Regel gab es dort nie.
 * Caddy setzt für CSS/JS gar keinen Cache-Header, der Browser rät dann selbst
 * (etwa ein Zehntel des Datei-Alters). Der Test bleibt richtig, nur die
 * Begründung war es nicht. */
const assetV = (/var\s+ASSET_V\s*=\s*"(\d+)"/.exec(swNow) || [])[1];
const verNum = (/(\d+)\s*$/.exec(verNow || "") || [])[1];
ok(!!assetV, `ASSET_V lesbar (${assetV})`);
ok(assetV === verNum, `ASSET_V passt zur CACHE_VERSION (${assetV} = ${verNum})`);

/* ---- Der Versions-Anhang IN der CORE-Liste (Befund 2026-08-19) -------------
 *
 * `coreListOf()` oben streift das `?v=` bewusst ab, bevor es vergleicht — das
 * war gegen einen anderen Fehler richtig (git meldet Dateinamen ohne Anhang).
 * Die Nebenwirkung: die Zahl in CORE wurde von NIEMANDEM geprüft. Sie stand
 * deshalb auf `?v=98`, während jede Seite `?v=103` anforderte.
 *
 * Das ist kein Schönheitsfehler. Für den Cache sind `style.css?v=98` und
 * `style.css?v=103` ZWEI verschiedene Einträge: der Service-Worker lud beim
 * Installieren drei Dateien in den Vorrat, die keine Seite je anfragt — und
 * genau die, die sie braucht, lagen nicht darin. Ein Erstbesucher, der sofort
 * offline geht, bekam eine Seite ohne Gestaltung.
 *
 * Wieder derselbe Fehlertyp wie die anderen dieser Woche: ein Wächter, der
 * grün ist, weil er an der Stelle absichtlich wegsieht, an der es bricht.
 * Deshalb hier eine eigene Prüfung, die die ROHE Liste ansieht. */
{
  const rohCore = (/var\s+CORE\s*=\s*\[([\s\S]*?)\]/.exec(swNow) || [])[1] || "";
  const falsch = [...rohCore.matchAll(/"([^"]+\?v=(\d+))"/g)]
    .filter((m) => m[2] !== assetV)
    .map((m) => m[1]);
  ok(falsch.length === 0,
    falsch.length === 0
      ? `alle ?v= in der CORE-Liste tragen ${assetV}`
      : `CORE-Liste hängt auf alter Version: ${falsch.join(", ")} (erwartet ?v=${assetV}) — der Vorrat holt dann Adressen, die keine Seite anfragt`);
}

const htmlFiles = [];
for (const dir of [repoRoot, resolve(repoRoot, "werkzeuge")]) {
  for (const f of readdirSync(dir)) if (f.endsWith(".html")) htmlFiles.push(resolve(dir, f));
}
const wrong = [];
let refs = 0;
for (const f of htmlFiles) {
  const t = readFileSync(f, "utf8");
  /* mycel-bg.js seit 2026-08-02 mit in der Liste: Die Datei stand weder in
   * CORE noch trug sie ein ?v= — sie hing frei am HTTP-Cache, den niemand
   * bustet. Nach dem Einbau der Selbst-Bremse wäre die Änderung auf neun von
   * zehn Seiten womöglich nie angekommen (Caddy setzt keinen Cache-Header,
   * dann rät der Browser selbst). Derselbe Fehlertyp wie am 2026-08-01 bei
   * status-widget.js. Der Pfad-Teil erlaubt ../, weil die Seiten unter
   * werkzeuge/ eine Ebene tiefer liegen. */
  /* studio-markt.js + vec-codec.js seit 2026-08-03 mit in der Liste — dritter
   * Fall desselben Fehlers. Beide standen fest auf ?v=84, während alles andere
   * bei 89 war, und keine der beiden steht in CORE. Sie hingen damit frei am
   * HTTP-Cache. Real passiert: das Studio bekam die Fähigkeit, von Hand
   * eingetragene Werte anzuzeigen — im Browser blieb die alte Datei, und Klaus
   * sah dort weiter Leistung 46, während die Karte daneben 94 zeigte. Der Test
   * war grün, weil er genau diese zwei Dateien nicht ansah. */
  for (const m of t.matchAll(/(?:href|src)="[^"]*assets\/(style\.css|app\.js|status-widget\.js|mycel-bg\.js|studio-markt\.js|vec-codec\.js)(\?v=(\d+))?"/g)) {
    refs++;
    if (m[3] !== assetV) wrong.push(`${f.replace(repoRoot + "/", "")}: assets/${m[1]}${m[2] || " (ohne ?v=)"}`);
  }
}
ok(refs > 0, `Asset-Verweise in HTML gefunden (${refs})`);
ok(wrong.length === 0,
  wrong.length === 0
    ? `alle ${refs} Verweise tragen ?v=${assetV}`
    : `Verweise mit falscher/fehlender Version: ${wrong.slice(0, 4).join(" · ")}`);

let base = null;
try { git("rev-parse", "--verify", "origin/main"); base = "origin/main"; }
catch { /* kein Remote greifbar */ }

if (!base) {
  console.log("  · origin/main nicht greifbar — Vergleich übersprungen (fail-soft)");
} else {
  let changed = [];
  try {
    changed = git("diff", "--name-only", base, "--").split("\n").filter(Boolean);
  } catch { changed = []; }

  const touchedCore = changed.filter((f) => core.includes(f));
  const swChanged = changed.includes("sw.js");

  /* ---- Geänderte ?v=-Assets, die NICHT in CORE stehen ---------------------
   * Der Wächter oben prüft nur die CORE-Liste. studio-markt.js und
   * vec-codec.js stehen dort nicht — sie hängen allein an ihrer ?v=-Adresse.
   * Ändert man ihren Inhalt, ohne ASSET_V zu erhöhen, bleibt die Adresse
   * gleich und der Browser liefert weiter die alte Datei aus. Genau das ist am
   * 2026-08-03 passiert (die neue Studio-Fassung kam nie an) — und beinahe ein
   * zweites Mal in derselben Sitzung. Ohne diese Prüfung merkt es niemand:
   * jeder andere Test ist grün, weil er ohne HTTP-Cache läuft. */
  const versAssets = ["assets/studio-markt.js", "assets/vec-codec.js"];
  const touchedVers = changed.filter((f) => versAssets.includes(f) && !core.includes(f));
  if (touchedVers.length) {
    let assetVBase = null;
    try { assetVBase = (/var\s+ASSET_V\s*=\s*"(\d+)"/.exec(git("show", `${base}:sw.js`)) || [])[1]; }
    catch { /* egal */ }
    console.log(`  · geänderte ?v=-Assets ausserhalb CORE: ${touchedVers.join(", ")}`);
    ok(assetVBase != null && assetV !== assetVBase,
      `ASSET_V erhöht (${assetVBase} → ${assetV}) — sonst käme die Änderung nie an`);
  }

  if (touchedCore.length === 0) {
    console.log("  · keine CORE-Datei gegenüber origin/main geändert — nichts zu prüfen");
    ok(true, "kein Cache-Bump nötig");
  } else {
    console.log(`  · geänderte CORE-Dateien: ${touchedCore.join(", ")}`);
    let verBase = null;
    try { verBase = versionOf(git("show", `${base}:sw.js`)); } catch { /* egal */ }
    ok(swChanged, "sw.js wurde mitgeändert (Cache-Bump erforderlich)");
    ok(verBase !== null && verNow !== verBase,
      `CACHE_VERSION erhöht (${verBase} → ${verNow})`);
  }
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

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
    .filter((p) => p !== "./" && !p.startsWith("http"));
}

console.log("Service-Worker — Cache-Version");

const swNow = readFileSync(resolve(repoRoot, "sw.js"), "utf8");
const verNow = versionOf(swNow);
const core = coreListOf(swNow);

ok(!!verNow, `CACHE_VERSION lesbar (${verNow})`);
ok(core.length > 0, `CORE-Liste gelesen (${core.length} Dateien)`);
ok(core.some((p) => p.startsWith("assets/style.css")), "assets/style.css steht in CORE (wird gecacht)");

/* ---- Versions-Anhang der Assets (?v=NN) -------------------------------------
 * Caddy liefert CSS/JS mit sieben Tagen Browser-Cache aus (Caddyfile.example:55),
 * HTML nur mit 300 s. Ohne geänderte Adresse sieht ein Besucher nach einem Deploy
 * also die neue Seite mit dem ALTEN Aussehen — genau das ist am 2026-07-31
 * passiert. Ein Service-Worker hilft nicht, weil der HTTP-Cache vor ihm greift.
 * Darum: ?v=NN an jeder Asset-Adresse, überall dieselbe Zahl. */
const assetV = (/var\s+ASSET_V\s*=\s*"(\d+)"/.exec(swNow) || [])[1];
const verNum = (/(\d+)\s*$/.exec(verNow || "") || [])[1];
ok(!!assetV, `ASSET_V lesbar (${assetV})`);
ok(assetV === verNum, `ASSET_V passt zur CACHE_VERSION (${assetV} = ${verNum})`);

const htmlFiles = [];
for (const dir of [repoRoot, resolve(repoRoot, "werkzeuge")]) {
  for (const f of readdirSync(dir)) if (f.endsWith(".html")) htmlFiles.push(resolve(dir, f));
}
const wrong = [];
let refs = 0;
for (const f of htmlFiles) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/(?:href|src)="[^"]*assets\/(style\.css|app\.js)(\?v=(\d+))?"/g)) {
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

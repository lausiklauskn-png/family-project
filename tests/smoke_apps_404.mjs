/* Wächter: eine erfundene Adresse unter /apps/ bekommt NICHT die Startseite.
 *   node tests/smoke_apps_404.mjs
 *
 * WARUM ES DIESEN WÄCHTER GIBT (2026-09-22, S9 für family-projekt.de):
 *
 * Diese Seite läuft nicht auf GitHub Pages, sondern auf Klaus' Hetzner-Server
 * hinter Caddy. Der Auffang-Block dort beantwortet JEDE unbekannte Adresse mit
 * der Startseite und HTTP 200:
 *
 *     handle { try_files {path} {path}/ /index.html   file_server }
 *
 * Für die Startseite und ihre Sprungmarken ist das richtig. Für die
 * App-Detailseiten unter /apps/ ist es der SOFT-404, und der ist teuer: eine
 * Sitemap mit zwanzig Adressen, von denen jede mit 200 antwortet — auch die,
 * die es nicht gibt —, ist schlechter als gar keine. Google ordnet solche
 * Seiten als Duplikat der Startseite ein und bewertet die Domain schlechter.
 *
 * ⚠ DIE ZUSICHERUNG IST DIE REIHENFOLGE, NICHT DIE ANWESENHEIT. handle-Blöcke
 * in Caddy schließen sich gegenseitig aus: der erste passende gewinnt. Steht
 * der /apps/-Block UNTER dem Auffang, ist er wirkungslos — und das fällt
 * niemandem auf, weil die Seiten ja weiter ausgeliefert werden. Nur der
 * 404-Fall geht dann still an die Startseite. Dieselbe Falle wie beim
 * /server/-Block, den Klaus' Verfassung ausdrücklich „VOR dem Auffang"
 * verlangt.
 *
 * ⚠ BENANNTE GRENZE, und sie ist der Kern dieser Datei: GEMESSEN WIRD DIE
 * KONFIGURATION, NICHT DER SERVER. Eine Sitzung hat keinen Zugang zu Klaus'
 * Maschine, und ob Caddy die Datei überhaupt neu gelesen hat, steht hier
 * nicht. Der Nachweis ist ein Befehl, den Klaus fährt:
 *
 *     curl -o /dev/null -w "%{http_code}\n" https://family-projekt.de/apps/gibtesnicht/
 *     → muss 404 sein, nicht 200
 *
 * Das wird hier hingeschrieben statt umfahren: ein Riegel, den keine Probe von
 * seinem Fehlen unterscheiden kann, ist eine Behauptung — hier ist der
 * Nachweis ein Befehl statt einer Probe, und genau das steht dabei.
 *
 * ✅ UND ER IST GEFAHREN — Klaus am 2026-09-21, 23:45 UTC, an seinem Server:
 *
 *     /apps/gibtesnicht/  → 404     (vorher hätte dort 200 gestanden)
 *     /markt.html         → 200     (die Seite läuft unverändert)
 *
 * Der Block steht seitdem in `/opt/relay/Caddyfile` (die Datei, die der
 * Docker-Container `caddy` als `/etc/caddy/Caddyfile` sieht), `caddy validate`
 * meldete „Valid configuration", und die Sicherung liegt daneben als
 * `Caddyfile.bak.apps-20260921-234519`.
 *
 * ⚠ WAS DIESE MESSUNG NICHT SAGT, und es bleibt daneben stehen: sie gilt für
 * den Stand von heute. Wer den Caddyfile später anfasst, misst neu — genau
 * dafür steht der curl-Befehl oben da. Und sie sagt nichts über die
 * Detailseiten selbst: die lagen zum Zeitpunkt der Messung noch gar nicht auf
 * dem Server, `main` trägt sie erst nach dem Merge.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (b, t, zusatz = "") => {
  if (b) { pass++; console.log(`  ✓ ${t}`); }
  else { fail++; console.log(`  ✗ ${t}${zusatz ? `  → ${zusatz}` : ""}`); }
};

const roh = readFileSync(join(WURZEL, "Caddyfile.example"), "utf8");

/* Kommentare raus, BEVOR irgendetwas gesucht wird.
 * Sonst findet jeder Wächter seinen eigenen Erklärtext — die Falle, die in
 * PWA Toolpoint zweimal zugeschnappt hat („der Wächter fand den Namen im
 * Kommentar daneben"). Genau dieser Kopf hier nennt `handle /apps/*` und
 * `try_files` wörtlich. */
const konf = roh.split("\n").map((z) => z.replace(/#.*$/, "")).join("\n");

console.log("═══ Der /apps/-Block gegen den Soft-404 ═══\n");

/* Die handle-Blöcke in der Reihenfolge, in der Caddy sie liest. */
const bloecke = [...konf.matchAll(/^\s*handle(\s+\S+)?\s*\{/gm)]
  .map((m) => ({ muster: (m[1] || "").trim(), stelle: m.index }));

/* ⚠ HIER STAND `>= 3`, und das war eine festgenagelte Zahl statt einer
 * Zusicherung: nimmt jemand den /server/-Block zu Recht heraus (die
 * PHP-Endpunkte liegen ohnehin auf dem Webhosting), wäre diese Zeile rot,
 * OHNE dass eine Zusicherung gefallen wäre. Beim Nachstellen von Hand fiel
 * sie neben dem Wächter, den der Fall wirklich meint.
 * Die Zusicherung ist: der Leser findet die Blöcke überhaupt. Bricht Caddys
 * Syntax oder mein Muster, steht hier eine 0 und diese Zeile nennt den
 * Grund — statt dass drei andere Wächter mit unklaren Namen umfallen. */
ok(bloecke.length >= 1, "der Leser findet die handle-Blöcke überhaupt",
   `${bloecke.length} gefunden`);

const apps = bloecke.findIndex((b) => b.muster === "/apps/*");
const server = bloecke.findIndex((b) => b.muster === "/server/*");
const auffang = bloecke.findIndex((b) => b.muster === "");

ok(apps >= 0, "ein eigener Block für /apps/* steht in der Konfiguration");
ok(auffang >= 0, "der Auffang-Block steht weiter da (sonst wäre die Startseite tot)");

/* DIE Zusicherung. */
ok(apps >= 0 && auffang >= 0 && apps < auffang,
   "… und er steht VOR dem Auffang — sonst ist er wirkungslos",
   `/apps/* an Position ${apps}, Auffang an ${auffang}`);

/* Der Nachbar, den meine Änderung nicht verschoben haben darf. */
ok(server >= 0 && auffang >= 0 && server < auffang,
   "der /server/*-Block steht weiterhin vor dem Auffang",
   `/server/* an Position ${server}, Auffang an ${auffang}`);

/* Und der Inhalt: kein Rückfall auf die Startseite. */
const ende = (von) => {
  let tiefe = 0;
  for (let i = konf.indexOf("{", von); i < konf.length; i++) {
    if (konf[i] === "{") tiefe++;
    else if (konf[i] === "}") { tiefe--; if (tiefe === 0) return i; }
  }
  return konf.length;
};
const appsRumpf = apps >= 0
  ? konf.slice(bloecke[apps].stelle, ende(bloecke[apps].stelle))
  : "";

ok(/\bfile_server\b/.test(appsRumpf),
   "… und er liefert die Dateien wirklich aus (file_server)");
ok(!/\btry_files\b/.test(appsRumpf),
   "… und er fällt auf NICHTS zurück — kein try_files, also ein echtes 404",
   appsRumpf.replace(/\s+/g, " ").trim().slice(0, 120));
ok(!/index\.html/.test(appsRumpf),
   "… und nennt index.html nicht, auch nicht als Rückfall");

/* Die Gegenrichtung: der Auffang DARF und SOLL seinen Rückfall behalten.
 * Ohne diese Zeile wäre „kein try_files" auch dann grün, wenn jemand den
 * Rückfall überall herausnimmt — dann antwortete die Startseite auf
 * /impressum nicht mehr. */
const auffangRumpf = auffang >= 0
  ? konf.slice(bloecke[auffang].stelle, ende(bloecke[auffang].stelle))
  : "";
/* ⚠ HIER STAND `/try_files[^}]*index\.html/`, und es war ROT AUS DEM FALSCHEN
 * GRUND: Caddys eigene Syntax schreibt `{path}`, also steht zwischen
 * `try_files` und `index.html` eine geschweifte Klammer — die Zeichenklasse
 * `[^}]` kommt darüber nicht hinweg. Der Block war tadellos, der Wächter war
 * es nicht. Dieselbe Familie wie das Zeichenfenster in PWA Toolpoint: ein
 * Muster, das den ABSTAND begrenzt, statt die Zusicherung zu messen.
 * Gemessen wird jetzt die Zeile, um die es geht. */
const auffangZeile = auffangRumpf.split("\n").find((z) => /\btry_files\b/.test(z)) || "";
ok(/\/index\.html\s*$/.test(auffangZeile.trim()),
   "der Auffang behält seinen Rückfall auf die Startseite",
   auffangZeile.trim() || "keine try_files-Zeile gefunden");

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

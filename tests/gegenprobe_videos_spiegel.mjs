// Gegenprobe zu tests/smoke_videos_spiegel.mjs (Video-Spiegel, Klaus 2026-10-06).
// Jeder Fall baut in einer WEGWERF-KOPIE einen Fehler ein; die Probe MUSS rot werden,
// und eine rote Zeile muss den Namen der Zusicherung tragen (nicht nur „irgendwas rot").
//
//   node tests/gegenprobe_videos_spiegel.mjs            # alle Fälle
//   NUR_ANKER=1 node tests/gegenprobe_videos_spiegel.mjs # nur prüfen, ob jeder Anker genau einmal trifft
//   NUR_FALL="SHA" node tests/gegenprobe_videos_spiegel.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = "server/videos/spiegeln.mjs";
const C = "server/videos/Caddyfile";
const B = "server/videos/Caddyfile.block";
const E = "server/videos/einrichten.sh";

const FAELLE = [
  { name: "SHA: ein falscher Teil wird übernommen", datei: S,
    anker: "if (r.bytes !== soll.groesse || r.sha !== soll.sha256) {", ersatz: "if (false) {",
    rot: /stimmt nicht … verworfen|falsche Teil liegt nicht im Lager/ },
  { name: "SHA: die Gesamt-SHA wird nicht geprüft", datei: S,
    anker: "zusammengesetzt, aber die Gesamt-SHA-256 stimmt nicht", ersatz: "zusammengesetzt, Prüfung weg",
    rot: /falsche Gesamt-SHA-256/ },
  { name: "304: If-None-Match wird nicht mehr geschickt", datei: S,
    anker: 'if (stand.etag) kopf["If-None-Match"] = stand.etag;', ersatz: "",
    rot: /If-None-Match → 304/ },
  { name: "TEILE: unveränderte Teile werden jedes Mal neu zusammengesetzt", datei: S,
    anker: "if (stand.teile === fingerabdruck && (await groesse(ziel)) === gesamt) {", ersatz: "if (false) {",
    rot: /nicht neu zusammengesetzt/ },
  { name: "LEER: 0 Bytes werden übernommen", datei: S,
    anker: "if (r.bytes === 0) {", ersatz: "if (false) {",
    rot: /leere Datei nicht übernommen/ },
  { name: "NAME: Ordnernamen mit Großbuchstaben gehen durch", datei: S,
    anker: "export const ORDNER_NAME = /^[a-z0-9-]+$/;", ersatz: "export const ORDNER_NAME = /^[A-Za-z0-9-]+$/;",
    rot: /Großbuchstaben → 2/ },
  { name: "PFAD: .. im Quellpfad geht durch", datei: S,
    anker: 't && t !== "." && t !== ".." && ', ersatz: "t && ",
    rot: /Eintrag mit \.\. im Pfad oder Namen/ },
  { name: "HTTPS: eine http-Basis geht durch", datei: S,
    anker: "/^https:\\/\\/[^/]+\\/.*\\/$|^https:\\/\\/[^/]+\\/$/", ersatz: "/^https?:\\/\\/[^/]+\\/.*\\/$|^https?:\\/\\/[^/]+\\/$/",
    rot: /Basis ohne https → 2/ },
  { name: "SPERRE: die Sperre wird ignoriert", datei: S,
    anker: 'const h = await open(pfad, "wx");', ersatz: 'const h = await open(pfad, "w");',
    rot: /frische Sperre: der zweite Lauf hört auf/ },
  { name: "SPERRE: eine alte Sperre wird nie übernommen", datei: S,
    anker: "if (Date.now() - s.mtimeMs > SPERRE_ALT_MS) {", ersatz: "if (false) {",
    rot: /älter als 3 h wird übernommen/ },
  { name: "DOPPELT: ein doppelter Schalter wird still genommen", datei: S,
    anker: "if (process.argv.indexOf(name, i + 1) !== -1) {", ersatz: "if (false) {",
    rot: /--ziel doppelt → 2/ },
  { name: "CADDY: Punkt-Dateien werden ausgeliefert", datei: C,
    anker: "\t\thide .*\n", ersatz: "",
    rot: /versteckt Punkt-Dateien/ },
  { name: "CADDY: CORS für alle", datei: C,
    anker: 'header @erlaubt Access-Control-Allow-Origin "{http.request.header.Origin}"', ersatz: 'header Access-Control-Allow-Origin "*"',
    rot: /CORS nie für \*/ },
  { name: "CADDY: encode im äußeren Block", datei: B,
    anker: "\treverse_proxy videos:80", ersatz: "\tencode gzip\n\treverse_proxy videos:80",
    rot: /kein encode im äußeren Block/ },
  { name: "EINRICHTEN: Rückweg mit cp statt cat >", datei: E,
    anker: 'cat "$BAK_CADDY" > Caddyfile', ersatz: 'cp "$BAK_CADDY" Caddyfile',
    rot: /Rückweg schreibt die Sicherung mit cat >|nie mit sed -i oder cp/ },
  { name: "EINRICHTEN: Cron wird verdoppelt", datei: E,
    anker: "| grep -v videos-spiegel;", ersatz: ";",
    rot: /Cron-Zeile ersetzt sich selbst/ },
];

const nurAnker = !!process.env.NUR_ANKER;
const nurFall = process.env.NUR_FALL || "";
let gefangen = 0, blind = 0, falsch = 0, tot = 0;

function zaehle(text, a) { return text.split(a).length - 1; }

function kopie() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gp-videos-"));
  fs.mkdirSync(path.join(d, "server"), { recursive: true });
  fs.mkdirSync(path.join(d, "tests"), { recursive: true });
  fs.cpSync(path.join(ROOT, "server/videos"), path.join(d, "server/videos"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "tests/smoke_videos_spiegel.mjs"), path.join(d, "tests/smoke_videos_spiegel.mjs"));
  return d;
}

// Ausgangslage: unverändert muss die Probe grün sein, sonst misst die Gegenprobe nichts.
if (!nurAnker) {
  const d = kopie();
  const r = spawnSync(process.execPath, [path.join(d, "tests/smoke_videos_spiegel.mjs")], { encoding: "utf8", timeout: 300000 });
  fs.rmSync(d, { recursive: true, force: true });
  if (r.status !== 0 || !/ · 0 ROT/.test(r.stdout)) {
    console.log("✗ Probe ist schon ohne Eingriff rot — Gegenprobe misst nichts\n" + (r.stdout || "").split("\n").filter((l) => l.includes("✗")).join("\n"));
    process.exit(1);
  }
  console.log("Ausgangslage grün");
}

for (const f of FAELLE) {
  if (nurFall && !f.name.includes(nurFall)) continue;
  const text = fs.readFileSync(path.join(ROOT, f.datei), "utf8");
  const n = zaehle(text, f.anker);
  if (n !== 1) { tot++; console.log(`☠ TOTER ANKER (${n}×): ${f.name}`); continue; }
  if (nurAnker) { console.log(`· Anker lebt: ${f.name}`); continue; }
  const d = kopie();
  fs.writeFileSync(path.join(d, f.datei), text.replace(f.anker, f.ersatz));
  const r = spawnSync(process.execPath, [path.join(d, "tests/smoke_videos_spiegel.mjs")], { encoding: "utf8", timeout: 300000 });
  fs.rmSync(d, { recursive: true, force: true });
  const rote = (r.stdout || "").split("\n").filter((l) => l.trim().startsWith("✗"));
  if (r.status === 0 && rote.length === 0) { blind++; console.log(`✗ BLIND: ${f.name}`); }
  else if (rote.some((l) => f.rot.test(l))) { gefangen++; console.log(`✓ gefangen: ${f.name}`); }
  else { falsch++; console.log(`✗ ROT AUS FALSCHEM GRUND: ${f.name}\n    ${rote.join("\n    ") || "(keine rote Zeile, Rückgabe " + r.status + ")"}`); }
}

console.log(nurAnker ? `\n${FAELLE.length - tot} Anker leben · ${tot} tot`
  : `\n${gefangen} gefangen · ${blind} blind · ${falsch} aus falschem Grund · ${tot} tote Anker`);
process.exit(blind + falsch + tot ? 1 : 0);

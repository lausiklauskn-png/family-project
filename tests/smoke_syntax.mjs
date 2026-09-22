/* ── JEDE JS-DATEI MUSS SICH LADEN LASSEN (2026-09-22) ──────────────────────
 *
 *   node tests/smoke_syntax.mjs
 *
 * Fünfmal in zwei Tagen hat in diesem Netz ein DEUTSCHES Anführungszeichen
 * einen JavaScript-String beendet: `"… „Wort""` → `SyntaxError`. Dreimal
 * steht die Falle in PWA Toolpoints Verfassung aufgeschrieben, zweimal ist
 * sie mir hier trotzdem passiert.
 *
 * ⚠ EINE REGEL, AN DIE MAN SICH ERINNERN MUSS, IST KEINE. `node --check`
 * meldet es in Sekunden — also fährt es eine Probe, nicht ein Vorsatz.
 *
 * ⚠ UND DER SCHADEN IST NICHT DIE ROTE ZEILE. Eine Datei, die sich nicht
 * laden lässt, ist NICHT LAUFFÄHIG — die rote Zeile trägt dann den Namen des
 * Ladefehlers statt den einer Zusicherung, und alle Wächter dahinter messen
 * nichts. Das ist Kimhubs „dritte Art, wie eine Probe nichts misst".
 *
 * ⚠ DIE LISTE WIRD GEFUNDEN, NICHT GEPFLEGT. Eine gepflegte macht denselben
 * Fehler wie ein vergessener Eintrag, nur dauerhaft — und sie sieht dabei
 * immer vollständig aus. */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
/* Werkstatt und Fremdes, jedes mit eigenem Grund:
     node_modules · fremder Code    .git · kein Inhalt
     vendor       · mitgeliefert, nicht von uns */
const AUS = new Set(["node_modules", ".git", "vendor", ".github"]);

function finden(rel = "") {
  const aus = [];
  for (const d of readdirSync(join(WURZEL, rel) || WURZEL, { withFileTypes: true })) {
    if (d.name.startsWith(".") && d.name !== ".claude") continue;
    const p = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) { if (!AUS.has(d.name)) aus.push(...finden(p)); }
    else if (/\.(mjs|js)$/.test(d.name)) aus.push(p);
  }
  return aus;
}

const dateien = finden();
let gruen = 0, rot = 0;
for (const f of dateien) {
  try {
    execFileSync(process.execPath, ["--check", join(WURZEL, f)], { stdio: "pipe" });
    gruen++;
  } catch (e) {
    rot++;
    const z = String(e.stderr || e.message).split("\n").find((l) => /SyntaxError|Error:/.test(l)) || "";
    console.log(`  ✗ ${f} lässt sich nicht laden — ${z.trim()}`);
  }
}
/* ⚠ SELBST-RIEGEL: ohne Dateien misst der Lauf nichts und wäre trivial grün.
 * Die Zahl ist bewusst niedrig und als Untergrenze gemeint, nicht als
 * Vertrag — sie fängt einen kaputten Sammler, nicht eine gelöschte Datei. */
if (dateien.length < 20) {
  rot++;
  console.log(`  ✗ der Sammler hat fast nichts gefunden (${dateien.length}) — der Lauf misst so nichts`);
} else {
  gruen++;
  console.log(`  ✓ der Sammler findet die JS-Dateien des Depots — ${dateien.length} Stück`);
}
console.log(`\n${gruen} grün · ${rot} ROT`);
process.exitCode = rot ? 1 : 0;

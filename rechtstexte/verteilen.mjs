#!/usr/bin/env node
// Kopiert rechtstexte/rechtstexte.html byte-gleich in eine App und schreibt daneben den Pin.
// Aufruf: node rechtstexte/verteilen.mjs <Zieldatei> [--pruefen]
// Pin: <Zieldatei ohne .html>.herkunft.json = { quelle, datei, sha256, stand }.
// --pruefen ändert nichts und endet mit 1, wenn Ziel oder Pin nicht zur Quelle passen.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const quelle = resolve(dirname(fileURLToPath(import.meta.url)), "rechtstexte.html");
const [ziel, schalter] = process.argv.slice(2);
if (!ziel) { console.error("Aufruf: node rechtstexte/verteilen.mjs <Zieldatei> [--pruefen]"); process.exit(2); }
const inhalt = readFileSync(quelle);
const sha256 = createHash("sha256").update(inhalt).digest("hex");
const stand = (inhalt.toString("utf8").match(/Stand: (\d{2}\.\d{2}\.\d{4})/) || [])[1] || "";
const pinDatei = ziel.replace(/\.html?$/, "") + ".herkunft.json";
const pin = { quelle: "lausiklauskn-png/family-project", datei: "rechtstexte/rechtstexte.html", sha256, stand };

if (schalter === "--pruefen") {
  const fehler = [];
  if (!existsSync(ziel)) fehler.push(`fehlt: ${ziel}`);
  else if (createHash("sha256").update(readFileSync(ziel)).digest("hex") !== sha256) fehler.push(`nicht byte-gleich: ${ziel}`);
  if (!existsSync(pinDatei)) fehler.push(`Pin fehlt: ${pinDatei}`);
  else if (JSON.parse(readFileSync(pinDatei, "utf8")).sha256 !== sha256) fehler.push(`Pin veraltet: ${pinDatei}`);
  for (const f of fehler) console.error("✗ " + f);
  if (fehler.length) process.exit(1);
  console.log(`✓ ${ziel} byte-gleich (${sha256.slice(0, 12)}…)`);
} else {
  mkdirSync(dirname(resolve(ziel)), { recursive: true });
  writeFileSync(ziel, inhalt);
  writeFileSync(pinDatei, JSON.stringify(pin, null, 2) + "\n");
  console.log(`✓ ${ziel} geschrieben, Pin ${pinDatei} (${sha256.slice(0, 12)}…, Stand ${stand})`);
}

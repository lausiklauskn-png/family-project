/* smoke_stiller_verlust.mjs — nichts darf still verloren gehen.
 *
 * ANLASS (2026-08-11, Klaus: „die Frage ist, ob es ankommt"): `einreichung.php`
 * verwirft jede Einsendung unter 1500 ms als Bot — UND antwortet dabei mit
 * **200 OK**. Fuer die Seite sieht das aus wie Erfolg: sie zeigt „✓ Danke!",
 * der Absender geht zufrieden weg, angekommen ist nichts.
 *
 * Am Schwester-Marktplatz (PWA Toolpoint) wurde dieser Weg mit 596 ms gemessen.
 * Bei der MELDUNG ist der Freitext freiwillig — aufklappen, Grund antippen,
 * senden, fertig. Das Fenster ist also keine Theorie.
 *
 * Lauf: node tests/smoke_stiller_verlust.mjs   (braucht nichts weiter)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(wurzel, "markt.html"), "utf8");

let bestanden = 0, gefallen = 0;
const pruef = (ok, text) => {
  if (ok) { bestanden++; console.log("  ✓ " + text); }
  else { gefallen++; console.log("  ✗ " + text); }
};

console.log("\n── Stiller Verlust ──");

/* Auf die RECHNUNG pruefen, nicht auf das Wort. Ein Waechter, der nur nachsieht
   ob „warteMindestzeit" irgendwo steht, bleibt gruen, wenn der Rumpf leer ist. */
pruef(/async function warteMindestzeit\(\)\s*\{[\s\S]{0,240}?1600 - \(Date\.now\(\) - FP_T0\)/.test(html),
  "die Wartezeit rechnet wirklich gegen den Ladezeitpunkt");
pruef(/if \(offen > 0\) await new Promise/.test(html),
  "und wartet nur, wenn tatsächlich noch Zeit offen ist");

/* JEDER Sende-Weg muss sie benutzen. Es sind drei: Einreichung, Kontakt,
   Meldung — alle drei schicken fp_elapsed, also gilt der Riegel fuer alle. */
const sende = (html.match(/fp_elapsed: Date\.now\(\) - FP_T0/g) || []).length;
const warte = (html.match(/await warteMindestzeit\(\);/g) || []).length;
pruef(sende >= 3, `${sende} Sende-Wege gefunden (Einreichung · Kontakt · Meldung)`);
pruef(warte === sende,
  `jeder Sende-Weg wartet vorher (${warte} von ${sende})`);

/* Die Wartezeit muss ueber dem Server-Riegel liegen. Steht sie darunter,
   ist sie Kosmetik: der Server wirft trotzdem weg. */
const wert = /1600 - \(Date\.now\(\) - FP_T0\)/.test(html) ? 1600 : 0;
pruef(wert > 1500, `Wartezeit ${wert} ms liegt über dem Server-Riegel von 1500 ms`);

console.log(`\n${bestanden} bestanden, ${gefallen} fehlgeschlagen\n`);
process.exit(gefallen ? 1 : 0);

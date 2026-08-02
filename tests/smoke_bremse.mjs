/* Wächter über die Selbst-Bremse des Mycel-Hintergrunds.
 *   node tests/smoke_bremse.mjs
 *
 * Warum es diesen Test gibt (2026-08-02): Klaus' PageSpeed-Bericht zeigte, dass
 * ALLE zwanzig längsten Aufgaben der Startseite aus assets/mycel-bg.js kamen,
 * je 180-255 ms, zusammen 40 von 42 Sekunden Hauptthread-Arbeit. Nicht das
 * Laden von three.js war das Problem, sondern die Dauer-Renderschleife: ohne
 * Grafikbeschleunigung wird jedes Einzelbild zu einer langen Aufgabe.
 *
 * Die Bremse hält die Schleife an, wenn es dauerhaft zu langsam wird — dann
 * bleibt ein statisches Bild stehen. Auf einem Gerät MIT Grafikchip darf sie
 * NIEMALS greifen, sonst nimmt sie der Seite ohne Not ihre Bewegung.
 *
 * Genau das prüft dieser Test: die Bremsen-Logik gegen echte Bildraten. Er
 * läuft ohne Browser, weil sich auf der Bau-Maschine (kein Grafikchip) das
 * Verhalten auf Klaus' Tablet nicht nachstellen lässt — die LOGIK aber schon.
 *
 * Grenze, ehrlich gesagt: Dieser Test prüft die Regel, nicht das Erlebnis.
 * Ob der Hintergrund auf Klaus' Tablet weiterhin flüssig läuft, sieht nur
 * Klaus. Die Werte werden aus der echten Datei gelesen, damit der Test nicht
 * still veraltet, wenn jemand an den Zahlen dreht.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

console.log("Mycel-Hintergrund — Selbst-Bremse");

const quelle = readFileSync(resolve(repoRoot, "assets/mycel-bg.js"), "utf8");

/* Die drei Zahlen aus der echten Datei lesen, nicht hier doppeln. */
const zahl = (name) => {
  const m = new RegExp(`const\\s+${name}\\s*=\\s*([0-9.]+)`).exec(quelle);
  return m ? Number(m[1]) : null;
};
const SCHWELLE = zahl("BREMS_SCHWELLE");
const GEDULD = zahl("BREMS_GEDULD");
const AUFWAERM = zahl("AUFWAERM_BILDER");

ok(SCHWELLE !== null, `Schwelle gelesen (${SCHWELLE} s je Bild = ${SCHWELLE ? Math.round(1 / SCHWELLE) : "?"} Bilder/s)`);
ok(GEDULD !== null, `Geduld gelesen (${GEDULD} langsame Bilder hintereinander)`);
ok(AUFWAERM !== null, `Aufwärm-Bilder gelesen (${AUFWAERM})`);
/* Auf den ELSE-Zweig prüfen, nicht bloß auf "langsamInFolge = 0" — sonst
 * findet der Test die Zeile `let langsamInFolge = 0` und ist grün, obwohl die
 * Rücksetzung fehlt. Genau das ist bei der Gegenprobe am 2026-08-02 passiert:
 * die Rücksetzung wurde entfernt, der Test blieb 16/16 grün. Ein Test, der
 * seinen Fehler nicht anzeigt, ist keiner. */
ok(/else\s+langsamInFolge\s*=\s*0/.test(quelle),
   "der Zähler wird bei einem schnellen Bild zurückgesetzt (else-Zweig vorhanden — sonst bremste ein einzelner Aussetzer)");

/* Dieselbe Regel wie in der Schleife — gegen echte Bildraten-Verläufe. */
function laeuftWeiter(dts) {
  let langsam = 0, gezaehlt = 0;
  for (const dt of dts) {
    if (gezaehlt++ >= AUFWAERM) {
      if (dt > SCHWELLE) langsam++; else langsam = 0;
      if (langsam >= GEDULD) return false;
    }
  }
  return true;
}
const f = (n, dt) => Array(n).fill(dt);

console.log("  — Geräte, auf denen die Bremse NICHT greifen darf:");
ok(laeuftWeiter(f(600, 1 / 60)), "60 Bilder/s (Klaus' Tablet, Handy mit Grafikchip)");
ok(laeuftWeiter(f(600, 1 / 30)), "30 Bilder/s (gedrosselt, aber flüssig)");
ok(laeuftWeiter(f(600, 1 / 21)), "21 Bilder/s (knapp über der Schwelle)");
ok(laeuftWeiter([...f(10, 1 / 60), 2.0, ...f(600, 1 / 60)]),
   "ein einzelner Aussetzer von 2 s (Tab-Wechsel) bremst nicht");
ok(laeuftWeiter([...f(10, 1 / 60), 0.3, 0.016, 0.3, 0.016, 0.3, 0.016, 0.3, 0.016, 0.3, ...f(600, 1 / 60)]),
   "abwechselnd langsam und schnell bremst nicht");
ok(laeuftWeiter([...f(AUFWAERM, 0.5), ...f(600, 1 / 60)]),
   "teure erste Bilder (Aufwärmen) bremsen nicht");

console.log("  — Geräte, auf denen sie greifen MUSS:");
ok(!laeuftWeiter(f(600, 0.2)), "0,2 s je Bild (Klaus' Bericht: 180-255 ms)");
ok(!laeuftWeiter(f(600, 1 / 5)), "5 Bilder/s (Prüfgerät ohne Grafikbeschleunigung)");
ok(!laeuftWeiter([...f(AUFWAERM, 1 / 60), ...f(GEDULD, SCHWELLE + 0.01)]),
   `genau ${GEDULD} langsame Bilder hintereinander`);
ok(laeuftWeiter([...f(AUFWAERM, 1 / 60), ...f(GEDULD - 1, SCHWELLE + 0.01), 1 / 60, ...f(GEDULD - 1, SCHWELLE + 0.01)]),
   `${GEDULD - 1} langsame in Folge reichen nicht`);

/* Die Schwelle muss in einem sinnvollen Bereich liegen. Zu hoch angesetzt
 * würde sie auf normalen Geräten zuschlagen, zu niedrig nie greifen. */
ok(SCHWELLE >= 0.03 && SCHWELLE <= 0.1,
   `Schwelle liegt im sinnvollen Bereich (0,03-0,1 s je Bild): ${SCHWELLE}`);
ok(GEDULD >= 3, `Geduld groß genug gegen einzelne Ausreißer (>=3): ${GEDULD}`);

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

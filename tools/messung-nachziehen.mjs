#!/usr/bin/env node
/* Die Karte holt sich, was die Detailseite längst hat.
 *
 * Klaus 2026-09-22: „Auf der Hauptseite steht Sage Protokoll und andere Apps
 * noch als noch nicht gemessen. Wenn ich aber auf Einzelheiten gehe, kann ich
 * sehen, dass die letzten Werte drinstehen. Also ziehe diese bitte mit auf die
 * Hauptseite."
 *
 * ⚠ DER BEFUND STIMMT, UND ES SIND GENAU ZWEI QUELLEN FÜR DIESELBE FRAGE:
 *
 *   | | liest |
 *   |---|---|
 *   | die KARTE (`markt.html`, `statische-listen.mjs`) | `assets/config/spore-stand.json` |
 *   | die DETAILSEITE (`detailseiten.mjs`)             | `forschung/messreihe.json` |
 *
 * Die Reihe ist die QUELLE — dort steht jede Messung, die je gelaufen ist.
 * `spore-stand.json` ist ein daraus abgeleiteter Tagesbericht. Diese Datei
 * fügt keine DRITTE Quelle hinzu; sie vervollständigt die Ableitung.
 *
 * ⚠ DIE LÜCKE SITZT IN DER REIHENFOLGE DES NÄCHTLICHEN LAUFS, nicht im Code:
 *
 *   1 · `vektoren-bauen.mjs`  misst den Marktplatz  → schreibt spore-stand
 *   2 · `forschung.mjs --messen` misst die Forschungs-Ziele → schreibt messreihe
 *   3 · `statische-listen.mjs` baut die Karten       → liest spore-stand
 *
 * Ein Eintrag, dessen Reihe erst in Schritt 2 entsteht, steht in Schritt 3
 * leer da — obwohl seine Zahlen vorliegen. Genau das ist den zwei Karten
 * passiert, die am 2026-09-22 dazukamen (`eigen-sage`,
 * `eigen-muttis-rezeptbuch`): 13 und 14 Handy-Punkte in der Reihe, nichts auf
 * der Karte. Dieses Werkzeug gehört deshalb ZWISCHEN 2 und 3.
 *
 * ⚠ ES FÜLLT NUR, WAS LEER IST — und das ist die ganze Abgrenzung.
 * `spore-stand` trägt eine POLITIK, die hier nicht angetastet wird: ein
 * BESSERER Wert gilt sofort, ein SCHLECHTERER erst nach dreimaligem Messen
 * hintereinander (`SCHLECHTER_NOETIG` in `tools/messung.mjs`, Klaus
 * 2026-08-06: „nach drei Messungen ist OK"), und `zurueckgehalten` merkt sich
 * den Zwischenstand.
 *
 * ⚠ ICH HATTE DIESE RICHTUNG ZUERST UMGEKEHRT HINGESCHRIEBEN, und der Irrtum
 * hätte teuer werden können: nach der falschen Lesart sähen drei Karten mit
 * einem älteren Datum wie ein zweiter Fehler aus, und wer sie „nachzieht",
 * nimmt Klaus' Entscheidung von 2026-08-06 zurück. Gemessen am 2026-09-22
 * stehen genau drei so da (`markt-privat-brain`, `markt-pwa-toolpoint`,
 * `markt-kim-hub-company`) — jede mit `zurueckgehalten: {zahl: 1, noetig: 3}`
 * und einer schlechteren frischen Leistung. Das ist die Haltefrist bei der
 * Arbeit, kein Befund. Wer hier überschriebe,
 * entschiede diese Frage ein zweites Mal und an einer anderen Stelle. Wo noch
 * gar nichts steht, gibt es nichts zu entscheiden: die erste Messung ist die
 * erste Messung.
 *
 * ⚠ UND DIE ZAHL BLEIBT EHRLICH, WEIL IHR DATUM MITKOMMT. Die Reihe kann
 * älter sein als heute; die Karte zeigt „gemessen am …" und sagt damit
 * selbst, wie frisch sie ist. Eine Zahl ohne Datum wäre eine Behauptung.
 *
 * ⚠ BENANNTE GRENZE: das SCHAUFENSTER (`<id>--schaufenster`) wird NICHT
 * nachgezogen. Es hat in `spore-stand` seine eigene Politik samt
 * `zurueckgehalten`, und ein Schaufenster ohne Haupt-Messung gibt es nicht.
 *
 * Aufruf:
 *   node tools/messung-nachziehen.mjs            schreibt
 *   node tools/messung-nachziehen.mjs --pruefen  sagt nur, was anstünde
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const STAND = join(WURZEL, "assets", "config", "spore-stand.json");
const REIHE = join(WURZEL, "forschung", "messreihe.json");

/* Die vier Zahlen heißen in BEIDEN Quellen gleich — gemessen am 2026-09-22 an
 * `markt-mixarium`. Verschieden sind nur `bis` → `gemessen` und
 * `mangel` → `hinweise`. Deshalb steht hier eine Umformung und keine
 * Übersetzungstabelle; eine Tabelle wäre eine zweite Fassung der Feldnamen. */
export const ZAHLEN = ["leistung", "bedienbarkeit", "gute_praxis", "auffindbarkeit"];

/* Ein Mangel der Reihe sieht so aus: "leistung: Reduziere nicht verwendetes
 * JavaScript". Die Karte will {k, t}. Ohne Doppelpunkt bleibt der ganze Satz
 * stehen und `k` leer — geraten wird nichts. */
export function hinweisAusMangel(s) {
  const t = String(s || "");
  const i = t.indexOf(": ");
  if (i < 1) return { k: "", t };
  return { k: t.slice(0, i), t: t.slice(i + 2) };
}

/* Der jüngste HANDY-Punkt einer Reihe. Handy, weil die Karte die Handy-Zahl
 * zeigt — zwei Geräte in einer Spalte wären zwei Fragen in einer Antwort. */
export function juengsterHandyPunkt(reihe) {
  const p = ((reihe || {}).punkte || []).filter((x) => (x.geraet || "handy") === "handy");
  if (!p.length) return null;
  return p.slice().sort((a, b) =>
    String(a.bis || a.von || "").localeCompare(String(b.bis || b.von || "")))[p.length - 1];
}

/* Aus einem Reihen-Punkt die Messung, wie die Karte sie erwartet.
 * `url` kommt vom Eintrag, nicht aus der Reihe: die Reihe weiß nicht, welche
 * Adresse der Marktplatz verlinkt (Schaufenster-Fall). */
export function messungAusPunkt(punkt, url) {
  if (!punkt) return null;
  const m = { stand: "gemessen" };
  for (const z of ZAHLEN) if (Number.isFinite(punkt[z])) m[z] = punkt[z];
  /* ⚠ OHNE EINE EINZIGE ZAHL IST ES KEINE MESSUNG. Ein leeres Band mit Datum
   * sähe aus wie eine Messung und wäre keine. */
  if (!ZAHLEN.some((z) => Number.isFinite(m[z]))) return null;
  m.gemessen = punkt.bis || punkt.von || "";
  if (punkt.quelle) m.quelle = punkt.quelle;
  if (punkt.werkzeug) m.werkzeug = punkt.werkzeug;
  const h = (punkt.mangel || []).map(hinweisAusMangel);
  if (h.length) m.hinweise = h;
  if (url) m.url = url;
  return m;
}

/* Was fehlt: Einträge mit Punkten in der Reihe, aber ohne Messung im Bericht.
 * ⚠ Gibt NUR die Lücken zurück — vorhandene Messungen werden nie angefasst. */
export function luecken({ eintraege, stand, reihen }) {
  const raus = [];
  for (const e of eintraege) {
    const k = e.anchorId;
    if (!k) continue;
    const da = ((stand.eintraege || {})[k] || {}).messung;
    if (da && ZAHLEN.some((z) => Number.isFinite(da[z]))) continue;
    const m = messungAusPunkt(juengsterHandyPunkt(reihen[k]), e.url || "");
    if (m) raus.push({ anchorId: k, label: e.label || k, messung: m });
  }
  return raus;
}

/* ---------------------------------------------------------------- Ausführen */
if (process.argv[1] && process.argv[1].endsWith("messung-nachziehen.mjs")) {
  const nurPruefen = process.argv.includes("--pruefen");
  const { leseConfig, markteintraege, leseWache } = await import("./statische-listen.mjs");

  const stand = JSON.parse(readFileSync(STAND, "utf8"));
  const reihen = existsSync(REIHE)
    ? (JSON.parse(readFileSync(REIHE, "utf8")).reihen || {}) : {};
  const eintraege = markteintraege(leseConfig("listings.js").FP_LISTINGS || [], leseWache());

  const fehlt = luecken({ eintraege, stand, reihen });
  if (!fehlt.length) {
    console.log("✅ jede sichtbare Karte kennt ihre Messung — nichts nachzuziehen.");
    process.exit(0);
  }
  for (const f of fehlt) {
    const m = f.messung;
    console.log(`  · ${f.label} (${f.anchorId}): ` +
      ZAHLEN.map((z) => `${z[0].toUpperCase()}${m[z] ?? "—"}`).join(" ") +
      `  gemessen ${m.gemessen}`);
  }
  if (nurPruefen) {
    console.log(`\n⊘ ${fehlt.length} Karte(n) stünden leer da, obwohl ihre Reihe Zahlen trägt.`);
    process.exit(1);
  }
  stand.eintraege = stand.eintraege || {};
  for (const f of fehlt) {
    /* ⚠ `{ lage: "ohne_spore" }` ist NICHT erfunden — es ist wortgleich die
     * Zeile, mit der `tools/vektoren-bauen.mjs` (Z. 339/373) einen Eintrag ohne
     * Spore anlegt. Beide neuen Karten haben keine `sporeUrl`, der nächtliche
     * Lauf schriebe also genau dasselbe. Einen eigenen Wert zu setzen hiesse,
     * dieselbe Frage an zwei Stellen zu beantworten. */
    stand.eintraege[f.anchorId] = stand.eintraege[f.anchorId] || { lage: "ohne_spore" };
    stand.eintraege[f.anchorId].messung = f.messung;
  }
  writeFileSync(STAND, JSON.stringify(stand, null, 2) + "\n");
  console.log(`\n✅ ${fehlt.length} Messung(en) aus der Reihe in den Bericht nachgezogen.`);
}

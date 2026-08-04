/* Wächter der Forschungsstation (tools/forschung.mjs).
 *
 * Die Station hat eine Eigenschaft, die man leicht kaputtmacht, ohne es zu
 * merken: sie schreibt jede Nacht in dieselben zwei Dateien, in denen ein
 * MENSCH Erklärungen hinterlegt hat. Geht dabei etwas schief, ist der Schaden
 * still — die Zahlen stimmen weiter, nur das „Warum“ von vor drei Wochen ist
 * weg, und niemand vermisst es, bis man es braucht.
 *
 * Deshalb prüft dieser Wächter vor allem Erhaltung, nicht Ausgabe:
 *   1. ein einmal geschriebener Journal-Eintrag überlebt jeden weiteren Lauf,
 *   2. eine unveränderte Messung verlängert die Spanne, statt Punkte zu stapeln,
 *   3. eine geänderte Messung legt einen neuen Punkt UND einen Journal-Eintrag an,
 *   4. eine korrigierte Messung DESSELBEN Tages ersetzt den Punkt, statt zwei
 *      Wahrheiten für einen Tag stehen zu lassen,
 *   5. der Verlauf beantwortet die Frage „was galt am Tag X?“.
 *
 * Gearbeitet wird in einem Wegwerf-Verzeichnis mit einem gefälschten Bericht —
 * die echten Dateien werden nicht angefasst.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

/* Eine Spielwiese: die echten Werkzeuge, aber ein eigener Datenstand. */
const buehne = fs.mkdtempSync(path.join(os.tmpdir(), "forschung-"));
fs.mkdirSync(path.join(buehne, "tools"));
fs.mkdirSync(path.join(buehne, "forschung"));
fs.mkdirSync(path.join(buehne, "assets", "config"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "tools", "forschung.mjs"), path.join(buehne, "tools", "forschung.mjs"));

const bericht = (werte, tag, hinweise) => {
  fs.writeFileSync(path.join(buehne, "assets", "config", "spore-stand.json"), JSON.stringify({
    geprueft: `${tag}T02:40:00.000Z`,
    eintraege: {
      "probe-seite": {
        nodeName: "Probe-Seite",
        messung: {
          stand: "gemessen", ...werte, gemessen: tag, quelle: "google", werkzeug: "13.4.1",
          hinweise: (hinweise || []).map((t) => ({ k: "leistung", t })),
          url: "https://beispiel.invalid/probe/"
        }
      }
    }
  }));
};

const lauf = (...args) =>
  execFileSync(process.execPath, [path.join(buehne, "tools", "forschung.mjs"), ...args],
    { cwd: buehne, encoding: "utf8" });

const reihe = () => JSON.parse(fs.readFileSync(path.join(buehne, "forschung", "messreihe.json"), "utf8"));
const journal = () => fs.readFileSync(path.join(buehne, "forschung", "JOURNAL.md"), "utf8");
const punkte = () => reihe().reihen["probe-seite"].punkte;

console.log("\nForschungsstation:");

/* ---- 1 · Anlegen ---------------------------------------------------------- */
bericht({ leistung: 50, bedienbarkeit: 90, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-01", ["Bilder verkleinern"]);
lauf("--nachtragen");
ok(punkte().length === 1, `erster Lauf legt genau einen Punkt an (${punkte().length})`);
ok(punkte()[0].von === "2026-08-01" && punkte()[0].bis === "2026-08-01",
  "der erste Punkt gilt für genau einen Tag");

/* ---- 2 · Unverändert: Spanne wächst, kein neuer Punkt --------------------- */
bericht({ leistung: 50, bedienbarkeit: 90, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-02", ["Bilder verkleinern"]);
lauf("--nachtragen");
bericht({ leistung: 50, bedienbarkeit: 90, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-03", ["Bilder verkleinern"]);
lauf("--nachtragen");
ok(punkte().length === 1, `drei gleiche Tage bleiben ein Punkt (${punkte().length})`);
ok(punkte()[0].bis === "2026-08-03", `die Spanne wächst bis zum letzten Tag (${punkte()[0].bis})`);
ok(!fs.existsSync(path.join(buehne, "forschung", "JOURNAL.md")),
  "ohne Änderung entsteht kein Journal-Eintrag");

/* ---- 3 · Sprung: neuer Punkt + Journal ------------------------------------ */
bericht({ leistung: 86, bedienbarkeit: 90, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-04", []);
lauf("--nachtragen");
ok(punkte().length === 2, `ein Sprung legt einen zweiten Punkt an (${punkte().length})`);
ok(punkte()[0].bis === "2026-08-03" && punkte()[1].von === "2026-08-04",
  "der alte Punkt endet, wo der neue beginnt — keine Lücke, keine Überlappung");
const j1 = journal();
ok(/Leistung 50 → 86/.test(j1), "das Journal nennt den Sprung mit alter und neuer Zahl");
ok(/Beanstandung weg: leistung: Bilder verkleinern/.test(j1),
  "das Journal nennt die verschwundene Beanstandung");
ok(/noch nicht eingetragen/.test(j1), "der neue Eintrag verlangt ein „Warum“");
ok(/1 Eintrag\/Einträge ohne/.test(lauf("--offen")), "--offen findet den fehlenden Grund");

/* ---- 4 · Die Erklärung überlebt weitere Läufe ----------------------------- */
/* Das ist der Kern. Eine Sitzung trägt den Grund nach; die nächsten Nächte
 * dürfen ihn nicht überschreiben. Gegenprobe beim Bauen: schreibt man das
 * Journal komplett neu statt oben anzufügen, fällt genau diese Probe. */
fs.writeFileSync(path.join(buehne, "forschung", "JOURNAL.md"),
  journal().replace("_(noch nicht eingetragen)_", "Hintergrundbild erst nach `load` geladen."));
bericht({ leistung: 86, bedienbarkeit: 90, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-05", []);
lauf("--nachtragen");
bericht({ leistung: 86, bedienbarkeit: 40, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-06", ["Kontrast zu schwach"]);
lauf("--nachtragen");
const j2 = journal();
ok(/Hintergrundbild erst nach `load` geladen\./.test(j2),
  "eine von Hand nachgetragene Erklärung überlebt spätere Läufe");
ok(/Bedienbarkeit 90 → 40/.test(j2), "der neue Sprung steht zusätzlich im Journal");
ok(j2.indexOf("Bedienbarkeit 90 → 40") < j2.indexOf("Leistung 50 → 86"),
  "das Neueste steht oben");

/* ---- 5 · Korrektur am selben Tag ersetzt, statt zu stapeln ---------------- */
/* Real geworden, als die Marktplatz-Zahlen von eigener Messung auf Google
 * umgestellt wurden: derselbe Tag, andere Zahl. Zwei Punkte für einen Tag
 * wären zwei Wahrheiten. */
const vorher = punkte().length;
bericht({ leistung: 86, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-06", ["Kontrast zu schwach"]);
lauf("--nachtragen");
ok(punkte().length === vorher, `eine Korrektur desselben Tages ersetzt den Punkt (${vorher} → ${punkte().length})`);
ok(punkte()[punkte().length - 1].bedienbarkeit === 55, "der korrigierte Wert steht drin");

/* ---- 6 · Der Verlauf beantwortet „was galt am Tag X?“ --------------------- */
const am = (tag) => punkte().find((p) => p.von <= tag && tag <= p.bis);
ok(am("2026-08-02") && am("2026-08-02").leistung === 50,
  "am 2026-08-02 galt 50 — auch ohne eigenen Punkt für diesen Tag");
ok(am("2026-08-04") && am("2026-08-04").leistung === 86, "am 2026-08-04 galt 86");
ok(!am("2026-07-31"), "vor der ersten Messung gibt es ehrlich nichts");

const sicht = lauf("--zeigen", "--seit=2026-08-04");
ok(/2026-08-04/.test(sicht) && !/2026-08-01…2026-08-03/.test(sicht),
  "--seit blendet ältere Spannen aus");

/* ---- 7 · Die eigene Zielliste -------------------------------------------- */
/* `messziele.json` ist von Hand gepflegt. Ein Tippfehler darin fällt sonst erst
 * in der Nacht auf, und dann nur als eine Zeile in einem Aktions-Protokoll,
 * das niemand liest. */
{
  const liste = JSON.parse(fs.readFileSync(path.join(ROOT, "forschung", "messziele.json"), "utf8"));
  const ziele = liste.ziele || [];
  ok(ziele.length > 0, `messziele.json führt ${ziele.length} Ziele`);

  const ids = ziele.map((z) => z.id);
  ok(new Set(ids).size === ids.length, "jede Kennung kommt genau einmal vor");
  ok(ziele.every((z) => z.id && z.name && z.url && z.repo),
    "jedes Ziel hat Kennung, Name, Adresse und Repo");
  ok(ziele.every((z) => /^https:\/\//.test(z.url)),
    "jede Adresse ist https — alles andere wäre gar nicht messbar");

  /* Ein abgeschaltetes Ziel OHNE Grund ist genau die stille Lücke, die Klaus
   * vermeiden wollte: es sähe aus wie „vergessen“ statt wie „geprüft und
   * bewusst nicht gemessen“. */
  const ohneGrund = ziele.filter((z) => z.aktiv === false && !z.grund);
  ok(ohneGrund.length === 0,
    `jedes abgeschaltete Ziel nennt seinen Grund${ohneGrund.length ? " — fehlt bei: " + ohneGrund.map((z) => z.id).join(", ") : ""}`);

  /* Die eigenen Ziele dürfen sich nicht mit dem Marktplatz überschneiden —
   * sonst stünde dieselbe Seite zweimal in der Rangliste, einmal je Quelle,
   * und man hielte sie für zwei verschiedene. */
  /* Verglichen wird gegen die ZIELADRESSEN des Marktplatzes, nicht gegen den
   * Dateitext. Ein blosses `includes` meldet Fehlalarm, sobald eine Adresse
   * Anfang einer anderen ist — `https://family-projekt.de/` steckt in jeder
   * Bild-Adresse `https://family-projekt.de/assets/apps/….webp`. Beim Bauen
   * genau so passiert. */
  const marktText = fs.readFileSync(path.join(ROOT, "assets", "config", "listings.js"), "utf8");
  const marktAdressen = new Set(
    [...marktText.matchAll(/"(?:url|appUrl)"\s*:\s*"([^"]+)"/g)].map((m) => m[1].replace(/\/+$/, ""))
  );
  const doppelt = ziele.filter((z) => z.aktiv !== false && marktAdressen.has(z.url.replace(/\/+$/, "")));
  ok(doppelt.length === 0,
    `kein eigenes Ziel steht schon im Marktplatz${doppelt.length ? " — doppelt: " + doppelt.map((z) => z.id).join(", ") : ""}`);
}

fs.rmSync(buehne, { recursive: true, force: true });
console.log(`\n${fail === 0 ? "✓" : "✗"} smoke_forschung: ${pass} grün, ${fail} rot`);
process.exit(fail === 0 ? 0 : 1);

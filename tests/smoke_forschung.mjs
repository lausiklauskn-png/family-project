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
 *   3. eine geänderte Messung legt einen neuen Punkt an — und einen Journal-
 *      Eintrag erst, wenn die NÄCHSTE Messung den Sprung hält (Klaus 2026-08-06),
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
/* forschung.mjs holt sich das gemessene Gerät aus messung.mjs — eine zweite
 * Angabe wären zwei Wahrheiten. Also muss die Bühne beide Werkzeuge tragen. */
fs.copyFileSync(path.join(ROOT, "tools", "messung.mjs"), path.join(buehne, "tools", "messung.mjs"));

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

const bericht2 = (tag, leistung) => {
  fs.writeFileSync(path.join(buehne, "assets", "config", "spore-stand.json"), JSON.stringify({
    geprueft: `${tag}T02:40:00.000Z`,
    eintraege: { "probe-seite": { nodeName: "Probe-Seite", messung: {
      stand: "gemessen", leistung, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100,
      gemessen: tag, quelle: "eigen", werkzeug: "13.4.1", hinweise: [],
      url: "https://beispiel.invalid/probe/" } } }
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

/* ---- 3 · Sprung: neuer Punkt sofort, Journal-Eintrag erst nach Bestätigung -
 * Klaus' Entscheid vom 2026-08-06. Auslöser war Jasons-Tresor: 83 · 64 · 97 an
 * drei Nächten, letzter Commit vom 3. August — der Sprung 64 → 97 lief durch die
 * Schwelle 20 und stand als Erfolg im Journal, obwohl niemand etwas gebaut
 * hatte. Rauschen ist per Definition das, was beim nächsten Mal weg ist. */
bericht({ leistung: 86, bedienbarkeit: 90, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-04", []);
const a1 = lauf("--nachtragen");
ok(punkte().length === 2, `ein Sprung legt einen zweiten Punkt an (${punkte().length})`);
ok(punkte()[0].bis === "2026-08-03" && punkte()[1].von === "2026-08-04",
  "der alte Punkt endet, wo der neue beginnt — keine Lücke, keine Überlappung");
ok(!fs.existsSync(path.join(buehne, "forschung", "JOURNAL.md")),
  "ein UNBESTÄTIGTER Sprung schreibt noch keinen Eintrag");
ok(/Verdacht gemerkt: 1/.test(a1), "der Lauf sagt, dass er einen Verdacht gemerkt hat");
{
  const v = reihe().reihen["probe-seite"].verdacht;
  ok(v && v.gesehen === "2026-08-04", "der Verdacht liegt in messreihe.json und überlebt damit die Nacht");
  ok(v && v.sprung[0].alt === 50, "gemerkt wird der Stand VOR dem Sprung — daran wird morgen gemessen");
}

/* Die nächste Messung hält den Wert (hier sogar unverändert — der stärkste
 * Fall, und zugleich der, der beinahe durchgerutscht wäre: eine gleiche Messung
 * springt im Werkzeug mit `continue` heraus, bevor irgendetwas geprüft wird). */
bericht({ leistung: 86, bedienbarkeit: 90, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-05", []);
lauf("--nachtragen");
const j1 = journal();
ok(/Leistung 50 → 86/.test(j1), "nach der Bestätigung nennt das Journal den Sprung mit alter und neuer Zahl");
ok(/bestätigt durch die Messung vom 2026-08-05/.test(j1),
  "und sagt dazu, dass er bestätigt wurde — der Eintrag ist auf den Sprungtag datiert, nicht auf heute");
ok(/### 2026-08-04 · /.test(j1), "datiert auf den Tag des Sprungs, nicht auf den der Bestätigung");
ok(/Beanstandung weg: leistung: Bilder verkleinern/.test(j1),
  "das Journal nennt die verschwundene Beanstandung");
ok(/noch nicht eingetragen/.test(j1), "der neue Eintrag verlangt ein „Warum“");
ok(/1 Eintrag\/Einträge ohne/.test(lauf("--offen")), "--offen findet den fehlenden Grund");
ok(!reihe().reihen["probe-seite"].verdacht, "der erledigte Verdacht ist aus der Messreihe verschwunden");

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
/* Auch dieser Einbruch braucht seine Bestätigung. 42 statt 40 — nah genug, um
 * den Sprung zu halten, aber ein eigener Punkt statt einer verlängerten Spanne;
 * so bleibt der Korrektur-Fall in Abschnitt 5 darunter prüfbar. */
bericht({ leistung: 86, bedienbarkeit: 42, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-07", ["Kontrast zu schwach"]);
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
bericht({ leistung: 86, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-07", ["Kontrast zu schwach"]);
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

/* ---- 6b · Rauschen macht kein Ereignis ----------------------------------- */
/* Die erste echte Nacht (4. → 5. August) lieferte sechs Journal-Einträge, von
 * denen VIER reine Listen-Wackler waren: „Erzwungener dynamischer Umbruch“
 * verschwand bei zwei Seiten und tauchte bei drei anderen auf, ohne dass sich
 * eine Zahl bewegte oder jemand etwas gebaut hätte. Solche Einträge ersticken
 * das Signal. */
{
  const vorZahl = journal().split("### ").length;
  bericht({ leistung: 86, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-08",
    ["Kontrast zu schwach", "Erzwungener dynamischer Umbruch"]);
  lauf("--nachtragen");
  ok(journal().split("### ").length === vorZahl,
    "eine geänderte Beanstandungsliste OHNE Sprung bekommt keinen eigenen Eintrag");
  ok(punkte()[punkte().length - 1].mangel.includes("leistung: Erzwungener dynamischer Umbruch"),
    "in der Messreihe steht die Änderung trotzdem — verschwiegen wird nichts");

  /* Und ein Sprung unter der Schwelle ebensowenig: an unveränderten Seiten
   * schwankte Googles Zahl gemessen um bis zu 19 Punkte. */
  bericht({ leistung: 70, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-09",
    ["Kontrast zu schwach", "Erzwungener dynamischer Umbruch"]);
  lauf("--nachtragen");
  ok(journal().split("### ").length === vorZahl,
    "ein Sprung von 16 Punkten bleibt unter der Schwelle und macht keinen Eintrag");
}

/* ---- 6c · Ein Quellwechsel wird als solcher benannt ----------------------- */
/* Real passiert: Mein Mixarium sprang über Nacht von 37 auf 75, ohne dass eine
 * Zeile geändert wurde — gemessen wurde vorher selbst, nachher bei Google. Ohne
 * diesen Hinweis liest sich eine Umstellung wie ein Erfolg. */
{
  fs.writeFileSync(path.join(buehne, "assets", "config", "spore-stand.json"), JSON.stringify({
    geprueft: "2026-08-10T02:40:00.000Z",
    eintraege: {
      "probe-seite": {
        nodeName: "Probe-Seite",
        messung: {
          stand: "gemessen", leistung: 30, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100,
          gemessen: "2026-08-10", quelle: "eigen", werkzeug: "13.4.1",
          hinweise: [], url: "https://beispiel.invalid/probe/"
        }
      }
    }
  }));
  lauf("--nachtragen");
  /* Auch der Quellwechsel-Sprung braucht seine Bestaetigung: die naechste
   * Messung derselben (neuen) Quelle haelt den Wert. */
  bericht2("2026-08-11", 32);
  lauf("--nachtragen");
  const j = journal();
  ok(/Die Messquelle hat gewechselt/.test(j), "der Eintrag warnt vor dem Quellwechsel");
  ok(/Wer ihn als Verbesserung liest, irrt/.test(j),
    "und sagt ausdrücklich, dass der Sprung nichts über die Seite aussagt");
}

/* ---- 6d · Der Fall, fuer den die Regel gebaut wurde -----------------------
 * Ein Sprung, der beim naechsten Mal nicht mehr da ist. Vorher haette er einen
 * Journal-Eintrag erzeugt, der wie ein Erfolg aussieht -- genau das war
 * Jasons-Tresor am 2026-08-06. */
{
  const vorher = journal();
  bericht({ leistung: 80, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-12", []);
  const b1 = lauf("--nachtragen");
  ok(/Verdacht gemerkt: 1/.test(b1), "ein Einbruch ist gross genug fuer einen Verdacht");
  ok(journal() === vorher, "aber noch kein Eintrag");

  // Und zurueck auf den alten Stand: der Einbruch war Rauschen.
  bericht({ leistung: 34, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-13", []);
  const b2 = lauf("--nachtragen");
  ok(/Verdacht verworfen: 1/.test(b2), "der Lauf sagt ausdruecklich, dass er den Verdacht verwirft");
  ok(journal() === vorher, "ein Sprung, der nicht haelt, hinterlaesst KEINEN Eintrag");

  /* Und der Ausreisser darf nicht zum neuen Massstab werden: 32 -> 80 -> 34
   * ist EIN Zacken, keine Verschlechterung von 80 auf 34. Wuerde gegen den
   * Ausreisser gerechnet, stuende beim naechsten Lauf "80 -> 34" im Journal. */
  bericht({ leistung: 33, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-14", []);
  lauf("--nachtragen");
  ok(journal() === vorher,
    "nach dem Zacken zurueck auf den alten Stand: immer noch kein Eintrag (kein Ersatz-Verdacht gegen den Ausreisser)");
}

/* ---- 6e · Richtung zaehlt: ein Rueckschlag ist keine Bestaetigung ---------
 * Der Wert faellt weit, und beim naechsten Mal liegt er ebenso weit auf der
 * ANDEREN Seite. Ohne Richtungspruefung wuerde ein Ausschlag nach unten durch
 * einen Ausschlag nach oben "bestaetigt" -- Abstand allein genuegt nicht. */
{
  const vorher = journal();
  bericht({ leistung: 5, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-15", []);
  lauf("--nachtragen");
  bericht({ leistung: 100, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-16", []);
  const c1 = lauf("--nachtragen");
  ok(/Verdacht verworfen: 1/.test(c1),
    "ein Ausschlag nach unten wird von einem Ausschlag nach oben NICHT bestaetigt");
  ok(journal() === vorher, "und erzeugt keinen Eintrag");
}

/* ---- 6f · Die Messreihe sieht die ECHTE Messung, nicht den Karten-Wert -----
 * Seit dem 2026-08-06 haelt die Karte einen schlechteren Wert bis zu dreimal
 * zurueck (tools/messung.mjs). Der zurueckgehaltene Wert steht dann in
 * `messung`, der wirklich gemessene daneben in `messung.frisch`. Die Forschung
 * MUSS den frischen nehmen — sonst verloere sie genau die Ausreisser, wegen
 * derer die Haltefrist ueberhaupt gebaut wurde. */
{
  const vorZahl = punkte().length;
  fs.writeFileSync(path.join(buehne, "assets", "config", "spore-stand.json"), JSON.stringify({
    geprueft: "2026-08-17T02:40:00.000Z",
    eintraege: { "probe-seite": { nodeName: "Probe-Seite", messung: {
      // Der GELISTETE (zurueckgehaltene) Wert — alt, mit altem Datum:
      stand: "gemessen", leistung: 100, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100,
      gemessen: "2026-08-16", quelle: "eigen", werkzeug: "13.4.1", hinweise: [],
      url: "https://beispiel.invalid/probe/",
      zurueckgehalten: { zahl: 1, noetig: 3, seit: "2026-08-17" },
      // Was heute WIRKLICH gemessen wurde:
      frisch: { leistung: 41, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100,
                gemessen: "2026-08-17", quelle: "eigen", werkzeug: "13.4.1" }
    } } }
  }));
  lauf("--nachtragen");
  const letzt = punkte()[punkte().length - 1];
  ok(punkte().length === vorZahl + 1 && letzt.leistung === 41,
    "die Messreihe schreibt den WIRKLICH gemessenen Wert fort (" + letzt.leistung + "), nicht den gehaltenen 100");
  ok(letzt.von === "2026-08-17", "und datiert ihn auf den Tag der echten Messung (" + letzt.von + ")");
}

/* ---- 6g · Jeder Punkt sagt, für WELCHES Gerät er gilt ---------------------
 * Befund 2026-08-07: die Messreihe führte nur eine Zahl je Seite und Tag, ohne
 * Gerät. Beide Messwege liefern Handy-Werte (PSI `strategy=mobile`, Lighthouse
 * ohne `formFactor`) — nur stand das nirgends. An denselben Seiten lagen Handy
 * und Computer am selben Tag 43 Punkte auseinander (Muttis 44 gegen 87). Eine
 * Zahl ohne Gerät ist darum keine halbe Auskunft, sondern eine irreführende. */
{
  const alle = punkte();
  ok(alle.length > 0 && alle.every((p) => p.geraet === "handy"),
    `jeder Punkt trägt sein Gerät (${alle.length} Punkte, alle „handy")`);

  /* Nachbeschriftung: ein alter Punkt ohne Gerät bekommt eins — und ein Punkt,
   * der schon eines trägt, wird NICHT umgestempelt. Das zweite ist das
   * wichtigere: sonst schriebe ein späterer Wechsel des Messgeräts die ganze
   * Vergangenheit um. */
  const reiheDatei = path.join(buehne, "forschung", "messreihe.json");
  const r = JSON.parse(fs.readFileSync(reiheDatei, "utf8"));
  const erste = r.reihen["probe-seite"].punkte;
  delete erste[0].geraet;
  erste[1].geraet = "desktop";
  fs.writeFileSync(reiheDatei, JSON.stringify(r, null, 1));
  bericht({ leistung: 41, bedienbarkeit: 55, gute_praxis: 100, auffindbarkeit: 100 }, "2026-08-18", []);
  lauf("--nachtragen");
  const nachher = punkte();
  ok(nachher[0].geraet === "handy", "ein Punkt ohne Gerät wird als Handy nachbeschriftet");
  ok(nachher[1].geraet === "desktop", "ein Punkt mit fremdem Gerät bleibt unangetastet");
}

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

  /* Hat eine App eine EIGENE Domain (CNAME im Repo), muss der Marktplatz auch
   * dorthin verlinken — nicht auf die GitHub-Pages-Adresse.
   *
   * Real passiert (2026-08-05): Perfect Skin Beauty hat seit jeher
   * `perfectskinbeauty.de`, verlinkt war `lausiklauskn-png.github.io/...`.
   * Das kostete gleich dreifach — der Link zeigte auf die Adresse, die das
   * `canonical` der Seite verwirft; Besucher landeten auf einer
   * Entwickler-Adresse statt auf der Domain des Geschäfts; und die
   * Forschungsstation maß monatelang die falsche Seite.
   *
   * Geprüft wird gegen die Repos, die hier im Container liegen. Fehlt einer,
   * wird er übersprungen statt zu meckern — der Wächter soll nicht rot werden,
   * weil ein Klon fehlt. */
  const eigeneDomains = [];
  for (const a of marktAdressen) {
    const m = /^https:\/\/lausiklauskn-png\.github\.io\/([^/]+)/.exec(a);
    if (!m) continue;
    const cname = path.join("/home/user", m[1], "CNAME");
    if (!fs.existsSync(cname)) continue;                    // Repo nicht da → nichts zu sagen
    const domain = fs.readFileSync(cname, "utf8").trim();
    if (domain) eigeneDomains.push({ verlinkt: a, statt: `https://${domain}/` });
  }
  ok(eigeneDomains.length === 0,
    eigeneDomains.length
      ? `Marktplatz verlinkt github.io, obwohl es eine eigene Domain gibt: ` +
        eigeneDomains.map((e) => `${e.verlinkt} → ${e.statt}`).join(", ")
      : "kein Marktplatz-Eintrag verlinkt github.io, wo es eine eigene Domain gibt");
  ok(doppelt.length === 0,
    `kein eigenes Ziel steht schon im Marktplatz${doppelt.length ? " — doppelt: " + doppelt.map((z) => z.id).join(", ") : ""}`);
}

fs.rmSync(buehne, { recursive: true, force: true });
console.log(`\n${fail === 0 ? "✓" : "✗"} smoke_forschung: ${pass} grün, ${fail} rot`);
process.exit(fail === 0 ? 0 : 1);

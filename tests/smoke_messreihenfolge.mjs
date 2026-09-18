/* Wächter über die MESSUNG: wer kommt dran, und läuft der Lauf überhaupt?
 *
 *   node tests/smoke_messreihenfolge.mjs
 *
 * Klaus 2026-09-18: „Ich sehe, dass im Family Project die letzten vier nicht
 * gemessen wurden, schon mehrere Tage. Und genauso in PWA Toolpoint. … Die
 * Reihenfolge der Messung sollte festgeregelt werden, sonst werden die ja nie
 * gemessen."
 *
 * ⚠ DIE REIHENFOLGE WAR NICHT DAS PROBLEM, und das ist der Grund, warum diese
 * Datei ZWEI Dinge misst. Nachgerechnet an den echten Daten standen die vier
 * nie gemessenen Einträge auf den Plätzen 1 bis 4 — sie wären sofort drangekommen.
 *
 * Gestorben ist der nächtliche LAUF: sechs Nächte in Folge mit
 * `Cannot find package 'playwright'`, NACH der Messung und VOR dem Commit.
 * Zwei getrennte `npm install … --no-save` in einem Repo ohne package.json —
 * der zweite entfernt, was der erste geholt hat.
 *
 * Deshalb steht hier beides nebeneinander: die Reihenfolge (die stimmte) und
 * die Voraussetzung dafür, dass sie überhaupt je angewandt wird (die fehlte).
 * *Ein Wächter auf die Reihenfolge allein wäre sechs Nächte lang grün gewesen,
 * während nichts gemessen wurde.*
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reihenfolge, MESSUNG_MAX_PRO_LAUF } from "../tools/messung.mjs";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lies = (f) => fs.readFileSync(path.join(WURZEL, f), "utf8");
let pass = 0, fail = 0;
const ok = (b, t, h) => { if (b) { pass++; console.log("  ✓", t); }
                          else { fail++; console.log("  ✗", t, h ? "→ " + h : ""); } };

/* ── 1 · Die Reihenfolge: nie Gemessene ganz vorn ────────────────────────── */
console.log("── Die Reihenfolge ──");
{
  const z = [{ id: "alt" }, { id: "neu" }, { id: "mittel" }];
  const v = { alt: { gemessen: "2026-01-01" }, mittel: { gemessen: "2026-06-01" } };
  const r = reihenfolge(z, v).map((x) => x.id);
  ok(r[0] === "neu", "ein NIE gemessener Eintrag steht ganz vorn", r.join(","));
  ok(r[1] === "alt" && r[2] === "mittel", "danach das älteste Messdatum zuerst", r.join(","));

  /* Bei Gleichstand nach Kennung — sonst hinge die Reihenfolge vom Zufall ab,
     und derselbe Eintrag könnte Nacht für Nacht hinten landen. */
  const g = reihenfolge([{ id: "b" }, { id: "a" }], {}).map((x) => x.id);
  ok(g.join(",") === "a,b", "bei Gleichstand nach Kennung, nicht nach Zufall", g.join(","));

  /* Und die Gegenrichtung: mit Deckel kommt der Neue WIRKLICH dran. „Steht
     vorn" allein sagt nichts, wenn der Deckel bei 0 läge. */
  ok(MESSUNG_MAX_PRO_LAUF >= 1, `der Deckel lässt überhaupt jemanden dran (${MESSUNG_MAX_PRO_LAUF})`);
}

/* ── 2 · An den ECHTEN Daten: kein Eintrag hängt dauerhaft hinten ────────── */
console.log("\n── Die echte Liste ──");
{
  const w = {}; new Function("window", lies("assets/config/listings.js"))(w);
  const alle = (w.FP_LISTINGS || []).filter((x) => x && x.anchorId);
  const st = JSON.parse(lies("assets/config/spore-stand.json"));
  const vorher = {};
  for (const [k, v] of Object.entries(st.eintraege || {})) if (v.messung) vorher[k] = v.messung;

  const messbar = alle.map((x) => ({ id: x.anchorId, url: String(x.appUrl || x.url || "") }))
                      .filter((z) => /^https:\/\//i.test(z.url));
  ok(messbar.length === alle.length,
     `jeder Eintrag hat eine https-Adresse und ist damit messbar (${messbar.length}/${alle.length})`);

  const r = reihenfolge(messbar, vorher);
  const nie = r.filter((z) => !(vorher[z.id] && vorher[z.id].gemessen)).map((z) => z.id);
  const dran = r.slice(0, MESSUNG_MAX_PRO_LAUF).map((z) => z.id);
  /* Die Zusicherung, um die Klaus gebeten hat: was nie gemessen wurde, kommt
     beim NÄCHSTEN Lauf dran — nicht irgendwann. */
  const draussen = nie.filter((id) => !dran.includes(id));
  ok(draussen.length === 0,
     `jeder NIE gemessene Eintrag kommt im nächsten Lauf dran (${nie.length} nie gemessen)`,
     draussen.join(", "));
}

/* ── 3 · Die Voraussetzung: läuft der nächtliche Lauf überhaupt? ─────────── */
console.log("\n── Der nächtliche Lauf ──");
{
  const y = lies(".github/workflows/vektoren-taeglich.yml");
  /* ⚠ DAS IST DIE ZUSICHERUNG, DIE SECHS NÄCHTE GEKOSTET HAT. Ohne
     package.json entfernt jedes `npm install X --no-save` alles, was ein
     früherer Aufruf ohne Speichern geholt hat. Gemessen, nicht vermutet. */
  const installs = (y.match(/npm install [^\n|]*--no-save/g) || [])
    .map((z) => z.replace(/npm install\s+/, "").replace(/\s*--no-save.*/, "").trim())
    .filter(Boolean);
  const holtPw = installs.filter((z) => /\bplaywright\b/.test(z));
  const holtLh = installs.filter((z) => /\blighthouse\b/.test(z));
  ok(holtPw.length > 0 && holtLh.length > 0, "der Lauf holt playwright UND lighthouse");
  /* Der eigentliche Riegel: KEIN Aufruf holt nur eines von beiden, ohne das
     andere mitzunennen — sonst räumt er es weg. Der Rückfall nach einem
     Fehlschlag ist die benannte Ausnahme und steht hinter `||`. */
  const einzeln = installs.filter((z) => {
    const pw = /\bplaywright\b/.test(z), lh = /\blighthouse\b/.test(z);
    return (pw || lh) && !(pw && lh);
  });
  const nurImRueckfall = einzeln.every((z) => new RegExp("\\|\\|[\\s\\S]{0,200}npm install\\s+" + z.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(y));
  ok(einzeln.length === 0 || nurImRueckfall,
     "kein Aufruf holt eines allein — außer im benannten Rückfall",
     einzeln.join(" | "));

  /* Und der Riegel davor: was die Arbeit voraussetzt, wird geprüft, BEVOR
     gearbeitet wird. Ein Lauf, der mittendrin stirbt, wirft weg, was er schon
     getan hat — der Commit-Schritt kommt nie dran. */
  const iPruef = y.indexOf("Werkzeuge nachzählen");
  const iMess = y.indexOf("Sporen lesen, Zielseiten bewachen, messen");
  ok(iPruef > -1, "es gibt einen Schritt, der die Werkzeuge nachzählt");
  ok(iPruef > -1 && iMess > -1 && iPruef < iMess,
     "… und er steht VOR der Arbeit, nicht danach");
}

console.log(`\n${pass} bestanden, ${fail} durchgefallen.`);
process.exit(fail ? 1 : 0);

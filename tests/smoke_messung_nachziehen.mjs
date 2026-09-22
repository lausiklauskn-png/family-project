/* Wächter: die KARTE kennt, was die DETAILSEITE längst hat.
 *
 *   node tests/smoke_messung_nachziehen.mjs
 *
 * Klaus 2026-09-22: „Auf der Hauptseite steht Sage Protokoll und andere Apps
 * noch als noch nicht gemessen. Wenn ich aber auf Einzelheiten gehe, kann ich
 * sehen, dass die letzten Werte drinstehen."
 *
 * ⚠ ZWEI QUELLEN FÜR DIESELBE FRAGE, und nur eine wurde gefüllt: die Karte
 * liest `assets/config/spore-stand.json`, die Detailseite
 * `forschung/messreihe.json`. Ein Eintrag, dessen Reihe erst im
 * `--messen`-Schritt entsteht, steht beim Bauen der Karten leer da.
 *
 * ⚠ UND DER WICHTIGSTE WÄCHTER IST DER LETZTE: er misst den ECHTEN Bestand.
 * Die gestellten Lagen darüber prüfen die Mechanik; nur die Messung am
 * Bestand fängt Klaus' Befund noch einmal, wenn morgen ein Eintrag dazukommt.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ZAHLEN, hinweisAusMangel, juengsterHandyPunkt, messungAusPunkt, luecken
} from "../tools/messung-nachziehen.mjs";
import { leseConfig, markteintraege, leseWache } from "../tools/statische-listen.mjs";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lies = (f) => fs.readFileSync(path.join(WURZEL, f), "utf8");
let pass = 0, fail = 0;
const ok = (b, t, h) => { if (b) { pass++; console.log("  ✓", t); }
                          else { fail++; console.log("  ✗", t, h ? "→ " + h : ""); } };

const punkt = (x) => Object.assign({
  geraet: "handy", bis: "2026-09-20", leistung: 93, bedienbarkeit: 95,
  gute_praxis: 96, auffindbarkeit: 100, quelle: "google", werkzeug: "13.4.1"
}, x || {});

/* ── 1 · Eine Lücke ist eine Lücke ───────────────────────────────────────── */
console.log("── Was nachgezogen wird ──");
{
  const eintraege = [{ anchorId: "a", label: "A", url: "https://a.example/" }];
  const reihen = { a: { punkte: [punkt()] } };
  const r = luecken({ eintraege, stand: { eintraege: {} }, reihen });
  ok(r.length === 1 && r[0].anchorId === "a", "ein leerer Bericht bekommt die Zahl aus der Reihe", JSON.stringify(r));
  ok(r[0] && r[0].messung.leistung === 93 && r[0].messung.gemessen === "2026-09-20",
     "Zahl UND Datum kommen mit — eine Zahl ohne Datum waere eine Behauptung");
  ok(r[0] && r[0].messung.url === "https://a.example/",
     "die Adresse kommt vom EINTRAG, nicht aus der Reihe");
}

/* ── 2 · Die Haltefrist bleibt unberührt ─────────────────────────────────── */
{
  const eintraege = [{ anchorId: "a", label: "A" }];
  const reihen = { a: { punkte: [punkt({ bis: "2026-09-22", leistung: 12 })] } };
  const stand = { eintraege: { a: { messung: { leistung: 98, gemessen: "2026-09-19",
    zurueckgehalten: { zahl: 1, noetig: 3 } } } } };
  ok(luecken({ eintraege, stand, reihen }).length === 0,
     "eine vorhandene Messung wird NICHT angefasst — auch nicht von einer frischeren Reihe");
}
{
  /* Die Gegenrichtung: ein Bericht-Eintrag OHNE eine einzige Zahl ist keine
   * Messung, sondern ein Platzhalter — der wird sehr wohl gefüllt. */
  const stand = { eintraege: { a: { lage: "ohne_spore", messung: { stand: "nicht_gemessen" } } } };
  ok(luecken({ eintraege: [{ anchorId: "a", label: "A" }], stand,
              reihen: { a: { punkte: [punkt()] } } }).length === 1,
     "ein Eintrag mit messung OHNE Zahl gilt als leer, nicht als gemessen");
}

/* ── 3 · Ohne Zahl kein Band ─────────────────────────────────────────────── */
console.log("── Was NICHT nachgezogen wird ──");
{
  const leer = { geraet: "handy", bis: "2026-09-20" };
  ok(messungAusPunkt(leer, "https://a.example/") === null,
     "ein Punkt ohne eine einzige Zahl ergibt KEINE Messung");
  ok(messungAusPunkt(null, "x") === null, "kein Punkt, keine Messung");
}
{
  const nurDesktop = { punkte: [punkt({ geraet: "desktop", leistung: 99 })] };
  ok(juengsterHandyPunkt(nurDesktop) === null,
     "ein reiner Desktop-Punkt zaehlt nicht — die Karte zeigt die Handy-Zahl");
  const beide = { punkte: [punkt({ geraet: "desktop", leistung: 99 }), punkt({ leistung: 40 })] };
  ok((juengsterHandyPunkt(beide) || {}).leistung === 40,
     "aus gemischten Punkten kommt der Handy-Punkt");
}
{
  const reihen = { punkte: [punkt({ bis: "2026-08-01", leistung: 10 }),
                            punkt({ bis: "2026-09-20", leistung: 93 }),
                            punkt({ bis: "2026-09-01", leistung: 50 })] };
  ok((juengsterHandyPunkt(reihen) || {}).leistung === 93,
     "genommen wird der JUENGSTE Punkt, nicht der letzte in der Datei");
}

/* ── 4 · Die Mängel werden getrennt, nicht geraten ───────────────────────── */
{
  const a = hinweisAusMangel("leistung: Reduziere nicht verwendetes JavaScript");
  ok(a.k === "leistung" && a.t === "Reduziere nicht verwendetes JavaScript",
     "ein Mangel wird am Doppelpunkt getrennt");
  const b = hinweisAusMangel("Irgendein Satz ohne Trenner");
  ok(b.k === "" && b.t === "Irgendein Satz ohne Trenner",
     "ohne Doppelpunkt bleibt der ganze Satz stehen und die Kategorie leer — geraten wird nichts");
}

/* ── 5 · Kein Datum aus der Uhr ──────────────────────────────────────────── */
{
  const m = messungAusPunkt(punkt({ bis: "2026-01-02" }), "x");
  const heute = new Date().toISOString().slice(0, 10);
  ok(m.gemessen === "2026-01-02" && m.gemessen !== heute,
     "das Datum kommt aus dem Punkt, nie aus der Uhr");
}

/* ── 6 · Das Schaufenster bleibt draußen (benannte Grenze) ───────────────── */
{
  const eintraege = [{ anchorId: "a", label: "A" }];
  const reihen = { a: { punkte: [punkt()] }, "a--schaufenster": { punkte: [punkt()] } };
  const r = luecken({ eintraege, stand: { eintraege: {} }, reihen });
  ok(r.length === 1 && r.every((x) => !x.anchorId.includes("--schaufenster")),
     "eine Schaufenster-Reihe wird NICHT nachgezogen — sie hat ihre eigene Politik");
}

/* ── 7 · Der echte Bestand ───────────────────────────────────────────────── */
console.log("── Am echten Bestand ──");
{
  const eintraege = markteintraege(leseConfig("listings.js").FP_LISTINGS || [], leseWache());
  const stand = JSON.parse(lies("assets/config/spore-stand.json"));
  const reihen = JSON.parse(lies("forschung/messreihe.json")).reihen || {};
  /* ⚠ SELBST-RIEGEL: ohne Einträge und ohne Reihen waere die Zeile darunter
   * trivial wahr — sie misst dann nichts. */
  ok(eintraege.length > 10 && Object.keys(reihen).length > 10,
     `es gibt ueberhaupt Eintraege und Reihen (${eintraege.length} / ${Object.keys(reihen).length})`);
  const fehlt = luecken({ eintraege, stand, reihen });
  ok(fehlt.length === 0,
     "JEDE sichtbare Karte kennt ihre Messung, wenn die Reihe eine traegt",
     fehlt.map((f) => f.anchorId).join(", "));
  /* Und die Gegenrichtung zur Haltefrist: dass es Karten GIBT, die aelter sind
   * als ihre Reihe, ist kein Befund — sonst sabotierte dieser Wächter Klaus'
   * Entscheidung vom 2026-08-06. Gemessen wird nur, dass sie ihren Grund
   * mitbringen. */
  let ohneGrund = [];
  for (const x of eintraege) {
    const m = ((stand.eintraege || {})[x.anchorId] || {}).messung;
    const p = juengsterHandyPunkt(reihen[x.anchorId]);
    if (!m || !m.gemessen || !p) continue;
    const rd = p.bis || p.von || "";
    if (rd > m.gemessen && !m.zurueckgehalten) ohneGrund.push(x.anchorId);
  }
  ok(ohneGrund.length === 0,
     "eine Karte, die aelter ist als ihre Reihe, traegt `zurueckgehalten` als Grund",
     ohneGrund.join(", "));
}

/* ── 8 · Der nächtliche Lauf ruft es auf, und an der richtigen Stelle ────── */
console.log("── Der naechtliche Lauf ──");
{
  const w = lies(".github/workflows/vektoren-taeglich.yml");
  const iMessen = w.indexOf("node tools/forschung.mjs --messen");
  const iZieh = w.indexOf("node tools/messung-nachziehen.mjs");
  const iListen = w.indexOf("node tools/statische-listen.mjs");
  ok(iZieh > 0, "der Lauf ruft tools/messung-nachziehen.mjs ueberhaupt auf");
  ok(iMessen > 0 && iZieh > iMessen,
     "und zwar NACH dem Messen — davor waere die Reihe noch die von gestern");
  ok(iListen > 0 && iZieh < iListen,
     "und VOR dem Bauen der Karten — danach waere es fuer diesen Lauf zu spaet");
}

console.log(`\n${pass} grün · ${fail} ROT`);
process.exit(fail ? 1 : 0);

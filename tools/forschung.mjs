/* Forschungsstation — die Messwerte über die Zeit, und warum sie sich ändern.
 *
 * Klaus' Auftrag (2026-08-04): „eine kleine Forschungsstation im Observatorium“,
 * die sich selber pflegt. Damit wir aus den Zahlen lernen, wie man eine Seite
 * baut, die von Anfang an gut ist — statt jede Seite einzeln nachzubessern.
 *
 * Drei Dateien, drei verschiedene Aufgaben:
 *
 *   forschung/messreihe.json  — die Zahlen über die Zeit. Maschine schreibt,
 *                               Mensch liest nie direkt hinein.
 *   forschung/JOURNAL.md      — was sich geändert hat UND warum. Den ersten Teil
 *                               schreibt dieses Werkzeug, den zweiten („Warum“)
 *                               trägt eine Sitzung von Hand nach. Das Werkzeug
 *                               fasst einen einmal geschriebenen Eintrag NIE
 *                               wieder an — sonst wäre jede Erklärung nach der
 *                               nächsten Nacht weg.
 *   forschung/LEHREN.md       — was wir daraus gelernt haben. Reine Handarbeit.
 *
 * Aufrufe:
 *   node tools/forschung.mjs --messen            eigene Ziele messen (nachts)
 *   node tools/forschung.mjs --nachtragen        Marktplatz-Messung einsortieren (nachts)
 *   node tools/forschung.mjs --zeigen [--ziel=X] [--seit=YYYY-MM-DD] [--bis=…]
 *   node tools/forschung.mjs --offen             Einträge ohne „Warum“ — die Kontrollliste
 *   node tools/forschung.mjs --rangliste         wo stehen wir gerade, wer bewegt sich
 *
 * WARUM eine eigene Datei und nicht spore-stand.json erweitern: spore-stand.json
 * ist ein SCHNAPPSCHUSS, den die nächtliche Aktion überschreibt. Sie kennt nur
 * das Heute. Eine Verlaufsfrage („war das vor der Bildumstellung schon so?“)
 * kann sie prinzipiell nicht beantworten. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MESSUNG_GERAET, MESSUNG_GERAETE } from "./messung.mjs";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REIHE = path.join(WURZEL, "forschung", "messreihe.json");
const JOURNAL = path.join(WURZEL, "forschung", "JOURNAL.md");
const STAND = path.join(WURZEL, "assets", "config", "spore-stand.json");

const MASSE = ["leistung", "bedienbarkeit", "gute_praxis", "auffindbarkeit"];
const TITEL = {
  leistung: "Leistung",
  bedienbarkeit: "Bedienbarkeit",
  gute_praxis: "Gute Praxis",
  auffindbarkeit: "Auffindbarkeit"
};

/* Ab welchem Sprung ein Eintrag ins Journal wandert.
 *
 * Zuerst auf 14 geschätzt, nach der ERSTEN Nacht auf 20 korrigiert — und zwar
 * gemessen, nicht geraten. In der Nacht vom 4. auf den 5. August lagen fünf
 * Seiten vor, die sich NACWEISLICH nicht geändert hatten (letzter Commit
 * 2026-08-03, also vor beiden Messungen), zweimal von derselben Quelle
 * (Google) gemessen:
 *
 *   Jasons-Tresor  83 → 64   (−19)
 *   Kimboard       98 → 92   ( −6)
 *   Kim-Bell       97 → 96   ( −1)
 *   Mein-Tresor    72 → 71   ( −1)
 *   Kimseek        99 → 99   (  0)
 *
 * An unveränderten Seiten schwankt also auch Googles Zahl um bis zu 19 Punkte.
 * Ein Schwellwert darunter erklärt Rauschen zum Ereignis. Wer ihn wieder senkt,
 * holt sich das Journal voll mit Sprüngen, die keine sind.
 *
 * ── UND DIE 20 HAT NICHT GEREICHT (2026-08-06) ────────────────────────────
 * Zwei Nächte später lieferte DIESELBE unveränderte Seite — Jasons-Tresor, seit
 * dem 2026-08-03 kein Commit — 83 · 64 · 97. Das sind 33 Punkte Spanne, und der
 * Sprung 64 → 97 ist glatt durch diesen Filter gelaufen und stand als Erfolg im
 * Journal, obwohl niemand etwas gebaut hatte.
 *
 * Die Lehre daraus ist NICHT „dann eben 35". Eine Schwelle, die aus dem
 * bisherigen Maximum abgeleitet wird, ist immer zu niedrig: sie kennt nur die
 * Ausreißer, die schon vorgekommen sind. Die 19 war kein Naturgesetz, die 33
 * ist es genauso wenig.
 *
 * Klaus' Entscheid vom 2026-08-06: **ein Sprung wird erst gemeldet, wenn ihn
 * die NÄCHSTE Messung hält.** Die Schwelle bleibt bei 20 und sagt weiterhin,
 * was überhaupt groß genug ist, um hinzusehen — aber sie entscheidet nicht mehr
 * allein. Rauschen ist per Definition das, was beim nächsten Mal weg ist; ein
 * echter Bau bleibt stehen. Das trifft die Ursache statt das Symptom und
 * braucht keine geratene Zahl.
 *
 * Kosten, ehrlich benannt: der Eintrag kommt einen Tag später, und wenn eine
 * Seite genau einmal gemessen und danach nie wieder, bleibt ihr Sprung für
 * immer Verdacht. Beides ist weniger schlimm als ein Journal voller Erfolge,
 * die keine sind.
 *
 * Gegenprobe: tests/gegenprobe_forschung_bestaetigung.sh */
const SCHWELLE = 20;

const arg = (name, ersatz) => {
  const t = process.argv.find((a) => a.startsWith(`--${name}=`));
  return t ? t.split("=").slice(1).join("=") : ersatz;
};
const hat = (name) => process.argv.includes(`--${name}`);
const heute = () => new Date().toISOString().slice(0, 10);

function lesen(datei, ersatz) {
  try { return JSON.parse(fs.readFileSync(datei, "utf8")); }
  catch { return ersatz; }
}

/* ---- Messungen aus dem Tagesbericht einsammeln ---------------------------- */

/* Ein Eintrag mit Schaufenster liefert ZWEI Messungen (App + Landingpage). Die
 * Forschungsstation behandelt sie als zwei getrennte Ziele — sie sind zwei
 * verschiedene Seiten mit zwei verschiedenen Bauweisen, und genau der
 * Unterschied ist interessant (Mein-Mixarium: App 37, Landingpage 63). */
function messungenSammeln(stand) {
  const raus = [];
  for (const [id, e] of Object.entries((stand && stand.eintraege) || {})) {
    const nimm = (m, zielId, name) => {
      if (!m || m.stand !== "gemessen") return;
      if (!MASSE.every((k) => Number.isFinite(m[k]))) return;
      raus.push({
        id: zielId,
        name,
        url: m.url || "",
        gemessen: m.gemessen || heute(),
        /* Ohne Angabe Handy: der Marktplatz-Tagesbericht kennt kein Gerät und
         * wird über PageSpeeds Voreinstellung gemessen. */
        geraet: m.geraet || MESSUNG_GERAET,
        quelle: m.quelle || "eigen",
        werkzeug: m.werkzeug || "",
        werte: Object.fromEntries(MASSE.map((k) => [k, m[k]])),
        mangel: (m.hinweise || []).map((h) => `${h.k}: ${h.t}`).sort()
      });
    };
    /* Ohne Spore hat ein Eintrag keinen `nodeName`. Dann ist der letzte Teil
     * der Adresse der bessere Name als die interne Anker-Kennung — „markt-
     * perfect-skin-fashion“ in einer Rangliste liest sich wie ein Datenbankfeld,
     * „Perfect-Skin-Fashion“ wie eine Seite. */
    const ausUrl = (u) => {
      const t = String(u || "").replace(/\/+$/, "").split("/").pop();
      return t && !/^https?:$/.test(t) ? t : "";
    };
    const name = e.nodeName || ausUrl(e.messung && e.messung.url) || id;
    /* Die Messreihe bekommt IMMER die echte Messung, nie den zurückgehaltenen
     * Karten-Wert (Haltefrist seit 2026-08-06, siehe tools/messung.mjs). Sonst
     * verlöre die Station genau die Beweise, mit denen der Ausreißer überhaupt
     * aufgefallen ist — an Jasons-Tresor 83 · 64 · 97. Die Karte darf einen
     * schlechten Würfelwurf aussitzen; die Forschung darf ihn nicht vergessen. */
    const echt = (mess) => (mess && mess.frisch ? { ...mess, ...mess.frisch } : mess);
    nimm(echt(e.messung), id, name);
    nimm(echt(e.messung && e.messung.schaufenster), `${id}--schaufenster`,
      `${name} (Schaufenster)`);
  }
  return raus;
}

/* ---- Einsortieren --------------------------------------------------------- */

/* Punkte aus der Zeit vor dem 2026-08-07 tragen kein `geraet`. Sie sind
 * trotzdem alle Handy-Werte, und das ist nachprüfbar, nicht geschätzt:
 *   · Weg B setzte seit dem ersten Tag der Messreihe `strategy=mobile`
 *     (tools/messung.mjs, Commit e048abd vom 2026-08-04; die Zeile wurde nie
 *     geändert — `git log -S strategy -- tools/messung.mjs` zeigt genau einen
 *     Treffer).
 *   · Weg A hat `formFactor` NIE gesetzt (`git log -S formFactor` ist leer),
 *     und Lighthouses Voreinstellung ist das Handy.
 * Darum werden sie einmalig nachbeschriftet statt als „unbekannt" geführt —
 * ein ehrliches „unbekannt" wäre hier schlechter, weil es eine Ungewissheit
 * behauptet, die es nicht gibt. Der Lauf ist idempotent: was schon ein `geraet`
 * hat, wird nicht angefasst, und ein späterer Wechsel des Messgeräts stempelt
 * deshalb keine fremden Punkte um. */
function geraetNachtragen(reihe) {
  let n = 0;
  for (const r of Object.values(reihe.reihen || {})) {
    for (const p of r.punkte || []) {
      if (!p.geraet) { p.geraet = "handy"; n++; }
    }
  }
  if (n) console.log(`  · ${n} Punkt(e) ohne Gerät nachbeschriftet (alle Handy, siehe Kommentar).`);
  return n;
}

const gleich = (a, b) =>
  a && b && MASSE.every((k) => a.werte[k] === b.werte[k]) &&
  JSON.stringify(a.mangel) === JSON.stringify(b.mangel);

function nachtragen() {
  const stand = lesen(STAND, null);
  if (!stand) { console.error("Kein Tagesbericht gefunden — nichts einzusortieren."); process.exit(1); }
  einsortieren(stand);
}

/* Ein einziger Einsortier-Pfad für BEIDE Quellen — den Marktplatz-Tagesbericht
 * und die eigenen Ziele. Zwei Pfade wären zwei Wahrheiten, die auseinander-
 * laufen; man merkt es erst an einem Verlauf, der an einer Stelle Lücken hat
 * und an einer anderen doppelte Punkte. */
function einsortieren(stand) {
  const reihe = lesen(REIHE, { fassung: 1, reihen: {} });
  reihe.reihen = reihe.reihen || {};
  geraetNachtragen(reihe);

  const neu = messungenSammeln(stand);
  const ereignisse = [];
  let angelegt = 0, fortgeschrieben = 0, verlaengert = 0, verdaechtig = 0, verworfen = 0;

  for (const m of neu) {
    const r = reihe.reihen[m.id] || (reihe.reihen[m.id] = { name: m.name, url: m.url, punkte: [] });
    r.name = m.name; r.url = m.url || r.url;
    const letzt = r.punkte[r.punkte.length - 1];

    const punkt = {
      von: m.gemessen, bis: m.gemessen,
      ...m.werte,
      geraet: m.geraet,
      quelle: m.quelle, werkzeug: m.werkzeug,
      mangel: m.mangel
    };

    if (!letzt) { r.punkte.push(punkt); angelegt++; continue; }

    /* ── Steht ein Verdacht offen? Dann ist DIESE Messung sein Richter. ──────
     * Muss VOR der „gleich"-Abkürzung weiter unten stehen. Eine Messung, die
     * denselben Wert nochmal liefert, springt dort mit `continue` heraus — und
     * genau die ist die STÄRKSTE Bestätigung, die es gibt. Stünde die Prüfung
     * darunter, bliebe ein gehaltener Sprung ewig Verdacht. */
    const urteil = verdachtPruefen(r, m);
    if (urteil) {
      delete r.verdacht;
      if (urteil.gehalten.length) {
        ereignisse.push({
          ziel: m.id, name: m.name, url: m.url,
          datum: urteil.gesehen, bestaetigt: m.gemessen,
          sprung: urteil.gehalten, weg: urteil.weg, dazu: urteil.dazu,
          quelle: urteil.quelle, quellwechsel: urteil.quellwechsel
        });
      } else {
        verworfen++;
        console.log(`  · ${m.name}: Verdacht vom ${urteil.gesehen} hat nicht gehalten — kein Eintrag.`);
      }
    }

    /* Eine Messung, die dasselbe sagt wie die letzte, verlängert deren Spanne.
     * Ein neuer Punkt für einen unveränderten Tag wäre kein Erkenntnisgewinn,
     * nur Zeilen. */
    if (gleich({ werte: m.werte, mangel: m.mangel },
               { werte: Object.fromEntries(MASSE.map((k) => [k, letzt[k]])), mangel: letzt.mangel || [] })) {
      if (m.gemessen > letzt.bis) { letzt.bis = m.gemessen; verlaengert++; }
      continue;
    }

    /* Derselbe Tag, andere Zahl: die Messung ist nachgezogen worden (etwa von
     * eigener Messung auf Google). Dann wird der Punkt ERSETZT, nicht gestapelt
     * — sonst stünden zwei Wahrheiten für denselben Tag. */
    if (letzt.von === m.gemessen && letzt.bis === m.gemessen) {
      r.punkte[r.punkte.length - 1] = punkt;
    } else {
      r.punkte.push(punkt);
    }
    fortgeschrieben++;

    /* Nach einem VERWORFENEN Verdacht wird nicht gegen den Ausreißer gerechnet,
     * sondern gegen den Stand, der vor ihm galt.
     *
     * Ohne das dreht sich eine schwankende Seite selbst einen Eintrag an: bei
     * 50 → 90 → 50 wird der Ausschlag auf 90 zu Recht verworfen — aber die
     * Rückkehr auf 50 wäre gegenüber `letzt` (90) wieder ein Sprung von 40 und
     * würde beim nächsten Mal bestätigt. Das Journal meldete dann „90 → 50",
     * obwohl die Seite die ganze Zeit bei 50 stand und nur einmal verrauscht
     * war. Der Ausreißer darf nicht zum Maßstab werden, an dem alles Weitere
     * gemessen wird. */
    const basis = (urteil && !urteil.gehalten.length)
      ? Object.fromEntries(urteil.alle.map((s) => [s.k, s.alt]))
      : null;
    const vonWo = (k) => (basis && typeof basis[k] === "number" ? basis[k] : letzt[k]);

    const sprung = MASSE
      .map((k) => ({ k, alt: vonWo(k), neu: m.werte[k], d: m.werte[k] - vonWo(k) }))
      .filter((x) => Math.abs(x.d) >= SCHWELLE);
    const weg = (letzt.mangel || []).filter((x) => !m.mangel.includes(x));
    const dazu = m.mangel.filter((x) => !(letzt.mangel || []).includes(x));

    /* NUR ein Sprung macht ein Ereignis — eine geänderte Beanstandungsliste
     * allein nicht. In der ersten Nacht waren vier von sechs Journal-Einträgen
     * genau das: „Erzwungener dynamischer Umbruch“ verschwand bei zwei Seiten
     * und tauchte bei drei anderen auf, ohne dass sich eine Zahl bewegte oder
     * jemand etwas gebaut hätte. Die Liste wackelt an ihren eigenen Schwellen.
     * Solche Wechsel sind trotzdem interessant — sie stehen weiter IM Eintrag
     * als Begleitinformation, bekommen aber keinen eigenen mehr. */
    if (!sprung.length) continue;

    /* Wechselt die Messquelle, ist der Sprung mit hoher Wahrscheinlichkeit die
     * Quelle und nicht die Seite. Das gehört an den Anfang des Eintrags, sonst
     * liest sich eine Umstellung wie ein Erfolg — real passiert: Mein Mixarium
     * sprang über Nacht von 37 auf 75, ohne dass eine Zeile geändert wurde. */
    const quellwechsel = (letzt.quelle || "eigen") !== m.quelle
      ? { von: letzt.quelle || "eigen", nach: m.quelle }
      : null;

    /* KEIN Eintrag — nur ein gemerkter Verdacht. Er wandert nach
     * forschung/messreihe.json und wartet auf die nächste Messung. Die Datei
     * steht in der `git add`-Liste der Aktion, der Verdacht überlebt die Nacht
     * also. Was hier festgehalten wird, ist der Stand VOR dem Sprung (`alt`) —
     * daran wird morgen gemessen, nicht am Sprungwert. */
    r.verdacht = { gesehen: m.gemessen, sprung, weg, dazu, quelle: m.quelle, quellwechsel };
    verdaechtig++;
  }

  reihe.gepflegt = heute();
  fs.writeFileSync(REIHE, JSON.stringify(reihe, null, 1) + "\n");

  const geschrieben = journalSchreiben(ereignisse);
  console.log(`Messreihe: ${angelegt} neu, ${fortgeschrieben} fortgeschrieben, ${verlaengert} unverändert (Spanne verlängert).`);
  if (verdaechtig) console.log(`Verdacht gemerkt: ${verdaechtig} — wartet auf die nächste Messung, noch kein Eintrag.`);
  if (verworfen) console.log(`Verdacht verworfen: ${verworfen} — Sprung hat nicht gehalten.`);
  console.log(`Journal: ${geschrieben} neue(r) Eintrag/Einträge.`);
  if (geschrieben) console.log(`  → node tools/forschung.mjs --offen  zeigt, wo das „Warum“ noch fehlt.`);
}

/* Der Richter über einen offenen Verdacht.
 *
 * Gemessen wird gegen `alt` — den Stand VOR dem Sprung —, nicht gegen den
 * Sprungwert. Der Unterschied ist der ganze Punkt: die Frage lautet nicht „ist
 * die Zahl heute dieselbe wie gestern?", sondern „ist sie immer noch DORT, wo
 * sie hingesprungen ist?". Eine Seite, die von 83 auf 97 springt und dann auf
 * 95 zurückgeht, hat sich verbessert; eine, die auf 84 zurückfällt, hat nur
 * gerauscht — obwohl der zweite Fall dem ersten von Tag zu Tag ähnlicher sieht.
 *
 * Die Richtung muss stimmen. Ein Sprung nach oben, der beim nächsten Mal ebenso
 * weit UNTEN liegt, ist keine Bestätigung, sondern ein zweites Rauschen. */
function verdachtPruefen(r, m) {
  const v = r.verdacht;
  if (!v) return null;
  /* Wird derselbe Tag nachgezogen (eigene Messung → Google), ist das keine
   * zweite Nacht. Der Verdacht bleibt stehen und wird unten neu gerechnet. */
  if (!(m.gemessen > v.gesehen)) return null;
  const gehalten = v.sprung.filter((s) => {
    const jetzt = m.werte[s.k];
    if (typeof jetzt !== "number") return false;
    const d = jetzt - s.alt;
    return Math.abs(d) >= SCHWELLE && (d > 0) === (s.d > 0);
  }).map((s) => Object.assign({}, s, { haelt: m.werte[s.k] }));
  return { gesehen: v.gesehen, weg: v.weg, dazu: v.dazu, quelle: v.quelle, quellwechsel: v.quellwechsel,
           gehalten, alle: v.sprung };
}

/* ---- Journal -------------------------------------------------------------- */

const MARKE = "<!-- forschung:auto -->";

function journalSchreiben(ereignisse) {
  if (!ereignisse.length) return 0;
  let text = fs.existsSync(JOURNAL) ? fs.readFileSync(JOURNAL, "utf8") : journalKopf();
  if (!text.includes(MARKE)) text += `\n${MARKE}\n`;

  const bloecke = ereignisse.map((e) => {
    const zeilen = [];
    zeilen.push(`### ${e.datum} · ${e.name}`);
    zeilen.push("");
    zeilen.push(`<${e.url}> · Quelle der Zahlen: ${e.quelle === "google" ? "Google PageSpeed Insights" : "eigene Messung"}`);
    zeilen.push("");
    if (e.quellwechsel) {
      const n = (q) => (q === "google" ? "Google PageSpeed Insights" : "eigene Messung");
      zeilen.push(`> ⚠ **Die Messquelle hat gewechselt** (${n(e.quellwechsel.von)} → ` +
        `${n(e.quellwechsel.nach)}). Der Sprung sagt hier zuerst etwas über die ` +
        `**Messung** aus, nicht über die Seite. Wer ihn als Verbesserung liest, irrt.`);
      zeilen.push("");
    }
    for (const s of e.sprung) {
      const pfeil = s.d > 0 ? "↑" : "↓";
      const halt = (e.bestaetigt && typeof s.haelt === "number") ? `, am ${e.bestaetigt} noch ${s.haelt}` : "";
      zeilen.push(`- **${TITEL[s.k]} ${s.alt} → ${s.neu}** (${pfeil} ${Math.abs(s.d)}${halt})`);
    }
    /* Warum das dasteht: der Eintrag ist auf den Tag des Sprungs datiert, wurde
     * aber später geschrieben. Ohne diese Zeile sähe es aus, als hätte das
     * Werkzeug einen Tag geschlafen. */
    if (e.bestaetigt) {
      zeilen.push("");
      zeilen.push(`> Gesehen am ${e.datum}, **bestätigt durch die Messung vom ${e.bestaetigt}**. ` +
        `Ein Sprung allein macht keinen Eintrag mehr — er muss die nächste Messung überstehen ` +
        `(Klaus 2026-08-06, siehe \`LEHREN.md\` Lehre 6c).`);
    }
    for (const w of e.weg) zeilen.push(`- Beanstandung weg: ${w}`);
    for (const d of e.dazu) zeilen.push(`- Beanstandung neu: ${d}`);
    zeilen.push("");
    zeilen.push("**Warum:** _(noch nicht eingetragen)_");
    zeilen.push("");
    return zeilen.join("\n");
  });

  /* Neues kommt nach oben, direkt unter die Marke. Alles darunter bleibt
   * unangetastet — auch das von Hand nachgetragene „Warum“. */
  const [kopf, rest] = text.split(MARKE);
  fs.writeFileSync(JOURNAL, `${kopf}${MARKE}\n\n${bloecke.join("\n")}${rest.replace(/^\n+/, "\n")}`);
  return ereignisse.length;
}

function journalKopf() {
  return `# Forschungs-Journal — was sich geändert hat, und warum

Diese Datei hat zwei Verfasser. **Das Werkzeug** (\`tools/forschung.mjs\`, jede
Nacht) trägt ein, *was* passiert ist: welche Zahl gesprungen ist, welche
Beanstandung verschwunden oder dazugekommen ist. **Eine Sitzung** trägt danach
von Hand ein, *warum* — was gebaut wurde, das diesen Sprung verursacht hat.

Das Werkzeug fasst einen einmal geschriebenen Eintrag nie wieder an. Was hier
an Erklärung steht, bleibt stehen.

Fehlt bei einem Eintrag noch das „Warum“, findet man ihn mit:

\`\`\`
node tools/forschung.mjs --offen
\`\`\`

Aus den beantworteten Einträgen wächst \`LEHREN.md\` — die Regeln, nach denen
die nächste Seite von vornherein gebaut wird.

---

`;
}

function offen() {
  if (!fs.existsSync(JOURNAL)) { console.log("Noch kein Journal."); return; }
  const text = fs.readFileSync(JOURNAL, "utf8");
  const bloecke = text.split(/^### /m).slice(1);
  const ohne = bloecke.filter((b) => b.includes("_(noch nicht eingetragen)_"));
  if (!ohne.length) { console.log("✓ Jeder Journal-Eintrag hat ein „Warum“."); return; }
  console.log(`${ohne.length} Eintrag/Einträge ohne „Warum“:\n`);
  for (const b of ohne) {
    const kopf = b.split("\n")[0];
    const punkte = b.split("\n").filter((l) => l.startsWith("- ")).slice(0, 4);
    console.log(`  ### ${kopf}`);
    for (const p of punkte) console.log(`    ${p}`);
    console.log("");
  }
}

/* ---- Zeigen --------------------------------------------------------------- */

/* Welcher Punkt galt an einem bestimmten Tag? Genau der, dessen Spanne ihn
 * enthält. Das ist der ganze Grund für von/bis. */
const galtAm = (punkte, tag) => punkte.find((p) => p.von <= tag && tag <= p.bis) || null;

function zeigen() {
  const reihe = lesen(REIHE, { reihen: {} });
  const nurZiel = arg("ziel", "");
  const seit = arg("seit", "");
  const bis = arg("bis", "9999-12-31");
  const namen = Object.keys(reihe.reihen).filter((k) =>
    !nurZiel || k.includes(nurZiel) || (reihe.reihen[k].name || "").toLowerCase().includes(nurZiel.toLowerCase()));

  if (!namen.length) { console.log("Nichts gefunden."); return; }

  for (const id of namen.sort()) {
    const r = reihe.reihen[id];
    const punkte = r.punkte.filter((p) => p.bis >= seit && p.von <= bis);
    if (!punkte.length) continue;
    console.log(`\n═══ ${r.name}`);
    console.log(`    ${r.url}`);
    console.log(`    Zeitraum                Leist  Bedien  Praxis  Auffind  Gerät   Quelle`);
    for (const p of punkte) {
      const spanne = p.von === p.bis ? p.von : `${p.von}…${p.bis}`;
      console.log(`    ${spanne.padEnd(23)} ${String(p.leistung).padStart(3)}` +
        `    ${String(p.bedienbarkeit).padStart(3)}` +
        `     ${String(p.gute_praxis).padStart(3)}` +
        `      ${String(p.auffindbarkeit).padStart(3)}` +
        `   ${String(p.geraet || "?").padEnd(6)}` +
        `  ${p.quelle === "google" ? "Google" : "eigen"}`);
    }
    const a = punkte[0], z = punkte[punkte.length - 1];
    if (a !== z) {
      const d = MASSE.map((k) => `${TITEL[k]} ${z[k] - a[k] >= 0 ? "+" : ""}${z[k] - a[k]}`).join(" · ");
      console.log(`    ── über den Zeitraum: ${d}`);
    }
  }
}

function rangliste() {
  const reihe = lesen(REIHE, { reihen: {} });
  const zeilen = [];
  for (const [id, r] of Object.entries(reihe.reihen)) {
    const p = r.punkte[r.punkte.length - 1];
    if (!p) continue;
    const schnitt = MASSE.reduce((s, k) => s + p[k], 0) / MASSE.length;
    const erst = r.punkte[0];
    zeilen.push({ id, name: r.name, p, schnitt, bewegung: schnitt - MASSE.reduce((s, k) => s + erst[k], 0) / MASSE.length });
  }
  zeilen.sort((a, b) => b.schnitt - a.schnitt);
  /* Das Gerät gehört über die Tabelle, nicht daneben: eine Rangliste, der man
   * nicht ansieht, für welches Gerät sie gilt, wird als „die" Rangfolge gelesen.
   * Am 2026-08-07 lagen an denselben Seiten Handy und Computer 43 Punkte
   * auseinander (Muttis 44 gegen 87). */
  const geraete = [...new Set(zeilen.map((z) => z.p.geraet || "?"))].sort();
  console.log(`\nStand — Schnitt aus allen vier Maßen, beste zuerst.`);
  console.log(`Gemessenes Gerät: ${geraete.join(" + ")}. Ein anderes Gerät ergibt andere Zahlen.\n`);
  console.log(`   Schnitt  Leist Bedien Praxis Auffind  seit Beginn   Seite`);
  for (const z of zeilen) {
    const bew = z.bewegung === 0 ? "  ·  " : `${z.bewegung > 0 ? "+" : ""}${z.bewegung.toFixed(1)}`;
    console.log(`   ${z.schnitt.toFixed(1).padStart(6)}   ` +
      `${String(z.p.leistung).padStart(4)}${String(z.p.bedienbarkeit).padStart(7)}` +
      `${String(z.p.gute_praxis).padStart(7)}${String(z.p.auffindbarkeit).padStart(8)}` +
      `${bew.padStart(13)}   ${z.name}`);
  }
  console.log(`\n   „seit Beginn“ ist die Bewegung gegenüber dem ersten aufgezeichneten Punkt.`);
  console.log(`   Wo das ein Punkt ist, steht ·  — dann gibt es noch keinen Verlauf.\n`);
}

/* ---- Eigene Ziele messen (die, die NICHT im Marktplatz stehen) ------------ */

/* Klaus 2026-08-04: „wir wollen bitte kein Repo auslassen, was dazu geeignet
 * wäre, geprüft zu werden.“ Der Marktplatz ist Klaus' kuratiertes Schaufenster
 * und soll nicht durch Mess-Ziele verwässert werden — darum eine EIGENE Liste
 * (forschung/messziele.json), die nur die Forschungsstation kennt.
 *
 * Gemessen wird mit demselben `seiteMessen` wie der Marktplatz: mit hinterlegtem
 * Schlüssel über Googles PageSpeed Insights, sonst selbst. Der Weg steht danach
 * in jedem Punkt im Feld `quelle`. */
async function messen() {
  const liste = lesen(path.join(WURZEL, "forschung", "messziele.json"), null);
  if (!liste) { console.error("forschung/messziele.json fehlt."); process.exit(1); }
  const alle = liste.ziele || [];
  const aus = alle.filter((z) => z.aktiv === false);
  const an = alle.filter((z) => z.aktiv !== false);

  const { seiteMessen, messungBilden, reihenfolge, werkzeugDa, hatZahlen } =
    await import("./messung.mjs");

  /* Ohne Schlüssel misst jede Seite rund eine Minute. Der Deckel hält den
   * nächtlichen Lauf in seiner Zeitgrenze; wer heute nicht drankommt, kommt
   * beim nächsten Mal zuerst dran (ältester Befund zuerst). Das wird GESAGT,
   * nicht verschwiegen — sonst liest sich ein halber Durchgang wie ein ganzer. */
  /* Der Deckel zählt ZIELE, nicht Messungen. Seit dem 2026-08-08 kostet jedes
   * Ziel zwei Messungen (Handy + Computer) — der Lauf dauert also doppelt so
   * lange wie vorher, bei gleicher Zahl im Deckel. Das steht hier, damit
   * niemand die Zahl später für „Messungen" hält und den Lauf versehentlich
   * halbiert. */
  const deckel = Number(process.env.FORSCHUNG_MAX || 6);
  const reihe = lesen(REIHE, { fassung: 1, reihen: {} });
  reihe.reihen = reihe.reihen || {};

  if (!werkzeugDa({})) {
    console.log("Lighthouse ist nicht verfügbar und kein PSI-Schlüssel gesetzt — es wird nicht gemessen.");
    if (!process.env.PSI_API_KEY) return;
  }

  const vorher = {};
  for (const z of an) {
    const p = (reihe.reihen[z.id] || {}).punkte;
    if (p && p.length) vorher[z.id] = { gemessen: p[p.length - 1].bis };
  }
  const dran = reihenfolge(an, vorher).slice(0, deckel);
  if (an.length > dran.length) {
    console.log(`Deckel ${deckel}: ${an.length - dran.length} Ziel(e) kommen heute nicht dran — ` +
      `ihr letzter Befund bleibt mit seinem Datum stehen.`);
  }
  for (const z of aus) console.log(`  · ${z.name}: nicht gemessen — ${z.grund || "kein Grund vermerkt"}`);

  const tag = heute();
  const frisch = { eintraege: {} };
  /* JEDES Ziel wird auf BEIDEN Geräten gemessen (Klaus 2026-08-08). Der Grund
   * steht in den Zahlen desselben Tages: Sage-Protokol 83 am Handy gegen 99 am
   * Computer, Muttis Rezeptbuch 61 gegen 95. Eine Reihe, die nur das Handy
   * kennt, lässt zwei Seiten wie Sanierungsfälle aussehen, die auf dem
   * Computer längst gut sind.
   *
   * WARUM ZWEI REIHEN und nicht zwei Punkte in einer: die ganze Auswertung
   * dahinter — Spanne verlängern, Sprung erkennen, Verdacht bestätigen —
   * vergleicht einen Punkt mit dem VORHERIGEN derselben Reihe. Lägen Handy und
   * Computer abwechselnd darin, verglichen diese Regeln zwei verschiedene
   * Geräte miteinander und meldeten bei jedem Lauf einen Sprung, den es nicht
   * gibt. Der Computer bekommt darum eine eigene Reihe `<id>--computer`, genau
   * wie es die Schaufenster-Seiten schon tun. */
  for (const z of dran) {
    for (const geraet of MESSUNG_GERAETE) {
      const istComputer = geraet === "computer";
      const zielId = istComputer ? `${z.id}--computer` : z.id;
      const zielName = istComputer ? `${z.name} (Computer)` : z.name;

      const roh = await seiteMessen(z.url, { geraet });
      const m = messungBilden({ vorher: undefined, roh, heute: tag });
      m.url = z.url;
      m.geraet = geraet;
      if (!hatZahlen(m)) {
        console.log(`  ! ${zielName}: nicht gemessen (${m.hinweis || roh.hinweis || "kein Grund genannt"})`);
        continue;
      }
      console.log(`  ✓ ${zielName}: ${m.leistung}/${m.bedienbarkeit}/${m.gute_praxis}/${m.auffindbarkeit}` +
        ` (${m.quelle === "google" ? "Google" : "eigen"})`);
      frisch.eintraege[zielId] = { nodeName: zielName, messung: m };
    }
  }

  /* Einsortiert wird über denselben Weg wie die Marktplatz-Zahlen — ein zweiter
   * Einsortier-Pfad wäre eine zweite Wahrheit, die auseinanderläuft. */
  const gemessen = Object.keys(frisch.eintraege).length;
  if (!gemessen) { console.log("Nichts Neues zu verbuchen."); return; }
  einsortieren(frisch);
}

/* ---- Einstieg ------------------------------------------------------------- */

if (hat("messen")) await messen();
else if (hat("geraet-nachtragen")) {
  /* Eigener Aufruf, damit die Nachbeschriftung NICHT über `--nachtragen`
   * laufen muss. Der Weg wäre gefährlich: `--nachtragen` beurteilt offene
   * Verdachte mit dem Tagesbericht, und liegt der schon in der Reihe, würde er
   * seinen eigenen Sprung „bestätigen" — am 2026-08-07 wären so drei Einbrüche
   * an unangetasteten Seiten als echt ins Journal gewandert. */
  const reihe = lesen(REIHE, { fassung: 1, reihen: {} });
  const n = geraetNachtragen(reihe);
  if (n) { fs.writeFileSync(REIHE, JSON.stringify(reihe, null, 1) + "\n"); console.log(`  → geschrieben.`); }
  else console.log("  · Jeder Punkt trägt schon sein Gerät — nichts zu tun.");
}
else if (hat("nachtragen")) nachtragen();
else if (hat("offen")) offen();
else if (hat("rangliste")) rangliste();
else if (hat("zeigen")) zeigen();
else {
  console.log(`Forschungsstation — Messwerte über die Zeit.

  node tools/forschung.mjs --messen                     eigene Ziele messen (forschung/messziele.json)
  node tools/forschung.mjs --nachtragen                 Marktplatz-Messung einsortieren
  node tools/forschung.mjs --zeigen                     alle Ziele, ganzer Verlauf
  node tools/forschung.mjs --zeigen --ziel=mixarium     nur ein Ziel
  node tools/forschung.mjs --zeigen --seit=2026-08-01   ab einem Datum
  node tools/forschung.mjs --rangliste                  wo stehen wir gerade
  node tools/forschung.mjs --offen                      wo fehlt noch das „Warum“
`);
}

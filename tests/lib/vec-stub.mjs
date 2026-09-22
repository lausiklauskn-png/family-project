/* Der Vektor-Stub der Proben — EINE Fassung für alle.
 *
 * Er ersetzt im Browser das echte Einbettungs-Modul (Modul 03), damit die
 * Proben nicht am 30-MB-Modell hängen. Er wird in die SEITE gereicht, läuft
 * also dort, nicht hier.
 *
 * ⚠ ER STAND BIS ZUM 2026-09-22 ZWEIMAL — wortgleich in
 * `smoke_markt_vecpack.mjs` und `smoke_studio_vectors.mjs`. Ich habe die eine
 * Fassung repariert, der volle Lauf meldete die andere, und genau das ist die
 * Lehre dieses Depots an einer neuen Tür: zwei Fassungen derselben Sache
 * laufen auseinander, und der zweite Fehler kostet den zweiten Lauf.
 *
 * ⚠ WAS DARAN DREIFACH FALSCH WAR, mit den Zahlen vom 2026-09-22:
 *
 *   Vorher: `const winkel = ((String(t).length % 40) / 40) * Math.PI * 0.5;`
 *   Daneben stand: „Dadurch ist die Reihenfolge eindeutig."
 *
 *   1 · `% 40` lässt nur VIERZIG verschiedene Vektoren zu. Gemessen an den
 *       20 Marktplatz-Einträgen: 16 belegte Eimer, DREI Kollisionen — Mein
 *       Rezeptbuch ⟷ Jasons Tresor (beide 246 Zeichen) · Tomys Hub ⟷ PWA
 *       Toolpoint ⟷ Kim Hub Company · Mein Mixarium ⟷ Kimseek.
 *   2 · Und selbst OHNE Kollision faltet der Kosinus: cos(q−a) = cos(q+a).
 *       Zwei Einträge symmetrisch um den Anfrage-Winkel tragen dieselbe Zahl
 *       auf zwölf Nachkommastellen — gemessen: Muttis Rezeptbuch (Eimer 2)
 *       ⟷ Private Brain (Eimer 14), beide 0.972369920398.
 *   3 · UND DER ERSTE REPARATUR-VERSUCH MACHTE ES SCHLIMMER. Ein Streuwert
 *       über 1.000.003 Eimer nahm die Gleichstände weg und setzte BELIEBIG
 *       DICHTE Winkel an ihre Stelle. Das Paket ist int8-quantisiert
 *       (Schrittweite rund 1/127 ≈ 0,008); wo zwei Zahlen enger
 *       beieinanderliegen, kippt der Rang durch das Runden. Der
 *       Gleichstands-Riegel wurde grün, die Reihenfolge blieb falsch. Der
 *       alte Kommentar sprach von „KLAREN Abständen" und hatte damit recht —
 *       seine Rechnung hielt es nur nicht ein.
 *
 * DAMIT MASS DIE ZUSICHERUNG „Reihenfolge identisch zur Live-Berechnung"
 * ETWAS ANDERES, ALS IHR NAME SAGT: bei einem Gleichstand entscheidet die
 * Stabilität der Sortierung, und die ist zwischen dem Live-Weg (ein Stapel)
 * und dem Paket-Weg (teils aus dem Paket, teils live) nicht dieselbe.
 * Siebzehn Einträge lang war sie grün, weil kein Gleichstand ins Gewicht fiel.
 *
 * WAS JETZT GILT — und warum es von selbst trägt:
 *   · Die Anfrage ist die Achse selbst (v = e0). Damit IST die Punktzahl
 *     v[0], und der Kosinus kann nicht mehr falten.
 *   · Jeder Eintrag bekommt seinen Platz aus dem RANG seines Textes unter
 *     allen Marktplatz-Texten. Kollisionsfrei durch Bauart, nicht durch
 *     Glück — kein Streuwert, kein Modulo, keine Wahrscheinlichkeit.
 *   · Die Plätze liegen GLEICHMÄSSIG über 1,0 bis 0,2. Bei 20 Einträgen sind
 *     das rund 0,038 je Schritt, also das Fünffache der Quantisierung.
 *   · Und `abstandRiegel()` MISST diesen Abstand, statt ihn zu behaupten.
 *
 * Wie genau die Quantisierung wirklich ist, misst `smoke_vec_codec.mjs` an
 * ECHTEN Vektoren; hier geht es nur darum, dass die Proben Ränge messen und
 * nicht Rauschen. */

/* Wird in die Seite gereicht. `zusatz` hängt weitere Felder an
 * `window.SbkimEmbedding` (das Studio braucht Fortschritts-Meldungen). */
export function stubInSeite({ dim, model, mitFortschritt = false }) {
  window.__embedCount = 0;

  const texte = [...new Set((window.FP_LISTINGS || [])
    .filter((x) => x && x.anchorId).map((x) => String(x.text || x.label)))].sort();
  const rang = new Map(texte.map((t, i) => [t, i]));
  const N = Math.max(rang.size, 1);
  const SCHRITT = 0.8 / (N + 1);
  window.__vecSchritt = SCHRITT;

  const vecFor = (t) => {
    const s = String(t);
    const v = new Float32Array(dim);
    /* Die Anfrage IST die Achse — dann ist die Punktzahl genau v[0]. */
    const c = s.startsWith("q:") ? 1
      : 1 - ((rang.has(s) ? rang.get(s) : N) + 1) * SCHRITT;
    v[0] = c; v[1] = Math.sqrt(Math.max(0, 1 - c * c));
    return v;
  };
  window.__vecFor = vecFor;

  const modul = {
    _meta: { model, dim },
    embedQuery: async (t) => vecFor("q:" + t),
    embedPassageBatch: async (texts) => {
      window.__embedCount += texts.length; return texts.map(vecFor);
    },
    init: async () => {},
  };
  if (mitFortschritt) {
    /* init() meldet Fortschritt wie das echte Modul 03 (emitProgress:
     * {status, file, progress 0-100}). Ohne diese Meldungen liesse sich der
     * Ladebalken des Studios nicht pruefen. */
    modul.init = async () => {
      for (const p of [25, 60, 90]) {
        window.dispatchEvent(new CustomEvent("sbkim:embedding-progress", {
          detail: { status: "progress", file: "model.onnx", progress: p },
        }));
        await new Promise((r) => setTimeout(r, 20));
      }
    };
  }
  window.SbkimEmbedding = modul;
}

/* Läuft in der Seite und gibt den engsten Abstand zweier Punktzahlen zurück.
 * Gefragt wird die ECHTE Funktion der Seite, nicht ein Nachbau. */
export function abstandInSeite() {
  const punkte = [];
  for (const x of (window.FP_LISTINGS || [])) {
    if (!x || !x.anchorId) continue;
    punkte.push({ l: x.label, s: window.__vecFor(String(x.text || x.label))[0] });
  }
  punkte.sort((p, q) => q.s - p.s);
  let min = Infinity, paar = "";
  for (let i = 1; i < punkte.length; i++) {
    const d = punkte[i - 1].s - punkte[i].s;
    if (d < min) { min = d; paar = `${punkte[i - 1].l} ⟷ ${punkte[i].l}`; }
  }
  return { min, paar, n: punkte.length };
}

/* 1/127 ist die Schrittweite von int8-sym. Der Faktor 2 ist der Abstand, den
 * ein Rang braucht, um das Runden sicher zu überleben — er ist eine WAHL,
 * keine Messung, und steht deshalb hier mit seiner Rechnung. */
export const ABSTAND_GRENZE = 2 / 127;

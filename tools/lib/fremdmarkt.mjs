/* Mess-Ziele aus einem FREMDEN Marktplatz — gefunden, nicht gepflegt.
 *
 * Der Befund, aus dem das entstanden ist (2026-09-21): PWA Toolpoint misst
 * nicht selbst, es HOLT die Zahlen aus `forschung/messreihe.json`. Steht ein
 * Eintrag dort nicht, bleibt sein Messblatt leer — und damit ist seine
 * Detailseite genau die dünne Seite, gegen die der ganze SEO-Plan gebaut ist.
 *
 * Nachgezählt an dem Tag: von 29 Einträgen bei PWA Toolpoint hatte **einer**
 * keine Messreihe (`eigen-kim-hub-company`). Die anderen 28 tragen dieselbe
 * Kennung wie ein Eintrag in family-projects Marktplatz oder in
 * `forschung/messziele.json` und werden dadurch längst gemessen.
 *
 * Das ist heute ein Einzelfall und morgen die Regel: JEDER fremde Eintrag, den
 * Klaus bei PWA Toolpoint freigibt, steht nur dort. Eine von Hand gepflegte
 * Liste macht dabei denselben Fehler wie ein vergessener Eintrag, nur dauerhaft
 * — dieselbe Lehre wie beim Kanon-Verteiler in Sage, wo genau das am
 * 2026-09-14 BookLedgerPro aus einem Rollout hat fallen lassen.
 *
 * ⚠ FAIL-SOFT, ausnahmslos. Diese Datei hängt im nächtlichen Lauf, und der ist
 * im September 2026 schon sechs Nächte hintereinander gestorben (`Cannot find
 * package 'playwright'`) — die Arbeit war jedes Mal getan und jedes Mal weg.
 * Kommt der fremde Markt nicht herein, wird das GESAGT und mit den eigenen
 * Zielen weitergemessen. Es wird nie geworfen und nie abgebrochen.
 *
 * ⚠ UND ES WIRD NICHTS ÜBERSTIMMT. Eine Kennung, die in `messziele.json` schon
 * steht, wird übersprungen — auch (und gerade) mit `aktiv: false`. Dort hängen
 * Entscheidungen mit Begründung dran („steht seit 2026-09-13 selbst im
 * Marktplatz und wird dort gemessen"). Ein gefundenes Ziel, das eine davon
 * still wieder anschaltet, wäre der stille Weg, eine Entscheidung
 * zurückzunehmen. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/* Die fremden Märkte, aus denen Ziele gefunden werden. Je Markt ein
 * Nachbar-Pfad (im Behälter einer Sitzung liegen die Klone nebeneinander) und
 * eine Netz-Adresse für den Fall, dass es keinen Nachbarn gibt — in einem
 * GitHub-Lauf ist das der Normalfall, nicht die Ausnahme.
 *
 * ⚠ DIE NETZ-ADRESSE IST DIE AUSGELIEFERTE SEITE, NICHT DAS DEPOT. Mein erster
 * Anlauf nahm `raw.githubusercontent.com/…/PWA-Toolpoint/main/…` — und bekam
 * **HTTP 404**, gemessen am 2026-09-21. Der Grund ist keine Tippfehler-Adresse:
 * das Depot steht auf **privat** (`"private": true` über die GitHub-API
 * nachgesehen), und `raw` gibt einem privaten Depot ohne Token genau diese 404.
 * Zum Vergleich in derselben Messung: family-projects eigene `messreihe.json`
 * über `raw` antwortet mit **200** — dieses Depot ist öffentlich.
 *
 * Die Seite wird trotzdem ausgeliefert (`has_pages: true`, und
 * `pwa-toolpoint.de` ist live) — dieselbe Lage, die in Kimhubs Verfassung unter
 * „PRIVAT STELLEN IST EIN HALBER SCHRITT" steht: eine einmal gebaute
 * Pages-Seite läuft weiter, auch wenn das Depot zugeht.
 *
 * Genommen wird deshalb die **öffentlich ausgelieferte** Datei. Das ist auch
 * inhaltlich die richtige: gefunden werden soll, was ein Besucher sieht, nicht
 * was in einem Depot liegt, an das der nächtliche Lauf gar nicht herankommt.
 *
 * ⚠ BENANNTE GRENZE: aus dem Behälter einer Sitzung ist `pwa-toolpoint.de`
 * **nicht** erreichbar — der Ausgangs-Proxy sperrt die Domain (gemessen:
 * HTTP 000). Der Netz-Weg ist deshalb hier nur an einem gestellten Server
 * gemessen, die echte Adresse nur daran, dass sie die ausgelieferte ist und
 * nicht die des Depots. Ob sie im GitHub-Lauf wirklich antwortet, sagt erst
 * der erste nächtliche Lauf — und wenn nicht, steht die Zeile „Liste nicht
 * erreichbar" im Protokoll, statt dass etwas still fehlt. */
export const FREMDMAERKTE = [
  {
    markt: "PWA Toolpoint",
    global: "PT_LISTINGS",
    /* RELATIV zur eigenen Wurzel, nicht absolut. Im Behälter einer Sitzung
     * ergibt das denselben Pfad (`/home/user/PWA-Toolpoint/…`) — aber nur so
     * lässt sich der Nachbar in einer Wegwerf-Kopie stellen, und nur so steht
     * kein `/home/user/…` in einem Werkzeug, das auch in einem GitHub-Lauf
     * läuft. */
    nachbarn: [path.join(WURZEL, "..", "PWA-Toolpoint", "assets", "config", "listings.js")],
    netz: "https://pwa-toolpoint.de/assets/config/listings.js"
  }
];

/* Die Quelle einer Marktplatz-Liste holen: erst der Nachbar-Klon, dann das
 * Netz. Der Nachbar zuerst, weil eine Sitzung dann das misst, was sie vor sich
 * hat — und weil es ohne Netz geht. */
async function quelleHolen(m, log) {
  for (const p of m.nachbarn) {
    try {
      if (fs.existsSync(p)) return { text: fs.readFileSync(p, "utf8"), woher: p };
    } catch { /* weiter zum nächsten Weg */ }
  }
  try {
    const a = await fetch(m.netz, { redirect: "follow" });
    if (!a.ok) throw new Error("HTTP " + a.status);
    return { text: await a.text(), woher: m.netz };
  } catch (e) {
    log(`  ! ${m.markt}: Liste nicht erreichbar (${e.message}) — es werden nur die eigenen Ziele gemessen.`);
    return null;
  }
}

/* Aus einem Eintrag wird ein Ziel. Gemessen wird dieselbe Adresse, die auch
 * family-projects eigener Marktplatz-Lauf messen würde: hat ein Eintrag ein
 * SCHAUFENSTER (`appUrl` weicht von `url` ab), zählt die APP — sonst stünde bei
 * einem Eintrag die Bewertung einer Landingpage neben der Bewertung der Apps
 * aller anderen (Klaus' Entscheidung 2026-08-02, siehe tools/messung.mjs).
 *
 * ⚠ BENANNTE GRENZE: eine ZWEITE Reihe fürs Schaufenster (`<id>--schaufenster`)
 * legt dieser Weg NICHT an. Der Marktplatz-Lauf tut das, weil seine Karte beide
 * Zahlen nebeneinanderstellt; ein gefundenes Ziel hat dort niemanden, der die
 * zweite Reihe anzeigt — sie kostete jede Nacht eine Messung und stünde in
 * keiner Auskunft. */
function zielAus(e, markt) {
  const id = String((e && e.anchorId) || "").trim();
  const roh = String((e && e.url) || "").trim();
  const app = String((e && e.appUrl) || "").trim();
  if (!id || !/^https:\/\//i.test(roh)) return null;
  const url = /^https:\/\//i.test(app) && app !== roh ? app : roh;
  return {
    id,
    name: String((e && e.label) || id),
    url,
    repo: "",
    aktiv: true,
    gefunden: markt
  };
}

/* Wer misst schon? Die Menge der Kennungen, die dieser Weg NICHT anfassen darf.
 *
 * Zwei Quellen, und beide sind nötig:
 *   · die eigenen Mess-Ziele — **auch die abgeschalteten**. Dort hängen
 *     Entscheidungen mit Begründung dran („steht seit 2026-09-13 selbst im
 *     Marktplatz und wird dort gemessen"). Ein gefundenes Ziel, das eine davon
 *     still wieder anschaltet, wäre der leiseste Weg, eine Entscheidung
 *     zurückzunehmen.
 *   · der eigene Marktplatz — den misst der nächtliche Lauf ohnehin über
 *     `messungLaufen`. Ohne diese Hälfte liefe dieselbe Adresse zweimal je
 *     Nacht durch die Messung, und die Reihe bekäme für denselben Tag zwei
 *     Punkte aus zwei Wegen.
 *
 * Bricht das Lesen des Marktplatzes, bleibt die Menge KLEINER statt dass etwas
 * abbricht — dann wird höchstens doppelt gemessen, und das fällt an zwei
 * Punkten für denselben Tag auf. Ein Abbruch wäre der teurere Ausgang. */
export function bekannteKennungen({ ziele = [], marktQuelle = "", global = "FP_LISTINGS", log = () => {} } = {}) {
  const raus = new Set();
  for (const z of ziele) if (z && z.id) raus.add(String(z.id));
  if (!marktQuelle) return raus;
  try {
    const sand = {};
    new Function("window", marktQuelle)(sand);
    const liste = sand[global];
    if (!Array.isArray(liste)) throw new Error(global + " ist keine Liste");
    for (const e of liste) if (e && e.anchorId) raus.add(String(e.anchorId));
  } catch (e) {
    log(`  ! eigener Marktplatz nicht lesbar (${e.message}) — es kann doppelt gemessen werden.`);
  }
  return raus;
}

/* Die gefundenen Ziele eines Marktes — ohne die, die schon jemand misst.
 *
 * `bekannt` ist eine Menge von Kennungen: die eigenen Mess-Ziele (auch die
 * abgeschalteten) UND die Einträge des eigenen Marktplatzes, die der nächtliche
 * Lauf ohnehin misst. Ohne diese zweite Hälfte liefe dieselbe Adresse zweimal
 * je Nacht durch die Messung, und die Reihe bekäme für denselben Tag zwei
 * Punkte aus zwei Wegen. */
export async function fremdeZiele({ bekannt = new Set(), log = () => {}, maerkte = FREMDMAERKTE } = {}) {
  const raus = [];
  for (const m of maerkte) {
    const q = await quelleHolen(m, log);
    if (!q) continue;
    let liste = null;
    try {
      const sand = {};
      new Function("window", q.text)(sand);
      liste = sand[m.global];
    } catch (e) {
      log(`  ! ${m.markt}: Liste nicht lesbar (${e.message}) — übersprungen.`);
      continue;
    }
    if (!Array.isArray(liste)) {
      log(`  ! ${m.markt}: ${m.global} ist keine Liste — übersprungen.`);
      continue;
    }
    let neu = 0, schon = 0, unbrauchbar = 0;
    for (const e of liste) {
      const z = zielAus(e, m.markt);
      if (!z) { unbrauchbar++; continue; }
      if (bekannt.has(z.id)) { schon++; continue; }
      if (raus.some((y) => y.id === z.id)) { schon++; continue; }
      raus.push(z);
      neu++;
    }
    log(`  · ${m.markt}: ${liste.length} Eintrag/Einträge gelesen (${q.woher})` +
      ` — ${neu} zusätzlich zu messen, ${schon} misst schon jemand` +
      (unbrauchbar ? `, ${unbrauchbar} ohne Kennung oder https-Adresse` : ""));
  }
  return raus;
}

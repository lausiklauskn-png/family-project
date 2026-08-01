/* Katalog-Spore Stufe 3 — der Wächter.
 *
 * Kein eigener Lauf und kein zweites Format: dieses Modul wird von
 * tools/vektoren-bauen.mjs aufgerufen und hängt seinen Befund als Feld
 * `wache` an denselben Bericht (assets/config/spore-stand.json), den die
 * nächtliche Aktion schon schreibt.
 *
 * WOZU. Klaus' Frage war: „Wenn jemand seinen Code ändert und Schlimmes
 * drauflegt oder auf einen Virus verlinkt — kannst du das täglich prüfen?"
 * Die ehrliche Antwort: vollständig ausschließen kann man es nicht. Was geht,
 * ist täglich nachsehen, abstufen und im Zweifel sperren.
 *
 *   grün  nichts auffällig                      Eintrag normal sichtbar
 *   gelb  Zielseite hat sich geändert, oder      Eintrag sichtbar mit Hinweis
 *         einmal nicht geantwortet
 *   rot   von Hand gesperrt, Safe Browsing       Eintrag auf Eis, Grund lesbar
 *         meldet die Adresse, oder zweimal
 *         hintereinander tot
 *
 * EIN EINTRAG VERSCHWINDET NIE STILLSCHWEIGEND. Rot heißt: er bleibt in der
 * Liste und im Bericht, aber mit sichtbarem Grund und ohne anklickbaren Link.
 * Wer gesperrt wird, muss es erfahren können — deshalb steht der Grund im
 * Bericht und nicht nur im Kopf dessen, der gesperrt hat.
 *
 * WARUM ZWEI FEHLSCHLÄGE FÜR ROT. Ein einzelner Netz-Aussetzer darf keine
 * fremde App aus dem Marktplatz werfen. Erst wenn eine Seite an zwei Läufen
 * hintereinander nicht antwortet, ist sie wirklich weg. Der Zähler steht im
 * Bericht (`fehlschlaege`) und wird bei der ersten erfolgreichen Antwort
 * wieder auf null gesetzt.
 *
 * WARUM `grundlage` UND `pruefsumme` GETRENNT SIND. Naheliegend wäre, die
 * Prüfsumme des Vortages mit der von heute zu vergleichen. Das hat ein Loch:
 * ändert eine Seite sich einmal und bleibt dann stehen, wäre sie am übernächsten
 * Tag wieder „unverändert" — das Gelb verschwände von allein, ohne dass jemand
 * hingesehen hat. Deshalb merkt sich der Bericht eine `grundlage`: die
 * Prüfsumme, die als in Ordnung gilt. Sie wandert NICHT mit. Gelb bleibt gelb,
 * bis Klaus die neue Fassung im Handschalter quittiert (`gesehen`).
 *
 * SAFE BROWSING IST EIN STECKPLATZ, HEUTE LEER (Klaus' Entscheidung
 * 2026-08-01). Ohne Schlüssel in der Umgebung (`SAFE_BROWSING_KEY`) wird nicht
 * gefragt, und der Bericht sagt ehrlich `nicht_geprueft` statt so zu tun, als
 * sei geprüft worden. Wird der Schlüssel später als GitHub-Secret hinterlegt,
 * fragt derselbe Lauf ohne einen weiteren Bau bei Google nach — dann sieht
 * Google allerdings die Liste der geprüften Adressen.
 *
 * SICHERHEIT. Die Zielseite ist `untrusted external data`: nur https, Größe
 * gedeckelt, Zeitlimit, und es wird ausschließlich GEHASHT — nie ausgeführt,
 * nie gerendert, nie in den Bericht kopiert. Was im Bericht landet, ist eine
 * Prüfsumme, ein Status und ein kurzer, selbst formulierter Grund.
 */
import fs from "node:fs";
import crypto from "node:crypto";

export const WACHE_FRIST = 15000;              // ms — eine tote Seite hält den Lauf nicht an
export const SEITE_MAX = 5 * 1024 * 1024;      // eine Startseite ist kleiner; alles darüber wird nicht gehasht
export const ROT_AB_FEHLSCHLAEGEN = 2;         // erst der zweite Fehlschlag in Folge sperrt
const SB_ENDPUNKT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";

/* ── Prüfsumme: kurz genug zum Lesen, lang genug gegen Zufall ─────────────── */
export const pruefsummeVon = (text) =>
  crypto.createHash("sha256").update(String(text), "utf8").digest("hex").slice(0, 16);

/* ── Zielseite holen: nur Status und Prüfsumme, sonst nichts ───────────────── */
export async function seiteHolen(url, opts) {
  const o = opts || {};
  const hole = o.fetchImpl || fetch;
  if (!/^https:\/\//i.test(String(url || ""))) {
    return { erreichbar: false, hinweis: "kein https-Link", hart: true };
  }
  let r;
  try {
    r = await hole(url, { redirect: "follow", signal: AbortSignal.timeout(o.frist || WACHE_FRIST) });
  } catch (e) {
    // Die Ursache mitnehmen — Nodes fetch meldet nach außen nur „fetch failed".
    const grund = [e && e.message, e && e.cause && e.cause.message].filter(Boolean).join(": ");
    return { erreichbar: false, hinweis: String(grund || e).slice(0, 160) };
  }
  if (!r.ok) return { erreichbar: false, status: r.status, hinweis: "HTTP " + r.status };
  const roh = await r.text();
  if (roh.length > SEITE_MAX) {
    return { erreichbar: true, status: r.status, hinweis: "Seite zu groß (" + roh.length + " Bytes), nicht geprüft" };
  }
  return { erreichbar: true, status: r.status, pruefsumme: pruefsummeVon(roh) };
}

/* ── Safe Browsing — der Steckplatz ────────────────────────────────────────
 * Gibt eine Map url -> true (gemeldet) / false (sauber) zurück, oder null,
 * wenn nicht gefragt wurde. null ist kein Fehler, sondern die ehrliche
 * Auskunft „nicht geprüft". Jeder Fehler beim Fragen führt ebenfalls zu null:
 * eine ausgefallene Google-Abfrage darf niemals einen Eintrag sperren. */
export async function safeBrowsingPruefen(urls, opts) {
  const o = opts || {};
  const key = o.key || process.env.SAFE_BROWSING_KEY || "";
  if (!key || !urls.length) return null;
  const hole = o.fetchImpl || fetch;
  const endpunkt = o.endpunkt || process.env.SAFE_BROWSING_URL || SB_ENDPUNKT;
  const koerper = {
    client: { clientId: "family-projekt-marktplatz", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: urls.map((u) => ({ url: u }))
    }
  };
  try {
    const r = await hole(endpunkt + "?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(koerper),
      signal: AbortSignal.timeout(o.frist || WACHE_FRIST)
    });
    if (!r.ok) return null;
    const a = await r.json();
    const map = new Map(urls.map((u) => [u, false]));
    for (const t of (a && a.matches) || []) {
      const u = t && t.threat && t.threat.url;
      if (u && map.has(u)) map.set(u, true);
    }
    return map;
  } catch (_e) {
    return null;
  }
}

/* ── Handschalter lesen ────────────────────────────────────────────────────
 * assets/config/wache-hand.json, Form:
 *   { "<anchorId>": { "ampel": "rot"|"gelb"|"gruen",
 *                     "grund": "…", "gesehen": "<pruefsumme>" } }
 * `ampel` gewinnt über die Automatik — das ist Klaus' Notbremse (`rot`) und
 * seine Entwarnung (`gruen`). Mit EINER Ausnahme: ein Safe-Browsing-Treffer
 * lässt sich nicht per Hand grün schalten (siehe ampelBilden). `gesehen` ist
 * die Quittung: die genannte Prüfsumme gilt ab dann als in Ordnung, ein Gelb
 * dafür ist erledigt. Ändert die Seite sich erneut, wird sie wieder gelb, weil
 * die Quittung dann nicht mehr passt. */
export function handLesen(pfad) {
  try {
    const o = JSON.parse(fs.readFileSync(pfad, "utf8"));
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  } catch (_e) {
    return {};
  }
}

const AMPELN = ["gruen", "gelb", "rot"];

/* ── Die Regel, an einer Stelle ────────────────────────────────────────────
 * Reihenfolge zählt: Hand vor Google vor Erreichbarkeit vor Prüfsumme. */
export function ampelBilden(a) {
  const vorher = a.vorher || {};
  const seite = a.seite || {};
  const hand = a.hand || {};
  const heute = a.heute;
  const w = { ampel: "gruen", grund: "unveraendert", fehlschlaege: 0 };

  const handAmpel = AMPELN.includes(hand.ampel) ? hand.ampel : null;
  w.safebrowsing = a.sb === true ? "gemeldet" : a.sb === false ? "sauber" : "nicht_geprueft";

  if (handAmpel === "rot") {
    w.ampel = "rot"; w.grund = "hand_gesperrt";
    w.fehlschlaege = Number(vorher.fehlschlaege) || 0;
  } else if (a.sb === true) {
    // Steht bewusst ÜBER der Hand-Freigabe: eine von Google als gefährlich
    // gemeldete Adresse soll sich nicht mit einem Eintrag in einer Datei
    // wieder freischalten lassen. Wer den Befund für falsch hält, nimmt den
    // Eintrag heraus oder schaltet Safe Browsing ab — beides sieht man.
    w.ampel = "rot"; w.grund = "safebrowsing";
    w.fehlschlaege = Number(vorher.fehlschlaege) || 0;
  } else if (handAmpel === "gruen") {
    // Klaus' Entwarnung gilt auch für eine Seite, die gerade nicht antwortet
    // („ich weiß, die zieht gerade um"). Die Grundlage wandert dabei NICHT
    // mit: nimmt er die Freigabe wieder heraus, steht der alte Befund wieder
    // da — eine Entwarnung blendet nicht dauerhaft aus.
    w.ampel = "gruen"; w.grund = "hand_freigegeben";
    w.fehlschlaege = seite.erreichbar ? 0 : (Number(vorher.fehlschlaege) || 0) + 1;
  } else if (handAmpel === "gelb") {
    w.ampel = "gelb"; w.grund = "hand_verdacht";
    w.fehlschlaege = Number(vorher.fehlschlaege) || 0;
  } else if (seite.hart) {
    // Kein https — das ist kein Aussetzer, das bleibt so, bis jemand den
    // Link ändert. Trotzdem gelb und nicht rot: der Eintrag ist nicht
    // gefährlich, nur unsauber verlinkt.
    w.ampel = "gelb"; w.grund = "kein_https";
  } else if (!seite.erreichbar) {
    w.fehlschlaege = (Number(vorher.fehlschlaege) || 0) + 1;
    if (w.fehlschlaege >= ROT_AB_FEHLSCHLAEGEN) { w.ampel = "rot"; w.grund = "nicht_erreichbar"; }
    else { w.ampel = "gelb"; w.grund = "antwortet_nicht"; }
  } else if (!seite.pruefsumme) {
    // Erreichbar, aber nicht hashbar (zu groß). Kein Urteil möglich.
    w.ampel = "gelb"; w.grund = "nicht_pruefbar";
  } else {
    let grundlage = vorher.grundlage || null;
    if (hand.gesehen && hand.gesehen === seite.pruefsumme) grundlage = seite.pruefsumme;
    if (!grundlage) { w.ampel = "gruen"; w.grund = "erste_pruefung"; grundlage = seite.pruefsumme; }
    else if (grundlage === seite.pruefsumme) { w.ampel = "gruen"; w.grund = "unveraendert"; }
    else { w.ampel = "gelb"; w.grund = "geaendert"; }
    w.grundlage = grundlage;
  }

  // Die Grundlage nie verlieren, auch wenn heute nichts zu holen war.
  if (!w.grundlage && vorher.grundlage) w.grundlage = vorher.grundlage;
  if (seite.pruefsumme) w.pruefsumme = seite.pruefsumme;
  if (typeof seite.status === "number") w.status = seite.status;
  if (seite.hinweis) w.hinweis = String(seite.hinweis).slice(0, 160);
  if (hand.grund) w.handgrund = String(hand.grund).slice(0, 200);

  // `seit` beantwortet „wie lange schon?" — es wandert nur, wenn die Ampel
  // wirklich umspringt.
  w.seit = vorher.ampel === w.ampel && vorher.seit ? vorher.seit : heute;
  return w;
}

/* ── Ein Durchgang über alle Einträge ──────────────────────────────────────
 * Rückgabe: { <anchorId>: wache }. Einträge ohne Adresse werden nicht
 * übergangen, sondern als gelb gemeldet — auch das ist ein Befund. */
export async function wacheLaufen(liste, opts) {
  const o = opts || {};
  const vorher = o.vorher || {};
  const hand = o.hand || {};
  const heute = o.heute || new Date().toISOString().slice(0, 10);
  const log = o.log || (() => {});

  const ziele = [];
  for (const x of liste) {
    if (!x || !x.anchorId) continue;
    ziele.push({ id: x.anchorId, url: String(x.url || "") });
  }

  const seiten = new Map();
  for (const z of ziele) {
    seiten.set(z.id, z.url
      ? await seiteHolen(z.url, o)
      : { erreichbar: false, hart: true, hinweis: "kein Link am Eintrag" });
  }

  // Google nur nach dem fragen, was auch eine https-Adresse hat.
  const httpsZiele = ziele.filter((z) => /^https:\/\//i.test(z.url));
  const sbMap = await safeBrowsingPruefen(httpsZiele.map((z) => z.url), o);
  if (sbMap === null && (o.key || process.env.SAFE_BROWSING_KEY)) {
    log("  ! Safe Browsing hat nicht geantwortet — es wird deshalb NICHTS gesperrt");
  }

  const raus = {};
  for (const z of ziele) {
    const seite = seiten.get(z.id);
    const sb = sbMap ? (sbMap.get(z.url) === true) : null;
    const w = ampelBilden({ vorher: vorher[z.id], seite, hand: hand[z.id], sb, heute });
    if (z.url) w.url = z.url;
    raus[z.id] = w;
    log(`  · ${z.id.padEnd(28)} ${w.ampel.padEnd(5)} ${w.grund}${w.hinweis ? " (" + w.hinweis + ")" : ""}`);
  }
  return raus;
}

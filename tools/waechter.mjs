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

/* ── Sicherheits-Fingerabdruck (Klaus 2026-08-09) ──────────────────────────
 *
 * WOZU. Die Prüfsumme oben deckt die ganze Seite ab und beantwortet damit die
 * Frage „hat sich irgendein Byte geändert?". Bei 14 eigenen Einträgen ist das
 * brauchbar. Bei tausend fremden ist es die FALSCHE Frage: dort ändert sich
 * ständig irgendein Byte, und wer jeden Tag hundert Meldungen quittieren muss,
 * klickt sie irgendwann durch, ohne hinzusehen. Dann steht in der Datei
 * „geprüft" und geprüft hat niemand — schlechter als kein Wächter, weil ein
 * ungedecktes Vertrauens-Signal entsteht.
 *
 * Klaus' Frage war „was, wenn das Tausende Apps wären?". Die Antwort ist nicht,
 * seltener zu prüfen, sondern eine bessere Frage zu stellen:
 *
 *     nicht  „hat sich etwas geändert?"
 *     sondern „hat sich etwas geändert, das gefährlich werden kann?"
 *
 * Ein umformulierter Absatz, ein neues Foto, eine korrigierte Öffnungszeit sind
 * gleichgültig. Gefährlich ist eine kurze, benennbare Liste — und genau die
 * steckt in diesem zweiten Abdruck.
 *
 * WAS HINEINGEHT
 *   · fremde Herkünfte, von denen die Seite etwas LÄDT oder wohin sie SCHICKT:
 *     script/iframe/object/embed/source/img/link sowie form action
 *   · Weiterleitungen per <meta http-equiv="refresh"> auf eine andere Herkunft
 *   · Kennzeichen für verschleierten Code in eingebettetem JS
 *     (eval, new Function, atob, document.write, javascript:-Adressen)
 *
 * WAS BEWUSST DRAUSSEN BLEIBT: alles Eigene. Eine Seite, die nur ihre eigenen
 * Dateien lädt, hat einen leeren Fremd-Teil — und der ändert sich nicht, wenn
 * sie umgebaut wird. Genau das ist der Zweck.
 *
 * SICHERHEIT. Die Seite bleibt `untrusted external data`: hier wird NUR gelesen
 * und mit regulären Ausdrücken herausgezogen, nie ausgeführt, nie gerendert,
 * nie ein HTML-Schnipsel übernommen.
 *
 * ⚠ BEWUSSTE ABWEICHUNG von „nichts aus der Seite in den Bericht" (Kopf oben):
 * die gefundenen Fremd-Herkünfte werden als NAMEN in den Bericht geschrieben.
 * Ohne sie sagt ein Alarm nur „irgendetwas Sicherheitsrelevantes hat sich
 * geändert" und der Blick dauert zehn Minuten statt zehn Sekunden. Der Preis
 * ist abgesichert: es wird ausschließlich ein Hostname übernommen, hart
 * gefiltert auf `[a-z0-9.-]`, auf 80 Zeichen und 12 Einträge gedeckelt. Damit
 * kann dort weder Markup noch Skript noch eine Anweisung landen. Die Namen
 * sind ein BEFUND für einen Menschen — nie eine automatische Entscheidung.
 */
const FREMD_ATTRIBUTE = /<(?:script|iframe|object|embed|source|img|link|form|video|audio)\b[^>]*?\b(?:src|href|data|action)\s*=\s*["']?(https?:\/\/[^"'\s>]+)/gi;
const META_WEITER = /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*url\s*=\s*(https?:\/\/[^"'\s>]+)/gi;
const VERSCHLEIERT = [
  ["eval", /\beval\s*\(/],
  ["new-function", /\bnew\s+Function\s*\(/],
  ["atob", /\batob\s*\(/],
  ["document-write", /\bdocument\s*\.\s*write\s*\(/],
  ["javascript-adresse", /(?:href|src)\s*=\s*["']?javascript:/i]
];

/* Hostname sauber herausziehen — was nicht durch den Filter passt, fällt weg. */
export function hostVon(url) {
  let h;
  try { h = new URL(String(url)).hostname.toLowerCase(); } catch (_e) { return null; }
  if (!/^[a-z0-9.-]{1,80}$/.test(h)) return null;
  return h;
}

/* Die fremden Herkünfte einer Seite, gegen die eigene Adresse gerechnet. */
export function fremdeHerkuenfte(html, eigeneUrl) {
  const eigen = hostVon(eigeneUrl);
  const raus = new Set();
  const text = String(html || "");
  for (const re of [FREMD_ATTRIBUTE, META_WEITER]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const h = hostVon(m[1]);
      if (h && h !== eigen) raus.add(h);
      if (raus.size > 400) break;          // Deckel gegen eine absichtlich aufgeblähte Seite
    }
  }
  return [...raus].sort().slice(0, 12);
}

/* Kennzeichen für verschleierten Code — nur Namen, nie der Fund selbst. */
export function kennzeichenVon(html) {
  const text = String(html || "");
  return VERSCHLEIERT.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/* Der Abdruck selbst: aus Herkünften + Kennzeichen, sortiert und stabil. */
export function fingerabdruckVon(html, eigeneUrl) {
  const teile = [
    "h:" + fremdeHerkuenfte(html, eigeneUrl).join(","),
    "k:" + kennzeichenVon(html).join(",")
  ].join("|");
  return pruefsummeVon(teile);
}

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
  return {
    erreichbar: true,
    status: r.status,
    pruefsumme: pruefsummeVon(roh),
    fingerabdruck: fingerabdruckVon(roh, url),
    fremde: fremdeHerkuenfte(roh, url),
    kennzeichen: kennzeichenVon(roh)
  };
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
    /* ── Zwei Maße statt einem (Klaus 2026-08-09) ───────────────────────────
     * `grundlage`  = Prüfsumme der GANZEN Seite, wie bisher.
     * `fgrundlage` = Sicherheits-Fingerabdruck, der als in Ordnung gilt.
     *
     * Gelb gibt es jetzt, wenn sich der FINGERABDRUCK ändert — also eine neue
     * fremde Herkunft, eine neue Weiterleitung oder verschleierter Code. Eine
     * Seite, die nur ihren Text, ihre Bilder oder ihr Aussehen ändert, ist
     * grün, und zwar ohne Rückfrage.
     *
     * DASS DAS EINE LOCKERUNG IST, wird hier ausdrücklich gesagt: vorher hätte
     * ein reiner Text-Umbau eine Meldung erzeugt, jetzt nicht mehr. Der Tausch
     * ist bewusst — er kauft dafür ein, dass die verbliebenen Meldungen wieder
     * gelesen werden statt abgestempelt. Die volle Prüfsumme geht NICHT
     * verloren, sie steht weiter im Bericht und wandert als Grundlage mit.
     */
    let grundlage = vorher.grundlage || null;
    let fgrundlage = vorher.fgrundlage || null;
    const fabdruck = seite.fingerabdruck || null;
    if (hand.gesehen && hand.gesehen === seite.pruefsumme) { grundlage = seite.pruefsumme; fgrundlage = fabdruck; }

    /* Spore-Kopplung (Klaus 2026-08-09) — NUR wo eine Spore vorhanden ist.
     * Wer keine will, wird allein am Fingerabdruck gemessen; das ist für ihn
     * die vollständige Prüfung, nicht die halbe.
     *
     * HEUTE NUR EIN VERMERK, KEIN ALARM — und das ist der wichtige Teil:
     * die Spore beschreibt die Domäne eines Knotens, nicht seine Version. Wer
     * seine Ladezeit verbessert, hebt sie nicht. Würde „Seite geändert, Spore
     * unverändert" jetzt gelb auslösen, stünde Klaus' halbes Netz sofort auf
     * gelb — genau der Fehlalarm, den dieser Umbau abstellen soll. Der Vermerk
     * wird trotzdem geschrieben, damit die Daten schon da sind, wenn die Spore
     * später einmal eine Fassung trägt und daraus eine Regel werden kann. */
    if (!a.sporeHash && !vorher.sporeHash) w.ankuendigung = "ohne_spore";
    else if (a.sporeHash && vorher.sporeHash && a.sporeHash !== vorher.sporeHash) w.ankuendigung = "spore_mitgehoben";
    else w.ankuendigung = "spore_unveraendert";
    if (a.sporeHash) w.sporeHash = String(a.sporeHash).slice(0, 64);

    if (!grundlage) {
      w.ampel = "gruen"; w.grund = "erste_pruefung";
      grundlage = seite.pruefsumme; fgrundlage = fabdruck;
    } else if (!fgrundlage) {
      /* ÜBERGANG: der Eintrag stammt aus der Zeit vor dem Fingerabdruck. Es
       * gibt also keinen Vergleichswert von VOR der Änderung — ihn jetzt still
       * auf grün zu setzen hieße, einen alten offenen Befund ohne jeden Beleg
       * für erledigt zu erklären. Also: ein bestehendes Gelb bleibt stehen,
       * bis ein Mensch es quittiert; der Abdruck wird dabei als neue Grundlage
       * festgehalten. Ab dem nächsten Lauf gilt die neue Regel. */
      fgrundlage = fabdruck;
      if (grundlage !== seite.pruefsumme) { w.ampel = "gelb"; w.grund = "geaendert"; }
      else { w.ampel = "gruen"; w.grund = "unveraendert"; }
    } else if (fabdruck && fgrundlage !== fabdruck) {
      w.ampel = "gelb"; w.grund = "fingerabdruck_geaendert";
    } else if (grundlage === seite.pruefsumme) {
      w.ampel = "gruen"; w.grund = "unveraendert";
    } else {
      /* Die Seite hat sich geändert, aber nichts Sicherheitsrelevantes. Die
       * Grundlage wandert hier mit — sonst bliebe der Eintrag ewig auf
       * „geändert" stehen, obwohl er grün ist. */
      w.ampel = "gruen"; w.grund = "nur_inhalt";
      grundlage = seite.pruefsumme;
    }
    w.grundlage = grundlage;
    if (fgrundlage) w.fgrundlage = fgrundlage;
    if (fabdruck) w.fingerabdruck = fabdruck;
    if (seite.fremde && seite.fremde.length) w.fremde = seite.fremde;
    if (seite.kennzeichen && seite.kennzeichen.length) w.kennzeichen = seite.kennzeichen;
  }

  // Die Grundlage nie verlieren, auch wenn heute nichts zu holen war.
  if (!w.grundlage && vorher.grundlage) w.grundlage = vorher.grundlage;
  if (!w.fgrundlage && vorher.fgrundlage) w.fgrundlage = vorher.fgrundlage;
  if (!w.sporeHash && vorher.sporeHash) w.sporeHash = vorher.sporeHash;
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
    // Spore-Kopplung: der Sporen-Teil des Laufs ist zu diesem Zeitpunkt schon
    // durch und hat je Eintrag einen `sporeHash` gerechnet. Wer keine Spore
    // hat, kommt hier mit `null` an — das ist kein Mangel, sondern ein
    // gleichwertiger Fall (siehe ampelBilden).
    ziele.push({ id: x.anchorId, url: String(x.url || ""), sporeHash: (o.sporeHashes || {})[x.anchorId] || null });
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
    const w = ampelBilden({ vorher: vorher[z.id], seite, hand: hand[z.id], sb, heute, sporeHash: z.sporeHash });
    if (z.url) w.url = z.url;
    raus[z.id] = w;
    log(`  · ${z.id.padEnd(28)} ${w.ampel.padEnd(5)} ${w.grund}${w.hinweis ? " (" + w.hinweis + ")" : ""}`);
  }
  return raus;
}

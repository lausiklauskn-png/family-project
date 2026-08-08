/* Katalog-Spore Stufe 5 — die Messung (Lighthouse, Weg A oder Weg B).
 *
 * Kein eigener Lauf und kein zweites Format: dieses Modul wird von
 * tools/vektoren-bauen.mjs aufgerufen und hängt seinen Befund als Feld
 * `messung` an denselben Bericht (assets/config/spore-stand.json), den die
 * nächtliche Aktion schon schreibt — neben `wache`. Genau die Form, die der
 * Wächter vorgegeben hat.
 *
 * WEG A (Klaus' Entscheidung 2026-08-01) — Lighthouse läuft in der EIGENEN
 * Aktion auf GitHubs Rechnern. Das kostet Laufzeit (grob eine halbe bis eine
 * Minute je Eintrag) und spart dafür zweierlei: es braucht keinen Schlüssel,
 * und die Liste der geprüften Adressen geht nicht an Google.
 *
 * WEG B (Klaus' Entscheidung 2026-08-04) — Googles PageSpeed Insights liefert
 * die Zahl, damit sie mit dem verlinkten Bericht übereinstimmt. Greift, sobald
 * PSI_API_KEY gesetzt ist; ohne Schlüssel bleibt Weg A. Begründung und
 * Abwägung stehen bei `psiMessen`.
 *
 * WELCHER WEG ES WAR, steht in jedem Befund unter `quelle` (`google`/`eigen`)
 * und wird auf der Karte gezeigt. Eine Zahl ohne ihre Quelle war genau das
 * Problem, das Klaus am 2026-08-04 gefunden hat.
 *
 * VIER ZAHLEN, KEINE FÜNFTE. Gemessen werden die vier Lighthouse-Kategorien:
 * Leistung, Bedienbarkeit, gute Praxis, Auffindbarkeit. Es wird KEINE
 * Gesamtnote daraus gerechnet. Eine gemittelte Zahl verdeckt genau das, was
 * man wissen will — eine Seite mit 100/100/100/20 ist nicht „80 gut".
 *
 * UND SIE BLEIBEN GETRENNT VON MENSCHENMEINUNG (Klaus' ausdrückliche Vorgabe,
 * nicht verhandelbar). Ja/Nein-Stimmen kommen später DANEBEN, nie hinein: ein
 * Mittelwert aus Messwert und Meinung bedeutet nichts mehr. Dieses Modul
 * rechnet deshalb nichts zusammen und stellt keine Fläche bereit, an der man
 * es versehentlich täte.
 *
 * EIN STECKPLATZ, DER EHRLICH SCHWEIGT. Ist Lighthouse nicht da (lokal, im
 * Test, oder wenn die Installation in der Aktion scheitert), wird nicht
 * gemessen und der Bericht sagt `nicht_gemessen` statt so zu tun, als sei
 * gemessen worden — dieselbe Haltung wie `nicht_geprueft` bei Safe Browsing.
 * Eine fehlende Messung darf nie wie eine schlechte aussehen.
 *
 * WARUM DER ALTE WERT MIT DATUM STEHEN BLEIBT. Schlägt eine Messung fehl, wird
 * der letzte bekannte Befund NICHT gelöscht, sondern als `veraltet` mit seinem
 * eigenen Datum weitergereicht. Löschen wäre die schlechtere Lüge: die Seite
 * sähe aus, als sei sie nie gemessen worden. Das Datum steht überall dabei, wo
 * die Zahl steht — eine Zahl ohne Datum ist bei einer Messung wertlos.
 *
 * WARUM EIN DECKEL JE LAUF. Eine Messung dauert; bei wachsendem Marktplatz
 * liefe die Aktion sonst in ihre Zeitgrenze und bräche mittendrin ab. Deshalb
 * kommen je Lauf höchstens MESSUNG_MAX_PRO_LAUF Einträge dran, und zwar die
 * mit dem ÄLTESTEN Messdatum zuerst (nie gemessene ganz vorn). Wer nicht dran
 * war, behält seinen Befund samt Datum. Der Deckel wird protokolliert, nie
 * still angewandt — eine unsichtbare Kürzung liest sich wie Vollständigkeit.
 *
 * WAS AUS DEM BERICHT KOMMT. Vier Zahlen — und die TITEL der durchgefallenen
 * Prüfungen als „empfohlene Nachbesserungen". Die Zahl allein kann ein Anbieter
 * nicht verbessern, einen benannten Mangel schon; und wer sehen kann, WORAN es
 * liegt, kann die Bewertung nachvollziehen statt sie glauben zu müssen.
 *
 * WENN EIN SCHAUFENSTER DAVORSTEHT. Zwei von vierzehn Einträgen (Rezeptbuch,
 * Mixarium) verlinken keine App, sondern eine vorgeschaltete Landingpage. Bis
 * 2026-08-02 wurde deshalb bei ihnen das Schaufenster gemessen und bei den
 * anderen zwölf die App — dieselbe Zahlenreihe, zwei verschiedene Dinge, und
 * für einen Besucher nicht zu unterscheiden. Klaus' Entscheidung: der Eintrag
 * bekommt ein Feld `appUrl`; gemessen und auf der Karte gezeigt wird dann die
 * APP (damit alle vierzehn vergleichbar sind), das Schaufenster wird ZUSÄTZLICH
 * gemessen und landet unter `messung[id].schaufenster` — mit eigener Adresse,
 * eigenem Datum und eigenem Stand. Im Bewertungs-Fenster stehen beide
 * beschriftet untereinander. Ohne `appUrl` ändert sich nichts.
 *
 * SICHERHEIT. Die Zielseite ist `untrusted external data`. Lighthouse lädt sie
 * zwar in einem echten Browser (anders geht eine Messung nicht), aber in einem
 * Wegwerf-Prozess mit eigenem Profil. Aus dem Ergebnis werden ausschließlich die
 * vier Zahlen und die gekappten Prüfungs-Titel entnommen — NICHT der volle
 * Prüfbericht, der Adressen, Zeilennummern und Auszüge aus fremdem Quelltext
 * enthält. Kein Bildschirmfoto, keine URL-Liste. Nur https, Zeitlimit,
 * Bericht-Datei gedeckelt.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";

export const MESSUNG_FRIST = 180000;        // ms je Seite — Lighthouse braucht länger als ein fetch
export const MESSUNG_MAX_PRO_LAUF = 10;     // Deckel, damit die Aktion nicht in ihre Zeitgrenze läuft
export const BERICHT_MAX = 40 * 1024 * 1024; // ein Lighthouse-Bericht ist ~1 MB; alles darüber wird nicht gelesen
export const MESSUNG_SPRACHE = "de";        // Sprache der Prüfungs-Titel (siehe lighthouseBefehl)

/* WELCHE GERÄTE gemessen werden — an EINER Stelle, weil beide Messwege das
 * sonst unabhängig voneinander festlegen:
 *   Weg B (PageSpeed): `strategy` in `psiAdresse`.
 *   Weg A (Lighthouse selbst): `--preset=desktop` in `lighthouseBefehl`;
 *   ohne diesen Schalter ist Lighthouses Voreinstellung das Handy.
 *
 * Bis zum 2026-08-07 wurde NUR das Handy gemessen, und in der Messreihe war
 * den Zahlen nicht anzusehen, welches Gerät sie meinen. Am 2026-08-08 hat
 * Klaus die Umstellung auf beide entschieden — die Zahlen des Tages zeigen,
 * warum: Sage-Protokol stand am Handy bei 83, am Computer bei **99**; Muttis
 * Rezeptbuch bei 61 gegen **95**. Wer nur die Handy-Zahl kennt, hält zwei
 * Seiten für Sanierungsfälle, die am Computer längst gut sind.
 *
 * Reihenfolge ist Absicht: das Handy zuerst. Es ist die strengere Messung und
 * Googles eigene Voreinstellung — wer den Lauf abbricht, hat den wichtigeren
 * Wert schon. */
export const MESSUNG_GERAETE = ["handy", "computer"];

/* Der Wert, der gilt, wenn keiner genannt ist: die Marktplatz-Zahlen aus dem
 * Tagesbericht sind Handy-Werte, und die nachbeschrifteten Altpunkte auch. */
export const MESSUNG_GERAET = MESSUNG_GERAETE[0];

/* Die vier Kategorien an EINER Stelle. Der Schlüssel links ist unser Name im
 * Bericht (deutsch, weil er in der Anzeige auftaucht), rechts steht der Name,
 * unter dem Lighthouse ihn führt. Wer eine fünfte hinzufügen will, ändert nur
 * diese Liste — und muss dann auch die Erklärtexte in markt.html ergänzen. */
export const KATEGORIEN = [
  { schluessel: "leistung", lh: "performance" },
  { schluessel: "bedienbarkeit", lh: "accessibility" },
  { schluessel: "gute_praxis", lh: "best-practices" },
  { schluessel: "auffindbarkeit", lh: "seo" }
];

const SCHLUESSEL = KATEGORIEN.map((k) => k.schluessel);

/* Wie oft ein schlechterer Wert HINTEREINANDER gemessen werden muss, bevor er
 * die Karte ändert. Klaus 2026-08-06: „nach drei Messungen ist OK." Ein
 * besserer Wert gilt sofort — begründet bei `messungBilden`. */
export const SCHLECHTER_NOETIG = 3;

/* ── Empfohlene Nachbesserungen ────────────────────────────────────────────
 * Lighthouse sagt nicht nur, WIE gut eine Seite ist, sondern auch WAS ihr
 * fehlt. Diese Liste ist der eigentliche Nutzen für einen Anbieter: eine Zahl
 * allein kann er nicht verbessern, einen benannten Mangel schon.
 *
 * Aufgenommen wird nur, was durchgefallen ist — und nur der Titel, nie der
 * ganze Prüfbericht (der enthält Adressen, Zeilennummern und Auszüge aus
 * fremdem Quelltext; das gehört nicht in unseren Bericht). Gedeckelt je
 * Kategorie, damit eine schlecht gebaute Seite den Bericht nicht sprengt. */
export const HINWEISE_JE_KATEGORIE = 3;
export const HINWEIS_TITEL_MAX = 120;

// Lighthouse führt manche Prüfungen nur zur Information oder als Handarbeit —
// die sind keine Mängel und dürfen nicht als solche gelesen werden.
const WERTENDE_ARTEN = { numeric: 1, binary: 1, metricSavings: 1 };

export function hinweiseAusBericht(lhr) {
  var raus = [];
  var kat = lhr && lhr.categories;
  var audits = lhr && lhr.audits;
  if (!kat || !audits) return raus;
  for (const k of KATEGORIEN) {
    const c = kat[k.lh];
    if (!c || !Array.isArray(c.auditRefs)) continue;
    const treffer = [];
    for (const ref of c.auditRefs) {
      const a = ref && audits[ref.id];
      if (!a || typeof a.score !== "number" || a.score >= 1) continue;
      if (a.scoreDisplayMode && !WERTENDE_ARTEN[a.scoreDisplayMode]) continue;
      const titel = typeof a.title === "string"
        ? a.title.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, HINWEIS_TITEL_MAX)
        : "";
      if (!titel) continue;
      const ms = a.details && typeof a.details.overallSavingsMs === "number"
        ? Math.round(a.details.overallSavingsMs) : null;
      treffer.push({ k: k.schluessel, t: titel, s: a.score, ms: ms });
    }
    // Das Lohnendste zuerst: was am meisten Zeit spart, sonst was am
    // schlechtesten abschnitt. Sonst stünde oben, was zufällig zuerst kam.
    treffer.sort((x, y) => (y.ms || 0) - (x.ms || 0) || x.s - y.s);
    for (const t of treffer.slice(0, HINWEISE_JE_KATEGORIE)) {
      const e = { k: t.k, t: t.t };
      if (t.ms) e.ms = t.ms;
      raus.push(e);
    }
  }
  return raus;
}

/* ── Hat ein Befund überhaupt Zahlen? ─────────────────────────────────────── */
export function hatZahlen(m) {
  if (!m || typeof m !== "object") return false;
  return SCHLUESSEL.every((k) => typeof m[k] === "number");
}

/* ── Aus dem Lighthouse-Bericht genau vier Zahlen ziehen ───────────────────
 * Alle vier oder keine. Ein halber Bericht ist keine Messung: fehlt eine
 * Kategorie, sähe die Karte aus, als sei dort einfach nichts zu sagen — dabei
 * ist die Messung schiefgegangen. Lieber ehrlich gar nichts. */
export function zahlenAusBericht(lhr) {
  const kat = lhr && lhr.categories;
  if (!kat || typeof kat !== "object") return null;
  const raus = {};
  for (const k of KATEGORIEN) {
    const s = kat[k.lh] && kat[k.lh].score;
    if (typeof s !== "number" || !isFinite(s) || s < 0 || s > 1) return null;
    raus[k.schluessel] = Math.round(s * 100);
  }
  return raus;
}

/* ── Der Aufruf von Lighthouse ─────────────────────────────────────────────
 * Über die Kommandozeile und eine Datei, nicht über stdout: Lighthouse schreibt
 * neben dem Ergebnis auch Meldungen, und ein Bericht, den man aus einem
 * Meldungsstrom herausschneiden muss, zerbricht am ersten unerwarteten Wort.
 *
 * LIGHTHOUSE_CMD ist der ehrliche Schalter dahinter: ist er gesetzt, wird genau
 * dieses Programm aufgerufen (etwa ein global installiertes `lighthouse`);
 * sonst `npx --no-install lighthouse`. Der Test setzt ihn ebenfalls — dadurch
 * läuft im Test derselbe Spawn- und Datei-Pfad wie in der Aktion, und nicht
 * eine nachgebaute Abkürzung daneben. */
export function lighthouseBefehl(url, berichtDatei, opts) {
  const o = opts || {};
  const eigen = o.cmd || process.env.LIGHTHOUSE_CMD || "";
  const args = [
    url,
    "--output=json",
    "--output-path=" + berichtDatei,
    "--quiet",
    "--no-enable-error-reporting",
    "--only-categories=" + KATEGORIEN.map((k) => k.lh).join(","),
    // Befund aus dem ersten echten Lauf (2026-08-02): ohne diese Zeile kommen
    // die Titel der Prüfungen auf Englisch zurück („Minify JavaScript",
    // „Background and foreground colors do not have a sufficient contrast
    // ratio"). Sie landen wörtlich im Bewertungs-Fenster einer deutschen
    // Seite. Lighthouse bringt die Übersetzungen mit; man muss sie nur
    // verlangen.
    //
    // EHRLICHE GRENZE: der Bericht wird EINMAL geschrieben und kann deshalb
    // nur EINE Sprache tragen. Auch wer den Marktplatz auf Englisch stellt,
    // liest die Nachbesserungen künftig auf Deutsch. Zweimal messen — einmal
    // je Sprache — würde die Laufzeit verdoppeln, damit ein Zweitnutzen
    // entsteht, den heute niemand hat. Deutsch, weil die Seite deutsch ist.
    "--locale=" + MESSUNG_SPRACHE,
    "--max-wait-for-load=45000",
    /* Ohne diesen Schalter misst Lighthouse das Handy — das ist seine
     * Voreinstellung. `--preset=desktop` schaltet Fenster (1350 statt 412 px),
     * Drosselung und Kennzeichner gemeinsam um; einzeln gesetzte Werte
     * ergäben eine Mischung, die es bei PageSpeed nicht gibt und mit der die
     * Zahlen nicht mehr vergleichbar wären. */
    ...(o.geraet === "computer" ? ["--preset=desktop"] : []),
    "--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage"
  ];
  return eigen
    ? { cmd: eigen, args }
    : { cmd: "npx", args: ["--no-install", "lighthouse"].concat(args) };
}

/* ── Ist das Werkzeug überhaupt da? EINMAL fragen, nicht je Eintrag ────────
 * Ohne diese Frage würde bei fehlendem Lighthouse für JEDEN Eintrag ein
 * `npx`-Prozess gestartet, der einzeln scheitert — vierzehnmal warten für
 * vierzehnmal dieselbe Auskunft. Gemessen beim Bau: das reicht, um einen Test
 * in seine Zeitgrenze laufen zu lassen.
 *
 * Geprüft wird das, was `npx --no-install lighthouse` tatsächlich voraussetzt:
 * dass das Paket auflösbar daliegt. Das ist ein Blick auf die Platte, kein
 * Prozessstart. Ist LIGHTHOUSE_CMD gesetzt, wurde ein Programm ausdrücklich
 * genannt — dann wird es aufgerufen und nicht besser gewusst. */
export function werkzeugDa(opts) {
  const o = opts || {};
  if (o.cmd || process.env.LIGHTHOUSE_CMD) return true;
  try { createRequire(import.meta.url).resolve("lighthouse/package.json"); return true; }
  catch (_e) { return false; }
}

/* ── Eine Seite messen ─────────────────────────────────────────────────────
 * Rückgabe immer ein Objekt, nie ein Wurf: eine Seite, die sich nicht messen
 * lässt, darf den nächtlichen Lauf nicht anhalten. */
/* ── Weg B: Googles PageSpeed Insights fragen ──────────────────────────────
 * Klaus' Vorgabe 2026-08-04: „Die Werte müssen mit den Messwerten auf der
 * verlinkten Seite übereinstimmen."
 *
 * Der Grund dafür ist echt. Am 2026-08-04 zeigte die Karte für Mein-Mixarium
 * eine 37, Googles Bericht für dieselbe Adresse am selben Tag eine 76. Wer auf
 * „Vollständigen Bericht bei Google öffnen" tippt, sah das Doppelte und musste
 * uns für schlampig halten. Zwei Quellen für dieselbe Zahl gehen nicht.
 *
 * Es ist NICHT die Maschine — das Schaufenster derselben App traf mit 63 gegen
 * 65. Es ist die Einzelmessung einer schweren Seite: zwei Läufe hintereinander
 * ergaben 33 und 51. Solche Seiten kann man nur dann vergleichbar messen, wenn
 * ALLE dieselbe Quelle benutzen. Also fragen wir die, auf die wir verlinken.
 *
 * WAS DAS KOSTET, ehrlich benannt: die geprüften Adressen gehen an Google.
 * Das war 2026-08-01 der Grund für Weg A. Es ist heute weniger schwer, weil
 * derselbe Knopf im Bewertungs-Fenster diese Adresse ohnehin an Google gibt,
 * sobald jemand nachsehen will, und weil es öffentliche Marktplatz-Einträge
 * sind. Klaus hat es abgewogen und so entschieden.
 *
 * OHNE SCHLÜSSEL GEHT ES NICHT VERLÄSSLICH. Ohne Schlüssel teilt man sich ein
 * Kontingent mit aller Welt; ein Versuch von der Bau-Maschine kam sofort mit
 * HTTP 429 („zu viele Anfragen") zurück. Auf GitHubs Rechnern, deren Adressen
 * noch stärker geteilt sind, wäre es schlimmer.
 *
 * IST KEIN SCHLÜSSEL DA, wird weiter selbst gemessen (Weg A) — die Seite bliebe
 * sonst ganz ohne Zahlen, und das wäre schlechter. Aber NICHT stillschweigend:
 * jeder Befund trägt jetzt ein Feld `quelle` (`google` oder `eigen`), und die
 * Karte schreibt es hin. Der Unterschied, über den Klaus gestolpert ist, war
 * nicht die Abweichung selbst — es war, dass man ihr nicht ansehen konnte,
 * woher sie kam.
 *
 * Das Antwortformat passt: unter `lighthouseResult` steckt derselbe Bericht,
 * den auch das Programm schreibt. `zahlenAusBericht` und `hinweiseAusBericht`
 * lesen ihn unverändert. */
export const PSI_ENDPUNKT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export function psiAdresse(url, schluessel, geraet) {
  const p = new URLSearchParams();
  p.set("url", url);
  /* Ohne Angabe bleibt es beim Handy — dieselbe Ansicht wie im verlinkten
   * Bericht und Googles Voreinstellung. Die erlaubten Namen stehen bei
   * MESSUNG_GERAETE, damit sie nicht an zwei Stellen unabhängig voneinander
   * festgelegt werden. */
  p.set("strategy", geraet === "computer" ? "desktop" : "mobile");
  p.set("locale", MESSUNG_SPRACHE);
  for (const k of KATEGORIEN) p.append("category", k.lh);
  if (schluessel) p.set("key", schluessel);
  return PSI_ENDPUNKT + "?" + p.toString();
}

export async function psiMessen(url, opts) {
  const o = opts || {};
  const schluessel = o.psiSchluessel || process.env.PSI_API_KEY || "";
  if (!schluessel) {
    return { ok: false, hinweis: "PSI_API_KEY fehlt — ohne Schlüssel greift Googles Kontingent (HTTP 429)" };
  }
  const holen = o.holen || ((adr, frist) => {
    const ab = new AbortController();
    const t = setTimeout(() => ab.abort(), frist);
    return fetch(adr, { signal: ab.signal }).finally(() => clearTimeout(t));
  });
  let antwort;
  try {
    antwort = await holen(psiAdresse(url, schluessel, o.geraet), o.frist || MESSUNG_FRIST);
  } catch (e) {
    return { ok: false, hinweis: ("PageSpeed nicht erreichbar: " + String((e && e.message) || e)).slice(0, 160) };
  }
  if (!antwort || !antwort.ok) {
    const code = (antwort && antwort.status) || "?";
    return { ok: false, hinweis: ("PageSpeed antwortete HTTP " + code).slice(0, 160) };
  }
  let daten;
  try { daten = await antwort.json(); }
  catch (_e) { return { ok: false, hinweis: "PageSpeed-Antwort ist kein gültiges JSON" }; }
  const lhr = daten && daten.lighthouseResult;
  if (!lhr) return { ok: false, hinweis: "PageSpeed-Antwort ohne lighthouseResult" };
  const zahlen = zahlenAusBericht(lhr);
  if (!zahlen) return { ok: false, hinweis: "PageSpeed-Bericht ohne vollständige Bewertung" };
  return {
    ok: true, zahlen, quelle: "google",
    werkzeug: typeof lhr.lighthouseVersion === "string" ? lhr.lighthouseVersion : "",
    hinweise: hinweiseAusBericht(lhr)
  };
}

export async function seiteMessen(url, opts) {
  const o = opts || {};
  if (!/^https:\/\//i.test(String(url || ""))) {
    return { ok: false, hinweis: "kein https-Link" };
  }
  /* Weg B, sobald ein Schlüssel da ist — dann stammt die Zahl aus derselben
   * Quelle wie der verlinkte Bericht. Ohne Schlüssel bleibt Weg A, damit die
   * Seite nicht ganz ohne Zahlen dasteht; welcher Weg es war, steht danach im
   * Feld `quelle`. `psiAus` schaltet Weg B für Tests ab, die den Programm-Pfad
   * prüfen. */
  const schluessel = o.psiSchluessel || process.env.PSI_API_KEY || "";
  if (schluessel && !o.psiAus) return psiMessen(url, o);
  const lauf = o.lauf || standardLauf;
  const dir = fs.mkdtempSync(path.join(o.tmp || os.tmpdir(), "fp-mess-"));
  const datei = path.join(dir, "bericht.json");
  try {
    const b = lighthouseBefehl(url, datei, o);
    const e = await lauf(b.cmd, b.args, { frist: o.frist || MESSUNG_FRIST });
    if (!fs.existsSync(datei)) {
      // Kein Bericht: entweder gibt es das Werkzeug nicht, oder es ist an der
      // Seite gescheitert. Beides ist „nicht gemessen", aber der Grund gehört
      // in den Bericht — sonst sucht die nächste Sitzung im Dunkeln.
      const grund = (e && e.fehler) || "Lighthouse hat keinen Bericht geschrieben";
      return { ok: false, hinweis: String(grund).slice(0, 160) };
    }
    const gr = fs.statSync(datei).size;
    if (gr > BERICHT_MAX) return { ok: false, hinweis: "Bericht zu groß (" + gr + " Bytes)" };
    let lhr;
    try { lhr = JSON.parse(fs.readFileSync(datei, "utf8")); }
    catch (_e) { return { ok: false, hinweis: "Bericht ist kein gültiges JSON" }; }
    const zahlen = zahlenAusBericht(lhr);
    if (!zahlen) return { ok: false, hinweis: "Bericht ohne vollständige Bewertung" };
    const werkzeug = typeof lhr.lighthouseVersion === "string" ? lhr.lighthouseVersion : "";
    return { ok: true, zahlen, quelle: "eigen", werkzeug, hinweise: hinweiseAusBericht(lhr) };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_e) {}
  }
}

/* Der Standard-Lauf. Ein Fehlschlag ist hier NORMAL (Werkzeug fehlt, Seite tot)
 * und wird deshalb als Rückgabewert gemeldet, nicht geworfen. */
function standardLauf(cmd, args, opts) {
  return new Promise((fertig) => {
    execFile(cmd, args, { timeout: (opts && opts.frist) || MESSUNG_FRIST, maxBuffer: 8 * 1024 * 1024 },
      (err) => fertig(err ? { fehler: String((err && err.message) || err).slice(0, 160) } : {}));
  });
}

/* ── Der Befund je Eintrag ─────────────────────────────────────────────────
 * Reihenfolge zählt: gemessen vor übersprungen vor fehlgeschlagen.
 *
 *   gemessen        heute frisch gemessen, die Zahlen stimmen zum Datum
 *   veraltet        die Messung schlug fehl, der letzte Befund steht mit
 *                   seinem eigenen Datum weiter da
 *   nicht_gemessen  es gibt keine Zahl, und das wird auch so gesagt
 */
export function messungBilden(a) {
  const vorher = a.vorher || {};
  const roh = a.roh || {};
  const heute = a.heute;
  const m = {};

  if (roh.ok && roh.zahlen) {
    const frisch = {};
    for (const k of SCHLUESSEL) frisch[k] = roh.zahlen[k];
    frisch.gemessen = heute;
    /* Woher die Zahl stammt, gehört neben die Zahl. Sonst kann niemand
     * einordnen, warum eine eigene Nachmessung abweicht — und genau daran
     * hat sich Klaus am 2026-08-04 gestoßen. */
    if (roh.quelle) frisch.quelle = String(roh.quelle).slice(0, 16);
    if (roh.werkzeug) frisch.werkzeug = String(roh.werkzeug).slice(0, 40);
    if (Array.isArray(roh.hinweise) && roh.hinweise.length) frisch.hinweise = roh.hinweise;

    const uebernehmen = () => {
      Object.assign(m, frisch);
      m.stand = "gemessen";
      /* Der frische Wert IST jetzt der gelistete — kein Doppel, keine
       * Haltenotiz. Sonst stünde beides da und niemand wüsste, was gilt. */
      return m;
    };

    if (!hatZahlen(vorher)) return uebernehmen();       // erste Messung: nichts zu halten

    /* ── Haltefrist für schlechtere Werte (Klaus 2026-08-06) ────────────────
     * „Keiner soll schlechter abschneiden, als wenn er selber nachmisst."
     *
     * Der Grund ist gemessen, nicht gefühlt: Jasons-Tresor lieferte an drei
     * Nächten 83 · 64 · 97, ohne dass seit dem 2026-08-03 jemand eine Zeile
     * angefasst hatte. Wer an dem einen schlechten Abend auf die Karte sieht,
     * liest eine 64 — und bei genügend Pech fällt ein Eintrag unter die
     * Ausschluss-Grenze und verschwindet aus dem Marktplatz, wegen eines
     * Würfelwurfs. Ein einzelner schlechter Wert ist kein wahreres Urteil als
     * ein einzelner guter.
     *
     * Also: ein BESSERER Wert gilt sofort. Ein SCHLECHTERER muss DREIMAL
     * hintereinander gemessen werden, bevor er die Karte ändert.
     *
     * WO DIE EHRLICHKEIT SITZT — das ist keine Rosinenpickerei, solange drei
     * Dinge gelten, und alle drei gelten hier:
     *   1. Der gezeigte Wert wurde WIRKLICH SO GEMESSEN. Es wird nichts
     *      gemittelt, geschönt oder aus Teilen zusammengesetzt.
     *   2. Sein MESSDATUM steht dabei und wandert NICHT mit. Die Karte sagt
     *      „gemessen am 4.", nicht „gemessen heute".
     *   3. Der frische Wert wird NICHT weggeworfen: er steht als `frisch` im
     *      selben Bericht, die Messreihe schreibt ihn ungekürzt fort, und
     *      `zurueckgehalten` sagt offen, dass ein schlechterer vorliegt.
     * Fiele eines davon weg, wäre es Schönfärberei. Gegenprobe:
     * tests/gegenprobe_messung_haltefrist.sh
     *
     * ENTSCHIEDEN WIRD AN DER LEISTUNG. Sie ist die Zahl, die schwankt (die
     * anderen drei standen in denselben drei Nächten still: 92 · 100 · 100),
     * und sie ist die, an der die Ausschluss-Grenze hängt. Bei Gleichstand
     * wird übernommen — es gäbe nichts zu schützen.
     *
     * UND ES BLEIBT EIN SATZ ZAHLEN AUS EINER MESSUNG. Niemals die gute
     * Leistung von gestern mit der guten Bedienbarkeit von heute mischen:
     * die vier Zahlen müssen zu dem Bericht passen, auf den die Karte
     * verlinkt (Klaus 2026-08-04). Gehalten wird der ganze Satz oder keiner. */
    if (frisch.leistung >= vorher.leistung) return uebernehmen();

    const bisher = (vorher.zurueckgehalten && vorher.zurueckgehalten.zahl) || 0;
    const zahl = bisher + 1;
    if (zahl >= SCHLECHTER_NOETIG) return uebernehmen();

    for (const k of SCHLUESSEL) m[k] = vorher[k];
    m.stand = vorher.stand === "gemessen" ? "gemessen" : "veraltet";
    if (vorher.gemessen) m.gemessen = vorher.gemessen;   // wandert NICHT mit
    if (vorher.quelle) m.quelle = vorher.quelle;
    if (vorher.werkzeug) m.werkzeug = vorher.werkzeug;
    if (Array.isArray(vorher.hinweise)) m.hinweise = vorher.hinweise;
    m.frisch = frisch;
    m.zurueckgehalten = {
      zahl,
      noetig: SCHLECHTER_NOETIG,
      seit: (vorher.zurueckgehalten && vorher.zurueckgehalten.seit) || heute
    };
    return m;
  }

  if (roh.uebersprungen) {
    // Heute war ein anderer dran. Kein Befund, kein Urteil — der alte bleibt
    // unverändert stehen, samt seinem Datum und seinem Grund.
    if (hatZahlen(vorher)) {
      for (const k of SCHLUESSEL) m[k] = vorher[k];
      m.stand = vorher.stand === "gemessen" ? "gemessen" : "veraltet";
      if (vorher.gemessen) m.gemessen = vorher.gemessen;
      if (vorher.quelle) m.quelle = vorher.quelle;
      if (vorher.werkzeug) m.werkzeug = vorher.werkzeug;
      if (vorher.grund) m.grund = vorher.grund;
      if (Array.isArray(vorher.hinweise)) m.hinweise = vorher.hinweise;
      return m;
    }
    m.stand = "nicht_gemessen";
    m.grund = "noch_nicht_dran";
    return m;
  }

  const grund = String(roh.hinweis || "unbekannt").slice(0, 160);
  if (hatZahlen(vorher)) {
    for (const k of SCHLUESSEL) m[k] = vorher[k];
    m.stand = "veraltet";
    if (vorher.gemessen) m.gemessen = vorher.gemessen;
    if (vorher.quelle) m.quelle = vorher.quelle;
    if (vorher.werkzeug) m.werkzeug = vorher.werkzeug;
    // Die Nachbesserungen gehören zu den Zahlen: bleiben die stehen, bleiben
    // auch sie stehen. Sonst hätte ein Anbieter plötzlich eine Note ohne
    // Begründung.
    if (Array.isArray(vorher.hinweise)) m.hinweise = vorher.hinweise;
    m.grund = grund;
    return m;
  }
  m.stand = "nicht_gemessen";
  m.grund = grund;
  return m;
}

/* ── Wer kommt heute dran ──────────────────────────────────────────────────
 * Ältestes Messdatum zuerst, nie Gemessene ganz vorn, bei Gleichstand nach
 * Kennung — damit die Reihenfolge nachvollziehbar ist und nicht vom Zufall
 * abhängt. */
export function reihenfolge(ziele, vorher) {
  const v = vorher || {};
  return ziele.slice().sort((a, b) => {
    const da = (v[a.id] && v[a.id].gemessen) || "";
    const db = (v[b.id] && v[b.id].gemessen) || "";
    if (da !== db) return da < db ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/* ── Ein Durchgang über alle Einträge ─────────────────────────────────────── */
export async function messungLaufen(liste, opts) {
  const o = opts || {};
  const vorher = o.vorher || {};
  const heute = o.heute || new Date().toISOString().slice(0, 10);
  const log = o.log || (() => {});
  const max = Number.isFinite(o.max) ? o.max : MESSUNG_MAX_PRO_LAUF;

  const ziele = [];
  for (const x of liste) {
    if (!x || !x.anchorId) continue;
    const link = String(x.url || "");
    const app = String(x.appUrl || "");
    // Hat ein Eintrag ein SCHAUFENSTER (eine vorgeschaltete Landingpage), dann
    // ist `url` der Link für den Besucher und `appUrl` die eigentliche App.
    // Gemessen und auf der Karte gezeigt wird dann die APP — sonst stünde bei
    // zwei von vierzehn Einträgen die Bewertung des Schaufensters neben der
    // Bewertung der App der anderen zwölf, und niemand könnte das erkennen
    // (Klaus' Entscheidung 2026-08-02). Das Schaufenster wird zusätzlich
    // gemessen und im Bewertungs-Fenster beschriftet danebengestellt.
    const mitSchaufenster = /^https:\/\//i.test(app) && app !== link;
    ziele.push({
      id: x.anchorId,
      url: mitSchaufenster ? app : link,
      schaufensterUrl: mitSchaufenster ? link : ""
    });
  }
  // Nur https-Adressen sind Kandidaten für einen Platz unter dem Deckel. Eine
  // Adresse, die ohnehin nicht messbar ist, soll keinem messbaren Eintrag den
  // Platz wegnehmen.
  // Kein Werkzeug: einmal sagen, gar nicht erst starten. Der Befund ist für
  // jeden Eintrag derselbe und heißt „nicht gemessen" — nie „schlecht".
  const da = werkzeugDa(o);
  const messbar = da ? ziele.filter((z) => /^https:\/\//i.test(z.url)) : [];
  if (!da) log("  ! Lighthouse ist nicht verfügbar — es wird nicht gemessen (der Bericht sagt das auch so)");
  const dran = new Set(reihenfolge(messbar, vorher).slice(0, max).map((z) => z.id));
  if (messbar.length > dran.size) {
    log(`  ! Deckel ${max}: ${messbar.length - dran.size} Eintrag/Einträge kommen heute nicht dran — ihr letzter Befund bleibt mit seinem Datum stehen`);
  }
  // Der Deckel zählt EINTRÄGE, nicht Läufe. Ein Eintrag mit Schaufenster kostet
  // zwei Lighthouse-Läufe. Das wird gesagt, nicht verschwiegen — sonst wundert
  // sich die nächste Sitzung über die Laufzeit.
  const doppelt = ziele.filter((z) => z.schaufensterUrl && dran.has(z.id)).length;
  if (doppelt) log(`  · ${doppelt} Eintrag/Einträge haben ein Schaufenster und kosten je zwei Läufe (App + Landingpage)`);

  const ausfall = () => (da
    ? { ok: false, uebersprungen: true }
    : { ok: false, hinweis: "Lighthouse ist nicht installiert (npm install lighthouse)" });

  const raus = {};
  for (const z of ziele) {
    const roh = dran.has(z.id) ? await seiteMessen(z.url, o) : ausfall();
    const m = messungBilden({ vorher: vorher[z.id], roh, heute });
    if (z.url) m.url = z.url;

    // Das Schaufenster bekommt denselben Befund-Aufbau — inklusive „veraltet
    // mit Datum" und „noch nicht dran". Es ist eine eigene Messung, keine
    // Fußnote, und wird auch so behandelt.
    if (z.schaufensterUrl) {
      const rohS = dran.has(z.id) ? await seiteMessen(z.schaufensterUrl, o) : ausfall();
      const mS = messungBilden({ vorher: (vorher[z.id] || {}).schaufenster, roh: rohS, heute });
      mS.url = z.schaufensterUrl;
      m.schaufenster = mS;
    }

    raus[z.id] = m;
    const zahlen = hatZahlen(m) ? SCHLUESSEL.map((k) => m[k]).join("/") : "—";
    const sf = m.schaufenster
      ? "  | Schaufenster " + (hatZahlen(m.schaufenster) ? SCHLUESSEL.map((k) => m.schaufenster[k]).join("/") : "—")
      : "";
    log(`  · ${z.id.padEnd(28)} ${String(m.stand).padEnd(14)} ${zahlen}${m.grund ? " (" + m.grund + ")" : ""}${sf}`);
  }
  return raus;
}

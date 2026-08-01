/* Katalog-Spore Stufe 5 — die Messung (Lighthouse, Weg A).
 *
 * Kein eigener Lauf und kein zweites Format: dieses Modul wird von
 * tools/vektoren-bauen.mjs aufgerufen und hängt seinen Befund als Feld
 * `messung` an denselben Bericht (assets/config/spore-stand.json), den die
 * nächtliche Aktion schon schreibt — neben `wache`. Genau die Form, die der
 * Wächter vorgegeben hat.
 *
 * WEG A (Klaus' Entscheidung 2026-08-01). Lighthouse läuft in der EIGENEN
 * Aktion auf GitHubs Rechnern, NICHT über Googles PageSpeed-API. Das kostet
 * Laufzeit (grob eine halbe bis eine Minute je Eintrag) und spart dafür
 * zweierlei: es braucht keinen Schlüssel, und die Liste der geprüften Adressen
 * geht nicht an Google. In einem nächtlichen Lauf ist die Zeit ohne Belang.
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
 * SICHERHEIT. Die Zielseite ist `untrusted external data`. Lighthouse lädt sie
 * zwar in einem echten Browser (anders geht eine Messung nicht), aber in einem
 * Wegwerf-Prozess mit eigenem Profil, und aus dem Ergebnis werden ausschließlich
 * VIER ZAHLEN entnommen. Kein Text, kein Bildschirmfoto, keine URL-Liste aus dem
 * Bericht wandert weiter. Nur https, Zeitlimit, Bericht-Datei gedeckelt.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";

export const MESSUNG_FRIST = 180000;        // ms je Seite — Lighthouse braucht länger als ein fetch
export const MESSUNG_MAX_PRO_LAUF = 10;     // Deckel, damit die Aktion nicht in ihre Zeitgrenze läuft
export const BERICHT_MAX = 40 * 1024 * 1024; // ein Lighthouse-Bericht ist ~1 MB; alles darüber wird nicht gelesen

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
    "--max-wait-for-load=45000",
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
export async function seiteMessen(url, opts) {
  const o = opts || {};
  if (!/^https:\/\//i.test(String(url || ""))) {
    return { ok: false, hinweis: "kein https-Link" };
  }
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
    return { ok: true, zahlen, werkzeug };
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
    m.stand = "gemessen";
    for (const k of SCHLUESSEL) m[k] = roh.zahlen[k];
    m.gemessen = heute;
    if (roh.werkzeug) m.werkzeug = String(roh.werkzeug).slice(0, 40);
    return m;
  }

  if (roh.uebersprungen) {
    // Heute war ein anderer dran. Kein Befund, kein Urteil — der alte bleibt
    // unverändert stehen, samt seinem Datum und seinem Grund.
    if (hatZahlen(vorher)) {
      for (const k of SCHLUESSEL) m[k] = vorher[k];
      m.stand = vorher.stand === "gemessen" ? "gemessen" : "veraltet";
      if (vorher.gemessen) m.gemessen = vorher.gemessen;
      if (vorher.werkzeug) m.werkzeug = vorher.werkzeug;
      if (vorher.grund) m.grund = vorher.grund;
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
    if (vorher.werkzeug) m.werkzeug = vorher.werkzeug;
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
    ziele.push({ id: x.anchorId, url: String(x.url || "") });
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

  const raus = {};
  for (const z of ziele) {
    const roh = dran.has(z.id)
      ? await seiteMessen(z.url, o)
      : (da ? { ok: false, uebersprungen: true }
            : { ok: false, hinweis: "Lighthouse ist nicht installiert (npm install lighthouse)" });
    const m = messungBilden({ vorher: vorher[z.id], roh, heute });
    if (z.url) m.url = z.url;
    raus[z.id] = m;
    const zahlen = hatZahlen(m) ? SCHLUESSEL.map((k) => m[k]).join("/") : "—";
    log(`  · ${z.id.padEnd(28)} ${String(m.stand).padEnd(14)} ${zahlen}${m.grund ? " (" + m.grund + ")" : ""}`);
  }
  return raus;
}

/* Katalog-Spore Stufe 2 — Sporen holen und die Vektoren fortschreiben.
 * (Und der Sammelpunkt für den Wächter aus Stufe 3 und die Messung aus
 *  Stufe 5: EIN Lauf, EIN Bericht — assets/config/spore-stand.json.)
 *
 *   node tools/vektoren-bauen.mjs              # nur nachsehen und berichten
 *   node tools/vektoren-bauen.mjs --schreiben  # Dateien wirklich ändern
 *   node tools/vektoren-bauen.mjs --ohne-netz  # Sporen überspringen (Test)
 *
 * WOZU. Stufe 1 hat den Knopf im Studio gebaut: Klaus drückt ihn, die Vektoren
 * werden vorberechnet, die Suche ist schnell. Das setzt voraus, dass Klaus
 * drückt. Stufe 2 nimmt ihm das ab — eine GitHub-Action, einmal täglich.
 *
 * Sie tut zwei Dinge:
 *
 *   1. SPORE LESEN. Jeder Eintrag darf ein Feld `sporeUrl` tragen, das auf die
 *      sbkim/spore.json im eigenen Repo des Anbieters zeigt. Der Anbieter
 *      behält seine Spore bei sich und ändert sie dort; der Marktplatz liest
 *      sie nur. Hat sich die Beschreibung geändert, hängt es an einem Haken am
 *      Eintrag, was passiert (Klaus' Entscheidung 2026-08-02):
 *        sporeAuto: true   -> der Text wird über Nacht übernommen
 *        (kein Haken)      -> nur gemeldet; Klaus übernimmt im Studio per Knopf
 *      Der Standard ist also die sichere Seite: ohne ausdrückliche Erlaubnis
 *      schreibt niemand Fremdes ungefragt auf family-projekt.de.
 *
 *   2. VEKTOREN FORTSCHREIBEN, mit derselben Spar-Logik wie der Studio-Knopf:
 *      Jeder Vektor im Paket trägt den Hash des Textes, aus dem er entstand.
 *      Passt der Hash noch UND stimmen Modell und Dimension, ist der alte
 *      Vektor exakt derselbe, den eine Neuberechnung liefern würde — er wird
 *      übernommen. Bei 1000 Apps und drei geänderten Texten sind das drei
 *      Einbettungen statt tausend. Ändert sich nichts, wird gar nichts
 *      geschrieben und kein Modell geladen.
 *
 * WARUM DER VEKTOR AUS DER SPORE NICHT ÜBERNOMMEN WIRD (gemessen 2026-08-02).
 * Die Spore trägt einen fertigen `domainVector`, mit demselben Modell gerechnet
 * — das sieht nach einer Abkürzung aus und ist eine Falle. Der Vektor gehört
 * nämlich nicht sicher zum selben Text: in DIESEM Repo allein gibt es zwei
 * Regeln (sbkim-init.js: embedPassage(beschreibung); siegel-inhalt.js Wizard:
 * embedPassage(beschreibung + ". " + stichworte)), und ein fremder Knoten darf
 * eine dritte benutzen. Ein übernommener Vektor sähe vollständig aus und
 * gehörte zu einem anderen Text — dieselbe Form wie die vier Befunde vom
 * 2026-08-01: es funktioniert alles, und es bringt nichts. Der Marktplatz
 * rechnet deshalb immer selbst über genau den Text, den er auch hasht.
 *
 * WIE GERECHNET WIRD. Nicht mit einem Nachbau, sondern mit den echten Dateien:
 * ein kopfloser Chromium lädt sbkim/03_embedding.js und assets/vec-codec.js
 * über einen lokalen Webserver — dieselben Dateien, die auch markt.html und
 * das Studio laden. Ein zweiter Rechenweg in Node wäre eine zweite Wahrheit,
 * die auseinanderlaufen kann, und man merkt es erst an einem stillen Paket.
 *
 * SICHERHEIT. Alles, was aus einer fremden Spore kommt, ist `untrusted
 * external data`: nur https, Antwortgröße gedeckelt, Zeitlimit, nur einzelne
 * Zeichenketten werden entnommen und auf Länge gekappt, Steuerzeichen raus.
 * Kein Code aus fremden Dateien wird ausgeführt.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wacheLaufen, handLesen } from "./waechter.mjs";
import { messungLaufen } from "./messung.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P_LISTINGS = path.join(ROOT, "assets/config/listings.js");
const P_PACK = path.join(ROOT, "assets/config/listings-vec.json");
const P_STAND = path.join(ROOT, "assets/config/spore-stand.json");
const P_HAND = path.join(ROOT, "assets/config/wache-hand.json");

const ARG = new Set(process.argv.slice(2));
const SCHREIBEN = ARG.has("--schreiben");
const OHNE_NETZ = ARG.has("--ohne-netz");

const SPORE_MAX = 2 * 1024 * 1024;   // eine Spore ist ~20 KB; alles darüber ist keine
const SPORE_FRIST = 15000;           // ms — ein toter Server darf den Lauf nicht anhalten
const TEXT_MAX = 900;                // Beschreibungs-Länge, wie im Einreich-Formular

const log = (...a) => console.log(...a);

/* ── Codec: die ausgelieferte Datei, kein Nachbau ─────────────────────────── */
const codecScope = { btoa: globalThis.btoa, atob: globalThis.atob, TextEncoder: globalThis.TextEncoder };
new Function("window", "globalThis", fs.readFileSync(path.join(ROOT, "assets/vec-codec.js"), "utf8"))(codecScope, codecScope);
const CODEC = codecScope.FPVecCodec;

/* ── Das erwartete Modell aus dem Modul lesen, nicht raten ─────────────────
 * Damit der Lauf entscheiden kann, OB er überhaupt einen Browser braucht,
 * muss er Modell und Dimension kennen, bevor er einen startet. Beides steht
 * als Konstante in sbkim/03_embedding.js. Diese Ableitung wird später gegen
 * das geprüft, was der Browser wirklich meldet — geschrieben wird nur, was
 * dort bestätigt ist. */
function erwartetesModell() {
  const src = fs.readFileSync(path.join(ROOT, "sbkim/03_embedding.js"), "utf8");
  const m = /var\s+EMBEDDING_MODEL\s*=\s*"([^"]+)"/.exec(src);
  const d = /var\s+EMBEDDING_DIM\s*=\s*(\d+)/.exec(src);
  if (!m || !d) throw new Error("EMBEDDING_MODEL/EMBEDDING_DIM in sbkim/03_embedding.js nicht gefunden");
  return { model: m[1], dim: Number(d[1]) };
}

/* ── Einträge lesen — dieselbe Quelle, die die Seite als <script> lädt ─────── */
function listingsLesen() {
  const txt = fs.readFileSync(P_LISTINGS, "utf8");
  const sand = {};
  new Function("window", txt)(sand);
  if (!Array.isArray(sand.FP_LISTINGS)) throw new Error("assets/config/listings.js enthält kein FP_LISTINGS-Array");
  return { txt, liste: sand.FP_LISTINGS };
}

/* Die Text-Regel. EINE Stelle, wortgleich zu assets/studio-markt.js
 * (vecEntries) und zu markt.html. Weicht sie ab, passen die Hashes nicht und
 * das ganze Paket ist still wertlos. */
const eintragsText = (x) => String(x.text || x.label || "");

/* ── Fremde Spore holen: eng geführt, fail-soft ───────────────────────────── */
async function sporeHolen(url) {
  if (!/^https:\/\//i.test(String(url || ""))) return { lage: "unbrauchbar", hinweis: "kein https-Link" };
  let r;
  try {
    r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(SPORE_FRIST) });
  } catch (e) {
    // Die Ursache mitnehmen: Nodes fetch meldet nach außen nur „fetch failed",
    // der eigentliche Grund (Zertifikat, DNS, Zeitüberschreitung) steht in
    // e.cause. Ohne ihn sucht man im Bericht vergeblich.
    const grund = [e && e.message, e && e.cause && e.cause.message].filter(Boolean).join(": ");
    return { lage: "unerreichbar", hinweis: String(grund || e).slice(0, 160) };
  }
  if (!r.ok) {
    // Gemessen 2026-08-02: raw.githubusercontent.com antwortet für PRIVATE
    // Repos immer mit 404 — auch wenn die Datei dort liegt. Fünf von Klaus'
    // neun Sporen fielen genau darauf herein, und ohne diesen Hinweis sucht
    // die nächste Sitzung den Fehler bei sich. Der Live-Link der App tut es
    // auch, und der ist öffentlich, sonst stünde die App nicht im Marktplatz.
    const raw = /raw\.githubusercontent\.com/i.test(url) && r.status === 404;
    return { lage: "unerreichbar", hinweis: "HTTP " + r.status + (raw ? " — bei privaten Repos normal; stattdessen den Live-Link <app-adresse>/sbkim/spore.json eintragen" : "") };
  }
  const roh = await r.text();
  if (roh.length > SPORE_MAX) return { lage: "unbrauchbar", hinweis: "Datei zu groß (" + roh.length + " Bytes)" };
  let s;
  try { s = JSON.parse(roh); } catch (_e) { return { lage: "unbrauchbar", hinweis: "kein gültiges JSON" }; }
  if (!s || typeof s !== "object") return { lage: "unbrauchbar", hinweis: "kein Objekt" };
  const str = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
  const beschreibung = str(s.domainDescription, TEXT_MAX);
  if (!beschreibung) return { lage: "unbrauchbar", hinweis: "domainDescription fehlt oder ist leer" };
  return {
    lage: "gelesen",
    beschreibung,
    nodeName: str(s.nodeName, 80),
    nodeId: str(s.id, 80),
    modell: str(s.embeddingModel, 80)
  };
}

/* ── Nur den Text EINES Eintrags in listings.js ersetzen ───────────────────
 * Chirurgisch statt neu-schreiben: die Datei schreibt sonst das Studio, und
 * zwei Schreiber mit minimal verschiedener Formatierung erzeugen bei jedem
 * Lauf einen Unterschied, der keiner ist. Ersetzt wird ausschließlich der
 * Wert von "text" innerhalb des Objekts mit der passenden anchorId. */
function textErsetzen(quelle, anchorId, neuerText) {
  const marke = '"anchorId": ' + JSON.stringify(anchorId);
  const i = quelle.indexOf(marke);
  if (i < 0) return { ok: false, grund: "anchorId nicht gefunden" };
  const auf = quelle.lastIndexOf("{", i);
  const zu = quelle.indexOf("\n  }", i);
  if (auf < 0 || zu < 0) return { ok: false, grund: "Eintrags-Grenzen nicht gefunden" };
  const block = quelle.slice(auf, zu);
  const re = /("text":\s*)("(?:[^"\\]|\\.)*")/;
  if (!re.test(block)) return { ok: false, grund: '"text" im Eintrag nicht gefunden' };
  const neu = block.replace(re, (_m, kopf) => kopf + JSON.stringify(neuerText));
  return { ok: true, quelle: quelle.slice(0, auf) + neu + quelle.slice(zu) };
}

/* ── Rechnen im echten Browser, mit den echten Modulen ─────────────────────── */
const MIME = { ".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".onnx":"application/octet-stream" };
const BAUSEITE = `<!doctype html><meta charset="utf-8"><title>vektoren</title>
<script src="/sbkim/03_embedding.js"></script>
<script src="/assets/vec-codec.js"></script>`;

async function imBrowserRechnen(texte) {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/__bau.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(BAUSEITE); return; }
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const pw = await import(process.env.PW_CORE || "playwright-core");
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  const start = { args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] };
  // Auf der Bau-Maschine liegt ein fertiger Chromium; in der GitHub-Action
  // bringt Playwright seinen eigenen mit und findet ihn selbst. Deshalb: erst
  // die Umgebungsvariable, dann der bekannte Pfad, sonst gar nichts angeben.
  const bekannt = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  if (fs.existsSync(bekannt)) start.executablePath = bekannt;
  const browser = await chromium.launch(start);
  try {
    const page = await browser.newPage();
    page.on("console", (m) => { if (m.type() === "error") log("    [Browser]", m.text()); });
    await page.goto(base + "/__bau.html", { waitUntil: "load" });
    // Auf das Ergebnis warten, nicht auf die Uhr: das Modell sind ~30 MB, und
    // wie lange die durch die Leitung gehen, weiß niemand vorher.
    return await page.evaluate(async (t) => {
      await window.SbkimEmbedding.init();
      const meta = window.SbkimEmbedding._meta || {};
      const vecs = [];
      for (let i = 0; i < t.length; i += 8) {
        const teil = await window.SbkimEmbedding.embedPassageBatch(t.slice(i, i + 8));
        for (const v of teil) vecs.push(Array.from(v));
      }
      return { model: meta.model, dim: meta.dim, quant: (window.FPVecCodec._meta || {}).quant, vecs };
    }, texte, { timeout: 15 * 60 * 1000 });
  } finally {
    await browser.close();
    server.close();
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */
log("Katalog-Spore Stufe 2+3+5 — Sporen lesen, bewachen, messen, Vektoren fortschreiben");
log(SCHREIBEN ? "  Betriebsart: SCHREIBEN" : "  Betriebsart: nur nachsehen (--schreiben zum Ändern)");

const ERW = erwartetesModell();
let { txt: quelle, liste } = listingsLesen();
log(`  ${liste.length} Einträge, erwartetes Modell ${ERW.model} (${ERW.dim})`);

let paket = null;
try { paket = JSON.parse(fs.readFileSync(P_PACK, "utf8")); } catch (_e) { paket = null; }
log(paket ? `  bestehendes Paket: ${Object.keys(paket.vectors || {}).length} Vektoren, Modell ${paket.model}` : "  kein bestehendes Paket");

/* ── 1. Sporen ─────────────────────────────────────────────────────────────── */
/* Den Bericht des Vortages lesen, BEVOR der neue entsteht: der Wächter braucht
 * ihn, um „hat sich etwas geändert?" und „wie oft hintereinander tot?"
 * überhaupt beantworten zu können. Fehlt er (erster Lauf), fängt alles bei
 * null an — das ist kein Fehler, sondern der Anfang. */
let vorherigeWachen = {};
let vorherigeMessungen = {};
let vorherigeSporen = {};
try {
  const alt = JSON.parse(fs.readFileSync(P_STAND, "utf8"));
  for (const k of Object.keys((alt && alt.eintraege) || {})) {
    if (alt.eintraege[k] && alt.eintraege[k].wache) vorherigeWachen[k] = alt.eintraege[k].wache;
    if (alt.eintraege[k] && alt.eintraege[k].messung) vorherigeMessungen[k] = alt.eintraege[k].messung;
    if (alt.eintraege[k]) vorherigeSporen[k] = alt.eintraege[k];
  }
  log(`  vorheriger Bericht: ${Object.keys(vorherigeWachen).length} Wächter-Einträge, ${Object.keys(vorherigeMessungen).length} Messungen`);
} catch (_e) {
  log("  kein vorheriger Bericht — Wächter und Messung fangen bei null an");
}

/* Der Hinweis reist mit: die Datei wird maschinell überschrieben, und wer sie
 * im Repo findet, soll ohne Umweg wissen, woher sie kommt und dass Handarbeit
 * darin verloren geht. */
const stand = {
  _hinweis: "Bericht der nächtlichen Prüfung (Katalog-Spore Stufe 2 + 3). Wird von tools/vektoren-bauen.mjs geschrieben — Änderungen von Hand gehen beim nächsten Lauf verloren. Sperren und Freigaben gehören in assets/config/wache-hand.json.",
  geprueft: new Date().toISOString(),
  eintraege: {}
};
const uebernahmen = [];
let mitSpore = 0;

for (const x of liste) {
  if (!x || !x.anchorId || !x.sporeUrl) continue;
  mitSpore++;
  const s = OHNE_NETZ ? { lage: "uebersprungen", hinweis: "--ohne-netz" } : await sporeHolen(x.sporeUrl);
  const e = { url: String(x.sporeUrl), lage: s.lage };
  if (s.hinweis) e.hinweis = s.hinweis;
  if (s.nodeName) e.nodeName = s.nodeName;
  if (s.nodeId) e.nodeId = s.nodeId;
  if (s.modell) e.modell = s.modell;

  if (s.lage === "gelesen") {
    // Der Fingerabdruck der GELESENEN Spore. Er beantwortet beim nächsten Lauf
    // die Frage „hat der Anbieter seinen Text seitdem angefasst?" — ohne den
    // ganzen Text ein zweites Mal zu speichern.
    e.sporeHash = CODEC.textHash(s.beschreibung);
    if (s.beschreibung === eintragsText(x)) {
      e.lage = "gleich";
    } else if (x.sporeAuto === true) {
      e.lage = "uebernommen";
      e.stand = new Date().toISOString().slice(0, 10);
      uebernahmen.push({ id: x.anchorId, text: s.beschreibung });
    } else {
      /* Nur melden — aber NICHT jede Nacht aufs Neue.
       *
       * Befund von Klaus, 2026-08-01: das Studio meldete Nacht für Nacht
       * „Beschreibung geändert — wartet auf dich", obwohl niemand etwas
       * geändert hatte. Der Grund: verglichen wurde die Spore des Anbieters
       * mit Klaus' Marktplatz-Text. Das sind schlicht zwei verschiedene Texte,
       * dauerhaft. Also meldete der Vergleich ewig dasselbe.
       *
       * Eine Abweichung, die schon gestern bestand, ist kein Fund, sondern ein
       * Zustand. Gemeldet wird ab jetzt nur, was sich SEIT DEM LETZTEN BERICHT
       * wirklich geändert hat — dieselbe Haltung wie beim Wächter, der sich
       * seine `grundlage` merkt, statt den Vortag zu vergleichen.
       *
       * `abweichend` heißt: weicht ab, ist aber nichts Neues. Der Text bleibt
       * im Bericht, das Studio bietet ihn weiter zum Übernehmen an — nur ohne
       * Ausrufezeichen.
       *
       * Der frühere Bericht trägt den Text als `neuerText`; deshalb wird auch
       * dagegen verglichen. So ist die Sache schon beim NÄCHSTEN Lauf ruhig und
       * nicht erst beim übernächsten. */
      const vor = vorherigeSporen[x.anchorId];
      const bekannt = !!vor && (vor.sporeHash === e.sporeHash || vor.neuerText === s.beschreibung);
      e.lage = bekannt ? "abweichend" : "geaendert";
      e.neuerText = s.beschreibung;
    }
  }
  stand.eintraege[x.anchorId] = e;
  log(`  · ${x.anchorId.padEnd(28)} ${e.lage}${e.hinweis ? " (" + e.hinweis + ")" : ""}`);
}
log(`  ${mitSpore} Einträge mit sporeUrl, ${uebernahmen.length} Beschreibung(en) automatisch übernommen`);

/* ── 1b. Der Wächter (Stufe 3) ─────────────────────────────────────────────
 * Hängt sich an denselben Lauf und erweitert denselben Bericht — kein zweiter
 * Lauf, kein zweites Format. Anders als der Sporen-Teil prüft er ALLE
 * Einträge, auch die ohne `sporeUrl`: eine tote oder gekaperte Zielseite ist
 * unabhängig davon ein Befund. Die Regeln stehen in tools/waechter.mjs. */
log("\nWächter — Zielseiten prüfen");
// Ohne Netz wird nicht geprüft — dann aber der VORIGE Befund unverändert
// weitergereicht statt gelöscht. Sonst nähme ein Testlauf mit --ohne-netz
// --schreiben dem Wächter sein Gedächtnis (Grundlage, Fehlschlag-Zähler), und
// der nächste echte Lauf finge stillschweigend wieder bei null an.
const wache = OHNE_NETZ
  ? vorherigeWachen
  : await wacheLaufen(liste, { vorher: vorherigeWachen, hand: handLesen(P_HAND), log });
for (const x of liste) {
  if (!x || !x.anchorId) continue;
  if (!stand.eintraege[x.anchorId]) stand.eintraege[x.anchorId] = { lage: "ohne_spore" };
  if (wache[x.anchorId]) stand.eintraege[x.anchorId].wache = wache[x.anchorId];
}
{
  const z = { gruen: 0, gelb: 0, rot: 0 };
  for (const k of Object.keys(wache)) z[wache[k].ampel] = (z[wache[k].ampel] || 0) + 1;
  stand.wacheZaehler = z;
  log(`  ${z.gruen} grün, ${z.gelb} gelb, ${z.rot} rot`
    + (OHNE_NETZ ? "  (übersprungen: --ohne-netz)" : ""));
}

/* ── 1c. Die Messung (Stufe 5) ─────────────────────────────────────────────
 * Wieder derselbe Lauf, derselbe Bericht — neben `wache` steht `messung`.
 *
 * NUR IM SCHREIB-LAUF. Der Probelauf davor ändert nichts und würde die teuerste
 * Arbeit des Abends ein zweites Mal tun; die Aktion liefe in ihre Zeitgrenze,
 * ohne dass irgendjemand etwas davon hätte. Der Probelauf sagt stattdessen
 * hin, dass er sie ausgelassen hat — still übergehen wäre wieder eine
 * unsichtbare Kürzung.
 *
 * Ohne Netz und ohne Lighthouse bleibt der vorige Befund unverändert stehen.
 * Ein Testlauf darf dem Bericht sein Gedächtnis nicht nehmen — dieselbe Regel
 * wie beim Wächter. */
log("\nMessung — Lighthouse (Stufe 5)");
let messung = vorherigeMessungen;
if (OHNE_NETZ) {
  log("  übersprungen: --ohne-netz (voriger Befund bleibt stehen)");
} else if (!SCHREIBEN) {
  log("  übersprungen: nur im Schreib-Lauf (--schreiben) — der Probelauf misst nicht doppelt");
} else {
  messung = await messungLaufen(liste, { vorher: vorherigeMessungen, log });
}
for (const x of liste) {
  if (!x || !x.anchorId) continue;
  if (!stand.eintraege[x.anchorId]) stand.eintraege[x.anchorId] = { lage: "ohne_spore" };
  if (messung[x.anchorId]) stand.eintraege[x.anchorId].messung = messung[x.anchorId];
}
{
  const z = { gemessen: 0, veraltet: 0, nicht_gemessen: 0 };
  for (const k of Object.keys(messung)) z[messung[k].stand] = (z[messung[k].stand] || 0) + 1;
  stand.messungZaehler = z;
  log(`  ${z.gemessen} gemessen, ${z.veraltet} veraltet, ${z.nicht_gemessen} nicht gemessen`);
}

/* Übernahmen in die Quelle einarbeiten (im Speicher; geschrieben wird später). */
let quelleGeaendert = false;
for (const u of uebernahmen) {
  const r = textErsetzen(quelle, u.id, u.text);
  if (!r.ok) { log(`  ! ${u.id}: Text nicht ersetzt — ${r.grund}`); continue; }
  quelle = r.quelle;
  quelleGeaendert = true;
}
if (quelleGeaendert) {
  // Gegenprobe: die veränderte Datei muss noch ladbar sein und die neuen Texte
  // wirklich tragen. Eine kaputte listings.js legt den Marktplatz lahm.
  const sand = {};
  new Function("window", quelle)(sand);
  if (!Array.isArray(sand.FP_LISTINGS) || sand.FP_LISTINGS.length !== liste.length) {
    throw new Error("listings.js nach der Übernahme nicht mehr lesbar — nichts geschrieben");
  }
  for (const u of uebernahmen) {
    const nach = sand.FP_LISTINGS.find((y) => y && y.anchorId === u.id);
    if (!nach || eintragsText(nach) !== u.text) throw new Error("Übernahme bei " + u.id + " kam nicht an — nichts geschrieben");
  }
  liste = sand.FP_LISTINGS;
  log("  ✓ listings.js nach der Übernahme geprüft: lesbar, Texte angekommen");
}

/* ── 2. Was muss gerechnet werden? ─────────────────────────────────────────── */
const passt = !!(paket && paket.vectors && paket.model === ERW.model && (!paket.dim || paket.dim === ERW.dim));
const uebernommen = {};
const offen = [];
for (const x of liste) {
  if (!x || !x.anchorId) continue;
  const text = eintragsText(x);
  if (!text) continue;
  const rec = passt ? paket.vectors[x.anchorId] : null;
  if (rec && rec.h && rec.v && typeof rec.s === "number" && rec.h === CODEC.textHash(text)) {
    uebernommen[x.anchorId] = { s: rec.s, v: rec.v, h: rec.h };
  } else {
    offen.push({ id: x.anchorId, text });
  }
}
log(`  ${Object.keys(uebernommen).length} Vektoren unverändert übernommen, ${offen.length} neu zu rechnen`);

if (!offen.length && !quelleGeaendert) {
  // Ehrlich sagen, dass nichts zu tun war — nicht so tun, als hätte man
  // gearbeitet. Der Sporen-Bericht wird trotzdem fortgeschrieben, sonst
  // veraltet die Anzeige im Studio.
  if (SCHREIBEN) { fs.writeFileSync(P_STAND, JSON.stringify(stand, null, 2) + "\n"); log("  → nur spore-stand.json aktualisiert"); }
  log("\nNichts zu tun: kein Text hat sich geändert.");
  process.exit(0);
}

let neuePaketVektoren = uebernommen;
let quant = null;
if (offen.length) {
  log(`  … rechne ${offen.length} Einbettung(en) im kopflosen Browser`);
  const r = await imBrowserRechnen(offen.map((o) => o.text));
  // Die Ableitung aus dem Modul-Quelltext gegen das prüfen, was wirklich lief.
  if (r.model !== ERW.model || r.dim !== ERW.dim) {
    throw new Error(`Modell weicht ab: erwartet ${ERW.model}/${ERW.dim}, gemeldet ${r.model}/${r.dim} — nichts geschrieben`);
  }
  if (r.vecs.length !== offen.length) throw new Error(`${offen.length} Vektoren erwartet, ${r.vecs.length} bekommen`);
  for (let i = 0; i < offen.length; i++) {
    const p = CODEC.encode(Float32Array.from(r.vecs[i]));
    p.h = CODEC.textHash(offen[i].text);
    neuePaketVektoren[offen[i].id] = p;
  }
  quant = r.quant;
}

const neuesPaket = {
  version: 1,
  model: ERW.model,
  dim: ERW.dim,
  quant: (typeof quant === "string" && quant) || (paket && paket.quant) || (CODEC._meta && CODEC._meta.quant),
  built: new Date().toISOString().slice(0, 10),
  vectors: neuePaketVektoren
};
if (!Object.keys(neuesPaket.vectors).length) throw new Error("leeres Paket — nichts geschrieben");

if (!SCHREIBEN) {
  log(`\nProbelauf: würde ${Object.keys(neuesPaket.vectors).length} Vektoren schreiben`
    + (quelleGeaendert ? ` und ${uebernahmen.length} Beschreibung(en) in listings.js` : ""));
  process.exit(0);
}
if (quelleGeaendert) fs.writeFileSync(P_LISTINGS, quelle);
fs.writeFileSync(P_PACK, JSON.stringify(neuesPaket));
fs.writeFileSync(P_STAND, JSON.stringify(stand, null, 2) + "\n");
log(`\nGeschrieben: listings-vec.json (${Object.keys(neuesPaket.vectors).length} Vektoren), spore-stand.json`
  + (quelleGeaendert ? ", listings.js" : ""));

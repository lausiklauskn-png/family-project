/* Schreibt die Marktplatz- und Werkzeug-Listen ZUSÄTZLICH als echtes HTML in
 * die ausgelieferten Seiten.
 *
 *   node tools/statische-listen.mjs            # bauen
 *   node tools/statische-listen.mjs --pruefen  # nur vergleichen, nichts schreiben
 *
 * WARUM ES OHNE DAS NICHT GEHT. Am 2026-08-05 nachgezählt: im ausgelieferten
 * HTML von index.html, werkzeuge.html und markt.html stand **kein einziger**
 * Link zu einer der Apps — alle 30 baut erst JavaScript im Browser. Google
 * führt JavaScript aus, aber in einem zweiten, verzögerten Durchgang; was erst
 * dabei entsteht, wird später entdeckt und zählt unzuverlässiger. Geht beim
 * Zeichnen etwas schief, ist der Link gar nicht da. family-projekt.de gab
 * damit an keine der verlinkten Apps verlässlich Empfehlungswert weiter.
 *
 * WAS DAS SKRIPT IM BROWSER DAMIT MACHT: es überschreibt es. `render()` setzt
 * `innerHTML`, die statische Liste verschwindet also in dem Moment, in dem das
 * Skript läuft. Das ist ABSICHT und braucht keine Sonderbehandlung — der
 * Crawler sieht das Statische, der Besucher das Gezeichnete. Als Nebengewinn
 * bleibt die Liste stehen, wenn das Skript ausfällt; das war vorher nicht so.
 *
 * ── Die Fallen, jede schon einmal teuer bezahlt ────────────────────────────
 *
 * 1 · DER ZEITPUNKT. Die Ampel je Eintrag kommt aus assets/config/spore-stand.json,
 *     und die schreibt der nächtliche Lauf. Läuft dieses Werkzeug DAVOR, friert
 *     es eine alte Ampel ein — und eine Seite, die Klaus bewusst auf Eis gelegt
 *     hat, bliebe statisch verlinkt. Darum steht der Schritt in
 *     .github/workflows/vektoren-taeglich.yml NACH dem Wächter, an derselben
 *     Stelle wie tools/tabelle-bauen.mjs.
 *
 * 2 · ROT HEISST KEIN LINK. Genau wie im Browser (`if (w && w.ampel === "rot")
 *     url = ""`). Der Eintrag bleibt sichtbar, nur der Link fällt weg — ein
 *     stilles Verschwinden wäre für den Anbieter nicht nachvollziehbar.
 *
 * 3 · FREMDE EINTRÄGE BÜRGT NIEMAND. Ein Link ist eine Empfehlung. Was nicht
 *     `own: true` trägt, bekommt `rel="nofollow ugc"` — sonst bürgt
 *     family-projekt.de bei Google für Inhalte, die Klaus nicht kontrolliert.
 *     Heute sind alle 14 Markt-Einträge eigene; die Unterscheidung steht
 *     trotzdem von Anfang an drin, weil es zu spät ist, sie zu übersehen,
 *     sobald der erste fremde Eintrag da ist.
 *
 * 4 · `noreferrer` NUR BEI FREMDEN (Klaus 2026-08-05). `noopener` bleibt immer
 *     — das ist Sicherheit. `noreferrer` verbirgt die Herkunft; bei Klaus'
 *     eigenen Apps verbirgt es sie vor ihm selbst, und dann ist nicht mehr
 *     messbar, was der Marktplatz ihnen bringt. Genau das soll gemessen werden.
 *
 * 5 · DIE REIHENFOLGE KOMMT AUS DER DATEI. `render()` sortiert nach Relevanz,
 *     und die hängt an der Suchanfrage. Die statische Liste hat keine Anfrage.
 *     Also unverändert die Reihenfolge der Datendatei — stabil, nachvollziehbar,
 *     niemand muss sie erklären.
 *
 * 6 · ZWEIMAL LAUFEN DARF NICHTS ÄNDERN. Beim Sprachen-Bauwerkzeug in
 *     Perfect-Skin-Beauty hat genau das gefehlt und bei jedem Lauf eine Zeile
 *     angehäuft. Darum die zwei Marken: geschrieben wird immer NUR zwischen
 *     ANFANG und ENDE, angehängt wird nie. tests/smoke_statische_listen.mjs
 *     prüft es.
 *
 * 7 · WERKZEUGE.JS SIND KLAUS' EIGENE. Die Datei heißt „Klaus' EIGENE
 *     Werkzeuge" und alle Adressen darin liegen auf seinen Hosts. Deshalb gilt
 *     dort die Eigen-Regel. Damit das nicht stillschweigend kippt, prüft der
 *     Wächter jede externe Adresse gegen EIGENE_HOSTS — käme je ein fremdes
 *     Werkzeug dazu, wird er rot und erzwingt eine Entscheidung, statt
 *     ungefragt dafür zu bürgen.
 *
 * Der erzeugte Block wird NICHT von Hand bearbeitet. Er wird hier neu
 * geschrieben; der Wächter prüft, dass er zu den Datendateien passt.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NUR_PRUEFEN = process.argv.includes("--pruefen");

export const ANFANG = "<!-- statische-listen:anfang -->";
export const ENDE = "<!-- statische-listen:ende -->";

/* Klaus' eigene Hosts. Nur für die Gegenprobe in Falle 7 — die Eigen-/Fremd-
 * Entscheidung im Marktplatz trifft weiterhin das Feld `own`. */
export const EIGENE_HOSTS = [
  "lausiklauskn-png.github.io",
  "family-projekt.de",
  "perfectskinbeauty.de"
];

/* ---- Lesen, nicht nachbauen ----------------------------------------------- */

/* Die Datendateien sind schlichte `window.FP_… = […]`-Zuweisungen. Sie werden
 * ausgeführt, nicht mit einer Regel nachgelesen: eine zweite Lese-Regel wäre
 * eine zweite Wahrheit, die auseinanderläuft — und man merkt es erst an einem
 * Eintrag, der auf der Seite steht und im HTML fehlt. */
export function leseConfig(datei) {
  const quelle = fs.readFileSync(path.join(WURZEL, "assets", "config", datei), "utf8");
  const fenster = {};
  new Function("window", quelle)(fenster);
  return fenster;
}

export function leseWache() {
  const p = path.join(WURZEL, "assets", "config", "spore-stand.json");
  /* Fail-soft wie im Browser: fehlt der Bericht (erster Lauf, kaputtes JSON),
   * wird gebaut, als wäre alles grün. Ein Wächter, der den Bau lahmlegt, wenn
   * er selbst ausfällt, wäre schlimmer als keiner. */
  if (!fs.existsSync(p)) return {};
  let bericht;
  try { bericht = JSON.parse(fs.readFileSync(p, "utf8")); } catch (_e) { return {}; }
  const wache = {};
  for (const [id, e] of Object.entries(bericht.eintraege || {})) {
    if (e && e.wache) wache[id] = e.wache;
  }
  return wache;
}

/* ---- Dieselben Schutzregeln wie im Browser -------------------------------- */

/* Zeichen für Zeichen dieselben wie `esc`/`safeUrl`/`safeImg` in markt.html.
 * Wer hier lockerer ist, hat eine Lücke gebaut, die es im Browser nicht gibt. */
export const esc = (s) => String(s == null ? "" : s)
  .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "");
export const safeImg = (u) => {
  const s = String(u || "");
  return /^https?:\/\//i.test(s) && !/\.svg(\?|$)/i.test(s) ? s : "";
};

/* Seiteninterne Ziele wie `werkzeuge/geschenkbox.html`. Ausdrücklich KEIN
 * `//host` (das wäre ein Außen-Link ohne Schema) und kein `javascript:`. */
export const safePfad = (u) => {
  const s = String(u || "").trim();
  if (!s || /^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith("//")) return "";
  return s;
};

export const hostVon = (u) => { try { return new URL(u).host.toLowerCase(); } catch (_e) { return ""; } };
export const istEigenerHost = (u) => EIGENE_HOSTS.includes(hostVon(u));

/* Falle 3 + 4 in einer Zeile. */
export const relFuer = (eigen) => (eigen ? "noopener" : "nofollow ugc noopener noreferrer");

/* ---- Marktplatz ----------------------------------------------------------- */

export function markteintraege(listings, wache) {
  /* Dieselbe Vorauswahl wie `neuAufbauen()` in markt.html: ohne gültiges Bild
   * kein Eintrag. Was die Seite nicht zeigt, darf auch nicht im HTML stehen. */
  return listings
    .filter((x) => x && safeImg(x.img))
    .map((x) => {
      const w = (x.anchorId && wache[x.anchorId]) || null;
      const aufEis = !!(w && w.ampel === "rot");
      return {
        label: String(x.label || ""),
        anchorId: String(x.anchorId || ""),
        by: String(x.by || ""),
        text: String(x.text || "").slice(0, 160),
        img: safeImg(x.img),
        url: aufEis ? "" : safeUrl(x.url),      // Falle 2
        eigen: x.own === true,                   // Falle 3
        aufEis
      };
    });
}

export function marktHtml(eintraege) {
  return eintraege.map((e) => {
    const link = e.url
      ? `<a class="btn ghost ext" href="${esc(e.url)}" target="_blank" rel="${relFuer(e.eigen)}">→ Zur Seite</a>`
      : "";
    return '<div class="glass listing">' +
      '<div class="img">' +
        `<img src="${esc(e.img)}" alt="${esc(e.label)}" loading="lazy" referrerpolicy="no-referrer">` +
      "</div>" +
      '<div class="body">' +
        `<h3>${esc(e.label)}</h3>` +
        (e.by ? `<p class="by">${esc(e.by)}</p>` : "") +
        `<p>${esc(e.text)}</p>` +
        '<div class="listing-actions"><div class="listing-foot">' + link + "</div></div>" +
      "</div>" +
      "</div>";
  }).join("\n");
}

/* ---- Werkzeuge ------------------------------------------------------------ */

export function werkzeugeintraege(tools) {
  return tools.map((w) => {
    /* Klaus 2026-08-05: „`page`, wo vorhanden, sonst `open`." Die eigenen
     * Unterseiten sind das, was Google kennenlernen soll — sie hatten bis
     * heute genau EINEN statischen Link im ganzen Auftritt. */
    const innen = safePfad(w.page);
    const aussen = innen ? "" : safeUrl(w.open);
    return {
      id: String(w.id || ""),
      name: String(w.name || ""),
      text: String(w.de || ""),
      icon: String(w.icon || "🧰"),
      href: innen || aussen,
      extern: !innen && !!aussen
    };
  }).filter((w) => w.href);
}

export function werkzeugeHtml(eintraege) {
  return eintraege.map((w) => {
    /* Innen: kein target, kein rel — es ist dieselbe Seite. Außen: Klaus'
     * eigene Apps, also `noopener` ohne `noreferrer` (Falle 4). */
    const attrs = w.extern ? ' target="_blank" rel="noopener"' : "";
    const knopf = w.extern ? "→ App öffnen" : "→ Seite ansehen";
    return `<a class="glass area" href="${esc(w.href)}"${attrs}>` +
      `<div class="ico">${esc(w.icon)}</div>` +
      `<h2>${esc(w.name)}</h2>` +
      `<p>${esc(w.text)}</p>` +
      `<span class="go">${esc(knopf)}</span></a>`;
  }).join("\n");
}

/* ---- In die Seite einsetzen ----------------------------------------------- */

/* Geschrieben wird ausschließlich zwischen den zwei Marken INNERHALB des
 * Behälters. Fehlen sie, werden sie einmalig in den leeren Behälter gesetzt.
 * Angehängt wird nie — das ist Falle 6. */
export function einsetzen(html, behaelterId, block) {
  const marken = new RegExp(`${ANFANG}[\\s\\S]*?${ENDE}`);
  if (marken.test(html)) {
    return html.replace(marken, `${ANFANG}\n${block}\n${ENDE}`);
  }
  const leer = new RegExp(`(<div[^>]*\\bid="${behaelterId}"[^>]*>)\\s*(</div>)`);
  if (!leer.test(html)) {
    throw new Error(`Behälter #${behaelterId} nicht gefunden oder nicht leer — ` +
      "Marken von Hand entfernt? Bitte nachsehen, statt blind zu schreiben.");
  }
  return html.replace(leer, `$1${ANFANG}\n${block}\n${ENDE}$2`);
}

/* ---- Lauf ----------------------------------------------------------------- */

export function bauePlan() {
  const wache = leseWache();
  const listings = leseConfig("listings.js").FP_LISTINGS || [];
  const tools = leseConfig("werkzeuge.js").FP_WERKZEUGE || [];

  const markt = markteintraege(listings, wache);
  const werkz = werkzeugeintraege(tools);

  return [
    { datei: "markt.html", behaelter: "mkListings", eintraege: markt, block: marktHtml(markt) },
    { datei: "werkzeuge.html", behaelter: "toolGrid", eintraege: werkz, block: werkzeugeHtml(werkz) }
  ];
}

export function schreiben({ pruefen = false } = {}) {
  const berichte = [];
  for (const p of bauePlan()) {
    const ziel = path.join(WURZEL, p.datei);
    const alt = fs.readFileSync(ziel, "utf8");
    const neu = einsetzen(alt, p.behaelter, p.block);
    const gleich = alt === neu;
    if (!gleich && !pruefen) fs.writeFileSync(ziel, neu);
    berichte.push({ datei: p.datei, anzahl: p.eintraege.length, gleich, eintraege: p.eintraege });
  }
  return berichte;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const berichte = schreiben({ pruefen: NUR_PRUEFEN });
  let abweichung = false;
  for (const b of berichte) {
    const verlinkt = b.eintraege.filter((e) => e.url || e.href).length;
    const aufEis = b.eintraege.filter((e) => e.aufEis).length;
    const zustand = b.gleich ? "unverändert" : (NUR_PRUEFEN ? "WEICHT AB" : "neu geschrieben");
    if (!b.gleich && NUR_PRUEFEN) abweichung = true;
    console.log(`${b.datei}: ${b.anzahl} Einträge, ${verlinkt} verlinkt` +
      (aufEis ? `, ${aufEis} auf Eis (kein Link)` : "") + ` — ${zustand}`);
  }
  if (abweichung) {
    console.error("\nDie Seiten passen nicht zu den Datendateien. " +
      "node tools/statische-listen.mjs  behebt das.");
    process.exit(1);
  }
}

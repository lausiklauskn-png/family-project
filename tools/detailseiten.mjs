/* Je Eintrag eine eigene Adresse: apps/<anchorId>/index.html
 *
 *   node tools/detailseiten.mjs                 baut alle + apps/index.html
 *   node tools/detailseiten.mjs --nur=markt-x   baut eine
 *   node tools/detailseiten.mjs --pruefen       meldet nur, ob sie auf dem Stand sind
 *   node tools/detailseiten.mjs --noindex       setzt das `noindex` zurück
 *
 * ── WARUM ES DAS GIBT (S5–S9 des SEO-Plans, hier ab 2026-09-22) ────────────
 *
 * 18 Apps teilen sich EINE Adresse (`markt.html`). Keine davon kann für ihren
 * eigenen Zweck gefunden werden — wer „Kassenbuch kostenlos offline" sucht,
 * bekommt bestenfalls den Marktplatz, und der handelt von allem.
 *
 * Die Seite ist ein MESSBLATT aus Daten, die schon dastehen: Name, Text,
 * Anbieter, Bereich aus `assets/config/listings.js`, die Zahlen und Mängel aus
 * `forschung/messreihe.json`. Keine Schreibarbeit, keine Pflege.
 *
 * ⛔ DIE TAFEL: KEIN SICHTBARER INHALT HÄNGT AN JAVASCRIPT (Klaus 2026-09-21).
 * Alles steht als HTML in der Datei, bevor ein Browser etwas tut. Kein
 * Abschnitt wird nachgeladen, keine Tabelle gezeichnet, kein `<a>` bekommt
 * sein `href` erst per Skript. Was erlaubt bleibt, nimmt nichts weg, wenn es
 * fehlt.
 *
 * ── WAS HIER ANDERS IST ALS IN PWA TOOLPOINT ───────────────────────────────
 *
 * Drei Unterschiede, alle gemessen und keiner geraten:
 *
 *   · KEIN gemeinsames `assets/karte.js`. Dort holen sich Bau-Werkzeug und
 *     Seite dasselbe Karten-Markup aus einer Datei; hier gibt es das nicht —
 *     `marktHtml()` und `markt.html`s `neuAufbauen()` sind zwei Fassungen, und
 *     der Kommentar in `statische-listen.mjs` sagt das seit dem 2026-09-21
 *     ausdrücklich. Diese Datei baut deshalb ihr eigenes Markup und hängt
 *     NICHT an der Karte.
 *   · KEIN `seit`-Feld und KEINE `eigenschaften`. Nachgezählt an allen 18
 *     Einträgen: label · anchorId · text · text_en · by · url · img ·
 *     category · own, dazu sporeUrl (12) und appUrl (3). Die zwei Abschnitte
 *     entfallen deshalb GANZ, statt leer dazustehen — ein Abschnitt mit einer
 *     leeren Tabelle ist schlechter als keiner.
 *   · Die Messwerte liegen LOKAL (`forschung/messreihe.json`) — diese Seite
 *     IST die Messstation. Kein Nachbar-Klon, kein Netz-Weg, keine
 *     fail-soft-Lücke wie drüben.
 *
 * ⚠ TAFEL-EVOLUTIONS-KLAUSEL, AUSDRÜCKLICH BENANNT (2026-09-22).
 *
 * Hier stand: „VORGABE IST `noindex`, UND DAS IST ABSICHT … solange der
 * `handle /apps/*`-Block nicht auf dem Server steht, wäre eine Einladung an
 * Google eine Einladung in einen Soft-404." Der Satz war richtig, SOLANGE die
 * Bedingung offen war. Sie ist es nicht mehr: der Block steht seit dem
 * 2026-09-22 auf Klaus' Hetzner-Server, gemessen am laufenden Dienst —
 * `/apps/gibtesnicht/` → 404, `/markt.html` → 200.
 *
 * LIVE und INDEXIERBAR bleiben zwei Schalter — das war und ist der Kern; nur
 * die Stellung des zweiten hat sich gedreht. Der Weg zurück heißt `--noindex`.
 *
 * ⚠ UND DIE RICHTUNG DER VORGABE IST EINE ENTSCHEIDUNG, KEIN GESCHMACK.
 * Vorher musste der nächtliche Lauf `--indexierbar` MITGEBEN; vergisst ihn
 * jemand, fallen siebzehn Seiten lautlos aus dem Index, und niemand sieht es
 * — die Sitemap schrumpft, und das sähe aus, als hätten die Seiten selbst
 * etwas. Jetzt ist der gespeicherte Zustand die Vorgabe, und wer sie
 * zurücknimmt, muss es HINSCHREIBEN. Dasselbe Herum wie in PWA Toolpoint;
 * zwei Depots mit gegenläufigen Schaltern wären zwei Regeln, die man sich
 * merken muss.
 *
 * Und der Schalter erzwingt sich selbst: `tools/sitemap-bauen.mjs` nimmt nur
 * Adressen OHNE `noindex` auf. Vergessen kann man es also nicht.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import {
  leseConfig, leseWache, markteintraege, esc, relFuer
} from "./statische-listen.mjs";

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASIS = "https://family-projekt.de";
const lies = (p) => readFileSync(join(WURZEL, p), "utf8");

/* ---- Fassung aus sw.js, damit ?v= überall dieselbe Zahl trägt ------------- */
export function fassung() {
  const m = /var\s+ASSET_V\s*=\s*"(\d+)"/.exec(lies("sw.js"));
  if (!m) throw new Error("ASSET_V in sw.js nicht lesbar");
  return m[1];
}

export const pfadVon = (id) => `apps/${id}/index.html`;
export const adresseVon = (id) => `${BASIS}/apps/${id}/`;

/* ---- Messreihe ------------------------------------------------------------
 * Geschlüsselt nach anchorId — dieselbe Kennung wie im Marktplatz. Genommen
 * werden nur Handy-Punkte: die Karte zeigt ebenfalls die Handy-Messung, und
 * zwei Geräte in einer Tabelle wären zwei Fragen in einer Spalte. */
export function punkteVon(reihen, id) {
  const r = reihen && reihen[id];
  if (!r || !Array.isArray(r.punkte)) return [];
  return r.punkte
    .filter((p) => (p.geraet || "handy") === "handy")
    .slice()
    .sort((a, b) => String(b.bis || b.von || "").localeCompare(String(a.bis || a.von || "")));
}

/* ⚠ DIE FELDNAMEN DER ROHREIHE WEICHEN AB und werden übersetzt:
 * `gute_praxis` → Gute Praxis, `auffindbarkeit` → Auffindbarkeit,
 * `von`/`bis` → Zeitraum. Wer sie roh durchreicht, bekommt leere Spalten, die
 * aussehen wie fehlende Messungen. */
const SPALTEN = [
  ["leistung", "Leistung"],
  ["bedienbarkeit", "Bedienbarkeit"],
  ["gute_praxis", "Gute Praxis"],
  ["auffindbarkeit", "Auffindbarkeit"]
];

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni",
                "Juli", "August", "September", "Oktober", "November", "Dezember"];
export function datumLang(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return String(iso || "");
  return `${Number(m[3])}. ${MONATE[Number(m[2]) - 1]} ${m[1]}`;
}

/* ---- Meta-Beschreibung ----------------------------------------------------
 * 120–160 Zeichen, am SATZENDE geschnitten, nie mitten im Wort. Findet sich
 * kein Satzende, wird an der Wortgrenze geschnitten und „ …" angehängt — die
 * ehrliche Kürzung. Wo dabei unter 120 herauskommen, meldet der Lauf den
 * Eintrag NAMENTLICH als ⊘ offen, nicht rot: ein zu kurzer Satz darf die
 * nächtliche Veröffentlichung nicht anhalten (2026-09-18). */
export function metaBeschreibung(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= 160) return t;
  const schnitt = t.slice(0, 160);
  const satz = Math.max(schnitt.lastIndexOf(". "), schnitt.lastIndexOf("! "), schnitt.lastIndexOf("? "));
  if (satz >= 120) return schnitt.slice(0, satz + 1);
  const wort = schnitt.lastIndexOf(" ");
  return `${schnitt.slice(0, wort > 0 ? wort : 160)} …`;
}

/* ---- JSON-LD --------------------------------------------------------------
 * ⚠ AUSDRÜCKLICH NICHT: `aggregateRating` (Lighthouse ist keine
 * Nutzerbewertung — das wäre eine Lüge in Maschinenschrift und ein Verstoß
 * gegen Googles Richtlinie), `offers`/`price` (niemand hat geprüft, ob eine
 * fremde App kostenlos bleibt), `datePublished` (gibt es hier ohnehin nicht).
 * Für die Messwerte gibt es KEINE ehrliche schema.org-Eigenschaft; sie
 * bleiben menschenlesbare Tabelle. */
const KATEGORIE = {
  "Küche": "LifestyleApplication",
  "Büro": "BusinessApplication",
  "Werkzeug": "UtilitiesApplication",
  "Werkzeuge": "UtilitiesApplication",
  "Sicherheit": "SecurityApplication"
};

export function jsonLd(e, url, beschreibung) {
  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: e.label,
    description: beschreibung,
    url,
    inLanguage: "de",
    operatingSystem: "Web"
  };
  if (e.img) app.image = new URL(e.img, `${BASIS}/`).href;
  if (e.by) app.author = { "@type": "Person", name: e.by };
  /* ⚠ EINE UNBEKANNTE KATEGORIE WIRD WEGGELASSEN, NICHT GERATEN. */
  const kat = KATEGORIE[String(e.category || "").trim()];
  if (kat) app.applicationCategory = kat;

  const krume = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Marktplatz", item: `${BASIS}/markt.html` },
      { "@type": "ListItem", position: 2, name: e.label, item: url }
    ]
  };
  return [app, krume]
    .map((d) => `  <script type="application/ld+json">${JSON.stringify(d)}</script>`)
    .join("\n");
}

/* ---- Der Inhalt ----------------------------------------------------------- */
export function inhalt(e, punkte, alle) {
  const T = [];
  const jung = punkte[0] || null;

  /* 1 · Kopf */
  T.push('    <section class="glass det-kopf">');
  if (e.img) {
    T.push(`      <img src="${esc(e.img)}" alt="${esc(e.label)}" width="72" height="72"` +
           ' loading="eager" decoding="async" referrerpolicy="no-referrer">');
  }
  T.push('      <div>');
  T.push(`        <h1 translate="no">${esc(e.label)}</h1>`);
  T.push('        <p class="det-band">');
  if (e.by) T.push(`          <span translate="no">${esc(e.by)}</span>`);
  if (e.category) T.push(`          <span>${esc(e.category)}</span>`);
  T.push('        </p>');
  /* ⚠ ROT HEISST KEIN LINK, aber der Eintrag bleibt sichtbar: ein stilles
   * Verschwinden wäre für den Anbieter nicht nachvollziehbar. `markteintraege`
   * hat die url bei roter Ampel schon geleert. */
  if (e.url) {
    T.push(`        <p><a class="btn ghost ext" href="${esc(e.url)}" target="_blank"` +
           ` rel="${relFuer(e.eigen)}">Zur Seite</a></p>`);
  } else {
    T.push('        <p class="det-hinweis">Der Link ist zurzeit ausgesetzt. Der Eintrag' +
           ' bleibt sichtbar; der Grund steht im Marktplatz an der Karte.</p>');
  }
  T.push('      </div>');
  T.push('    </section>');

  /* 2 · Was die App macht — der VOLLE Text */
  T.push('    <section class="glass">');
  T.push('      <h2>Was die App macht</h2>');
  T.push(`      <p>${esc(e.text)}</p>`);
  T.push('    </section>');

  /* 3 · Zuletzt gemessen */
  T.push('    <section class="glass">');
  T.push('      <h2>Zuletzt gemessen</h2>');
  if (jung) {
    T.push('      <p class="det-band">');
    for (const [k, name] of SPALTEN) {
      const v = Number(jung[k]);
      T.push(`        <span>${esc(name)} <b>${Number.isFinite(v) ? v : "—"}</b></span>`);
    }
    T.push('      </p>');
    T.push(`      <p class="klein">Gemessen am ${esc(datumLang(jung.bis || jung.von))}` +
           (jung.werkzeug ? `, Werkzeug ${esc(String(jung.werkzeug))}` : "") +
           (jung.quelle ? `, Quelle ${esc(String(jung.quelle))}` : "") +
           " — Handy-Ansicht.</p>");
  } else {
    T.push('      <p class="det-hinweis">Noch nicht gemessen — die erste Messung läuft' +
           ' in der nächsten Nacht.</p>');
  }
  T.push('    </section>');

  /* 4 · Verlauf — entfällt GANZ, wenn es keinen gibt */
  if (punkte.length > 1) {
    T.push('    <section class="glass">');
    T.push('      <details>');
    T.push(`        <summary><h2>Verlauf der Messungen <span class="klein">(${punkte.length})</span></h2></summary>`);
    T.push('        <div class="mess-huelle">');
    T.push('        <table class="mess-tabelle">');
    T.push('          <thead><tr><th>Zeitraum</th>' +
           SPALTEN.map(([, n]) => `<th class="zahl">${esc(n)}</th>`).join("") + "</tr></thead>");
    T.push("          <tbody>");
    for (const p of punkte) {
      const zeit = p.von && p.bis && p.von !== p.bis
        ? `${esc(p.von)} – ${esc(p.bis)}` : esc(p.bis || p.von || "");
      T.push(`            <tr><td>${zeit}</td>` +
        SPALTEN.map(([k]) => {
          const v = Number(p[k]);
          return `<td class="zahl">${Number.isFinite(v) ? v : "—"}</td>`;
        }).join("") + "</tr>");
    }
    T.push("          </tbody>");
    T.push("        </table>");
    T.push("        </div>");
    T.push("      </details>");
    T.push("    </section>");
  }

  /* 5 · Was bemängelt wurde — entfällt GANZ, wenn nichts dasteht */
  const mangel = (jung && Array.isArray(jung.mangel)) ? jung.mangel : [];
  if (mangel.length) {
    T.push('    <section class="glass">');
    T.push('      <h2>Was dabei bemängelt wurde</h2>');
    T.push(`      <p class="klein">Befunde des Messwerkzeugs vom ${esc(datumLang(jung.bis || jung.von))}` +
           " — keine Urteile, sondern Hinweise, was schneller oder sauberer ginge.</p>");
    T.push('      <ul class="det-liste">');
    for (const m of mangel) T.push(`        <li>${esc(m)}</li>`);
    T.push("      </ul>");
    T.push("    </section>");
  }

  /* 6 · Wo die Zahlen herkommen */
  T.push('    <section class="glass">');
  T.push('      <h2>Wo die Zahlen herkommen</h2>');
  T.push('      <p>Gemessen mit Google Lighthouse in der Handy-Ansicht, einmal je Nacht.' +
         ' Eine einzelne Messung ist eine Momentaufnahme: bei leichten Seiten trifft sie gut,' +
         ' bei schweren schwankt vor allem die Leistungszahl. Der vollständige Bericht liegt' +
         ' offen — jeder kann nachrechnen.</p>');
  T.push('      <p><a href="../../markt.html">→ Zum Marktplatz</a></p>');
  T.push("    </section>");

  /* 7 · Ähnliche Einträge — zugleich die interne Verlinkung */
  const nachbarn = alle
    .filter((x) => x.anchorId !== e.anchorId && x.category && x.category === e.category)
    .slice(0, 5);
  if (nachbarn.length) {
    T.push('    <section class="glass">');
    T.push(`      <h2>Mehr aus ${esc(e.category)}</h2>`);
    T.push('      <ul class="det-liste">');
    for (const n of nachbarn) {
      T.push(`        <li><a href="../${esc(n.anchorId)}/">${esc(n.label)}</a></li>`);
    }
    T.push("      </ul>");
    T.push("    </section>");
  }
  return T.join("\n");
}

/* ---- Die Übersicht -------------------------------------------------------- */
export function uebersichtInhalt(alle) {
  const T = [];
  T.push('    <h1>Alle Apps</h1>');
  T.push(`    <p class="lead">${alle.length} Einträge aus dem Marktplatz, nach Bereich` +
         " geordnet. Jede hat ihre eigene Seite mit Messwerten und Verlauf.</p>");
  const bereiche = new Map();
  for (const e of alle) {
    const b = e.category || "Ohne Bereich";
    if (!bereiche.has(b)) bereiche.set(b, []);
    bereiche.get(b).push(e);
  }
  for (const [name, liste] of [...bereiche].sort((a, b) => a[0].localeCompare(b[0]))) {
    T.push('    <section class="glass">');
    T.push(`      <h2>${esc(name)} <span class="klein">${liste.length}</span></h2>`);
    T.push('      <ul class="det-liste">');
    for (const e of liste) {
      T.push(`        <li><a href="${esc(e.anchorId)}/">${esc(e.label)}</a></li>`);
    }
    T.push("      </ul>");
    T.push("    </section>");
  }
  return T.join("\n");
}

/* ---- Seitenbau ------------------------------------------------------------ */
const VORLAGE = readFileSync(new URL("vorlagen/detail.html", import.meta.url), "utf8");

export function seite({ titel, beschreibung, url, robots, v, inhalt: rumpf, jsonld, tiefe = 2 }) {
  return VORLAGE
    .replace(/\{\{TITEL\}\}/g, esc(titel))
    .replace(/\{\{BESCHREIBUNG\}\}/g, esc(beschreibung))
    .replace(/\{\{URL\}\}/g, esc(url))
    .replace(/\{\{ROBOTS\}\}/g, esc(robots))
    .replace(/\{\{V\}\}/g, esc(v))
    .replace(/\{\{INHALT\}\}/g, rumpf)
    .replace(/\{\{JSONLD\}\}/g, jsonld || "")
    /* Die Vorlage steht auf zwei Ebenen (apps/<id>/); die Übersicht liegt eine
     * höher. Ersetzt wird der Pfad, nicht der Inhalt — eine zweite Vorlage
     * wäre eine zweite Fassung desselben Kopfes. */
    .replace(/\.\.\/\.\.\//g, tiefe === 1 ? "../" : "../../");
}

/* ---- Lauf ----------------------------------------------------------------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  const nur = (process.argv.find((a) => a.startsWith("--nur=")) || "").split("=")[1];
  const pruefen = process.argv.includes("--pruefen");
  const robots = process.argv.includes("--noindex")
    ? "noindex, follow"
    : "index, follow, max-image-preview:large, max-snippet:-1";

  const wache = leseWache();
  const rohListe = leseConfig("listings.js");
  const roh = Array.isArray(rohListe) ? rohListe
    : (rohListe.listings || Object.values(rohListe).find(Array.isArray) || []);
  const gefiltert = markteintraege(roh, wache);
  /* `markteintraege` reicht `category` nicht durch — sie kommt aus der rohen
   * Liste dazu. Gefiltert (Wartung, rote Ampel) wird weiter DORT: zwei
   * Fassungen derselben Regel laufen auseinander. */
  const nachId = new Map(roh.map((x) => [String(x.anchorId || ""), x]));
  const alle = gefiltert.map((e) => ({
    ...e, category: String((nachId.get(e.anchorId) || {}).category || "")
  }));

  const reihen = (JSON.parse(lies("forschung/messreihe.json")) || {}).reihen || {};
  const V = fassung();
  const ziel = nur ? alle.filter((e) => e.anchorId === nur) : alle;
  if (nur && !ziel.length) {
    console.log(`❌ kein Eintrag mit der Kennung ${nur}`);
    process.exit(2);
  }

  let geschrieben = 0, abweichend = 0;
  const kurz = [];
  for (const e of ziel) {
    const punkte = punkteVon(reihen, e.anchorId);
    const url = adresseVon(e.anchorId);
    const besch = metaBeschreibung(e.text);
    if (besch.length < 120) kurz.push(`${e.anchorId} (${besch.length} Zeichen)`);
    const html = seite({
      titel: `${e.label} — Family Projekt`,
      beschreibung: besch, url, robots, v: V,
      inhalt: inhalt(e, punkte, alle),
      jsonld: jsonLd(e, url, besch)
    });
    const datei = join(WURZEL, pfadVon(e.anchorId));
    const alt = existsSync(datei) ? readFileSync(datei, "utf8") : null;
    if (alt === html) continue;
    abweichend++;
    if (!pruefen) {
      mkdirSync(dirname(datei), { recursive: true });
      writeFileSync(datei, html, "utf8");
      geschrieben++;
    }
  }

  /* Die Übersicht */
  if (!nur) {
    const html = seite({
      titel: "Alle Apps — Family Projekt",
      beschreibung: `Alle ${alle.length} Apps aus dem Marktplatz von Family Projekt,` +
                    " nach Bereich geordnet — mit Messwerten und Verlauf je App.",
      url: `${BASIS}/apps/`, robots, v: V,
      inhalt: uebersichtInhalt(alle), jsonld: "", tiefe: 1
    });
    const datei = join(WURZEL, "apps/index.html");
    const alt = existsSync(datei) ? readFileSync(datei, "utf8") : null;
    if (alt !== html) {
      abweichend++;
      if (!pruefen) {
        mkdirSync(dirname(datei), { recursive: true });
        writeFileSync(datei, html, "utf8");
        geschrieben++;
      }
    }
  }

  /* ⚠ VERWAISTE SEITEN werden GEMELDET, nicht gelöscht. Eine Seite, die einmal
   * im Netz stand, wird zum Grabstein — sie zu löschen gäbe eine 404 für eine
   * Adresse, die Google kennt. Was damit geschieht, entscheidet Klaus. */
  const soll = new Set(alle.map((e) => e.anchorId));
  const verz = join(WURZEL, "apps");
  const verwaist = existsSync(verz)
    ? readdirSync(verz, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !soll.has(d.name)).map((d) => d.name)
    : [];

  if (kurz.length) console.log(`⊘ Meta-Beschreibung unter 120 Zeichen bei: ${kurz.join(", ")}`);
  if (verwaist.length) console.log(`⊘ verwaiste Seiten (nicht gelöscht): ${verwaist.join(", ")}`);
  if (pruefen) {
    if (abweichend) {
      console.log(`❌ ${abweichend} Seite(n) weichen ab — \`node tools/detailseiten.mjs\` ausführen`);
      process.exit(2);
    }
    console.log(`✅ die Detailseiten sind auf dem Stand (${ziel.length} geprüft, robots: ${robots})`);
  } else {
    console.log(`✅ ${geschrieben} Seite(n) geschrieben (${ziel.length} Einträge, robots: ${robots})`);
  }
}

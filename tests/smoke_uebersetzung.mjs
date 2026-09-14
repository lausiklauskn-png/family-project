/* Übersetzung — die vier Befunde aus Klaus' Sichttest vom 2026-09-14.
 *   node tests/smoke_uebersetzung.mjs
 *
 * WARUM ES DIESE PROBE GIBT. Klaus hat vier Dinge gemeldet, und drei davon
 * hatten dieselbe Ursache, die auf den ersten Blick wie drei aussah:
 *
 *   1. Zwei Sprach-Bedienelemente nebeneinander im Kopf — der DE/EN-Knopf und
 *      ein längerer Wähler mit zwölf Sprachnamen, der die Seite gar nicht
 *      übersetzt. Er SAH aus wie der Seiten-Wähler und war der fürs Mikrofon.
 *   2. „Hölle“ statt „Hell“ im Themen-Knopf.
 *   3. Zwei verschiedene deutsche Überschriften für dieselbe Seite.
 *   4. Die Container im Marktplatz blieben im Englisch-Modus deutsch.
 *
 * 2 und 3 kamen von GOOGLES Übersetzer, der die Seite zusätzlich zum eigenen
 * DE/EN-Schalter übersetzte: er las das deutsche „Hell“ als englisches Wort,
 * machte aus „Family Projekt“ ein „Familienprojekt“ und übersetzte den
 * englischen Modus nach Deutsch zurück. Der Übersetzer bleibt AN (Klaus'
 * Entscheidung: seine Apps richten sich auch an Menschen, die weder Deutsch
 * noch Englisch lesen) — geriegelt werden gezielt die EIGENNAMEN.
 *
 * Gemessen wird, was man SIEHT, nicht was im Quelltext steht.
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (b, m, d = "") => { if (b) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m, "—", d); } };

const PORT = 8231;
const srv = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: wurzel, stdio: "ignore" });
const base = `http://127.0.0.1:${PORT}`;
async function warteAufServer() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(base + "/index.html"); if (r.ok) return true; } catch (_e) {}
    await new Promise((x) => setTimeout(x, 100));
  }
  return false;
}
// Auf die BEDINGUNG warten, nicht auf die Uhr: eine feste Frist verliert das
// Rennen auf einer langsamen Maschine, und zwar still.
if (!(await warteAufServer())) { console.log("  ✗ Server kam nicht hoch"); srv.kill(); process.exit(1); }

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });

async function seite(datei, sprache) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });
  await ctx.addInitScript((l) => { try { localStorage.setItem("fp_lang", l); } catch (_e) {} }, sprache);
  const page = await ctx.newPage();
  await page.goto(`${base}/${datei}`, { waitUntil: "load" });
  // Die SBKIM-Kette und der Riegel-Beobachter laufen in der Leerlauf-Pause;
  // gewartet wird auf das, was dabei entsteht.
  await page.waitForFunction(() => !!document.querySelector(".listing, .area, main"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1800);
  return { ctx, page };
}

console.log("\nÜbersetzung — Riegel gegen den Auto-Übersetzer");
{
  const { ctx, page } = await seite("markt.html", "de");
  const r = await page.evaluate(() => {
    const geriegelt = (s) => { const n = [...document.querySelectorAll(s)];
      return { anzahl: n.length, alle: n.length > 0 && n.every((x) => x.getAttribute("translate") === "no") }; };
    const lead = document.querySelector("p.lead");
    return {
      marke: geriegelt(".brand"), thema: geriegelt("#themeBtn"), lampen: geriegelt("#fp-dock"),
      namen: geriegelt(".listing h3"), kuerzel: geriegelt(".listing .by"), sprachen: geriegelt(".mic-sprache"),
      pille: (() => { const b = document.getElementById("sbkim-rdv-btn"); return b ? b.getAttribute("translate") === "no" : null; })(),
      fliesstext: lead ? lead.getAttribute("translate") !== "no" : null
    };
  });
  ok(r.marke.alle, `Markenname geriegelt (${r.marke.anzahl}×) — „Family Projekt“ wurde zu „Familienprojekt“`);
  ok(r.thema.alle, "Themen-Knopf geriegelt — „Hell“ wurde zu „Hölle“");
  ok(r.lampen.alle, "Lampen-Leiste geriegelt (LEBT · VERKEHR · FREMD · SIEGEL)");
  ok(r.namen.alle && r.namen.anzahl > 5, `App-Namen geriegelt (${r.namen.anzahl}×)`, JSON.stringify(r.namen));
  ok(r.kuerzel.alle, "Anbieter-Kürzel geriegelt (@handle)");
  ok(r.sprachen.alle, "Mikrofon-Sprachnamen geriegelt — „Türkçe“ bleibt „Türkçe“");
  ok(r.pille === true, "die Pille „🌐 Mycel“ ist geriegelt", String(r.pille));

  /* ⚠ DER BEOBACHTER BRAUCHT EINE EIGENE MESSUNG, und die Zeile darueber ist
   * sie NICHT. Gemessen am 2026-09-14: auf dieser Maschine steht die Pille
   * schon beim ersten Durchgang da — schaltet man den Beobachter ab, bleibt
   * sie trotzdem geriegelt. Der Waechter war damit von seinem Fehlen nicht zu
   * unterscheiden, und der Gegenprobe-Fall meldete „nicht gefangen", obwohl
   * der Beobachter tot war.
   *
   * Wofuer er da ist, ist etwas anderes: ein Element, das SPAETER dazukommt.
   * Auf einem langsamen Geraet kann die Leerlauf-Kette hinter den ersten
   * Durchgang rutschen — dann ist er der einzige, der greift. Gemessen wird
   * deshalb genau das: ein Eigenname, der NACH dem Laden entsteht. */
  const spaet = await page.evaluate(async () => {
    const el = document.createElement("p");
    el.setAttribute("data-eigenname", "");
    el.textContent = "Family Projekt";
    document.body.appendChild(el);
    // Auf die BEDINGUNG warten, nicht auf die Uhr: der Beobachter meldet sich,
    // sobald er darf. Die Frist ist nur die Reissleine.
    for (let i = 0; i < 60; i++) {
      if (el.getAttribute("translate") === "no") return true;
      await new Promise((x) => setTimeout(x, 50));
    }
    return false;
  });
  ok(spaet === true, "ein Eigenname, der NACH dem Laden dazukommt, wird auch geriegelt (der Beobachter)", String(spaet));
  // Die Gegenrichtung, und sie ist die wichtigere: ein Riegel, der ALLES
  // sperrt, nimmt fremdsprachigen Besuchern den einzigen Weg.
  ok(r.fliesstext === true, "Fließtext bleibt übersetzbar — nicht zu viel geriegelt", String(r.fliesstext));
  await ctx.close();
}

console.log("\nÜbersetzung — der eigene DE/EN-Schalter wirkt überall");
{
  const de = await seite("markt.html", "de");
  const en = await seite("markt.html", "en");
  const lies = (s) => s.page.evaluate(() => ({
    thema: (document.getElementById("themeName") || {}).textContent,
    h1: (document.querySelector("h1") || {}).textContent,
    karte: (document.querySelector(".listing .body p:not(.by)") || {}).textContent
  }));
  const a = await lies(de), b = await lies(en);
  ok(a.thema === "Dunkel" && b.thema === "Dark", "Themen-Name folgt der Sprache", `${a.thema} / ${b.thema}`);
  ok(a.h1 !== b.h1 && /Find apps/.test(b.h1), "Überschrift folgt der Sprache", `${a.h1} / ${b.h1}`);
  // Der Befund, um den es Klaus ging: der Containerinhalt blieb deutsch.
  ok(/Rezeptbuch und Kochbuch/.test(a.karte), "Container deutsch im DE-Modus", a.karte);
  ok(/Recipe book and cookbook/.test(b.karte), "Container ENGLISCH im EN-Modus", b.karte);
  await de.ctx.close(); await en.ctx.close();
}

console.log("\nMikrofon-Sprache steht am Mikrofon, nicht im Kopf");
{
  const { ctx, page } = await seite("markt.html", "de");
  const r = await page.evaluate(() => {
    const sel = document.getElementById("fpMicLang");
    if (!sel) return { da: false };
    const reihe = sel.closest(".mic-sprache");
    const zeile = document.querySelector(".searchrow");
    const feld = zeile.querySelector(".field"), knopf = zeile.querySelector("button.btn");
    return {
      da: true,
      imKopf: !!sel.closest("nav.top"),
      beimMikrofon: !!(reihe && reihe.parentElement && reihe.parentElement.querySelector(".mic")),
      sichtbar: sel.checkVisibility(),
      // Der Waehler wird per Skript in die Suchzeile gehaengt. Die ist ein
      // Flex-Behaelter: ohne Umbruch wurde er zu einem dritten Element IN der
      // Zeile und quetschte das Suchfeld von 680 auf 230 px (gemessen).
      feldBreit: Math.round(feld.getBoundingClientRect().width),
      knopfGleicheZeile: Math.abs(feld.getBoundingClientRect().y - knopf.getBoundingClientRect().y) < 4,
      waehlerDarunter: reihe.getBoundingClientRect().y > feld.getBoundingClientRect().y
    };
  });
  ok(r.da, "es gibt genau einen Mikrofon-Sprachwähler");
  ok(r.imKopf === false, "er steht NICHT mehr neben dem DE/EN-Knopf (das war die Doppelung)");
  ok(r.beimMikrofon, "er steht bei einem Feld mit Mikrofon");
  ok(r.sichtbar, "und man sieht ihn");
  ok(r.feldBreit > 400, `das Suchfeld bleibt breit (${r.feldBreit}px, nicht auf 230 gequetscht)`);
  ok(r.knopfGleicheZeile, "„Suchen“ steht weiter neben dem Feld");
  ok(r.waehlerDarunter, "der Wähler steht darunter, nicht dazwischen");
  await ctx.close();
}

console.log("\nMikrofon-Sprache wandert zum benutzten Mikrofon");
{
  const { ctx, page } = await seite("markt.html", "de");
  const r = await page.evaluate(() => {
    const mics = [...document.querySelectorAll(".mic")];
    if (mics.length < 2) return { genug: false };
    const letzter = mics[mics.length - 1], feld = letzter.closest(".field");
    const vorher = document.getElementById("fpMicLang").closest(".mic-sprache").parentElement;
    letzter.click();
    const reihe = document.getElementById("fpMicLang").closest(".mic-sprache");
    return { genug: true, gewandert: reihe.parentElement !== vorher,
             beimZiel: reihe.parentElement === feld.parentElement,
             nurEiner: document.querySelectorAll("#fpMicLang").length };
  });
  ok(r.genug, "die Seite hat mehrere Mikrofone");
  ok(r.gewandert && r.beimZiel, "der Wähler folgt dem Mikrofon, das benutzt wird", JSON.stringify(r));
  // Es bleibt EINE Wahl fuer alle Mikrofone — niemand stellt dieselbe Sprache
  // achtmal ein. Der Waehler wandert, er vermehrt sich nicht.
  ok(r.nurEiner === 1, "es bleibt bei EINEM Wähler, er vermehrt sich nicht", String(r.nurEiner));
  await ctx.close();
}

console.log("\nsicherheit.html trägt ihre Übersetzung selbst");
{
  /* Diese Seite lädt kein assets/app.js (keine Kopfleiste, keine Themen, kein
   * Mikrofon — sie wird auch im Siegel als iframe eingebettet). Bis zum
   * 2026-09-14 hatte sie deshalb GAR KEINE Übersetzung: 43 Stellen standen im
   * Englisch-Modus auf Deutsch. */
  const lies = async (sp) => {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });
    await ctx.addInitScript((l) => { try { localStorage.setItem("fp_lang", l); } catch (_e) {} }, sp);
    const page = await ctx.newPage();
    await page.goto(`${base}/sicherheit.html`, { waitUntil: "load" });
    await page.waitForFunction(() => !!document.querySelector("h1"));
    const r = await page.evaluate(() => {
      /* Gemessen wird deutscher Text, den man SIEHT. Eigennamen (Mycel, Hyphe,
       * Spore, Apoptose …) tragen `translate="no"` und sind ausgenommen — ein
       * Wächter, der sie mitzählt, verlangte ihre Übersetzung. */
      const DE = /\b(und|oder|nicht|eine[nmrs]?|der|die|das|dein[e]?|wird|sich|auch|mit|für|über|ohne|damit|wenn|beim|zum|zur|vom|nach|noch|hier|kein[e]?|sind|haben|Knoten|Seite|Schlüssel)\b|[äöüß]/;
      const rest = [];
      document.querySelectorAll("body *").forEach((el) => {
        if (/^(SCRIPT|STYLE)$/.test(el.tagName)) return;
        if (el.getAttribute("translate") === "no") return;
        const eigen = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ").trim();
        if (eigen.length < 4 || !DE.test(eigen)) return;
        rest.push(el.tagName + ": " + eigen.replace(/\s+/g, " ").slice(0, 60));
      });
      return { lang: document.documentElement.lang, h1: document.querySelector("h1").textContent,
               haken: document.querySelectorAll("[data-i18n]").length, rest };
    });
    await ctx.close();
    return r;
  };
  const de = await lies("de"), en = await lies("en");
  ok(de.haken > 40, `die Seite hat Übersetzungs-Haken (${de.haken})`);
  ok(de.rest.length > 10, `auf Deutsch steht deutscher Text da (${de.rest.length} Stellen)`);
  ok(en.lang === "en", "im Englisch-Modus steht lang=en am Dokument", en.lang);
  ok(/How the mycelium works/.test(en.h1), "die Überschrift ist übersetzt", en.h1.slice(0, 60));
  // Der Befund, um den es geht — und die Gegenrichtung gleich mit: auf Deutsch
  // MUSS deutscher Text dastehen, sonst misst die Zeile darüber nichts.
  ok(en.rest.length === 0, `im Englisch-Modus steht kein deutscher Text mehr (${en.rest.length})`,
     en.rest.slice(0, 3).join(" | "));
  // Sie folgt derselben Wahl wie die übrigen Seiten — wer auf dem Marktplatz
  // Englisch gewählt hat, bekommt diese Erklärung auf Englisch.
  ok(en.h1 !== de.h1, "sie folgt der Wahl aus fp_lang, ohne eigene Einstellung");
}

console.log("\nFail-soft und Quellen");
{
  // Der Such-Korpus darf sich NICHT geaendert haben: aus `text` werden die
  // Vektoren gerechnet. `text_en` ist reine Anzeige.
  const src = readFileSync(resolve(wurzel, "assets/config/listings.js"), "utf8");
  const w = {}; new Function("window", src)(w);
  const L = w.FP_LISTINGS;
  ok(L.every((e) => typeof e.text === "string" && e.text.length > 20), "jeder Eintrag hat weiter seinen deutschen Such-Text");
  ok(L.filter((e) => e.text_en).length === L.length, `alle ${L.length} Einträge haben eine englische Fassung`,
     String(L.filter((e) => e.text_en).length));
  ok(L.every((e) => !e.text_en || e.text_en !== e.text), "keine englische Fassung ist nur eine Kopie der deutschen");

  // Das Studio schreibt listings.js ueber eine POSITIVLISTE. Was dort nicht
  // steht, wirft es beim naechsten Veroeffentlichen STILL weg — der Eintrag
  // saehe unveraendert aus und waere wieder deutsch.
  const studio = readFileSync(resolve(wurzel, "assets/studio-markt.js"), "utf8");
  const norm = studio.slice(studio.indexOf("function normEntry"), studio.indexOf("function serialize"));
  ok(/o\.text_en\s*=/.test(norm), "das Studio behält text_en (normEntry ist eine Positivliste)");

  // Derselbe deutsche Satz darf nicht zwei englische Fassungen haben — genau
  // das hatte Klaus gemeldet („zwei verschiedene“). Die Woerterbucher werden
  // vom BROWSER gelesen, nicht per Textsuche: ein Apostroph in einem Kommentar
  // („Klaus' Wort“) laesst jeden Textleser eine Zeichenkette beginnen und alles
  // dahinter verschlucken. Eine erste Fassung dieser Pruefung hat daraus
  // „markt.html: 0 Schluessel“ gemacht und nichts gemessen.
  const woerter = {};
  for (const f of ["index.html", "markt.html"]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${base}/${f}`, { waitUntil: "load" });
    woerter[f] = await page.evaluate(() => window.FP_PAGE_I18N || { de: {}, en: {} });
    await ctx.close();
  }
  // Beide Stellen sagen auf Deutsch „Apps finden und anbieten“ — die Kachel auf
  // der Startseite und die Ueberschrift des Marktplatzes. Auf Englisch sagten
  // sie „Find and offer apps“ und „Find apps and offer them“.
  const satzDe = "Apps finden und anbieten";
  const kachelDe = woerter["index.html"].de.a3_p || "";
  const titelDe = woerter["markt.html"].de.mk_title || "";
  ok(kachelDe.startsWith(satzDe) && titelDe.startsWith(satzDe),
     "beide Stellen sagen auf Deutsch dasselbe", `${kachelDe} | ${titelDe}`);
  const anfang = (t) => String(t || "").split(".")[0].trim();
  const kachelEn = anfang(woerter["index.html"].en.a3_p);
  const titelEn = anfang(woerter["markt.html"].en.mk_title);
  ok(kachelEn.length > 0 && kachelEn === titelEn,
     "…und auf Englisch auch — EINE Fassung, nicht zwei", `${kachelEn} | ${titelEn}`);
}

await browser.close();
srv.kill();
console.log(`\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

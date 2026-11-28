/* Probe: schlanke Marktplatz-Karten (Klaus 2026-11-27).
 *
 * Klaus: „Die App-Karten im Marktplatz sind zu groß. Bei rund 40 Apps dauert
 * das Scrollen ewig, am Handy und am Monitor." Gewünscht: Logo klein links
 * neben dem Namen, Text kurz (2 Zeilen), Messwerte in einer Reihe, der Rest
 * unter „mehr", Knöpfe unten bleiben, 3 Spalten am Monitor (nicht 4), 2 am
 * Tablet, 1 am Handy, „in 3 bis 4 Bildschirmen komplett durchgescrollt".
 *
 * Gemessen im echten Browser, an der echten Liste, nicht am Quelltext.
 *
 * ⚠ BENANNTE GRENZE: am Handy (eine Spalte) sind 3 bis 4 Bildschirme bei
 * rund 40 Karten nicht zu schaffen — das wären unter 100 px je Karte, weniger
 * als die Knopfreihe plus Name. Vorher 26 Bildschirme, jetzt rund 9. Der
 * Wächter dort ist ein NAGEL (höchstens 10), ausdrücklich als Nagel benannt.
 *
 * Aufruf: node tests/smoke_schlanke_karten.mjs */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
let gruen = 0, rot = 0, stumm = 0;
const ok = (b, t, extra = "") => {
  if (b) { gruen++; console.log(`  ✓ ${t}${extra ? " — " + extra : ""}`); }
  else { rot++; console.log(`  ✗ ${t}${extra ? " — " + extra : ""}`); }
};

const TYP = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".xml": "application/xml", ".png": "image/png",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };
const srv = createServer((q, a) => {
  let f = join(WURZEL, decodeURIComponent(q.url.split("?")[0]));
  try { if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html"); } catch {}
  if (!existsSync(f)) { a.writeHead(404); a.end("nope"); return; }
  a.writeHead(200, { "content-type": TYP[extname(f)] || "text/plain" });
  a.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, r));
const basis = `http://127.0.0.1:${srv.address().port}`;

let br = null;
try {
  const pw = await import(process.env.PW_CORE || "playwright-core");
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  br = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--no-sandbox"] });
} catch (e) {
  console.log("  ⊘ kein Browser — NICHT LAUFFÄHIG, nicht grün:", e.message);
  stumm = 1;
}

/* Fremde Adressen (Logos auf github.io) werden abgewiesen: das Bild hat feste
 * Maße, sein Fehlen ändert keine Höhe — und die Probe hängt nicht am Netz. */
async function seite(w, h, { js = true, bericht = null } = {}) {
/* reducedMotion: die Probe misst die GESTALT der Karte. Seit 2026-11-27
 * kippen Karten am Bildrand weg (assets/markt-blaettern.js); eine gekippte
 * Karte ist im Bild auf einen Strich gestaucht (gemessen 37 px statt 217),
 * und jede Messung mit getBoundingClientRect misst die Drehung mit. Bei
 * „weniger Bewegung" kippt nichts. Das Kippen selbst misst smoke_blaettern. */
  const ctx = await br.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: js, reducedMotion: "reduce" });
  const pg = await ctx.newPage();
  await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (bericht) await pg.route("**/assets/config/spore-stand.json*", (r) => r.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify(bericht) }));
  await pg.goto(`${basis}/markt.html`, { waitUntil: js ? "domcontentloaded" : "load" });
  if (js) {
    await pg.waitForSelector("#mkListings.gefuellt .listing", { timeout: 20000 });
    await pg.waitForSelector("#mkListings .mk-ms-zeile, #mkListings .mk-mess--leer", { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(400);
  }
  return { ctx, pg };
}

const LAGEN = [
  { name: "Handy", w: 412, h: 915, spalten: 1, bildschirme: 10, nagel: true },
  { name: "Tablet", w: 820, h: 1180, spalten: 2, bildschirme: 4 },
  { name: "Monitor", w: 1280, h: 800, spalten: 3, bildschirme: 4 },
  { name: "großer Monitor", w: 1920, h: 1080, spalten: 3, bildschirme: 4 },
];

if (br) {
  for (const L of LAGEN) {
    console.log(`\n${L.name} (${L.w}×${L.h})`);
    const { ctx, pg } = await seite(L.w, L.h);
    const m = await pg.evaluate(() => {
      const box = document.getElementById("mkListings");
      const k = [...box.querySelectorAll(".listing")];
      const r = (el) => el.getBoundingClientRect();
      const lh = (el) => parseFloat(getComputedStyle(el).lineHeight);
      const karten = k.map((e) => {
        const img = e.querySelector(".img"), h3 = e.querySelector("h3");
        const txt = e.querySelector(".body > p:not(.by):not(.mk-wache):not(.mk-naehe)");
        const pills = [...e.querySelectorAll(".mk-ms-zeile .mk-ms-w")];
        const zeile = e.querySelector(".mk-mehr-reihe");
        /* Seit 2026-11-28 steht „mehr“ unten neben „Melden“ (Klaus: bei
         * großer Schrift lag es über der vierten Zahl). Gemessen wird, dass
         * es NICHT in der Zeile der Messwerte steht und rechts neben dem
         * Melde-Knopf in derselben Reihe. */
        const mz = e.querySelector(".mk-mehr-zu"), mr = e.querySelector(".mk-report");
        const mzr = mz && r(mz), mrr = mr && r(mr);
        const knopf = e.querySelector(".mk-ms-btn");
        const panel = e.querySelector(".mk-mehr-innen");
        return {
          img: img ? { w: Math.round(r(img).width), h: Math.round(r(img).height), rechts: r(img).right, oben: r(img).top, unten: r(img).bottom } : null,
          h3: h3 ? { links: r(h3).left, mitte: (r(h3).top + r(h3).bottom) / 2 } : null,
          textZeilen: txt ? Math.round(r(txt).height / lh(txt)) : -1,
          textVoll: txt ? txt.textContent.length : 0,
          pillOben: [...new Set(pills.map((p) => Math.round(r(p).top)))].length,
          pills: pills.length,
          zeileKnapp: zeile ? zeile.scrollWidth > zeile.clientWidth + 1 : false,
          knopfDa: !!knopf,
          /* `checkVisibility()`, nicht die Höhe: der Inhalt eines
           * zugeklappten <details> behält in Chrome seine Maße. */
          knopfSichtbar: knopf ? knopf.checkVisibility() : false,
          offen: panel ? !panel.hidden : false,
          mehrInZeile: !!(zeile && mz && zeile.contains(mz)),
          mehrBeiMelden: mz && mr ? (Math.abs((mzr.top + mzr.bottom) / 2 - (mrr.top + mrr.bottom) / 2) < 30 && mzr.right <= mrr.left + 1) : null,
          /* Überdeckt wird mit dem TEXT, nicht mit dem Kasten: eine Pille, die
           * unter ihre Zahl schrumpft, behält einen sauberen Kasten und lässt
           * die Zahl hinausragen (die Gegenprobe war damit zuerst BLIND). */
          pillUeberlapp: pills.some((p, i) => p.scrollWidth > p.clientWidth + 1 || (i > 0 && r(p).left < r(pills[i - 1]).right - 0.5 && Math.round(r(p).top) === Math.round(r(pills[i - 1]).top))),
        };
      });
      return {
        n: k.length,
        spalten: new Set(k.map((e) => Math.round(r(e).left))).size,
        liste: r(box).height,
        karten,
        voll: (window.FP_LISTINGS || []).map((x) => String(x.text || "").length),
      };
    });

    ok(m.n >= 30, `${L.w} px: Selbst-Riegel — die Liste ist lang genug, dass „Bildschirme" etwas misst`, `${m.n} Karten`);
    ok(m.spalten === L.spalten, `${L.w} px: ${L.spalten} Spalte(n) nebeneinander`, `${m.spalten}`);
    const bs = m.liste / L.h;
    ok(bs <= L.bildschirme, `${L.w} px: die ganze Liste ist höchstens ${L.bildschirme} Bildschirme lang${L.nagel ? " (NAGEL, siehe Kopf)" : ""}`, bs.toFixed(1));

    const mitBild = m.karten.filter((x) => x.img && x.h3);
    ok(mitBild.length === m.n && mitBild.every((x) => x.img.w <= 64 && x.img.h <= 64 && Math.abs(x.img.w - x.img.h) <= 1),
      `${L.w} px: das Logo ist ein kleines Quadrat (höchstens 64 px)`, mitBild.length ? `${mitBild[0].img.w}×${mitBild[0].img.h}` : "keins");
    // Neben = rechts davon UND auf derselben Höhe (die Mitte des Namens liegt
    // im Band des Logos). Ein Name auf zwei Zeilen darf darüber hinausragen.
    ok(mitBild.every((x) => x.img.rechts <= x.h3.links && x.h3.mitte > x.img.oben && x.h3.mitte < x.img.unten + 12),
      `${L.w} px: das Logo steht LINKS NEBEN dem Namen, nicht darüber`);
    ok(m.karten.every((x) => x.textZeilen === 2),
      `${L.w} px: der Beschreibungstext steht auf genau 2 Zeilen`, [...new Set(m.karten.map((x) => x.textZeilen))].join(","));
    ok(m.karten.every((x) => x.pills === 0 || x.pillOben === 1),
      `${L.w} px: die vier Messwerte stehen in EINER Reihe`);
    ok(m.karten.every((x) => !x.zeileKnapp),
      `${L.w} px: … und die Reihe ist nicht abgeschnitten`);
    ok(m.karten.every((x) => !x.mehrInZeile), `${L.w} px: „mehr“ steht NICHT in der Zeile der Messwerte`);
    ok(m.karten.filter((x) => x.mehrBeiMelden !== null).length > 0 && m.karten.every((x) => x.mehrBeiMelden !== false),
      `${L.w} px: „mehr“ steht unten links neben „Melden“, auf derselben Höhe`);
    ok(m.karten.every((x) => !x.pillUeberlapp), `${L.w} px: keine Messwert-Pille liegt über ihrer Nachbarin`);
    const mitKnopf = m.karten.filter((x) => x.knopfDa);
    ok(mitKnopf.length > 0 && mitKnopf.every((x) => !x.offen && !x.knopfSichtbar),
      `${L.w} px: „Bewertung nachlesen" liegt zugeklappt unter „mehr"`, `${mitKnopf.length} Karten mit Knopf`);
    await ctx.close();
  }

  /* Klaus' Handy (2026-11-28, mit Bild) zeigt die Schrift deutlich größer
   * als der Testbrowser: dort lag „mehr“ über der vierten Zahl. Gestellt mit
   * 140 % Grundschrift bei 360 px: erst so eng reicht die Breite für die vier
   * Zahlen nicht mehr (bei 412 px und 125 % passten sie ohnehin, und die
   * Gegenprobe war dort BLIND). */
  {
    console.log("\nHandy mit großer Schrift (360 px, 140 %)");
    const { ctx, pg } = await seite(360, 780);
    await pg.addStyleTag({ content: "html{font-size:140% !important}" });
    await pg.waitForTimeout(300);
    const g = await pg.evaluate(() => [...document.querySelectorAll("#mkListings .listing")].map((e) => {
      const r = (el) => el.getBoundingClientRect();
      const pills = [...e.querySelectorAll(".mk-ms-zeile .mk-ms-w")];
      const mz = e.querySelector(".mk-mehr-zu"), mr = e.querySelector(".mk-report"), z = e.querySelector(".mk-mehr-reihe");
      return {
        ueber: pills.some((p, i) => p.scrollWidth > p.clientWidth + 1 || (i > 0 && r(p).left < r(pills[i - 1]).right - 0.5 && Math.round(r(p).top) === Math.round(r(pills[i - 1]).top))),
        knapp: z ? z.scrollWidth > z.clientWidth + 1 : false,
        paar: mz && mr ? Math.abs((r(mz).top + r(mz).bottom) / 2 - (r(mr).top + r(mr).bottom) / 2) < 30 && r(mz).right <= r(mr).left + 1 : null,
      };
    }));
    ok(g.every((x) => !x.ueber && !x.knapp), "große Schrift: keine Pille liegt über einer anderen, nichts ist abgeschnitten");
    ok(g.some((x) => x.paar !== null) && g.every((x) => x.paar !== false), "große Schrift: „mehr“ und „Melden“ stehen zusammen in einer Reihe");
    await ctx.close();
  }

  /* Der volle Text bleibt im HTML — er ist der Such-Korpus, gekürzt wird nur,
   * was man sieht (Klaus 2026-09-22: `text` bleibt unberührt). */
  {
    console.log("\nVoller Text, „mehr“ aufklappen, Warnungen");
    const { ctx, pg } = await seite(1280, 800);
    const t = await pg.evaluate(() => {
      const k = document.querySelector(".listing");
      const p = k.querySelector(".body > p:not(.by)");
      return { sicht: p.textContent, html: p.scrollHeight > p.clientHeight + 2 };
    });
    ok(t.sicht.length > 120 && t.html, "der volle Text steht im HTML, sichtbar sind nur zwei Zeilen davon", `${t.sicht.length} Zeichen`);

    await pg.click(".listing:has(.mk-ms-btn) .mk-mehr-zu");
    const auf = await pg.evaluate(() => {
      const k = document.querySelector(".listing:has(.mk-ms-btn)");
      const b = k.querySelector(".mk-ms-btn").getBoundingClientRect();
      const s = k.querySelector(".mk-ms-sum");
      return { knopf: b.height, satz: s ? s.getBoundingClientRect().height : 0 };
    });
    ok(auf.knopf >= 30 && auf.satz > 0, "ein Tipp auf „mehr“ zeigt Satz und „Bewertung nachlesen“", `Knopf ${Math.round(auf.knopf)} px`);
    await pg.click(".listing:has(.mk-ms-btn) .mk-ms-btn");
    ok(await pg.waitForSelector("#mkMessOv[open]", { timeout: 5000 }).then(() => true, () => false),
      "… und der Knopf öffnet das Bewertungs-Fenster wie vorher");
    await ctx.close();
  }

  /* ⚠ GELB UND ROT DES WÄCHTERS BLEIBEN OFFEN. Eine Warnung, die man erst
   * aufklappen muss, ist keine. Gestellte Lage: ein Eintrag gelb, einer rot. */
  {
    const messung = { stand: "gemessen", leistung: 94, bedienbarkeit: 88, gute_praxis: 100, auffindbarkeit: 92, gemessen: "2026-11-27" };
    const { ctx, pg } = await seite(1280, 800, { bericht: { eintraege: {
      "markt-rezeptbuch": { lage: "gleich", wache: { ampel: "gelb", grund: "geaendert", seit: "2026-11-27" }, messung },
      "markt-mixarium": { lage: "gleich", wache: { ampel: "rot", grund: "nicht_erreichbar", seit: "2026-11-27" }, messung },
    } } });
    const w = await pg.evaluate(() => [...document.querySelectorAll(".listing .mk-wache.is-gelb, .listing .mk-wache.is-rot")]
      .map((e) => ({ inMehr: !!e.closest("details"), h: e.getBoundingClientRect().height })));
    ok(w.length === 2, "Selbst-Riegel: die gestellte Lage trägt eine gelbe und eine rote Warnung", `${w.length}`);
    ok(w.length === 2 && w.every((x) => !x.inMehr && x.h > 0), "gelbe und rote Warnungen stehen OFFEN an der Karte, nicht unter „mehr“");
    await ctx.close();
  }

  /* Gebaute Seite (ohne Skript) und gezeichnete Seite (mit Skript) sind
   * gleich hoch — sonst spränge die Liste, sobald das Skript neu zeichnet.
   * Die leere Zeile `.mk-mehr-reihe` in der gebauten Fassung hält die Zeile frei,
   * in der danach die Messwerte stehen. */
  {
    console.log("\nOhne und mit Skript gleich hoch");
    for (const w of [412, 1280]) {
      const a = await seite(w, 900, { js: false });
      const ohne = await a.pg.evaluate(() => [...document.querySelectorAll("#mkListings .listing")].slice(0, 6).map((e) => Math.round(e.getBoundingClientRect().height)));
      await a.ctx.close();
      const b = await seite(w, 900);
      const mit = await b.pg.evaluate(() => [...document.querySelectorAll("#mkListings .listing")].slice(0, 6).map((e) => Math.round(e.getBoundingClientRect().height)));
      await b.ctx.close();
      ok(ohne.length === 6 && ohne.every((h, i) => Math.abs(h - mit[i]) <= 2),
        `${w} px: die ersten Karten sind ohne und mit Skript gleich hoch`, `${ohne.join("/")} ⟷ ${mit.join("/")}`);
    }
  }
  await br.close();
}
srv.close();
console.log(`\n${gruen} grün · ${rot} rot${stumm ? " · NICHT LAUFFÄHIG" : ""}`);
process.exit(rot || stumm ? 1 : 0);

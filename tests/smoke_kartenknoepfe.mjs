/* ── DIE KNÖPFE EINER MARKTPLATZ-KARTE SIND EINE FAMILIE (Klaus 2026-09-22) ──
 *
 *   node tests/smoke_kartenknoepfe.mjs
 *
 * Klaus mit Bild: „Die Button in Family Project Einzelheiten und zur Seite so
 * fett sein. Bei Einzelheiten steht der Pfeil unten unter dem Wort und bei
 * zur [Seite] links. Macht bitte einheitlich die Höhe. Maximal so hoch wie
 * Bewertung nachlesen." Und danach: „Einzelheiten steht auch nicht in der
 * Mitte vom Button. Vielleicht musst du auch den Pfeil gar nicht mit
 * reinmachen."
 *
 * GEMESSEN VOR DER REPARATUR, über fünf Breiten:
 *
 *      Breite   „Bewertung nachlesen"   „Einzelheiten →"   „→ Zur Seite"
 *      380 px         44 px, 1 Zeile      65 px, 2 Zeilen   60 px, 2 Zeilen
 *      412 px         44 px               65 px             60 px
 *      900 px         44 px               65 px             60 px
 *     1280 px         44 px               65 px             60 px
 *      560 px         44 px               46 px, 1 Zeile    44 px, 1 Zeile
 *
 * ⚠ VIER VON FÜNF BREITEN, UND DIE FÜNFTE IST DER GRUND FÜR DIESE DATEI.
 * Bei 560 px steht die Karte einspaltig und breit — dort war schon vorher
 * alles einzeilig. Ein Wächter, der nur EINE Breite misst, hätte den Befund
 * nie gemacht; genau dieselbe Falle hat in PWA Toolpoint einen Wächter bei
 * 1280 px blind gelassen (2026-09-21). Deshalb steht unten ein SELBST-RIEGEL:
 * mindestens eine gemessene Breite muss eine wirklich schmale Karte ergeben,
 * sonst hat der Abschnitt nichts gemessen.
 *
 * ⚠ UND GEMESSEN WIRD, WAS MAN SIEHT — nicht, was im Stylesheet steht.
 * Eine Textsuche nach `white-space:nowrap` wäre auch dann grün, wenn eine
 * spätere Regel sie überstimmt. */
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
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });
} catch (e) {
  console.log("  ⊘ kein Browser — NICHT LAUFFÄHIG, nicht grün:", e.message);
  stumm = 1;
}

/* Die Breiten sind gewählt, nicht geraten: 380/412 sind Handy hoch, 900 und
 * 1280 ergeben das mehrspaltige Raster mit den schmalsten Karten, 1600 die
 * breiteste Lage. */
const BREITEN = [380, 412, 900, 1280, 1600];
const schmalste = [];

if (br) {
  for (const w of BREITEN) {
    const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
    const pg = await ctx.newPage();
    await pg.goto(`${basis}/markt.html`, { waitUntil: "domcontentloaded" });
    await pg.waitForSelector(".listing .listing-foot .btn", { timeout: 20000 });
    /* Die Karte, die BEIDES trägt — Referenz-Knopf und Fußzeile. Sonst
     * vergleicht man zwei verschiedene Karten, und das misst nichts. */
    const m = await pg.evaluate(() => {
      const k = [...document.querySelectorAll(".listing")]
        .find((e) => e.querySelector(".mk-ms-btn") && e.querySelector(".listing-foot .btn"));
      if (!k) return null;
      const rund = (x) => Math.round(x);
      const zeilen = (el) => { const r = document.createRange(); r.selectNodeContents(el);
        return r.getClientRects().length; };
      const fass = (el) => { const r = el.getBoundingClientRect(), c = getComputedStyle(el);
        return { t: el.textContent.trim().replace(/\s+/g, " "),
                 h: rund(r.height), w: rund(r.width),
                 rechts: rund(r.right), oben: rund(r.top), mitte: c.justifyContent,
                 umbruch: c.whiteSpace }; };
      const body = k.querySelector(".body") || k;
      const ref = k.querySelector(".mk-ms-btn");
      const text = [...k.querySelectorAll(".listing-foot .btn:not(.mk-report)")];
      const melde = k.querySelector(".listing-foot .mk-report");
      /* ⚠ ABGESCHNITTEN IST NICHT DASSELBE WIE ÜBERSTEHEND, und das ist der
       * Fund der Gegenprobe (2026-09-22). `.btn` trägt `overflow:hidden` —
       * ein Flex-Kind mit `overflow != visible` bekommt `min-width:auto` = 0
       * und lässt sich damit unter seine Textbreite schrumpfen. Ohne
       * `flex-wrap` ragt der Knopf also NICHT aus der Karte, sein Text wird
       * still abgeschnitten. Das ist die schlimmere Sorte: man sieht es nicht.
       * Gemessen wird deshalb BEIDES. */
      const knapp = (el) => el.scrollWidth > el.clientWidth + 1;
      /* ⚠ UND `nowrap` IST AM HEUTIGEN BESTAND NICHT MESSBAR. „Einzelheiten"
       * passt mit dem kleinen Polster in jede Karte — nimmt man den Riegel
       * heraus, ändert sich nichts, und eine Probe könnte ihn von seinem
       * Fehlen nicht unterscheiden. Gemessen wird er deshalb an einer
       * GESTELLTEN Lage: ein langer Text muss einzeilig bleiben. Der
       * Knopftext wird danach zurückgesetzt. */
      const probe = text[0];
      const vorher = probe.textContent;
      probe.textContent = "Einzelheiten und Messverlauf ansehen";
      const langZeilen = zeilen(probe);
      probe.textContent = vorher;
      return {
        karte: rund(k.getBoundingClientRect().width),
        innen: rund(body.getBoundingClientRect().right),
        ref: { ...fass(ref), z: zeilen(ref) },
        text: text.map((el) => ({ ...fass(el), z: zeilen(el), knapp: knapp(el) })),
        melde: melde ? fass(melde) : null,
        langZeilen,
      };
    });
    ok(!!m, `${w} px: es gibt eine Karte mit Referenz-Knopf UND Fußzeile`);
    if (!m) { await ctx.close(); continue; }
    schmalste.push(m.karte);

    /* 1 · EINHEITLICHE HÖHE — Referenz und die beiden Textknöpfe. */
    const hoehen = [m.ref.h, ...m.text.map((x) => x.h)];
    ok(new Set(hoehen).size === 1,
      `${w} px: Referenz und Textknöpfe sind gleich hoch`, hoehen.join(" · ") + " px");

    /* 2 · „Maximal so hoch wie Bewertung nachlesen" — Klaus' eigene Grenze. */
    ok(hoehen.every((h) => h <= m.ref.h),
      `${w} px: keiner ist höher als „${m.ref.t}"`, `Referenz ${m.ref.h} px`);

    /* 2a · ⚠ UND EINE ABSOLUTE OBERGRENZE, ALS NAGEL BENANNT.
     *      Punkt 2 allein kann nichts fangen: seit die drei Knöpfe in EINER
     *      Regel stehen, wachsen sie gemeinsam — mit dem alten Polster wären
     *      alle drei 43 px, und „gleich hoch wie die Referenz" bliebe wahr.
     *      Genau das hat die Gegenprobe gemeldet (2026-09-22): der Fall „das
     *      alte Polster kommt zurück" war strukturell blind.
     *      DIE ZAHL IST GENAGELT, NICHT GEMESSEN, und das steht hier: 37 px
     *      ist der heutige Stand, 43 px wäre das alte Polster, 44 px die
     *      Referenz von vor der Reparatur. 40 lässt Luft für eine geänderte
     *      Schrift und fängt die Rückkehr zum alten Polster. Wer sie dreht,
     *      ändert eine Zeile, und das steht dann im Verlauf. */
    ok(hoehen.every((h) => h <= 40),
      `${w} px: kein Textknopf ist wieder „fett" (Nagel: höchstens 40 px)`,
      hoehen.join(" · ") + " px");

    /* 2b · ⚠ DER MELDE-KNOPF IST DIE BENANNTE AUSNAHME, UND SIE WIRD GEMESSEN.
     *      Er darf nicht auf 37 px, weil `smoke_markt_melden` seit jeher eine
     *      Trefffläche von 44×44 verlangt — ein Knopf, den ein Finger nicht
     *      sicher trifft, ist kein kleinerer Knopf, sondern ein schlechterer.
     *      Mein erster Anlauf setzte 52×37 und wurde dort prompt rot.
     *      Kleiner geworden ist er in der BREITE, und genau das steht hier:
     *      nicht höher als die Trefffläche verlangt, und nicht breiter als 56.
     *      ⚠ Eine Ausnahme, die nur behauptet wird, ist der Ort, an dem der
     *      nächste Fund sitzt — deshalb beide Richtungen. */
    if (m.melde) {
      ok(m.melde.h >= 44, `${w} px: der Melde-Knopf hält die Trefffläche`, `${m.melde.h} px hoch`);
      ok(m.melde.h <= 44, `${w} px: … und ist nicht höher als sie verlangt`, `${m.melde.h} px`);
      ok(m.melde.w <= 56, `${w} px: … und nicht mehr so breit wie früher (68 px)`, `${m.melde.w} px`);
    }

    /* 3 · KEIN UMBRUCH. Das ist der eigentliche Befund: der Pfeil stand unter
     *     dem Wort, weil der Text umbrach. */
    for (const b of m.text)
      ok(b.z === 1, `${w} px: „${b.t}" steht in EINER Zeile`, `${b.z} Zeile(n)`);

    /* 4 · MITTIG — Klaus: „steht auch nicht in der Mitte vom Button". */
    for (const b of m.text)
      ok(b.mitte === "center", `${w} px: „${b.t}" steht mittig`, b.mitte);

    /* 5 · NICHTS RAGT AUS DER KARTE. */
    const raus = Math.max(...[...m.text, ...(m.melde ? [m.melde] : [])].map((x) => x.rechts)) - m.innen;
    ok(raus <= 0, `${w} px: kein Knopf ragt aus der Karte`, `${raus} px über dem Rand`);

    /* 6 · UND KEINER IST ABGESCHNITTEN. Ohne diese Frage wäre Punkt 5 eine
     *     Beruhigung: `overflow:hidden` hält den Knopf im Rahmen, indem es
     *     seinen Text wegschneidet. Gefunden hat das die Gegenprobe, nicht
     *     das Nachdenken. */
    for (const b of m.text)
      ok(!b.knapp, `${w} px: „${b.t}" ist nicht abgeschnitten`, b.knapp ? "Text breiter als der Knopf" : "");

    /* 7 · DER RIEGEL SELBST, an einer gestellten Lage. */
    ok(m.langZeilen === 1,
      `${w} px: auch ein langer Knopftext bleibt einzeilig (nowrap wirkt wirklich)`,
      `${m.langZeilen} Zeile(n)`);

    await ctx.close();
  }

  /* ⚠ SELBST-RIEGEL: ohne eine wirklich schmale Karte misst alles darüber
   * nichts — bei einer breiten Karte war auch der alte Zustand einzeilig. */
  ok(schmalste.length > 0 && Math.min(...schmalste) <= 340,
    "mindestens eine gemessene Breite ergibt eine schmale Karte — sonst hat der Lauf nichts gemessen",
    `schmalste ${schmalste.length ? Math.min(...schmalste) : "—"} px`);

  await br.close();
}

/* ── Der Pfeil ist RAUS, an BEIDEN Zeichnern ───────────────────────────────
 * Klaus: „Vielleicht musst du auch den Pfeil gar nicht mit reinmachen."
 * Gemessen wird hier der Quelltext, weil es zwei Zeichner gibt und der
 * zweite erst nach einer Suche sichtbar wird — die Lage im Browser deckt
 * ihn nicht ab. */
const lies = (p) => readFileSync(join(WURZEL, p), "utf8");
const statisch = lies("markt.html");
ok(!/Einzelheiten\s*→/.test(statisch) && !/→\s*Zur Seite/.test(statisch),
  "markt.html trägt keinen Pfeil mehr in den Karten-Knöpfen");
ok(/>Einzelheiten<\/a>/.test(statisch), '… und der Knopf heisst weiterhin Einzelheiten');
const bauer = lies("tools/statische-listen.mjs");
ok(!/Einzelheiten\s*→/.test(bauer) && !/→\s*Zur Seite/.test(bauer),
  "der Bau-Zeichner setzt keinen Pfeil mehr");
ok(/mk_details: "Einzelheiten"/.test(statisch) && /mk_details: "Details"/.test(statisch),
  "der Laufzeit-Zeichner ebenso — in beiden Sprachen");

/* ── Eine Regel, nicht drei ────────────────────────────────────────────────
 * Die drei Knöpfe holen Schrift, Polster und Rundung aus EINEM Block. Stünde
 * es an drei Stellen, liefen sie beim nächsten Handgriff auseinander — und
 * genau so ist dieser Befund entstanden. */
const css = lies("assets/style.css");
const block = /\.listing \.ext,\s*\n\.listing \.mk-ms-btn,\s*\n\.listing \.listing-foot \.btn:not\(\.mk-report\)\{([\s\S]*?)\}/.exec(css);
ok(!!block, "Schrift, Polster und Rundung der drei Knöpfe stehen in EINER Regel");
ok(!!block && /white-space:nowrap/.test(block[1]), "… und sie trägt white-space:nowrap");
ok(!!block && /justify-content:center/.test(block[1]), "… und justify-content:center");

console.log(`\n${gruen} grün · ${rot} ROT${stumm ? " · " + stumm + " nicht lauffähig" : ""}`);
srv.close();
process.exitCode = rot ? 1 : 0;

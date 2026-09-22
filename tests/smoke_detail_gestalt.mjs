/* ── DIE GESTALT DER DETAILSEITE (Klaus 2026-09-22) ─────────────────────────
 *
 *   node tests/smoke_detail_gestalt.mjs
 *
 * Klaus nach dem Sichttest: „Der Link dahin führt zum Container, wo die
 * Schrift linksbündig im Container auf Null ist. Das ist viel zu nah am Rand."
 * Und: „die Messung, das sind die Werte nicht farbig gestaltet, so wie bei der
 * ersten Seite. Also unter 85 gelb oder wie auch immer und die anderen grün."
 *
 * GEMESSEN VOR DER REPARATUR: die Überschrift stand **1 px** vom Kastenrand,
 * und alle vier Messwerte trugen dieselbe graue Farbe — gut und schwach sahen
 * gleich aus.
 *
 * ⚠ DIE URSACHE STAND NICHT IN DER VORLAGE, sondern in `assets/style.css`:
 * `section{padding:32px 0}` — oben und unten 32, seitlich NULL. Auf der
 * Startseite ist das richtig (die Abschnitte stecken in `.wrap`), in einem
 * `.glass`-Kasten nicht. Ein Wächter auf die Vorlage allein hätte den Befund
 * nie gemacht; gemessen wird deshalb im Browser, was ein Leser SIEHT. */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync, mkdtempSync, cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { messStufe } from "../tools/statische-listen.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
let gruen = 0, rot = 0, stumm = 0;
const ok = (b, t, extra = "") => {
  if (b) { gruen++; console.log(`  ✓ ${t}${extra ? " — " + extra : ""}`); }
  else { rot++; console.log(`  ✗ ${t}${extra ? " — " + extra : ""}`); }
};
const lies = (p) => readFileSync(join(WURZEL, p), "utf8");

/* ── 1 · Die benannte Doppelung: Node und Browser rechnen gleich ───────────
 * `messStufe()` in `tools/statische-listen.mjs` und `msStufe()` in
 * `markt.html` sind dieselbe Rechnung an zwei Stellen. Den Browser-Weg auf
 * eine geteilte Datei umzubauen kostete einen weiteren Netz-Abruf auf genau
 * der Seite, an der die Ladezeit gemessen wird. Bewacht wird deshalb die
 * ZUSICHERUNG statt der Zeile. */
const markt = lies("markt.html");
const m = /function msStufe\(n\)\s*\{\s*return n >= (\d+) \? "gut" : \(n >= (\d+) \? "mittel" : "schwach"\);\s*\}/.exec(markt);
ok(!!m, "markt.html trägt msStufe() in der erwarteten Form");
if (m) {
  const [gutAb, mittelAb] = [Number(m[1]), Number(m[2])];
  const gleich = [0, 49, 50, 89, 90, 100].every((n) => {
    const browser = n >= gutAb ? "gut" : (n >= mittelAb ? "mittel" : "schwach");
    return messStufe(n) === browser;
  });
  ok(gleich, "… und rechnet Stufe für Stufe dasselbe wie das Bau-Werkzeug",
    `Schwellen ${gutAb} / ${mittelAb}`);
}
/* ⚠ „NICHTS" IST KEINE MESSUNG. `Number(null)` ist 0, nicht NaN — ohne den
 * ausdrücklichen Riegel bekäme eine FEHLENDE Zahl die Stufe „schwach", also
 * eine rote Pille für eine Messung, die es gar nicht gibt. Gefunden beim
 * ersten Aufruf, nicht beim Schreiben. */
ok([null, undefined, "", false].every((x) => messStufe(x) === ""),
  'eine fehlende Zahl bekommt GAR KEINE Stufe, nicht schwach');
ok(messStufe(0) === "schwach", "… und eine echte Null sehr wohl");

/* ── 2 · Die Vorlage trägt das Polster, nicht die einzelne Seite ───────────*/
const vorlage = lies("tools/vorlagen/detail.html");
ok(/main\.wrap > section\.glass\s*\{[^}]*padding:\s*\d+px\s+\d+px/.test(vorlage),
  "die Vorlage polstert den Kasten auch SEITLICH");
ok(/\.mess-tabelle \.st-gut\s*\{\s*color:var\(--ms-gut\)/.test(vorlage),
  "die Verlaufs-Farben kommen aus den Variablen, nicht abgeschrieben");
const css = lies("assets/style.css");
ok(/--ms-gut:\s*#[0-9a-f]{6}/i.test(css) && /--ms-mittel:/.test(css) && /--ms-schwach:/.test(css),
  "die drei Mess-Farben stehen EINMAL da, als Variablen");
ok(/\.mk-ms-w\.is-gut\{color:var\(--ms-gut\)/.test(css),
  "… und die Karten-Pille nimmt dieselbe Variable");

/* ── 2b · Der kurze Text und die EINE hervorgehobene Funktion ──────────────
 *
 * Klaus 2026-09-22: „Der Text soll sehr kurz sein. Nur wenige Sätze. Er soll
 * einfach nur neugierig machen … auf die Landingpage zu klicken." ·
 * „vielleicht stichwortartig machen." · „Eine besondere Funktion soll
 * hervorgehoben werden."
 *
 * ⚠ DIE WICHTIGSTE ZUSICHERUNG IST, WAS NICHT PASSIERT: `text` bleibt
 * unberührt. Er ist der SUCH-KORPUS — aus ihm werden die Bedeutungs-Vektoren
 * gerechnet, und er trägt die Stichwörter, an denen der Marktplatz gefunden
 * wird. Wer ihn durch Werbetext ersetzt, ändert unbemerkt, WAS gefunden wird.
 *
 * ⚠ UND EIN SELBST-RIEGEL FÜR BEIDE LAGEN. Ohne einen Eintrag MIT und einen
 * OHNE die neuen Felder misst weder der Stichpunkt-Wächter noch der Rückfall
 * etwas. Heute trägt genau einer sie; morgen alle — dann meldet der Riegel,
 * dass der Rückfall nicht mehr messbar ist, statt still grün zu bleiben. */
{
  const roh = lies("assets/config/listings.js");
  const mit = [], ohne = [];
  for (const d of readdirSync(join(WURZEL, "apps"), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const h = lies(`apps/${d.name}/index.html`);
    const b = h.split("Was die App macht")[1] || "";
    const abschnitt = b.split("</section>")[0];
    (/<ul class="det-punkte">/.test(abschnitt) ? mit : ohne).push(d.name);
  }
  ok(mit.length > 0, "mindestens eine Seite zeigt Stichpunkte", mit.join(", ") || "keine");

  /* ⚠ DER RÜCKFALL WIRD GESTELLT, NICHT VORGEFUNDEN — seit dem 2026-09-22.
   *
   * Hier stand: „… und mindestens eine faellt auf den alten Text zurueck".
   * Das war richtig, solange erst EIN Eintrag die neuen Felder trug. Klaus hat
   * den Ton freigegeben, seitdem tragen ihn ALLE — und der Riegel meldete
   * folgerichtig „0 Stueck". Er hat damit genau das getan, wofür er gebaut
   * wurde: gesagt, dass der Rückfall am Bestand nicht mehr messbar ist, statt
   * still grün zu bleiben.
   *
   * Die Abhilfe ist nicht, ihn zu schwächen, sondern das Messen zu verlegen:
   * das ECHTE Werkzeug läuft in einer Wegwerf-Kopie über einen Eintrag, dem
   * `vorstellung` und `besonders` genommen wurden. Damit ist der Rückfall
   * unabhängig davon messbar, wie viele Einträge die Felder gerade tragen —
   * und er bleibt es, wenn morgen ein fremder Eintrag ohne sie dazukommt.
   * Tafel-Evolutions-Klausel: ersetzt, nicht stillschweigend getauscht. */
  {
    const weg = mkdtempSync(join(tmpdir(), "fp-rueckfall-"));
    try {
      for (const d of ["assets", "tools", "forschung"]) {
        cpSync(join(WURZEL, d), join(weg, d), { recursive: true });
      }
      /* ⚠ `sw.js` GEHÖRT DAZU — das Werkzeug liest daraus die Cache-Fassung
       * für die `?v=`-Angaben. Ohne sie stirbt es mit ENOENT, und die rote
       * Zeile trüge den Namen eines Lesefehlers statt den einer Zusicherung. */
      cpSync(join(WURZEL, "sw.js"), join(weg, "sw.js"));
      mkdirSync(join(weg, "apps"), { recursive: true });
      /* EIN Eintrag verliert die neuen Felder. Genommen wird der erste, der
       * sie trägt — nicht ein fest hingeschriebener Name, der morgen falsch
       * ist. */
      const ziel = mit[0];
      const kennung = ziel;
      let l = readFileSync(join(weg, "assets/config/listings.js"), "utf8");
      const block = new RegExp(
        '("anchorId":\\s*"' + kennung + '".*?)\\n\\s*"vorstellung":[\\s\\S]*?\\n(\\s*)"by":', "s");
      const vorher = l;
      l = l.replace(block, '$1\n$2"by":');
      writeFileSync(join(weg, "assets/config/listings.js"), l);
      ok(l !== vorher, `die gestellte Lage ist wirklich hergestellt (${kennung} ohne vorstellung)`);

      execFileSync(process.execPath, [join(weg, "tools/detailseiten.mjs")],
        { cwd: weg, stdio: "pipe" });
      const h = readFileSync(join(weg, "apps", kennung, "index.html"), "utf8");
      const abschnitt = (h.split("Was die App macht")[1] || "").split("</section>")[0];
      ok(!/<ul class="det-punkte">/.test(abschnitt),
        "ohne vorstellung stehen KEINE Stichpunkte da");
      const roher = /<p>([^<]{40,})<\/p>/.exec(abschnitt);
      ok(!!roher, "… sondern der alte Text als Absatz",
        roher ? `${roher[1].length} Zeichen` : "keiner");
    } finally {
      rmSync(weg, { recursive: true, force: true });
    }
  }

  /* Die hervorgehobene Funktion steht da, wo sie gesetzt ist — und nur dort. */
  /* ⚠ NUR IM RUMPF ZAEHLEN. `det-besonders` steht auch im <style>-Block der
   * Vorlage — mein erster Anlauf zaehlte ihn mit und meldete „zwei
   * Hervorhebungen" bzw. „eine leere Hervorhebung", wo der Code tadellos war.
   * Ein Waechter, der im Stil- oder Erklaer-Block fuendig wird, misst nichts;
   * die Falle steht netzweit mehrfach aufgeschrieben. */
  const rumpf = (h) => h.split("</style>").pop();
  if (mit.length) {
    const h = rumpf(lies(`apps/${mit[0]}/index.html`));
    ok(/<p class="det-besonders"><b>Besonders:<\/b>/.test(h),
      `die hervorgehobene Funktion steht auf der Seite (${mit[0]})`);
    ok((h.match(/det-besonders/g) || []).length === 1,
      "… und zwar genau EINMAL — zwei Hervorhebungen heben nichts mehr hervor",
      `${(h.match(/det-besonders/g) || []).length}\u00d7`);
  }
  if (ohne.length) {
    const h = rumpf(lies(`apps/${ohne[0]}/index.html`));
    ok(!/det-besonders/.test(h),
      `ohne das Feld erscheint keine leere Hervorhebung (${ohne[0]})`);
  }

  /* ⚠ `text` UNBERUEHRT — die Karte im Marktplatz zeigt ihn weiter. */
  const markthtml = lies("markt.html");
  const mixText = /"anchorId":\s*"markt-mixarium"[\s\S]{0,400}?"text":\s*"([^"]{60,})"/.exec(roh);
  ok(!!mixText, "listings.js traegt weiterhin den Such-Korpus `text`");
  if (mixText) {
    const anfang = mixText[1].slice(0, 45);
    ok(markthtml.includes(anfang),
      "… und die Karte im Marktplatz zeigt genau ihn, nicht den Werbetext",
      `„${anfang}…"`);
  }
  /* Und die Suchergebnis-Zeile nimmt den NEUEN Text, wo es ihn gibt. */
  if (mit.length) {
    const h = lies(`apps/${mit[0]}/index.html`);
    const d = /<meta name="description" content="([^"]*)"/.exec(h);
    ok(!!d && d[1].length >= 80 && d[1].length <= 165,
      `die Suchergebnis-Zeile ist brauchbar lang (${mit[0]})`, d ? `${d[1].length} Zeichen` : "—");
  }
}

/* ── 2b · „Prüf es selbst" (Klaus 2026-09-22) ───────────────────────────────
 *
 * Der Knopf führt hier über die DOMAIN-GRENZE: dieses Depot hat keinen eigenen
 * Auslieferungsprüfer, er liegt auf pwa-toolpoint.de. Daraus folgen drei
 * Zusicherungen, die es in der Vorlage (PWA Toolpoint, relativer Link) gar
 * nicht geben kann.
 *
 * ⚠ GEMESSEN WIRD ÜBER ALLE SEITEN, nicht an einer. Ein Wächter auf eine
 * genannte Seite wäre blind, sobald das Werkzeug den Abschnitt nur noch bei
 * manchen baut — und genau das ist die Bedingung hier (rot heißt kein Link). */
{
  const { PRUEFER } = await import("../tools/detailseiten.mjs");
  const alle = readdirSync(join(WURZEL, "apps"), { withFileTypes: true })
    .filter((x) => x.isDirectory()).map((x) => x.name);

  const mitKnopf = [], ohneKnopf = [];
  for (const n of alle) {
    const h = lies(`apps/${n}/index.html`);
    (h.includes(">Prüf es selbst<") ? mitKnopf : ohneKnopf).push(n);
  }
  ok(mitKnopf.length > 0, "mindestens eine Seite trägt „Prüf es selbst\"",
    `${mitKnopf.length} von ${alle.length}`);

  /* ⚠ WER IHN NICHT HAT, BRAUCHT EINEN GRUND — und der einzige ist die rote
   * Ampel: `markteintraege` leert dann `url`, und ohne Adresse gibt es nichts
   * vorzubelegen. Ein Wächter „alle haben ihn" wäre an dem Tag rot, an dem
   * Klaus einen Eintrag sperrt, ohne dass eine Zusicherung gefallen wäre. */
  const ohneGrund = ohneKnopf.filter((n) => !/Der Link ist zurzeit ausgesetzt/
    .test(lies(`apps/${n}/index.html`)));
  ok(ohneGrund.length === 0,
    "wer keinen Prüf-Knopf hat, hat eine ausgesetzte Adresse",
    ohneGrund.join(", ") || `${ohneKnopf.length} ohne, alle ausgesetzt`);

  for (const n of mitKnopf) {
    const h = lies(`apps/${n}/index.html`);
    const m = /<a class="btn ghost ext" href="([^"]+)"([^>]*)>/.exec(
      h.split(">Prüf es selbst<")[1] || "");
    if (!m) { ok(false, `${n}: der Prüf-Knopf ist ein <a href>`); continue; }

    /* 1 · Die Adresse steht EINMAL im Werkzeug, nicht im Text verstreut. */
    ok(m[1].startsWith(PRUEFER + "?adresse="),
      `${n}: der Knopf zeigt auf den Prüfer aus der Konstante`, m[1].slice(0, 70));

    /* 2 · VORBELEGT, NICHT ABGERUFEN — die Adresse der App steht im Parameter,
     *     und zwar dieselbe, auf die „Zur Seite" zeigt. */
    const ziel = decodeURIComponent(m[1].split("?adresse=")[1] || "");
    const zurSeite = /<a class="btn ghost ext" href="([^"]+)" target="_blank"/.exec(h);
    ok(!!zurSeite && ziel === zurSeite[1],
      `${n}: vorbelegt ist genau die Adresse, die auch „Zur Seite" nennt`, ziel);

    /* 3 · Ein Wechsel der Domain wird GESAGT, nicht versteckt. */
    ok(/pwa-toolpoint\.de<\/b>,?\s*du verl[aä]sst dabei also diese Seite/.test(h),
      `${n}: es steht dabei, dass man diese Seite verlässt`);

    /* 4 · Fremder Tab, kein Fenster-Zugriff. `nofollow ugc` wäre hier FALSCH:
     *     das ist Klaus' eigenes Werkzeug, nicht der fremde Eintrag. */
    ok(/target="_blank"/.test(m[2]) && /rel="noopener"/.test(m[2]),
      `${n}: neuer Tab, rel=noopener`, m[2].trim());

    /* 5 · Die Grenze des Werkzeugs steht daneben. Ohne sie wäre der Abschnitt
     *     ein Versprechen, das der Prüfer nicht halten kann: er liest den
     *     Quelltext, nicht den laufenden Verkehr. */
    ok(/nicht den laufenden Verkehr/.test(h),
      `${n}: die Grenze des Prüfers steht dabei`);
  }

  /* ⚠ UND DIE KONSTANTE DARF NICHT VOM MARKTPLATZ WEGDRIFTEN. Der Prüfer steht
   * als eigener Eintrag in listings.js; zeigten die beiden auf verschiedene
   * Adressen, führte der Knopf woandershin als die Karte, und niemand sähe es. */
  const w = {};
  new Function("window", lies("assets/config/listings.js"))(w);
  const eintrag = (w.FP_LISTINGS || []).find((x) => x.anchorId === "markt-auslieferungspruefer");
  ok(!!eintrag, "der Auslieferungsprüfer steht als Eintrag im Marktplatz");
  if (eintrag) ok(eintrag.url === PRUEFER,
    "… und der Knopf zeigt auf dieselbe Adresse wie seine Karte",
    `${eintrag.url} ⟷ ${PRUEFER}`);
}

/* ── 3 · Und jetzt das, was ein Leser wirklich sieht ───────────────────────*/
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
  console.log("  ⊘ kein Browser — die Schirm-Hälfte ist NICHT LAUFFÄHIG, nicht grün:", e.message);
  stumm = 1;
}

/* Die Seite wird GEFUNDEN, nicht genannt: eine mit mehr als einer Mess-Stufe,
 * sonst misst „die Farben unterscheiden sich" nichts. */
const seiten = readdirSync(join(WURZEL, "apps"), { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => `apps/${d.name}/`);

if (br) {
  for (const [w, thema] of [[380, "dark"], [900, "dark"], [900, "light"]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: 1400 } });
    const pg = await ctx.newPage();
    let treffer = null;
    for (const s of seiten) {
      await pg.goto(`${basis}/${s}`, { waitUntil: "load" });
      await pg.evaluate((t) => document.documentElement.setAttribute("data-theme", t), thema);
      const d = await pg.evaluate(() => {
        const g = [...document.querySelectorAll("main.wrap > section.glass")];
        if (!g.length) return null;
        const naeh = Math.min(...g.map((k) => {
          const h = k.querySelector("h1,h2,p,ul,table");
          if (!h) return 999;
          return Math.round(h.getBoundingClientRect().left - k.getBoundingClientRect().left);
        }));
        const pillen = [...document.querySelectorAll(".det-band .mk-ms-w")].map((el) => ({
          st: (/is-(gut|mittel|schwach)/.exec(el.className) || [])[1] || "",
          farbe: getComputedStyle(el).color }));
        const zellen = [...document.querySelectorAll(".mess-tabelle td.zahl")].map((el) => ({
          st: (/st-(gut|mittel|schwach)/.exec(el.className) || [])[1] || "",
          farbe: getComputedStyle(el).color }));
        return { naeh, pillen, zellen };
      });
      if (!d) continue;
      if (!treffer) treffer = { ...d, seite: s };
      if (new Set(d.pillen.map((x) => x.st)).size > 1) { treffer = { ...d, seite: s }; break; }
    }
    ok(!!treffer, `${w} px/${thema}: es gibt eine Detailseite zum Messen`);
    if (!treffer) { await ctx.close(); continue; }

    ok(treffer.naeh >= 12,
      `${w} px/${thema}: kein Inhalt klebt am Kastenrand`, `${treffer.naeh} px Abstand`);

    ok(treffer.pillen.length === 4 && treffer.pillen.every((x) => x.st),
      `${w} px/${thema}: alle vier Messwerte tragen eine Stufe`,
      treffer.pillen.map((x) => x.st).join(" · ") || "keine");

    /* ⚠ SELBST-RIEGEL: ohne zwei verschiedene Stufen auf der Seite misst der
     * Farb-Vergleich darunter nichts — vier gleiche Zahlen ergäben vier
     * gleiche Farben, auch wenn gar nicht gefärbt würde. */
    const stufen = new Set(treffer.pillen.map((x) => x.st));
    ok(stufen.size > 1,
      `${w} px/${thema}: die gemessene Seite trägt MEHR ALS EINE Stufe — sonst sagt der Farb-Vergleich nichts`,
      `${treffer.seite}: ${[...stufen].join(" · ")}`);
    if (stufen.size > 1)
      ok(new Set(treffer.pillen.map((x) => x.farbe)).size > 1,
        `${w} px/${thema}: … und verschiedene Stufen sehen verschieden aus`,
        [...new Set(treffer.pillen.map((x) => x.farbe))].join(" · "));

    if (treffer.zellen.length)
      ok(treffer.zellen.every((x) => x.st),
        `${w} px/${thema}: auch im Verlauf trägt jede Zahl ihre Stufe`,
        `${treffer.zellen.length} Zellen`);
    await ctx.close();
  }
  await br.close();
}

console.log(`\n${gruen} grün · ${rot} ROT${stumm ? " · " + stumm + " nicht lauffähig" : ""}`);
srv.close();
process.exitCode = rot ? 1 : 0;

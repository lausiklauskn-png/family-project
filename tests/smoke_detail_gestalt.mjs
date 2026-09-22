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
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
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

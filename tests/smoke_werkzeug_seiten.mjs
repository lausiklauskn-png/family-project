/* Wächter: die Werkzeug-Seiten tragen ihren Inhalt OHNE JavaScript.
 *   node tests/smoke_werkzeug_seiten.mjs
 *
 * ⛔ DIE TAFEL, UM DIE ES GEHT (Klaus 2026-09-21):
 *    „kein sichtbarer Inhalt darf von JavaScript abhängig sein."
 *
 * Gemessen am 2026-09-22, VOR dem Backen, sichtbarer Text ohne Skripte:
 *
 *     188 Zeichen   werkzeuge/andock-werkzeug.html
 *     188 Zeichen   werkzeuge/ki-schulung.html
 *     188 Zeichen   werkzeuge/knoten-werkzeug.html
 *     190 Zeichen   werkzeuge/such-werkzeug.html
 *
 * Navigation und Fußzeile, sonst nichts — und alle vier standen in der Sitemap.
 *
 * ⚠ EIN WÄCHTER AUF DEN QUELLTEXT HÄTTE DAS NICHT GESEHEN. Die Marken stehen
 * da, das Werkzeug läuft durch, `--pruefen` ist grün — und trotzdem könnte die
 * Seite im Browser leer sein (ein falscher Marken-Ersatz, ein Skript, das den
 * Rumpf beim Laden wegwirft). Gemessen wird deshalb der SCHIRM, mit
 * `javaScriptEnabled: false` — das ist die Hälfte, die den Fund gemacht hat.
 *
 * ⚠ UND DIE GEGENRICHTUNG IST GENAUSO WICHTIG: mit JavaScript muss DERSELBE
 * Text dastehen. Wären es zwei Fassungen, spränge die Seite im Augenblick des
 * ersten Neuzeichnens — und ein Wächter, der nur „ohne JS ist Text da" misst,
 * wäre dafür blind.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { seitenFinden, MARKE_AUF, MARKE_ZU, toolAus, spendenLesen, zeichnerLaden, baue } from "../tools/werkzeug-seiten.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m, d ? " → " + d : ""); } };

/* ══ 1 · die Liste wird GEFUNDEN ════════════════════════════════════════════ */
const seiten = seitenFinden();
/* ⚠ SELBST-RIEGEL: findet der Sammler nichts, misst ALLES darunter nichts —
 * und der Lauf sähe aus wie eine bestandene Prüfung. */
ok(seiten.length >= 4, "der Sammler findet die Werkzeug-Seiten überhaupt", `${seiten.length} gefunden`);
ok(seiten.every((p) => /<main\s+id="toolMain"/.test(lies(p))),
   "… und jede gefundene Seite trägt wirklich ein toolMain");

/* ══ 2 · der Zeichner lässt sich OHNE DOM laden ═════════════════════════════ */
let seiteHtml = null;
try { seiteHtml = zeichnerLaden(); } catch (e) { /* unten gemeldet */ }
ok(typeof seiteHtml === "function",
   "assets/tool-landing.js lässt sich in Node laden (der DOM-Riegel hält)");
const zeichner = lies("assets/tool-landing.js");
ok(/typeof document !== "undefined"/.test(zeichner),
   "… und sein Selbstlauf steht hinter einem DOM-Riegel");
ok(/global\.FPToolLanding\s*=/.test(zeichner),
   "… und er gibt seiteHtml nach draußen");

/* ══ 3 · eine Quelle: gebacken == gezeichnet ════════════════════════════════ */
const sp = spendenLesen();
for (const p of seiten) {
  const roh = lies(p);
  const auf = roh.indexOf(MARKE_AUF), zu = roh.indexOf(MARKE_ZU);
  ok(auf > 0 && zu > auf, `${p}: trägt die Marken`);
  if (auf < 0 || zu < auf) continue;
  const gebacken = roh.slice(auf + MARKE_AUF.length, zu).trim();
  const gezeichnet = seiteHtml ? seiteHtml(toolAus(roh, p), "de", sp).trim() : "";
  /* ⚠ VERGLICHEN WIRD DER TEXT, NICHT SEINE LÄNGE — eine Zahl wäre auch dann
   * gleich, wenn zwei ganz verschiedene Rümpfe zufällig gleich lang sind. */
  ok(gebacken === gezeichnet, `${p}: das Gebackene ist genau das, was der Zeichner liefert`,
     `${gebacken.length} gegen ${gezeichnet.length} Zeichen`);
  ok((roh.match(/<h1[\s>]/g) || []).length === 1, `${p}: genau eine h1`,
     `${(roh.match(/<h1[\s>]/g) || []).length}`);
  ok(/rel="canonical"/.test(roh), `${p}: trägt ein Canonical`);
}

/* ══ 4 · zweimal backen ändert nichts ═══════════════════════════════════════ */
const ab = baue().filter((s) => s.alt !== s.neu);
ok(ab.length === 0, "tools/werkzeug-seiten.mjs --pruefen ist grün (zweimal backen ändert nichts)",
   ab.map((s) => s.pfad).join(", "));

/* ══ 5 · DER SCHIRM — ohne JavaScript und mit ═══════════════════════════════ */
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",
  ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wasm":"application/wasm" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let browser = null;
try {
  const pw = await import(process.env.PW_CORE || "playwright-core");
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });
} catch (e) {
  console.log("  ⊘ kein Browser — die Schirm-Hälfte ist NICHT LAUFFÄHIG, nicht grün:", e.message);
}

const sauber = (s) => String(s).replace(/\s+/g, " ").trim();

if (browser) {
  for (const p of seiten) {
    /* ---- ohne JavaScript: das ist, was ein Crawler ohne Rendering liest ---- */
    const ohne = await browser.newContext({ javaScriptEnabled: false });
    const s1 = await ohne.newPage();
    await s1.goto(`${base}/${p}`, { waitUntil: "load" });
    const m1 = await s1.evaluate(() => {
      const el = document.getElementById("toolMain");
      /* ⚠ DAS SIEGEL WIRD ZUR LAUFZEIT GEHOLT UND GRAVIERT — benannte Grenze.
       * `sealHTML` legt nur den Kasten `#sealSvg` an; sein SVG kommt per fetch
       * und trägt Text („SBKIM", „SIEGEL", „DEINE APP", „OFFIZIELLE
       * BESTÄTIGUNG"). Gemessen am 2026-09-22: das sind die EINZIGEN vier
       * Zeilen, die mit JavaScript dazukommen — 44 Zeichen auf 3.697.
       * Verglichen wird deshalb der Text AUSSERHALB dieses Kastens. Ihn einfach
       * aus dem Vergleich zu nehmen wäre eine Lockerung; stattdessen wird
       * daneben gemessen, dass er wirklich die einzige Abweichung ist. */
      const ohneSiegel = (n) => {
        if (!n) return "";
        const k = n.cloneNode(true);
        const sg = k.querySelector("#sealSvg");
        if (sg) sg.remove();
        return k.innerText || "";
      };
      return el ? {
        text: ohneSiegel(el),
        ganz: el.innerText || "",
        h1: el.querySelectorAll("h1").length,
        h2: el.querySelectorAll("h2").length,
        links: [...el.querySelectorAll("a")].length,
        ohneZiel: [...el.querySelectorAll("a")].filter((a) => !a.getAttribute("href")).length,
        knoepfe: el.querySelectorAll("button").length,
      } : null;
    });
    await ohne.close();

    ok(m1 && sauber(m1.text).length > 1200, `${p}: OHNE JavaScript steht der Inhalt da`,
       m1 ? `${sauber(m1.text).length} Zeichen` : "kein toolMain");
    ok(m1 && m1.h1 === 1, `${p}: OHNE JavaScript genau eine h1 im Rumpf`, m1 ? `${m1.h1}` : "—");
    ok(m1 && m1.h2 >= 2, `${p}: OHNE JavaScript stehen die Abschnittsüberschriften da`, m1 ? `${m1.h2}` : "—");
    ok(m1 && m1.links >= 3 && m1.ohneZiel === 0,
       `${p}: OHNE JavaScript hat jedes Bedienelement ein href`,
       m1 ? `${m1.links} Links, ${m1.ohneZiel} ohne Ziel` : "—");

    /* ---- mit JavaScript: DERSELBE Text, sonst spränge die Seite ---------- */
    const mit = await browser.newContext();
    const s2 = await mit.newPage();
    await s2.goto(`${base}/${p}`, { waitUntil: "load" });
    await s2.waitForTimeout(300);
    const m2 = await s2.evaluate(() => {
      const el = document.getElementById("toolMain");
      const ohneSiegel = (n) => {
        if (!n) return "";
        const k = n.cloneNode(true);
        const sg = k.querySelector("#sealSvg");
        if (sg) sg.remove();
        return k.innerText || "";
      };
      return el ? {
        text: ohneSiegel(el),
        ganz: el.innerText || "",
        siegel: !!el.querySelector("#sealSvg"),
        siegelText: (el.querySelector("#sealSvg") || {}).innerText || "",
        h1: el.querySelectorAll("h1").length,
      } : null;
    });
    await mit.close();

    ok(m2 && m2.h1 === 1, `${p}: MIT JavaScript weiterhin genau eine h1`, m2 ? `${m2.h1}` : "—");
    ok(m1 && m2 && sauber(m1.text) === sauber(m2.text),
       `${p}: mit und ohne JavaScript steht DERSELBE Text da (außerhalb des Siegels)`,
       m1 && m2 ? `${sauber(m1.text).length} gegen ${sauber(m2.text).length} Zeichen` : "—");

    /* ⚠ UND DIE GRENZE WIRD SELBST GEMESSEN, statt nur hingeschrieben zu werden.
     * Ohne diese Zeile wäre „außerhalb des Siegels" ein Freibrief: jede weitere
     * Stelle, die später ihren Inhalt erst im Browser holt, verschwände lautlos
     * aus dem Vergleich. Gemessen wird deshalb, dass der GANZE Text sich nur
     * dort unterscheidet — ist kein Siegel da, muss er sogar gleich sein. */
    if (m1 && m2) {
      const zeilenVon = (t) => String(t).split("\n").map((z) => z.trim()).filter(Boolean);
      const ohneJs = zeilenVon(m1.ganz);
      const dazu = zeilenVon(m2.ganz).filter((z) => !ohneJs.includes(z));
      const ausDemSiegel = zeilenVon(m2.siegelText);
      ok(dazu.every((z) => ausDemSiegel.includes(z)),
         `${p}: JEDE Zeile, die JavaScript hinzufügt, kommt aus dem Siegel`,
         dazu.filter((z) => !ausDemSiegel.includes(z)).map((z) => JSON.stringify(z)).join(" ") || `${dazu.length} dazu`);
      if (!m2.siegel) {
        ok(dazu.length === 0, `${p}: ohne Siegel fügt JavaScript gar nichts hinzu`, `${dazu.length} Zeilen`);
      }
    }
  }
  await browser.close();
}
server.close();

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

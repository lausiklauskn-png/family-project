/* Wächter für die schmale Kopfleiste (Klaus 2026-10-06).
 *   node tests/smoke_kopfleiste.mjs
 *
 * Klaus: „Aktualisieren einfach das Wort raus. DE, EN kann man einfach nur die
 * Sprache, die aktuell ist, machen. Und dann geht oben das auf und dann kann man
 * wählen. … Steht kann man auch wegnehmen … Einfach nur ein Symbol."
 *
 * Gemessen wird bei 320 · 360 · 412 px, auf jeder Seite mit Kopfleiste
 * (gefunden, nicht gepflegt), und zwar das, was ein Mensch sieht:
 *   · höchstens drei Reihen in der Kopfleiste
 *   · nichts ragt aus dem Fenster
 *   · ↻ trägt kein sichtbares Wort mehr, der Sprachknopf nur die Sprache
 *   · mit und ohne JavaScript dieselbe Kopfhöhe (kein Sprung beim Laden)
 *   · die Auswahl geht auf, liegt im Fenster, verschiebt nichts, und die Wahl wirkt
 *
 * ⚠ Die Reihen-Zahl ist an Klaus' Satz gehängt, nicht an einen Messwert von heute:
 * vier Reihen waren der Befund, drei die Obergrenze.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pw;
try { pw = await import(process.env.PW_CORE || "playwright-core"); }
catch (e) { console.log("⊘ nicht lauffähig: playwright-core fehlt"); process.exit(2); }
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
if (!fs.existsSync(exe)) { console.log("⊘ nicht lauffähig: Chromium fehlt"); process.exit(2); }

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m + (d ? " — " + d : "")); } };

/* Seiten: jede HTML-Datei mit dem Sprachknopf. Gefunden, nicht gepflegt. */
const SEITEN = [];
for (const d of [".", "werkzeuge"]) for (const f of fs.readdirSync(path.join(ROOT, d)))
  if (f.endsWith(".html")) { const rel = d === "." ? f : d + "/" + f;
    if (/id="langBtn"/.test(fs.readFileSync(path.join(ROOT, rel), "utf8"))) SEITEN.push(rel); }
ok(SEITEN.length >= 10, "Seiten mit Kopfleiste gefunden", String(SEITEN.length));

const BREITEN = [320, 360, 412];
const messe = () => {
  const h = document.querySelector("header"); if (!h) return { fehlt: true };
  /* Gezählt werden die Reihen der LEISTE, ohne die Marke darüber — so hat Klaus gezählt:
     auf seinem Handy (360 px) standen die Knöpfe in vier Reihen, „≈ Steht" allein in der vierten. */
  const items = [...document.querySelectorAll("nav.top > *")]
    .filter((e) => e && e.getClientRects().length && e.getBoundingClientRect().width > 0);
  const tops = [];
  for (const e of items) { const r = e.getBoundingClientRect(); const m = r.top + r.height / 2;
    if (!tops.some((t) => Math.abs(t - m) < r.height / 2)) tops.push(m); }
  const W = innerWidth;
  const raus = [document.querySelector(".brand"), ...items].filter((e) => e).filter((e) => { const r = e.getBoundingClientRect(); return r.right > W + 0.5 || r.left < -0.5; })
    .map((e) => e.id || e.className || e.tagName);
  const rl = document.getElementById("fpReload"), lb = document.getElementById("langBtn");
  return { fehlt: false, reihen: tops.length, raus, quer: document.documentElement.scrollWidth > W,
    kopf: Math.round(h.getBoundingClientRect().height),
    reloadText: rl ? rl.innerText.trim() : null, langText: lb ? lb.innerText.trim() : null };
};

const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
try {
  for (const w of BREITEN) {
    console.log(`\n═══ ${w} px ═══`);
    const mit = await browser.newContext({ viewport: { width: w, height: 760 } });
    const ohne = await browser.newContext({ viewport: { width: w, height: 760 }, javaScriptEnabled: false });
    const pm = await mit.newPage(), po = await ohne.newPage();
    for (const s of SEITEN) {
      await pm.goto(`${base}/${s}`, { waitUntil: "load" }); await pm.waitForTimeout(400);
      await po.goto(`${base}/${s}`, { waitUntil: "load" });
      const a = await pm.evaluate(messe), b = await po.evaluate(messe);
      if (a.fehlt) { ok(false, `${s}: Kopfleiste da`); continue; }
      ok(a.reihen <= 3, `${s}: höchstens drei Reihen in der Kopfleiste`, `${a.reihen} Reihen`);
      ok(!a.raus.length && !a.quer, `${s}: nichts ragt aus dem Fenster`, JSON.stringify(a.raus) + (a.quer ? " quer" : ""));
      ok(a.reloadText !== null && !/[A-Za-zÄÖÜäöü]/.test(a.reloadText), `${s}: der Aktualisieren-Knopf zeigt nur das Zeichen`, JSON.stringify(a.reloadText));
      ok(/^(DE|EN)$/.test(a.langText || ""), `${s}: der Sprachknopf zeigt nur die aktuelle Sprache`, JSON.stringify(a.langText));
      ok(Math.abs(a.kopf - b.kopf) <= 1, `${s}: mit und ohne JavaScript gleich hoch (kein Sprung)`, `${b.kopf} → ${a.kopf} px`);
    }
    // Die Auswahl, auf der Startseite.
    await pm.goto(`${base}/index.html`, { waitUntil: "load" }); await pm.waitForTimeout(400);
    await pm.evaluate(() => { try { localStorage.removeItem("fp_lang_wahl"); localStorage.removeItem("fp_lang"); } catch (e) {} });
    await pm.reload({ waitUntil: "load" }); await pm.waitForTimeout(400);
    const kopf0 = await pm.evaluate(() => Math.round(document.querySelector("header").getBoundingClientRect().height));
    await pm.click("#langBtn");
    const menu = await pm.waitForSelector("#langMenu", { timeout: 2000 }).catch(() => null);
    ok(!!menu, "ein Tipp auf den Sprachknopf öffnet die Auswahl");
    if (menu) {
      const m = await pm.evaluate(() => { const r = document.getElementById("langMenu").getBoundingClientRect();
        return { n: document.querySelectorAll("#langMenu [data-lang]").length,
          drin: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
          kopf: Math.round(document.querySelector("header").getBoundingClientRect().height),
          exp: document.getElementById("langBtn").getAttribute("aria-expanded") }; });
      ok(m.n === 2, "die Auswahl trägt Deutsch und English", String(m.n));
      ok(m.drin, "die Auswahl liegt ganz im Fenster");
      ok(m.kopf === kopf0, "die offene Auswahl verschiebt die Kopfleiste nicht", `${kopf0} → ${m.kopf}`);
      ok(m.exp === "true", "aria-expanded sagt, dass sie offen ist");
      await pm.click('#langMenu [data-lang="en"]'); await pm.waitForTimeout(150);
      const n = await pm.evaluate(() => ({ lang: document.documentElement.lang, txt: document.getElementById("langBtn").innerText.trim(),
        zu: !document.getElementById("langMenu"), wahl: localStorage.getItem("fp_lang_wahl") }));
      ok(n.lang === "en" && n.txt === "EN", "die Wahl setzt die Sprache, der Knopf zeigt EN", JSON.stringify(n));
      ok(n.zu, "nach der Wahl ist die Auswahl zu");
      ok(n.wahl === "1", "die Wahl ist als ausdrückliche Wahl gemerkt");
      await pm.click("#langBtn"); await pm.waitForSelector("#langMenu");
      await pm.mouse.click(5, 700); await pm.waitForTimeout(100);
      ok(await pm.evaluate(() => !document.getElementById("langMenu") && document.documentElement.lang === "en"),
        "ein Tipp daneben schließt die Auswahl und ändert nichts");
    }
    await mit.close(); await ohne.close();
  }
} catch (e) { fail++; console.log("  ✗ die Probe ist unterwegs gestolpert —", e.message); }
await browser.close(); server.close();
console.log(`\n${pass} grün, ${fail} rot`);
process.exit(fail ? 1 : 0);

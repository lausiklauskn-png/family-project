/* Wächter über die NETZ-VERWALTUNG (Sage Modul 23b, S5b Teil 2, 2026-10-16).
 *
 *   node tests/smoke_netzverwaltung.mjs
 *   bash tests/gegenprobe_netzverwaltung.sh     # die Gegenprobe (Wegwerf-Kopie)
 *
 * Klaus 2026-10-16: die Netz-Verwaltung ist eine EIGENE SEITE
 * (netz-verwaltung.html), das Studio hat nur einen Knopf dorthin. Im Studio
 * kommt je Eintrag die Kennung der App (nodeId) dazu und ein Knopf
 * „🧬 Spore prüfen".
 *
 * Gemessen im ECHTEN Browser:
 *   N1 netz-verwaltung.html lädt ohne Seitenfehler und zeigt [data-sbkim-netzverwaltung]
 *   N2 beim Laden geht KEINE Anfrage an eine fremde Adresse
 *   N3 normEntry behält nodeId (Positivliste) — und nur eine gültige
 *   N4 ein Eintragsname mit <img src=x onerror=…> bleibt Text (Seite UND Studio)
 *   N5 Spore prüfen: gültig · Kennung passt nicht · Unterschrift ungültig,
 *      und bei leerem Feld wird die Kennung aus der Spore vorgeschlagen
 *   N6 der Studio-Knopf führt im selben Tab auf netz-verwaltung.html
 *
 * Die Spore für N5 ist die eigene sbkim/spore.json, ausgeliefert unter einer
 * gestellten https-Adresse (page.route) — es geht nichts ins echte Netz.
 *
 * Fehlt `playwright-core`, ist diese Probe NICHT LAUFFÄHIG — nicht rot.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (b, t, d) => { if (b) { pass++; console.log("  ✓", t); } else { fail++; console.log("  ✗", t, d ? "— " + d : ""); } };

let chromium;
try {
  const pw = await import(process.env.PW_CORE || "playwright-core");
  chromium = pw.chromium || (pw.default && pw.default.chromium);
} catch {
  console.log("⊘ playwright-core fehlt — NICHT LAUFFÄHIG, nicht rot.");
  console.log("   npm install --no-save playwright-core");
  process.exit(0);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
               ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

const XSS = '<img src=x onerror="window.__xss=1">Böse';
const XSS_ID = "XssProbe_0123456789abcdef";
let mitXss = false;   // listings.js um einen bösen Eintrag erweitern?

const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  const fp = path.join(ROOT, p === "/" ? "/index.html" : p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  let body = fs.readFileSync(fp);
  if (mitXss && p === "/assets/config/listings.js") {
    body = Buffer.concat([body, Buffer.from("\nwindow.FP_LISTINGS.push(" + JSON.stringify({
      label: XSS, anchorId: "markt-xss", text: "Probe", url: "https://example.invalid/", img: "", nodeId: XSS_ID }) + ");\n")]);
  }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  res.end(body);
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${srv.address().port}`;

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });

try {
  /* ── N1 + N2 + N4 (Seite) ─────────────────────────────────────────── */
  console.log("A · netz-verwaltung.html");
  {
    mitXss = true;
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const fehler = [], fremd = [];
    p.on("pageerror", (e) => fehler.push(String(e && e.message || e)));
    p.on("request", (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith("data:")) fremd.push(r.url()); });
    await p.goto(`${BASE}/netz-verwaltung.html`, { waitUntil: "load" });
    let da = true;
    try { await p.waitForSelector("[data-sbkim-netzverwaltung]", { timeout: 8000 }); } catch { da = false; }
    // Auf die Zeile mit dem bösen Namen warten — sie MUSS kommen; fehlte sie,
    // wäre N4 grün, ohne etwas gemessen zu haben.
    let zeile = true;
    try {
      await p.waitForFunction((n) => {
        const r = document.querySelector("[data-sbkim-netzverwaltung]");
        return !!r && r.textContent.indexOf(n) >= 0;
      }, "Böse", { timeout: 8000 });
    } catch { zeile = false; }
    await p.waitForLoadState("networkidle").catch(() => {});
    ok(da && fehler.length === 0, "N1 lädt ohne Seitenfehler und zeigt [data-sbkim-netzverwaltung]", JSON.stringify({ da, fehler }));
    ok(fremd.length === 0, "N2 beim Laden keine Anfrage an eine fremde Adresse", JSON.stringify(fremd));
    const x = await p.evaluate((roh) => {
      const r = document.querySelector("[data-sbkim-netzverwaltung]");
      return { img: r ? r.querySelectorAll("img").length : -1, text: r ? r.textContent.indexOf(roh) >= 0 : false, xss: window.__xss === 1 };
    }, XSS);
    ok(zeile && x.img === 0 && x.text && !x.xss, "N4 ein Eintragsname mit <img onerror> bleibt Text (Seite)", JSON.stringify({ zeile, ...x }));
    const titel = await p.evaluate(() => ({ robots: (document.querySelector('meta[name=robots]') || {}).content || "",
      suffix: window.SBKIM_DB_SUFFIX || "", zurueck: !!document.querySelector('a[href="markt.html"]') }));
    ok(titel.robots === "noindex" && titel.suffix === "familyprojekt" && titel.zurueck,
      "Seite trägt noindex, die Schublade der Website und den Weg zurück", JSON.stringify(titel));
    mitXss = false;
    await ctx.close();
  }

  /* ── N3 · normEntry ────────────────────────────────────────────────── */
  console.log("B · Studio");
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(String(e && e.message || e)));
  await p.goto(`${BASE}/markt.html`, { waitUntil: "load" });
  await p.waitForFunction(() => !!(window.FPStudio && window.FPStudio._t));
  const n = await p.evaluate(() => {
    const t = window.FPStudio._t;
    const gut = "AbCdEfGhIjKlMnOp_qrs-0123456789";
    const a = t.normEntry({ label: "A", text: "x", url: "https://a.example/", img: "", nodeId: gut });
    const b = t.normEntry({ label: "B", text: "x", url: "https://b.example/", img: "", nodeId: "zu kurz" });
    const c = t.normEntry({ label: "C", text: "x", url: "https://c.example/", img: "", nodeId: "<script>alert(1)</script>xxxxxxxxxx" });
    t.setWork([{ label: "A", anchorId: "markt-a", text: "x", url: "https://a.example/", img: "", nodeId: gut }]);
    const ser = t.serialize();
    return { a: a.nodeId, b: "nodeId" in b, c: "nodeId" in c, ser: ser.indexOf('"nodeId": "' + gut + '"') >= 0, gut };
  });
  ok(n.a === n.gut, "N3 normEntry behält eine gültige nodeId", JSON.stringify(n));
  ok(n.ser, "N3 … und sie steht in der veröffentlichten listings.js (serialize)");
  ok(!n.b && !n.c, "N3 eine ungültige Kennung reist NICHT mit", JSON.stringify(n));

  /* ── N4 (Studio) + N5 ──────────────────────────────────────────────── */
  const SPORE = fs.readFileSync(path.join(ROOT, "sbkim/spore.json"), "utf8");
  const SID = JSON.parse(SPORE).id;
  const kaputt = JSON.parse(SPORE); kaputt.nodeName = "Jemand anderes";
  await p.route("https://spore.probe.test/**", (route) => {
    const u = route.request().url();
    const body = /kaputt/.test(u) ? JSON.stringify(kaputt) : SPORE;
    route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body });
  });
  await p.evaluate((xss) => {
    window.FPStudio._t.setWork([{ label: xss, anchorId: "markt-xss", text: "Probe", url: "https://example.invalid/", img: "" }]);
    window.FPStudio.open();
  }, XSS);
  await p.waitForSelector(".fpst-modal [data-role=spcheckbtn]");
  const xs = await p.evaluate((roh) => {
    const l = document.querySelector(".fpst-modal [data-role=list]");
    return { img: l ? [...l.querySelectorAll("img")].filter((i) => /x$/.test(i.getAttribute("src") || "")).length : -1,
             text: l ? l.textContent.indexOf(roh) >= 0 : false, xss: window.__xss === 1 };
  }, XSS);
  ok(xs.img === 0 && xs.text && !xs.xss, "N4 derselbe Name bleibt auch in der Studio-Liste Text", JSON.stringify(xs));

  let elemente = 0;
  async function pruefe(url, kennung) {
    await p.fill(".fpst-modal [data-f=spore]", url);
    await p.fill(".fpst-modal [data-f=nodeid]", kennung);
    await p.evaluate(() => { document.querySelector(".fpst-modal [data-role=spcheck]").textContent = ""; });
    await p.click(".fpst-modal [data-role=spcheckbtn]");
    await p.waitForFunction(() => {
      const t = document.querySelector(".fpst-modal [data-role=spcheck]").textContent;
      return t && !/geprüft …|Checking/.test(t);
    }, null, { timeout: 15000 });
    const r = await p.evaluate(() => ({ text: document.querySelector(".fpst-modal [data-role=spcheck]").textContent,
                                kinder: document.querySelector(".fpst-modal [data-role=spcheck]").children.length,
                                feld: document.querySelector(".fpst-modal [data-f=nodeid]").value }));
    elemente += r.kinder;
    return r;
  }
  const leer = await pruefe("https://spore.probe.test/spore.json", "");
  ok(/gültig/.test(leer.text) && leer.feld === SID, "N5 gültige Spore, leeres Feld → Kennung aus der Spore vorgeschlagen", JSON.stringify(leer));
  const passt = await pruefe("https://spore.probe.test/spore.json", SID);
  ok(/Kennung passt\./.test(passt.text), "N5 gültige Spore mit passender Kennung", JSON.stringify(passt));
  const anders = await pruefe("https://spore.probe.test/spore.json", "AndereKennung_0123456789");
  ok(/Kennung passt nicht/.test(anders.text) && anders.feld === "AndereKennung_0123456789",
    "N5 andere Kennung → „Kennung passt nicht“, das Feld bleibt, wie es war", JSON.stringify(anders));
  const unt = await pruefe("https://spore.probe.test/kaputt.json", "");
  ok(/Unterschrift ungültig/.test(unt.text) && unt.feld === "", "N5 veränderte Spore → „Unterschrift ungültig“, nichts vorgeschlagen", JSON.stringify(unt));
  const http0 = await pruefe("http://spore.probe.test/spore.json", "");
  ok(/https/.test(http0.text), "N5 nur https — eine http-Adresse wird gar nicht erst geholt", JSON.stringify(http0));

  /* Das Ergebnis steht als reiner Text im Feld — gemessen auf dem echten Weg
   * (nach jedem Klick oben), nicht an einem selbst gesetzten textContent:
   * so war der Wächter zuerst gebaut, und die Gegenprobe hat ihn blind
   * gefunden. */
  ok(elemente === 0, "N5 das Ergebnis geht nur als Text ins DOM (keine Elemente im Ergebnis-Feld)", String(elemente));

  /* ── N6 · der Knopf ────────────────────────────────────────────────── */
  p.on("dialog", (d) => d.accept());
  await Promise.all([
    p.waitForURL(/netz-verwaltung\.html$/, { timeout: 8000 }).catch(() => {}),
    p.click(".fpst-modal [data-role=nvopen]"),
  ]);
  ok(/\/netz-verwaltung\.html$/.test(p.url()) && ctx.pages().length === 1,
    "N6 „Netz-Verwaltung öffnen“ führt im selben Tab auf netz-verwaltung.html", p.url());
  ok(fehler.length === 0, "keine Seitenfehler im Studio", JSON.stringify(fehler));
  await ctx.close();
} finally {
  await browser.close();
  srv.close();
}

console.log(`\n${pass} grün · ${fail} ROT`);
process.exit(fail ? 1 : 0);

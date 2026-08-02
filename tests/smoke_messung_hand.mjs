/* Von Hand eingetragene Lighthouse-Werte (assets/config/messung-hand.json).
 *
 * Zweck der Sache: eine frisch fertige Seite soll SOFORT gelistet werden
 * können, ohne einen Tag auf den nächtlichen Lauf zu warten. Klaus liest die
 * vier Zahlen bei PageSpeed ab, trägt sie ein, und sie sind mit dem Push live.
 *
 * Was dieser Test prüft — und warum jedes Stück davon nötig ist:
 *   1. Ein Hand-Wert erscheint überhaupt, wenn noch nichts gemessen wurde.
 *   2. Er wird als Hand-Wert AUSGEWIESEN. Ohne das wäre eine Behauptung von
 *      einer Messung nicht zu unterscheiden — genau die Sorte stiller Lüge,
 *      gegen die der ganze Bericht gebaut ist.
 *   3. Eine eigene Messung GEWINNT, sobald sie nicht älter ist. Sonst würde
 *      der Hand-Wert die Automatik dauerhaft überstimmen, und niemand merkte
 *      es. (Beim Wächter ist es umgekehrt — dort ist die Hand die Notbremse.)
 *   4. `_hinweis` und unvollständige Einträge werden übergangen, statt als
 *      Zahlen zu erscheinen.
 *
 * Bericht und Hand-Datei werden ABGEFANGEN, nicht aus dem Repo gelesen: der
 * Test soll das Verhalten prüfen, nicht den Tagesstand der echten Messung.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"]
});

const VIER = { leistung: 91, bedienbarkeit: 92, gute_praxis: 93, auffindbarkeit: 94 };

async function laden(bericht, hand) {
  const page = await browser.newPage();
  await page.route("**/assets/config/spore-stand.json*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bericht) }));
  await page.route("**/assets/config/messung-hand.json*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(hand) }));
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  await page.waitForTimeout(1600);
  return page;
}
/* Gelesen wird die KARTE, nicht eine interne Variable: `MESSUNG` liegt in einem
 * eigenen Bereich und ist von aussen gar nicht sichtbar. Und die Karte ist
 * ohnehin das, worauf es ankommt — was dort steht, sieht der Besucher. */
const karte = (page, id) => page.evaluate((k) => {
  const btn = document.querySelector('.mk-report[data-id="' + k + '"]');
  const c = btn && btn.closest(".listing");
  if (!c) return { fehlt: true };
  const hand = c.querySelector(".mk-ms-hand");
  return {
    zahlen: Array.from(c.querySelectorAll(".mk-mess .mk-ms-w b")).map((e) => Number(e.textContent)),
    hand: !!hand,
    handText: hand ? hand.textContent : "",
    leer: !!c.querySelector(".mk-mess--leer")
  };
}, id);

console.log("Marktplatz — von Hand eingetragene Messwerte");

// ── 1) Noch nichts gemessen: der Hand-Wert springt ein ──────────────────────
{
  const p = await laden({ eintraege: {} }, {
    _hinweis: "darf nicht als Eintrag gelesen werden",
    "markt-kimboard": Object.assign({ gemessen: "2026-08-02" }, VIER)
  });
  const k = await karte(p, "markt-kimboard");
  ok(k.zahlen && k.zahlen[0] === 91, "1a der Hand-Wert steht auf der Karte (" + JSON.stringify(k.zahlen) + ")");
  ok(k.hand === true, "1b und er ist als Hand-Wert gekennzeichnet");
  ok(/abgelesen/i.test(k.handText), "1c die Kennzeichnung sagt 'abgelesen', nicht 'gemessen'");
  ok((await p.evaluate(() => document.querySelectorAll(".mk-ms-hand").length)) === 1,
    "1d GENAU EIN Eintrag ist betroffen — `_hinweis` wurde nicht als Eintrag gelesen");
  await p.close();
}

// ── 2) Eigene Messung ist neuer: sie gewinnt ────────────────────────────────
{
  const p = await laden({
    eintraege: { "markt-kimboard": { messung: { stand: "gemessen", gemessen: "2026-08-03", leistung: 62, bedienbarkeit: 100, gute_praxis: 90, auffindbarkeit: 96 } } }
  }, { "markt-kimboard": Object.assign({ gemessen: "2026-08-02" }, VIER) });
  const k = await karte(p, "markt-kimboard");
  ok(k.zahlen && k.zahlen[0] === 62, "2a die neuere eigene Messung gewinnt (" + JSON.stringify(k.zahlen) + ")");
  ok((await p.evaluate(() => document.querySelectorAll(".mk-ms-hand").length)) === 0,
    "2b und der Hand-Hinweis erscheint dann gar nicht");
  await p.close();
}

// ── 3) Gleiches Datum: die eigene Messung gewinnt ───────────────────────────
{
  const p = await laden({
    eintraege: { "markt-kimboard": { messung: { stand: "gemessen", gemessen: "2026-08-02", leistung: 62, bedienbarkeit: 100, gute_praxis: 90, auffindbarkeit: 96 } } }
  }, { "markt-kimboard": Object.assign({ gemessen: "2026-08-02" }, VIER) });
  const k = await karte(p, "markt-kimboard");
  ok(k.zahlen && k.zahlen[0] === 62 && !k.hand,
    "3 bei gleichem Datum gewinnt die eigene Messung (" + JSON.stringify(k.zahlen) + ")");
  await p.close();
}

// ── 4) Hand-Wert ist neuer als eine alte Messung: er springt ein ────────────
{
  const p = await laden({
    eintraege: { "markt-kimboard": { messung: { stand: "gemessen", gemessen: "2026-07-20", leistung: 62, bedienbarkeit: 100, gute_praxis: 90, auffindbarkeit: 96 } } }
  }, { "markt-kimboard": Object.assign({ gemessen: "2026-08-02" }, VIER) });
  const k = await karte(p, "markt-kimboard");
  ok(k.zahlen && k.zahlen[0] === 91 && k.hand,
    "4 ein neuerer Hand-Wert ersetzt eine aeltere Messung (" + JSON.stringify(k.zahlen) + ")");
  await p.close();
}

// ── 5) Unvollstaendiger Eintrag wird uebergangen ────────────────────────────
{
  // Der Bericht traegt hier BEWUSST einen anderen Eintrag. Ein voellig leerer
  // Bericht laesst die Seite frueh abbrechen und gar nicht neu zeichnen — das
  // ist vorbestehendes Verhalten und hat mit den Hand-Werten nichts zu tun;
  // dieser Fall soll das Uebergehen pruefen, nicht jene Abkuerzung.
  const p = await laden({
    eintraege: { "markt-kimseek": { messung: { stand: "gemessen", gemessen: "2026-08-02", leistung: 99, bedienbarkeit: 93, gute_praxis: 100, auffindbarkeit: 100 } } }
  }, {
    "markt-kimboard": { leistung: 91, bedienbarkeit: 92, gemessen: "2026-08-02" }   // zwei Werte fehlen
  });
  const k = await karte(p, "markt-kimboard");
  ok(!k.hand && (!k.zahlen || !k.zahlen.length),
    "5a ein Eintrag ohne alle vier Zahlen wird uebergangen (kein halber Wert)");
  ok(k.leer === true, "5b und die Karte sagt weiterhin ehrlich 'noch nicht gemessen'");
  await p.close();
}

// ── 6) Schaufenster laesst sich mit eintragen ───────────────────────────────
{
  const p = await laden({ eintraege: {} }, {
    "markt-mixarium": Object.assign({ gemessen: "2026-08-02",
      schaufenster: { leistung: 94, bedienbarkeit: 87, gute_praxis: 100, auffindbarkeit: 100, gemessen: "2026-08-02" } }, VIER)
  });
  await p.click('[data-msid="markt-mixarium"]');
  await p.waitForTimeout(600);
  const sf = await p.evaluate(() => {
    const b = document.querySelector(".mk-ms-sf");
    return b ? Array.from(b.querySelectorAll(".mk-ms-w b")).map((e) => Number(e.textContent)) : null;
  });
  ok(sf && sf.length === 8 && sf[0] === 91 && sf[4] === 94,
    "6 Schaufenster mit eingetragen: App zuerst, Seite darunter (" + JSON.stringify(sf) + ")");
  await p.close();
}

// ── 7) Die echte Datei im Repo ist gueltiges JSON ───────────────────────────
{
  let o = null, fehler = "";
  try { o = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/config/messung-hand.json"), "utf8")); }
  catch (e) { fehler = String(e.message); }
  ok(o && typeof o === "object", "7a assets/config/messung-hand.json ist gueltiges JSON " + fehler);
  ok(o && typeof o._hinweis === "string" && o._hinweis.length > 200,
    "7b und traegt eine Anleitung, damit niemand raten muss");
}

console.log(`\nErgebnis: ${pass} bestanden, ${fail} durchgefallen`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);

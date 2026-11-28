/* Probe: Wegkippen und Schieberegler im Marktplatz (Klaus 2026-11-27).
 *
 * Klaus: „die klappen nach hinten weg und kommen unten wieder hoch" (wie PWA
 * Toolpoint) · Schieberegler „nur fürs Handy … nicht so riesig … schneller,
 * als wenn du mit der Hand scrollst". Entschieden: der Regler bewegt die
 * SEITE, rechnet aber über die LISTE (oben = erste App, unten = letzte).
 *
 * Gemessen im echten Browser: der Regler mit einem Zug vom Anfang bis ans
 * Ende, Tastatur, nur am Handy, nicht über der Mycel-Pille; das Kippen an
 * beiden Rändern, nicht bei „weniger Bewegung".
 *
 * Aufruf: node tests/smoke_blaettern.mjs */
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
  ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
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
} catch (e) { console.log("  ⊘ kein Browser — NICHT LAUFFÄHIG, nicht grün:", e.message); stumm = 1; }

async function seite(w, h, { ruhig = false } = {}) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: true,
    reducedMotion: ruhig ? "reduce" : "no-preference" });
  const pg = await ctx.newPage();
  await pg.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await pg.goto(`${basis}/markt.html`, { waitUntil: "load" });
  await pg.waitForSelector("#mkListings.gefuellt .listing", { timeout: 20000 });
  await pg.waitForTimeout(600);
  return { ctx, pg };
}
const zu = (pg, y) => pg.evaluate((y) => { scrollTo({ top: y, behavior: "instant" }); }, y).then(() => pg.waitForTimeout(250));
const listeOben = (pg) => pg.evaluate(() => document.getElementById("mkListings").getBoundingClientRect().top + scrollY);
const lage = (pg) => pg.evaluate(() => {
  const r = document.querySelector(".mk-regler");
  const b = r && !r.hidden ? r.getBoundingClientRect() : null;
  const g = r && r.querySelector(".mk-regler-griff").getBoundingClientRect();
  const k = [...document.querySelectorAll("#mkListings .listing")];
  const kopf = document.querySelector("header").getBoundingClientRect().bottom;
  /* Nur eine SCHWEBENDE Pille zählt; im Menü ☰ angedockt liegt sie nicht über der Liste. */
  let pille = document.getElementById("sbkim-rdv-btn");
  if (pille && getComputedStyle(pille).position !== "fixed") pille = null;
  return {
    da: !!r, sichtbar: !!b && getComputedStyle(r).display !== "none",
    box: b && { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width },
    griff: g && { w: g.width, h: g.height },
    rolle: r && r.getAttribute("role"), max: r && Number(r.getAttribute("aria-valuemax")),
    jetzt: r && Number(r.getAttribute("aria-valuenow")),
    n: k.length, kopf, innen: innerHeight, breite: innerWidth,
    erste: k[0].getBoundingClientRect().top, letzte: k[k.length - 1].getBoundingClientRect().bottom,
    pille: pille ? pille.getBoundingClientRect().top : null,
    weg: k.filter((e) => e.classList.contains("kipp-weg")).length,
    rein: k.filter((e) => e.classList.contains("kipp-rein")).length,
    /* ⚠ MIT LAYOUT-WERTEN, nicht mit getBoundingClientRect: eine gekippte
     * Karte schrumpft im Bild auf einen Strich und sähe dann „ganz sichtbar“
     * aus (erster Lauf: 9 Karten bei 1280 px, alle gekippt). */
    voll: k.filter((e) => { let t = 0, x = e; while (x) { t += x.offsetTop; x = x.offsetParent; }
      const top = t - scrollY; return top >= kopf && top + e.offsetHeight <= innerHeight; })
      .map((e) => e.classList.contains("kipp-weg") || e.classList.contains("kipp-rein")),
  };
});

if (br) {
  console.log("\nHandy 412×915 — der Schieberegler");
  {
    const { ctx, pg } = await seite(412, 915);
    await zu(pg, 0);
    const oben = await lage(pg);
    ok(oben.da && !oben.sichtbar, "ganz oben, vor der Liste, ist der Regler NICHT zu sehen");
    /* Seit dem Menü ☰ (2026-11-28) sitzt die Mycel-Pille dort angedockt. Wer
       sie einmal herausgezogen hat, hat sie aber unten rechts schweben — diese
       Lage wird hier gestellt, sonst wäre der Wächter darunter trivial grün. */
    await pg.evaluate(() => { const b = document.getElementById("sbkim-rdv-btn"); if (!b) return;
      document.body.appendChild(b); b.style.position = "fixed"; b.style.right = "10px"; b.style.bottom = "20px"; b.style.left = "auto"; b.style.top = "auto"; });
    await zu(pg, (await listeOben(pg)) + 1200);
    const m = await lage(pg);
    ok(m.sichtbar, "in der Liste ist er zu sehen");
    ok(m.rolle === "slider" && m.max === m.n && m.n >= 30, "er ist ein Schieberegler über alle Karten (Vorlesen: role=slider, aria-valuemax)", `${m.max} / ${m.n}`);
    ok(m.box && m.box.r >= m.breite - 4 && m.box.w <= 34 && m.griff.w <= 24,
      "er steht am rechten Rand und ist schmal (nicht riesig)", m.box ? `${Math.round(m.box.w)} px breit, Griff ${Math.round(m.griff.w)}×${Math.round(m.griff.h)}` : "");
    ok(m.box && m.box.t >= m.kopf, "er beginnt unter der Kopfleiste");
    ok(m.pille !== null && m.box && m.box.b <= m.pille, "er endet über der (schwebenden) Mycel-Pille, nicht unter ihr",
      m.pille === null ? "keine Pille" : `${Math.round(m.box.b)} ≤ ${Math.round(m.pille)}`);

    // Ein Zug von oben nach unten: das Ende der Liste.
    let b = await pg.locator(".mk-regler").boundingBox();
    await pg.mouse.move(b.x + b.width / 2, b.y + 5); await pg.mouse.down();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height - 2, { steps: 6 }); await pg.mouse.up();
    await pg.waitForTimeout(300);
    const u = await lage(pg);
    ok(u.jetzt === u.n && u.letzte <= u.innen + 2 && u.letzte > u.innen - 60,
      "EIN Zug nach unten bringt die letzte App an den unteren Rand", `Karte ${u.jetzt}/${u.n}, Unterkante ${Math.round(u.letzte)} von ${u.innen}`);
    b = await pg.locator(".mk-regler").boundingBox();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height - 5); await pg.mouse.down();
    await pg.mouse.move(b.x + b.width / 2, b.y + 2, { steps: 6 }); await pg.mouse.up();
    await pg.waitForTimeout(300);
    const o = await lage(pg);
    ok(o.jetzt === 1 && o.erste >= o.kopf - 2 && o.erste < o.kopf + 40,
      "EIN Zug nach oben bringt die erste App direkt unter die Kopfleiste", `Karte ${o.jetzt}, Oberkante ${Math.round(o.erste)} (Kopf ${Math.round(o.kopf)})`);

    // Tastatur: Ende und Anfang.
    await pg.focus(".mk-regler"); await pg.keyboard.press("End"); await pg.waitForTimeout(250);
    const e = await lage(pg);
    await pg.keyboard.press("Home"); await pg.waitForTimeout(250);
    const a = await lage(pg);
    ok(e.jetzt === e.n && a.jetzt === 1 && a.erste > e.erste, "mit der Tastatur: Ende und Anfang (Home/End)",
      `End → ${e.jetzt}, Home → ${a.jetzt}`);
    await ctx.close();
  }

  console.log("\nTablet und Monitor — kein Regler");
  for (const [w, h] of [[820, 1180], [1280, 800]]) {
    const { ctx, pg } = await seite(w, h);
    await zu(pg, (await listeOben(pg)) + 600);
    const m = await lage(pg);
    ok(m.da && !m.sichtbar, `${w} px: kein Regler (nur fürs Handy)`);
    await ctx.close();
  }

  console.log("\nWegkippen an beiden Rändern");
  for (const [w, h] of [[412, 915], [1280, 800]]) {
    const { ctx, pg } = await seite(w, h);
    await zu(pg, (await listeOben(pg)) + 900);
    const m = await lage(pg);
    ok(m.weg > 0, `${w} px: oben unter der Kopfleiste kippen Karten weg`, `${m.weg}`);
    ok(m.rein > 0, `${w} px: unten kommen Karten gekippt herein`, `${m.rein}`);
    ok(m.voll.length > 0 && m.voll.every((x) => !x), `${w} px: jede ganz sichtbare Karte steht gerade`, `${m.voll.length} ganz sichtbar`);
    // Wer misst, was er selbst verdreht, flackert: zweimal ausmessen ändert nichts.
    /* Zwischen den Runden die Kipp-Bewegung (0,42 s) ganz abwarten: erst die
     * fertig gekippte Karte zeigt, ob sie ihre eigene Messung verschiebt.
     * ⚠ Der erste Lauf maß zweimal direkt hintereinander und war BLIND.
     * ⚠ Und seit der flacheren Schwelle (0,35, 2026-11-28) lag an EINER Stelle
     * keine Karte mehr an der Grenze — wieder blind. Gemessen wird deshalb an
     * mehreren Stellen der Liste. */
    let flackert = [];
    for (const d of [900, 960, 1020, 1080, 1140, 1200]) {
      await zu(pg, (await listeOben(pg)) + d);
      await pg.waitForTimeout(500);
      const vor = await pg.evaluate(() => [...document.querySelectorAll("#mkListings .listing")].map((e) => e.className).join("|"));
      for (let i = 0; i < 2; i++) {
        await pg.evaluate(() => window.FP_MARKT_BLAETTERN.sammeln());
        await pg.waitForTimeout(600);
      }
      const nach = await pg.evaluate(() => [...document.querySelectorAll("#mkListings .listing")].map((e) => e.className).join("|"));
      if (vor !== nach) flackert.push(d);
    }
    ok(!flackert.length, `${w} px: neu ausmessen ändert nichts (kein Flackern)`, flackert.join(", "));
    /* Die Ursache selbst: gemerkt werden Layout-Werte, auch für gekippte Karten. */
    const abw = await pg.evaluate(() => {
      window.FP_MARKT_BLAETTERN.sammeln();
      const k = [...document.querySelectorAll("#mkListings .listing")], l = window.FP_MARKT_BLAETTERN.lagen();
      let n = 0;
      k.forEach((e, i) => { let t = 0, x = e; while (x) { t += x.offsetTop; x = x.offsetParent; if (x) t += x.clientTop || 0; }
        if (Math.abs(l[i][0] - t) > 1 || Math.abs(l[i][1] - e.offsetHeight) > 1) n++; });
      return { n, gekippt: k.filter((e) => e.classList.contains("kipp-weg") || e.classList.contains("kipp-rein")).length };
    });
    ok(abw.gekippt > 0 && abw.n === 0, `${w} px: gemerkt wird die Lage aus dem Layout, nicht die der gekippten Karte (kein Flackern)`, JSON.stringify(abw));
    await ctx.close();
  }

  console.log("\nWeniger Bewegung");
  {
    const { ctx, pg } = await seite(412, 915, { ruhig: true });
    await zu(pg, (await listeOben(pg)) + 900);
    const m = await lage(pg);
    const blass = await pg.evaluate(() => [...document.querySelectorAll("#mkListings .listing")]
      .filter((e) => getComputedStyle(e).opacity !== "1").length);
    ok(m.weg === 0 && m.rein === 0 && blass === 0, "bei „weniger Bewegung“ kippt nichts, und keine Karte ist unsichtbar", `weg ${m.weg} · rein ${m.rein} · blass ${blass}`);
    ok(m.sichtbar, "… der Regler bleibt (er ist keine Bewegung)");
    await ctx.close();
  }
  await br.close();
}
srv.close();
console.log(`\n${gruen} grün · ${rot} rot${stumm ? " · NICHT LAUFFÄHIG" : ""}`);
process.exit(rot || stumm ? 1 : 0);

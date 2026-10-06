/* Das Werbevideo im Rahmen der Startseite (Klaus 2026-10-06).
 *   node tests/smoke_werbevideo.mjs
 *
 * Klaus: „im Vorschaufenster der Startseite … nicht automatisch starten, sondern
 * erst auf Klick … gestreamt … Herunterladen … verschiedene Qualitäten … wieder
 * gestoppt … Vollbildmodus … Kommt man zurück, läuft das Video dort weiter."
 *
 * A · ohne Browser: die zwei Kopien aus FP-Videos sind BYTE-1:1 (SHA-256 gepinnt,
 *     und gegen den Nachbar-Klon, wenn einer daliegt), der Worker holt den Kern
 *     mit derselben ?v= wie der Vorrat, die Route steht VOR dem Ausstieg für
 *     fremde Ursprünge und vor jedem Vorrat.
 * B · echter Browser: die Seite, der echte Worker, die echten zwei Dateien. Nur
 *     die Video-Seite (github.io, aus dem Behälter gesperrt) wird gestellt — mit
 *     einem VP9-Stellvertreter, weil der Testbrowser kein H.264 spielt
 *     (gemessen in FP-Videos: canPlayType("avc1") ist leer).
 *
 * Drei Ausgänge: ✓ grün · ✗ ROT (Rückgabe 1) · ⊘ nicht lauffähig (Rückgabe 2).
 *
 * ⚠ BENANNTE GRENZEN: das echte MP4 am Tablet und am DeX, die echte Auslieferung
 * von github.io nach family-projekt.de (CORS) und das Vollbild am iPhone sind
 * hier NICHT gemessen. Das sagt erst Klaus' Sichttest. */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASIS = "https://lausiklauskn-png.github.io/Family-Projekt.de-Video/";
const PIN = {
  "assets/abspielen-kern.js": "8cfd9c05816c7c5519fe5799a644944c9346c36f578ec3176f720f8c3eed702d",
  "assets/abspielen-rahmen.js": "c0bc33335711bc65fb43d6b30b5a4d8073a424383bd200f56bb5bf0f4cbf992c"
};
let gruen = 0, rot = 0, stumm = 0;
const ok = (c, m, mehr) => { if (c) { gruen++; console.log("  ✓", m); } else { rot++; console.log("  ✗ ROT:", m + (mehr !== undefined ? "  → " + mehr : "")); } };
const nichtLauffaehig = (m, grund) => { stumm++; console.log("  ⊘ nicht lauffähig:", m, "—", grund); };
const sha = (b) => createHash("sha256").update(b).digest("hex");
const lesen = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
function ende() {
  console.log(`\n${gruen} grün · ${rot} ROT · ${stumm} nicht lauffähig`);
  process.exit(rot ? 1 : stumm ? 2 : 0);
}

/* ── A · ohne Browser ─────────────────────────────────────────────────── */
console.log("A · Kopien, Worker, Seite");
/* GEGENPROBE_PIN_AUS=1 setzt NUR den Pin aus: sonst wäre jede Sabotage am
   Spieler zuerst ein Pin-Bruch, und die Gegenprobe könnte keinen anderen
   Wächter messen. Der Pin hat dort seinen eigenen Fall, ohne den Schalter. */
const PIN_AUS = process.env.GEGENPROBE_PIN_AUS === "1";
if (PIN_AUS) console.log("  · Pin und Nachbar-Vergleich ausgesetzt (GEGENPROBE_PIN_AUS=1)");
else for (const [datei, soll] of Object.entries(PIN)) {
  const da = fs.existsSync(path.join(ROOT, datei));
  ok(da && sha(fs.readFileSync(path.join(ROOT, datei))) === soll, `${datei} ist die gepinnte Kopie aus FP-Videos (SHA-256)`);
}
const nachbar = process.env.FP_VIDEOS || path.join(ROOT, "..", "family-projekt.de-video");
if (PIN_AUS) { /* s. o. */ }
else if (fs.existsSync(path.join(nachbar, "assets/abspielen-rahmen.js"))) {
  for (const datei of Object.keys(PIN)) {
    ok(sha(fs.readFileSync(path.join(nachbar, datei))) === sha(fs.readFileSync(path.join(ROOT, datei))),
      `${datei} ist byte-gleich mit dem Nachbar-Klon von FP-Videos`);
  }
} else console.log("  · kein Nachbar-Klon von FP-Videos — nur gegen den Pin geprüft");

const sw = lesen("sw.js");
const assetV = (/var ASSET_V = "(\d+)"/.exec(sw) || [])[1];
const imp = /importScripts\("(assets\/abspielen-kern\.js\?v=(\d+))"\)/.exec(sw);
ok(!!imp && imp[2] === assetV && sw.includes(`"${imp[1]}"`), "der Worker holt den Kern mit derselben ?v= wie ASSET_V und der Vorrat", imp && imp[1]);
ok(sw.includes(`"assets/abspielen-rahmen.js?v=${assetV}"`), "der Rahmen-Spieler steht mit ?v=ASSET_V im Vorrat");
ok(sw.includes(`var VIDEO_BASIS = "${BASIS}"`), "die Video-Seite steht EINMAL als VIDEO_BASIS im Worker");
const iRoute = sw.indexOf("FPAbspielKern.antwort(");
const iFremd = sw.indexOf("if (url.origin !== self.location.origin) return;");
const iVorrat = sw.indexOf("caches.match(", sw.indexOf('addEventListener("fetch"'));
ok(iRoute > 0 && iRoute < iFremd && iRoute < iVorrat, "die Video-Route steht vor dem Ausstieg für fremde Ursprünge und vor jedem Vorrat");
ok(/VIDEO_WEG = \/\^\\\/werbevideo\\\/\(\[a-z0-9\]\[a-z0-9-\]\{1,59\}\)\\\.mp4\$\//.test(sw), "die Route nimmt nur werbevideo/<kennung>.mp4, die Kennung wie in FP-Videos");

const idx = lesen("index.html");
const pad = (/<div class="pad" id="tagesbildPad"[^>]*>/.exec(idx) || [""])[0];
ok(/data-video-rahmen/.test(pad), "der Spieler sitzt IM Bildrahmen der Startseite (#tagesbildPad)");
ok(new RegExp(`<script defer src="assets/abspielen-rahmen\\.js\\?v=${assetV}"></script>`).test(idx), "index.html lädt den Spieler mit defer und ?v=ASSET_V");
ok(/<img class="tagesimg"[^>]*fetchpriority="high"/.test(idx), "das Bild bleibt das Vorschaubild (LCP: im HTML, fetchpriority high)");
ok(!/<video/.test(idx), "kein <video> im HTML — vor dem Tipp gibt es nichts zu laden");
ok(/data-video-merken="fp_werbevideo_stelle"/.test(pad), "die Stelle wird unter dem eigenen Schlüssel fp_werbevideo_stelle gemerkt");
const fassungen = ((/data-video-fassungen="([^"]*)"/.exec(pad) || [])[1] || "").split(/\s+/).filter(Boolean);
ok(fassungen.length >= 3, "drei Qualitäten zum Streamen und Herunterladen", fassungen.join(" "));

/* ── B · echter Browser ───────────────────────────────────────────────── */
console.log("\nB · im Browser");
/* Ohne diesen Schalter sieht Playwright den Netzverkehr des SERVICE-WORKERS
   nicht: seine Abrufe an github.io gingen an der gestellten Seite vorbei ins
   (gesperrte) Netz, und der Kern antwortete 503. Gemessen 2026-10-06. */
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";
let pw;
try { pw = await import(process.env.PW_CORE || "playwright-core"); }
catch (e) {
  try { pw = await import("/opt/node-tools/node_modules/playwright-core/index.mjs"); }
  catch (e2) { nichtLauffaehig("Browser-Teil", "playwright-core fehlt"); ende(); }
}
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
if (!fs.existsSync(exe)) { nichtLauffaehig("Browser-Teil", "kein Chromium unter " + exe); ende(); }

/* Die gestellte Video-Seite: je Fassung ein eigener VP9-Film (verschiedene
   Bildgröße, damit ein Wechsel sichtbar wird), in Teile zerlegt, mit Liste. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fp-werbevideo-"));
const TEIL = 120000;
const gestellt = new Map();
const liste = { fassung: 1, videos: [] };
try {
  const groesse = { "480p": "320x180", "720p": "480x270", "1080p": "640x360" };
  for (const f of fassungen) {
    const [id, name] = f.split(":");
    const datei = path.join(tmp, id + ".webm");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `testsrc2=size=${groesse[name] || "320x180"}:rate=25`,
      "-f", "lavfi", "-i", "sine=frequency=440", "-t", "24", "-c:v", "libvpx-vp9", "-b:v", "500k", "-c:a", "libopus", "-shortest", datei]);
    const b = fs.readFileSync(datei);
    const teile = [];
    for (let i = 0, n = 0; i < b.length; i += TEIL, n++) {
      const t = b.subarray(i, Math.min(b.length, i + TEIL));
      gestellt.set(`videos/${id}/teil-${String(n).padStart(2, "0")}.bin`, t);
      teile.push({ groesse: t.length, sha256: sha(t) });
    }
    liste.videos.push({ id, titel: id, groesse: b.length, sha256: sha(b), teile });
  }
  gestellt.set("videos.json", Buffer.from(JSON.stringify(liste)));
} catch (e) {
  fs.rmSync(tmp, { recursive: true, force: true });
  nichtLauffaehig("Browser-Teil", "ffmpeg mit libvpx-vp9 fehlt: " + (e.message || e).split("\n")[0]);
  ende();
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });

const abrufe = [];   /* jeder Abruf an die Video-Seite, auch aus dem Worker */
async function neuerKontext(breite) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 800 }, serviceWorkers: "allow" });
  /* Fremdes aus dem Netz (Schriften, Relais, Modelle) bleibt draußen; nur die Video-Seite wird gestellt. */
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const u = route.request().url();
    if (!u.startsWith(BASIS)) return route.abort();
    const rel = u.slice(BASIS.length).split("?")[0];
    abrufe.push({ rel, t: Date.now() });
    const b = gestellt.get(rel);
    if (!b) return route.fulfill({ status: 404, body: "404" });
    return route.fulfill({ status: 200, body: b, headers: { "access-control-allow-origin": "*", "content-type": rel.endsWith(".json") ? "application/json" : "application/octet-stream" } });
  });
  return ctx;
}
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
async function bis(p, fn, arg, ms = 15000) {
  try { await p.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; }
}
const zustand = (p) => p.evaluate(() => {
  const s = window.__rahmenSpieler && window.__rahmenSpieler[0];
  if (!s) return null;
  const r = s.rahmen, v = s.vid;
  return {
    zustand: s.zustand(), aktiv: s.aktiv(), src: v.getAttribute("src"), t: v.currentTime, paused: v.paused,
    knopf: r.querySelector(".vr-spielen").getAttribute("data-symbol"), schicht: !r.querySelector(".vr-schicht").hidden,
    titel: r.querySelector(".vr-titel").textContent, merk: localStorage.getItem("fp_werbevideo_stelle"),
    meldung: r.querySelector(".vr-meldung").hidden ? "" : r.querySelector(".vr-meldung").textContent,
    modal: !!document.querySelector(".fp-bild-modal.open"), voll: document.fullscreenElement === r
  };
});

try {
  /* B1 · vor dem Tipp: nichts geladen, Bild steht, Leiste im Rahmen */
  const ctx = await neuerKontext(380);
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(String(e)));
  await p.goto(base + "/index.html", { waitUntil: "load" });
  ok(await bis(p, () => window.__rahmenSpieler && window.__rahmenSpieler.length === 1), "der Spieler hat sich in den Rahmen gebaut");
  await warte(1500);
  let z = await zustand(p);
  ok(z && z.zustand === "ruhe" && !z.src && !z.schicht, "vor dem Tipp: ruhend, keine Quelle, das Bild ist zu sehen", JSON.stringify(z));
  ok(abrufe.length === 0, "vor dem Tipp: kein einziger Abruf an die Video-Seite", abrufe.map((a) => a.rel).join(","));
  ok(z && z.knopf === "spielen", "der Knopf zeigt ▶, solange es nicht läuft", z && z.knopf);
  const lage = await p.evaluate(() => {
    const pad = document.getElementById("tagesbildPad"), r = pad.getBoundingClientRect();
    const l = pad.querySelector(".vr-leiste").getBoundingClientRect();
    const img = pad.querySelector("img.tagesimg");
    const knoepfe = [...pad.querySelectorAll(".vr-leiste button")].filter((b) => b.offsetParent);
    return { innen: l.left >= r.left && l.right <= r.right && l.top >= r.top && l.bottom <= r.bottom,
      verhaeltnis: r.width / r.height, img: !!img && img.complete,
      abgeschnitten: knoepfe.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.className) };
  });
  ok(lage.innen, "die Bedienung liegt IM Rahmen (Klaus: „mit in dem Container“)");
  ok(Math.abs(lage.verhaeltnis - 2.5016) < 0.02, "der Rahmen behält sein Maß — die Leiste schiebt nichts (CLS)", lage.verhaeltnis.toFixed(4));
  ok(lage.img, "das Bild des Tages ist geladen und bleibt im Rahmen");

  /* B2 · erster Tipp: streamt, ⏸, Teile werden geholt */
  /* Die kreisenden Punkte stehen nur kurz da — ein Beobachter merkt sich, ob
     sie je SICHTBAR waren, statt einen Augenblick zu erwischen. */
  await p.evaluate(() => {
    window.__punkteGesehen = 0;
    const pad = document.getElementById("tagesbildPad");
    const sieh = () => { pad.querySelectorAll(".vr-punkte").forEach((e) => {
      if (e.offsetParent && e.querySelectorAll("i").length === 8) window.__punkteGesehen++; }); };
    new MutationObserver(sieh).observe(pad, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden"] });
  });
  await p.click("#tagesbildPad .vr-spielen");
  ok(await bis(p, () => { const s = window.__rahmenSpieler[0]; return s.vid.currentTime > 1 && !s.vid.paused; }, null, 25000),
    "nach dem Tipp läuft das Video im Rahmen", JSON.stringify(await zustand(p)));
  z = await zustand(p);
  ok(z.knopf === "pause", "der Knopf zeigt ⏸, solange es läuft", z.knopf);
  ok(/^werbevideo\/werbevideo-67s-720p\.mp4$/.test(z.src || ""), "gestreamt wird über den Worker, zuerst 720p", z.src);
  ok(abrufe.some((a) => /teil-\d\d\.bin$/.test(a.rel)), "die Teile kommen von der Video-Seite");
  ok(fehler.length === 0, "keine Skriptfehler auf der Seite", fehler.join(" | "));
  ok(await p.evaluate(() => window.__punkteGesehen > 0), "beim Laden kreisen Punkte (acht, sichtbar) — man sieht, dass es noch lädt");
  const form = await p.evaluate(() => {
    const s = window.__rahmenSpieler[0], r = s.rahmen.getBoundingClientRect(), v = s.vid.getBoundingClientRect();
    return { rahmen: r.width / r.height, film: s.vid.videoWidth / s.vid.videoHeight, vb: v.width / r.width, vh: v.height / r.height,
      knopf: (() => { const b = s.rahmen.querySelector(".vr-spielen").getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; })() };
  });
  ok(form.film > 1 && Math.abs(form.rahmen - form.film) / form.film < 0.02,
    "beim Abspielen nimmt der Rahmen die Form des Films an — keine schwarzen Balken", `${form.rahmen.toFixed(4)} gegen ${form.film.toFixed(4)}`);
  ok(form.vb > 0.98 && form.vh > 0.98, "der Film füllt den Rahmen", JSON.stringify(form));
  ok(form.knopf, "die Leiste steht nach dem Start im Fenster");
  const balken = await p.evaluate(() => {
    const z = document.querySelector("#tagesbildPad .vr-zeit");
    return { bg: z.style.background, text: z.getAttribute("aria-valuetext") || "", sichtbar: !!z.offsetParent };
  });
  const proz = [...balken.bg.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1]));
  ok(balken.sichtbar && proz.length >= 4 && proz[proz.length - 1] > proz[0] && proz[0] > 0 && /geladen bis [1-9]|geladen bis 0:[0-9]*[1-9]/.test(balken.text),
    "der Ladebalken zeigt Gespieltes und mehr Geladenes", balken.text + " · " + proz.join(","));

  /* B3 · Tippen in der Leiste zählt nicht zum Fünffach-Tipp aufs Bild */
  /* element.click() statt p.click: öffnet sich das Fenster doch, verdeckt sein
     Hintergrund den Knopf, und p.click wartete 30 s und würfe — dann trüge die
     rote Zeile den Namen eines Zeitablaufs statt den dieser Zusicherung. */
  for (let i = 0; i < 6; i++) { await p.evaluate(() => document.querySelector("#tagesbildPad .vr-spielen").click()); await warte(150); }
  z = await zustand(p);
  ok(!z.modal, "sechs Tipps in der Leiste öffnen NICHT das Bild-Wechsel-Fenster");
  ok(!z.paused && z.knopf === "pause", "sechsmal ▶/⏸ getippt: es läuft wieder, der Knopf zeigt ⏸", z.knopf);

  /* B4 · weiter scrollen: es läuft weiter */
  const t0 = (await zustand(p)).t;
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await warte(1500);
  z = await zustand(p);
  ok(!z.paused && z.t > t0 + 0.8, "beim Weiterscrollen läuft es weiter", `${t0.toFixed(1)} → ${z.t.toFixed(1)}`);
  await p.evaluate(() => window.scrollTo(0, 0));

  /* B5 · Menü: drei Qualitäten, drei Downloads mit Größe, Wechsel behält die Stelle */
  await p.click("#tagesbildPad .vr-mehr");
  ok(await bis(p, () => [...document.querySelectorAll("#tagesbildPad .vr-laden")].every((a) => / MB$/.test(a.textContent)), null, 5000),
    "das Menü nennt die Größen aus der Liste der Video-Seite");
  const menue = await p.evaluate(() => ({
    q: [...document.querySelectorAll("#tagesbildPad .vr-fassung")].map((b) => b.textContent + (b.getAttribute("aria-pressed") === "true" ? "*" : "")),
    l: [...document.querySelectorAll("#tagesbildPad .vr-laden")].map((a) => a.getAttribute("href"))
  }));
  ok(menue.q.length === 3 && menue.q.includes("720p*"), "drei Qualitäten zur Wahl, 720p ist gewählt", menue.q.join(" "));
  ok(menue.l.length === 3 && menue.l.every((h) => h.startsWith(BASIS + "index.html?laden=werbevideo-67s")),
    "drei Downloads, jeder auf die Video-Seite (dort geprüft und gespeichert)", menue.l.join(" "));
  /* Gemessen wird die ERSTE Zeitmeldung nach dem Wechsel. Ein Warten auf
     „currentTime ≥ alte Stelle" wäre auch dann grün, wenn das Video vorn
     beginnt und in den 20 s einfach dorthin spielt — so war es blind
     (Gegenprobe QUALITAET, 2026-10-06). */
  await p.evaluate(() => {
    const v = window.__rahmenSpieler[0].vid;
    window.__ersteNachWechsel = null;
    const f = () => { if (/480p/.test(v.getAttribute("src") || "") && !v.seeking && window.__ersteNachWechsel === null && v.readyState >= 1) { window.__ersteNachWechsel = v.currentTime; } };
    v.addEventListener("timeupdate", f);
  });
  const vorWechsel = (await zustand(p)).t;
  await p.click('#tagesbildPad .vr-fassung[data-fassung="werbevideo-67s-480p"]');
  const wechselDa = await bis(p, () => window.__ersteNachWechsel !== null && !window.__rahmenSpieler[0].vid.paused, null, 20000);
  const erste = await p.evaluate(() => window.__ersteNachWechsel);
  ok(wechselDa && vorWechsel > 1 && erste >= vorWechsel - 1,
    "Qualität wechseln: 480p, läuft weiter an derselben Stelle", `vorher ${vorWechsel.toFixed(1)} s · erste Meldung danach ${erste === null ? "keine" : erste.toFixed(1) + " s"}`);
  await p.click("#tagesbildPad .vr-zu");

  /* B6 · Vollbild und zurück: läuft weiter */
  await p.click("#tagesbildPad .vr-voll");
  const vollAn = await bis(p, () => document.fullscreenElement === document.getElementById("tagesbildPad"), null, 5000);
  if (!vollAn) nichtLauffaehig("Vollbild", "der Testbrowser hat kein Vollbild gewährt");
  else {
    const lv = await p.evaluate(() => { const l = document.querySelector("#tagesbildPad .vr-leiste").getBoundingClientRect(); return { b: l.width, sichtbar: l.height > 0 }; });
    ok(lv.sichtbar && lv.b > 300, "im Vollbild ist dieselbe Bedienung da, breit", lv.b);
    /* ±10 s: in der Leiste, wenn sie breit genug ist — sonst im Menü. Erreichbar sein müssen sie immer. */
    const inLeiste = await p.isVisible("#tagesbildPad .vr-zurueck");
    let imMenue = false;
    if (!inLeiste) {
      const vor = (await zustand(p)).t;
      await p.click("#tagesbildPad .vr-mehr");
      await p.click('#tagesbildPad .vr-spring[data-sprung="10"]');
      await warte(200);
      imMenue = (await zustand(p)).t >= vor + 9;
      await p.click("#tagesbildPad .vr-zu");
    }
    ok(inLeiste || imMenue, "im Vollbild sind ±10 s erreichbar (" + (inLeiste ? "in der Leiste" : "im Menü, weil hochkant schmal") + ")");
    await p.click("#tagesbildPad .vr-voll");
    await bis(p, () => !document.fullscreenElement, null, 5000);
    const t1 = (await zustand(p)).t; await warte(1000); z = await zustand(p);
    ok(!z.voll && !z.paused && z.t > t1 + 0.5, "nach dem Vollbild läuft es im Rahmen weiter", `${t1.toFixed(1)} → ${z.t.toFixed(1)}`);
  }

  /* B7 · Anhalten merkt die Stelle, neu laden bietet „weiter bei“ an */
  await p.click("#tagesbildPad .vr-spielen");
  await warte(300);
  z = await zustand(p);
  const gemerkt = z.merk ? JSON.parse(z.merk).t : 0;
  ok(z.paused && z.knopf === "spielen" && gemerkt > 2, "Anhalten: ▶ und die Stelle ist gemerkt", z.merk);
  await p.reload({ waitUntil: "load" });
  await bis(p, () => window.__rahmenSpieler && window.__rahmenSpieler.length === 1);
  z = await zustand(p);
  ok(z.zustand === "ruhe" && /weiter bei/.test(z.titel), "nach dem Neuladen: kein Selbststart, aber „weiter bei …“", z.titel);
  await p.click("#tagesbildPad .vr-spielen");
  ok(gemerkt > 2 && await bis(p, (t) => { const s = window.__rahmenSpieler[0]; return !s.vid.paused && s.vid.currentTime >= t - 1; }, gemerkt, 20000),
    "nach dem Zurückkommen läuft es an der gemerkten Stelle weiter", `${gemerkt} → ${(await zustand(p)).t.toFixed(1)}`);

  /* B8 · Stopp: Bild wieder da, Quelle weg, kein Laden mehr, Stelle vergessen */
  await p.click("#tagesbildPad .vr-stopp");
  await warte(300);
  z = await zustand(p);
  ok(z.zustand === "ruhe" && !z.src && !z.schicht && z.knopf === "spielen", "Stopp: das Bild steht wieder da, ▶, keine Quelle", JSON.stringify(z));
  ok(z.merk === null, "Stopp vergisst die Stelle — der nächste Start beginnt vorn", z.merk);
  const ruheForm = await p.evaluate(() => { const r = document.getElementById("tagesbildPad").getBoundingClientRect(); return r.width / r.height; });
  ok(Math.abs(ruheForm - 2.5016) < 0.02, "nach dem Stopp hat der Rahmen wieder das Maß des Bildes", ruheForm.toFixed(4));
  const n0 = abrufe.length; await warte(2000);
  ok(abrufe.length === n0, "nach dem Stopp wird nichts mehr geholt", abrufe.slice(n0).map((a) => a.rel).join(","));
  await ctx.close();

  /* B10 · zu Ende gespielt: zurück in die Grundansicht (Klaus 2026-10-06) */
  {
    const c = await neuerKontext(380); const q = await c.newPage();
    await q.goto(base + "/index.html", { waitUntil: "load" });
    await bis(q, () => window.__rahmenSpieler && window.__rahmenSpieler.length === 1);
    await q.click("#tagesbildPad .vr-spielen");
    const lief = await bis(q, () => { const s = window.__rahmenSpieler[0]; return !s.vid.paused && s.vid.currentTime > 0.5 && s.vid.duration > 3; }, null, 25000);
    ok(lief, "B10: das Video läuft an");
    await q.evaluate(() => { const v = window.__rahmenSpieler[0].vid; v.currentTime = Math.max(0, v.duration - 1.2); });
    const zurueck = await bis(q, () => window.__rahmenSpieler[0].zustand() === "ruhe", null, 20000);
    const zz = await zustand(q);
    ok(zurueck && zz.zustand === "ruhe" && !zz.src && !zz.schicht && zz.knopf === "spielen",
      "am Ende geht es von selbst zurück in die Grundansicht: Bild, ▶, keine Quelle", JSON.stringify(zz));
    ok(zz.merk === null, "am Ende wird keine Stelle gemerkt — der nächste Start beginnt vorn", zz.merk);
    const f2 = await q.evaluate(() => { const r = document.getElementById("tagesbildPad").getBoundingClientRect(); return r.width / r.height; });
    ok(Math.abs(f2 - 2.5016) < 0.02, "am Ende hat der Rahmen wieder das Maß des Bildes", f2.toFixed(4));
    await c.close();
  }

  /* B9 · schmale Handys: alles passt, nichts abgeschnitten */
  for (const breite of [320, 360, 380, 412]) {
    const c = await neuerKontext(breite); const q = await c.newPage();
    await q.goto(base + "/index.html", { waitUntil: "load" });
    await bis(q, () => window.__rahmenSpieler && window.__rahmenSpieler.length === 1);
    await q.click("#tagesbildPad .vr-spielen");
    await bis(q, () => window.__rahmenSpieler[0].zustand() !== "ruhe" && !window.__rahmenSpieler[0].vid.paused, null, 20000);
    const m = await q.evaluate(() => {
      const pad = document.getElementById("tagesbildPad"), r = pad.getBoundingClientRect();
      const sicht = [...pad.querySelectorAll(".vr-leiste > *")].filter((e) => e.offsetParent);
      return { raus: sicht.filter((e) => { const b = e.getBoundingClientRect(); return b.left < r.left - 0.5 || b.right > r.right + 0.5; }).map((e) => e.className),
        knapp: sicht.filter((e) => e.tagName === "BUTTON" && e.scrollWidth > e.clientWidth + 1).map((e) => e.className),
        zeit: Math.round((pad.querySelector(".vr-zeit").getBoundingClientRect()).width),
        seite: document.documentElement.scrollWidth <= innerWidth };
    });
    ok(m.raus.length === 0 && m.knapp.length === 0 && m.zeit >= 30 && m.seite,
      `${breite} px: Leiste passt in den Rahmen, kein Knopf abgeschnitten, Ladebalken ${m.zeit} px breit`, JSON.stringify(m));
    await q.click("#tagesbildPad .vr-mehr");
    await bis(q, () => document.querySelectorAll("#tagesbildPad .vr-laden").length === 3, null, 5000);
    const mh = await q.evaluate(() => { const m = document.querySelector("#tagesbildPad .vr-menue"); return { voll: m.scrollHeight, sicht: m.clientHeight }; });
    ok(mh.voll <= mh.sicht + 1, `${breite} px: das Menü passt ohne Rollen in den Rahmen`, JSON.stringify(mh));
    await c.close();
  }
} catch (e) {
  /* Eine Probe, die stolpert, ist ROT — mit dem Namen des Stolperns, und alles
     dahinter gilt als ungemessen. */
  ok(false, "die Probe ist unterwegs gestolpert (alles danach ungemessen)", String(e && e.message || e).split("\n")[0]);
} finally {
  await browser.close();
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
ende();

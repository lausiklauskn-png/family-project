/* Headless-Smoke: baut das Studio ein Paket, das die Leseseite auch annimmt?
 *   node tests/smoke_studio_vectors.mjs
 *
 * Das ist der eigentliche Punkt dieses Tests. Schreib- und Leseseite sind zwei
 * Dateien (assets/studio-markt.js und markt.html), die an vier Stellen exakt
 * übereinstimmen müssen: Text-Regel, Modell-Kennung, Dimension, Codec. Weicht
 * eine ab, passiert etwas Unangenehmes — nichts stürzt ab. Die Leseseite ist
 * fail-soft und rechnet klaglos alles selbst nach. Das Paket liegt dann nutzlos
 * herum, und niemand merkt es, weil die Suche ja funktioniert. Nur eben so
 * langsam wie vorher.
 *
 * Deshalb prüft dieser Test nicht die Form des Pakets, sondern seine WIRKUNG:
 * das Studio baut ein Paket, dieses Paket wird der Leseseite vorgelegt, und
 * dann werden die Einbettungen gezählt. 0 heißt: die beiden Seiten passen
 * zusammen. Jede Zahl darüber heißt: sie tun es nicht.
 *
 * Gegenprobe beim Bauen (2026-07-31, damit sie niemand wiederholen muss): In
 * studio-markt.js `x.text || x.label` durch `x.label` ersetzt — Fall (2) fiel
 * mit 14 statt 0 durch. Modell-Kennung auf einen festen Wert gesetzt statt aus
 * `_meta` gelesen — Fall (4) fiel durch. Der Test fängt also genau die zwei
 * Fehler, für die er da ist.
 *
 * Teil A2 prüft den Befund vom 2026-08-01 aus Klaus' erstem echten Lauf: Er
 * baute 14 saubere Vektoren, von denen die Leseseite nur 4 nutzen konnte. Sein
 * Browser hatte eine gecachte listings.js vom 26.07. (Caddy: sieben Tage für
 * *.js, und die Datei wird ohne ?v= geladen), während die Seite live die Texte
 * vom 31.07. zeigte. Nichts stürzte ab, die Meldung sagte „14 Einträge", der
 * Hash-Wächter verwarf still und rechnete nach — alles funktionierte, es
 * brachte nur nichts. Der Test setzt genau diese Lage nach: window.FP_LISTINGS
 * bekommt veraltete Texte, der Server liefert die richtigen. Das Paket muss die
 * SERVER-Texte tragen.
 *
 * Teil B prüft die Server-Seite mit ECHTEN Anfragen (php -S, kein Netz nach
 * außen): commit_vectors muss ein leeres oder kaputtes Paket ablehnen, BEVOR es
 * committet wird. Ohne php im System wird Teil B ehrlich übersprungen.
 */
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import os from "node:os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png" };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  const fp = path.join(ROOT, p === "/" ? "/index.html" : p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"] });

const DIM = 384;
const MODEL = "Xenova/multilingual-e5-small";
const API_URL = "https://beispiel.invalid/marktplatz-api.php";
/* Der Stern am Ende ist Pflicht, nicht Zierde: Playwright-Globs vergleichen die
 * GANZE Adresse samt Query. Das Studio haengt beim Pruefen ein `?ts=…` an
 * (Cache-Umgehung) — ohne den Stern greift die Umleitung dort nicht, der Test
 * bekommt die echte Datei aus dem Repo und misst etwas ganz anderes, als er
 * glaubt. Genau das ist beim Bauen passiert. */
const VEC_PFAD = "**/assets/config/listings-vec.json*";

/* Setzt den Modell-Stub. Identisch zu smoke_markt_vecpack.mjs — mit Absicht:
 * beide Seiten müssen an DEMSELBEN Modell zusammenpassen, sonst prüft der
 * Vergleich nichts. Vektoren auf einem Kreis, Winkel aus der Textlänge: klare
 * Abstände, eindeutige Reihenfolge. Zufallsnahe Vektoren wären in 384
 * Dimensionen alle gleich weit weg und der Test würde Rauschen messen.
 *
 * Der Stub muss NACH dem Laden gesetzt werden — sbkim/03_embedding.js
 * überschreibt window.SbkimEmbedding, ein addInitScript wäre wirkungslos und
 * der Test hinge am echten 30-MB-Modell. */
async function stubSetzen(page) {
  await page.evaluate(({ dim, model }) => {
    window.__embedCount = 0;
    const vecFor = (t) => {
      const v = new Float32Array(dim);
      const winkel = ((String(t).length % 40) / 40) * Math.PI * 0.5;
      v[0] = Math.cos(winkel); v[1] = Math.sin(winkel);
      return v;
    };
    window.__vecFor = vecFor;
    window.SbkimEmbedding = {
      _meta: { model, dim },
      // init() meldet Fortschritt wie das echte Modul 03 (emitProgress:
      // {status, file, progress 0-100}). Ohne diese Meldungen liesse sich der
      // Ladebalken des Studios nicht pruefen.
      init: async () => {
        for (const p of [25, 60, 90]) {
          window.dispatchEvent(new CustomEvent("sbkim:embedding-progress", {
            detail: { status: "progress", file: "model.onnx", progress: p },
          }));
          await new Promise((r) => setTimeout(r, 20));
        }
      },
      embedQuery: async (t) => vecFor("q:" + t),
      embedPassageBatch: async (texts) => { window.__embedCount += texts.length; return texts.map(vecFor); },
    };
  }, { dim: DIM, model: MODEL });
}

/* Schreibt jede angezeigte Balken-Breite mit.
 *
 * Nachsehen reicht hier nicht: das Studio raeumt die Anzeige am Ende selbst auf
 * (vecStatus("")), und der Lauf dauert im Test Millisekunden. Wer erst hinterher
 * hinsieht, findet ein leeres Feld und kann nicht unterscheiden, ob der Balken
 * nie da war oder schon wieder weg ist. Dieselbe Lehre wie in
 * smoke_markt_melden.mjs. An `document` haengen, nicht an documentElement — das
 * Skript laeuft vor dem Seitenaufbau. */
async function balkenMitschreiben(page) {
  await page.evaluate(() => {
    window.__balken = [];
    window.__statusTexte = [];
    new MutationObserver(() => {
      const f = document.querySelector("[data-role=vecstatus] .fpst-vecbar-fill");
      if (f) {
        const b = f.style.width + (f.classList.contains("is-unbekannt") ? " (unbekannt)" : "");
        if (window.__balken[window.__balken.length - 1] !== b) window.__balken.push(b);
      }
      const t = document.querySelector("[data-role=vecstatus] .fpst-vectext");
      const txt = t ? (t.textContent || "").trim() : "";
      if (txt && window.__statusTexte[window.__statusTexte.length - 1] !== txt) window.__statusTexte.push(txt);
    }).observe(document, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "class"] });
  });
}

/* ═════════════════ Teil A — Schreibseite baut, Leseseite nimmt an ═════════════════ */
console.log("Studio — Vektoren bauen");

let paket = null;
{
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push("pageerror: " + e.message));

  // Studio-Passwort VOR dem Laden hinterlegen — das Studio liest es beim Öffnen
  // aus localStorage (fpstudio_srv_key).
  await ctx.addInitScript(() => { try { localStorage.setItem("fpstudio_srv_key", "test-passwort"); } catch (e) {} });
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await stubSetzen(page);

  // Server-Adresse setzen: das Studio liest FP_MARKT_API einmalig beim Laden in
  // seine Variable API. Neu laden geht nicht (der Stub wäre weg), also wird die
  // Adresse hier gesetzt und das Studio-Skript danach erneut ausgewertet.
  const studioSrc = fs.readFileSync(path.join(ROOT, "assets/studio-markt.js"), "utf8");
  await page.evaluate(({ api, src }) => {
    window.FP_MARKT_API = api;
    // eslint-disable-next-line no-eval
    (0, eval)(src);
  }, { api: API_URL, src: studioSrc });

  /* Kein Alt-Paket für diesen Fall — hier soll von Null gebaut werden.
   *
   * Ohne diese Umleitung liefert der Test-Server die ECHTE
   * assets/config/listings-vec.json aus dem Repo, und der inkrementelle Bau
   * übernimmt daraus die Vektoren, deren Hash zufällig noch passt. Die stammen
   * vom echten Modell, der Test rechnet aber mit einem Stub — das Ergebnis war
   * ein Paket aus zwei Welten, und die Proben (12) und (38) fielen mit einem
   * Cosinus von -0,03 durch. Der Code hatte recht, der Test war unvollständig. */
  await page.route(VEC_PFAD, (route) => route.fulfill({ status: 404, body: "404", headers: { "cache-control": "no-store" } }));

  // Den Commit abfangen, statt ihn zu verschicken.
  let gesehen = null;
  await page.route("**/marktplatz-api.php*", (route) => {
    try { gesehen = JSON.parse(route.request().postData() || "{}"); } catch (_e) { gesehen = { kaputt: true }; }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, info: "abc1234" }) });
  });

  await page.evaluate(() => window.FPStudio.open());
  await balkenMitschreiben(page);
  const knopf = await page.$("[data-role=vecbtn]");
  ok(!!knopf, "(1) Knopf „Vektoren bauen“ ist im Studio-Panel");
  if (knopf) await knopf.click();

  // Auf das ERGEBNIS warten, nicht auf die Uhr. Das Ergebnis ist der
  // abgefangene Commit selbst — er kommt erst, wenn ALLE Vektoren fertig sind
  // (ein halbes Paket wird nie geschickt). Ein festes setTimeout hätte hier
  // dieselbe Flacker-Falle wie in smoke_markt_vecpack.mjs.
  for (let i = 0; i < 200 && !gesehen; i++) await page.waitForTimeout(50);

  ok(!!gesehen, "(2) Studio schickt einen Commit an die Server-API");
  ok(gesehen && gesehen.action === undefined && typeof gesehen.content === "string", "(3) Nutzlast enthält ein content-Feld");
  ok(gesehen && gesehen.key === "test-passwort", "(4) Studio-Passwort geht mit (require_key auf der Server-Seite)");

  if (gesehen && gesehen.content) {
    try { paket = JSON.parse(gesehen.content); } catch (_e) { paket = null; }
  }
  ok(!!paket, "(5) content ist gültiges JSON");
  if (paket) {
    ok(paket.model === MODEL, `(6) model kommt aus SbkimEmbedding._meta (${paket.model})`);
    ok(paket.dim === DIM, `(7) dim kommt aus SbkimEmbedding._meta (${paket.dim})`);
    ok(paket.quant === "int8-sym-b64", "(8) quant-Kennung gesetzt");
    ok(paket.version === 1, "(9) version 1");
    const anzahl = Object.keys(paket.vectors || {}).length;
    const soll = await page.evaluate(() => (window.FP_LISTINGS || []).filter((x) => x && x.anchorId && (x.text || x.label)).length);
    ok(anzahl === soll && anzahl > 0, `(10) ein Vektor je Eintrag (${anzahl} von ${soll})`);
    // Der Hash muss über x.text || x.label gebildet sein — genau wie die
    // Leseseite ihn nachrechnet.
    const hashOk = await page.evaluate((p) => {
      const C = window.FPVecCodec;
      return (window.FP_LISTINGS || []).every((x) => {
        if (!x || !x.anchorId) return true;
        const rec = p.vectors[x.anchorId];
        return !rec || rec.h === C.textHash(x.text || x.label);
      });
    }, paket);
    ok(hashOk, "(11) jeder Hash ist über (text || label) gebildet — Regel der Leseseite");
    // Der gepackte Vektor muss den Original-Vektor zurückgeben.
    const cosMin = await page.evaluate((p) => {
      const C = window.FPVecCodec;
      let schlechtester = 1;
      for (const x of (window.FP_LISTINGS || [])) {
        const rec = x && x.anchorId && p.vectors[x.anchorId];
        if (!rec) continue;
        const zurueck = C.decode(rec, p.dim);
        if (!zurueck) return -1;
        const orig = window.__vecFor(x.text || x.label);
        let punkt = 0, lo = 0;
        for (let i = 0; i < p.dim; i++) { punkt += orig[i] * zurueck[i]; lo += orig[i] * orig[i]; }
        const cos = punkt / Math.sqrt(lo);
        if (cos < schlechtester) schlechtester = cos;
      }
      return schlechtester;
    }, paket);
    ok(cosMin > 0.9999, `(12) zurückgerechnete Vektoren treffen das Original (schlechtester Cosinus ${cosMin.toFixed(6)})`);
  }
  ok(fehler.length === 0, "(13) keine JS-Fehler beim Bauen" + (fehler.length ? ": " + fehler[0] : ""));

  /* Klaus' Befund 2026-08-01: „kein Ladebalken, ich sehe nicht, wie weit es ist
   * oder ob gerade etwas hakt." Beim Modell-Download (~30 MB) ist das der
   * Unterschied zwischen „laeuft" und „haengt". */
  const gesehen2 = await page.evaluate(() => ({ balken: window.__balken || [], texte: window.__statusTexte || [] }));
  ok(gesehen2.balken.length >= 2,
    `(14) Ladebalken wird angezeigt und bewegt sich (${gesehen2.balken.length} Stufen: ${gesehen2.balken.slice(0, 5).join(" → ")})`);
  const zwischen = gesehen2.balken.filter((b) => { const n = parseFloat(b); return n > 0 && n < 100; });
  ok(zwischen.length > 0, `(15) Balken zeigt echte Zwischenstaende, nicht nur 0 % und fertig (${zwischen.join(", ")})`);
  ok(gesehen2.texte.some((t) => /Sprachmodell/i.test(t)) && gesehen2.texte.some((t) => /\d+\/\d+/.test(t)),
    `(16) beide Phasen benannt: Modell laden UND Rechnen mit Zaehler (${gesehen2.texte.slice(0, 4).join(" | ")})`);
  await ctx.close();
}

/* ═══ Teil A2 — rechnet der Knopf über den SERVER-Stand oder den gecachten? ═══
 *
 * Die Lage aus Klaus' echtem Lauf: im Browser eine veraltete Liste, auf dem
 * Server die richtige. Ein Knopf, der window.FP_LISTINGS nimmt, baut hier ein
 * Paket, das aussieht wie fertig und von der Leseseite verworfen wird. */
{
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage();
  await ctx.addInitScript(() => { try { localStorage.setItem("fpstudio_srv_key", "test-passwort"); } catch (e) {} });
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await stubSetzen(page);

  // Der Server liefert die RICHTIGEN Texte — hier eindeutig markiert.
  const echteListe = await page.evaluate(() =>
    (window.FP_LISTINGS || []).map((x) => ({ label: x.label, anchorId: x.anchorId, img: x.img, text: "SERVER-STAND " + x.anchorId })));
  await page.route("**/assets/config/listings.js*", (route) => route.fulfill({
    status: 200, contentType: "text/javascript", headers: { "cache-control": "no-store" },
    body: "window.FP_LISTINGS = " + JSON.stringify(echteListe) + ";",
  }));
  // Im Browser liegt die VERALTETE Liste — so wie bei Klaus aus dem Cache.
  await page.evaluate(() => {
    (window.FP_LISTINGS || []).forEach((x) => { x.text = "VERALTETER CACHE " + x.anchorId; });
  });

  const studioSrc2 = fs.readFileSync(path.join(ROOT, "assets/studio-markt.js"), "utf8");
  await page.evaluate(({ api, src }) => { window.FP_MARKT_API = api; (0, eval)(src); }, { api: API_URL, src: studioSrc2 });

  // Auch hier kein Alt-Paket: gemessen wird, WORÜBER gerechnet wird, nicht wie
  // viel gespart wird.
  await page.route(VEC_PFAD, (route) => route.fulfill({ status: 404, body: "404", headers: { "cache-control": "no-store" } }));
  let gesehen2 = null;
  await page.route("**/marktplatz-api.php*", (route) => {
    try { gesehen2 = JSON.parse(route.request().postData() || "{}"); } catch (_e) { gesehen2 = {}; }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.evaluate(() => window.FPStudio.open());
  const k2 = await page.$("[data-role=vecbtn]");
  if (k2) await k2.click();
  for (let i = 0; i < 200 && !gesehen2; i++) await page.waitForTimeout(50);

  let p2 = null;
  try { p2 = JSON.parse((gesehen2 || {}).content || "null"); } catch (_e) { p2 = null; }
  const proben = p2 ? Object.keys(p2.vectors || {}) : [];
  const hashServer = await page.evaluate(({ pack, ids }) => {
    const C = window.FPVecCodec;
    return ids.every((id) => pack.vectors[id].h === C.textHash("SERVER-STAND " + id));
  }, { pack: p2 || { vectors: {} }, ids: proben }).catch(() => false);
  const hashCache = await page.evaluate(({ pack, ids }) => {
    const C = window.FPVecCodec;
    return ids.some((id) => pack.vectors[id].h === C.textHash("VERALTETER CACHE " + id));
  }, { pack: p2 || { vectors: {} }, ids: proben }).catch(() => false);

  ok(proben.length > 0, `(34) Paket trotz veraltetem Browser-Stand gebaut (${proben.length} Vektoren)`);
  ok(hashServer, "(35) Hashes stammen vom SERVER-Stand — der Knopf holt frisch, statt dem Cache zu glauben");
  ok(!hashCache, "(36) kein einziger Hash stammt aus der veralteten Browser-Liste");
  await ctx.close();
}

/* ═══ Teil A3 — sagt die Stand-Anzeige die Wahrheit? ═══
 *
 * Klaus 2026-08-01: „Ich sehe noch keine Bestätigung, dass das aktualisiert
 * wurde." Eine Anzeige, die nur meldet „ich habe etwas geschickt", wäre die
 * falsche Antwort — genau daran scheiterte der erste Lauf (14 gebaut, 4
 * brauchbar, niemand merkte es). Die Anzeige muss den WAHREN Zustand messen.
 *
 * Drei Lagen, jede mit einem anderen richtigen Ergebnis. Die mittlere ist die
 * wichtige: ein vollständig aussehendes, aber veraltetes Paket. Eine Anzeige,
 * die dort „alles abgedeckt" behauptet, ist schlimmer als keine. */
async function standMessen(page, paket) {
  await page.route(VEC_PFAD, (route) => {
    const headers = { "cache-control": "no-store" };
    if (!paket) return route.fulfill({ status: 404, body: "404", headers });
    route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(paket) });
  });
  return await page.evaluate(() => window.FPStudio._t.vecPruefe());
}
{
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage();
  await ctx.addInitScript(() => { try { localStorage.setItem("fpstudio_srv_key", "test-passwort"); } catch (e) {} });
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await stubSetzen(page);
  const studioSrc3 = fs.readFileSync(path.join(ROOT, "assets/studio-markt.js"), "utf8");
  await page.evaluate(({ api, src }) => { window.FP_MARKT_API = api; (0, eval)(src); }, { api: API_URL, src: studioSrc3 });

  // (a) gar kein Paket
  let st = await standMessen(page, null);
  ok(st && st.keinPaket === true, "(19) ohne Vektor-Datei: Anzeige sagt ehrlich „noch keine\u201c");
  await page.unroute(VEC_PFAD);

  // (b) VERALTETES Paket — sieht vollständig aus, passt aber nicht mehr.
  // Das ist Klaus' Lage vom ersten Lauf, nachgestellt.
  const veraltet = await page.evaluate(() => {
    const C = window.FPVecCodec;
    const out = { version: 1, model: "Xenova/multilingual-e5-small", dim: 384, quant: "int8-sym-b64", built: "2026-07-26", vectors: {} };
    for (const x of (window.FP_LISTINGS || [])) {
      if (!x || !x.anchorId) continue;
      const p = C.encode(window.__vecFor(x.text || x.label));
      p.h = C.textHash("SO STAND DER TEXT FRUEHER " + x.anchorId);   // Text hat sich seither geändert
      out.vectors[x.anchorId] = p;
    }
    return out;
  });
  st = await standMessen(page, veraltet);
  ok(st && st.gesamt > 0 && st.abgedeckt === 0,
    `(20) veraltetes Paket wird als veraltet erkannt, nicht als „fertig\u201c (${st && st.abgedeckt}/${st && st.gesamt} abgedeckt)`);
  ok(st && st.zeilen && st.zeilen.every((z) => z.lage === "stale"),
    "(21) jede Zeile ist als „veraltet\u201c ausgewiesen, nicht als fehlend");
  ok(st && st.gebaut === "2026-07-26", `(22) Bau-Datum aus dem Paket wird gezeigt (${st && st.gebaut})`);
  await page.unroute(VEC_PFAD);

  // (c) passendes Paket
  const passend = await page.evaluate(() => {
    const C = window.FPVecCodec;
    const out = { version: 1, model: "Xenova/multilingual-e5-small", dim: 384, quant: "int8-sym-b64", built: "2026-08-01", vectors: {} };
    for (const x of (window.FP_LISTINGS || [])) {
      if (!x || !x.anchorId) continue;
      const t = x.text || x.label;
      const p = C.encode(window.__vecFor(t));
      p.h = C.textHash(t);
      out.vectors[x.anchorId] = p;
    }
    return out;
  });
  st = await standMessen(page, passend);
  ok(st && st.abgedeckt === st.gesamt && st.gesamt > 0,
    `(23) passendes Paket: alles abgedeckt (${st && st.abgedeckt}/${st && st.gesamt})`);

  // Die Anzeige selbst — nicht nur die Rechnung dahinter.
  await page.evaluate(() => window.FPStudio.open());
  await page.waitForFunction(() => {
    const b = document.querySelector("[data-role=vecstand]");
    return b && /is-(ok|warn|err)/.test(b.className);
  }, null, { timeout: 15000 }).catch(() => {});
  const sicht = await page.evaluate(() => {
    const b = document.querySelector("[data-role=vecstand]");
    return { klasse: b ? b.className : "", text: b ? (b.textContent || "").trim() : "",
             knopfPruefen: !!document.querySelector("[data-role=vecrecheck]"),
             knopfBericht: !!document.querySelector("[data-role=vecreport]") };
  });
  ok(/is-ok/.test(sicht.klasse) && /\d+/.test(sicht.text),
    `(24) Stand steht sichtbar im Panel, nicht nur als Toast („${sicht.text.slice(0, 60)}\u201c)`);
  ok(sicht.knopfPruefen && sicht.knopfBericht, "(25) Knöpfe „Stand prüfen\u201c und „Bericht (PDF)\u201c vorhanden");
  await ctx.close();
}

/* ═══ Teil A4 — rechnet er nur, was sich geändert hat? ═══
 *
 * Klaus 2026-08-01: „Rechnet er dann für tausend Apps jedes Mal alles nach? Das
 * wäre ziemlich überflüssig." Er hat recht. Der Hash im Paket sagt bereits, ob
 * ein Vektor noch zum Text passt — passt er, ist Neurechnen reine Zeitverschwendung.
 *
 * Zwei Fallen lauern dabei, beide hier geprüft: ein Paket von einem ANDEREN
 * Modell darf nicht übernommen werden (die Vektoren wären unvergleichbar), und
 * das Ergebnis muss trotz Sparen VOLLSTÄNDIG sein — sonst spart man sich ein
 * kaputtes Paket zusammen. */
async function bauenMit(paketVorher, aendere) {
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage();
  await ctx.addInitScript(() => { try { localStorage.setItem("fpstudio_srv_key", "test-passwort"); } catch (e) {} });
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await stubSetzen(page);
  if (aendere) await page.evaluate((id) => {
    const x = (window.FP_LISTINGS || []).find((y) => y.anchorId === id);
    if (x) x.text = "DIESER TEXT IST NEU " + id;
  }, aendere);
  // Der Server liefert dieselbe Liste, die im Browser steht (inkl. Änderung).
  const liste = await page.evaluate(() => window.FP_LISTINGS);
  await page.route("**/assets/config/listings.js*", (route) => route.fulfill({
    status: 200, contentType: "text/javascript", headers: { "cache-control": "no-store" },
    body: "window.FP_LISTINGS = " + JSON.stringify(liste) + ";" }));
  await page.route(VEC_PFAD, (route) => {
    const headers = { "cache-control": "no-store" };
    if (!paketVorher) return route.fulfill({ status: 404, body: "404", headers });
    route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(paketVorher) });
  });
  const src = fs.readFileSync(path.join(ROOT, "assets/studio-markt.js"), "utf8");
  await page.evaluate(({ api, s2 }) => { window.FP_MARKT_API = api; (0, eval)(s2); }, { api: API_URL, s2: src });

  let commit = null;
  await page.route("**/marktplatz-api.php*", (route) => {
    try { commit = JSON.parse(route.request().postData() || "{}"); } catch (_e) { commit = {}; }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.evaluate(() => window.FPStudio.open());
  const b = await page.$("[data-role=vecbtn]");
  if (b) await b.click();
  // Auf das Ergebnis warten: entweder ein Commit oder die „nichts zu tun"-Meldung.
  await page.waitForFunction(() => {
    const t = document.querySelector("[data-role=vecstatus] .fpst-vectext");
    return t && /gebaut|Nichts zu tun/i.test(t.textContent || "");
  }, null, { timeout: 25000 }).catch(() => {});
  for (let i = 0; i < 60 && !commit; i++) await page.waitForTimeout(50);
  const gerechnet = await page.evaluate(() => window.__embedCount);
  const meldung = await page.evaluate(() => {
    const t = document.querySelector("[data-role=vecstatus] .fpst-vectext");
    return t ? (t.textContent || "").trim() : "";
  });
  let pk = null; try { pk = JSON.parse((commit || {}).content || "null"); } catch (_e) {}
  await ctx.close();
  return { gerechnet, paket: pk, meldung };
}

{
  // Vollständiges, passendes Paket bauen — der Ausgangszustand nach einem Lauf.
  const erst = await bauenMit(null, null);
  ok(erst.gerechnet > 0 && erst.paket, `(26) ohne Vorlage wird alles gerechnet (${erst.gerechnet})`);
  const alle = erst.gerechnet;

  // (a) nichts geändert → gar keine Einbettung, kein Commit
  const nix = await bauenMit(erst.paket, null);
  ok(nix.gerechnet === 0, `(27) nichts geändert → 0 Einbettungen statt ${alle}`);
  ok(!nix.paket, "(28) nichts geändert → gar kein Commit (nicht dieselbe Datei nochmal schreiben)");
  ok(/Nichts zu tun/i.test(nix.meldung), `(29) sagt ehrlich „nichts zu tun\u201c („${nix.meldung}\u201c)`);

  // (b) EIN Text geändert → genau eine Einbettung, Paket trotzdem vollständig
  const eineId = await (async () => {
    const ctx = await browser.newContext({ serviceWorkers: "block" });
    const pg = await ctx.newPage();
    await pg.goto(base + "/markt.html", { waitUntil: "load" });
    const id = await pg.evaluate(() => (window.FP_LISTINGS || []).find((x) => x && x.img).anchorId);
    await ctx.close(); return id;
  })();
  const eins = await bauenMit(erst.paket, eineId);
  ok(eins.gerechnet === 1, `(30) ein Text geändert → genau 1 Einbettung statt ${alle}`);
  ok(eins.paket && Object.keys(eins.paket.vectors).length === Object.keys(erst.paket.vectors).length,
    `(31) Paket bleibt VOLLSTÄNDIG (${eins.paket && Object.keys(eins.paket.vectors).length} Vektoren)`);
  const neuerHash = await (async () => {
    const ctx = await browser.newContext({ serviceWorkers: "block" });
    const pg = await ctx.newPage();
    await pg.goto(base + "/markt.html", { waitUntil: "load" });
    const h = await pg.evaluate((id) => window.FPVecCodec.textHash("DIESER TEXT IST NEU " + id), eineId);
    await ctx.close(); return h;
  })();
  ok(eins.paket && eins.paket.vectors[eineId] && eins.paket.vectors[eineId].h === neuerHash,
    "(32) der geänderte Eintrag trägt den NEUEN Hash, nicht den übernommenen");

  // (c) Paket von einem anderen Modell → nichts übernehmen, alles neu
  const fremd = JSON.parse(JSON.stringify(erst.paket));
  fremd.model = "irgendein/anderes-modell";
  const anders = await bauenMit(fremd, null);
  ok(anders.gerechnet === alle,
    `(33) Paket von fremdem Modell wird NICHT übernommen — alles neu (${anders.gerechnet} von ${alle})`);
}

/* Die Nagelprobe: dasselbe Paket der Leseseite vorlegen. 0 Einbettungen heißt,
 * die beiden Dateien passen zusammen — bei jeder Abweichung (Text-Regel,
 * Modell, Dimension, Codec) rechnet die Seite still nach und zählt hoch. */
async function leseseite(paketOderNull) {
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await stubSetzen(page);
  await page.route(VEC_PFAD, (route) => {
    const headers = { "cache-control": "no-store" };   // sonst kommt das Paket aus dem HTTP-Cache
    if (!paketOderNull) return route.fulfill({ status: 404, body: "404", headers });
    route.fulfill({ status: 200, contentType: "application/json", headers, body: JSON.stringify(paketOderNull) });
  });
  await page.evaluate(() => {
    document.getElementById("mkSemantic").checked = true;
    document.getElementById("mkSearch").value = "rezepte kochen";
    document.getElementById("mkSearchForm").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  });
  await page.waitForFunction(() => {
    const t = (document.getElementById("mkSearchNote") || {}).textContent || "";
    return /Nach Bedeutung sortiert|fehlgeschlagen|nicht geladen/.test(t);
  }, null, { timeout: 15000 });
  const r = await page.evaluate(() => ({
    eingebettet: window.__embedCount,
    reihenfolge: [...document.querySelectorAll("#mkListings .listing h3")].map((h) => h.textContent),
  }));
  await ctx.close();
  return r;
}

if (paket) {
  const ohne = await leseseite(null);          // Referenz: heutiger Weg
  const mit = await leseseite(paket);          // mit dem Paket aus dem Studio
  ok(mit.eingebettet === 0,
    `(37) Rundlauf: Paket aus dem Studio → 0 Passagen live eingebettet (${mit.eingebettet} von ${ohne.eingebettet})`);
  ok(JSON.stringify(mit.reihenfolge) === JSON.stringify(ohne.reihenfolge),
    "(38) Rundlauf: Reihenfolge identisch zur Live-Berechnung");
} else {
  ok(false, "(37) Rundlauf nicht möglich — kein Paket gebaut");
}

await browser.close(); server.close();

/* ═════════════════ Teil B — Server-Seite mit echten Anfragen ═════════════════ */
console.log("\ncommit_vectors — Server-Prüfung");

let phpDa = true;
try { execFileSync("php", ["-v"], { stdio: "ignore" }); } catch { phpDa = false; }

if (!phpDa) {
  console.log("  · php nicht vorhanden — Teil B übersprungen (fail-soft)");
} else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fp-api-"));
  fs.copyFileSync(path.join(ROOT, "server/marktplatz-api.php"), path.join(tmp, "marktplatz-api.php"));
  // Stub-Konfiguration: echter Aufbau, aber ein Token, der nie benutzt wird —
  // alle geprüften Fälle werden VOR dem GitHub-Aufruf abgewiesen. Es geht
  // nichts nach außen.
  fs.writeFileSync(path.join(tmp, "freigabe-config.php"),
    "<?php\nreturn ['github_token'=>'nie-benutzt','github_owner'=>'o','github_repo'=>'r'," +
    "'github_branch'=>'main','listings_path'=>'assets/config/listings.js'," +
    "'queue_file'=>__DIR__.'/q.jsonl','studio_key'=>'test-passwort'];\n");

  const port = 8000 + Math.floor(Math.random() * 900);
  const php = spawn("php", ["-S", "127.0.0.1:" + port, "-t", tmp], { stdio: "ignore" });
  const url = `http://127.0.0.1:${port}/marktplatz-api.php?action=commit_vectors`;

  // Auf den Server WARTEN, nicht auf die Uhr.
  let bereit = false;
  for (let i = 0; i < 60 && !bereit; i++) {
    try { await fetch(url, { method: "POST", body: "{}" }); bereit = true; }
    catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  const frage = async (body) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { code: r.status, j: await r.json().catch(() => null) };
  };
  const KEY = "test-passwort";

  if (!bereit) {
    console.log("  · php -S nicht erreichbar — Teil B übersprungen (fail-soft)");
  } else {
    let r;
    r = await frage({ key: "falsch", content: '{"model":"m","vectors":{"a":{}}}' });
    ok(r.code === 401 && r.j && r.j.error === "unauthorized", "(39) ohne richtiges Studio-Passwort: 401");

    r = await frage({ key: KEY, content: "das ist kein json" });
    ok(r.code === 422 && r.j && r.j.error === "content_not_json", "(40) kaputtes JSON wird abgelehnt (422)");

    r = await frage({ key: KEY, content: '{"model":"m","vectors":{}}' });
    ok(r.code === 422 && r.j && r.j.error === "vectors_empty", "(41) LEERES Paket wird abgelehnt — nie über die gute Datei schreiben");

    r = await frage({ key: KEY, content: '{"model":"m"}' });
    ok(r.code === 422 && r.j && r.j.error === "vectors_empty", "(42) Paket ganz ohne vectors wird abgelehnt");

    r = await frage({ key: KEY, content: '{"vectors":{"a":{"s":1,"v":"AA"}}}' });
    ok(r.code === 422 && r.j && r.j.error === "model_missing",
      "(43) ohne Modell-Kennung abgelehnt — sonst wäre der Modell-Wächter der Leseseite still ausgehebelt");
  }
  php.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

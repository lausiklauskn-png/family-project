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
const VEC_PFAD = "**/assets/config/listings-vec.json";

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
      init: async () => {},
      embedQuery: async (t) => vecFor("q:" + t),
      embedPassageBatch: async (texts) => { window.__embedCount += texts.length; return texts.map(vecFor); },
    };
  }, { dim: DIM, model: MODEL });
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

  // Den Commit abfangen, statt ihn zu verschicken.
  let gesehen = null;
  await page.route("**/marktplatz-api.php*", (route) => {
    try { gesehen = JSON.parse(route.request().postData() || "{}"); } catch (_e) { gesehen = { kaputt: true }; }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, info: "abc1234" }) });
  });

  await page.evaluate(() => window.FPStudio.open());
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
  await ctx.close();
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
    `(14) Rundlauf: Paket aus dem Studio → 0 Passagen live eingebettet (${mit.eingebettet} von ${ohne.eingebettet})`);
  ok(JSON.stringify(mit.reihenfolge) === JSON.stringify(ohne.reihenfolge),
    "(15) Rundlauf: Reihenfolge identisch zur Live-Berechnung");
} else {
  ok(false, "(14) Rundlauf nicht möglich — kein Paket gebaut");
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
    ok(r.code === 401 && r.j && r.j.error === "unauthorized", "(16) ohne richtiges Studio-Passwort: 401");

    r = await frage({ key: KEY, content: "das ist kein json" });
    ok(r.code === 422 && r.j && r.j.error === "content_not_json", "(17) kaputtes JSON wird abgelehnt (422)");

    r = await frage({ key: KEY, content: '{"model":"m","vectors":{}}' });
    ok(r.code === 422 && r.j && r.j.error === "vectors_empty", "(18) LEERES Paket wird abgelehnt — nie über die gute Datei schreiben");

    r = await frage({ key: KEY, content: '{"model":"m"}' });
    ok(r.code === 422 && r.j && r.j.error === "vectors_empty", "(19) Paket ganz ohne vectors wird abgelehnt");

    r = await frage({ key: KEY, content: '{"vectors":{"a":{"s":1,"v":"AA"}}}' });
    ok(r.code === 422 && r.j && r.j.error === "model_missing",
      "(20) ohne Modell-Kennung abgelehnt — sonst wäre der Modell-Wächter der Leseseite still ausgehebelt");
  }
  php.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);

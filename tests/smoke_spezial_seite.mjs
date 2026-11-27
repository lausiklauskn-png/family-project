// Marktplatz Spezial im echten Browser: Seite + Studio gegen den echten Dienst (gestelltes GitHub).
// node tests/smoke_spezial_seite.mjs
import http from "node:http";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

globalThis.self = globalThis;
const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const K = require(join(WURZEL, "assets/spezial-kern.js"));
const noble = await import(pathToFileURL(join(WURZEL, "sbkim/noble-secp256k1.js")).href);
let gruen = 0, rot = 0;
function soll(name, wahr, mehr) { if (wahr) { gruen++; console.log("✓ " + name); } else { rot++; console.log("✗ " + name + (mehr ? "  → " + mehr : "")); } }
// Wartet auf eine Bedingung; ein Ablauf der Frist ist ein ROT mit Namen, kein Absturz ohne Schlusszeile.
async function warte(seite, fn, ms = 20000) { try { await seite.waitForFunction(fn, null, { timeout: ms }); return true; } catch { return false; } }
async function ende(code) { console.log(`${gruen} grün · ${rot} ROT`); process.exitCode = code; }
process.on("unhandledRejection", (e) => { rot++; console.log("✗ Probe gestolpert: " + (e && e.message || e)); ende(1); setTimeout(() => process.exit(1), 50); });

// ── Daten: gestelltes GitHub → echter Spiegel ───────────────────────────
const APK = Buffer.from("APK-" + "a".repeat(4000));
const gh = http.createServer((q, a) => {
  const b = "http://127.0.0.1:" + gh.address().port;
  if (q.url.startsWith("/repos/lausiklauskn-png/Private-Akte/")) { a.writeHead(200, { "Content-Type": "application/json" }); return a.end(JSON.stringify([{ tag_name: "v0.9.11", published_at: "2026-11-26", assets: [{ name: "Private-Akte-Pro-0.9.11.apk", size: APK.length, browser_download_url: b + "/apk" }] }])); }
  if (q.url.startsWith("/repos/")) { a.writeHead(200, { "Content-Type": "application/json" }); return a.end("[]"); }
  if (q.url === "/apk") { a.writeHead(200); return a.end(APK); }
  a.writeHead(404); a.end();
});
await new Promise((ok) => gh.listen(0, "127.0.0.1", ok));
const DATEN = await mkdtemp(join(tmpdir(), "spezial-seite-"));
const { spiegeln } = await import(pathToFileURL(join(WURZEL, "server/spezial/spiegeln.mjs")).href);
await spiegeln({ daten: DATEN, api: "http://127.0.0.1:" + gh.address().port, log: () => {} });
const SCHL = join(DATEN, "schluessel.json");
await writeFile(SCHL, JSON.stringify({ fp: [], tp: [] }));
process.env.SPEZIAL_DATEN = DATEN; process.env.SPEZIAL_SCHLUESSEL = SCHL;
const { bauen } = await import(pathToFileURL(join(WURZEL, "server/spezial/dienst.mjs")).href);
const dienst = bauen(); await new Promise((ok) => dienst.listen(0, "127.0.0.1", ok));
const DIENST = "http://127.0.0.1:" + dienst.address().port;

// ── Seite ausliefern ────────────────────────────────────────────────────
const TYP = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const web = http.createServer((q, a) => {
  let f = join(WURZEL, decodeURIComponent(q.url.split("?")[0]));
  try { if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html"); } catch {}
  if (!existsSync(f)) { a.writeHead(404); return a.end(); }
  a.writeHead(200, { "Content-Type": TYP[extname(f)] || "application/octet-stream" }); a.end(readFileSync(f));
});
await new Promise((ok) => web.listen(0, "127.0.0.1", ok));
const SEITE = "http://127.0.0.1:" + web.address().port;

let pw; try { pw = require("playwright"); } catch { console.log("⊘ kein Playwright — NICHT LAUFFÄHIG, nicht grün"); await ende(2); process.exit(2); }
const br = await pw.chromium.launch();
const ctx = await br.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
// spezial.family-projekt.de → echter Dienst; Origin wie auf der echten Seite
const weiter = async (route) => {
  const r = route.request(), u = new URL(r.url());
  const antwort = await fetch(DIENST + u.pathname + u.search, { method: r.method(), body: r.method() === "POST" ? r.postData() : undefined,
    headers: { "Content-Type": "application/json", Origin: "https://family-projekt.de", "X-Forwarded-Host": "spezial.family-projekt.de" } });
  const kopf = Object.fromEntries(antwort.headers); kopf["access-control-allow-origin"] = SEITE;
  await route.fulfill({ status: antwort.status, headers: kopf, body: Buffer.from(await antwort.arrayBuffer()) });
};
ctx._weiter = weiter;
await ctx.route("https://spezial.family-projekt.de/**", weiter);
await ctx.route("**/mycel-bg.js*", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
// Das Studio klappt seine Fenster ein (Klaus 2026-11-27). Die Abläufe unten tippen in die Fenster, also klappt dieser
// Kontext sie auf; ob sie zu Anfang ZU sind, misst Abschnitt 2b in einem eigenen Kontext ohne dieses Skript.
await ctx.addInitScript(() => {
  const auf = () => document.querySelectorAll("details.sps-teil:not([open])").forEach((d) => { d.open = true; });
  new MutationObserver(auf).observe(document, { childList: true, subtree: true });
});
const pg = await ctx.newPage();
const fehler = []; pg.on("pageerror", (e) => fehler.push(e.message));

// ── 1 · Studio: Schlüssel anlegen, Passkey erstellen ────────────────────
await pg.goto(SEITE + "/spezial-studio.html");
await pg.fill("#spsPw1", "studio-passwort-1"); await pg.fill("#spsPw2", "studio-passwort-1"); await pg.click("#spsAnlegen");
await pg.waitForSelector(".sps-pub", { timeout: 30000 });
const pub = (await pg.textContent(".sps-pub")).trim();
soll("Studio: Schlüssel angelegt, öffentlicher Teil sichtbar", /^[0-9a-f]{64}$/.test(pub));
const box = await pg.evaluate(() => localStorage.getItem("spezial_studio_fp"));
soll("Studio: der geheime Schlüssel liegt nur verschlüsselt im Browser", box && !/"g"|geheim/i.test(box) && JSON.parse(box).ct && JSON.parse(box).pub === pub);
soll("Studio: sagt, dass der Server den Schlüssel noch nicht kennt", /Noch nicht auf dem Server/.test(await pg.textContent("#spezialStudio")));
await writeFile(SCHL, JSON.stringify({ fp: [pub], tp: [] })); // „Claude trägt ihn ein, git pull"
await pg.reload(); await pg.waitForFunction(() => /steht auf dem Server/.test(document.body.textContent), null, { timeout: 15000 });
soll("Studio: erkennt den Schlüssel auf dem Server", true);
await pg.fill("#spsName", "Testkäufer"); await pg.check('.sps-apps input[value="private-akte"]');
await pg.fill("#spsPw", "falsch-falsch"); await pg.click("#spsMachen");
await pg.waitForFunction(() => /Falsches Studio-Passwort/.test(document.getElementById("spsM2").textContent), null, { timeout: 30000 });
soll("Studio: falsches Passwort macht keinen Passkey", true);
await pg.fill("#spsPw", "studio-passwort-1"); await pg.click("#spsMachen");
await pg.waitForFunction(() => { const l = document.querySelector("#spsUeb .sps-link"); return l && /#k=FPK1\./.test(l.value); }, null, { timeout: 30000 });
const link = await pg.inputValue("#spsUeb .sps-link");
const passkey = decodeURIComponent(link.split("#k=")[1]);
soll("Studio: die Übergabe ist ein Link auf markt-spezial.html, der Passkey steht nach dem # (geht nicht an den Server)", new URL(link).pathname === "/markt-spezial.html" && !new URL(link).search, link.slice(0, 80));
const check = await K.pruefe(noble, passkey, "fp", [pub]);
soll("Studio: Passkey trägt Pseudonym und genau die gewählte App", check.ok && check.daten.n === "Testkäufer" && check.daten.a.join() === "private-akte", JSON.stringify(check));
soll("Studio: Passkey steht in der Liste", /Testkäufer/.test(await pg.textContent(".sps-tab")));
await pg.waitForFunction(() => { const i = document.querySelector("#spsUeb .sps-qr img"); return i && i.complete && i.naturalWidth >= 600; }, null, { timeout: 20000 });
soll("Studio: der QR-Schlüssel ist ein Bild zum Speichern (PNG)", /^data:image\/png/.test(await pg.getAttribute("#spsUeb .sps-qr img", "src")) && /^Schluessel-Testk/.test(await pg.getAttribute("#spsUeb .sps-qr a[download]", "download")));
soll("Studio: ohne Code-Haken steht kein Code da", !(await pg.$("#spsUeb .sps-code")));
soll("Studio: kommende Pro-Apps lassen sich schon in einen Passkey nehmen", (await pg.locator('.sps-apps input[value="rezeptbuch-pro"], .sps-apps input[value="mixarium-pro"]').count()) === 2);
soll("Studio: sagt, dass ein Passkey für Android UND Windows gilt", /Android \(APK\) und Windows \(Installer\)/.test(await pg.textContent(".sps-apps")));

// ── 2 · Seite ───────────────────────────────────────────────────────────
await pg.goto(SEITE + "/markt.html");
soll("Marktplatz: Knopf „Marktplatz Spezial“ führt zur Seite", (await pg.getAttribute("a.mk-spezial", "href")) === "markt-spezial.html");
await pg.goto(SEITE + "/markt-spezial.html");
await pg.waitForSelector(".sp-karte button[data-art=android]", { timeout: 15000 });
const karten = await pg.$$eval(".sp-karte", (k) => k.map((x) => x.getAttribute("data-sp-app")));
const cfg = await pg.evaluate(() => window.SPEZIAL.apps.filter((a) => !a.bald).map((a) => a.id));
const bald = await pg.evaluate(() => window.SPEZIAL.apps.filter((a) => a.bald).map((a) => a.id));
soll("Seite: eine Karte je Pro-App aus der Konfiguration", karten.join() === cfg.join() && karten.length >= 5, karten.join());
soll("Seite: eine kommende Pro-App (bald) ohne Datei auf dem Server zeigt noch keine Karte", bald.length >= 2 && bald.every((id) => !karten.includes(id)), bald.join());
await pg.waitForFunction(() => [...document.querySelectorAll(".sp-karte img.sp-sym")].every((i) => i.complete), null, { timeout: 15000 });
const bilder = await pg.$$eval(".sp-karte", (k) => k.map((x) => { const i = x.querySelector("img.sp-sym"); return i && i.naturalWidth >= 64 ? "ok" : x.getAttribute("data-sp-app"); }));
soll("Seite: jede Karte trägt das eigene Symbol der App (geladen, keine Lücke)", bilder.every((b) => b === "ok"), bilder.join());
soll("Seite: keine Emoji-Ersatzsymbole in den Karten", !(await pg.$$eval(".sp-karte h3", (h) => h.some((x) => /\p{Extended_Pictographic}/u.test(x.textContent)))));
soll("Seite: ohne Passkey steht „Passkey von diesem Gerät entfernen“ NICHT da (Klaus 2026-11-27)", !(await pg.isVisible("#spVergessen")));
soll("Seite: ohne Passkey sagt sie, woher man einen bekommt (Link oder QR-Code)", /Link oder QR-Code/.test(await pg.textContent("#spMeldung")));
soll("Seite: ohne Passkey ist kein Download-Knopf frei", (await pg.$$eval(".sp-karte button[data-art]", (b) => b.filter((x) => !x.disabled).length)) === 0);
soll("Seite: zeigt die Fassung vom Server", /0\.9\.11/.test(await pg.textContent('[data-sp-app="private-akte"]')));
const html = await pg.content() + readFileSync(join(WURZEL, "assets/spezial-seite.js"), "utf8") + readFileSync(join(WURZEL, "assets/config/spezial.js"), "utf8");
soll("Seite: nennt keine Download-Adresse (kein github.com, kein releases/download)", !/github\.com|releases\/download|\.apk"/.test(html));
await pg.fill("#spPasskey", passkey.slice(0, -4) + "AAAA"); await pg.click("#spForm button[type=submit]");
await pg.waitForFunction(() => /passt nicht/.test(document.getElementById("spMeldung").textContent), null, { timeout: 15000 });
soll("Seite: ein verbogener Passkey wird abgewiesen, mit Klartext", true);
await pg.fill("#spPasskey", passkey); await pg.click("#spForm button[type=submit]");
await pg.waitForFunction(() => /Freigeschaltet/.test(document.getElementById("spMeldung").textContent), null, { timeout: 15000 });
soll("Seite: nach dem Freischalten steht „Passkey von diesem Gerät entfernen“ da", await pg.isVisible("#spVergessen"));
soll("Seite: „Freigeschaltet“ steht als Erfolg da, nicht in der Warnfarbe", await pg.evaluate(() => document.getElementById("spMeldung").classList.contains("sp-gut")));
const frei = await pg.$$eval(".sp-karte button[data-art]:not([disabled])", (b) => b.map((x) => x.getAttribute("data-app") + "/" + x.getAttribute("data-art")));
if (process.env.SPEZIAL_BILD) { await pg.setViewportSize({ width: 1100, height: 900 }); await pg.screenshot({ path: process.env.SPEZIAL_BILD + "/spezial-fp.png", fullPage: true }); await pg.setViewportSize({ width: 1280, height: 900 }); }
soll("Seite: frei ist genau die App im Passkey", frei.join() === "private-akte/android", frei.join());
soll("Seite: andere Apps tragen den Hinweis „nicht in deinem Passkey“", (await pg.$$(".sp-hin")).length === cfg.length - 1);
const [dl] = await Promise.all([pg.waitForEvent("download", { timeout: 20000 }), pg.click('button[data-app="private-akte"][data-art=android]')]);
const pfad = await dl.path();
soll("Seite: Download liefert die APK vom Server", dl.suggestedFilename() === "Private-Akte-Pro-0.9.11.apk" && readFileSync(pfad).equals(APK), dl.suggestedFilename());
await pg.reload(); await pg.waitForFunction(() => /Freigeschaltet/.test(document.getElementById("spMeldung").textContent), null, { timeout: 15000 });
soll("Seite: der Passkey bleibt in diesem Browser gemerkt", true);
soll("Seite: die Windows-Fassung heißt „Windows (Installer)“", /Windows \(Installer\)/.test(await pg.textContent('[data-sp-app="private-akte"]')));
{ // der Link aus dem Studio, in einem frischen Browser geöffnet
  const c2 = await br.newContext({ viewport: { width: 412, height: 900 } }); await c2.route("https://spezial.family-projekt.de/**", (r) => ctx._weiter(r)); await c2.route("**/mycel-bg.js*", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  const p2 = await c2.newPage(); await p2.goto(SEITE + "/markt-spezial.html#k=" + passkey);
  const offen2 = await warte(p2, () => /Freigeschaltet/.test(document.getElementById("spMeldung").textContent) && document.querySelector(".sp-karte button[data-art]:not([disabled])"), 15000);
  soll("Link: öffnet den Marktplatz Spezial gleich freigeschaltet", offen2 && (await p2.$$eval(".sp-karte button[data-art]:not([disabled])", (b) => b.length)) === 1);
  soll("Link: der Passkey verschwindet danach aus der Adresszeile", !(await p2.evaluate(() => location.hash)));
  await c2.close();
}
const breit = await (async () => { const p2 = await ctx.newPage(); await p2.setViewportSize({ width: 360, height: 760 }); await p2.goto(SEITE + "/markt-spezial.html"); await p2.waitForSelector(".sp-karte"); const w = await p2.evaluate(() => document.documentElement.scrollWidth); await p2.close(); return w; })();
soll("Seite: 360 px ohne seitliches Rollen", breit <= 360, breit + " px");

if (process.env.SPEZIAL_BILD) { await pg.goto(SEITE + "/spezial-studio.html"); await pg.waitForSelector(".sps-tab"); await pg.screenshot({ path: process.env.SPEZIAL_BILD + "/spezial-studio-fp.png", fullPage: true }); }
// ── 2b · mit Code verschlossen ──────────────────────────────────────────
await pg.goto(SEITE + "/spezial-studio.html"); await pg.waitForSelector("#spsName");
await pg.fill("#spsName", "Codekäufer"); await pg.check('.sps-apps input[value="private-akte"]'); await pg.check("#spsMitCode");
await pg.fill("#spsPw", "studio-passwort-1"); await pg.click("#spsMachen");
await pg.waitForFunction(() => { const l = document.querySelector("#spsUeb .sps-link"), k = document.querySelector("#spsUeb [data-u-kurz]"); return l && k && /\/k\/[A-Za-z0-9_-]+$/.test(l.value) && /3 Tage/.test(k.textContent); }, null, { timeout: 60000 });
const kurzLink = await pg.inputValue("#spsUeb .sps-link");
soll("Kurzlink: das Studio zeigt einen kurzen Link auf dem Dienst, 3 Tage gültig", /^https:\/\/spezial\.family-projekt\.de\/k\/[A-Za-z0-9_-]{6,20}$/.test(kurzLink) && kurzLink.length < 60, kurzLink);
const kurzAntwort = await fetch(DIENST + new URL(kurzLink).pathname, { redirect: "manual" });
const kurzZiel = kurzAntwort.headers.get("location") || "";
soll("Kurzlink: der Dienst leitet auf die Seite mit dem verschlossenen Passkey weiter", kurzAntwort.status === 302 && /^https:\/\/family-projekt\.de\/markt-spezial\.html#z=FPZ1\./.test(kurzZiel), kurzAntwort.status + " " + kurzZiel.slice(0, 70));
const kurzDaten = JSON.parse(await readFile(join(DATEN, "kurz.json"), "utf8"));
soll("Kurzlink: auf dem Server liegt nur der verschlossene Teil, nie der Passkey selbst", !/FPK1/.test(JSON.stringify(kurzDaten)) && Object.values(kurzDaten).every((e) => /^FPZ1\./.test(e.z) && e.e > Date.now() + 2.9 * 864e5 && e.e < Date.now() + 3.1 * 864e5));
const unbekannt = await fetch(DIENST + "/k/gibtesnicht", { redirect: "manual" });
soll("Kurzlink: ein unbekannter oder abgelaufener Link sagt es, statt weiterzuleiten", unbekannt.status === 410 && /abgelaufen/.test(await unbekannt.text()));
const zuLink = kurzZiel, code = await pg.evaluate(() => (document.querySelector("#spsUeb .sps-code strong") || { textContent: "" }).textContent.trim());
soll("Code: der Link trägt nur den verschlossenen Passkey, nicht den Klartext", !/FPK1/.test(zuLink) && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), zuLink.slice(0, 60) + " " + code);
soll("Code: das Studio warnt, den Code getrennt zu schicken, und bietet keinen Klartext an", /Am sichersten getrennt vom Link/.test(await pg.textContent("#spsUeb")) && !(await pg.$('#spsUeb [data-u="text"]')));
soll("Code: der Code steht nicht im QR-Bild-Link und nicht im Link", !zuLink.includes(code.replace("-", "")) && !zuLink.includes(code));
{
  const c3 = await br.newContext({ viewport: { width: 412, height: 900 } }); await c3.route("https://spezial.family-projekt.de/**", (r) => weiter(r)); await c3.route("**/mycel-bg.js*", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  const p3 = await c3.newPage(); const f3 = []; p3.on("pageerror", (e) => f3.push(e.message));
  await p3.goto(SEITE + "/markt-spezial.html#" + zuLink.split("#")[1]);
  const feld3 = await warte(p3, () => { const z = document.getElementById("spZu"); return z && !z.hidden; }, 10000);
  soll("Code: ohne Code bleibt alles zu, das Code-Feld steht da", feld3 && (await p3.$$eval(".sp-karte button[data-art]:not([disabled])", (b) => b.length)) === 0 && await p3.isVisible("#spCode"));
  if (feld3) {
  await p3.fill("#spCode", "AAAA-AAAA"); await p3.click("#spZuForm button");
  const nein3 = await warte(p3, () => /passt nicht/.test(document.getElementById("spZuMeld").textContent));
  soll("Code: ein falscher Code öffnet nichts", nein3 && (await p3.$$eval(".sp-karte button[data-art]:not([disabled])", (b) => b.length)) === 0);
  await p3.fill("#spCode", code.toLowerCase().replace("-", " ")); await p3.click("#spZuForm button");
  const ja3 = await warte(p3, () => /Freigeschaltet für Codekäufer/.test(document.getElementById("spMeldung").textContent));
  soll("Code: der richtige Code (auch klein und mit Leerzeichen getippt) schaltet frei", ja3 && (await p3.$$eval(".sp-karte button[data-art]:not([disabled])", (b) => b.length)) === 1 && await p3.isHidden("#spZu"));
  }
  soll("Code: danach merkt sich der Browser den Passkey, nicht den Code", /^FPK1\./.test(await p3.evaluate(() => localStorage.getItem("spezial_passkey_fp"))) && !(await p3.evaluate(() => location.hash)));
  soll("Code: keine Skriptfehler", f3.length === 0, f3.join(" | "));
  await c3.close();
}
await pg.waitForSelector('#spezialStudio [data-kop]');
await pg.click('#spezialStudio [data-kop]');
await pg.waitForFunction(() => { const l = document.querySelector("#spsUeb3 .sps-link"); return l && /(#z=FPZ1|\/k\/)/.test(l.value) && document.querySelector("#spsUeb3 .sps-code"); }, null, { timeout: 20000 });
soll("Studio: „Übergabe“ in der Liste zeigt Link, Code und QR für einen älteren Passkey wieder", true);

// ── 2c · Gerätebindung: höchstens 2 Geräte je Passkey (Klaus 2026-11-27) ──
{
  const zweit = await fetch(DIENST + "/link", { method: "POST", body: JSON.stringify({ passkey, app: "private-akte", art: "android", geraet: "zweites-geraet-00000000" }) });
  soll("Geräte: ein zweites Gerät darf laden", (await zweit.json()).ok);
  const c4 = await br.newContext({ viewport: { width: 412, height: 900 } }); await c4.route("https://spezial.family-projekt.de/**", (r) => weiter(r)); await c4.route("**/mycel-bg.js*", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  const p4 = await c4.newPage(); await p4.goto(SEITE + "/markt-spezial.html#k=" + passkey);
  const voll = await warte(p4, () => /auf 2 Ger/.test(document.getElementById("spMeldung").textContent), 15000);
  soll("Geräte: ein drittes Gerät sieht den Grund und keine freien Knöpfe", voll && (await p4.$$eval(".sp-karte button[data-art]:not([disabled])", (b) => b.length)) === 0);
  await c4.close();
  await pg.goto(SEITE + "/spezial-studio.html"); await pg.waitForSelector(`[data-geraete="${check.daten.id}"]`);
  await pg.waitForFunction((id) => /von/.test((document.querySelector('[data-geraete="' + id + '"]') || {}).textContent || ""), check.daten.id, { timeout: 15000 }).catch(() => {});
  const zahlTxt = await pg.evaluate((id) => (document.querySelector('[data-geraete="' + id + '"]') || {}).textContent, check.daten.id);
  soll("Geräte: das Studio zeigt „2 von 2“ am Passkey", /2 von 2/.test(zahlTxt || ""), zahlTxt);

  // ── 2b · Eingeklappt und „geladen“ (Klaus 2026-11-27) ─────────────────
  {
    const cz = await br.newContext({ viewport: { width: 1280, height: 900 }, storageState: await ctx.storageState() });
    await cz.route("https://spezial.family-projekt.de/**", weiter);
    await cz.route("**/mycel-bg.js*", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
    const pz = await cz.newPage(); await pz.goto(SEITE + "/spezial-studio.html");
    await pz.waitForSelector("details.sps-teil");
    const lage = await pz.evaluate(() => [...document.querySelectorAll("details.sps-teil")].map((d) => d.open));
    soll("Studio: alle Fenster stehen zu Anfang eingeklappt", lage.length >= 3 && lage.every((o) => !o), JSON.stringify(lage));
    const hoch = await pz.evaluate(() => document.documentElement.scrollHeight);
    soll("Studio: eingeklappt passt das Studio auf einen Bildschirm", hoch <= 900 + 40, hoch + " px");
    await pz.click('details.sps-teil[data-teil="Vergebene Passkeys"] > summary');
    soll("Studio: ein Tipp auf die Überschrift öffnet das Fenster", await pz.evaluate(() => document.querySelector('details.sps-teil[data-teil="Vergebene Passkeys"]').open));
    const gel = await pz.waitForFunction((id) => { const d = document.querySelector('[data-geladen="' + id + '"]'); return d && !d.hidden && /geladen \(\d+\)/.test(d.textContent); }, check.daten.id, { timeout: 15000 }).then(() => true, () => false);
    const gelText = await pz.evaluate((id) => (document.querySelector('[data-geladen="' + id + '"]') || {}).textContent || "", check.daten.id);
    const gelZu = await pz.evaluate((id) => { const d = document.querySelector('[data-geladen="' + id + '"]'); return d && !d.open; }, check.daten.id);
    soll("Studio: am Passkey steht eingeklappt, was geladen wurde (App · APK/Windows · Zahl)", gel && gelZu && /×/.test(gelText) && /APK|Windows/.test(gelText), gelText);
    await cz.close();
  }
  await pg.fill("#spsPw", "studio-passwort-1");
  pg.once("dialog", (d) => d.accept());
  await pg.click(`[data-frei="${check.daten.id}"]`);
  const zurueck = await warte(pg, () => /Geräte zurückgesetzt/.test(document.getElementById("spsM3").textContent), 30000);
  const nachher = await (await fetch(DIENST + "/pruefen", { method: "POST", body: JSON.stringify({ passkey }) })).json();
  soll("Geräte: „Geräte zurücksetzen“ im Studio wirkt auf dem Server", zurueck && nachher.ok && nachher.geraete === 0, JSON.stringify(nachher));
}

// ── 3 · Sperren aus dem Studio ──────────────────────────────────────────
await pg.goto(SEITE + "/spezial-studio.html");
await pg.waitForSelector("[data-sperr]");
await pg.fill("#spsPw", "studio-passwort-1");
pg.once("dialog", (d) => d.accept());
await pg.click(`[data-sperr="${check.daten.id}"]`);
await pg.waitForFunction(() => /Gesperrt/.test(document.getElementById("spsM3").textContent), null, { timeout: 30000 });
const nach = await (await fetch(DIENST + "/pruefen", { method: "POST", body: JSON.stringify({ passkey }) })).json();
soll("Studio: Sperren wirkt auf dem Server", nach.warum === "gesperrt", JSON.stringify(nach));
await pg.goto(SEITE + "/markt-spezial.html");
await pg.waitForFunction(() => /gesperrt/.test(document.getElementById("spMeldung").textContent), null, { timeout: 15000 });
soll("Seite: ein gesperrter Passkey sagt es und wird vergessen", (await pg.evaluate(() => localStorage.getItem("spezial_passkey_fp"))) === null);
soll("keine Skriptfehler", fehler.length === 0, fehler.join(" | "));

await br.close(); web.close(); dienst.close(); gh.close();
await ende(rot ? 1 : 0);

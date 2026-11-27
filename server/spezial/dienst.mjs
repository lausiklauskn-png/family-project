#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// dienst.mjs — Marktplatz Spezial: gibt Pro-Dateien nur gegen einen gültigen
// Passkey aus (Klaus 2026-11-26, Weg B).
//
// Läuft auf dem Hetzner-CLOUD-Server als Container „spezial" hinter Caddy
// (spezial.family-projekt.de, spezial.pwa-toolpoint.de). Keine Abhängigkeiten.
//
//   GET  /gesund                     → "ok"
//   GET  /schluessel                 → die öffentlichen Herausgeber-Schlüssel je Markt
//   GET  /apps                       → Liste der Pro-Apps (Name, Fassung, Größe, SHA-256)
//   POST /pruefen  {passkey}         → {ok, markt, n, apps, d, x?} | {ok:false, warum}
//   POST /link     {passkey,app,art} → {ok, url, bis}  (Link 10 Minuten gültig)
//   GET  /datei/<marke>              → die Datei (mit Range)
//   POST /sperren  {erklaerung}      → Sperre, vom Herausgeber-Schlüssel unterschrieben
//   Gerätebindung: je Passkey höchstens GERAETE_MAX Geräte (Zufallskennung des Browsers), /link verlangt sie;
//   zurückgesetzt wird mit einer unterschriebenen Erklärung {frei: id} über /sperren (15 Minuten gültig).
//   POST /kurz     {passkey, zu}     → {ok, url, bis}  Kurzlink 3 Tage, nur für verschlossene Passkeys
//   GET  /k/<id>                     → Weiterleitung auf markt-spezial.html#z=… (oder „abgelaufen“)
//
// Geheimnisse: keine im Depot. /daten/geheim (Zufall, beim ersten Start angelegt)
// unterschreibt nur die kurzlebigen Links. Öffentliche Schlüssel: schluessel.json.
// ═══════════════════════════════════════════════════════════════════════

import http from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile, rename, stat, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

globalThis.self = globalThis; // noble-secp256k1 sucht self.crypto (Browser-Fassung)
const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, "..", "..");
const require = createRequire(import.meta.url);
const K = require(join(WURZEL, "assets", "spezial-kern.js"));
const noble = await import(pathToFileURL(join(WURZEL, "sbkim", "noble-secp256k1.js")).href);

const DATEN = process.env.SPEZIAL_DATEN || "/daten";
const SCHLUESSEL = process.env.SPEZIAL_SCHLUESSEL || join(HIER, "schluessel.json");
const QUELLEN = join(HIER, "quellen.json");
const PORT = Number(process.env.SPEZIAL_PORT || 8080);
const LINK_MS = 10 * 60 * 1000;
// Kurzlinks (Klaus 2026-11-27): 3 Tage gültig. Gespeichert wird NUR der verschlossene Passkey (…Z1.…),
// der ohne den getrennt übergebenen Code nutzlos ist. Nach Ablauf oder Sperre wird er gelöscht.
const GERAETE_MAX = 2; // Klaus 2026-11-27: Handy und PC
const GERAET_RE = /^[A-Za-z0-9_-]{16,40}$/;
const KURZ_MS = 3 * 24 * 60 * 60 * 1000;
const HERKUNFT = {
  fp: ["https://family-projekt.de", "https://www.family-projekt.de"],
  tp: ["https://pwa-toolpoint.de", "https://www.pwa-toolpoint.de"]
};
for (const z of String(process.env.SPEZIAL_EXTRA_HERKUNFT || "").split(",").map((s) => s.trim()).filter(Boolean)) {
  const [m, o] = z.split("=");
  if (HERKUNFT[m] && o) HERKUNFT[m].push(o);
}
const ALLE_HERKUNFT = new Set([].concat(...Object.values(HERKUNFT)));

// ── kleine Ablagen ──────────────────────────────────────────────────────
async function lies(pfad, vorgabe) { try { return JSON.parse(await readFile(pfad, "utf8")); } catch { return vorgabe; } }
async function schreib(pfad, wert) { await writeFile(pfad + ".neu", JSON.stringify(wert, null, 2)); await rename(pfad + ".neu", pfad); }
let GEHEIM;
async function geheim() {
  if (GEHEIM) return GEHEIM;
  const p = join(DATEN, "geheim");
  try { GEHEIM = Buffer.from((await readFile(p, "utf8")).trim(), "hex"); if (GEHEIM.length === 32) return GEHEIM; } catch { /* neu */ }
  GEHEIM = randomBytes(32);
  await writeFile(p, GEHEIM.toString("hex"), { mode: 0o600 });
  return GEHEIM;
}
async function schluessel() { const s = await lies(SCHLUESSEL, {}); return { fp: s.fp || [], tp: s.tp || [] }; }
async function sperrliste() { const s = await lies(join(DATEN, "sperrliste.json"), {}); return { fp: s.fp || [], tp: s.tp || [] }; }

// ── Passkey prüfen: Unterschrift, Markt, Sperre ─────────────────────────
function marktVon(text) {
  const p = String(text || "").trim().slice(0, 4);
  for (const [m, M] of Object.entries(K.MAERKTE)) if (p === M.code || p === M.sperre) return m;
  return null;
}
export async function passkeyPruefen(text) {
  text = String(text || "").replace(/\s+/g, "");
  if (text.length > 2000) return { ok: false, warum: "form" };
  const markt = marktVon(text);
  if (!markt) return { ok: false, warum: "form" };
  const r = await K.pruefe(noble, text, markt, (await schluessel())[markt]);
  if (!r.ok) return { ok: false, warum: r.warum, markt };
  if ((await sperrliste())[markt].includes(r.daten.id)) return { ok: false, warum: "gesperrt", markt };
  return { ok: true, markt, daten: r.daten };
}

// ── kurzlebige Links ────────────────────────────────────────────────────
function marke(nutzlast, key) {
  const body = K.b64u(new TextEncoder().encode(JSON.stringify(nutzlast)));
  return body + "." + createHmac("sha256", key).update(body).digest("base64url");
}
function markeLesen(text, key) {
  const m = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(String(text || ""));
  if (!m) return null;
  const soll = createHmac("sha256", key).update(m[1]).digest();
  let ist; try { ist = Buffer.from(m[2], "base64url"); } catch { return null; }
  if (ist.length !== soll.length || !timingSafeEqual(ist, soll)) return null;
  try { const n = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8")); return n && n.e > Date.now() ? n : null; } catch { return null; }
}

// ── Kurzlinks ──────────────────────────────────────────────────────────
const KURZ_DATEI = () => join(DATEN, "kurz.json");
async function kurzLesen() {
  const k = await lies(KURZ_DATEI(), {}), jetzt = Date.now(), neu = {};
  for (const [id, e] of Object.entries(k)) if (e && e.e > jetzt) neu[id] = e;
  return neu;
}
export async function kurzAnlegen(passkey, zu) {
  const p = await passkeyPruefen(passkey);
  if (!p.ok) return { ok: false, warum: p.warum };
  zu = String(zu || "").replace(/\s+/g, "");
  const Z = K.MAERKTE[p.markt].zu;
  if (zu.length > 4000 || zu.indexOf(Z + ".") !== 0 || !/^[A-Za-z0-9._-]+$/.test(zu)) return { ok: false, warum: "form" };
  const k = await kurzLesen(), bis = Date.now() + KURZ_MS;
  let id = Object.keys(k).find((i) => k[i].z === zu);
  if (!id) { do id = randomBytes(8).toString("base64url"); while (k[id]); }
  k[id] = { m: p.markt, z: zu, i: p.daten.id, e: bis };
  await schreib(KURZ_DATEI(), k);
  return { ok: true, id, markt: p.markt, bis };
}
async function kurzSperren(markt, pid) {
  const k = await kurzLesen(); let weg = false;
  for (const [id, e] of Object.entries(k)) if (e.m === markt && e.i === pid) { delete k[id]; weg = true; }
  await schreib(KURZ_DATEI(), k);
  return weg;
}
function seite(res, code, titel, text) {
  const body = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' + titel +
    '</title></head><body style="font:18px/1.5 system-ui,sans-serif;background:#0b0d14;color:#e8eef6;max-width:36em;margin:12vh auto;padding:0 16px"><h1 style="font-size:1.4em">' + titel + "</h1><p>" + text + "</p></body></html>";
  res.writeHead(code, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
  res.end(body);
}

// ── Gerätebindung ─────────────────────────────────────────────────────
const GERAETE_DATEI = () => join(DATEN, "geraete.json");
async function geraetStatus(markt, id, g) {
  const alle = await lies(GERAETE_DATEI(), {}), liste = alle[markt + ":" + id] || [];
  const bekannt = !!g && liste.includes(g);
  return { n: liste.length, bekannt, frei: bekannt || liste.length < GERAETE_MAX };
}
async function geraetMerken(markt, id, g) {
  const alle = await lies(GERAETE_DATEI(), {}), k = markt + ":" + id, liste = alle[k] || [];
  if (!liste.includes(g)) { liste.push(g); alle[k] = liste; await schreib(GERAETE_DATEI(), alle); }
}
async function geraeteFrei(markt, id) {
  const alle = await lies(GERAETE_DATEI(), {}), k = markt + ":" + id;
  if (alle[k]) { delete alle[k]; await schreib(GERAETE_DATEI(), alle); }
}

// ── Bremse je Adresse (in-memory) ───────────────────────────────────────
const BREMSE = new Map();
// Gezählt werden nur FEHLschläge (Klaus 2026-11-27): das Studio fragt je Passkey die Gerätezahl ab, und ein Käufer
// lädt mehrere Apps – beides sind gültige Anfragen und darf die Bremse nicht auslösen. Raten bleibt gebremst.
function gebremst(ip) {
  const jetzt = Date.now(), f = (BREMSE.get(ip) || []).filter((t) => jetzt - t < 10 * 60 * 1000);
  BREMSE.set(ip, f);
  return f.length >= 30;
}
function fehlversuch(ip) {
  const f = BREMSE.get(ip) || []; f.push(Date.now()); BREMSE.set(ip, f);
  if (BREMSE.size > 5000) BREMSE.clear();
}

async function katalog() {
  const cfg = await lies(QUELLEN, { apps: [] }), stand = await lies(join(DATEN, "stand.json"), { apps: {} });
  const apps = cfg.apps.map((a) => {
    const s = stand.apps[a.id] || {}, o = { id: a.id, name: a.name };
    for (const art of ["android", "windows"]) if (s[art]) o[art] = { version: s[art].version, tag: s[art].tag, groesse: s[art].groesse, sha256: s[art].sha256, datei: s[art].datei };
    return o;
  });
  return { apps, zeit: stand.zeit || null };
}

async function zaehle(markt, id, app, art) {
  const p = join(DATEN, "zaehler.json"), z = await lies(p, {});
  const k = markt + ":" + id, e = z[k] || { links: 0, apps: {} };
  e.links++; e.letzte = new Date().toISOString(); e.apps[app + "/" + art] = (e.apps[app + "/" + art] || 0) + 1;
  z[k] = e; await schreib(p, z);
}

// ── HTTP ────────────────────────────────────────────────────────────────
function antwort(res, code, obj, kopf = {}) {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": typeof obj === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...kopf });
  res.end(body);
}
function koerper(req) {
  return new Promise((ok, nein) => {
    let n = 0; const teile = [];
    req.on("data", (c) => { n += c.length; if (n > 8192) { nein(new Error("gross")); req.destroy(); } else teile.push(c); });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(teile).toString("utf8") || "{}")); } catch { nein(new Error("json")); } });
    req.on("error", nein);
  });
}
function ipVon(req) { return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim(); }
function basisVon(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  return (/^[a-z0-9.-]+(:\d+)?$/i.test(host) ? (process.env.SPEZIAL_SCHEMA || "https") + "://" + host : "");
}

export function bauen() {
  return http.createServer(async (req, res) => {
    const herkunft = req.headers.origin || "";
    const cors = ALLE_HERKUNFT.has(herkunft) ? { "Access-Control-Allow-Origin": herkunft, Vary: "Origin", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Disposition" } : { Vary: "Origin" };
    try {
      const url = new URL(req.url, "http://x");
      if (req.method === "OPTIONS") return antwort(res, herkunft && !ALLE_HERKUNFT.has(herkunft) ? 403 : 204, "", cors);
      if (herkunft && !ALLE_HERKUNFT.has(herkunft)) return antwort(res, 403, { ok: false, warum: "herkunft" });
      if (req.method === "GET" && url.pathname === "/gesund") return antwort(res, 200, "ok", cors);
      if (req.method === "GET" && url.pathname === "/schluessel") return antwort(res, 200, await schluessel(), cors);
      if (req.method === "GET" && url.pathname === "/apps") return antwort(res, 200, await katalog(), cors);

      if (req.method === "POST" && (url.pathname === "/pruefen" || url.pathname === "/link" || url.pathname === "/sperren" || url.pathname === "/kurz")) {
        const ip = ipVon(req);
        const aw = (r, code, obj, kopf) => { if (code >= 400 || (obj && obj.ok === false)) fehlversuch(ip); return antwort(r, code, obj, kopf); };
        if (gebremst(ip)) return antwort(res, 429, { ok: false, warum: "zu_oft" }, cors);
        let b; try { b = await koerper(req); } catch { return aw(res, 400, { ok: false, warum: "anfrage" }, cors); }

        if (url.pathname === "/sperren") {
          const text = String(b.erklaerung || "").replace(/\s+/g, ""), markt = marktVon(text);
          if (!markt) return aw(res, 400, { ok: false, warum: "form" }, cors);
          const r = await K.pruefe(noble, text, markt, (await schluessel())[markt], "sperre");
          if (!r.ok) return aw(res, 403, { ok: false, warum: r.warum }, cors);
          if (r.daten.frei !== undefined) {
            const fid = String(r.daten.frei || ""), alter = Date.now() - Number(r.daten.t || 0);
            if (!/^[A-Za-z0-9_-]{6,40}$/.test(fid)) return aw(res, 400, { ok: false, warum: "form" }, cors);
            if (!(alter >= -5 * 60 * 1000 && alter <= 15 * 60 * 1000)) return aw(res, 403, { ok: false, warum: "alt" }, cors);
            await geraeteFrei(markt, fid);
            return aw(res, 200, { ok: true, frei: fid }, cors);
          }
          const id = String(r.daten.sperrt || "");
          if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) return aw(res, 400, { ok: false, warum: "form" }, cors);
          const s = await sperrliste(); if (!s[markt].includes(id)) { s[markt].push(id); await schreib(join(DATEN, "sperrliste.json"), s); }
          await kurzSperren(markt, id);
          return aw(res, 200, { ok: true, gesperrt: id }, cors);
        }

        if (url.pathname === "/kurz") {
          const r = await kurzAnlegen(b.passkey, b.zu);
          if (!r.ok) return aw(res, r.warum === "form" ? 400 : 403, r, cors);
          if (herkunft && !HERKUNFT[r.markt].includes(herkunft)) return aw(res, 403, { ok: false, warum: "anderer_markt" }, cors);
          return aw(res, 200, { ok: true, url: basisVon(req) + "/k/" + r.id, bis: new Date(r.bis).toISOString() }, cors);
        }

        const p = await passkeyPruefen(b.passkey);
        if (p.ok && herkunft && !HERKUNFT[p.markt].includes(herkunft)) return aw(res, 403, { ok: false, warum: "anderer_markt" }, cors);
        if (url.pathname === "/pruefen") {
          if (!p.ok) return aw(res, 200, { ok: false, warum: p.warum }, cors);
          const g = GERAET_RE.test(String(b.geraet || "")) ? String(b.geraet) : "";
          const st = await geraetStatus(p.markt, p.daten.id, g);
          if (g && !st.frei) return aw(res, 200, { ok: false, warum: "geraete_voll", geraete: st.n, max: GERAETE_MAX }, cors);
          return aw(res, 200, { ok: true, markt: p.markt, n: p.daten.n, apps: p.daten.a, d: p.daten.d, x: p.daten.x || null, geraete: st.n, max: GERAETE_MAX }, cors);
        }
        // /link
        if (!p.ok) return aw(res, 403, { ok: false, warum: p.warum }, cors);
        const app = String(b.app || ""), art = String(b.art || "");
        if (!p.daten.a.includes(app)) return aw(res, 403, { ok: false, warum: "app_nicht_frei" }, cors);
        if (art !== "android" && art !== "windows") return aw(res, 400, { ok: false, warum: "art" }, cors);
        const geraet = String(b.geraet || "");
        if (!GERAET_RE.test(geraet)) return aw(res, 400, { ok: false, warum: "geraet" }, cors);
        const gst = await geraetStatus(p.markt, p.daten.id, geraet);
        if (!gst.frei) return aw(res, 403, { ok: false, warum: "geraete_voll", geraete: gst.n, max: GERAETE_MAX }, cors);
        const stand = await lies(join(DATEN, "stand.json"), { apps: {} }), d = stand.apps[app] && stand.apps[app][art];
        if (!d) return aw(res, 404, { ok: false, warum: "keine_datei" }, cors);
        if (!gst.bekannt) await geraetMerken(p.markt, p.daten.id, geraet);
        const bis = Date.now() + LINK_MS;
        const m = marke({ a: app, r: art, f: d.datei, i: p.daten.id, m: p.markt, e: bis }, await geheim());
        await zaehle(p.markt, p.daten.id, app, art);
        return aw(res, 200, { ok: true, url: basisVon(req) + "/datei/" + m, bis: new Date(bis).toISOString(), datei: d.datei, groesse: d.groesse, sha256: d.sha256 }, cors);
      }

      if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/k/")) {
        const id = url.pathname.slice(3), e = /^[A-Za-z0-9_-]{6,20}$/.test(id) ? (await kurzLesen())[id] : null;
        if (!e) return seite(res, 410, "Dieser Link ist abgelaufen", "Ein Kurzlink gilt 3 Tage. Bitte beim Anbieter einen neuen holen.");
        res.writeHead(302, { Location: HERKUNFT[e.m][0] + "/markt-spezial.html#z=" + e.z, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
        return res.end();
      }

      if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/datei/")) {
        const n = markeLesen(url.pathname.slice(7), await geheim());
        if (!n || !K.APP_RE.test(n.a) || !/^[A-Za-z0-9._+-]+$/.test(n.f) || n.f.startsWith(".")) return antwort(res, 403, "Link ungültig oder abgelaufen. Bitte auf der Seite neu anfordern.", cors);
        if ((await sperrliste())[n.m] && (await sperrliste())[n.m].includes(n.i)) return antwort(res, 403, "Dieser Passkey ist gesperrt.", cors);
        const pfad = join(DATEN, "dateien", n.a, n.f);
        let st; try { st = await stat(pfad); } catch { return antwort(res, 404, "Datei liegt nicht mehr da. Bitte neu anfordern.", cors); }
        const typ = n.f.endsWith(".apk") ? "application/vnd.android.package-archive" : "application/octet-stream";
        const kopf = { ...cors, "Content-Type": typ, "Content-Disposition": 'attachment; filename="' + n.f + '"', "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
        const rg = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ""));
        if (rg && (rg[1] || rg[2])) {
          let von = rg[1] ? Number(rg[1]) : st.size - Number(rg[2]), bis = rg[1] && rg[2] ? Number(rg[2]) : st.size - 1;
          if (von < 0) von = 0; if (bis >= st.size) bis = st.size - 1;
          if (von > bis) { res.writeHead(416, { ...kopf, "Content-Range": "bytes */" + st.size }); return res.end(); }
          res.writeHead(206, { ...kopf, "Content-Length": bis - von + 1, "Content-Range": `bytes ${von}-${bis}/${st.size}` });
          return req.method === "HEAD" ? res.end() : createReadStream(pfad, { start: von, end: bis }).pipe(res);
        }
        res.writeHead(200, { ...kopf, "Content-Length": st.size });
        return req.method === "HEAD" ? res.end() : createReadStream(pfad).pipe(res);
      }
      return antwort(res, 404, { ok: false, warum: "unbekannt" }, cors);
    } catch (e) {
      console.error("✗", e);
      if (!res.headersSent) antwort(res, 500, { ok: false, warum: "server" }, cors); else res.destroy();
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await mkdir(DATEN, { recursive: true });
  await geheim();
  bauen().listen(PORT, () => console.log(`spezial: hört auf ${PORT}, Daten ${DATEN}`));
}

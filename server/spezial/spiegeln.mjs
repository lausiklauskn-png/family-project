#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// spiegeln.mjs — holt die Pro-Dateien (APK, Windows-Installer) aus den
// GitHub-Releases auf den eigenen Server, für den Marktplatz Spezial
// (Klaus 2026-11-26, Weg B: „Downloads nur über den Server gegen Passkey").
//
// Läuft auf dem Hetzner-CLOUD-Server, per Cron, in einem Wegwerf-Container:
//   docker run --rm -v /srv/family-project:/app:ro -v /srv/spezial:/daten \
//     node:22-alpine node /app/server/spezial/spiegeln.mjs
//
//   · Was gespiegelt wird, steht in quellen.json. Klaus lädt weiter nur nach GitHub.
//   · Je App und Art (android/windows) die neueste Freigabe mit passender Datei.
//   · Abgelegt unter /daten/dateien/<app>/<datei> — AUSSERHALB jedes Web-Ordners;
//     ausgegeben wird nur über dienst.mjs gegen einen gültigen Passkey.
//   · Erst in eine Zwischendatei, dann umbenannt; SHA-256 wird gerechnet und mit
//     der Angabe von GitHub verglichen, wenn GitHub eine nennt.
//   · Eine ältere Datei derselben Art wird erst entfernt, wenn die neue geprüft liegt.
//   · Liest GitHub mit If-None-Match: eine unveränderte Liste kostet nichts.
//   · Liegt /daten/github-token, wird er mitgeschickt (für spätere private Repos).
//     Der Token liegt NUR auf dem Server, nie im Depot.
//
// Rückgabewerte: 0 alles da · 1 etwas fehlt oder stimmt nicht · 2 Aufbaufehler
// ═══════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import { createWriteStream, createReadStream } from "node:fs";
import { mkdir, readFile, writeFile, rename, stat, readdir, unlink, open } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const HIER = dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
function arg(name, vorgabe) { const i = ARGS.indexOf(name); return i >= 0 && ARGS[i + 1] && !ARGS[i + 1].startsWith("--") ? ARGS[i + 1] : vorgabe; }

const QUELLEN = arg("--quellen", join(HIER, "quellen.json"));
const DATEN = arg("--daten", process.env.SPEZIAL_DATEN || "/daten");
const API = process.env.SPEZIAL_GITHUB_API || "https://api.github.com";
const MAX_BYTES = 1536 * 1024 * 1024; // 1,5 GB je Datei — ein Riegel, keine Messung
const SPERRE_ALT_MS = 3 * 60 * 60 * 1000;

export const DATEI_NAME = /^[A-Za-z0-9._+-]+$/;
export const APP_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
export function dateiNameOk(n) { return typeof n === "string" && DATEI_NAME.test(n) && !n.startsWith(".") && !n.includes(".."); }

/* Die neueste passende Datei einer Art aus der Release-Liste. Rein, also einzeln prüfbar.
 * releases: Antwort von GET /repos/{o}/{r}/releases; art: "android" | "windows". */
export function waehle(releases, art, cfg) {
  const muster = new RegExp(cfg.muster[art], "i");
  const ohneTag = (cfg.ohneTag || []).map((s) => String(s).toLowerCase());
  const ohneDatei = (cfg.ohneDatei || []).map((s) => String(s).toLowerCase());
  const liste = (Array.isArray(releases) ? releases : [])
    .filter((r) => r && !r.draft && !r.prerelease && typeof r.tag_name === "string")
    .filter((r) => !ohneTag.some((w) => r.tag_name.toLowerCase().includes(w)))
    .sort((a, b) => String(b.published_at || b.created_at || "").localeCompare(String(a.published_at || a.created_at || "")));
  for (const r of liste) {
    const a = (r.assets || []).find((x) => x && muster.test(x.name) && dateiNameOk(x.name) && !ohneDatei.some((w) => x.name.toLowerCase().includes(w)));
    if (a) {
      const dig = /^sha256:([0-9a-f]{64})$/.exec(String(a.digest || ""));
      return { tag: r.tag_name, version: r.tag_name.replace(/^[a-z-]*v/i, ""), datei: a.name, groesse: a.size, url: a.browser_download_url, sha256Quelle: dig ? dig[1] : null, veroeffentlicht: r.published_at || r.created_at || null };
    }
  }
  return null;
}

async function sperre(pfad) {
  try { const s = await stat(pfad); if (Date.now() - s.mtimeMs < SPERRE_ALT_MS) return null; await unlink(pfad); } catch { /* keine Sperre */ }
  try { const h = await open(pfad, "wx"); await h.close(); return pfad; } catch { return null; }
}

async function token() { try { return (await readFile(join(DATEN, "github-token"), "utf8")).trim(); } catch { return ""; } }

async function holeJson(url, etag, tok) {
  const kopf = { "User-Agent": "spezial-spiegel", Accept: "application/vnd.github+json" };
  if (etag) kopf["If-None-Match"] = etag;
  if (tok) kopf.Authorization = "Bearer " + tok;
  const r = await fetch(url, { headers: kopf, signal: AbortSignal.timeout(60000) });
  if (r.status === 304) return { unveraendert: true };
  if (!r.ok) throw new Error("HTTP " + r.status + " für " + url);
  return { json: await r.json(), etag: r.headers.get("etag") };
}

async function shaVon(pfad) {
  const h = createHash("sha256");
  await pipeline(createReadStream(pfad), h);
  return h.digest("hex");
}

async function lade(url, ziel, tok) {
  const kopf = { "User-Agent": "spezial-spiegel", Accept: "application/octet-stream" };
  if (tok) kopf.Authorization = "Bearer " + tok;
  const r = await fetch(url, { headers: kopf, redirect: "follow", signal: AbortSignal.timeout(30 * 60 * 1000) });
  if (!r.ok || !r.body) throw new Error("HTTP " + r.status);
  const zw = ziel + ".teil-" + process.pid;
  let n = 0;
  const h = createHash("sha256");
  const zaehl = new TransformStream({ transform(stueck, c) { n += stueck.length; if (n > MAX_BYTES) c.error(new Error("zu groß")); else { h.update(stueck); c.enqueue(stueck); } } });
  await pipeline(Readable.fromWeb(r.body.pipeThrough(zaehl)), createWriteStream(zw));
  return { zw, groesse: n, sha256: h.digest("hex") };
}

export async function spiegeln({ quellen = QUELLEN, daten = DATEN, api = API, log = console.log } = {}) {
  const cfg = JSON.parse(await readFile(quellen, "utf8"));
  if (!Array.isArray(cfg.apps) || cfg.apps.some((a) => !APP_ID.test(a.id) || !/^[A-Za-z0-9._-]+$/.test(a.repo))) { log("✗ quellen.json: Kennung oder Repo ungültig"); return 2; }
  await mkdir(join(daten, "dateien"), { recursive: true });
  const lock = await sperre(join(daten, ".spiegel.lock"));
  if (!lock) { log("· ein anderer Lauf ist noch dran — nichts zu tun"); return 0; }
  const standPfad = join(daten, "stand.json");
  let stand = { apps: {}, etags: {} };
  try { stand = JSON.parse(await readFile(standPfad, "utf8")); stand.apps ||= {}; stand.etags ||= {}; } catch { /* erster Lauf */ }
  const tok = await token();
  let fehler = 0;
  try {
    for (const app of cfg.apps) {
      const url = `${api}/repos/${cfg.besitzer}/${app.repo}/releases?per_page=40`;
      let releases;
      try {
        const r = await holeJson(url, stand.etags[app.id] && stand.apps[app.id] ? stand.etags[app.id] : null, tok);
        if (r.unveraendert) { log(`= ${app.id}: unverändert`); continue; }
        releases = r.json; stand.etags[app.id] = r.etag || null;
      } catch (e) { log(`✗ ${app.id}: Liste nicht erreichbar (${e.message})`); fehler++; continue; }
      const eintrag = stand.apps[app.id] || {};
      eintrag.name = app.name;
      for (const art of ["android", "windows"]) {
        const w = waehle(releases, art, cfg);
        if (!w) { if (eintrag[art]) log(`! ${app.id}/${art}: an der Quelle nichts Passendes mehr — die vorhandene Datei bleibt`); else log(`· ${app.id}/${art}: keine Datei`); continue; }
        const ordner = join(daten, "dateien", app.id);
        await mkdir(ordner, { recursive: true });
        const ziel = join(ordner, w.datei);
        const alt = eintrag[art];
        if (alt && alt.datei === w.datei && alt.tag === w.tag) {
          try { const s = await stat(ziel); if (s.size === alt.groesse) { log(`= ${app.id}/${art}: ${w.datei} liegt schon`); continue; } } catch { /* fehlt, neu holen */ }
        }
        try {
          log(`↓ ${app.id}/${art}: ${w.tag} ${w.datei}`);
          const g = await lade(w.url, ziel, tok);
          if (typeof w.groesse === "number" && g.groesse !== w.groesse) throw new Error(`Größe ${g.groesse} statt ${w.groesse}`);
          if (w.sha256Quelle && g.sha256 !== w.sha256Quelle) throw new Error("SHA-256 passt nicht zur Angabe von GitHub");
          await rename(g.zw, ziel);
          eintrag[art] = { tag: w.tag, version: w.version, datei: w.datei, groesse: g.groesse, sha256: g.sha256, veroeffentlicht: w.veroeffentlicht, geholt: new Date().toISOString() };
          if (alt && alt.datei !== w.datei) { try { await unlink(join(ordner, alt.datei)); log(`  alte Datei ${alt.datei} entfernt`); } catch { /* schon weg */ } }
        } catch (e) {
          log(`✗ ${app.id}/${art}: ${e.message}`); fehler++;
          try { for (const f of await readdir(ordner)) if (f.includes(".teil-")) await unlink(join(ordner, f)); } catch { /* nichts */ }
        }
      }
      stand.apps[app.id] = eintrag;
    }
    stand.zeit = new Date().toISOString();
    await writeFile(standPfad + ".neu", JSON.stringify(stand, null, 2));
    await rename(standPfad + ".neu", standPfad);
  } finally { try { await unlink(lock); } catch { /* weg */ } }
  log(fehler ? `== ${fehler} Fehler` : "== fertig");
  return fehler ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  spiegeln().then((c) => process.exit(c), (e) => { console.error("✗", e); process.exit(2); });
}

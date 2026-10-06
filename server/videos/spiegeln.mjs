#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// spiegeln.mjs — holt die Werbe- und Erklärvideos auf den eigenen Server
// (Klaus 2026-10-06: „jedes Werbevideo … in einen separaten Ordner",
// Beispiel videos.family-projekt.de/workfloh-pdf/…).
//
// Läuft auf dem Hetzner-CLOUD-Server, per Cron, in einem Wegwerf-Container:
//   docker run --rm -v /srv/family-project:/app:ro -v /srv/videos:/videos \
//     node:22-alpine node /app/server/videos/spiegeln.mjs
//
// Was es tut — und was es mit Absicht NICHT tut:
//   · Quellen stehen in quellen.json (dieselben öffentlichen github.io-Adressen,
//     die die Apps heute benutzen). Klaus lädt weiter nur auf GitHub hoch.
//   · „teile": videos.json mit geprüften Teilen (Family-Projekt.de-Video).
//     Jeder Teil wird gegen Größe und SHA-256 geprüft, dann zu <id>.mp4
//     zusammengesetzt und das Ganze noch einmal gegen seine SHA-256 geprüft.
//     Neu zusammengesetzt wird nur, wenn sich die Liste der Teile geändert hat.
//   · „dateien": einzelne Dateien, geholt mit If-None-Match / If-Modified-Since.
//   · Geschrieben wird immer erst in eine Zwischendatei, dann umbenannt —
//     ein halber Download steht nie unter dem richtigen Namen.
//   · GELÖSCHT WIRD NIE. Verschwindet etwas an der Quelle, wird es gemeldet und
//     bleibt liegen. Ein Fehler an der Quelle soll keine Datei auf dem Server
//     mitnehmen.
//   · Eine fehlende Quelle wird GEMELDET (Rückgabewert 1), nie still übersprungen.
//   · Namen: Ordner ^[a-z0-9-]+$, Dateien ^[A-Za-z0-9._-]+$, kein „..",
//     kein führender Punkt. Alles andere bricht ab (Rückgabewert 2).
//
// Rückgabewerte: 0 alles da · 1 etwas fehlt oder stimmt nicht · 2 Aufbaufehler
// ═══════════════════════════════════════════════════════════════════════

import { createHash, randomBytes } from "node:crypto";
import { createWriteStream, createReadStream } from "node:fs";
import { mkdir, readFile, writeFile, rename, stat, readdir, unlink, open } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const HIER = dirname(fileURLToPath(import.meta.url));

function arg(name, vorgabe) {
  const i = process.argv.indexOf(name);
  if (i === -1) return vorgabe;
  if (process.argv.indexOf(name, i + 1) !== -1) {
    console.error(`✗ ${name} doppelt angegeben — welcher Wert gilt, wäre geraten`);
    process.exit(2);
  }
  const w = process.argv[i + 1];
  if (w === undefined || w === "" || w.startsWith("--")) {
    console.error(`✗ ${name} ohne Wert`);
    process.exit(2);
  }
  return w;
}

const QUELLEN = arg("--quellen", join(HIER, "quellen.json"));
const ZIEL = arg("--ziel", process.env.VIDEOS_ZIEL || "/videos");
const NUR = arg("--nur", null);
const FRIST_MS = Number(process.env.VIDEOS_FRIST_MS || 15 * 60 * 1000); // je Abruf
const MAX_BYTES = 1024 * 1024 * 1024; // 1 GB je Datei — ein Riegel, keine Messung
const SPERRE_ALT_MS = 3 * 60 * 60 * 1000; // eine Sperre älter als 3 h gilt als liegengeblieben

export const ORDNER_NAME = /^[a-z0-9-]+$/;
export const DATEI_NAME = /^[A-Za-z0-9._-]+$/;
export const SHA = /^[0-9a-f]{64}$/;

export function dateiNameOk(n) {
  return typeof n === "string" && DATEI_NAME.test(n) && !n.startsWith(".") && !n.includes("..");
}
export function ordnerNameOk(n) {
  return typeof n === "string" && ORDNER_NAME.test(n);
}
// Ein Pfad AN DER QUELLE: Teile aus Buchstaben, Ziffern, . _ - getrennt durch /,
// kein leerer Teil, kein „..". Er wird an die Basis gehängt, nie an die Platte.
export function quellPfadOk(p) {
  if (typeof p !== "string" || !p || p.startsWith("/")) return false;
  return p.split("/").every((t) => t && t !== "." && t !== ".." && /^[A-Za-z0-9._-]+$/.test(t));
}

function zeit() {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}
const meldungen = { ok: 0, neu: 0, fehler: 0, hinweis: 0 };
function log(art, text) {
  if (art in meldungen) meldungen[art]++;
  const z = { ok: "✓", neu: "⬇", fehler: "✗", hinweis: "•" }[art] || " ";
  console.log(`${zeit()} ${z} ${text}`);
}

async function lies(pfad) {
  try { return await readFile(pfad, "utf8"); } catch { return null; }
}
async function liesJson(pfad) {
  const t = await lies(pfad);
  if (t === null) return null;
  try { return JSON.parse(t); } catch { return null; }
}
async function schreibJson(pfad, wert) {
  const tmp = pfad + ".tmp-" + randomBytes(4).toString("hex");
  await writeFile(tmp, JSON.stringify(wert, null, 2) + "\n");
  await rename(tmp, pfad);
}
async function groesse(pfad) {
  try { return (await stat(pfad)).size; } catch { return -1; }
}
async function shaVon(pfad) {
  const h = createHash("sha256");
  await pipeline(createReadStream(pfad), h);
  return h.digest("hex");
}

// Holt eine Adresse in eine Zwischendatei neben dem Ziel. Liefert
// { status, tmp, bytes, sha, etag, lastModified }. Die Zwischendatei
// benennt der Aufrufer um — oder löscht sie, wenn die Prüfung scheitert.
async function holen(url, zielPfad, kopf = {}) {
  let antwort;
  try {
    antwort = await fetch(url, { headers: kopf, redirect: "follow", signal: AbortSignal.timeout(FRIST_MS) });
  } catch (e) {
    return { status: 0, grund: String(e && e.message || e) };
  }
  const etag = antwort.headers.get("etag");
  const lastModified = antwort.headers.get("last-modified");
  if (antwort.status !== 200) {
    try { await antwort.body?.cancel(); } catch {}
    return { status: antwort.status, etag, lastModified };
  }
  const laenge = Number(antwort.headers.get("content-length") || 0);
  if (laenge > MAX_BYTES) {
    try { await antwort.body?.cancel(); } catch {}
    return { status: 413, grund: `größer als ${MAX_BYTES} Bytes` };
  }
  const tmp = zielPfad + ".tmp-" + randomBytes(4).toString("hex");
  const h = createHash("sha256");
  let bytes = 0;
  try {
    const strom = Readable.fromWeb(antwort.body);
    strom.on("data", (stueck) => {
      bytes += stueck.length;
      h.update(stueck);
      if (bytes > MAX_BYTES) strom.destroy(new Error(`größer als ${MAX_BYTES} Bytes`));
    });
    await pipeline(strom, createWriteStream(tmp));
  } catch (e) {
    try { await unlink(tmp); } catch {}
    return { status: 0, grund: String(e && e.message || e) };
  }
  return { status: 200, tmp, bytes, sha: h.digest("hex"), etag, lastModified };
}

// ── Sorte „dateien" ─────────────────────────────────────────────────────
async function dateiSpiegeln(ordner, ordnerPfad, standPfad, eintrag, erwartet) {
  const von = eintrag && eintrag.von;
  const als = (eintrag && eintrag.als) || (typeof von === "string" ? basename(von) : "");
  if (!quellPfadOk(von) || !dateiNameOk(als)) {
    log("fehler", `${ordner.name}: ungültiger Eintrag ${JSON.stringify(eintrag)} — übersprungen und gemeldet`);
    return;
  }
  if (erwartet.has(als)) {
    log("fehler", `${ordner.name}/${als}: Name doppelt in quellen.json — der zweite Eintrag wird nicht gespiegelt`);
    return;
  }
  erwartet.add(als);
  const ziel = join(ordnerPfad, als);
  const standDatei = join(standPfad, "datei-" + als + ".json");
  const stand = (await liesJson(standDatei)) || {};
  const da = await groesse(ziel);
  const kopf = {};
  if (da >= 0 && stand.groesse === da) {
    if (stand.etag) kopf["If-None-Match"] = stand.etag;
    if (stand.lastModified) kopf["If-Modified-Since"] = stand.lastModified;
  }
  const r = await holen(ordner.basis + von, ziel, kopf);
  if (r.status === 304) { log("ok", `${ordner.name}/${als} unverändert`); return; }
  if (r.status !== 200) {
    const was = r.status === 404 ? "fehlt an der Quelle" : `nicht geholt (${r.status || r.grund})`;
    log("fehler", `${ordner.name}/${als}: ${was} — ${ordner.basis + von}${da >= 0 ? " · die vorhandene Datei bleibt liegen" : ""}`);
    return;
  }
  if (r.bytes === 0) {
    await unlink(r.tmp).catch(() => {});
    log("fehler", `${ordner.name}/${als}: Quelle lieferte 0 Bytes — nicht übernommen`);
    return;
  }
  if (da === r.bytes && stand.sha256 === r.sha) {
    await unlink(r.tmp).catch(() => {});
    log("ok", `${ordner.name}/${als} unverändert (gleicher Inhalt)`);
  } else {
    await rename(r.tmp, ziel);
    log("neu", `${ordner.name}/${als} · ${r.bytes} Bytes`);
  }
  await schreibJson(standDatei, { von: ordner.basis + von, groesse: r.bytes, sha256: r.sha, etag: r.etag || null, lastModified: r.lastModified || null, geholt: zeit() });
}

// Holt eine Datei mit bekannter Größe/SHA (Teil, Vorschau). Liegt sie schon
// richtig da, wird nichts geholt.
async function geprueftHolen(url, ziel, soll, beschreibung) {
  if ((await groesse(ziel)) === soll.groesse && (await shaVon(ziel)) === soll.sha256) return "da";
  const r = await holen(url, ziel);
  if (r.status !== 200) {
    log("fehler", `${beschreibung}: ${r.status === 404 ? "fehlt an der Quelle" : `nicht geholt (${r.status || r.grund})`} — ${url}`);
    return "fehler";
  }
  if (r.bytes !== soll.groesse || r.sha !== soll.sha256) {
    await unlink(r.tmp).catch(() => {});
    log("fehler", `${beschreibung}: stimmt nicht (erwartet ${soll.groesse} Bytes / ${soll.sha256.slice(0, 12)}…, bekommen ${r.bytes} / ${r.sha.slice(0, 12)}…) — verworfen`);
    return "fehler";
  }
  await rename(r.tmp, ziel);
  return "neu";
}

// ── Sorte „teile" ──────────────────────────────────────────────────────
async function teileSpiegeln(ordner, ordnerPfad, standPfad, teileLager, erwartet) {
  if (!quellPfadOk(ordner.teile)) {
    log("fehler", `${ordner.name}: „teile" ist kein gültiger Pfad`);
    return;
  }
  const listeUrl = ordner.basis + ordner.teile;
  const listeDatei = join(ordnerPfad, basename(ordner.teile));
  const r = await holen(listeUrl, listeDatei);
  if (r.status !== 200) {
    log("fehler", `${ordner.name}: ${basename(ordner.teile)} ${r.status === 404 ? "fehlt an der Quelle" : `nicht geholt (${r.status || r.grund})`} — ${listeUrl} · nichts an den Videos geändert`);
    return;
  }
  let liste;
  try { liste = JSON.parse(await readFile(r.tmp, "utf8")); } catch { liste = null; }
  if (!liste || !Array.isArray(liste.videos)) {
    await unlink(r.tmp).catch(() => {});
    log("fehler", `${ordner.name}: ${basename(ordner.teile)} ist kein lesbares JSON mit „videos" — nichts geändert`);
    return;
  }
  for (const v of liste.videos) {
    const id = v && v.id;
    if (!dateiNameOk(id)) { log("fehler", `${ordner.name}: Video mit ungültiger Kennung ${JSON.stringify(id)} — übersprungen`); continue; }
    const teile = Array.isArray(v.teile) ? v.teile : [];
    if (!teile.length || !teile.every((t) => t && Number.isInteger(t.groesse) && t.groesse > 0 && SHA.test(String(t.sha256)))) {
      log("fehler", `${ordner.name}/${id}: Teil-Liste fehlt oder ist unvollständig — übersprungen`);
      continue;
    }
    const name = id + ".mp4";
    erwartet.add(name);
    const ziel = join(ordnerPfad, name);
    const standDatei = join(standPfad, "teile-" + id + ".json");
    const stand = (await liesJson(standDatei)) || {};
    const fingerabdruck = teile.map((t) => t.sha256).join(",");
    const gesamt = teile.reduce((s, t) => s + t.groesse, 0);
    if (stand.teile === fingerabdruck && (await groesse(ziel)) === gesamt) {
      log("ok", `${ordner.name}/${name} unverändert (${teile.length} Teile)`);
    } else {
      let gut = true;
      for (let i = 0; i < teile.length; i++) {
        const t = teile[i];
        const url = ordner.basis + "videos/" + id + "/teil-" + String(i).padStart(2, "0") + ".bin";
        const lager = join(teileLager, t.sha256 + ".bin");
        const e = await geprueftHolen(url, lager, t, `${ordner.name}/${id} Teil ${i}`);
        if (e === "fehler") { gut = false; break; }
      }
      if (!gut) {
        log("fehler", `${ordner.name}/${name}: nicht zusammengesetzt${(await groesse(ziel)) >= 0 ? " · die vorhandene Fassung bleibt liegen" : ""}`);
      } else {
        const tmp = ziel + ".tmp-" + randomBytes(4).toString("hex");
        const h = createHash("sha256");
        const aus = createWriteStream(tmp);
        for (const t of teile) {
          const ein = createReadStream(join(teileLager, t.sha256 + ".bin"));
          ein.on("data", (s) => h.update(s));
          await pipeline(ein, aus, { end: false });
        }
        await new Promise((ok, nein) => aus.end((e) => (e ? nein(e) : ok())));
        const sha = h.digest("hex");
        if (SHA.test(String(v.sha256)) && sha !== v.sha256) {
          await unlink(tmp).catch(() => {});
          log("fehler", `${ordner.name}/${name}: zusammengesetzt, aber die Gesamt-SHA-256 stimmt nicht — verworfen`);
        } else {
          await rename(tmp, ziel);
          await schreibJson(standDatei, { teile: fingerabdruck, groesse: gesamt, sha256: sha, gebaut: zeit() });
          log("neu", `${ordner.name}/${name} · ${teile.length} Teile · ${gesamt} Bytes`);
        }
      }
    }
    // Vorschaubild und Vorschaufilm, wenn die Liste sie nennt.
    if (typeof v.vorschau === "string" && quellPfadOk(v.vorschau)) {
      const vname = id + "-vorschau" + (v.vorschau.match(/\.[A-Za-z0-9]+$/) || [".jpg"])[0];
      if (dateiNameOk(vname)) await dateiSpiegeln(ordner, ordnerPfad, standPfad, { von: v.vorschau, als: vname }, erwartet);
    }
    const vf = v.vorschauFilm;
    if (vf && quellPfadOk(vf.pfad) && Number.isInteger(vf.groesse) && SHA.test(String(vf.sha256))) {
      const fname = id + "-vorschau.mp4";
      erwartet.add(fname);
      const e = await geprueftHolen(ordner.basis + vf.pfad, join(ordnerPfad, fname), vf, `${ordner.name}/${fname}`);
      if (e === "neu") log("neu", `${ordner.name}/${fname} · ${vf.groesse} Bytes`);
      else if (e === "da") log("ok", `${ordner.name}/${fname} unverändert`);
    }
  }
  // Die Liste selbst liegt mit im Ordner — Titel, Maße, Dauer für Schritt 2.
  await rename(r.tmp, listeDatei);
  erwartet.add(basename(listeDatei));
}

// Was im Ordner liegt und in der Quelle nicht mehr vorkommt: gemeldet, nicht gelöscht.
async function verwaistMelden(ordnerName, ordnerPfad, erwartet) {
  let namen = [];
  try { namen = await readdir(ordnerPfad); } catch { return; }
  for (const n of namen) {
    if (n.startsWith(".")) continue;
    if (n.includes(".tmp-")) { log("hinweis", `${ordnerName}/${n}: liegengebliebene Zwischendatei`); continue; }
    if (!erwartet.has(n)) log("hinweis", `${ordnerName}/${n}: steht nicht mehr in der Quelle — bleibt liegen, gelöscht wird nie`);
  }
}

async function sperren() {
  const pfad = join(ZIEL, ".spiegel.lock");
  try {
    const h = await open(pfad, "wx");
    await h.writeFile(String(process.pid) + " " + zeit());
    await h.close();
    return pfad;
  } catch {
    try {
      const s = await stat(pfad);
      if (Date.now() - s.mtimeMs > SPERRE_ALT_MS) {
        log("hinweis", "eine alte Sperre lag noch da (älter als 3 h) — wird übernommen");
        await writeFile(pfad, String(process.pid) + " " + zeit());
        return pfad;
      }
    } catch {}
    return null;
  }
}

async function main() {
  let q;
  try { q = JSON.parse(await readFile(QUELLEN, "utf8")); } catch (e) {
    console.error(`✗ ${QUELLEN} nicht lesbar: ${e.message}`);
    return 2;
  }
  if (!q || !Array.isArray(q.ordner) || !q.ordner.length) { console.error("✗ quellen.json trägt keine Ordner"); return 2; }
  const gesehen = new Set();
  for (const o of q.ordner) {
    if (!o || !ordnerNameOk(o.name)) { console.error(`✗ ungültiger Ordnername ${JSON.stringify(o && o.name)}`); return 2; }
    if (gesehen.has(o.name)) { console.error(`✗ Ordner doppelt: ${o.name}`); return 2; }
    gesehen.add(o.name);
    if (typeof o.basis !== "string" || !/^https:\/\/[^/]+\/.*\/$|^https:\/\/[^/]+\/$/.test(o.basis)) {
      if (!(process.env.VIDEOS_HTTP_ERLAUBT === "1" && /^http:\/\/127\.0\.0\.1:\d+\/(.*\/)?$/.test(o.basis || ""))) {
        console.error(`✗ ${o.name}: „basis" muss eine https-Adresse sein, die auf / endet`);
        return 2;
      }
    }
    if (!o.teile && !(Array.isArray(o.dateien) && o.dateien.length)) { console.error(`✗ ${o.name}: weder „teile" noch „dateien"`); return 2; }
  }
  if (NUR && !gesehen.has(NUR)) { console.error(`✗ --nur ${NUR}: diesen Ordner gibt es in quellen.json nicht`); return 2; }

  await mkdir(ZIEL, { recursive: true });
  const sperre = await sperren();
  if (!sperre) { log("hinweis", "ein anderer Lauf ist noch nicht fertig — dieser hört auf"); return 0; }
  const teileLager = join(ZIEL, ".spiegel", "teile");
  await mkdir(teileLager, { recursive: true });
  log("hinweis", `Lauf beginnt · Ziel ${ZIEL}`);
  try {
    for (const o of q.ordner) {
      if (NUR && o.name !== NUR) continue;
      const ordnerPfad = join(ZIEL, o.name);
      const standPfad = join(ZIEL, ".spiegel", "stand", o.name);
      await mkdir(ordnerPfad, { recursive: true });
      await mkdir(standPfad, { recursive: true });
      const erwartet = new Set();
      if (o.teile) await teileSpiegeln(o, ordnerPfad, standPfad, teileLager, erwartet);
      for (const d of o.dateien || []) await dateiSpiegeln(o, ordnerPfad, standPfad, d, erwartet);
      await verwaistMelden(o.name, ordnerPfad, erwartet);
    }
  } finally {
    await unlink(sperre).catch(() => {});
  }
  log("hinweis", `Lauf fertig · ${meldungen.neu} neu · ${meldungen.ok} unverändert · ${meldungen.fehler} Fehler · ${meldungen.hinweis - 1} Hinweise`);
  return meldungen.fehler ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((c) => process.exit(c), (e) => { console.error("✗ unerwartet:", e); process.exit(2); });
}

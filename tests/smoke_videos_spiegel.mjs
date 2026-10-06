/* Wächter über den Video-Spiegel auf dem eigenen Server (Klaus 2026-10-06).
 *
 *   node tests/smoke_videos_spiegel.mjs
 *
 * Klaus: „jedes Werbevideo … in einen separaten Ordner" — Beispiel
 * videos.family-projekt.de/workfloh-pdf/…
 *
 * Gemessen wird das ECHTE Skript server/videos/spiegeln.mjs, als Kindprozess,
 * gegen einen gestellten Server auf 127.0.0.1 (github.io ist aus dem Behälter
 * nicht erreichbar). Ziel ist ein Wegwerf-Verzeichnis. Ohne Browser, ohne Pakete.
 *
 * ⚠ BENANNTE GRENZE: der echte Server, echte github.io-Abrufe und Caddy im
 * Container sind hier NICHT gemessen. Die Caddyfile wird nur als Text gelesen.
 */
import { createHash } from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKRIPT = path.join(ROOT, "server/videos/spiegeln.mjs");
let pass = 0, fail = 0;
const ok = (b, t) => { if (b) { pass++; console.log("  ✓", t); } else { fail++; console.log("  ✗", t); } };
const sha = (b) => createHash("sha256").update(b).digest("hex");

// ── gestellte Quelle ─────────────────────────────────────────────────────
const teil0 = Buffer.from("A".repeat(1000)), teil1 = Buffer.from("B".repeat(700));
const ganz = Buffer.concat([teil0, teil1]);
const vorschau = Buffer.from("JPEG-ERSATZ-1234");
const quelle = new Map(); // Pfad → Buffer
const zaehler = new Map(); // Pfad → Abrufe mit Status 200
let zaehler304 = 0;
function liste(over = {}) {
  return Buffer.from(JSON.stringify({ fassung: 1, videos: [{
    id: "werbung-1", dateiname: "werbung-1.mp4", groesse: ganz.length, sha256: sha(ganz),
    vorschau: "videos/werbung-1/vorschau.jpg",
    teile: [{ groesse: teil0.length, sha256: sha(teil0) }, { groesse: teil1.length, sha256: sha(teil1) }],
    ...over,
  }] }));
}
function grundstand() {
  quelle.clear();
  quelle.set("/fp/videos.json", liste());
  quelle.set("/fp/videos/werbung-1/teil-00.bin", teil0);
  quelle.set("/fp/videos/werbung-1/teil-01.bin", teil1);
  quelle.set("/fp/videos/werbung-1/vorschau.jpg", vorschau);
  quelle.set("/wf/assets/film-de.mp4", Buffer.from("FILM-DE-INHALT"));
  quelle.set("/wf/assets/leer.mp4", Buffer.alloc(0));
}
grundstand();
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  const b = quelle.get(p);
  if (!b) { res.writeHead(404); return res.end(); }
  const etag = '"' + sha(b).slice(0, 16) + '"';
  if (req.headers["if-none-match"] === etag) { zaehler304++; res.writeHead(304, { etag }); return res.end(); }
  zaehler.set(p, (zaehler.get(p) || 0) + 1);
  res.writeHead(200, { etag, "content-length": b.length });
  res.end(b);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASIS = `http://127.0.0.1:${server.address().port}`;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "videos-spiegel-"));
const ZIEL = path.join(TMP, "videos");
function quellen(ordner) {
  const f = path.join(TMP, "quellen-" + Math.random().toString(36).slice(2) + ".json");
  fs.writeFileSync(f, JSON.stringify({ fassung: 1, ordner }));
  return f;
}
const STANDARD = [
  { name: "family-project", basis: BASIS + "/fp/", teile: "videos.json" },
  { name: "workfloh-pdf", basis: BASIS + "/wf/", dateien: [{ von: "assets/film-de.mp4" }] },
];
function lauf(q, extraArgs = [], env = {}) {
  return new Promise((resolve) => {
    const zielArgs = extraArgs.includes("--ziel") ? [] : ["--ziel", ZIEL];
    const k = spawn(process.execPath, [SKRIPT, "--quellen", q, ...zielArgs, ...extraArgs], {
      env: { ...process.env, VIDEOS_HTTP_ERLAUBT: "1", VIDEOS_FRIST_MS: "20000", ...env },
    });
    let aus = "";
    k.stdout.on("data", (d) => (aus += d));
    k.stderr.on("data", (d) => (aus += d));
    const uhr = setTimeout(() => k.kill("SIGKILL"), 60000);
    k.on("close", (code) => { clearTimeout(uhr); resolve({ code, aus }); });
  });
}
const datei = (...t) => path.join(ZIEL, ...t);
const da = (...t) => fs.existsSync(datei(...t));
const inhalt = (...t) => (da(...t) ? fs.readFileSync(datei(...t)) : Buffer.alloc(0));

try {
  console.log("Abschnitt 1 · erster Lauf");
  let r = await lauf(quellen(STANDARD));
  ok(r.code === 0, `Rückgabewert 0 (war ${r.code})`);
  ok(da("family-project", "werbung-1.mp4"), "Teile zu family-project/werbung-1.mp4 zusammengesetzt");
  ok(sha(inhalt("family-project", "werbung-1.mp4")) === sha(ganz), "zusammengesetztes Video stimmt Byte für Byte (SHA-256)");
  ok(da("family-project", "werbung-1-vorschau.jpg") && inhalt("family-project", "werbung-1-vorschau.jpg").equals(vorschau), "Vorschaubild liegt daneben");
  ok(da("family-project", "videos.json"), "die Liste liegt mit im Ordner");
  ok(inhalt("workfloh-pdf", "film-de.mp4").toString() === "FILM-DE-INHALT", "einzelne Datei liegt in ihrem eigenen Ordner workfloh-pdf/");
  ok(!fs.readdirSync(datei("family-project")).some((n) => n.includes(".tmp-")), "keine Zwischendatei liegengeblieben");
  ok(!da(".spiegel.lock"), "Sperre nach dem Lauf weggeräumt");

  console.log("Abschnitt 2 · zweiter Lauf holt nichts neu");
  const teilAbrufe = zaehler.get("/fp/videos/werbung-1/teil-00.bin");
  const filmAbrufe = zaehler.get("/wf/assets/film-de.mp4");
  const vor304 = zaehler304;
  const inodeVor = fs.statSync(path.join(datei("family-project"), "werbung-1.mp4")).ino;
  r = await lauf(quellen(STANDARD));
  ok(r.code === 0, `Rückgabewert 0 (war ${r.code})`);
  ok(zaehler.get("/fp/videos/werbung-1/teil-00.bin") === teilAbrufe, "Teile werden nicht neu geholt, wenn die Liste gleich ist");
  ok(zaehler.get("/wf/assets/film-de.mp4") === filmAbrufe && zaehler304 > vor304, "einzelne Datei: If-None-Match → 304, kein neuer Abruf");
  ok(/unverändert/.test(r.aus), "meldet „unverändert“");
  ok(fs.statSync(path.join(datei("family-project"), "werbung-1.mp4")).ino === inodeVor && /werbung-1\.mp4 unverändert \(2 Teile\)/.test(r.aus),
    "unveränderte Teile: das Video wird nicht neu zusammengesetzt (gleiche Datei, Meldung „unverändert (2 Teile)“)");

  console.log("Abschnitt 3 · Teil mit falscher SHA wird verworfen");
  const ZIEL_ALT = fs.readFileSync(datei("family-project", "werbung-1.mp4"));
  quelle.set("/fp/videos/werbung-1/teil-01.bin", Buffer.from("C".repeat(700))); // gleiche Größe, anderer Inhalt
  quelle.set("/fp/videos.json", liste({ teile: [{ groesse: 1000, sha256: sha(teil0) }, { groesse: 700, sha256: sha(Buffer.from("D".repeat(700))) }] }));
  r = await lauf(quellen(STANDARD));
  ok(r.code === 1, `Rückgabewert 1 (war ${r.code})`);
  ok(/stimmt nicht/.test(r.aus) && /verworfen/.test(r.aus), "meldet „stimmt nicht … verworfen“");
  ok(inhalt("family-project", "werbung-1.mp4").equals(ZIEL_ALT), "die vorhandene Fassung bleibt unverändert liegen");
  ok(!fs.readdirSync(path.join(ZIEL, ".spiegel", "teile")).includes(sha(Buffer.from("D".repeat(700))) + ".bin"), "der falsche Teil liegt nicht im Lager");
  grundstand();

  console.log("Abschnitt 4 · Gesamt-SHA stimmt nicht");
  quelle.set("/fp/videos.json", liste({ id: "werbung-2", sha256: "0".repeat(64) }));
  quelle.set("/fp/videos/werbung-2/teil-00.bin", teil0);
  quelle.set("/fp/videos/werbung-2/teil-01.bin", teil1);
  r = await lauf(quellen(STANDARD));
  ok(r.code === 1, `Rückgabewert 1 (war ${r.code})`);
  ok(/Gesamt-SHA-256 stimmt nicht/.test(r.aus), "meldet die falsche Gesamt-SHA-256");
  ok(!da("family-project", "werbung-2.mp4"), "kein werbung-2.mp4 unter dem richtigen Namen");
  grundstand();

  console.log("Abschnitt 5 · fehlt an der Quelle: gemeldet, nichts gelöscht");
  quelle.delete("/wf/assets/film-de.mp4");
  fs.writeFileSync(datei("workfloh-pdf", "alt-handgelegt.mp4"), "ALT");
  r = await lauf(quellen(STANDARD));
  ok(r.code === 1, `Rückgabewert 1 (war ${r.code})`);
  ok(/fehlt an der Quelle/.test(r.aus) && /bleibt liegen/.test(r.aus), "meldet „fehlt an der Quelle … bleibt liegen“");
  ok(inhalt("workfloh-pdf", "film-de.mp4").toString() === "FILM-DE-INHALT", "die vorhandene Datei bleibt liegen");
  ok(da("workfloh-pdf", "alt-handgelegt.mp4"), "eine Datei, die nicht in der Quelle steht, wird nicht gelöscht");
  ok(/alt-handgelegt\.mp4: steht nicht mehr in der Quelle/.test(r.aus), "… aber gemeldet");
  grundstand();

  console.log("Abschnitt 6 · 0 Bytes werden nicht übernommen");
  r = await lauf(quellen([{ name: "workfloh-pdf", basis: BASIS + "/wf/", dateien: [{ von: "assets/leer.mp4" }] }]));
  ok(r.code === 1, `Rückgabewert 1 (war ${r.code})`);
  ok(/0 Bytes/.test(r.aus) && !da("workfloh-pdf", "leer.mp4"), "leere Datei nicht übernommen, gemeldet");

  console.log("Abschnitt 7 · ungültige Namen brechen ab (Rückgabewert 2)");
  for (const [was, ordner] of [
    ["Ordnername mit ..", [{ name: "../raus", basis: BASIS + "/fp/", teile: "videos.json" }]],
    ["Ordnername mit Großbuchstaben", [{ name: "Family", basis: BASIS + "/fp/", teile: "videos.json" }]],
    ["Basis ohne https", [{ name: "x", basis: "http://example.org/", teile: "videos.json" }]],
    ["Ordner doppelt", [STANDARD[0], STANDARD[0]]],
    ["weder teile noch dateien", [{ name: "x", basis: BASIS + "/fp/" }]],
  ]) {
    const rr = await lauf(quellen(ordner));
    ok(rr.code === 2, `${was} → 2 (war ${rr.code})`);
  }
  ok(!fs.existsSync(path.join(TMP, "raus")), "nichts außerhalb des Ziels angelegt");
  r = await lauf(quellen([{ name: "workfloh-pdf", basis: BASIS + "/wf/", dateien: [{ von: "../geheim.txt" }, { von: "assets/film-de.mp4", als: "../x.mp4" }] }]));
  ok(r.code === 1 && (r.aus.match(/ungültiger Eintrag/g) || []).length === 2, "Eintrag mit .. im Pfad oder Namen: übersprungen und gemeldet");
  ok(!fs.existsSync(path.join(ZIEL, "x.mp4")), "… und nichts neben den Ordner geschrieben");
  r = await lauf(quellen(STANDARD), ["--ziel", ""]);
  ok(r.code === 2 && /--ziel ohne Wert/.test(r.aus), `leeres --ziel → 2 (war ${r.code})`);
  r = await lauf(quellen(STANDARD), ["--ziel", ZIEL, "--ziel", path.join(TMP, "anders")]);
  ok(r.code === 2 && /doppelt/.test(r.aus), `--ziel doppelt → 2 (war ${r.code})`);
  r = await lauf(quellen(STANDARD), ["--nur", "gibt-es-nicht"]);
  ok(r.code === 2, `--nur mit unbekanntem Ordner → 2 (war ${r.code})`);

  console.log("Abschnitt 8 · Sperre");
  const vorAbrufe = [...zaehler.values()].reduce((a, b) => a + b, 0);
  fs.writeFileSync(datei(".spiegel.lock"), "123 jetzt");
  r = await lauf(quellen(STANDARD));
  ok(r.code === 0 && /anderer Lauf/.test(r.aus), "frische Sperre: der zweite Lauf hört auf");
  ok([...zaehler.values()].reduce((a, b) => a + b, 0) === vorAbrufe, "… und holt nichts");
  ok(da(".spiegel.lock"), "… und lässt die fremde Sperre liegen");
  const alt = new Date(Date.now() - 4 * 3600 * 1000);
  fs.utimesSync(datei(".spiegel.lock"), alt, alt);
  r = await lauf(quellen(STANDARD));
  ok(r.code === 0 && /alte Sperre/.test(r.aus), "Sperre älter als 3 h wird übernommen");
  ok(!da(".spiegel.lock"), "… und danach weggeräumt");

  console.log("Abschnitt 9 · Aufbau auf dem Server (als Text)");
  const caddy = fs.readFileSync(path.join(ROOT, "server/videos/Caddyfile"), "utf8");
  ok(/hide\s+\.\*/.test(caddy), "innere Caddyfile versteckt Punkt-Dateien (.spiegel)");
  ok(!/Access-Control-Allow-Origin\s+"?\*/.test(caddy), "CORS nie für * ");
  ok(!/\bbrowse\b/.test(caddy), "kein Verzeichnis-Listing");
  const block = fs.readFileSync(path.join(ROOT, "server/videos/Caddyfile.block"), "utf8");
  ok(/videos\.family-projekt\.de/.test(block) && /reverse_proxy\s+videos:80/.test(block), "äußerer Block leitet videos.family-projekt.de an den Dienst");
  ok(!/\bencode\b/.test(block), "kein encode im äußeren Block (Range-Abrufe bleiben heil)");
  const ein = fs.readFileSync(path.join(ROOT, "server/videos/einrichten.sh"), "utf8");
  ok(spawnSync("bash", ["-n", path.join(ROOT, "server/videos/einrichten.sh")]).status === 0, "einrichten.sh ist gültiges bash");
  ok(!/sed\s+-i[^\n]*Caddyfile/.test(ein) && !/\bcp\b[^\n]*\s(\/opt\/relay\/)?Caddyfile\s*$/m.test(ein), "Caddyfile nie mit sed -i oder cp überschrieben (Inode)");
  ok(/cat\s+"?\$BAK_CADDY"?\s*>\s*Caddyfile/.test(ein), "Rückweg schreibt die Sicherung mit cat > zurück");
  ok(/caddy validate/.test(ein) && /config -q/.test(ein), "prüft Caddy und Compose, bevor etwas neu geladen wird");
  ok(/grep -v videos-spiegel/.test(ein), "Cron-Zeile ersetzt sich selbst, wird nicht verdoppelt");
} catch (e) {
  fail++;
  console.log("  ✗ Probe gestolpert:", e && e.stack || e);
} finally {
  server.close();
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(`\n${pass} grün · ${fail} ROT`);
process.exit(fail ? 1 : 0);

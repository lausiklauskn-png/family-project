// Marktplatz Spezial: Spiegel + Dienst gegen ein GESTELLTES GitHub (Klaus 2026-11-26, Weg B).
// Ohne Browser, ohne Netz. node tests/smoke_spezial_dienst.mjs
import http from "node:http";
import { mkdtemp, writeFile, readFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

globalThis.self = globalThis;
const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const K = require(join(WURZEL, "assets/spezial-kern.js"));
const noble = await import(pathToFileURL(join(WURZEL, "sbkim/noble-secp256k1.js")).href);

let gruen = 0, rot = 0;
function soll(name, wahr, mehr) { if (wahr) { gruen++; console.log("✓ " + name); } else { rot++; console.log("✗ " + name + (mehr ? "  → " + mehr : "")); } }
process.on("unhandledRejection", (e) => { rot++; console.log("✗ Probe gestolpert: " + (e && e.stack || e)); console.log(`${gruen} grün · ${rot} ROT`); process.exitCode = 1; });

// ── gestelltes GitHub ───────────────────────────────────────────────────
const APK = Buffer.from("APK-INHALT-" + "x".repeat(5000)), EXE = Buffer.from("EXE-INHALT-" + "y".repeat(7000));
const shaHex = (b) => createHash("sha256").update(b).digest("hex");
let abrufe = 0, falschesDigest = false;
const gh = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), basis = "http://127.0.0.1:" + gh.address().port;
  if (u.pathname === "/repos/lausiklauskn-png/Private-Akte/releases") {
    abrufe++;
    if (req.headers["if-none-match"] === '"e1"') { res.writeHead(304); return res.end(); }
    res.writeHead(200, { "Content-Type": "application/json", ETag: '"e1"' });
    return res.end(JSON.stringify([
      { tag_name: "v9.9.9", draft: true, published_at: "2026-11-27", assets: [{ name: "Neu.apk", size: 1, browser_download_url: basis + "/x" }] },
      { tag_name: "v0.9.12-test", published_at: "2026-11-26T10:00:00Z", assets: [{ name: "Test.apk", size: 1, browser_download_url: basis + "/x" }] },
      { tag_name: "v0.9.11", published_at: "2026-11-26T09:00:00Z", assets: [
        { name: "Private-Akte-Pro-0.9.11-debug.apk", size: 3, browser_download_url: basis + "/x" },
        { name: "Private-Akte-Pro-0.9.11.apk", size: APK.length, digest: "sha256:" + (falschesDigest ? "0".repeat(64) : shaHex(APK)), browser_download_url: basis + "/dl/apk" },
        { name: "Private-Akte-Pro_0.9.11_x64-setup.exe", size: EXE.length, browser_download_url: basis + "/dl/exe" }] },
      { tag_name: "v0.9.10", published_at: "2026-11-24", assets: [{ name: "Alt.apk", size: 1, browser_download_url: basis + "/x" }] }
    ]));
  }
  if (u.pathname.startsWith("/repos/")) { res.writeHead(200, { "Content-Type": "application/json" }); return res.end("[]"); }
  if (u.pathname === "/dl/apk") { res.writeHead(200); return res.end(APK); }
  if (u.pathname === "/dl/exe") { res.writeHead(200); return res.end(EXE); }
  res.writeHead(404); res.end();
});
await new Promise((ok) => gh.listen(0, "127.0.0.1", ok));

// ── waehle() einzeln gefragt ────────────────────────────────────────────
const { waehle, spiegeln } = await import(pathToFileURL(join(WURZEL, "server/spezial/spiegeln.mjs")).href);
const cfg = JSON.parse(await readFile(join(WURZEL, "server/spezial/quellen.json"), "utf8"));
const rel = [{ tag_name: "v2-test", published_at: "3", assets: [{ name: "a.apk" }] }, { tag_name: "v1", published_at: "2", prerelease: true, assets: [{ name: "b.apk" }] }, { tag_name: "v0.5", published_at: "1", assets: [{ name: "c-debug.apk" }, { name: "c.apk" }, { name: "c.msi" }] }];
soll("waehle: überspringt Test-Tag, Vorabfassung und Debug-Datei", waehle(rel, "android", cfg)?.datei === "c.apk", JSON.stringify(waehle(rel, "android", cfg)));
soll("waehle: eine Vorabfassung zählt nur, wo die App sie für diese Art erlaubt", waehle(rel, "android", cfg, { vorab: ["android"] })?.datei === "b.apk" && waehle(rel, "android", cfg, { vorab: ["windows"] })?.datei === "c.apk");
soll("quellen.json: Familienakte nimmt Android-Vorabfassungen (so gibt ihr Release-Lauf aus)", (cfg.apps.find((a) => a.id === "familienakte")?.vorab || []).join() === "android");
soll("waehle: Windows nimmt .msi", waehle(rel, "windows", cfg)?.datei === "c.msi");
soll("waehle: ohne passende Datei → null", waehle([{ tag_name: "v1", assets: [{ name: "x.zip" }] }], "android", cfg) === null);
soll("waehle: ein Dateiname mit Pfad wird nicht genommen", waehle([{ tag_name: "v1", assets: [{ name: "../böse.apk" }] }], "android", cfg) === null);
soll("quellen.json: jede Kennung passt zum Passkey-Muster", cfg.apps.every((a) => K.APP_RE.test(a.id)) && new Set(cfg.apps.map((a) => a.id)).size === cfg.apps.length);

// ── Spiegel ─────────────────────────────────────────────────────────────
const DATEN = await mkdtemp(join(tmpdir(), "spezial-"));
const logs = [];
const api = "http://127.0.0.1:" + gh.address().port;
const rc = await spiegeln({ daten: DATEN, api, log: (s) => logs.push(s) });
soll("Spiegel: erster Lauf ohne Fehler", rc === 0, logs.join(" | "));
const stand = JSON.parse(await readFile(join(DATEN, "stand.json"), "utf8"));
const pa = stand.apps["private-akte"];
soll("Spiegel: nimmt die neueste Freigabe, nicht Entwurf/Test", pa?.android?.tag === "v0.9.11" && pa.android.datei === "Private-Akte-Pro-0.9.11.apk", JSON.stringify(pa));
soll("Spiegel: SHA-256 der abgelegten APK stimmt", pa?.android?.sha256 === shaHex(APK) && (await readFile(join(DATEN, "dateien/private-akte", pa.android.datei))).equals(APK));
soll("Spiegel: Windows-Installer liegt", pa?.windows?.datei === "Private-Akte-Pro_0.9.11_x64-setup.exe");
const vorher = abrufe; await spiegeln({ daten: DATEN, api, log: (s) => logs.push(s) });
soll("Spiegel: zweiter Lauf fragt mit If-None-Match (304, nichts neu)", abrufe === vorher + 1 && logs.some((l) => /private-akte: unverändert/.test(l)));
// eine geänderte Zeile in quellen.json gilt sofort, auch wenn GitHub 304 antworten würde
const Q2 = join(DATEN, "quellen-geaendert.json");
await writeFile(Q2, JSON.stringify({ ...cfg, apps: cfg.apps.map((a) => a.id === "private-akte" ? { ...a, vorab: ["windows"] } : a) }));
const logs3 = []; await spiegeln({ quellen: Q2, daten: DATEN, api, log: (s) => logs3.push(s) });
soll("Spiegel: nach geänderter Einstellung wird ohne If-None-Match neu gewählt", !logs3.some((l) => /private-akte: unverändert/.test(l)) && logs3.some((l) => /private-akte\/android: .* liegt schon/.test(l)), logs3.join(" | "));

// eine Datei, deren SHA-256 nicht zu GitHubs Angabe passt, wird nicht abgelegt
falschesDigest = true;
const DATEN2 = await mkdtemp(join(tmpdir(), "spezial-"));
const logs2 = [];
const rc2 = await spiegeln({ daten: DATEN2, api, log: (s) => logs2.push(s) });
const st2 = JSON.parse(await readFile(join(DATEN2, "stand.json"), "utf8"));
soll("Spiegel: falsche SHA-256 → nicht abgelegt, Fehler gemeldet", rc2 === 1 && !st2.apps["private-akte"].android && logs2.some((l) => /SHA-256 passt nicht/.test(l)), logs2.join(" | "));
falschesDigest = false;

// ── Dienst ──────────────────────────────────────────────────────────────
const geheimFp = noble.utils.randomPrivateKey(), geheimTp = noble.utils.randomPrivateKey(), fremd = noble.utils.randomPrivateKey();
const SCHL = join(DATEN, "schluessel.json");
await writeFile(SCHL, JSON.stringify({ fp: [K.hex(noble.schnorr.getPublicKey(geheimFp))], tp: [K.hex(noble.schnorr.getPublicKey(geheimTp))] }));
process.env.SPEZIAL_DATEN = DATEN; process.env.SPEZIAL_SCHLUESSEL = SCHL; process.env.SPEZIAL_SCHEMA = "http";
const { bauen } = await import(pathToFileURL(join(WURZEL, "server/spezial/dienst.mjs")).href);
const srv = bauen(); await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
const B = "http://127.0.0.1:" + srv.address().port;
const post = (p, body, kopf = {}) => fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json", ...kopf }, body: JSON.stringify(body) }).then(async (r) => ({ s: r.status, j: await r.json() }));

const kat = await (await fetch(B + "/apps")).json();
soll("Katalog: nennt die Pro-Apps mit Fassung und Größe", kat.apps.find((a) => a.id === "private-akte")?.android?.version === "0.9.11");
soll("Katalog: verrät keine Download-Adresse", !JSON.stringify(kat).includes("/dl/") && !JSON.stringify(kat).includes("http"));

const gut = (await K.erstelle(noble, geheimFp, "fp", "Testkäufer", ["private-akte"])).text;
const r1 = await post("/pruefen", { passkey: gut });
soll("Passkey vom Herausgeber gilt", r1.j.ok && r1.j.markt === "fp" && r1.j.apps.join() === "private-akte", JSON.stringify(r1.j));
const tp = (await K.erstelle(noble, geheimTp, "tp", "X", ["private-akte"])).text;
soll("TPK1-Passkey gilt im Markt tp", (await post("/pruefen", { passkey: tp })).j.ok);
soll("ein FPK1 mit dem Schlüssel von PWA Toolpoint gilt NICHT", !(await post("/pruefen", { passkey: (await K.erstelle(noble, geheimTp, "fp", "X", ["private-akte"])).text })).j.ok);
soll("ein fremder Schlüssel gilt nicht", (await post("/pruefen", { passkey: (await K.erstelle(noble, fremd, "fp", "X", ["private-akte"])).text })).j.warum === "unterschrift");
const verbogen = gut.replace(/^FPK1\.([^.]+)/, (_, b) => "FPK1." + K.b64u(new TextEncoder().encode(JSON.stringify({ ...JSON.parse(new TextDecoder().decode(K.unb64u(b))), a: ["private-akte", "familienakte"] }))));
soll("eine nachträglich erweiterte App-Liste gilt nicht", (await post("/pruefen", { passkey: verbogen })).j.warum === "unterschrift");
// Präfix TPK1, aber unter der Unterschrift steht Markt fp — mit dem RICHTIGEN tp-Schlüssel unterschrieben
const koerper = K.b64u(new TextEncoder().encode(JSON.stringify({ v: 1, m: "fp", id: "abcdefghij", n: "X", a: ["private-akte"], d: K.heute() })));
const msg = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("TPK1." + koerper)));
const quer = "TPK1." + koerper + "." + K.b64u(await noble.schnorr.sign(msg, geheimTp));
soll("ein TPK1-Passkey, der unter der Unterschrift Markt fp nennt, gilt nicht", (await post("/pruefen", { passkey: quer })).j.warum === "markt");
const abgelaufen = (await K.erstelle(noble, geheimFp, "fp", "X", ["private-akte"], "2020-01-01")).text;
soll("abgelaufener Passkey gilt nicht", (await post("/pruefen", { passkey: abgelaufen })).j.warum === "abgelaufen");
soll("Herkunft pwa-toolpoint.de mit FPK1 → anderer Markt", (await post("/pruefen", { passkey: gut }, { Origin: "https://pwa-toolpoint.de" })).j.warum === "anderer_markt");
soll("fremde Herkunft wird abgewiesen", (await post("/pruefen", { passkey: gut }, { Origin: "https://boese.example" })).s === 403);

const l0 = await post("/link", { passkey: gut, app: "familienakte", art: "android" });
soll("Link für eine App, die der Passkey nicht trägt → 403", l0.s === 403 && l0.j.warum === "app_nicht_frei");
const l1 = await post("/link", { passkey: gut, app: "private-akte", art: "android" }, { Origin: "https://family-projekt.de" });
soll("Link für eine freie App", l1.j.ok && /\/datei\//.test(l1.j.url), JSON.stringify(l1.j));
const d1 = await fetch(l1.j.url);
const inhalt = Buffer.from(await d1.arrayBuffer());
soll("Download liefert genau die gespiegelte APK", d1.status === 200 && inhalt.equals(APK) && /attachment/.test(d1.headers.get("content-disposition") || ""));
const d2 = await fetch(l1.j.url, { headers: { Range: "bytes=0-9" } });
soll("Range-Anfrage → 206 mit 10 Byte", d2.status === 206 && (await d2.arrayBuffer()).byteLength === 10);
const kaputt = l1.j.url.slice(0, -2) + (l1.j.url.endsWith("AA") ? "BB" : "AA");
soll("verbogener Link → 403", (await fetch(kaputt)).status === 403);
soll("Dateien sind ohne Link nicht zu erreichen", (await fetch(B + "/dateien/private-akte/Private-Akte-Pro-0.9.11.apk")).status === 404);
const z = JSON.parse(await readFile(join(DATEN, "zaehler.json"), "utf8"));
soll("Zähler je Passkey", Object.values(z)[0]?.apps?.["private-akte/android"] === 1);

// Sperre
const sperreFremd = await K.sperrErklaerung(noble, fremd, "fp", JSON.parse(new TextDecoder().decode(K.unb64u(gut.split(".")[1]))).id);
soll("Sperre mit fremdem Schlüssel → abgewiesen", (await post("/sperren", { erklaerung: sperreFremd })).s === 403);
const id = JSON.parse(new TextDecoder().decode(K.unb64u(gut.split(".")[1]))).id;
const sp = await post("/sperren", { erklaerung: await K.sperrErklaerung(noble, geheimFp, "fp", id) });
soll("Sperre vom Herausgeber", sp.j.ok && sp.j.gesperrt === id);
soll("gesperrter Passkey gilt nicht mehr", (await post("/pruefen", { passkey: gut })).j.warum === "gesperrt");
soll("ein schon ausgegebener Link des gesperrten Passkeys geht nicht mehr", (await fetch(l1.j.url)).status === 403);
soll("ein anderer Passkey bleibt gültig", (await post("/pruefen", { passkey: (await K.erstelle(noble, geheimFp, "fp", "Y", ["private-akte"])).text })).j.ok);

srv.close(); gh.close();
console.log(`${gruen} grün · ${rot} ROT`);
process.exitCode = rot ? 1 : 0;

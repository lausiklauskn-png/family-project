/* Headless-Smoke für den Wächter (Katalog-Spore Stufe 3).
 *   node tests/smoke_stufe3_waechter.mjs
 *
 * Geprüft wird tools/waechter.mjs im Verbund mit tools/vektoren-bauen.mjs —
 * also genau so, wie die nächtliche Aktion es fährt: EIN Lauf, EIN Bericht.
 * Das Werkzeug läuft als echtes Programm (Kindprozess) in einem Wegwerf-
 * Verzeichnis; danach wird nachgesehen, was wirklich in den Dateien steht.
 *
 * Was ECHT ist und nicht nachgebaut wird:
 *   · die Zielseiten — ein richtiger https-Server mit eigenem Zertifikat.
 *     Damit wird die https-Pflicht mitgeprüft, nicht nur behauptet.
 *   · Safe Browsing — derselbe Server spielt den Google-Endpunkt. Das Werkzeug
 *     spricht ihn über dieselbe Stelle an wie den echten (SAFE_BROWSING_URL),
 *     mit echtem POST und echter Antwort.
 * Nachgebaut ist NUR das Sprachmodell (sbkim/03_embedding.js als Stub) — und
 * auch das wird hier nie gebraucht: die Fälle sind so gebaut, dass sich kein
 * Text ändert, das Werkzeug also gar keine Einbettung rechnen muss.
 *
 * Die Fehlschlag-Zählung und das „Gelb bleibt Gelb" brauchen MEHRERE Läufe
 * hintereinander auf demselben Verzeichnis — deshalb läuft hier oft zweimal
 * und dreimal dasselbe Repo.
 *
 * Gegenproben beim Bauen (2026-08-01, scharf, damit sie niemand wiederholen muss):
 *   1. ROT_AB_FEHLSCHLAEGEN von 2 auf 1 gesetzt -> Fall 4 fiel durch: ein
 *      einzelner Aussetzer sperrte sofort. Das ist der Fall, der eine fremde
 *      App zu Unrecht aus dem Marktplatz wirft.
 *   2. Die Hand-Sperre aus ampelBilden entfernt -> Fall 6 fiel durch. Geprüft
 *      wird dabei an einer Seite, die sonst tadellos GRÜN wäre — sonst sähen
 *      gesperrt und nicht-gesperrt gleich aus und die Probe wäre wertlos.
 *   3. `grundlage` durch die Vortages-Prüfsumme ersetzt (der naheliegende
 *      Weg) -> Fall 5b fiel durch: das Gelb verschwand am zweiten Tag von
 *      allein, ohne dass jemand hingesehen hatte.
 *   4. In markt.html das Abschalten des Links bei Rot entfernt -> Fall 9 fiel
 *      durch (Link war wieder da).
 *   5. Im Wächter aus dem Safe-Browsing-Fehlerfall `true` statt `null`
 *      gemacht -> Fall 8 fiel durch: ein ausgefallener Google-Dienst hätte
 *      alle Einträge gesperrt. ZWEIMAL geprüft, für jeden der beiden
 *      Fehler-Zweige einzeln (siehe unten) — beim ersten Versuch blieb die
 *      Probe grün, weil der Test nur die eine Hälfte spielte.
 *   7. Den Zweig für die Hand-Freigabe (`handAmpel === "gruen"`) stillgelegt
 *      -> Fall 7b fiel durch. Auch hier steht der Kontrast daneben: dieselbe
 *      Lage OHNE Freigabe muss rot sein, sonst sagt die Probe nichts.
 *
 * WAS DIESER TEST BEIM BAUEN GELERNT HAT (2026-08-01). Der ausgefallene
 * Google-Dienst wurde zuerst nur als HTTP 503 gespielt. Damit lief die Prüfung
 * ausschließlich durch `if (!r.ok) return null` — der `catch`-Zweig für einen
 * abgerissenen Draht blieb ungeprüft, und die Gegenprobe dort blieb prompt
 * grün, obwohl absichtlich „alles sperren" eingebaut war. Seitdem spielt der
 * Test beide Ausfall-Arten getrennt. Dieselbe Form wie die Lehre vom
 * 2026-08-01: eine Gegenprobe, die den Fehler nicht fängt, ist keine — und man
 * merkt es nur, wenn man den Fehler wirklich einbaut.
 */
import fs from "node:fs";
import https from "node:https";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFileSync, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const MODELL = "Xenova/multilingual-e5-small";
const DIM = 384;

/* ── Codec: die ausgelieferte Datei, kein Nachbau ─────────────────────────── */
const scope = { btoa: globalThis.btoa, atob: globalThis.atob, TextEncoder: globalThis.TextEncoder };
new Function("window", "globalThis", fs.readFileSync(path.join(ROOT, "assets/vec-codec.js"), "utf8"))(scope, scope);
const CODEC = scope.FPVecCodec;

const STUB = `
var EMBEDDING_MODEL = "${MODELL}";
var EMBEDDING_DIM = ${DIM};
(function (global) {
  global.SbkimEmbedding = {
    _meta: { model: EMBEDDING_MODEL, dim: EMBEDDING_DIM },
    init: function () { return Promise.resolve(); },
    embedPassageBatch: function (t) { return Promise.resolve(t.map(function () { return new Float32Array(EMBEDDING_DIM); })); }
  };
})(window);
`;

/* ── https-Server: Zielseiten UND der Safe-Browsing-Endpunkt ───────────────── */
const zertDir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-zert3-"));
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2",
  "-keyout", path.join(zertDir, "k.pem"), "-out", path.join(zertDir, "c.pem"),
  "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"], { stdio: "ignore" });

let SEITEN = {};          // Pfad -> Inhalt (String) oder null = 404
let SB_TREFFER = [];      // Adressen, die der gespielte Google-Dienst meldet
/* Ein ausgefallener Dienst fällt auf ZWEI Arten aus, und sie laufen im
 * Wächter durch verschiedene Zeilen: eine Fehlermeldung (503, `!r.ok`) und ein
 * abgerissener Draht (Ausnahme, `catch`). Beim Bauen wurde erst nur die erste
 * geprüft — und die Gegenprobe am catch-Zweig blieb prompt grün, obwohl dort
 * absichtlich „alles sperren" eingebaut war. Deshalb beide. */
let SB_KAPUTT = "";       // "" | "503" | "abbruch"
let SB_ANFRAGEN = 0;

const srv = https.createServer(
  { key: fs.readFileSync(path.join(zertDir, "k.pem")), cert: fs.readFileSync(path.join(zertDir, "c.pem")) },
  (req, res) => {
    const p = req.url.split("?")[0];
    if (p === "/v4/threatMatches:find") {
      SB_ANFRAGEN++;
      let roh = "";
      req.on("data", (c) => { roh += c; });
      req.on("end", () => {
        if (SB_KAPUTT === "503") { res.writeHead(503); res.end("nope"); return; }
        if (SB_KAPUTT === "abbruch") { req.socket.destroy(); return; }
        let bitte = {};
        try { bitte = JSON.parse(roh); } catch (_e) {}
        const gefragt = ((bitte.threatInfo || {}).threatEntries || []).map((e) => e.url);
        const matches = gefragt.filter((u) => SB_TREFFER.includes(u))
          .map((u) => ({ threatType: "MALWARE", threat: { url: u } }));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(matches.length ? { matches } : {}));
      });
      return;
    }
    const s = SEITEN[p];
    if (s == null) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "content-type": "text/html" });
    res.end(s);
  });
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const BASIS = `https://127.0.0.1:${srv.address().port}`;

/* ── Wegwerf-Repo ─────────────────────────────────────────────────────────── */
function baueRepo(eintraege, opts) {
  opts = opts || {};
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fp-stufe3-"));
  fs.mkdirSync(path.join(dir, "assets/config"), { recursive: true });
  fs.mkdirSync(path.join(dir, "sbkim"), { recursive: true });
  fs.mkdirSync(path.join(dir, "tools"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "assets/vec-codec.js"), path.join(dir, "assets/vec-codec.js"));
  fs.copyFileSync(path.join(ROOT, "tools/vektoren-bauen.mjs"), path.join(dir, "tools/vektoren-bauen.mjs"));
  fs.copyFileSync(path.join(ROOT, "tools/waechter.mjs"), path.join(dir, "tools/waechter.mjs"));
  // Stufe 5 gehört seit 2026-08-01 in denselben Lauf — ohne diese Datei
  // findet vektoren-bauen.mjs sein Modul nicht und der Test bricht ab.
  fs.copyFileSync(path.join(ROOT, "tools/messung.mjs"), path.join(dir, "tools/messung.mjs"));
  fs.writeFileSync(path.join(dir, "sbkim/03_embedding.js"), STUB);
  try { fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "dir"); } catch (_e) {}
  fs.writeFileSync(path.join(dir, "assets/config/listings.js"),
    "window.FP_LISTINGS = [\n" + eintraege.map((e) => "  " + JSON.stringify(e)).join(",\n") + "\n];\n");
  // Das Paket passend vorbauen: dann ist kein Text neu, das Werkzeug rechnet
  // nichts und braucht keinen Browser — der Lauf misst nur den Wächter.
  const v = {};
  for (const e of eintraege) {
    const t = String(e.text || e.label || "");
    v[e.anchorId] = Object.assign(CODEC.encode(new Float32Array(DIM)), { h: CODEC.textHash(t) });
  }
  fs.writeFileSync(path.join(dir, "assets/config/listings-vec.json"),
    JSON.stringify({ version: 1, model: MODELL, dim: DIM, quant: "int8-sym-b64", built: "2026-08-01", vectors: v }));
  fs.writeFileSync(path.join(dir, "assets/config/wache-hand.json"), JSON.stringify(opts.hand || {}));
  return dir;
}

/* Asynchron starten — der https-Server läuft in DIESEM Prozess, und spawnSync
 * würde die Ereignisschleife anhalten, sodass er keine Verbindung mehr annimmt.
 * (Die Falle ist beim Bau von Stufe 2 einmal zugeschnappt.) */
function lauf(dir, opts) {
  opts = opts || {};
  return new Promise((fertig) => {
    const env = Object.assign({}, process.env, {
      // Eigenes Zertifikat als ZUSÄTZLICHE Wurzel — die TLS-Prüfung im
      // Werkzeug bleibt aktiv und wird mitgemessen. NODE_TLS_REJECT_UNAUTHORIZED
      // wirkt hier nicht: Nodes eingebautes fetch beachtet es nicht.
      NODE_EXTRA_CA_CERTS: path.join(zertDir, "c.pem")
    });
    if (opts.sbKey) { env.SAFE_BROWSING_KEY = opts.sbKey; env.SAFE_BROWSING_URL = BASIS + "/v4/threatMatches:find"; }
    else { delete env.SAFE_BROWSING_KEY; }
    execFile(process.execPath, [path.join(dir, "tools/vektoren-bauen.mjs"), "--schreiben"],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, env },
      (err, out, errout) => fertig({ aus: (out || "") + (errout || ""), code: err ? (err.code || 1) : 0 }));
  });
}
const bericht = (dir) => {
  try { return JSON.parse(fs.readFileSync(path.join(dir, "assets/config/spore-stand.json"), "utf8")); }
  catch (_e) { return null; }
};
const wacheVon = (dir, id) => { const b = bericht(dir); return b && b.eintraege && b.eintraege[id] && b.eintraege[id].wache; };
const eintrag = (id, pfad, extra) => Object.assign({
  label: id, anchorId: id, text: "Fester Text für " + id + ", ändert sich nie.",
  url: pfad === null ? "http://127.0.0.1/unsicher" : BASIS + pfad,
  img: "https://example.invalid/" + id + ".png"
}, extra || {});

/* ══════════════════════════════════════════════════════════════════════════ */
console.log("Wächter (Stufe 3) — Zielseiten prüfen, abstufen, im Zweifel sperren");

/* ── Fall 1: erste Prüfung ────────────────────────────────────────────────── */
console.log("\n1 — erste Prüfung einer erreichbaren Seite");
{
  SEITEN = { "/a": "<html>Alles in Ordnung</html>" };
  const dir = baueRepo([eintrag("markt-a", "/a")]);
  await lauf(dir);
  const w = wacheVon(dir, "markt-a");
  ok(!!w, "der Bericht trägt eine Wache");
  ok(w && w.ampel === "gruen", "erste Prüfung ist grün (" + (w && w.ampel) + ")");
  ok(w && w.grund === "erste_pruefung", "Grund: erste_pruefung (" + (w && w.grund) + ")");
  ok(w && w.grundlage && w.grundlage === w.pruefsumme, "die Prüfsumme wird als Grundlage festgehalten");
  ok(w && w.safebrowsing === "nicht_geprueft", "ohne Schlüssel sagt der Bericht ehrlich: nicht geprüft");
}

/* ── Fall 2: zweiter Lauf, nichts geändert ────────────────────────────────── */
console.log("\n2 — zweiter Lauf, nichts geändert");
{
  SEITEN = { "/a": "<html>Alles in Ordnung</html>" };
  const dir = baueRepo([eintrag("markt-a", "/a")]);
  await lauf(dir);
  const erste = wacheVon(dir, "markt-a");
  await lauf(dir);
  const w = wacheVon(dir, "markt-a");
  ok(w && w.ampel === "gruen" && w.grund === "unveraendert", "bleibt grün, Grund unveraendert");
  ok(w && w.seit === erste.seit, "`seit` wandert nicht, wenn sich die Ampel nicht ändert");
}

/* ── Fall 3: Inhalt der Zielseite ändert sich ─────────────────────────────── */
/* ── Fall 3: die zwei Maße (Klaus 2026-08-09) ──────────────────────────────
 * Bis hierher galt: jedes geänderte Byte -> gelb. Das ist bei 14 eigenen
 * Einträgen brauchbar und bei tausend fremden die falsche Frage — wer täglich
 * hundert Meldungen quittieren muss, klickt sie durch, ohne hinzusehen.
 * Jetzt entscheidet der SICHERHEITS-FINGERABDRUCK: fremde Herkünfte,
 * Weiterleitungen, verschleierter Code. Der Text darf sich ändern, wie er will.
 *
 * Beide Hälften stehen hier zusammen, damit niemand die eine ohne die andere
 * liest: 3a beweist, dass harmloses NICHT mehr meldet — und 3b, dass
 * gefährliches sehr wohl. Ohne 3b wäre 3a eine Abschaltung. */
console.log("\n3a — die Zielseite ändert nur ihren Inhalt: KEINE Meldung");
{
  SEITEN = { "/a": "<html><body><p>Alles in Ordnung</p></body></html>" };
  const dir = baueRepo([eintrag("markt-a", "/a")]);
  await lauf(dir);
  const vorher = wacheVon(dir, "markt-a");
  SEITEN["/a"] = "<html><body><h1>Ganz neuer Text</h1><p>und noch viel mehr davon</p></body></html>";
  await lauf(dir);
  const w = wacheVon(dir, "markt-a");
  ok(w && w.ampel === "gruen" && w.grund === "nur_inhalt", "bleibt grün, Grund nur_inhalt (" + w.ampel + "/" + w.grund + ")");
  ok(w && w.pruefsumme !== vorher.pruefsumme, "die neue Prüfsumme steht trotzdem im Bericht");
  ok(w && w.grundlage === w.pruefsumme, "die Grundlage wandert mit — sonst bliebe der Eintrag ewig auf geändert");
  ok(w && w.fingerabdruck === vorher.fingerabdruck, "der Fingerabdruck hat sich NICHT bewegt");
}

console.log("\n3b — die Zielseite lädt plötzlich von fremd: GELB");
{
  SEITEN = { "/a": "<html><body><p>Alles in Ordnung</p></body></html>" };
  const dir = baueRepo([eintrag("markt-a", "/a")]);
  await lauf(dir);
  const vorher = wacheVon(dir, "markt-a");
  SEITEN["/a"] = '<html><head><script src="https://fremde-quelle.example/x.js"></script></head><body><p>Alles in Ordnung</p></body></html>';
  await lauf(dir);
  const w = wacheVon(dir, "markt-a");
  ok(w && w.ampel === "gelb" && w.grund === "fingerabdruck_geaendert", "wird gelb (" + w.ampel + "/" + w.grund + ")");
  ok(w && w.fingerabdruck !== vorher.fingerabdruck, "der Fingerabdruck hat sich bewegt");
  ok(w && Array.isArray(w.fremde) && w.fremde.includes("fremde-quelle.example"), "die neue Herkunft steht als Name im Befund");
  ok(w && w.grundlage === vorher.pruefsumme, "die Grundlage bleibt die alte, geprüfte Fassung");
}

console.log("\n3c — verschleierter Code meldet ebenfalls");
{
  SEITEN = { "/a": "<html><body><p>Sauber</p></body></html>" };
  const dir = baueRepo([eintrag("markt-a", "/a")]);
  await lauf(dir);
  SEITEN["/a"] = '<html><body><p>Sauber</p><script>eval(atob("eA=="))</script></body></html>';
  await lauf(dir);
  const w = wacheVon(dir, "markt-a");
  ok(w && w.ampel === "gelb" && w.grund === "fingerabdruck_geaendert", "wird gelb (" + w.ampel + "/" + w.grund + ")");
  ok(w && Array.isArray(w.kennzeichen) && w.kennzeichen.includes("eval"), "eval steht als Kennzeichen im Befund");
}

/* ── Fall 4: gelb bleibt gelb, bis jemand hinsieht ────────────────────────
 * Der naheliegende Bau (heute gegen gestern vergleichen) hätte hier ein Loch:
 * die Seite ändert sich einmal und steht dann still — am übernächsten Tag wäre
 * sie „unverändert" und das Gelb von allein weg. */
console.log("\n4 — gelb bleibt gelb, auch wenn die Seite danach stillsteht");
{
  SEITEN = { "/a": "<html>Erste Fassung</html>" };
  const dir = baueRepo([eintrag("markt-a", "/a")]);
  await lauf(dir);
  SEITEN["/a"] = '<html><head><script src="https://fremde-quelle.example/x.js"></script></head><body>Zweite Fassung</body></html>';
  await lauf(dir);
  ok(wacheVon(dir, "markt-a").ampel === "gelb", "nach der Änderung gelb");
  await lauf(dir);                       // dritter Lauf, Seite unverändert
  const w = wacheVon(dir, "markt-a");
  ok(w.ampel === "gelb" && w.grund === "fingerabdruck_geaendert", "auch im nächsten Lauf noch gelb (" + w.ampel + "/" + w.grund + ")");
  await lauf(dir);
  ok(wacheVon(dir, "markt-a").ampel === "gelb", "und im übernächsten auch");
}

/* ── Fall 5: die Quittung ─────────────────────────────────────────────────── */
console.log("\n5 — Quittung im Handschalter beendet das Gelb");
{
  SEITEN = { "/a": "<html>Erste Fassung</html>" };
  const dir = baueRepo([eintrag("markt-a", "/a")]);
  await lauf(dir);
  SEITEN["/a"] = '<html><head><script src="https://fremde-quelle.example/x.js"></script></head><body>Zweite Fassung, von Klaus angesehen</body></html>';
  await lauf(dir);
  const gelb = wacheVon(dir, "markt-a");
  ok(gelb.ampel === "gelb", "erst gelb");
  fs.writeFileSync(path.join(dir, "assets/config/wache-hand.json"),
    JSON.stringify({ "markt-a": { gesehen: gelb.pruefsumme } }));
  await lauf(dir);
  const w = wacheVon(dir, "markt-a");
  ok(w.ampel === "gruen", "nach der Quittung grün (" + w.ampel + ")");
  ok(w.grundlage === gelb.pruefsumme, "die quittierte Fassung ist die neue Grundlage");

  // 5b — und wenn sie sich danach ERNEUT ändert, wird sie wieder gelb.
  // Ohne diese Probe wäre eine Quittung ein Freifahrtschein für alle Zukunft.
  SEITEN["/a"] = '<html><head><script src="https://noch-eine.example/y.js"></script></head><body>Dritte Fassung, wieder ungefragt</body></html>';
  await lauf(dir);
  ok(wacheVon(dir, "markt-a").ampel === "gelb", "eine erneute Änderung wird wieder gelb");
}

/* ── Fall 6: erst der zweite Fehlschlag sperrt ────────────────────────────── */
console.log("\n6 — nicht erreichbar: einmal warnen, zweimal sperren");
{
  SEITEN = { "/a": "<html>Da</html>" };
  const dir = baueRepo([eintrag("markt-a", "/a")]);
  await lauf(dir);
  ok(wacheVon(dir, "markt-a").ampel === "gruen", "zunächst grün");
  SEITEN = {};                                     // Seite weg (404)
  await lauf(dir);
  const w1 = wacheVon(dir, "markt-a");
  ok(w1.ampel === "gelb" && w1.grund === "antwortet_nicht", "erster Ausfall: nur gelb (" + w1.ampel + ")");
  ok(w1.fehlschlaege === 1, "ein Fehlschlag gezählt (" + w1.fehlschlaege + ")");
  await lauf(dir);
  const w2 = wacheVon(dir, "markt-a");
  ok(w2.ampel === "rot" && w2.grund === "nicht_erreichbar", "zweiter Ausfall in Folge: rot (" + w2.ampel + ")");
  ok(w2.fehlschlaege === 2, "zwei Fehlschläge gezählt (" + w2.fehlschlaege + ")");
  SEITEN = { "/a": "<html>Da</html>" };            // wieder da
  await lauf(dir);
  const w3 = wacheVon(dir, "markt-a");
  ok(w3.fehlschlaege === 0, "der Zähler geht bei der ersten Antwort auf null zurück");
  ok(w3.ampel === "gruen", "und die Ampel wird wieder grün");
}

/* ── Fall 7: der Handschalter ─────────────────────────────────────────────── */
console.log("\n7 — Handschalter: Klaus' Notbremse und seine Entwarnung");
{
  SEITEN = { "/a": "<html>Tadellos</html>", "/b": "<html>Auch tadellos</html>" };
  const dir = baueRepo(
    [eintrag("markt-a", "/a"), eintrag("markt-b", "/b")],
    { hand: { "markt-a": { ampel: "rot", grund: "Zielseite verlangt plötzlich eine Anmeldung." } } });
  await lauf(dir);
  const a = wacheVon(dir, "markt-a"), b = wacheVon(dir, "markt-b");
  // Scharf: markt-b ist bis aufs Haar dieselbe Lage, nur ohne Sperre. Wäre
  // die Hand wirkungslos, sähen beide gleich aus — und die Probe wäre wertlos.
  ok(a.ampel === "rot" && a.grund === "hand_gesperrt", "die Hand sperrt eine tadellose Seite (" + a.ampel + ")");
  ok(b.ampel === "gruen", "die Vergleichsseite ohne Sperre bleibt grün (" + b.ampel + ")");
  ok(a.handgrund && /Anmeldung/.test(a.handgrund), "der Grund steht im Bericht und ist nachlesbar");
  ok(bericht(dir).eintraege["markt-a"], "der gesperrte Eintrag steht weiter im Bericht — er verschwindet nicht");
  const liste = (() => { const w = {}; new Function("window", fs.readFileSync(path.join(dir, "assets/config/listings.js"), "utf8"))(w); return w.FP_LISTINGS; })();
  ok(liste.some((x) => x.anchorId === "markt-a"), "und er steht weiter in listings.js — nichts wird still gelöscht");

  // 7b — die Entwarnung gilt auch für eine Seite, die gerade nicht antwortet.
  // Ohne diese Probe wirkte „gruen" nur dort, wo ohnehin alles in Ordnung ist,
  // und wäre praktisch wirkungslos — genau die Lücke, die beim Gegenlesen auffiel.
  SEITEN = {};
  const dir2 = baueRepo([eintrag("markt-a", "/a")], { hand: { "markt-a": { ampel: "gruen", grund: "Zieht gerade um, ist bekannt." } } });
  await lauf(dir2); await lauf(dir2);          // zweimal tot — ohne Hand wäre das ROT
  const g = wacheVon(dir2, "markt-a");
  ok(g.ampel === "gruen" && g.grund === "hand_freigegeben", "eine Hand-Freigabe hält auch eine tote Seite grün (" + g.ampel + ")");
  ok(g.fehlschlaege === 2, "der Zähler läuft im Stillen weiter (" + g.fehlschlaege + ")");
  // und ohne die Freigabe wäre dieselbe Lage rot — sonst sähe man keinen Unterschied
  const dir3 = baueRepo([eintrag("markt-a", "/a")]);
  await lauf(dir3); await lauf(dir3);
  ok(wacheVon(dir3, "markt-a").ampel === "rot", "dieselbe Lage OHNE Freigabe ist rot");
}

/* ── Fall 8: Safe Browsing ────────────────────────────────────────────────── */
console.log("\n8 — Safe Browsing (der Steckplatz)");
{
  SEITEN = { "/a": "<html>Sieht harmlos aus</html>", "/b": "<html>Auch</html>" };
  const dir = baueRepo([eintrag("markt-a", "/a"), eintrag("markt-b", "/b")]);

  // ohne Schlüssel: gar nicht fragen
  SB_ANFRAGEN = 0; SB_TREFFER = [];
  await lauf(dir);
  ok(SB_ANFRAGEN === 0, "ohne Schlüssel wird Google nicht gefragt (" + SB_ANFRAGEN + " Anfragen)");
  ok(wacheVon(dir, "markt-a").safebrowsing === "nicht_geprueft", "und der Bericht sagt: nicht geprüft");

  // mit Schlüssel und einem Treffer
  SB_ANFRAGEN = 0; SB_TREFFER = [BASIS + "/a"];
  await lauf(dir, { sbKey: "pruef-schluessel" });
  ok(SB_ANFRAGEN === 1, "mit Schlüssel wird genau einmal gefragt, gebündelt (" + SB_ANFRAGEN + ")");
  const a = wacheVon(dir, "markt-a"), b = wacheVon(dir, "markt-b");
  ok(a.ampel === "rot" && a.grund === "safebrowsing", "die gemeldete Adresse wird rot (" + a.ampel + ")");
  ok(a.safebrowsing === "gemeldet", "der Bericht nennt den Befund beim Namen");
  ok(b.ampel === "gruen" && b.safebrowsing === "sauber", "die nicht gemeldete bleibt grün und gilt als sauber");

  // Dienst ausgefallen: NICHTS sperren — beide Ausfall-Arten getrennt geprüft,
  // weil sie im Wächter durch verschiedene Zeilen laufen.
  SB_TREFFER = [];
  for (const art of ["503", "abbruch"]) {
    SB_KAPUTT = art;
    const d = baueRepo([eintrag("markt-a", "/a")]);
    await lauf(d, { sbKey: "pruef-schluessel" });
    const c = wacheVon(d, "markt-a");
    ok(c.ampel === "gruen", "Google fällt aus (" + art + ") und sperrt nichts (" + c.ampel + ")");
    ok(c.safebrowsing === "nicht_geprueft", "… und wird ehrlich als nicht geprüft gemeldet (" + art + ")");
  }
  SB_KAPUTT = "";

  // Ein Safe-Browsing-Treffer lässt sich NICHT per Hand grün schalten. Das ist
  // die einzige Stelle, an der die Hand nicht gewinnt — und sie ist scharf
  // geprüft: dieselbe Hand-Freigabe hält daneben eine harmlose Seite grün.
  SB_TREFFER = [BASIS + "/a"];
  const dir3 = baueRepo([eintrag("markt-a", "/a"), eintrag("markt-b", "/b")], {
    hand: { "markt-a": { ampel: "gruen", grund: "halte ich für Fehlalarm" },
            "markt-b": { ampel: "gruen", grund: "auch freigegeben" } }
  });
  await lauf(dir3, { sbKey: "pruef-schluessel" });
  ok(wacheVon(dir3, "markt-a").ampel === "rot", "Safe Browsing lässt sich nicht per Hand übergehen ("
    + wacheVon(dir3, "markt-a").ampel + ")");
  ok(wacheVon(dir3, "markt-b").grund === "hand_freigegeben", "dieselbe Freigabe wirkt daneben normal");
  SB_TREFFER = [];
}

/* ── Fall 9: kein https ───────────────────────────────────────────────────── */
console.log("\n9 — Eintrag ohne https");
{
  SEITEN = { "/a": "<html>Da</html>" };
  const dir = baueRepo([eintrag("markt-unsicher", null)]);
  await lauf(dir);
  const w = wacheVon(dir, "markt-unsicher");
  ok(w.ampel === "gelb" && w.grund === "kein_https", "wird gelb mit Grund kein_https (" + w.ampel + "/" + w.grund + ")");
  ok(w.fehlschlaege === 0, "und zählt nicht als Ausfall — der Link ist ja nur falsch, nicht tot");
}

/* ── Fall 10: der Wächter prüft ALLE Einträge, nicht nur die mit Spore ────── */
console.log("\n10 — auch Einträge ohne Spore-Link werden bewacht");
{
  SEITEN = { "/a": "<html>Da</html>", "/b": "<html>Da</html>" };
  const dir = baueRepo([
    eintrag("markt-mit", "/a", { sporeUrl: BASIS + "/gibtsnicht.json" }),
    eintrag("markt-ohne", "/b")
  ]);
  await lauf(dir);
  const b = bericht(dir);
  ok(b.eintraege["markt-ohne"] && b.eintraege["markt-ohne"].wache, "der Eintrag ohne Spore hat trotzdem eine Wache");
  ok(b.eintraege["markt-ohne"].lage === "ohne_spore", "und wird als solcher gekennzeichnet");
  ok(b.eintraege["markt-mit"].wache, "der Eintrag mit Spore ebenfalls");
  ok(b.wacheZaehler && b.wacheZaehler.gruen === 2, "der Bericht zählt die Ampeln (" + JSON.stringify(b.wacheZaehler) + ")");
}

/* ── Fall 11: die Anzeige im Marktplatz (Browser) ─────────────────────────
 * Der wichtigste Teil für Klaus' Bedingung: ein gesperrter Eintrag darf nie
 * stillschweigend verschwinden. Er bleibt sichtbar, der Grund steht dabei,
 * und nur der Link ist abgeschaltet.
 *
 * Gefahren wird die echte markt.html; nur spore-stand.json kommt vom Test. */
console.log("\n11 — Anzeige im Marktplatz (Browser)");
{
  const MIME = { ".html":"text/html",".js":"text/javascript",".json":"application/json",".css":"text/css",".svg":"image/svg+xml",".png":"image/png" };
  const BERICHT = {
    geprueft: "2026-08-02T02:40:00.000Z",
    eintraege: {
      "markt-bookledgerpro": { lage: "gleich", wache: { ampel: "rot", grund: "hand_gesperrt",
        handgrund: "Verdacht <b>mit Markup</b> im Grund.", seit: "2026-08-01", safebrowsing: "nicht_geprueft" } },
      "markt-mein-tresor":   { lage: "gleich", wache: { ampel: "gelb", grund: "geaendert", seit: "2026-08-01" } },
      "markt-jasons-tresor": { lage: "gleich", wache: { ampel: "gruen", grund: "unveraendert", seit: "2026-08-01" } },
      "markt-tomys-hub":     { lage: "gleich", wache: { ampel: "gelb", grund: "kein_https", seit: "2026-08-01" } }
    }
  };
  const s2 = http.createServer((req, res) => {
    const p2 = decodeURIComponent(req.url.split("?")[0]);
    if (p2 === "/assets/config/spore-stand.json") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(BERICHT)); return; }
    const fp = path.join(ROOT, p2 === "/" ? "/index.html" : p2);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise((r) => s2.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + s2.address().port;

  const pw = await import(process.env.PW_CORE || "playwright-core");
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"] });
  const page = await browser.newPage();
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  // Auf das Ergebnis warten, nicht auf die Uhr: der Bericht wird nachgeladen.
  await page.waitForSelector(".listing .mk-wache", { timeout: 20000 }).catch(() => {});

  const k = await page.evaluate(() => Array.from(document.querySelectorAll(".listing")).map((e) => ({
    titel: (e.querySelector("h3") || {}).textContent || "",
    band: (e.querySelector(".mk-wache") || {}).textContent || "",
    rot: !!e.querySelector(".mk-wache.is-rot"),
    gelb: !!e.querySelector(".mk-wache.is-gelb"),
    link: !!e.querySelector("a.ext"),
    melden: !!e.querySelector(".mk-report")
  })));
  const bl = k.find((x) => /BookLedger/i.test(x.titel));
  const tr = k.find((x) => /Mein Tresor/i.test(x.titel));
  const ja = k.find((x) => /Jasons/i.test(x.titel));

  ok(!!bl, "der gesperrte Eintrag ist überhaupt noch da");
  ok(bl && bl.rot, "er trägt das rote Band");
  ok(bl && !bl.link, "sein Link ist abgeschaltet");
  ok(bl && bl.melden, "der Melde-Knopf bleibt — der menschliche Kanal geht nie zu");
  ok(bl && /auf Eis/.test(bl.band), "der Grund ist im Klartext lesbar");
  ok(tr && tr.gelb && tr.link, "der gelbe Eintrag warnt, bleibt aber anklickbar");
  ok(ja && !ja.rot && !ja.gelb && ja.link, "der grüne Eintrag sieht aus wie immer");

  // Jeder gelbe Grund braucht seinen EIGENEN Satz. Sonst stünde bei einem
  // Eintrag ohne https „die Seite hat sich geändert" — eine Warnung, die das
  // Falsche behauptet, ist schlimmer als keine. (Beim Gegenlesen aufgefallen.)
  const th = k.find((x) => /Tomys/i.test(x.titel));
  ok(th && /https/.test(th.band), "der Grund kein_https nennt genau das (" + (th && th.band.slice(0, 60)) + ")");
  ok(th && !/geändert/.test(th.band), "und behauptet nicht, die Seite habe sich geändert");

  // Der Hand-Grund ist Klaus' eigener Text — trotzdem nie als HTML.
  // Der Prüftext trägt mit Absicht <b>-Markup: ohne echtes Markup sähen
  // textContent und innerHTML gleich aus und die Probe wäre wertlos
  // (die Lehre vom 2026-08-01).
  const roh = await page.evaluate(() => {
    const e = document.querySelector(".mk-wache.is-rot");
    return e ? { html: e.innerHTML, bTags: e.querySelectorAll("b").length } : null;
  });
  ok(roh && roh.bTags === 0, "Markup im Grund wird nicht zu einem Element (" + (roh && roh.bTags) + " <b>)");
  ok(roh && /&lt;b&gt;/.test(roh.html), "es steht escaped im Quelltext");

  // Klemmt die Karte den Warntext auf drei Zeilen? Ein halb sichtbarer
  // Warnhinweis ist keiner.
  const klemm = await page.evaluate(() => {
    const e = document.querySelector(".mk-wache.is-rot");
    return e ? getComputedStyle(e).webkitLineClamp : "";
  });
  ok(klemm === "none" || klemm === "" || klemm === "normal", "das Warnband wird nicht auf drei Zeilen geklemmt (" + klemm + ")");

  // Fehlt der Bericht ganz, sieht der Marktplatz aus wie immer.
  const p3 = await browser.newPage();
  await p3.route("**/assets/config/spore-stand.json*", (r) => r.fulfill({ status: 404, body: "no" }));
  await p3.goto(base + "/markt.html", { waitUntil: "load" });
  await p3.waitForSelector(".listing", { timeout: 20000 });
  const ohne = await p3.evaluate(() => ({
    karten: document.querySelectorAll(".listing").length,
    baender: document.querySelectorAll(".mk-wache").length,
    links: document.querySelectorAll(".listing a.ext").length
  }));
  ok(ohne.karten > 0 && ohne.baender === 0, "ohne Bericht keine Bänder, Karten trotzdem da (" + ohne.karten + ")");
  ok(ohne.links === ohne.karten, "und alle Links funktionieren wie bisher");

  await browser.close();
  s2.close();
}

srv.close();
console.log(`\nErgebnis: ${pass} bestanden, ${fail} durchgefallen`);
process.exit(fail ? 1 : 0);

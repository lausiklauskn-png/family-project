/* Headless-Smoke: Modell-Quellen-Erkennung (Body-Probe) in sbkim/03_embedding.js.
 *
 * Beweist die Kern-Logik des Offline-first-Fixes OHNE Browser/Netz:
 * detectModelSource() muss echtes JSON (selbst-gehostetes Modell) von der
 * SPA-Falle unterscheiden — ein Server mit `try_files … /index.html` liefert
 * für fehlende Modell-Dateien die HTML-Startseite (HTTP 200), die die
 * eingebaute Lokal-Erkennung sonst als JSON läse ("Unexpected token '<'").
 *
 * Lauf: node tests/smoke_modell_quelle.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_URL = pathToFileURL(path.join(ROOT, "sbkim", "03_embedding.js")).href;

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } }

function stubFetch(res) { globalThis.fetch = async function () { return res; }; }
function headers(map) { return { get: function (k) { return map[String(k).toLowerCase()] || null; } }; }

// Lädt das klassische IIFE-Skript; es registriert sich auf globalThis.
await import(MODULE_URL);
const E = globalThis.SbkimEmbedding;

console.log("Family Projekt — Modell-Quellen-Erkennung (Body-Probe)");
ok(!!E && typeof E._detectModelSource === "function", "Test-Brücke _detectModelSource vorhanden");

// 1) Echtes JSON, sauberer Content-Type → lokal (selbst-gehostet)
stubFetch({ ok: true, headers: headers({ "content-type": "application/json" }),
  text: async () => '{\n  "model_type": "bert"\n}' });
ok(await E._detectModelSource() === "local", "echtes JSON  → 'local' (selbst-gehostet)");

// 2) SPA-Falle: HTTP 200, aber HTML-Startseite → remote (NICHT in die Falle tappen)
stubFetch({ ok: true, headers: headers({ "content-type": "text/html; charset=utf-8" }),
  text: async () => "<!doctype html><html><head><title>Family</title></head></html>" });
ok(await E._detectModelSource() === "remote", "SPA index.html (200, text/html) → 'remote'");

// 3) Fiese SPA-Falle: 200, aber Content-Type verschwiegen — Body entscheidet
stubFetch({ ok: true, headers: headers({}),
  text: async () => "<!doctype html><html></html>" });
ok(await E._detectModelSource() === "remote", "HTML-Body ohne Content-Type → 'remote' (Body-Probe greift)");

// 4) Echtes 404 (z.B. GitHub Pages) → remote
stubFetch({ ok: false, headers: headers({}), text: async () => "404 not found" });
ok(await E._detectModelSource() === "remote", "404 → 'remote'");

// 5) Netz-/Fetch-Fehler (offline, kein Modell) → fail-soft 'remote'
globalThis.fetch = async function () { throw new Error("network down"); };
ok(await E._detectModelSource() === "remote", "fetch wirft (offline) → fail-soft 'remote'");

// 6) Kein fetch verfügbar → 'remote'
delete globalThis.fetch;
ok(await E._detectModelSource() === "remote", "kein global.fetch → 'remote'");

console.log("\nErgebnis: " + pass + "/" + (pass + fail) + " grün");
process.exit(fail ? 1 : 0);

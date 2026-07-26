/* smoke_studio_markt.mjs — Struktur-Smoke für das Marktplatz-Selbst-Pflege-Studio.
 *
 * Ehrlich über den Umfang: DEPENDENCY-FREIER Quell-/Struktur-Test. Prüft, dass die
 * Studio-Verdrahtung vorhanden und konsistent ist (Serialisierungs-Vertrag, Insert-
 * Marker erhalten, Sicherheits-Filter, Einhängepunkte). Ersetzt NICHT den Browser-
 * Sichttest (Langdruck, echtes Veröffentlichen mit Token) — der wartet auf Klaus.
 * Der Laufzeit-Beweis dieser Sitzung lief zusätzlich headless über Chromium.
 *
 * Lauf:  node tests/smoke_studio_markt.mjs
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log("  ✗ " + m); } };

const studio = readFileSync(join(ROOT, "assets/studio-markt.js"), "utf8");
const markt = readFileSync(join(ROOT, "markt.html"), "utf8");
const listingsSrc = readFileSync(join(ROOT, "assets/config/listings.js"), "utf8");

/* 1) Syntax */
try { execFileSync("node", ["--check", join(ROOT, "assets/studio-markt.js")]); ok(true, "studio-markt.js Syntax"); }
catch (e) { ok(false, "Syntaxfehler studio-markt.js: " + e.message); }

/* 2) Einhängepunkte in markt.html */
ok(/src="assets\/studio-markt\.js"/.test(markt), "markt.html lädt studio-markt.js");
ok(/FP_STUDIO_CONFIG/.test(markt) && markt.indexOf("FP_STUDIO_CONFIG") < markt.indexOf('src="assets/studio-markt.js"'), "FP_STUDIO_CONFIG vor studio-markt.js");
ok(/window\.FP_MARKT\s*=\s*\{[\s\S]*rerender/.test(markt), "markt.html: FP_MARKT.rerender-Hook exportiert");

/* 3) Studio-Verdrahtung + Sicherheit in studio-markt.js */
ok(/footer\s+\.wrap/.test(studio) && /1500/.test(studio), "Langdruck-Zugang auf Footer-Copyright (1,5 s)");
ok(/fpstudio_gh_token/.test(studio), "app-spezifischer Token-Schlüssel (fpstudio_)");
ok(/\?ref="\s*\+\s*encodeURIComponent\(CFG\.branch\)/.test(studio), "GitHub GET ?ref=<branch> (aktuellen SHA holen)");
ok(/method:\s*"PUT"/.test(studio), "GitHub PUT (Commit nach main)");
ok(/if\s*\(sha\)\s*body\.sha\s*=\s*sha/.test(studio), "PUT mit SHA (Update) bzw. ohne (neu anlegen)");
ok(/FP_LISTINGS_INSERT_HERE/.test(studio), "Insert-Marker in Serialisierung erhalten");
ok(/window\.FP_LISTINGS = \[/.test(studio), "Serialisierung schreibt window.FP_LISTINGS = [");
ok(/\.svg\(\\?\?\|\$\)/i.test(studio) || /\\.svg/.test(studio), "SVG-Sperre (safeImg)");
ok(/commitImage/.test(studio) && /assets\/apps\//.test(studio), "Bild-Upload ins Depot (assets/apps/)");
ok(/untrusted external data/.test(studio), "Sicherheits-Hinweis: E-Mail-Inhalte = untrusted");
ok(/Bilder vom Gerät|Bild vom Gerät/.test(studio), "Geräte-Bild-Auswahl vorhanden");
ok(/mycel/i.test(studio) && /tags/i.test(studio), "Felder Mycel-Integration + Tags vorhanden");

/* 4) listings.js weiterhin gültig: Marker vorhanden, jeder Eintrag hat ein Bild */
ok(/FP_LISTINGS_INSERT_HERE/.test(listingsSrc), "listings.js: Insert-Marker vorhanden");
let FP_LISTINGS = null;
try {
  const sandbox = { window: {} };
  // eslint-disable-next-line no-new-func
  new Function("window", listingsSrc)(sandbox.window);
  FP_LISTINGS = sandbox.window.FP_LISTINGS;
  ok(Array.isArray(FP_LISTINGS) && FP_LISTINGS.length >= 10, "listings.js: FP_LISTINGS-Array (" + (FP_LISTINGS ? FP_LISTINGS.length : 0) + " Einträge)");
  const noImg = (FP_LISTINGS || []).filter((x) => !/^https?:\/\//i.test(x.img || "") || /\.svg(\?|$)/i.test(x.img || ""));
  ok(noImg.length === 0, "listings.js: jeder Eintrag hat ein gültiges Bild (kein SVG)");
} catch (e) { ok(false, "listings.js nicht evaluierbar: " + e.message); }

console.log(`\nMarktplatz-Studio-Struktur-Smoke: ${pass} bestanden, ${fail} fehlgeschlagen.`);
process.exit(fail > 0 ? 1 : 0);

/* smoke_studio_markt.mjs — Struktur-Smoke für das Marktplatz-Selbst-Pflege-Studio.
 *
 * Ehrlich über den Umfang: DEPENDENCY-FREIER Quell-/Struktur-Test. Prüft, dass die
 * Studio-Verdrahtung vorhanden und konsistent ist (server-seitige Commits, Warteschlange
 * über marktplatz-api.php auf warteschlange.jsonl, Insert-Marker, Sicherheits-Filter).
 * Ersetzt NICHT den Browser-/Server-Sichttest (Langdruck, echtes Freigeben mit Passwort)
 * — der wartet auf Klaus. Lauf:  node tests/smoke_studio_markt.mjs
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
/* Die Adresse trägt ein ?v=NN (Cache-Bust, siehe 4b) — der Vergleich darf nicht
 * am fehlenden Anhang scheitern, sonst bricht er bei jedem Versions-Sprung. */
const studioTag = /src="assets\/studio-markt\.js(\?v=\d+)?"/.exec(markt);
ok(!!studioTag, "markt.html lädt studio-markt.js");
ok(/FP_STUDIO_CONFIG/.test(markt) && studioTag && markt.indexOf("FP_STUDIO_CONFIG") < studioTag.index, "FP_STUDIO_CONFIG vor studio-markt.js");
ok(/window\.FP_MARKT\s*=\s*\{[\s\S]*rerender/.test(markt), "markt.html: FP_MARKT.rerender-Hook exportiert");

/* 3) Studio-Grundgerüst + Sicherheit */
ok(/footer\s+\.wrap/.test(studio) && /1500/.test(studio), "Langdruck-Zugang auf Footer-Copyright (1,5 s)");
ok(/fpstudio_srv_key/.test(studio), "app-spezifisches Studio-Passwort (fpstudio_srv_key)");
ok(!/api\.github\.com/.test(studio), "KEIN GitHub-Zugriff aus dem Browser (Commits laufen server-seitig)");
ok(!/data-f=token/.test(studio) && !/github_pat_/.test(studio), "kein GitHub-Token-Feld mehr im Browser");
ok(/FP_LISTINGS_INSERT_HERE/.test(studio), "Insert-Marker in Serialisierung erhalten (freigabe.php-kompatibel)");
ok(/window\.FP_LISTINGS = \[/.test(studio), "Serialisierung schreibt window.FP_LISTINGS = [");
ok(/\.svg\(\\?\?\|\$\)/i.test(studio) || /\\.svg/.test(studio), "SVG-Sperre (safeImg)");
ok(/untrusted external data/.test(studio), "Sicherheits-Hinweis: Einreichungs-Inhalte = untrusted");
ok(/mycel/i.test(studio) && /tags/i.test(studio), "Felder Mycel-Integration + Tags vorhanden");

/* 4) Server-seitige Veröffentlichung (kein Browser-Token) */
ok(/function publishViaServer\b/.test(studio), "publishViaServer vorhanden (Server committet)");
ok(/"commit_listings"/.test(studio), "Studio ruft commit_listings (ganze Datei) auf");
ok(/"commit_image"/.test(studio), "Studio ruft commit_image (Depot-Bild) auf");
ok(/need_srvkey/.test(studio), "Fehlermeldung ohne Studio-Passwort (need_srvkey)");

/* 4b) Vektoren bauen (Katalog-Spore Stufe 1, Schreibseite).
 * Die WIRKUNG prüft tests/smoke_studio_vectors.mjs (Rundlauf Studio → Leseseite).
 * Hier nur die zwei Stellen, an denen ein stiller Fehler entstehen könnte. */
ok(/function buildVectors\b/.test(studio), "buildVectors vorhanden (Knopf „Vektoren bauen“)");
ok(/"commit_vectors"/.test(studio), "Studio ruft commit_vectors auf");
ok(/x\.text \|\| x\.label/.test(studio), "Text-Regel (text || label) — identisch zur Leseseite");
ok(/emb\._meta/.test(studio) && !/model:\s*"Xenova/.test(studio), "model/dim aus SbkimEmbedding._meta, nicht hartcodiert");
ok(/FPVecCodec/.test(studio), "Studio packt mit FPVecCodec (dieselbe Datei wie die Leseseite)");
ok(/function frischeListings\b/.test(studio) && /cache:\s*"no-store"/.test(studio),
  "Eintraege werden frisch vom Server geholt, nicht aus dem Browser-Stand (Befund 2026-08-01)");
ok(/vec_dirty/.test(studio), "ungespeicherte Aenderungen blockieren den Vektor-Bau");
ok(/function vecPruefe\b/.test(studio) && /textHash/.test(studio),
  "Stand-Anzeige MISST (Hash-Vergleich), statt nur Vektoren zu zaehlen");
ok(/data-role=vecstand/.test(studio) && /data-role=vecrecheck/.test(studio),
  "Stand steht sichtbar im Panel + Knopf zum Nachpruefen (Klaus 2026-08-01)");
ok(/uebernommen/.test(studio) && /offen\.push/.test(studio),
  "nur geaenderte Eintraege werden neu gerechnet (Klaus' Frage: 1000 Apps)");
ok(/function vecBericht\b/.test(studio) && /w\.print\(\)/.test(studio) && !/jspdf|pdfkit|cdn/i.test(studio),
  "PDF-Bericht ueber die Druckfunktion des Browsers — keine fremde Bibliothek (offline-first)");
ok(/fpst-vecbar/.test(studio) && /sbkim:embedding-progress/.test(studio),
  "Ladebalken + Fortschritts-Listener fuer den Modell-Download (Klaus 2026-08-01)");
ok(/src="assets\/studio-markt\.js\?v=\d+"/.test(markt),
  "markt.html lädt studio-markt.js MIT ?v= — sonst hält Caddys 7-Tage-Cache die alte Fassung fest");

/* 5) Prüf-/Freigabe-Warteschlange (Studio-Seite) */
ok(/window\.FP_MARKT_API/.test(studio), "Studio liest FP_MARKT_API");
ok(/function fetchQueue\b/.test(studio), "fetchQueue vorhanden (Vom Server holen)");
ok(/function queueApprove\b/.test(studio) && /status:\s*"freigegeben"/.test(studio), "queueApprove → setstatus freigegeben (server-seitig)");
ok(/function queueReject\b/.test(studio) && /status:\s*"abgelehnt"/.test(studio), "queueReject → setstatus abgelehnt");
ok(/function queueSetStatus\b/.test(studio) && /"geprueft"/.test(studio), "Status 'geprueft' setzbar");
ok(/function approveAllChecked\b/.test(studio), "Stapel-Freigabe (alle geprüften)");
ok(/function withdrawEntry\b/.test(studio) && /withdraw_confirm/.test(studio), "Zurückziehen (live entfernen) vorhanden");
ok(/action=setstatus|"setstatus"/.test(studio), "API-Aktion setstatus verdrahtet");
ok(/rejectMail\b/.test(studio) && /mailto:/.test(studio), "Ablehnen öffnet vorausgefüllte Antwort-Mail");

/* 6) listings.js: Warteschlangen-Adresse gesetzt + weiterhin gültig */
ok(/window\.FP_MARKT_API\s*=/.test(listingsSrc), "listings.js: FP_MARKT_API definiert");
ok(/FP_LISTINGS_INSERT_HERE/.test(listingsSrc), "listings.js: Insert-Marker vorhanden");
let FP_LISTINGS = null;
try {
  const sandbox = { window: {} };
  new Function("window", listingsSrc)(sandbox.window);
  FP_LISTINGS = sandbox.window.FP_LISTINGS;
  ok(Array.isArray(FP_LISTINGS) && FP_LISTINGS.length >= 10, "listings.js: FP_LISTINGS-Array (" + (FP_LISTINGS ? FP_LISTINGS.length : 0) + " Einträge)");
  const noImg = (FP_LISTINGS || []).filter((x) => !/^https?:\/\//i.test(x.img || "") || /\.svg(\?|$)/i.test(x.img || ""));
  ok(noImg.length === 0, "listings.js: jeder Eintrag hat ein gültiges Bild (kein SVG)");
} catch (e) { ok(false, "listings.js nicht evaluierbar: " + e.message); }

/* 7) markt.html: KEIN doppelter Speicher-POST (einreichung.php füllt die Warteschlange) */
ok(!/marktplatz-api|action=submit/.test(markt), "markt.html: kein doppelter Warteschlangen-POST (nur einreichung.php)");
ok(/FP_MARKT_SUBMIT_ENDPOINT/.test(markt), "markt.html: Formular nutzt einreichung.php (Endpoint)");

/* 8) Server-API vorhanden + Vertrag (Klaus lädt sie neben freigabe.php aufs Webhosting) */
let api = "";
try { api = readFileSync(join(ROOT, "server/marktplatz-api.php"), "utf8"); ok(true, "server/marktplatz-api.php vorhanden"); }
catch (e) { ok(false, "server/marktplatz-api.php fehlt: " + e.message); }
if (api) {
  ["list", "setstatus", "commit_listings", "commit_vectors", "commit_image", "fetch"].forEach((a) => ok(new RegExp("action === '" + a + "'").test(api), "API-Aktion: " + a));
  ok(/vectors_empty/.test(api) && /model_missing/.test(api), "API: commit_vectors lehnt leeres/modellloses Paket ab");
  ok(/listings-vec\.json/.test(api), "API: commit_vectors schreibt nach assets/config/listings-vec.json");
  ok(!/action === 'submit'/.test(api), "API hat KEIN eigenes submit (einreichung.php füllt die Warteschlange)");
  ok(/require_key\(/.test(api) && /hash_equals\(/.test(api), "API: jede Aktion passwortgeschützt (studio_key, hash_equals)");
  ok(/freigabe-config\.php/.test(api), "API teilt sich freigabe-config.php (Token + warteschlange.jsonl)");
  ok(/warteschlange|queue_file/.test(api), "API liest dieselbe Warteschlange (queue_file)");
  ok(/window\.FP_LISTINGS/.test(api) && /content_invalid/.test(api), "API: commit_listings schützt gegen leere/kaputte Datei");
  ok(/assets\/apps\//.test(api), "API: commit_image nur ins Depot assets/apps/");
  try { execFileSync("php", ["-l", join(ROOT, "server/marktplatz-api.php")], { stdio: "ignore" }); ok(true, "marktplatz-api.php PHP-Syntax (php -l)"); }
  catch (e) { if (String(e.message || "").includes("ENOENT")) { ok(true, "php CLI nicht vorhanden — Syntaxprüfung übersprungen"); } else { ok(false, "PHP-Syntaxfehler: " + e.message); } }
}

/* 8b) Quittung mit Datum (2026-08-09) — und der Rückfall ohne
 *
 * Die drei Stücke gehören zusammen: das Studio schreibt `gesehen_am`, der
 * Prüfer auf dem Server lässt es zu, und wenn dort noch eine ältere Fassung
 * liegt, wird OHNE Datum veröffentlicht statt gar nicht. Fehlt das dritte
 * Stück, bricht das Quittieren bei jedem, der die PHP nicht nachgeladen hat —
 * genau der Fall, der am 2026-08-09 einen halben Tag gekostet hat. */
{
  const api = readFileSync(join(ROOT, "server/marktplatz-api.php"), "utf8");
  ok(/neu\.gesehen_am = heuteOrt\(\)/.test(studio), "Studio: Quittung trägt das Datum der Durchsicht");
  ok(/getFullYear\(\)/.test(studio) && !/gesehen_am = new Date\(\)\.toISOString/.test(studio),
    "Studio: das Datum kommt aus der Ortszeit, nicht aus UTC");
  ok(/field_not_allowed/.test(studio) && /wa_ohne_datum/.test(studio),
    "Studio: älterer Server → Quittung geht ohne Datum raus, statt zu scheitern");
  ok(/'gesehen_am'/.test(api) && /bad_date/.test(api), "API: gesehen_am erlaubt, aber streng als Datum geprüft");
  ok(/\$vorhanden/.test(api) && /array_key_exists\(\$feld, \$alt\)/.test(api),
    "API: fremde Felder nur BYTEGLEICH durchreichbar — Sperre bleibt Handarbeit");
}

/* 9) freigabe-config.example.php: studio_key ergänzt */
let cfg = "";
try { cfg = readFileSync(join(ROOT, "server/freigabe-config.example.php"), "utf8"); } catch (e) {}
ok(/studio_key/.test(cfg), "freigabe-config.example.php: studio_key vorhanden");

console.log(`\nMarktplatz-Studio-Struktur-Smoke: ${pass} bestanden, ${fail} fehlgeschlagen.`);
process.exit(fail > 0 ? 1 : 0);

/* smoke_studio_markt.mjs — Struktur-Smoke für das Marktplatz-Selbst-Pflege-Studio.
 *
 * Ehrlich über den Umfang: DEPENDENCY-FREIER Quell-/Struktur-Test. Prüft, dass die
 * Studio-Verdrahtung vorhanden und konsistent ist (server-seitige Commits, Warteschlange
 * über marktplatz-api.php auf warteschlange.jsonl, Insert-Marker, Sicherheits-Filter).
 * Ersetzt NICHT den Browser-/Server-Sichttest (Langdruck, echtes Freigeben mit Passwort)
 * — der wartet auf Klaus. Lauf:  node tests/smoke_studio_markt.mjs
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
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
  /* Ohne diese vier Felder kann ein Studio eine MELDUNG nicht von einer
     EINREICHUNG unterscheiden — beide haben nur `label` und `text` gemeinsam.
     Bis 2026-08-10 fehlten sie, und jede Meldung landete im Pruef-Stapel mit
     den Warnungen „kein brauchbares Bild" und „Adresse ist kein https". */
  ["zweck", "entry_id", "grund", "grund_text"].forEach((f) =>
    ok(new RegExp("'" + f + "' => isset\\(\\$r\\['" + f + "'\\]\\)").test(api),
       "API: list reicht `" + f + "` durch (Meldung von Einreichung unterscheidbar)"));
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

/* ════════════════════════════════════════════════════════════════════════════
 * 10) DER RIEGEL DER AMPEL — sperren ja, lösen nein (Klaus 2026-08-11)
 *
 * Diese Prüfung liest NICHT den Wortlaut der PHP-Datei, sie LÄSST SIE LAUFEN.
 * Der `commit_wache`-Block wird aus der echten Datei geschnitten, mit Attrappen
 * für Netz und Ausgabe umgeben und mit echten Nutzlasten gefüttert. Was hier
 * grün ist, ist an der Rechnung grün — nicht an einem Suchbegriff.
 *
 * Der Grund für die Umständlichkeit: die Datei ist ein Dienst. Sie einzubinden
 * hiesse, sie auszuführen, samt Konfiguration und `exit`. Ein zweiter Ort für
 * dieselbe Regel wäre die Alternative gewesen — und der wäre auseinandergelaufen.
 * ══════════════════════════════════════════════════════════════════════════ */
{
  const quelle = readFileSync(join(ROOT, "server/marktplatz-api.php"), "utf8");

  /* Vom ersten Zeichen der Rangfolge bis zur schliessenden Klammer des
     commit_wache-Blocks — mit Klammer-Zählung, nicht mit einer Faustregel. */
  function ausschneiden() {
    const a = quelle.indexOf("function wache_rang(");
    const b = quelle.indexOf("if ($action === 'commit_wache') {", a);
    if (a < 0 || b < 0) return null;
    let i = quelle.indexOf("{", b), tiefe = 0;
    for (; i < quelle.length; i++) {
      if (quelle[i] === "{") tiefe++;
      else if (quelle[i] === "}") { tiefe--; if (!tiefe) return quelle.slice(a, i + 1); }
    }
    return null;
  }
  const block = ausschneiden();
  ok(!!block, "commit_wache-Block liess sich aus der echten Datei schneiden");

  function lauf(vorhanden, neu) {
    const harness =
      "<?php\n" +
      "function out($arr, $code = 200) { throw new RuntimeException(json_encode(array('code'=>$code,'body'=>$arr))); }\n" +
      "function req($b, $k, $d = '') { return isset($b[$k]) ? $b[$k] : $d; }\n" +
      "function require_key($a, $b) {}\n" +
      "function gh_request($CFG, $m, $p, $pl = null) {\n" +
      "  $v = getenv('VORH');\n" +
      "  if ($v === 'FEHLER') return array(500, null);\n" +
      "  return array(200, array('content' => base64_encode($v)));\n" +
      "}\n" +
      "function gh_put_file($CFG, $p, $b64, $msg) { return array(true, 'geschrieben'); }\n" +
      "$CFG = array('github_owner'=>'o','github_repo'=>'r','github_branch'=>'main');\n" +
      "$STUDIO_KEY = 'x'; $action = 'commit_wache'; $B = array('content' => getenv('NEU'));\n" +
      "try {\n" + block + "\n} catch (RuntimeException $e) { echo $e->getMessage(); }\n";
    const datei = join(tmpdir(), "wache-riegel-" + process.pid + ".php");
    writeFileSync(datei, harness);
    let roh = "";
    try {
      roh = execFileSync("php", [datei], {
        encoding: "utf8",
        env: Object.assign({}, process.env, {
          VORH: typeof vorhanden === "string" ? vorhanden : JSON.stringify(vorhanden),
          NEU: JSON.stringify(neu, null, 2) + "\n"
        })
      });
    } catch (e) { return { fehler: "php-lauf: " + String(e.message).slice(0, 200) }; }
    finally { try { unlinkSync(datei); } catch (e) {} }
    try { const j = JSON.parse(roh.trim()); return { code: j.code, error: j.body && j.body.error, ok: !!(j.body && j.body.ok) }; }
    catch (e) { return { fehler: "unlesbare Antwort: " + roh.slice(0, 200) }; }
  }

  function erwarte(was, vorhanden, neu, fehlerErwartet) {
    const r = lauf(vorhanden, neu);
    if (r.fehler) { ok(false, was + " → " + r.fehler); return; }
    if (fehlerErwartet === null) ok(r.ok === true, was + (r.ok ? "" : " → abgewiesen mit " + r.error));
    else ok(r.error === fehlerErwartet, was + " → erwartet " + fehlerErwartet + ", bekam " + (r.error || "ok"));
  }

  if (block) {
    const leer = { _hinweis: "x" };
    const gesperrt = { _hinweis: "x", "markt-probe": { ampel: "rot", grund: "Verlangt eine Anmeldung.", seit: "2026-08-11" } };
    const vorbehalt = { _hinweis: "x", "markt-probe": { ampel: "gelb", grund: "Wird geprüft." } };

    /* ── Was gehen MUSS ────────────────────────────────────────────────── */
    erwarte("Quittieren geht weiter", leer,
            { _hinweis: "x", "markt-probe": { gesehen: "abcdef0123456789", gesehen_am: "2026-08-11" } }, null);
    erwarte("SPERREN aus dem Studio ist erlaubt", leer,
            { _hinweis: "x", "markt-probe": { ampel: "rot", grund: "Verlangt eine Anmeldung.", seit: "2026-08-11" } }, null);
    erwarte("Vorbehalt setzen ist erlaubt", leer,
            { _hinweis: "x", "markt-probe": { ampel: "gelb", grund: "Wird geprüft.", seit: "2026-08-11" } }, null);
    erwarte("Verschärfen gelb → rot ist erlaubt", vorbehalt,
            { _hinweis: "x", "markt-probe": { ampel: "rot", grund: "Doch gefährlich.", seit: "2026-08-11" } }, null);
    erwarte("eine bestehende Sperre unverändert durchreichen", gesperrt,
            { _hinweis: "x", "markt-probe": { ampel: "rot", grund: "Verlangt eine Anmeldung.", seit: "2026-08-11", gesehen: "abcdef0123456789" } }, null);

    /* ── Was NICHT gehen darf — jeder Weg zum stillen Lösen ────────────── */
    erwarte("rot → gelb (herabstufen)", gesperrt,
            { _hinweis: "x", "markt-probe": { ampel: "gelb", grund: "halb so wild" } }, "entsperren_nur_in_datei");
    erwarte("rot → grün (freigeben)", gesperrt,
            { _hinweis: "x", "markt-probe": { ampel: "gruen", grund: "passt schon" } }, "entsperren_nur_in_datei");
    erwarte("rot → Ampel weglassen", gesperrt,
            { _hinweis: "x", "markt-probe": { gesehen: "abcdef0123456789" } }, "entsperren_nur_in_datei");
    /* Der stillste Weg von allen: den ganzen Eintrag nicht mitschicken. */
    erwarte("den gesperrten Eintrag ganz weglassen", gesperrt,
            { _hinweis: "x" }, "entsperren_nur_in_datei");
    erwarte("grün setzen, wo nichts stand (Automatik überstimmen)", leer,
            { _hinweis: "x", "markt-probe": { ampel: "gruen", grund: "ich weiß, die zieht um" } }, "entsperren_nur_in_datei");

    /* ── Nie still handeln ─────────────────────────────────────────────── */
    erwarte("sperren OHNE Grund", leer,
            { _hinweis: "x", "markt-probe": { ampel: "rot" } }, "grund_fehlt");
    erwarte("sperren mit leerem Grund", leer,
            { _hinweis: "x", "markt-probe": { ampel: "rot", grund: "   " } }, "grund_fehlt");

    /* ── Form ──────────────────────────────────────────────────────────── */
    erwarte("erfundenes Ampel-Wort", leer,
            { _hinweis: "x", "markt-probe": { ampel: "quittiert", grund: "x" } }, "bad_ampel");
    erwarte("Grund zu lang", leer,
            { _hinweis: "x", "markt-probe": { ampel: "rot", grund: "x".repeat(301) } }, "bad_grund");
    erwarte("Datum in falscher Form", leer,
            { _hinweis: "x", "markt-probe": { ampel: "rot", grund: "x", seit: "11.08.2026" } }, "bad_seit");
    erwarte("ein fremdes Feld bleibt gesperrt", leer,
            { _hinweis: "x", "markt-probe": { handgrund: "geschummelt" } }, "field_not_allowed");

    /* ── Der Automatik-Schalter (Schritt 4, 2026-08-12) ─────────────────
     * Er steht als `_automatik` in derselben Datei wie die Ampel, weil das
     * gerechnete gelbe Band öffentlich ist und der Browser eines Besuchers
     * wissen muss, ob die Automatik an ist. Der Prüfer ist dafür bewusst
     * erweitert worden — und diese Proben halten fest, dass die Erweiterung
     * eng geblieben ist: sie kann nichts sperren und nichts lösen. */
    erwarte("den Schalter setzen ist erlaubt", leer,
            { _hinweis: "x", _automatik: { an: true, naechte: 3, meldungen: 4, grenze: 50 } }, null);
    erwarte("den Schalter wieder ausschalten ist erlaubt", leer,
            { _hinweis: "x", _automatik: { an: false, naechte: 3, meldungen: 4, grenze: 50 } }, null);
    erwarte("Erklär-Text im Schalter ist erlaubt", leer,
            { _hinweis: "x", _automatik: { _hinweis: "so geht das", an: false } }, null);
    /* Und was er NICHT darf. Vor allem: keine Ampel tragen — sonst wäre der
       Schalter ein zweiter Weg zur Sperre, an der Rangfolge vorbei. */
    erwarte("der Schalter trägt keine Ampel", leer,
            { _hinweis: "x", _automatik: { an: true, ampel: "rot" } }, "automatik_invalid");
    erwarte("kein fremdes Feld im Schalter", leer,
            { _hinweis: "x", _automatik: { an: true, egal: 1 } }, "automatik_invalid");
    erwarte("„an“ muss ein Ja/Nein sein", leer,
            { _hinweis: "x", _automatik: { an: "ja" } }, "automatik_invalid");
    erwarte("Nächte außerhalb des Bereichs", leer,
            { _hinweis: "x", _automatik: { an: true, naechte: 0 } }, "automatik_invalid");
    erwarte("Nächte als Text", leer,
            { _hinweis: "x", _automatik: { an: true, naechte: "3" } }, "automatik_invalid");
    erwarte("Meldungen außerhalb des Bereichs", leer,
            { _hinweis: "x", _automatik: { an: true, meldungen: 101 } }, "automatik_invalid");
    erwarte("der Schalter ist kein Ersatz für einen Eintrag", leer,
            { _hinweis: "x", _automatik: "an" }, "automatik_invalid");
    /* Der Riegel bleibt vom Schalter unberührt: eine bestehende Sperre lässt
       sich auch dann nicht lösen, wenn nebenher am Schalter gedreht wird. */
    erwarte("Schalter drehen löst keine Sperre", gesperrt,
            { _hinweis: "x", _automatik: { an: true } }, "entsperren_nur_in_datei");
    /* Und ein Schlüssel mit Unterstrich, den niemand kennt, bleibt draußen —
       die Erweiterung gilt genau für diesen einen Namen. */
    erwarte("ein anderer Unterstrich-Schlüssel bleibt gesperrt", leer,
            { _hinweis: "x", _sonstwas: { an: true } }, "bad_key");

    /* ── FAIL-CLOSED: ohne die vorhandene Fassung wird nichts geschaltet ── */
    erwarte("Vorlage unlesbar → Sperre wird NICHT gesetzt", "FEHLER",
            { _hinweis: "x", "markt-probe": { ampel: "rot", grund: "x" } }, "vorlage_nicht_lesbar");
    erwarte("Vorlage unlesbar → Quittieren geht trotzdem", "FEHLER",
            { _hinweis: "x", "markt-probe": { gesehen: "abcdef0123456789" } }, null);
  }
}

/* ── Der Riegel IM BROWSER — die Tat, nicht der Wortlaut ────────────────────
 *
 * Der Block oben prüft den Server. Der Server ist auch die Stelle, die
 * ENTSCHEIDET — aber er ist nicht die Stelle, an der Klaus den Grund erfährt.
 * Der Riegel im Studio steht davor, damit eine Ablehnung sofort sichtbar wird
 * und nicht erst nach einem fehlgeschlagenen Veröffentlichen.
 *
 * Geprüft wird er wie der PHP-Block: HERAUSSCHNEIDEN und WIRKLICH LAUFEN
 * LASSEN, mit Attrappen für alles, was ein Browser mitbringt. Ein `ok(/…/)`
 * über den Quelltext wäre auch dann grün, wenn die Funktion nie gerufen wird
 * oder ihr Ergebnis niemanden erreicht. */
{
  const a = studio.indexOf("/* WACHE-RIEGEL-START");
  const b = studio.indexOf("/* WACHE-RIEGEL-ENDE */");
  ok(a > 0 && b > a, "Riegel-Block liess sich aus der echten Datei schneiden");
  if (a > 0 && b > a) {
    const block = studio.slice(a, b);

    /* Die Attrappen sind absichtlich dumm: sie merken sich nur, WAS passiert
       ist. Damit misst die Probe die Wirkung, nicht die Absicht. */
    const bau = (vorhanden) => {
      const zustand = {
        WACHEHAND: JSON.parse(JSON.stringify(vorhanden || {})),
        wacheDirty: false, sperrZeile: { id: "x", ampel: "rot" }, gesagt: [], neuGezeichnet: 0,
      };
      const fn = new Function("Z", `
        var WACHEHAND = Z.WACHEHAND, wacheDirty = Z.wacheDirty, sperrZeile = Z.sperrZeile;
        var SPORENSTAND = null;
        function toast(t, gut) { Z.gesagt.push(String(t)); }
        function T(k) { return k; }
        function markDirty() {}
        function renderSporen() { Z.neuGezeichnet++; }
        function heuteOrt() { return "2026-08-14"; }
        ${block}
        return { setzen: function (i, a, g) {
          var r = wacheSetzen(i, a, g);
          Z.wacheDirty = wacheDirty; Z.sperrZeile = sperrZeile; return r;
        }, rang: wacheRang, ampel: wacheAmpel };
      `);
      return { z: zustand, api: fn(zustand) };
    };

    /* Die Rangfolge — WIRKLICH gerechnet, nicht aus der Datei gelesen. Sie ist
       der vierte Ort derselben Regel (Doku · PHP · Toolpoint · hier). */
    const { api: r } = bau({});
    ok(r.rang("gruen") === 0, "Rang: gruen ist 0");
    ok(r.rang(null) === 1, "Rang: kein Eintrag ist 1");
    ok(r.rang("gelb") === 2, "Rang: gelb ist 2");
    ok(r.rang("rot") === 3, "Rang: rot ist 3");
    ok(r.rang("blau") === -1, "Rang: ein unbekanntes Wort wird abgewiesen, nicht geraten");
    ok(r.rang("gruen") < r.rang(null), "gruen steht UNTER kein-Eintrag (sonst waere es ein Entsperren)");

    /* Was gehen MUSS. */
    {
      const { z, api } = bau({});
      ok(api.setzen("app-x", "rot", "Verlangt eine Anmeldung.") === true, "Sperren mit Grund geht");
      ok(z.WACHEHAND["app-x"].ampel === "rot", "…und die Ampel steht danach auf rot");
      ok(z.WACHEHAND["app-x"].grund === "Verlangt eine Anmeldung.", "…mit dem Grund");
      ok(z.WACHEHAND["app-x"].seit === "2026-08-14", "…und dem Datum in Ortszeit");
      ok(z.wacheDirty === true, "…und es steht als unveroeffentlicht an");
      ok(z.sperrZeile === null, "…das Grund-Feld schliesst sich");
    }
    {
      const { z, api } = bau({});
      ok(api.setzen("app-x", "gelb", "Wird geprueft.") === true, "Vorbehalt mit Grund geht");
      ok(z.WACHEHAND["app-x"].ampel === "gelb", "…und die Ampel steht auf gelb");
    }
    /* Eine Quittung darf beim Sperren NICHT verlorengehen — sonst meldete der
       Waechter dieselbe Aenderung nach dem Entsperren erneut. */
    {
      const { z, api } = bau({ "app-x": { gesehen: "abcdef0123456789", gesehen_am: "2026-08-01" } });
      api.setzen("app-x", "rot", "Doch gefaehrlich.");
      ok(z.WACHEHAND["app-x"].gesehen === "abcdef0123456789", "die Quittung bleibt beim Sperren stehen");
      ok(z.WACHEHAND["app-x"].gesehen_am === "2026-08-01", "…samt ihrem Datum");
    }

    /* Was NICHT gehen darf. Jede Verweigerung einzeln — und jedes Mal muss die
       Arbeitskopie UNVERAENDERT bleiben, nicht nur der Rueckgabewert falsch. */
    const verweigert = (was, vorhanden, id, ampel, grund) => {
      const { z, api } = bau(vorhanden);
      const vorher = JSON.stringify(z.WACHEHAND);
      ok(api.setzen(id, ampel, grund) === false, was + " — wird abgelehnt");
      ok(JSON.stringify(z.WACHEHAND) === vorher, was + " — und die Arbeitskopie bleibt unberuehrt");
      ok(z.wacheDirty === false, was + " — und nichts steht als unveroeffentlicht an");
    };
    verweigert("gruen setzen (Entsperren durch die Hintertuer)", {}, "app-x", "gruen", "passt schon");
    verweigert("ohne Grund sperren", {}, "app-x", "rot", "");
    verweigert("ohne Grund sperren (nur Leerzeichen)", {}, "app-x", "rot", "    ");
    verweigert("Grund laenger als 300 Zeichen", {}, "app-x", "rot", "x".repeat(301));
    verweigert("rot auf gelb herunterstufen", { "app-x": { ampel: "rot", grund: "x" } }, "app-x", "gelb", "halb so wild");
    verweigert("ein unbekanntes Ampel-Wort", {}, "app-x", "blau", "irgendwas");
    /* Die zwei Faelle, in denen NUR die Untergrenze (`< 2`) haelt — der
       Richtungs-Vergleich allein laesst sie durch, weil ein unbekanntes Wort
       den Rang -1 hat und damit UNTER allem steht. Ohne diese zwei Proben
       liesse sich die Untergrenze spurlos entfernen: die Gegenprobe
       (tests/gegenprobe_studio_riegel.sh, Probe 4) hat genau das gefunden. */
    verweigert("gruen setzen, wenn dort Muell steht (0 gilt als 'strenger' als -1)",
               { "app-x": { ampel: "blau" } }, "app-x", "gruen", "passt schon");
    verweigert("Muell setzen, wo schon Muell steht (-1 gegen -1)",
               { "app-x": { ampel: "blau" } }, "app-x", "lila", "irgendwas");

    /* Genau an der Grenze muss es noch gehen — sonst haette die Probe oben nur
       bewiesen, dass ueberhaupt irgendwo abgelehnt wird. */
    {
      const { api } = bau({});
      ok(api.setzen("app-x", "rot", "x".repeat(300)) === true, "300 Zeichen sind noch erlaubt");
    }
    /* Gleich bleiben ist kein Herunterstufen: eine rote Zeile mit neuem Grund
       muss sich weiter schaerfen lassen. */
    {
      const { z, api } = bau({ "app-x": { ampel: "rot", grund: "alt" } });
      ok(api.setzen("app-x", "rot", "neuer Grund") === true, "rot bleibt rot mit neuem Grund");
      ok(z.WACHEHAND["app-x"].grund === "neuer Grund", "…und der Grund wird nachgezogen");
    }
  }
}

/* Und die Knoepfe muessen auch verdrahtet sein — eine Funktion, die niemand
   ruft, ist kein Schutz und keine Bedienung. */
ok(/data-sperren/.test(studio) && /data-vorbehalt/.test(studio), "Sperr-Knoepfe im Studio vorhanden");
ok(/closest\("\[data-sperrok\]"\)/.test(studio), "der Setz-Knopf ist verdrahtet");
ok(/wacheSetzen\(sid,/.test(studio), "…und ruft wirklich wacheSetzen");
ok(/\(sperrZeile && sperrZeile\.ampel\)/.test(studio),
   "die Ampel kommt aus dem Zustand, nicht aus dem Markup");

console.log(`\nMarktplatz-Studio-Struktur-Smoke: ${pass} bestanden, ${fail} fehlgeschlagen.`);
process.exit(fail > 0 ? 1 : 0);

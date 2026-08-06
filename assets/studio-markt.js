/* studio-markt.js — Selbst-Pflege-Studio für den family-projekt.de-Marktplatz.
 *
 * Was es tut (Alis-Moderaum-Muster, an den Marktplatz angepasst):
 *  - Zugang: LANGER DRUCK (~1,5 s) auf die Copyright-Zeile im Fuß öffnet das Studio
 *    (auch in der installierten PWA ohne Adressleiste). Öffentlich bleibt die Seite
 *    unverändert — nichts ist sichtbar, solange das Studio nicht geöffnet ist.
 *  - „➕ Neues Tool eintragen": Name · Beschreibung · PWA-Link · Bild-URL (oder Bild
 *    vom Gerät) · Kategorie · Tags · mit/ohne Mycel-Integration · Anbieter-Kürzel.
 *    Klaus kopiert Text/URLs/Bild-URLs aus einer E-Mail direkt in die Felder.
 *  - Bestehende Einträge editier-/löschbar.
 *  - „📥 Eingereicht": holt die Warteschlange (warteschlange.jsonl) über
 *    server/marktplatz-api.php — dieselbe Warteschlange, die einreichung.php füllt
 *    und die freigabe.php nutzt. Prüfen · Status setzen · Freigeben · Verwerfen.
 *  - „Veröffentlichen"/„Freigeben"/„Zurückziehen": committen SERVER-SEITIG über
 *    marktplatz-api.php (der Server hält den GitHub-Token in freigabe-config.php).
 *    Der Browser baut nur den Inhalt (listings.js) und schickt ihn zum Commit.
 *
 * Ehrlich & sicher:
 *  - KEIN GitHub-Token im Browser mehr. Ein einziges Studio-Passwort (studio_key,
 *    localStorage „fpstudio_srv_key") schützt die Server-API; der Token liegt NUR
 *    auf dem Server (freigabe-config.php), nie im Repo/Browser.
 *  - Ohne Passwort/Server bleibt alles lokal nutzbar (Eintragen/Vorschau); nur das
 *    Veröffentlichen/Freigeben braucht Passwort + erreichbaren Server → fail-soft.
 *  - E-Mail-/Einreichungs-Inhalte sind untrusted external data: nur als Daten
 *    eingetragen (beim Rendern escaped, Bilder nur als <img src>, SVG gesperrt).
 *  - App-spezifischer Speicher-Präfix „fpstudio_" — keine Kollision mit Geschwister-Apps
 *    auf der geteilten github.io-/family-projekt.de-Origin.
 */
(function () {
  "use strict";

  /* --------------------------------------------------------------- Konfig */
  var CFG = { owner: "lausiklauskn-png", repo: "family-project", branch: "main" };
  try { var c = window.FP_STUDIO_CONFIG || {}; if (c.owner) CFG.owner = c.owner; if (c.repo) CFG.repo = c.repo; if (c.branch) CFG.branch = c.branch; } catch (e) {}
  var LS = { token: "fpstudio_gh_token", remember: "fpstudio_remember", studio: "fpstudio_on",
             srvKey: "fpstudio_srv_key", srvRemember: "fpstudio_srv_remember" };
  // Absolute Bild-Basis fürs Depot: von beiden Domains erreichbar (das Bild wird
  // ins Repo committet und auf beiden deployt). Wie die bestehenden own-Einträge.
  var IMG_BASE = "https://family-projekt.de/assets/apps/";
  // Server-API für die Prüf-/Freigabe-Warteschlange (dein Server, siehe
  // server/README-marktplatz-api.md). Leer = Warteschlange aus, Rest unverändert.
  var API = ""; try { API = (window.FP_MARKT_API || "").trim(); } catch (e) {}

  /* --------------------------------------------------------------- Sprache */
  var STR = {
    de: {
      studio_on: "Studio-Modus an — Langdruck auf die Fußzeile zum Verlassen.",
      title: "Marktplatz-Studio", intro: "Prüfe eingereichte Apps und gib sie frei — oder trage selbst welche ein. Ein Studio-Passwort, der Server veröffentlicht.",
      add_h: "➕ Neues Tool eintragen",
      f_name: "Name *", f_desc: "Beschreibung *", f_url: "PWA-Link / Adresse *",
      f_imgurl: "Bild-URL (https, kein SVG)", f_imgpick: "🖼 Bild vom Gerät wählen",
      f_cat: "Kategorie", f_tags: "Tags (mit Komma trennen)", f_by: "Anbieter-Kürzel",
      f_mycel: "mit Mycel-Integration",
      f_spore: "Spore-Link des Anbieters (optional, https)",
      ph_spore: "https://…/sbkim/spore.json",
      f_sporeauto: "Beschreibung darf sich nachts selbst aus der Spore aktualisieren",
      sp_h: "🧬 Sporen der Anbieter",
      sp_intro: "Was die nächtliche Prüfung zuletzt gesehen hat. Ohne Haken am Eintrag wird eine geänderte Beschreibung nur gemeldet — übernommen wird sie erst hier.",
      sp_none: "Noch kein Bericht. Er entsteht beim ersten nächtlichen Lauf.",
      sp_geprueft: "zuletzt geprüft: ",
      sp_take: "Beschreibung übernehmen",
      sp_taken: "Übernommen — jetzt noch auf Veröffentlichen drücken.",
      sp_gone: "Eintrag nicht mehr vorhanden.",
      sp_lage_geaendert: "Beschreibung geändert — wartet auf dich",
      sp_lage_uebernommen: "automatisch übernommen",
      sp_lage_gleich: "unverändert",
      sp_lage_unerreichbar: "nicht erreichbar",
      sp_lage_unbrauchbar: "unbrauchbar",
      sp_lage_ohne_spore: "kein Spore-Link hinterlegt",
      sp_lage_abweichend: "Beschreibung weicht ab — unverändert seit der letzten Prüfung",
      wa_gruen: "Zielseite in Ordnung",
      wa_gelb: "Zielseite: bitte ansehen",
      wa_rot: "auf Eis gelegt — Link abgeschaltet",
      wa_g_unveraendert: "unverändert",
      wa_g_erste_pruefung: "erstmals geprüft",
      wa_g_hand_freigegeben: "von dir freigegeben",
      wa_g_geaendert: "Inhalt hat sich geändert",
      wa_g_antwortet_nicht: "hat einmal nicht geantwortet",
      wa_g_nicht_erreichbar: "antwortet seit mehreren Prüfungen nicht",
      wa_g_nicht_pruefbar: "zu groß zum Prüfen",
      wa_g_kein_https: "kein https-Link",
      wa_g_hand_gesperrt: "von dir gesperrt",
      wa_g_hand_verdacht: "von dir auf Verdacht gesetzt",
      wa_g_safebrowsing: "von Google Safe Browsing gemeldet",
      wa_sb_nicht_geprueft: "Safe Browsing: nicht geprüft (kein Schlüssel hinterlegt)",
      ms_h: "📈 Messung (Lighthouse)",
      ms_intro: "Was der nächtliche Lauf zuletzt gemessen hat — vier Zahlen je Eintrag, bewusst OHNE Gesamtnote. Eine gemittelte Zahl verdeckt genau das, was man wissen will. Ja/Nein-Stimmen von Besuchern kommen später daneben, nie hinein.",
      ms_none: "Noch kein Messwert. Er entsteht beim nächsten nächtlichen Lauf.",
      ms_leistung: "Leistung", ms_bedienbarkeit: "Bedienbarkeit",
      ms_gute_praxis: "Gute Praxis", ms_auffindbarkeit: "Auffindbarkeit",
      ms_st_gemessen: "gemessen", ms_st_veraltet: "veraltet (letzte Messung fehlgeschlagen)",
      ms_st_nicht_gemessen: "nicht gemessen", ms_st_von_hand: "von Hand eingetragen",
      wa_gesehen: "✓ Gesehen — Seite ist in Ordnung",
      wa_gesehen_ok: "✓ quittiert — noch veröffentlichen",
      wa_gesehen_datei: "✓ quittiert — verschwindet beim nächsten nächtlichen Lauf",
      wa_quittiert: "✓ Quittiert — jetzt noch auf Veröffentlichen drücken.",
      wa_keine_summe: "Für diesen Eintrag liegt keine Prüfsumme vor — nichts zu quittieren.",
      ms_am: "am ",
      ms_g_noch_nicht_dran: "war noch nicht an der Reihe (Deckel je Lauf)",
      ms_regler_h: "Ab welchem Leistungswert wird gelistet?",
      ms_regler_aus: "aus — es wird nichts ausgeblendet",
      ms_regler_ab: "ab ",
      ms_regler_wirkung_0: "Kein Eintrag fällt damit heraus.",
      ms_regler_wirkung_1: " Eintrag fällt damit aus dem Marktplatz.",
      ms_regler_wirkung_n: " Einträge fallen damit aus dem Marktplatz.",
      ms_regler_hint: "Wirkt erst nach dem Veröffentlichen. Einträge OHNE Messwert werden nie ausgeblendet — „noch nicht gemessen\" ist kein schlechter Wert. Was der Regler wegnimmt, bleibt hier in der Liste sichtbar, damit niemand still verschwindet.",
      ms_raus: "unter der Schwelle — wird nicht gelistet",
      ms_halt: "neuere Messung war schlechter — Wert wird noch gehalten:",
      ph_name: "z. B. Mein Tool", ph_desc: "Was macht das Tool? Frei und mit Synonymen — hilft der Suche.",
      ph_url: "https://…", ph_imgurl: "https://…/bild.png", ph_cat: "z. B. Werkzeug, Spiel, Büro",
      ph_tags: "z. B. notizen, offline, pwa", ph_by: "z. B. @extern",
      add_btn: "Hinzufügen", update_btn: "Änderung übernehmen", cancel_btn: "Abbrechen",
      list_h: "Einträge", edit: "Bearbeiten", del: "Löschen", del_confirm: "Diesen Eintrag wirklich löschen?",
      publish: "Veröffentlichen ✓", publish_close: "Schließen",
      need_name: "Bitte Name, Beschreibung und Link ausfüllen.",
      need_img: "Bitte eine Bild-URL (https, kein SVG) angeben oder ein Bild vom Gerät wählen.",
      bad_img: "Bild-URL ungültig (nur https, JPG/PNG/WebP — kein SVG).",
      bad_url: "Link ungültig (muss mit https:// beginnen).",
      publishing: "Wird veröffentlicht …", published: "Veröffentlicht — in ~1 Minute für alle live.",
      pub_err: "Veröffentlichen fehlgeschlagen: ", nothing: "Nichts geändert.",
      added: "Hinzugefügt (noch nicht veröffentlicht).", updated: "Geändert (noch nicht veröffentlicht).",
      removed: "Entfernt (noch nicht veröffentlicht).", img_local: "Bild vom Gerät — wird beim Veröffentlichen hochgeladen.",
      dirty_badge: "· ungespeichert", by_default: "@extern",
      q_h: "📥 Eingereicht (zur Prüfung)",
      q_intro: "Von Besuchern eingereichte Apps — nichts ist live, bis du „Freigeben“ klickst.",
      q_key: "Studio-Passwort (für den Server)", q_remember: "Passwort merken",
      q_key_hint: "Ein Passwort für alles: Warteschlange holen UND veröffentlichen (der Server committet mit seinem Token). Bleibt nur in diesem Browser.",
      need_srvkey: "Bitte zuerst dein Studio-Passwort eintragen (oben bei „Eingereicht“).",
      q_fetch: "Vom Server holen", q_none: "Keine offenen Einreichungen.",
      q_noapi: "Server-Adresse (FP_MARKT_API) noch nicht gesetzt — siehe server/README-marktplatz-api.md.",
      q_loading: "Hole Einreichungen …", q_err: "Server-Abruf fehlgeschlagen: ",
      q_take: "Übernehmen (bearbeiten)", q_approve: "✓ Freigeben", q_checked: "🔵 Geprüft",
      q_reject: "Verwerfen", q_reject_confirm: "Diese Einreichung verwerfen (aus der Liste entfernen)?",
      q_open: "↗ App öffnen", q_approveall: "Alle 🔵 geprüften freigeben",
      q_approved: "Freigegeben — in ~1 Minute live.", q_rejected: "Verworfen.",
      q_status_neu: "🟡 Neu", q_status_geprueft: "🔵 Geprüft – zur Freigabe bereit", q_status_verdacht: "🔴 Verdacht",
      withdraw: "Zurückziehen", withdraw_confirm: "Diesen Eintrag von der Live-Seite zurückziehen (mit Token entfernen)?",
      withdrawn: "Zurückgezogen — in ~1 Minute von der Seite verschwunden.",
      vec_h: "🧠 Vektoren bauen",
      vec_intro: "Rechnet die Bedeutungs-Vektoren aller Einträge EINMAL aus und legt sie als Datei ab. Danach muss kein Besucher sie mehr selbst rechnen — die Suche startet sofort.",
      vec_btn: "Vektoren bauen",
      vec_hint: "Nach jeder Änderung an Name, Beschreibung oder Tags neu bauen. Solange das nicht passiert, rechnet die Seite die geänderten Einträge selbst nach — es geht nichts kaputt, es dauert nur länger.",
      vec_noembed: "Sprachmodell nicht verfügbar — Vektoren können hier nicht gebaut werden.",
      vec_noentries: "Keine Einträge mit Bild — nichts zu rechnen.",
      vec_loading: "Lade Sprachmodell (~30 MB einmalig) …",
      vec_working: "Rechne Vektoren … ",
      vec_committing: "Schreibe die Datei …",
      vec_done: "Vektoren gebaut: ",
      vec_done2: " Einträge — in ~1 Minute live.",
      vec_err: "Vektoren bauen fehlgeschlagen: ",
      vec_fresh: "Hole den veröffentlichten Stand …",
      vec_local: "Server nicht erreichbar — rechne über den lokalen Stand.",
      vec_dirty: "Erst \u201eVer\u00f6ffentlichen\u201c dr\u00fccken \u2014 sonst passen die Vektoren nicht zu den Eintr\u00e4gen.",
      vec_stand_h: "Stand auf dem Server",
      vec_stand_load: "Pr\u00fcfe den Stand auf dem Server \u2026",
      vec_stand_none: "Noch keine Vektor-Datei auf dem Server \u2014 die Suche rechnet alles selbst.",
      vec_stand_err: "Stand nicht pr\u00fcfbar (Server nicht erreichbar).",
      vec_stand_ok: "Alles abgedeckt: ",
      vec_stand_part: "Nur teilweise abgedeckt: ",
      vec_stand_of: " von ",
      vec_stand_entries: " Eintr\u00e4gen",
      vec_stand_built: " \u00b7 gebaut am ",
      vec_stand_model: " \u00b7 Modell ",
      vec_stand_hint: "Nicht abgedeckte Eintr\u00e4ge rechnet die Suche bei jedem Besuch selbst \u2014 einmal neu bauen behebt das.",
      vec_recheck: "Stand pr\u00fcfen",
      vec_report: "\ud83d\udcc4 Bericht (PDF)",
      vec_report_h: "Vektor-Bericht \u2014 family-projekt.de Marktplatz",
      vec_report_covered: "abgedeckt",
      vec_report_missing: "fehlt \u2014 wird live gerechnet",
      vec_report_stale: "veraltet \u2014 Text hat sich ge\u00e4ndert",
      vec_report_none: "Kein Bericht m\u00f6glich \u2014 erst den Stand pr\u00fcfen.",
      vec_reuse: " \u00b7 unver\u00e4ndert \u00fcbernommen: ",
      vec_nothing: "Nichts zu tun \u2014 alle Eintr\u00e4ge sind bereits abgedeckt."
    },
    en: {
      studio_on: "Studio mode on — long-press the footer to leave.",
      title: "Marketplace Studio", intro: "Review submitted apps and release them — or add your own. One studio password, the server publishes.",
      add_h: "➕ Add a new tool",
      f_name: "Name *", f_desc: "Description *", f_url: "PWA link / address *",
      f_imgurl: "Image URL (https, no SVG)", f_imgpick: "🖼 Pick an image from your device",
      f_cat: "Category", f_tags: "Tags (comma-separated)", f_by: "Provider handle",
      f_mycel: "with Mycel integration",
      f_spore: "Provider spore link (optional, https)",
      ph_spore: "https://…/sbkim/spore.json",
      f_sporeauto: "Description may update itself from the spore overnight",
      sp_h: "🧬 Provider spores",
      sp_intro: "What the nightly check last saw. Without the checkbox a changed description is only reported — you accept it here.",
      sp_none: "No report yet. It appears after the first nightly run.",
      sp_geprueft: "last checked: ",
      sp_take: "Accept description",
      sp_taken: "Accepted — now press Publish.",
      sp_gone: "Entry no longer present.",
      sp_lage_geaendert: "description changed — waiting for you",
      sp_lage_uebernommen: "accepted automatically",
      sp_lage_gleich: "unchanged",
      sp_lage_unerreichbar: "unreachable",
      sp_lage_unbrauchbar: "unusable",
      sp_lage_ohne_spore: "no spore link on file",
      sp_lage_abweichend: "description differs — unchanged since the last check",
      wa_gruen: "target site fine",
      wa_gelb: "target site: please review",
      wa_rot: "on hold — link switched off",
      wa_g_unveraendert: "unchanged",
      wa_g_erste_pruefung: "checked for the first time",
      wa_g_hand_freigegeben: "released by you",
      wa_g_geaendert: "content has changed",
      wa_g_antwortet_nicht: "did not answer once",
      wa_g_nicht_erreichbar: "no answer for several checks",
      wa_g_nicht_pruefbar: "too large to check",
      wa_g_kein_https: "not an https link",
      wa_g_hand_gesperrt: "blocked by you",
      wa_g_hand_verdacht: "marked suspicious by you",
      wa_g_safebrowsing: "flagged by Google Safe Browsing",
      wa_sb_nicht_geprueft: "Safe Browsing: not checked (no key on file)",
      ms_h: "📈 Measurement (Lighthouse)",
      ms_intro: "What the nightly run last measured — four numbers per entry, deliberately WITHOUT an overall grade. An averaged number hides exactly what you want to know. Visitor yes/no votes will sit beside these later, never inside them.",
      ms_none: "No measurement yet. It appears with the next nightly run.",
      ms_leistung: "Performance", ms_bedienbarkeit: "Accessibility",
      ms_gute_praxis: "Best practices", ms_auffindbarkeit: "Findability",
      ms_st_gemessen: "measured", ms_st_veraltet: "stale (last measurement failed)",
      ms_st_nicht_gemessen: "not measured", ms_st_von_hand: "entered by hand",
      wa_gesehen: "✓ Reviewed — site is fine",
      wa_gesehen_ok: "✓ acknowledged — still needs publishing",
      wa_gesehen_datei: "✓ acknowledged — clears with the next nightly run",
      wa_quittiert: "✓ Acknowledged — now press Publish.",
      wa_keine_summe: "No checksum for this entry — nothing to acknowledge.",
      ms_am: "on ",
      ms_g_noch_nicht_dran: "not its turn yet (per-run cap)",
      ms_regler_h: "From which performance value on is an entry listed?",
      ms_regler_aus: "off — nothing is hidden",
      ms_regler_ab: "from ",
      ms_regler_wirkung_0: "No entry drops out.",
      ms_regler_wirkung_1: " entry drops out of the marketplace.",
      ms_regler_wirkung_n: " entries drop out of the marketplace.",
      ms_regler_hint: "Takes effect after publishing. Entries WITHOUT a measurement are never hidden — \"not measured yet\" is not a bad value. Whatever the slider removes stays visible in this list, so nobody disappears silently.",
      ms_raus: "below the threshold — not listed",
      ms_halt: "a more recent measurement was worse — value still held:",
      ph_name: "e.g. My Tool", ph_desc: "What does the tool do? Free text with synonyms — helps search.",
      ph_url: "https://…", ph_imgurl: "https://…/image.png", ph_cat: "e.g. Tool, Game, Office",
      ph_tags: "e.g. notes, offline, pwa", ph_by: "e.g. @extern",
      add_btn: "Add", update_btn: "Apply change", cancel_btn: "Cancel",
      list_h: "Entries", edit: "Edit", del: "Delete", del_confirm: "Really delete this entry?",
      publish: "Publish ✓", publish_close: "Close",
      need_name: "Please fill in name, description and link.",
      need_img: "Please provide an image URL (https, no SVG) or pick an image from your device.",
      bad_img: "Invalid image URL (https only, JPG/PNG/WebP — no SVG).",
      bad_url: "Invalid link (must start with https://).",
      publishing: "Publishing …", published: "Published — live for everyone in ~1 minute.",
      pub_err: "Publishing failed: ", nothing: "Nothing changed.",
      added: "Added (not published yet).", updated: "Changed (not published yet).",
      removed: "Removed (not published yet).", img_local: "Device image — uploaded on publish.",
      dirty_badge: "· unsaved", by_default: "@extern",
      q_h: "📥 Submitted (for review)",
      q_intro: "Apps submitted by visitors — nothing goes live until you click “Publish”.",
      q_key: "Studio password (for the server)", q_remember: "Remember password",
      q_key_hint: "One password for everything: fetch the queue AND publish (the server commits with its token). Stays in this browser only.",
      need_srvkey: "Please enter your studio password first (top, under “Submitted”).",
      q_fetch: "Fetch from server", q_none: "No open submissions.",
      q_noapi: "Server address (FP_MARKT_API) not set yet — see server/README-marktplatz-api.md.",
      q_loading: "Fetching submissions …", q_err: "Server request failed: ",
      q_take: "Take over (edit)", q_approve: "✓ Release", q_checked: "🔵 Checked",
      q_reject: "Discard", q_reject_confirm: "Discard this submission (remove from the list)?",
      q_open: "↗ Open app", q_approveall: "Release all 🔵 checked",
      q_approved: "Released — live in ~1 minute.", q_rejected: "Discarded.",
      q_status_neu: "🟡 New", q_status_geprueft: "🔵 Checked – ready to release", q_status_verdacht: "🔴 Suspicious",
      withdraw: "Withdraw", withdraw_confirm: "Withdraw this entry from the live site (remove via token)?",
      withdrawn: "Withdrawn — gone from the site in ~1 minute.",
      vec_h: "🧠 Build vectors",
      vec_intro: "Computes the meaning vectors of all entries ONCE and stores them as a file. After that no visitor has to compute them — search starts right away.",
      vec_btn: "Build vectors",
      vec_hint: "Rebuild after every change to name, description or tags. Until then the page recomputes the changed entries itself — nothing breaks, it just takes longer.",
      vec_noembed: "Language model unavailable — vectors cannot be built here.",
      vec_noentries: "No entries with an image — nothing to compute.",
      vec_loading: "Loading language model (~30 MB once) …",
      vec_working: "Computing vectors … ",
      vec_committing: "Writing the file …",
      vec_done: "Vectors built: ",
      vec_done2: " entries — live in ~1 minute.",
      vec_err: "Building vectors failed: ",
      vec_fresh: "Fetching the published state …",
      vec_local: "Server unreachable — computing from the local state.",
      vec_dirty: "Press “Publish” first — otherwise the vectors won\u2019t match the entries.",
      vec_stand_h: "State on the server",
      vec_stand_load: "Checking the state on the server \u2026",
      vec_stand_none: "No vector file on the server yet \u2014 search computes everything itself.",
      vec_stand_err: "State not checkable (server unreachable).",
      vec_stand_ok: "Fully covered: ",
      vec_stand_part: "Only partly covered: ",
      vec_stand_of: " of ",
      vec_stand_entries: " entries",
      vec_stand_built: " \u00b7 built on ",
      vec_stand_model: " \u00b7 model ",
      vec_stand_hint: "Uncovered entries are computed on every visit \u2014 rebuilding once fixes that.",
      vec_recheck: "Check state",
      vec_report: "\ud83d\udcc4 Report (PDF)",
      vec_report_h: "Vector report \u2014 family-projekt.de marketplace",
      vec_report_covered: "covered",
      vec_report_missing: "missing \u2014 computed live",
      vec_report_stale: "stale \u2014 text has changed",
      vec_report_none: "No report possible \u2014 check the state first.",
      vec_reuse: " \u00b7 reused unchanged: ",
      vec_nothing: "Nothing to do \u2014 every entry is already covered."
    }
  };
  function lang() { try { return (window.FP && FP.getLang && FP.getLang() === "en") ? "en" : "de"; } catch (e) { return "de"; } }
  function T(k) { return (STR[lang()] || STR.de)[k] || STR.de[k] || k; }

  /* --------------------------------------------------------------- Helfer */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { u = String(u || "").trim(); return /^https?:\/\//i.test(u) ? u : ""; }
  function safeImg(u) { u = String(u || "").trim(); return /^https?:\/\//i.test(u) && !/\.svg(\?|$)/i.test(u) ? u : ""; }
  function slugify(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "tool"; }
  function utf8ToB64(s) { return btoa(unescape(encodeURIComponent(String(s)))); }
  function extFromType(t) { t = String(t || "").toLowerCase(); if (t.indexOf("png") >= 0) return "png"; if (t.indexOf("webp") >= 0) return "webp"; if (t.indexOf("jpeg") >= 0 || t.indexOf("jpg") >= 0) return "jpg"; return "png"; }

  var toastBox = null;
  function toast(msg, ok) {
    if (ok === undefined) ok = true;
    if (!toastBox) { toastBox = document.createElement("div"); toastBox.className = "fpst-toasts"; document.body.appendChild(toastBox); }
    var el = document.createElement("div"); el.className = "fpst-toast"; el.textContent = (ok ? "✓ " : "• ") + msg;
    toastBox.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transform = "translateY(10px)"; setTimeout(function () { el.remove(); }, 300); }, 2600);
  }

  /* --- Commits laufen server-seitig über marktplatz-api.php (Server-Token). --- */
  /* Der Browser hält KEINEN GitHub-Token mehr; siehe publishViaServer(). */

  /* --------------------------------------------------- Arbeits-Liste + Serialisierung */
  var WORK = [];            // Arbeitskopie von window.FP_LISTINGS
  var UPLOADS = {};         // path -> base64 (Geräte-Bilder, beim Veröffentlichen committen)
  var filePrefix = null;    // Kopf der listings.js (Kommentar + Endpunkt), vor „window.FP_LISTINGS"
  var dirty = false;
  var editIdx = -1;         // aktuell bearbeiteter Eintrag (Index in WORK) oder -1 = neu

  var MARKER =
    "  // FP_LISTINGS_INSERT_HERE — freigabe.php fügt freigegebene Einträge hier ein\n" +
    "  // (davor, mit abschließendem Komma). Die Marke NICHT entfernen.\n";

  function loadWork() {
    try { WORK = JSON.parse(JSON.stringify(window.FP_LISTINGS || [])); } catch (e) { WORK = (window.FP_LISTINGS || []).slice(); }
  }
  /* Stufe 5 — der Schieberegler. Ab welchem Leistungswert ein Eintrag im
   * Marktplatz gelistet wird. Er reist in derselben Datei mit, die das Studio
   * ohnehin veröffentlicht (assets/config/listings.js) — dadurch braucht es
   * keinen zweiten Server-Pfad und keine zweite Datei, die jemand von Hand
   * hochladen muss.
   *
   * Deshalb muss capturePrefix den Kopf VOR dieser Zeile abschneiden: sonst
   * wanderte sie beim nächsten Veröffentlichen in den erhaltenen Kopf und
   * stünde zweimal in der Datei. */
  var MIN_MARKE = "window.FP_MARKT_MIN_LEISTUNG";
  var MIN_LEISTUNG = 0;
  function klemmeMin(n) { n = Math.round(Number(n) || 0); return n < 0 ? 0 : (n > 100 ? 100 : n); }

  /* Der Kopf und der Regler-Wert aus einer vorhandenen listings.js. Eigene
   * Funktion, damit der Rundlauf (schreiben -> wieder einlesen -> schreiben)
   * prüfbar ist: genau dort läge die Falle, dass die Regler-Zeile mit in den
   * erhaltenen Kopf wandert und bei jedem Veröffentlichen einmal mehr in der
   * Datei stünde. */
  function kopfUndMin(txt) {
    if (!txt) return { prefix: null, min: 0 };
    var m = /window\.FP_MARKT_MIN_LEISTUNG\s*=\s*(\d+)/.exec(txt);
    var i = txt.indexOf(MIN_MARKE);
    var j = txt.indexOf("window.FP_LISTINGS");
    var k = (i >= 0 && (j < 0 || i < j)) ? i : j;
    return { prefix: k > 0 ? txt.slice(0, k) : null, min: m ? klemmeMin(m[1]) : 0 };
  }

  // Kopf der Datei erhalten (Kommentar + Endpunkt). Fail-soft rekonstruieren, falls kein Netz.
  function capturePrefix() {
    return fetch("assets/config/listings.js?ts=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) {
        var r = kopfUndMin(txt);
        filePrefix = r.prefix;
        MIN_LEISTUNG = r.min;
      }).catch(function () { filePrefix = null; });
  }
  function fallbackPrefix() {
    var ep = "", api = "";
    try { ep = window.FP_MARKT_SUBMIT_ENDPOINT || ""; } catch (e) {}
    try { api = window.FP_MARKT_API || ""; } catch (e) {}
    return "/* Marktplatz-Einträge (Apps/Seiten) = zugleich Such-Korpus. */\n" +
      "window.FP_MARKT_SUBMIT_ENDPOINT = " + JSON.stringify(ep) + ";\n" +
      "window.FP_MARKT_API = " + JSON.stringify(api) + ";\n\n";
  }
  // Eintrag in stabiler Feld-Reihenfolge, nur gesetzte Felder.
  function normEntry(e) {
    var o = {};
    o.label = String(e.label || "").trim();
    o.anchorId = e.anchorId || ("markt-" + slugify(o.label));
    o.text = String(e.text || "").trim();
    if (e.by) o.by = String(e.by).trim();
    o.url = String(e.url || "").trim();
    o.img = String(e.img || "").trim();
    if (e.category) o.category = String(e.category).trim();
    if (Array.isArray(e.tags) && e.tags.length) o.tags = e.tags.slice();
    if (e.mycel === true) o.mycel = true;
    if (e.own === true) o.own = true;
    // Stufe 2: Spore-Link des Anbieters + die ausdrückliche Erlaubnis, dass
    // seine Beschreibung sich nachts selbst aktualisieren darf. Ohne Haken
    // meldet die nächtliche Aktion eine Änderung nur (Klaus 2026-08-02).
    if (e.sporeUrl) o.sporeUrl = String(e.sporeUrl).trim();
    if (e.sporeAuto === true) o.sporeAuto = true;
    return o;
  }
  function serialize() {
    var head = filePrefix != null ? filePrefix : fallbackPrefix();
    var items = WORK.map(function (e) {
      return JSON.stringify(normEntry(e), null, 2).split("\n").map(function (l) { return "  " + l; }).join("\n");
    }).join(",\n");
    return head + MIN_MARKE + " = " + klemmeMin(MIN_LEISTUNG) + ";\n\n" +
      "window.FP_LISTINGS = [\n" + (items ? items + ",\n" : "") + MARKER + "];\n";
  }

  /* --------------------------------------------------------------- Studio-Zugang */
  function isStudio() { return document.body.classList.contains("fpstudio"); }
  function enterStudio() { try { localStorage.setItem(LS.studio, "1"); } catch (e) {} document.body.classList.add("fpstudio"); openPanel(); toast(T("studio_on")); }
  function exitStudio() { try { localStorage.setItem(LS.studio, "0"); } catch (e) {} document.body.classList.remove("fpstudio"); closePanel(); }
  function wireAccess() {
    var trig = null, wraps = document.querySelectorAll("footer .wrap");
    for (var i = 0; i < wraps.length; i++) { if (/©/.test(wraps[i].textContent || "")) { trig = wraps[i]; break; } }
    if (!trig) trig = wraps[wraps.length - 1] || document.querySelector("footer");
    if (!trig) return;
    trig.style.cursor = "default";
    var timer = null, sx = 0, sy = 0;
    var clear = function () { if (timer) { clearTimeout(timer); timer = null; } };
    trig.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; clear(); timer = setTimeout(function () { timer = null; isStudio() ? exitStudio() : enterStudio(); }, 1500); });
    trig.addEventListener("pointermove", function (e) { if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) clear(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { trig.addEventListener(ev, clear); });
  }

  /* --------------------------------------------------------------- UI */
  var panel = null, fileInput = null;
  function ensureFileInput() {
    if (fileInput) return fileInput;
    fileInput = document.createElement("input"); fileInput.type = "file"; fileInput.accept = "image/png,image/jpeg,image/webp";
    fileInput.style.position = "fixed"; fileInput.style.left = "-9999px"; fileInput.setAttribute("aria-hidden", "true");
    document.body.appendChild(fileInput);
    return fileInput;
  }
  function fieldVals() {
    return {
      label: panel.querySelector("[data-f=label]").value,
      text: panel.querySelector("[data-f=desc]").value,
      url: panel.querySelector("[data-f=url]").value,
      imgUrl: panel.querySelector("[data-f=imgurl]").value,
      category: panel.querySelector("[data-f=cat]").value,
      tags: panel.querySelector("[data-f=tags]").value,
      by: panel.querySelector("[data-f=by]").value,
      mycel: panel.querySelector("[data-f=mycel]").checked,
      sporeUrl: panel.querySelector("[data-f=spore]").value,
      sporeAuto: panel.querySelector("[data-f=sporeauto]").checked
    };
  }
  function clearForm() {
    editIdx = -1; _pendingImg = null;
    ["label", "desc", "url", "imgurl", "cat", "tags", "by", "spore"].forEach(function (f) { var el = panel.querySelector("[data-f=" + f + "]"); if (el) el.value = ""; });
    var m = panel.querySelector("[data-f=mycel]"); if (m) m.checked = false;
    var sa = panel.querySelector("[data-f=sporeauto]"); if (sa) sa.checked = false;
    setImgPreview("");
    panel.querySelector("[data-role=addbtn]").textContent = T("add_btn");
    panel.querySelector("[data-role=cancel]").style.display = "none";
  }
  var _pendingImg = null; // {base64, ext} vom Gerät
  function setImgPreview(src) {
    var box = panel.querySelector("[data-role=imgprev]");
    if (!box) return;
    box.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : "";
  }
  function tagsToArr(s) { return String(s || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); }
  function buildText(desc, tags, mycel) {
    var extra = [];
    if (tags && tags.length) extra.push(tags.join(" "));
    if (mycel) extra.push("mycel netzwerk sbkim verbunden");
    return (String(desc || "").trim() + (extra.length ? " " + extra.join(" ") : "")).trim();
  }

  function saveEntry() {
    var v = fieldVals();
    if (!v.label.trim() || !v.text.trim() || !v.url.trim()) { toast(T("need_name"), false); return; }
    if (!safeUrl(v.url)) { toast(T("bad_url"), false); return; }
    var img = "";
    if (_pendingImg) {
      var slug = slugify(v.label);
      var path = "assets/apps/" + slug + "-" + (WORK.length + 1) + "." + _pendingImg.ext;
      UPLOADS[path] = _pendingImg.base64;
      img = IMG_BASE + slug + "-" + (WORK.length + 1) + "." + _pendingImg.ext;
    } else {
      img = safeImg(v.imgUrl);
      if (!img) { toast(v.imgUrl ? T("bad_img") : T("need_img"), false); return; }
    }
    var tags = tagsToArr(v.tags);
    var entry = {
      label: v.label.trim(),
      text: buildText(v.text, tags, v.mycel),
      by: (v.by.trim() || T("by_default")),
      url: v.url.trim(),
      img: img,
      category: v.category.trim(),
      tags: tags,
      mycel: !!v.mycel
    };
    if (editIdx >= 0 && WORK[editIdx]) {
      entry.anchorId = WORK[editIdx].anchorId;      // ID stabil halten
      if (WORK[editIdx].own) entry.own = true;
      WORK[editIdx] = entry; toast(T("updated"));
    } else {
      entry.anchorId = "markt-" + slugify(v.label) + "-" + (WORK.length + 1);
      WORK.push(entry); toast(T("added"));
    }
    dirty = true;
    window.FP_LISTINGS = WORK;
    if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    clearForm(); renderList(); markDirty();
  }
  function editEntry(idx) {
    var e = WORK[idx]; if (!e) return;
    editIdx = idx; _pendingImg = null;
    panel.querySelector("[data-f=label]").value = e.label || "";
    panel.querySelector("[data-f=desc]").value = e.text || "";
    panel.querySelector("[data-f=url]").value = e.url || "";
    panel.querySelector("[data-f=imgurl]").value = /^https?:/i.test(e.img || "") ? e.img : "";
    panel.querySelector("[data-f=cat]").value = e.category || "";
    panel.querySelector("[data-f=tags]").value = (e.tags || []).join(", ");
    panel.querySelector("[data-f=by]").value = e.by || "";
    panel.querySelector("[data-f=mycel]").checked = !!e.mycel;
    panel.querySelector("[data-f=spore]").value = e.sporeUrl || "";
    panel.querySelector("[data-f=sporeauto]").checked = e.sporeAuto === true;
    setImgPreview(safeImg(e.img));
    panel.querySelector("[data-role=addbtn]").textContent = T("update_btn");
    panel.querySelector("[data-role=cancel]").style.display = "";
    panel.querySelector("[data-role=form]").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function delEntry(idx) {
    if (!WORK[idx]) return;
    if (!window.confirm(T("del_confirm"))) return;
    WORK.splice(idx, 1); dirty = true;
    window.FP_LISTINGS = WORK;
    if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    if (editIdx === idx) clearForm();
    renderList();
    // Sofort server-seitig festschreiben, wenn ein Studio-Passwort vorliegt —
    // sonst kaeme der Eintrag beim naechsten Laden aus der Live-Liste zurueck
    // ("Loeschen ohne Wirkung"). Ohne Passwort: nur lokal + Hinweis.
    if (srvKeyVal()) {
      toast(T("publishing"));
      publishViaServer()
        .then(function () { markDirty(); toast(T("withdrawn")); })
        .catch(function (err) { markDirty(); toast(T("pub_err") + (err && err.message ? err.message : err), false); });
    } else {
      markDirty(); toast(T("removed"));
    }
  }
  function renderList() {
    var box = panel.querySelector("[data-role=list]"); if (!box) return;
    box.innerHTML = WORK.map(function (e, i) {
      return '<div class="fpst-item">' +
        '<img src="' + esc(safeImg(e.img) || "") + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="fpst-item__b"><b>' + esc(e.label) + '</b>' + (e.own ? ' <span class="fpst-own">eigen</span>' : "") +
        (e.mycel ? ' <span class="fpst-myc">🧬</span>' : "") +
        '<small>' + esc((e.text || "").slice(0, 90)) + '</small></div>' +
        '<div class="fpst-item__a"><button data-edit="' + i + '">' + esc(T("edit")) + '</button>' +
        '<button data-del="' + i + '" class="fpst-danger">' + esc(T("del")) + '</button></div>' +
        '</div>';
    }).join("");
  }
  function markDirty() {
    var b = panel && panel.querySelector("[data-role=dirty]");
    // wacheDirty zaehlt mit: sonst stuende der Knopf auf "nichts zu tun",
    // waehrend eine Quittung unveroeffentlicht in der Arbeitskopie haengt.
    if (b) b.textContent = (dirty || wacheDirty) ? T("dirty_badge") : "";
  }

  // Ein Studio-Passwort (studio_key) ist die einzige Zugangsdaten — der Server
  // committet mit SEINEM GitHub-Token. Kein GitHub-Token mehr im Browser.
  function publishViaServer() {
    var key = srvKeyVal();
    if (!key) return Promise.reject(new Error(T("need_srvkey")));
    setSrvKey(key, true);
    var imgPaths = Object.keys(UPLOADS);
    var chain = Promise.resolve();
    imgPaths.forEach(function (p) {
      chain = chain.then(function () {
        return apiPost("commit_image", { path: p, base64: UPLOADS[p] }).then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "Bild"); });
      });
    });
    /* Eintraege nur schicken, wenn wirklich welche geaendert wurden. Bisher
     * ging der Commit immer raus - das war folgenlos, weil publish() ohnehin
     * nur bei dirty/Bildern erreichbar war. Mit der Quittung gaebe es sonst
     * einen Eintraege-Commit mit identischem Inhalt. */
    if (dirty || imgPaths.length) {
      chain = chain.then(function () { return apiPost("commit_listings", { content: serialize() }); })
        .then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "commit_listings"); UPLOADS = {}; dirty = false; });
    }
    if (wacheDirty) {
      chain = chain.then(function () { return apiPost("commit_wache", { content: JSON.stringify(WACHEHAND, null, 2) + "\n" }); })
        .then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "commit_wache"); wacheDirty = false; });
    }
    return chain.then(function () { markDirty(); return true; });
  }
  function publish() {
    if (!API) { toast(T("q_noapi"), false); return; }
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); var se = panel.querySelector("[data-f=srvkey]"); if (se) se.focus(); return; }
    if (!dirty && !wacheDirty && !Object.keys(UPLOADS).length) { toast(T("nothing")); return; }
    var btn = panel.querySelector("[data-role=publish]");
    if (btn) { btn.disabled = true; btn.textContent = T("publishing"); }
    publishViaServer()
      .then(function () { if (btn) { btn.disabled = false; btn.textContent = T("publish"); } toast(T("published")); })
      .catch(function (err) { if (btn) { btn.disabled = false; btn.textContent = T("publish"); } toast(T("pub_err") + (err && err.message ? err.message : err), false); });
  }

  /* ------------------------------------------- Vektoren bauen (Katalog-Spore Stufe 1)
   *
   * Gegenstück zur Leseseite in markt.html (§ „Vorberechnete Vektoren"). Dort
   * wird das Paket gelesen; hier entsteht es. Vier Punkte, an denen die beiden
   * Seiten zusammenpassen MÜSSEN — weicht einer ab, ist das Paket still
   * wertlos (die Seite rechnet dann klaglos alles selbst nach, man merkt es
   * nur an der Zeit):
   *
   *   1. Der Text je Eintrag ist `x.text || x.label` — exakt dieselbe Regel.
   *      Aus ihm entsteht der Vektor UND der Hash; jede Abweichung lässt jeden
   *      Hash-Vergleich scheitern.
   *   2. `model` und `dim` kommen aus SbkimEmbedding._meta, nicht aus einer
   *      Konstante hier. Wechselt das Modell, verwirft die Leseseite das ganze
   *      Paket — das geht nur, wenn hier die WAHRE Kennung eingetragen wird.
   *      Der Feldname ist `_meta`, nicht `info()`.
   *   3. Gepackt wird mit FPVecCodec (assets/vec-codec.js) — dieselbe Datei,
   *      die die Leseseite lädt. Kein Nachbau.
   *   4. Aufgenommen wird JEDER Eintrag mit anchorId und Text, auch einer ohne
   *      gültiges Bild. Die Leseseite zeigt nur Einträge MIT Bild und schlägt
   *      pro anchorId nach; überzählige Einträge im Paket kosten ~550 Bytes und
   *      stören nicht, ein fehlender kostet eine Live-Berechnung. Also lieber
   *      zu viel als zu wenig — so kann eine abweichende Bild-Regel zwischen
   *      den beiden Dateien nie zu einer Lücke führen.
   *
   * Niemals ein halbes Paket schreiben: erst wird alles gerechnet, und nur bei
   * vollständigem Erfolg geht der Commit raus. Bricht etwas ab, bleibt die alte
   * Datei stehen — schlimmster Fall ist damit der heutige Zustand.
   */
  /* Die Eintraege IMMER frisch vom Server holen, nie aus window.FP_LISTINGS.
   *
   * Befund 2026-08-01, gemessen und belegt: Klaus' erster Lauf baute 14 saubere
   * Vektoren — von denen die Leseseite nur 4 nutzen konnte. Die Hashes passten
   * 14/14 zur listings.js vom 26.07. und 4/14 zur aktuellen. Grund: der Browser
   * hielt eine alte `assets/config/listings.js` fest, waehrend die Seite live
   * die neuen Texte vom 31.07. zeigte (PR #135 hat sie umformuliert). Der Knopf
   * rechnete brav ueber die alten Texte.
   *
   * (Zur Ursache: Caddy setzte fuer diese Datei GAR KEINEN Cache-Header, also
   * riet der Browser selbst — etwa ein Zehntel des Datei-Alters. Seit dem
   * 2026-08-01 steht am Server eine ausdrueckliche Regel: /assets/config/* mit
   * 300 s. Die erste Fassung dieses Kommentars sprach von „sieben Tagen" und
   * berief sich auf Caddyfile.example — eine Vorlage, die dem Server nie
   * entsprach.)
   *
   * Das ist die tueckischste Sorte Fehler: nichts stuerzte ab, die Meldung sagte
   * „14 Eintraege", der Hash-Waechter der Leseseite verwarf die falschen still
   * und rechnete nach. Alles funktionierte — es brachte nur nichts.
   *
   * `capturePrefix` holt die Datei ohnehin schon mit cache:"no-store". Genau
   * diese frische Fassung ist der richtige Bezugspunkt: die Vektoren gehoeren
   * zum VEROEFFENTLICHTEN Stand, nicht zu dem, was zufaellig im Cache liegt.
   * Fail-soft: geht der Abruf schief, wird mit WORK gerechnet und gesagt, dass
   * es der lokale Stand ist. */
  function frischeListings() {
    return fetch("assets/config/listings.js?ts=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) {
        if (!txt) return null;
        var sand = {};
        // Eigener Code vom eigenen Server — dieselbe Datei, die die Seite ohnehin
        // als <script> laedt. Die Sandbox haelt sie nur von window fern.
        new Function("window", txt)(sand);
        return Array.isArray(sand.FP_LISTINGS) ? sand.FP_LISTINGS : null;
      })
      .catch(function () { return null; });
  }
  function vecEntries(liste) {
    var quelle = liste || WORK;
    var out = [];
    for (var i = 0; i < quelle.length; i++) {
      var x = quelle[i];
      if (!x || !x.anchorId) continue;
      var text = x.text || x.label;
      if (!text) continue;
      out.push({ id: x.anchorId, text: String(text) });
    }
    return out;
  }
  /* Fortschritt zeigen — Text UND Balken.
   *
   * Klaus' Befund 2026-08-01: „Das Sprachmodell hat wieder keinen Ladebalken
   * und ich sehe nicht, wie weit es ist oder ob gerade etwas hakt." Genau so
   * war es: hier stand nur ein starrer Satz. Der Modell-Download sind ~30 MB,
   * das dauert spürbar, und ohne Balken ist „lädt" von „hängt" nicht zu
   * unterscheiden. Die Suchseite (markt.html, renderBar) macht es richtig —
   * dasselbe jetzt auch hier.
   *
   * pct === null heißt „läuft, Länge unbekannt" und zeigt einen wandernden
   * Balken; das ist ehrlicher als ein Balken, der bei 0 % steht. */
  /* Der Stand auf dem SERVER — die eigentliche Antwort auf „ist das aktualisiert?"
   *
   * Klaus' Befund 2026-08-01: „Ich sehe noch keine Bestätigung, dass das
   * aktualisiert wurde." Er hatte recht, gleich doppelt. Erstens verschwand die
   * Erfolgsmeldung nach 2,6 s als Toast und der Status-Bereich wurde geleert.
   * Zweitens — und das wiegt schwerer — hätte selbst eine bleibende Meldung nur
   * gesagt „ich habe etwas geschickt", nicht „es ist angekommen und es passt".
   * Genau daran war der erste Lauf gescheitert: 14 gebaut, 4 brauchbar.
   *
   * Deshalb wird hier nicht gemerkt, sondern GEMESSEN: die veröffentlichte
   * Vektor-Datei und die veröffentlichten Einträge werden beide frisch geholt
   * und gegeneinander gerechnet — dieselbe Prüfung, die die Leseseite in
   * markt.html macht (Hash über `x.text || x.label`, decode über `dim`). Was
   * dabei herauskommt, ist der wahre Zustand, kein Protokoll einer Absicht. */
  var STAND = null;   // letzter Prüf-Befund, auch fürs Berichts-Fenster
  function vecPruefe() {
    var codec = window.FPVecCodec;
    return Promise.all([
      fetch("assets/config/listings-vec.json?ts=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      frischeListings()
    ]).then(function (beide) {
      var pack = beide[0], liste = beide[1] || WORK;
      if (!liste || !liste.length) return { fehler: true };
      var eintraege = liste.filter(function (x) { return x && x.anchorId && safeImg(x.img); });
      if (!pack || !pack.vectors) return { keinPaket: true, gesamt: eintraege.length };
      var zeilen = [], abgedeckt = 0;
      for (var i = 0; i < eintraege.length; i++) {
        var x = eintraege[i], text = x.text || x.label;
        var rec = pack.vectors[x.anchorId];
        var lage = "missing";
        if (rec) {
          var hashOk = !rec.h || (codec && rec.h === codec.textHash(text));
          var v = hashOk && codec ? codec.decode(rec, pack.dim || 384) : null;
          lage = v ? "ok" : "stale";
        }
        if (lage === "ok") abgedeckt++;
        zeilen.push({ label: x.label, id: x.anchorId, lage: lage });
      }
      return { gebaut: pack.built || "?", model: pack.model || "?", dim: pack.dim || 0,
               abgedeckt: abgedeckt, gesamt: eintraege.length, zeilen: zeilen };
    });
  }
  function renderStand(st) {
    STAND = st || null;
    var box = panel && panel.querySelector("[data-role=vecstand]");
    if (!box) return;
    if (!st) { box.textContent = T("vec_stand_load"); box.className = "fpst-vecstand"; return; }
    if (st.fehler) { box.textContent = T("vec_stand_err"); box.className = "fpst-vecstand is-err"; return; }
    if (st.keinPaket) { box.textContent = T("vec_stand_none"); box.className = "fpst-vecstand is-err"; return; }
    var voll = st.abgedeckt === st.gesamt && st.gesamt > 0;
    box.className = "fpst-vecstand " + (voll ? "is-ok" : "is-warn");
    // textContent: die Werte kommen aus einer Server-Datei, nie als HTML einsetzen.
    var t1 = document.createElement("b");
    t1.textContent = (voll ? T("vec_stand_ok") : T("vec_stand_part")) +
      st.abgedeckt + T("vec_stand_of") + st.gesamt + T("vec_stand_entries");
    var t2 = document.createElement("span");
    t2.textContent = T("vec_stand_built") + st.gebaut + T("vec_stand_model") + st.model;
    box.innerHTML = "";
    box.appendChild(t1); box.appendChild(t2);
    if (!voll) {
      var t3 = document.createElement("small");
      t3.textContent = T("vec_stand_hint");
      box.appendChild(t3);
    }
  }
  function standLaden() {
    renderStand(null);
    return vecPruefe().then(renderStand).catch(function () { renderStand({ fehler: true }); });
  }

  /* ── Sporen-Bericht (Stufe 2) ───────────────────────────────────────────────
   * assets/config/spore-stand.json schreibt die nächtliche Aktion. Sie liest
   * die Spore jedes Anbieters und meldet, was sie gesehen hat. Hat sich eine
   * Beschreibung geändert, OHNE dass der Eintrag den Haken „darf sich selbst
   * aktualisieren" trägt, wird sie NICHT übernommen — sie steht hier, und
   * Klaus entscheidet mit einem Knopf. Das ist der ganze Sinn der Trennung:
   * fremder Text kommt nicht ungefragt auf die Seite.
   *
   * Alles aus dieser Datei ist fremder Text und wird ausschließlich über
   * textContent gesetzt, nie als HTML. */
  var SPORENSTAND = null;
  /* Getrennt vom Sporen-Stand: die Messwerte MIT daraufgelegten Hand-Werten.
   * Bewusst eine eigene Struktur — in die Sporen-Liste gehoert ein Eintrag, der
   * nur einen Hand-Messwert hat, gerade NICHT hinein (er haette dort weder Lage
   * noch Ampel und stuende faelschlich als „unbrauchbar" da). */
  var MESSSTAND = null;
  /* Arbeitskopie von assets/config/wache-hand.json. `wacheDirty` ist bewusst
   * getrennt von `dirty`: eine Quittung ist keine Änderung an den Einträgen,
   * und sie soll keinen Einträge-Commit auslösen, wenn sonst nichts anliegt. */
  var WACHEHAND = {};
  /* Der Stand, wie er in der Datei steht. Nur so laesst sich sagen, ob ein Haken
   * schon veroeffentlicht ist oder noch auf den Knopf wartet — sonst stuende an
   * einem laengst gespeicherten Haken weiter "noch veroeffentlichen". */
  var WACHEHAND_DATEI = {};
  var wacheDirty = false;
  var LAGE_TEXT = { geaendert: "sp_lage_geaendert", uebernommen: "sp_lage_uebernommen",
                    gleich: "sp_lage_gleich", unerreichbar: "sp_lage_unerreichbar",
                    unbrauchbar: "sp_lage_unbrauchbar", uebersprungen: "sp_lage_gleich",
                    abweichend: "sp_lage_abweichend",
                    ohne_spore: "sp_lage_ohne_spore" };

  /* ── Wächter-Ampel (Stufe 3) ───────────────────────────────────────────────
   * Der Wächter schreibt in denselben Bericht. GESPERRT und FREIGEGEBEN
   * (rot/grün) wird weiterhin nur über assets/config/wache-hand.json von Hand —
   * eine Sperre soll eine nachlesbare Datei sein und nicht ein Klick, den
   * später niemand mehr erklären kann.
   *
   * SEIT 2026-08-03 gibt es EINE Ausnahme: das gelbe „Inhalt hat sich geändert"
   * lässt sich hier quittieren. Grund (Klaus' Befund): diese Warnung steht
   * ÖFFENTLICH auf der Karte, sie verschwindet NIE von selbst — und es gab
   * keinen Weg, sie ohne Datei-Bearbeitung loszuwerden. Klaus hat vier Seiten
   * selbst geändert (Jason-Datei, neue Internetseite, neuer Text) und klickte
   * ratlos auf „Beschreibung übernehmen", was gegen eine ganz andere Meldung
   * hilft. Eine Warnung, die der Betreiber nicht abstellen kann, erzieht ihn
   * dazu, alle Warnungen zu übersehen.
   *
   * Die Trennung bleibt gewahrt: quittieren heißt „ich habe hingesehen, die
   * Seite ist in Ordnung" — es setzt `gesehen` auf die aktuelle Prüfsumme, NIE
   * eine Ampel. Ändert sich die Seite erneut, wird sie wieder gelb. Rot und
   * Grün bleiben Handarbeit, und das Ergebnis landet in derselben nachlesbaren
   * Datei wie vorher, nur eben über einen Knopf.
   * `handgrund` ist Klaus' eigener Text, wird aber wie jeder andere über
   * textContent gesetzt — eine Regel, die keine Ausnahme verträgt. */
  var AMPEL_ZEICHEN = { gruen: "●", gelb: "▲", rot: "⛔" };
  function ampelZeile(w) {
    var s = document.createElement("span");
    s.className = "fpst-ampel is-" + (w.ampel || "gruen");
    // Unbekannter Grund (neuere Werkzeug-Fassung, ältere Seite): den rohen
    // Schlüssel zeigen statt ihn zu verschlucken. Lieber unschön als still.
    var gk = "wa_g_" + String(w.grund || "");
    var g = (STR[lang()] || STR.de)[gk] || STR.de[gk] || String(w.grund || "?");
    var t = (AMPEL_ZEICHEN[w.ampel] || "●") + " " + T("wa_" + (w.ampel || "gruen")) + " · " + g;
    if (w.handgrund) t += " — " + w.handgrund;
    if (w.seit) t += " (" + w.seit + ")";
    if (w.safebrowsing === "nicht_geprueft") t += " · " + T("wa_sb_nicht_geprueft");
    s.textContent = t;
    return s;
  }
  function rang(e) {
    var w = e && e.wache;
    if (w && w.ampel === "rot") return 0;
    if (e && e.lage === "geaendert") return 1;
    if (w && w.ampel === "gelb") return 2;
    return 3;
  }

  /* ── Hand-Werte auch hier einblenden (Befund 2026-08-03) ───────────────────
   * `markt.html` legt seit dem 2026-08-02 die von Hand eingetragenen Werte aus
   * assets/config/messung-hand.json ueber die naechtliche Messung. Das Studio
   * tat das NICHT — es las nur spore-stand.json. Folge: Klaus sah auf der Karte
   * den frischen Wert und im Studio daneben noch den alten (Tomys Hub: 94 gegen
   * 46). Nicht falsch gerechnet, nur eine Quelle zu wenig gelesen.
   *
   * Dieselben zwei Regeln wie drueben, damit beide Seiten dasselbe zeigen:
   * die eigene Messung gewinnt nur, wenn sie DIESELBE Adresse gemessen hat UND
   * nicht aelter ist als die Ablesung. Der Hand-Wert verschwindet damit von
   * allein, sobald der naechtliche Lauf nachzieht — aufraeumen muss niemand. */
  function msGleicheAdresse(a, b) {
    // Ohne Adresse auf einer Seite laesst sich nichts vergleichen → als „passt"
    // werten, damit sich das Verhalten von frueher nicht aendert.
    if (!a || !b) return true;
    var norm = function (u) { return String(u).replace(/\/+$/, "").toLowerCase(); };
    return norm(a) === norm(b);
  }
  function messStandBauen(st, hand) {
    var out = { eintraege: {} };
    var e = (st && st.eintraege) || {};
    for (var k in e) if (e[k] && e[k].messung) out.eintraege[k] = { messung: e[k].messung };
    if (!hand || typeof hand !== "object") return out;
    for (var id in hand) {
      if (id.charAt(0) === "_") continue;            // _hinweis ueberspringen
      var h = hand[id];
      if (!h || typeof h !== "object" || !msZahlen(h)) continue;
      var da = out.eintraege[id] && out.eintraege[id].messung;
      var eintrag = findeEintrag(id);
      // Hat der Eintrag ein Schaufenster, ist `appUrl` das Mess-Ziel — genau
      // die Adresse, die auch tools/messung.mjs misst.
      var ziel = h.url || (eintrag && (eintrag.appUrl || eintrag.url)) || "";
      if (msZahlen(da) && msGleicheAdresse(da.url, ziel)
          && String(da.gemessen || "") >= String(h.gemessen || "")) continue;
      var m = { stand: "von_hand", gemessen: String(h.gemessen || ""), url: ziel };
      for (var i = 0; i < MS_KAT.length; i++) m[MS_KAT[i]] = h[MS_KAT[i]];
      out.eintraege[id] = { messung: m };
    }
    return out;
  }

  function sporenLaden() {
    var box = panel && panel.querySelector("[data-role=sporen]");
    if (!box) return Promise.resolve();
    var hol = function (datei) {
      return fetch("assets/config/" + datei + "?ts=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    };
    return Promise.all([hol("spore-stand.json"), hol("messung-hand.json"), hol("wache-hand.json")])
      .then(function (alle) {
        var st = alle[0], hand = alle[1], wh = alle[2];
        SPORENSTAND = st;                        // Sporen-Liste bleibt unberuehrt
        MESSSTAND = messStandBauen(st, hand);    // Messwerte mit Hand-Werten
        /* Nur neu laden, solange nichts Unveroeffentlichtes offen ist — sonst
         * wuerfe ein Neu-Aufbau der Liste Klaus' Quittungen weg. */
        if (!wacheDirty) {
          WACHEHAND = (wh && typeof wh === "object") ? wh : {};
          WACHEHAND_DATEI = JSON.parse(JSON.stringify(WACHEHAND));
        }
        renderSporen(st); renderMessung(MESSSTAND); reglerAnzeigen();
      });
  }

  function renderSporen(st) {
    var box = panel && panel.querySelector("[data-role=sporen]");
    if (!box) return;
    box.innerHTML = "";
    if (!st || !st.eintraege || !Object.keys(st.eintraege).length) {
      box.textContent = T("sp_none");
      return;
    }
    var kopf = document.createElement("small");
    kopf.textContent = T("sp_geprueft") + String(st.geprueft || "?").slice(0, 10);
    box.appendChild(kopf);
    // Dringlichkeit zuerst: erst was gesperrt ist, dann was angesehen werden
    // will, dann der Rest. Wer den Block öffnet, soll oben sehen, was ihn
    // etwas angeht.
    var ids = Object.keys(st.eintraege).sort(function (a, b) {
      return rang(st.eintraege[a]) - rang(st.eintraege[b]);
    });
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], e = st.eintraege[id] || {};
      var w = e.wache || null;
      var zeile = document.createElement("div");
      zeile.className = "fpst-sporezeile"
        + (w && w.ampel === "rot" ? " is-stop" : "")
        // `abweichend` faerbt NICHT warm: eine Abweichung, die schon gestern
        // bestand, ist kein Fund. Genau das hat Klaus am 2026-08-01 gestoert —
        // jede Nacht dasselbe Ausrufezeichen, ohne dass jemand etwas geaendert
        // hatte.
        + ((e.lage === "geaendert" || (w && w.ampel === "gelb")) ? " is-warn" : "");
      var name = document.createElement("b");
      var eintrag = findeEintrag(id);
      name.textContent = (eintrag && eintrag.label) || id;
      zeile.appendChild(name);
      if (w) zeile.appendChild(ampelZeile(w));

      /* Quittier-Knopf NUR beim gelben „geaendert" und nur, wenn eine
       * Prüfsumme vorliegt — ohne sie gäbe es nichts zu quittieren. Für
       * „antwortet_nicht", „kein_https" oder eine Hand-Sperre erscheint er
       * bewusst nicht: die verlangen eine echte Entscheidung, keinen Haken. */
      if (w && w.ampel === "gelb" && w.grund === "geaendert" && w.pruefsumme) {
        var quittiert = !!(WACHEHAND[id] && WACHEHAND[id].gesehen === w.pruefsumme);
        var inDatei = !!(WACHEHAND_DATEI[id] && WACHEHAND_DATEI[id].gesehen === w.pruefsumme);
        var gb = document.createElement("button");
        gb.type = "button"; gb.className = "fpst-btn";
        // drei Zustaende: offen · quittiert und wartet aufs Veroeffentlichen ·
        // laengst in der Datei (dann steht die Warnung nur noch da, weil der
        // naechtliche Lauf sie noch nicht neu gerechnet hat).
        gb.textContent = !quittiert ? T("wa_gesehen")
                       : (inDatei ? T("wa_gesehen_datei") : T("wa_gesehen_ok"));
        gb.disabled = quittiert;
        gb.setAttribute("data-wagesehen", id);
        zeile.appendChild(gb);
      }
      var lage = document.createElement("span");
      lage.textContent = T(LAGE_TEXT[e.lage] || "sp_lage_unbrauchbar") + (e.hinweis ? " (" + e.hinweis + ")" : "");
      zeile.appendChild(lage);
      // Der Text steht auch bei `abweichend` zum Uebernehmen bereit — Klaus soll
      // ihn jederzeit holen koennen, nur eben ohne dass ihn jemand darum bittet.
      if ((e.lage === "geaendert" || e.lage === "abweichend") && e.neuerText) {
        var vor = document.createElement("small");
        vor.textContent = e.neuerText;          // fremder Text — nie als HTML
        zeile.appendChild(vor);
        var b = document.createElement("button");
        b.type = "button"; b.className = "fpst-btn";
        b.textContent = T("sp_take");
        b.setAttribute("data-sptake", id);
        zeile.appendChild(b);
      }
      box.appendChild(zeile);
    }
  }

  /* ── Messung (Stufe 5) ─────────────────────────────────────────────────────
   * Die volle Tabelle. Der Marktplatz zeigt je Karte eine kurze Zeile mit
   * Aufklapper; hier steht alles nebeneinander, damit Klaus in einem Blick
   * sieht, wo es hakt und was der Regler wegnehmen würde.
   *
   * KEINE Gesamtnote, an keiner Stelle. Und ausdrücklich keine Verrechnung mit
   * Menschenmeinung: Ja/Nein-Stimmen bekommen später eine eigene Spalte, nie
   * einen Anteil an diesen Zahlen (Klaus' Vorgabe, nicht verhandelbar).
   *
   * Alles aus spore-stand.json ist maschinell geschriebener Text und wird über
   * textContent gesetzt, nie als HTML. */
  var MS_KAT = ["leistung", "bedienbarkeit", "gute_praxis", "auffindbarkeit"];
  function msZahlen(m) { return !!m && MS_KAT.every(function (k) { return typeof m[k] === "number"; }); }
  function msStufe(n) { return n >= 90 ? "gut" : (n >= 50 ? "mittel" : "schwach"); }
  function msRaus(m) { return MIN_LEISTUNG > 0 && msZahlen(m) && m.leistung < MIN_LEISTUNG; }

  function msZaehleRaus(st) {
    var n = 0, e = (st && st.eintraege) || {};
    for (var k in e) if (e[k] && msRaus(e[k].messung)) n++;
    return n;
  }

  function renderMessung(st) {
    var box = panel && panel.querySelector("[data-role=messung]");
    if (!box) return;
    box.innerHTML = "";
    var mit = [];
    var e = (st && st.eintraege) || {};
    for (var k in e) if (e[k] && e[k].messung) mit.push(k);
    if (!mit.length) { box.textContent = T("ms_none"); return; }
    // Schwächste zuerst: wer den Block öffnet, soll oben sehen, was ihn angeht.
    // Ohne Zahl ganz nach unten — das ist kein schlechter Wert, nur keiner.
    mit.sort(function (a, b) {
      var ma = e[a].messung, mb = e[b].messung;
      var za = msZahlen(ma) ? ma.leistung : 999, zb = msZahlen(mb) ? mb.leistung : 999;
      return za !== zb ? za - zb : (a < b ? -1 : 1);
    });
    for (var i = 0; i < mit.length; i++) {
      var id = mit[i], m = e[id].messung || {};
      var zeile = document.createElement("div");
      zeile.className = "fpst-sporezeile" + (msRaus(m) ? " is-warn" : "");
      var name = document.createElement("b");
      var eintrag = findeEintrag(id);
      name.textContent = (eintrag && eintrag.label) || id;
      zeile.appendChild(name);

      if (msZahlen(m)) {
        var reihe = document.createElement("span");
        reihe.className = "fpst-mswerte";
        for (var j = 0; j < MS_KAT.length; j++) {
          var kk = MS_KAT[j];
          var w = document.createElement("span");
          w.className = "fpst-msw is-" + msStufe(m[kk]);
          w.textContent = T("ms_" + kk) + " " + m[kk];
          reihe.appendChild(w);
        }
        zeile.appendChild(reihe);
      }

      var stand = document.createElement("span");
      var txt = T("ms_st_" + (m.stand || "nicht_gemessen"));
      if (m.gemessen) txt += " · " + T("ms_am") + m.gemessen;
      if (m.grund) txt += " — " + (m.grund === "noch_nicht_dran" ? T("ms_g_noch_nicht_dran") : m.grund);
      stand.textContent = txt;
      zeile.appendChild(stand);

      /* Zurueckgehaltener Wert (Klaus 2026-08-06): die Karte zeigt noch die
       * aeltere, bessere Messung, weil die neueren schlechter waren. Das
       * gehoert auch hierher -- Klaus sieht im Studio nach, warum eine Zahl
       * steht, und "sie ist gehalten" ist die Antwort. Fail-soft: fehlt das
       * Feld, entsteht keine Zeile. */
      var zh = m.zurueckgehalten;
      if (zh && zh.zahl) {
        var halt = document.createElement("small");
        halt.className = "fpst-halt";
        var frisch = m.frisch && typeof m.frisch.leistung === "number"
          ? " (" + T("ms_leistung") + " " + m.frisch.leistung + " am " + String(m.frisch.gemessen || "").slice(0, 10) + ")"
          : "";
        halt.textContent = "⏳ " + T("ms_halt") + " " + zh.zahl + "/" + (zh.noetig || 3) + frisch;
        zeile.appendChild(halt);
      }

      if (msRaus(m)) {
        var raus = document.createElement("small");
        raus.textContent = "⚠ " + T("ms_raus");
        zeile.appendChild(raus);
      }
      box.appendChild(zeile);
    }
  }

  /* Der Schieberegler. Er ändert nur die Arbeitskopie — wirksam wird er mit
   * demselben „Veröffentlichen"-Knopf wie jede andere Änderung. Deshalb setzt
   * er auch markDirty(): sonst könnte Klaus ihn schieben, das Panel schließen
   * und glauben, es sei etwas passiert. */
  function reglerAnzeigen() {
    if (!panel) return;
    var out = panel.querySelector("[data-role=msreglerwert]");
    var wirk = panel.querySelector("[data-role=msreglerwirkung]");
    if (out) out.textContent = MIN_LEISTUNG > 0 ? (T("ms_regler_ab") + MIN_LEISTUNG) : T("ms_regler_aus");
    if (wirk) {
      // Die ueberlagerten Werte zaehlen, nicht die rohen — sonst wuerde der
      // Regler eine Seite wegnehmen, die auf der Karte laengst gut dasteht.
      var n = msZaehleRaus(MESSSTAND || SPORENSTAND);
      wirk.textContent = n === 0 ? T("ms_regler_wirkung_0")
        : n + (n === 1 ? T("ms_regler_wirkung_1") : T("ms_regler_wirkung_n"));
    }
  }
  function reglerGesetzt(v) {
    var neu = klemmeMin(v);
    if (neu === MIN_LEISTUNG) { reglerAnzeigen(); return; }
    MIN_LEISTUNG = neu;
    markDirty();
    reglerAnzeigen();
    renderMessung(SPORENSTAND);
  }

  function findeEintrag(anchorId) {
    for (var i = 0; i < WORK.length; i++) if (WORK[i] && WORK[i].anchorId === anchorId) return WORK[i];
    return null;
  }

  /* Übernehmen ist bewusst NUR ein Vorschlag in die Arbeitsliste: veröffentlicht
   * wird erst mit dem vorhandenen Knopf. So sieht Klaus die Änderung vorher in
   * der Liste, und ein Fehlgriff ist eine Verwerfung entfernt. */
  /* „Gesehen" quittieren: schreibt die AKTUELLE Prüfsumme als `gesehen`. Damit
   * gilt die heutige Fassung der Seite als in Ordnung; ändert sie sich erneut,
   * meldet der Wächter wieder. Es wird KEINE Ampel gesetzt — Rot und Grün
   * bleiben Handarbeit in der Datei. Wie überall im Studio ist das zunächst nur
   * die Arbeitskopie; scharf wird es mit „Veröffentlichen". */
  function wacheGesehen(anchorId) {
    var st = SPORENSTAND && SPORENSTAND.eintraege && SPORENSTAND.eintraege[anchorId];
    var w = st && st.wache;
    if (!w || !w.pruefsumme) { toast(T("wa_keine_summe"), false); return; }
    var vorher = WACHEHAND[anchorId] && typeof WACHEHAND[anchorId] === "object" ? WACHEHAND[anchorId] : {};
    var neu = {};
    for (var k in vorher) neu[k] = vorher[k];   // Sperre/Grund NICHT anfassen
    neu.gesehen = String(w.pruefsumme);
    WACHEHAND[anchorId] = neu;
    wacheDirty = true; markDirty();
    renderSporen(SPORENSTAND);
    toast(T("wa_quittiert"));
  }

  function sporeUebernehmen(anchorId) {
    var st = SPORENSTAND && SPORENSTAND.eintraege && SPORENSTAND.eintraege[anchorId];
    if (!st || !st.neuerText) return;
    var e = findeEintrag(anchorId);
    if (!e) { toast(T("sp_gone"), false); return; }
    e.text = String(st.neuerText);
    st.lage = "uebernommen";
    renderList(); markDirty(); renderSporen(SPORENSTAND);
    toast(T("sp_taken"));
  }

  /* Bericht zum Ausdrucken bzw. als PDF sichern.
   *
   * Bewusst OHNE PDF-Bibliothek: die Seite ist offline-first und lädt keine
   * fremden Skripte (CLAUDE.md § Offline). Der Browser kann das von Haus aus —
   * im Druck-Dialog steht „Als PDF speichern", auch auf dem Tablet. Ein eigenes
   * Fenster, damit die Marktplatz-Seite dahinter unberührt bleibt.
   * Enthält nur öffentliche Katalog-Daten, keine Schlüssel, kein PII. */
  function vecBericht() {
    if (!STAND || STAND.fehler || STAND.keinPaket || !STAND.zeilen) { toast(T("vec_report_none"), false); return; }
    var esc2 = esc;
    var beschriftung = { ok: T("vec_report_covered"), missing: T("vec_report_missing"), stale: T("vec_report_stale") };
    var reihen = STAND.zeilen.map(function (z) {
      return "<tr class=\"" + z.lage + "\"><td>" + esc2(z.label) + "</td><td class=\"id\">" + esc2(z.id) +
        "</td><td>" + esc2(beschriftung[z.lage] || z.lage) + "</td></tr>";
    }).join("");
    var w = window.open("", "_blank");
    if (!w) { toast(T("vec_report_none"), false); return; }
    w.document.write(
      "<!doctype html><html lang=\"de\"><head><meta charset=\"utf-8\">" +
      "<title>" + esc2(T("vec_report_h")) + "</title><style>" +
      "body{font:14px/1.5 system-ui,sans-serif;margin:28px;color:#111}" +
      "h1{font-size:1.25rem;margin:0 0 4px}" +
      ".kopf{color:#555;font-size:.9rem;margin-bottom:18px}" +
      "table{border-collapse:collapse;width:100%}" +
      "th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;vertical-align:top}" +
      "th{background:#f4f4f6}" +
      ".id{font:12px ui-monospace,monospace;color:#666}" +
      "tr.ok td{color:#0a6b2e}tr.missing td,tr.stale td{color:#a3421a;font-weight:600}" +
      "@media print{body{margin:0}}" +
      "</style></head><body>" +
      "<h1>" + esc2(T("vec_report_h")) + "</h1><div class=\"kopf\">" +
      esc2(STAND.abgedeckt + T("vec_stand_of") + STAND.gesamt + T("vec_stand_entries") +
           T("vec_stand_built") + STAND.gebaut + T("vec_stand_model") + STAND.model + " · dim " + STAND.dim) +
      "</div><table><thead><tr><th>App</th><th>Kennung</th><th>Zustand</th></tr></thead><tbody>" +
      reihen + "</tbody></table></body></html>");
    w.document.close();
    // Auf das fertige Dokument warten, nicht auf die Uhr — sonst druckt der
    // Dialog eine halb aufgebaute Seite.
    var drucken = function () { try { w.focus(); w.print(); } catch (_e) {} };
    if (w.document.readyState === "complete") drucken();
    else w.addEventListener("load", drucken);
  }

  function vecStatus(msg, pct) {
    var el = panel && panel.querySelector("[data-role=vecstatus]");
    if (!el) return;
    if (!msg) { el.innerHTML = ""; return; }
    var unbekannt = (pct == null);
    var w = unbekannt ? 40 : Math.max(0, Math.min(100, Math.round(pct)));
    el.innerHTML = '<span class="fpst-vectext"></span>' +
      '<span class="fpst-vecbar"><span class="fpst-vecbar-fill' +
      (unbekannt ? " is-unbekannt" : "") + '" style="width:' + w + '%"></span></span>';
    // textContent, nicht innerHTML: der Text kann aus einer Fehlermeldung kommen.
    var t = el.querySelector(".fpst-vectext");
    if (t) t.textContent = msg;
  }
  function buildVectors() {
    var codec = window.FPVecCodec;
    var emb = window.SbkimEmbedding;
    if (!codec || !emb || typeof emb.embedPassageBatch !== "function") { toast(T("vec_noembed"), false); return; }
    if (!API) { toast(T("q_noapi"), false); return; }
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); var se = panel.querySelector("[data-f=srvkey]"); if (se) se.focus(); return; }
    // Ungespeicherte Aenderungen zuerst veroeffentlichen: sonst rechnet der Knopf
    // ueber den Server-Stand und laesst genau die Eintraege aus, die gerade
    // bearbeitet wurden — wieder ein Paket, das aussieht wie fertig und keins ist.
    if (dirty) { toast(T("vec_dirty"), false); return; }

    var btn = panel.querySelector("[data-role=vecbtn]");
    if (btn) btn.disabled = true;
    vecStatus(T("vec_loading"), null);

    // Modul 03 meldet den Modell-Download als window-Event
    // (03_embedding.js emitProgress: {status, file, progress 0-100, loaded, total}).
    // Der Listener gilt NUR für die Lade-Phase und wird in JEDEM Ausgang wieder
    // entfernt — auch im Fehlerfall, sonst hängt er beim nächsten Druck doppelt.
    var onProg = function (ev) {
      var d = (ev && ev.detail) || {};
      if (d.status === "progress" && d.file) {
        var pct = (d.progress != null) ? d.progress : null;
        vecStatus(T("vec_loading") + (pct != null ? " " + Math.round(pct) + "%" : ""), pct);
      }
    };
    var stopProg = function () { try { window.removeEventListener("sbkim:embedding-progress", onProg); } catch (_e) {} };
    window.addEventListener("sbkim:embedding-progress", onProg);

    // In Häppchen rechnen, damit der Fortschritt sichtbar ist. embedPassageBatch
    // ist dieselbe Funktion, die die Leseseite nutzt — die Aufteilung ändert am
    // Ergebnis nichts, nur an der Rückmeldung.
    var CHUNK = 8;
    var vecs = [];
    function schritt(k) {
      if (k >= offen.length) return Promise.resolve();
      var fertig = Math.min(k + CHUNK, offen.length);
      vecStatus(T("vec_working") + fertig + "/" + offen.length, (k / offen.length) * 100);
      var teil = offen.slice(k, k + CHUNK).map(function (it) { return it.text; });
      return emb.embedPassageBatch(teil).then(function (res) {
        if (!res || res.length !== teil.length) throw new Error("embedPassageBatch: " + teil.length + " erwartet, " + ((res && res.length) || 0) + " bekommen");
        for (var j = 0; j < res.length; j++) vecs.push(res[j]);
        return schritt(k + CHUNK);
      });
    }

    var items = [];       // alle Eintraege
    var offen = [];       // nur die, die WIRKLICH gerechnet werden muessen
    var uebernommen = {}; // anchorId -> fertiger Eintrag aus dem alten Paket

    Promise.resolve()
      .then(function () {
        // Beides zugleich: die Eintraege UND das bisherige Paket.
        return Promise.all([
          frischeListings(),
          fetch("assets/config/listings-vec.json?ts=" + Date.now(), { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
        ]);
      })
      .then(function (beide) {
        var liste = beide[0], alt = beide[1];
        // Ehrlich benennen, WORUEBER gerechnet wird — der Unterschied ist der
        // ganze Befund von oben.
        vecStatus(liste ? T("vec_fresh") : T("vec_local"), null);
        items = vecEntries(liste);
        if (!items.length) throw new Error(T("vec_noentries"));

        /* Nur rechnen, was sich geaendert hat (Klaus' Frage 2026-08-01:
         * „rechnet er dann fuer tausend Apps jedes Mal alles nach? Das waere
         * ziemlich ueberfluessig").
         *
         * Er hat recht, und die Antwort lag schon im Paket: jeder Vektor traegt
         * den Hash des Textes, aus dem er entstand. Passt der Hash noch UND
         * stimmen Modell und Dimension mit dem laufenden Modell ueberein, ist der
         * alte Vektor exakt derselbe, den eine Neuberechnung liefern wuerde — nur
         * ohne die Rechenzeit. Bei 1000 Apps und drei geaenderten Texten sind das
         * drei Einbettungen statt tausend.
         *
         * Die drei Bedingungen sind alle noetig: ein anderes Modell erzeugt
         * voellig andere Vektoren, eine andere Dimension macht sie unlesbar, und
         * ohne Hash-Vergleich uebernaehme man genau die veralteten Vektoren, die
         * der ganze Waechter verhindern soll. Im Zweifel wird neu gerechnet —
         * das kostet Zeit, nie Richtigkeit. */
        var meta = emb._meta || {};
        var passt = alt && alt.vectors && alt.model && meta.model &&
                    alt.model === meta.model && (!alt.dim || !meta.dim || alt.dim === meta.dim);
        offen = [];
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var rec = passt ? alt.vectors[it.id] : null;
          if (rec && rec.h && rec.v && typeof rec.s === "number" && rec.h === codec.textHash(it.text)) {
            uebernommen[it.id] = { s: rec.s, v: rec.v, h: rec.h };
          } else {
            offen.push(it);
          }
        }
        if (!offen.length) {
          // Nichts geaendert: kein Modell laden, kein Commit. Ehrlich sagen,
          // dass nichts zu tun war — nicht so tun, als haette man gearbeitet.
          throw { _nichtsZuTun: true };
        }
      })
      .then(function () { return emb.init ? emb.init() : null; })
      .then(function () { stopProg(); return schritt(0); })
      .then(function () {
        var meta = emb._meta || {};
        if (!meta.model || !meta.dim) throw new Error("SbkimEmbedding._meta ohne model/dim");
        var pack = {
          version: 1,
          model: meta.model,
          dim: meta.dim,
          quant: (codec._meta && codec._meta.quant) || "int8-sym-b64",
          built: new Date().toISOString().slice(0, 10),
          vectors: {}
        };
        // Erst die unveraendert uebernommenen, dann die frisch gerechneten.
        for (var k in uebernommen) { if (Object.prototype.hasOwnProperty.call(uebernommen, k)) pack.vectors[k] = uebernommen[k]; }
        for (var i = 0; i < offen.length; i++) {
          var p = codec.encode(vecs[i]);
          p.h = codec.textHash(offen[i].text);
          pack.vectors[offen[i].id] = p;
        }
        if (!Object.keys(pack.vectors).length) throw new Error("leeres Paket");
        vecStatus(T("vec_committing"), 100);
        return apiPost("commit_vectors", { content: JSON.stringify(pack) });
      })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "commit_vectors");
        stopProg();
        if (btn) btn.disabled = false;
        // Die Bestätigung BLEIBT stehen (Klaus 2026-08-01: „ich sehe noch keine
        // Bestätigung, dass das aktualisiert wurde"). Ein Toast ist nach 2,6 s
        // weg; wer in dem Moment nicht hinsieht, erfährt nie, ob es geklappt hat.
        var wieder = Object.keys(uebernommen).length;
        var meldung = T("vec_done") + items.length + T("vec_done2") +
          (wieder ? T("vec_reuse") + wieder : "");
        vecStatus(meldung, 100);
        toast(meldung);
        // Und gleich nachmessen statt behaupten: GitHub Pages braucht ~1 Minute,
        // bis die neue Datei ausgeliefert wird — die Prüfung sagt ehrlich, was
        // JETZT auf dem Server liegt. Wer zu früh schaut, sieht den alten Stand
        // und drückt einfach nochmal auf „Stand prüfen".
        standLaden();
      })
      .catch(function (err) {
        stopProg();
        if (btn) btn.disabled = false;
        // Kein Fehler, sondern das gute Ergebnis: es gab schlicht nichts zu tun.
        if (err && err._nichtsZuTun) { vecStatus(T("vec_nothing"), 100); toast(T("vec_nothing")); return; }
        // Die Fehlermeldung BLEIBT stehen. Ein Toast verschwindet nach 2,6 s —
        // wer gerade nicht hinsieht, bekommt sonst nie zu lesen, woran es lag.
        vecStatus(T("vec_err") + (err && err.message ? err.message : err), 0);
        toast(T("vec_err") + (err && err.message ? err.message : err), false);
      });
  }

  // Live-Eintrag zurückziehen: aus WORK entfernen + server-seitig neu schreiben.
  function withdrawEntry(idx) {
    if (!WORK[idx]) return;
    if (!window.confirm(T("withdraw_confirm"))) return;
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); return; }
    WORK.splice(idx, 1); dirty = true; window.FP_LISTINGS = WORK;
    if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    if (editIdx === idx) clearForm();
    toast(T("publishing"));
    publishViaServer()
      .then(function () { renderList(); markDirty(); toast(T("withdrawn")); })
      .catch(function (err) { toast(T("pub_err") + (err && err.message ? err.message : err), false); });
  }

  /* --------------------------------------------- Warteschlange (Server-API) */
  var QUEUE = [];
  function srvKeyStored() { try { return localStorage.getItem(LS.srvKey) || ""; } catch (e) { return ""; } }
  function srvKeyVal() { var el = panel && panel.querySelector("[data-f=srvkey]"); if (el && el.value.trim()) return el.value.trim(); return srvKeyStored(); }
  function setSrvKey(v, remember) { try { if (remember && v) localStorage.setItem(LS.srvKey, v); else localStorage.removeItem(LS.srvKey); localStorage.setItem(LS.srvRemember, remember ? "1" : "0"); } catch (e) {} }
  function apiGet(action, extra) {
    var q = "?action=" + encodeURIComponent(action) + "&key=" + encodeURIComponent(srvKeyVal());
    if (extra) Object.keys(extra).forEach(function (k) { q += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(extra[k]); });
    return fetch(API + q, { cache: "no-store" }).then(function (r) { return r.json(); });
  }
  function apiPost(action, bodyObj) {
    var body = bodyObj || {}; body.key = srvKeyVal();
    return fetch(API + "?action=" + encodeURIComponent(action), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function statusLabel(st) { return st === "geprueft" ? T("q_status_geprueft") : st === "verdacht" ? T("q_status_verdacht") : T("q_status_neu"); }
  function statusClass(st) { return st === "geprueft" ? "is-geprueft" : st === "verdacht" ? "is-verdacht" : "is-neu"; }
  function findQ(id) { for (var i = 0; i < QUEUE.length; i++) { if (String(QUEUE[i].id) === String(id)) return QUEUE[i]; } return null; }
  function entryFromRec(it) {
    return {
      label: String(it.label || "").trim(),
      text: String(it.text || "").trim(),
      by: (String(it.by || "").trim() || T("by_default")),
      url: String(it.url || "").trim(),
      img: safeImg(it.img),
      category: String(it.category || "").trim(),
      tags: [], mycel: false,
      // Der Spore-Link wird uebernommen, der HAKEN aber nie: ob eine fremde
      // Beschreibung sich selbst aktualisieren darf, entscheidet Klaus — nicht
      // der Einreichende. Nur https, sonst gar nicht.
      sporeUrl: /^https:\/\//i.test(String(it.sporeUrl || "")) ? String(it.sporeUrl).trim() : "",
      anchorId: "markt-" + slugify(it.label) + "-" + String(it.id).slice(-6)
    };
  }
  function fetchQueue() {
    if (!API) { toast(T("q_noapi"), false); return; }
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); var se = panel.querySelector("[data-f=srvkey]"); if (se) se.focus(); return; }
    var box = panel.querySelector("[data-role=queue]"); if (box) box.innerHTML = '<div class="fpst-qempty">' + esc(T("q_loading")) + '</div>';
    var rem = panel.querySelector("[data-f=srvremember]");
    setSrvKey(srvKeyVal(), !rem || rem.checked);
    apiGet("list").then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "?");
      QUEUE = (j.items || []).filter(function (x) { return ["freigegeben", "abgelehnt", "erledigt"].indexOf(x.status) < 0; });
      renderQueue();
    }).catch(function (err) { toast(T("q_err") + (err && err.message ? err.message : err), false); if (box) box.innerHTML = ""; });
  }
  function renderQueue() {
    var box = panel.querySelector("[data-role=queue]"); if (!box) return;
    if (!QUEUE.length) { box.innerHTML = '<div class="fpst-qempty">' + esc(T("q_none")) + '</div>'; return; }
    box.innerHTML = QUEUE.map(function (it, i) {
      return '<div class="fpst-qitem ' + statusClass(it.status) + '">' +
        '<img src="' + esc(safeImg(it.img) || "") + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="fpst-qbody"><div class="fpst-qtop"><span class="fpst-qnum">#' + (i + 1) + '</span> <span class="fpst-qstatus">' + esc(statusLabel(it.status)) + '</span></div>' +
        '<b>' + esc(it.label) + '</b><small>' + esc((it.text || "").slice(0, 100)) + '</small>' +
        '<div class="fpst-qact">' +
          '<a href="' + esc(safeUrl(it.url) || "#") + '" target="_blank" rel="noopener" class="fpst-qbtn">' + esc(T("q_open")) + '</a>' +
          '<button data-qtake="' + esc(it.id) + '" class="fpst-qbtn">' + esc(T("q_take")) + '</button>' +
          '<button data-qcheck="' + esc(it.id) + '" class="fpst-qbtn">' + esc(T("q_checked")) + '</button>' +
          '<button data-qok="' + esc(it.id) + '" class="fpst-qbtn fpst-qbtn--go">' + esc(T("q_approve")) + '</button>' +
          '<button data-qno="' + esc(it.id) + '" class="fpst-qbtn fpst-danger">' + esc(T("q_reject")) + '</button>' +
        '</div></div></div>';
    }).join("") + '<div class="fpst-qfoot"><button data-role="qall" class="fpst-btn">' + esc(T("q_approveall")) + '</button></div>';
  }
  function queueTakeOver(id) {
    var it = findQ(id); if (!it) return;
    _pendingImg = null; editIdx = -1;
    panel.querySelector("[data-f=label]").value = it.label || "";
    panel.querySelector("[data-f=desc]").value = it.text || "";
    panel.querySelector("[data-f=url]").value = it.url || "";
    panel.querySelector("[data-f=imgurl]").value = safeImg(it.img) || "";
    panel.querySelector("[data-f=cat]").value = it.category || "";
    panel.querySelector("[data-f=tags]").value = "";
    panel.querySelector("[data-f=by]").value = it.by || "";
    panel.querySelector("[data-f=mycel]").checked = false;
    setImgPreview(safeImg(it.img));
    panel.querySelector("[data-role=addbtn]").textContent = T("add_btn");
    panel.querySelector("[data-role=cancel]").style.display = "";
    panel.querySelector("[data-role=form]").scrollIntoView({ behavior: "smooth", block: "start" });
    toast(T("q_take"));
  }
  function queueSetStatus(id, status) {
    apiPost("setstatus", { id: id, status: status }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "?");
      var it = findQ(id); if (it) it.status = status; renderQueue();
    }).catch(function (err) { toast(T("q_err") + (err && err.message ? err.message : err), false); });
  }
  function queueApprove(id) {
    var it = findQ(id); if (!it) return;
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); return; }
    var entry = entryFromRec(it);
    if (!entry.label || !entry.text || !safeUrl(entry.url) || !entry.img) { toast(T("bad_img"), false); return; }
    WORK.push(entry); dirty = true; window.FP_LISTINGS = WORK;
    if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    toast(T("publishing"));
    publishViaServer()
      .then(function () { return apiPost("setstatus", { id: id, status: "freigegeben" }); })
      .then(function () { QUEUE = QUEUE.filter(function (x) { return String(x.id) !== String(id); }); renderQueue(); renderList(); markDirty(); toast(T("q_approved")); })
      .catch(function (err) { toast(T("pub_err") + (err && err.message ? err.message : err), false); });
  }
  function rejectMail(it) {
    if (!it.contact) return;
    var body = "Hallo,\n\ndanke für deine Einreichung „" + it.label + "\" im Family-Projekt-Marktplatz.\n\nLeider können wir sie so nicht veröffentlichen.\n\nDu kannst sie gern angepasst erneut einreichen.\n\nViele Grüße\nFamily Projekt";
    try { window.open("mailto:" + encodeURIComponent(it.contact) + "?subject=" + encodeURIComponent("Deine Marktplatz-Einreichung") + "&body=" + encodeURIComponent(body), "_blank"); } catch (e) {}
  }
  function queueReject(id) {
    var it = findQ(id); if (!it) return;
    if (!window.confirm(T("q_reject_confirm"))) return;
    apiPost("setstatus", { id: id, status: "abgelehnt" }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "?");
      QUEUE = QUEUE.filter(function (x) { return String(x.id) !== String(id); }); renderQueue(); toast(T("q_rejected"));
      rejectMail(it);
    }).catch(function (err) { toast(T("q_err") + (err && err.message ? err.message : err), false); });
  }
  function approveAllChecked() {
    var checked = QUEUE.filter(function (it) { return it.status === "geprueft"; });
    if (!checked.length) { toast(T("q_none")); return; }
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); return; }
    var good = [];
    checked.forEach(function (it) { var e = entryFromRec(it); if (e.label && e.text && safeUrl(e.url) && e.img) { WORK.push(e); good.push(it.id); } });
    if (!good.length) { toast(T("bad_img"), false); return; }
    dirty = true; window.FP_LISTINGS = WORK; if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    toast(T("publishing"));
    publishViaServer()
      .then(function () { return Promise.all(good.map(function (id) { return apiPost("setstatus", { id: id, status: "freigegeben" }); })); })
      .then(function () { QUEUE = QUEUE.filter(function (x) { return good.indexOf(x.id) < 0; }); renderQueue(); renderList(); markDirty(); toast(T("q_approved")); })
      .catch(function (err) { toast(T("pub_err") + (err && err.message ? err.message : err), false); });
  }

  function openPanel() {
    if (panel) { panel.style.display = "flex"; return; }
    panel = document.createElement("div");
    panel.className = "fpst-modal";
    var remembered = false; try { remembered = localStorage.getItem(LS.remember) !== "0"; } catch (e) {}
    var srvRemembered = false; try { srvRemembered = localStorage.getItem(LS.srvRemember) !== "0"; } catch (e) {}
    panel.innerHTML =
      '<div class="fpst-box" role="dialog" aria-modal="true">' +
        '<div class="fpst-head"><b>' + esc(T("title")) + ' <span data-role="dirty" class="fpst-dirty"></span></b>' +
          '<button data-role="x" class="fpst-x" title="' + esc(T("publish_close")) + '">✕</button></div>' +
        '<p class="fpst-intro">' + esc(T("intro")) + '</p>' +
        '<div class="fpst-queue">' +
          '<h4>' + esc(T("q_h")) + '</h4>' +
          '<p class="fpst-qintro">' + esc(T("q_intro")) + '</p>' +
          '<label>' + esc(T("q_key")) +
            '<input type="password" data-f="srvkey" autocomplete="off" value="' + esc(srvKeyStored()) + '"></label>' +
          '<label class="fpst-chk"><input type="checkbox" data-f="srvremember"' + (srvRemembered ? " checked" : "") + '> ' + esc(T("q_remember")) + '</label>' +
          '<small>' + esc(T("q_key_hint")) + '</small>' +
          '<div class="fpst-qbtnrow"><button type="button" data-role="qfetch" class="fpst-btn">' + esc(T("q_fetch")) + '</button></div>' +
          '<div class="fpst-qlist" data-role="queue"></div>' +
        '</div>' +
        '<div class="fpst-form" data-role="form">' +
          '<h4>' + esc(T("add_h")) + '</h4>' +
          '<label>' + esc(T("f_name")) + '<input data-f="label" placeholder="' + esc(T("ph_name")) + '"></label>' +
          '<label>' + esc(T("f_desc")) + '<textarea data-f="desc" rows="3" placeholder="' + esc(T("ph_desc")) + '"></textarea></label>' +
          '<label>' + esc(T("f_url")) + '<input data-f="url" placeholder="' + esc(T("ph_url")) + '"></label>' +
          '<label>' + esc(T("f_imgurl")) + '<input data-f="imgurl" placeholder="' + esc(T("ph_imgurl")) + '"></label>' +
          '<div class="fpst-imgrow"><button type="button" data-role="imgpick" class="fpst-btn">' + esc(T("f_imgpick")) + '</button>' +
            '<div class="fpst-imgprev" data-role="imgprev"></div></div>' +
          '<div class="fpst-two">' +
            '<label>' + esc(T("f_cat")) + '<input data-f="cat" placeholder="' + esc(T("ph_cat")) + '"></label>' +
            '<label>' + esc(T("f_by")) + '<input data-f="by" placeholder="' + esc(T("ph_by")) + '"></label>' +
          '</div>' +
          '<label>' + esc(T("f_tags")) + '<input data-f="tags" placeholder="' + esc(T("ph_tags")) + '"></label>' +
          '<label class="fpst-chk"><input type="checkbox" data-f="mycel"> ' + esc(T("f_mycel")) + '</label>' +
          '<label>' + esc(T("f_spore")) + '<input data-f="spore" placeholder="' + esc(T("ph_spore")) + '"></label>' +
          '<label class="fpst-chk"><input type="checkbox" data-f="sporeauto"> ' + esc(T("f_sporeauto")) + '</label>' +
          '<div class="fpst-formbtns">' +
            '<button type="button" data-role="addbtn" class="fpst-btn fpst-btn--go">' + esc(T("add_btn")) + '</button>' +
            '<button type="button" data-role="cancel" class="fpst-btn" style="display:none">' + esc(T("cancel_btn")) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="fpst-vec">' +
          '<h4>' + esc(T("vec_h")) + '</h4>' +
          '<p class="fpst-qintro">' + esc(T("vec_intro")) + '</p>' +
          '<div class="fpst-vecstand" data-role="vecstand"></div>' +
          '<div class="fpst-qbtnrow"><button type="button" data-role="vecbtn" class="fpst-btn fpst-btn--go">' + esc(T("vec_btn")) + '</button>' +
            '<button type="button" data-role="vecrecheck" class="fpst-btn">' + esc(T("vec_recheck")) + '</button>' +
            '<button type="button" data-role="vecreport" class="fpst-btn">' + esc(T("vec_report")) + '</button></div>' +
          '<div class="fpst-vecstatus" data-role="vecstatus"></div>' +
          '<small>' + esc(T("vec_hint")) + '</small>' +
        '</div>' +
        '<div class="fpst-vec">' +
          '<h4>' + esc(T("sp_h")) + '</h4>' +
          '<p class="fpst-qintro">' + esc(T("sp_intro")) + '</p>' +
          '<div class="fpst-sporen" data-role="sporen"></div>' +
        '</div>' +
        '<div class="fpst-vec">' +
          '<h4>' + esc(T("ms_h")) + '</h4>' +
          '<p class="fpst-qintro">' + esc(T("ms_intro")) + '</p>' +
          '<div class="fpst-msregler">' +
            '<label for="fpst-msregler">' + esc(T("ms_regler_h")) + '</label>' +
            '<div class="fpst-msreglerrow">' +
              '<input id="fpst-msregler" type="range" min="0" max="100" step="5" value="' + esc(String(klemmeMin(MIN_LEISTUNG))) + '" data-role="msregler">' +
              '<output data-role="msreglerwert"></output>' +
            '</div>' +
            '<small data-role="msreglerwirkung"></small>' +
            '<small>' + esc(T("ms_regler_hint")) + '</small>' +
          '</div>' +
          '<div class="fpst-sporen" data-role="messung"></div>' +
        '</div>' +
        '<h4>' + esc(T("list_h")) + '</h4>' +
        '<div class="fpst-list" data-role="list"></div>' +
        '<div class="fpst-foot">' +
          '<button type="button" data-role="publish" class="fpst-btn fpst-btn--go">' + esc(T("publish")) + '</button>' +
          '<button type="button" data-role="close" class="fpst-btn">' + esc(T("publish_close")) + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);
    panel.querySelector("[data-role=x]").addEventListener("click", function () { panel.style.display = "none"; });
    panel.querySelector("[data-role=close]").addEventListener("click", function () { panel.style.display = "none"; });
    panel.querySelector("[data-role=addbtn]").addEventListener("click", saveEntry);
    panel.querySelector("[data-role=cancel]").addEventListener("click", clearForm);
    panel.querySelector("[data-role=publish]").addEventListener("click", publish);
    var vb = panel.querySelector("[data-role=vecbtn]"); if (vb) vb.addEventListener("click", buildVectors);
    var vr = panel.querySelector("[data-role=vecrecheck]"); if (vr) vr.addEventListener("click", function () { standLaden(); sporenLaden(); });
    var sb = panel.querySelector("[data-role=sporen]");
    if (sb) sb.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sptake]"); if (b) sporeUebernehmen(b.getAttribute("data-sptake"));
      var g = e.target.closest("[data-wagesehen]"); if (g) wacheGesehen(g.getAttribute("data-wagesehen"));
    });
    var vp = panel.querySelector("[data-role=vecreport]"); if (vp) vp.addEventListener("click", vecBericht);
    var mr = panel.querySelector("[data-role=msregler]");
    if (mr) {
      // `input` fürs Mitlaufen beim Ziehen, `change` fürs Loslassen — und beide
      // auf denselben Weg, damit die Tastatur-Bedienung (Pfeiltasten setzen
      // beides aus) sich nicht anders verhält als der Finger.
      mr.addEventListener("input", function () { reglerGesetzt(mr.value); });
      mr.addEventListener("change", function () { reglerGesetzt(mr.value); });
    }
    panel.querySelector("[data-role=imgpick]").addEventListener("click", function () {
      var fi = ensureFileInput(); fi.value = "";
      fi.onchange = function () {
        var f = fi.files && fi.files[0]; if (!f) return;
        if (/svg/i.test(f.type)) { toast(T("bad_img"), false); return; }
        var r = new FileReader();
        r.onload = function () {
          var dataUrl = String(r.result || "");
          var b64 = dataUrl.indexOf(",") >= 0 ? dataUrl.slice(dataUrl.indexOf(",") + 1) : "";
          _pendingImg = { base64: b64, ext: extFromType(f.type) };
          setImgPreview(dataUrl);
          toast(T("img_local"));
        };
        r.readAsDataURL(f);
      };
      fi.click();
    });
    panel.querySelector("[data-role=list]").addEventListener("click", function (e) {
      var ed = e.target.closest("[data-edit]"); if (ed) { editEntry(+ed.getAttribute("data-edit")); return; }
      var wd = e.target.closest("[data-withdraw]"); if (wd) { withdrawEntry(+wd.getAttribute("data-withdraw")); return; }
      var dl = e.target.closest("[data-del]"); if (dl) { delEntry(+dl.getAttribute("data-del")); return; }
    });
    var qf = panel.querySelector("[data-role=qfetch]"); if (qf) qf.addEventListener("click", fetchQueue);
    var qbox = panel.querySelector("[data-role=queue]");
    if (qbox) qbox.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest("[data-qtake]"))) { queueTakeOver(t.getAttribute("data-qtake")); return; }
      if ((t = e.target.closest("[data-qcheck]"))) { queueSetStatus(t.getAttribute("data-qcheck"), "geprueft"); return; }
      if ((t = e.target.closest("[data-qok]"))) { queueApprove(t.getAttribute("data-qok")); return; }
      if ((t = e.target.closest("[data-qno]"))) { queueReject(t.getAttribute("data-qno")); return; }
      if (e.target.closest("[data-role=qall]")) { approveAllChecked(); return; }
    });
    renderList(); markDirty();
    // Beim Öffnen sofort messen — die Frage „ist das aktualisiert?" soll man
    // nicht erst stellen müssen. Der Sporen-Bericht gehört dazu: wartet dort
    // eine Beschreibung auf Klaus, soll er es beim Öffnen sehen.
    standLaden();
    sporenLaden();
    // Der Regler-Wert kommt aus listings.js und wird von capturePrefix() gelesen
    // — das läuft nebenher und kann nach dem Panel-Bau fertig werden. Deshalb
    // hier noch einmal angleichen, statt sich auf die Reihenfolge zu verlassen.
    var mr0 = panel.querySelector("[data-role=msregler]"); if (mr0) mr0.value = String(klemmeMin(MIN_LEISTUNG));
    reglerAnzeigen();
  }
  function closePanel() { if (panel) panel.style.display = "none"; }

  /* --------------------------------------------------------------- CSS */
  function injectCss() {
    if (document.getElementById("fpst-css")) return;
    var s = document.createElement("style"); s.id = "fpst-css";
    s.textContent =
      ".fpst-toasts{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:100000;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}" +
      ".fpst-toast{background:rgba(18,20,28,.96);color:#fff;padding:10px 16px;border-radius:12px;font:14px system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.4);max-width:90vw;transition:opacity .3s,transform .3s}" +
      ".fpst-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-start;justify-content:center;background:rgba(6,8,14,.6);padding:16px;overflow:auto}" +
      ".fpst-box{background:#141824;color:#eef1f7;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:18px;max-width:560px;width:100%;margin:16px 0;box-shadow:0 20px 60px rgba(0,0,0,.5)}" +
      ".fpst-head{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
      ".fpst-head b{font-size:1.1rem}.fpst-dirty{color:#ffb26b;font-size:.8rem;font-weight:400}" +
      ".fpst-x{background:transparent;border:0;color:#cfd6e6;font-size:1.2rem;cursor:pointer;padding:2px 8px}" +
      ".fpst-intro{opacity:.8;font-size:.9rem;margin:.3rem 0 1rem}" +
      ".fpst-box label{display:block;font-size:.82rem;opacity:.9;margin:.55rem 0 0}" +
      ".fpst-box input[type=text],.fpst-box input:not([type]),.fpst-box input[type=password],.fpst-box textarea{width:100%;box-sizing:border-box;margin-top:4px;padding:9px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.16);background:#0e1119;color:#eef1f7;font:14px system-ui,sans-serif}" +
      ".fpst-box textarea{resize:vertical}" +
      ".fpst-chk{display:flex;align-items:center;gap:7px;margin-top:.7rem}.fpst-chk input{width:auto;margin:0}" +
      ".fpst-box small{display:block;opacity:.6;font-size:.76rem;margin-top:4px}" +
      ".fpst-tokenlink{display:inline-block;margin-top:8px;font-size:.82rem;font-weight:600;color:#8fb4ff;text-decoration:none;border:1px solid rgba(143,180,255,.35);border-radius:9px;padding:6px 11px}" +
      ".fpst-tokenlink:hover{border-color:rgba(143,180,255,.7);background:rgba(143,180,255,.08)}" +
      ".fpst-help{margin-top:.5rem;font-size:.8rem}.fpst-help summary{cursor:pointer;opacity:.8}.fpst-help p{opacity:.75;line-height:1.4}" +
      ".fpst-token,.fpst-form{border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;margin:.6rem 0}" +
      ".fpst-form h4,.fpst-box>h4{margin:.4rem 0 .2rem;font-size:.95rem}" +
      ".fpst-two{display:flex;gap:10px}.fpst-two label{flex:1}" +
      ".fpst-imgrow{display:flex;gap:10px;align-items:center;margin-top:.6rem}" +
      ".fpst-imgprev{width:56px;height:56px;border-radius:8px;overflow:hidden;background:#0e1119;border:1px solid rgba(255,255,255,.12);flex:none}" +
      ".fpst-imgprev img{width:100%;height:100%;object-fit:cover}" +
      ".fpst-formbtns,.fpst-foot{display:flex;gap:10px;margin-top:.8rem;flex-wrap:wrap}" +
      ".fpst-btn{border:1px solid rgba(255,255,255,.2);background:transparent;color:#eef1f7;border-radius:10px;padding:9px 14px;cursor:pointer;font:600 14px system-ui,sans-serif}" +
      ".fpst-btn:hover{border-color:rgba(255,255,255,.5)}" +
      ".fpst-btn--go{background:linear-gradient(180deg,#6aa0ff,#3f6fd8);border-color:transparent;color:#fff}" +
      ".fpst-danger{color:#ff9a9a;border:1px solid rgba(255,120,120,.4);background:transparent;border-radius:8px;padding:5px 9px;cursor:pointer}" +
      ".fpst-list{display:flex;flex-direction:column;gap:8px;max-height:44vh;overflow:auto}" +
      ".fpst-item{display:flex;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px}" +
      ".fpst-item img{width:40px;height:40px;border-radius:7px;object-fit:cover;background:#0e1119;flex:none}" +
      ".fpst-item__b{flex:1;min-width:0}.fpst-item__b b{font-size:.9rem}.fpst-item__b small{display:block;opacity:.6;font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".fpst-item__a{display:flex;gap:6px;flex:none}.fpst-item__a button{font-size:.78rem;border-radius:7px;padding:5px 8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#eef1f7;cursor:pointer}" +
      ".fpst-own{font-size:.68rem;background:rgba(120,160,255,.25);border-radius:5px;padding:1px 5px}.fpst-myc{font-size:.8rem}" +
      ".fpst-queue,.fpst-vec{border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;margin:.6rem 0}" +
      ".fpst-vec .fpst-qbtnrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}" +
      ".fpst-vecstatus{font-size:.8rem;opacity:.85;margin-top:.6rem}" +
      ".fpst-vecstand{font-size:.82rem;border-radius:9px;padding:8px 10px;margin:.5rem 0;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04)}" +
      ".fpst-vecstand b{display:block;font-size:.86rem}" +
      ".fpst-vecstand span{opacity:.75}" +
      ".fpst-vecstand small{display:block;opacity:.7;margin-top:4px}" +
      ".fpst-vecstand.is-ok{border-color:rgba(95,206,143,.5);background:rgba(95,206,143,.10)}" +
      ".fpst-vecstand.is-warn{border-color:rgba(255,178,107,.55);background:rgba(255,178,107,.10)}" +
      ".fpst-vecstand.is-err{border-color:rgba(255,140,140,.45);background:rgba(255,140,140,.08)}" +
      // Sporen-Bericht (Stufe 2). Eine Zeile je Anbieter; wartet dort etwas
      // auf Klaus, ist sie warm eingefärbt und trägt einen Knopf.
      ".fpst-sporen{font-size:.82rem;margin:.4rem 0}" +
      ".fpst-sporezeile{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:9px;padding:8px 10px;margin-top:6px}" +
      ".fpst-sporezeile b{display:block;font-size:.86rem}" +
      ".fpst-sporezeile span{opacity:.75}" +
      ".fpst-sporezeile small{display:block;opacity:.8;margin:5px 0}" +
      ".fpst-sporezeile.is-warn{border-color:rgba(255,178,107,.55);background:rgba(255,178,107,.10)}" +
      ".fpst-sporezeile.is-stop{border-color:rgba(255,107,107,.65);background:rgba(255,107,107,.12)}" +
      // Spezifisch genug, um das pauschale `.fpst-sporezeile span{opacity:.75}`
      // zu schlagen — eine halbdurchsichtige Warnung ist keine.
      ".fpst-sporezeile span.fpst-ampel{display:block;font-size:.8rem;margin:3px 0;opacity:1}" +
      ".fpst-sporezeile span.fpst-ampel.is-gruen{color:#8fd18f}" +
      ".fpst-sporezeile span.fpst-ampel.is-gelb{color:#ffb26b}" +
      ".fpst-sporezeile span.fpst-ampel.is-rot{color:#ff8a7a}" +
      // Messung (Stufe 5). Die Zahl steht immer neben der Farbe — auf Farbe
      // allein darf sich keine Aussage stützen.
      ".fpst-mswerte{display:flex!important;flex-wrap:wrap;gap:5px;margin:4px 0;opacity:1!important}" +
      ".fpst-msw{font-size:.75rem;border-radius:999px;padding:2px 8px;border:1px solid currentColor;white-space:nowrap}" +
      ".fpst-msw.is-gut{color:#8fd18f}.fpst-msw.is-mittel{color:#ffb26b}.fpst-msw.is-schwach{color:#ff8a7a}" +
      ".fpst-msregler{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px;margin:.5rem 0}" +
      ".fpst-msregler label{margin:0 0 6px;opacity:1;font-size:.85rem}" +
      ".fpst-msreglerrow{display:flex;align-items:center;gap:10px}" +
      ".fpst-msreglerrow input[type=range]{flex:1;min-width:0;accent-color:#6aa0ff}" +
      ".fpst-msreglerrow output{font:600 .85rem ui-monospace,monospace;min-width:6.5em;text-align:right}" +
      ".fpst-vectext{display:block;margin-bottom:4px}" +
      ".fpst-vecbar{display:block;height:6px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}" +
      ".fpst-vecbar-fill{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#6aa0ff,#5fce8f);transition:width .25s}" +
      "@keyframes fpst-vecwander{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}" +
      ".fpst-vecbar-fill.is-unbekannt{animation:fpst-vecwander 1.1s ease-in-out infinite}" +
      "@media (prefers-reduced-motion:reduce){.fpst-vecbar-fill.is-unbekannt{animation:none}}" +
      ".fpst-qintro{opacity:.8;font-size:.82rem;margin:.2rem 0 .4rem}" +
      ".fpst-qbtnrow{margin:.6rem 0}" +
      ".fpst-qlist{display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto}" +
      ".fpst-qempty{opacity:.6;font-size:.85rem;padding:8px 2px}" +
      ".fpst-qitem{display:flex;gap:10px;border:1px solid rgba(255,255,255,.1);border-left-width:3px;border-radius:10px;padding:8px}" +
      ".fpst-qitem.is-neu{border-left-color:#ffcf6b}.fpst-qitem.is-geprueft{border-left-color:#6aa0ff}.fpst-qitem.is-verdacht{border-left-color:#ff8080}" +
      ".fpst-qitem>img{width:44px;height:44px;border-radius:7px;object-fit:cover;background:#0e1119;flex:none}" +
      ".fpst-qbody{flex:1;min-width:0}.fpst-qbody b{font-size:.9rem;display:block}.fpst-qbody small{display:block;opacity:.65;font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".fpst-qtop{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:2px}" +
      ".fpst-qnum{font:600 .72rem ui-monospace,monospace;background:rgba(255,255,255,.08);border-radius:5px;padding:1px 6px}" +
      ".fpst-qstatus{font-size:.72rem;opacity:.85}" +
      ".fpst-qact{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}" +
      ".fpst-qbtn{font-size:.76rem;border-radius:7px;padding:5px 9px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#eef1f7;cursor:pointer;text-decoration:none;display:inline-block}" +
      ".fpst-qbtn:hover{border-color:rgba(255,255,255,.5)}.fpst-qbtn.fpst-qbtn--go{background:linear-gradient(180deg,#5fce8f,#2f9d64);border-color:transparent;color:#08160e}" +
      ".fpst-qfoot{margin-top:8px}";
    document.head.appendChild(s);
  }

  /* --------------------------------------------------------------- Init */
  function init() {
    injectCss();
    loadWork();
    capturePrefix();
    wireAccess();
    // Studio startet IMMER geschlossen — nur der Lang-Druck (enterStudio) oeffnet
    // es. KEIN Auto-Oeffnen nach Reload/Hard-Reload, damit Besucher das Panel nie
    // offen vorfinden (Sicherheit: kein Fremdzugriff auf Freigeben/Loeschen).
    try { localStorage.setItem(LS.studio, "0"); } catch (e) {}
  }
  // öffentliche Testfläche (headless-Smoke) — harmlos in Produktion
  window.FPStudio = {
    _t: { serialize: serialize, normEntry: normEntry, safeImg: safeImg, safeUrl: safeUrl, slugify: slugify, buildText: buildText, utf8ToB64: utf8ToB64,
          entryFromRec: entryFromRec, statusLabel: statusLabel, statusClass: statusClass, vecEntries: vecEntries, vecPruefe: vecPruefe,
          setWork: function (a) { WORK = a; }, getWork: function () { return WORK; }, setPrefix: function (p) { filePrefix = p; },
          kopfUndMin: kopfUndMin, setMin: function (n) { MIN_LEISTUNG = klemmeMin(n); }, getMin: function () { return MIN_LEISTUNG; },
          MARKER: MARKER, CFG: CFG },
    open: function () { document.body.classList.add("fpstudio"); openPanel(); },
    close: exitStudio
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

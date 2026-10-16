/*
 * SBKIM — Modul 23b — Netz-Verwaltung (Studio-Bereich, app-agnostisch)
 *
 * S5b Teil 2 (2026-10-16, docs/PLAN_MYCEL_SCHICHTEN.md § S5b, INTERFACES
 * § Modul 23b). Klaus 2026-10-16: „die Widerrufsliste, die Sperrliste und die
 * Listen, wo ich sehen kann, welche Apps innerhalb meines Mycels sind … ein
 * separates Tool innerhalb des Studios".
 *
 * EIN Baustein, drei Orte: Sage (eigene Studio-Seite), family-project und
 * PWA Toolpoint (im vorhandenen Studio). Byte-1:1 kopiert, kein App-Wissen.
 *
 * WORT (Klaus 2026-10-16): in der Oberfläche heißt es „Empfehlen“, nicht mehr
 * „Bürgen“ („bürgen klingt immer so, ich muss jemanden finden, der für mich
 * bürgt"). Im Protokoll und in den Funktionsnamen bleibt es `vouch`.
 *
 * Vier Listen, je mit Suche:
 *   (a) Apps in meinem Mycel — die Einträge des Studios (mit Kennung) plus,
 *       auf Knopfdruck, wer gerade im Raum ist. Je Zeile: Netzadmin ·
 *       verbürgt von … · unverbürgt · gesperrt, dazu das Ablaufdatum.
 *   (b) Meine Bürgschaften — wem, bis wann, „läuft bald ab".
 *   (c) Widerrufe — mit Grund und Datum (eigene und gesehene).
 *   (d) Sperrliste des Netzadmins — mit Stand.
 *
 * Was man tun kann, hängt an der IDENTITÄT DER SEITE: jeder unterschreibt
 * Bürgen, Verlängern, Widerrufen (mit Grund). Sperren und Lösen nur, wenn die
 * eigene Kennung der Netzadmin dieses Netzes ist (Modul 23 currentNetAdmin).
 * „Sperren" widerruft zuerst die eigene Bürgschaft und sperrt danach; schlägt
 * der Widerruf fehl, wird nicht gesperrt.
 *
 * Komponiert NUR Modul 23 (SbkimRendezvous) und, für die Spore-Prüfung bei
 * der Freigabe, Modul 02 (SbkimSpore.verifyForeignSpore). Beim Laden kein
 * Netz: der Raum wird nur auf Knopfdruck gelesen, eine Spore nur auf
 * Knopfdruck geholt. Fremde Namen und Texte gehen nur als Text ins DOM
 * (createElement + textContent, nie innerHTML).
 *
 *   SbkimNetzVerwaltung.mount(container, { entries?, dbSuffix?, lang? })
 *     entries: Array oder () => Array von { label, nodeId?, url? }
 *   SbkimNetzVerwaltung.page(opts)   — als eigene Seite (netz-verwaltung.html)
 *   SbkimNetzVerwaltung.open(opts)   — dasselbe als schwebendes Fenster
 *
 * ⚠ Benannte Grenze: „wer gerade im Raum ist" zeigt nur, wer in diesem
 *   Augenblick eine Seite offen hat. Die dauerhafte Liste sind die Einträge.
 * ⚠ Benannte Grenze: das Verstecken des Studios hält Besucher fern, es
 *   schützt nichts. Geschützt ist das Ändern durch die Unterschrift.
 */
(function (global) {
  "use strict";

  var NV_VERSION = "23b.1";
  var NV_STORE_PREFIX = "sbkim_ausgestellt_";    // eigene ausgestellte Zettel
  var NV_STORE_MAX = 512;
  var NV_DAY = 24 * 3600;
  var NV_WARN_SEC = 30 * NV_DAY;                  // wie Modul 23 RDV_VOUCH_WARN_SEC
  var NV_ID_MUSTER = /^[A-Za-z0-9_-]{16,128}$/;
  var NV_SPORE_BYTES_MAX = 64 * 1024;

  var cfg = { dbSuffix: null, lang: null, entries: null };

  // ---- Sprache: <html lang> oder init({lang}); ohne Eintrag fail-soft Deutsch ----
  var EN = {
    "🕸 Netz-Verwaltung": "🕸 Network admin",
    "Du unterschreibst als": "You sign as",
    "Netzadmin dieses Netzes": "network admin of this network",
    "kein Netzadmin dieses Netzes — Sperren nur lesen": "not the network admin — block list read-only",
    "Noch keine Identität — erst im Netz-Fenster verbinden.": "No identity yet — connect in the network window first.",
    "Modul 23 fehlt — die Netz-Verwaltung kann nichts tun.": "Module 23 missing — network admin can do nothing.",
    "Suchen …": "Search …",
    "Apps in meinem Mycel": "Apps in my mycel",
    "Meine Empfehlungen": "My recommendations",
    "Widerrufe": "Revocations",
    "Sperrliste": "Block list",
    "👥 Wer ist gerade im Raum?": "👥 Who is in the room right now?",
    "Raum wird gelesen …": "Reading the room …",
    "im Raum": "in the room",
    "nicht im Raum": "not in the room",
    "keine Kennung hinterlegt": "no node id on file",
    "Netzadmin": "network admin",
    "gesperrt": "blocked",
    "empfohlen von mir": "recommended by me",
    "empfohlen von ": "recommended by ",
    "eigener Kontakt": "own contact",
    "nicht empfohlen": "not recommended",
    " · bis ": " · until ",
    " · ⏳ läuft bald ab": " · ⏳ expires soon",
    "Empfehlen": "Recommend",
    "Verlängern": "Extend",
    "Widerrufen": "Revoke",
    "Sperren": "Block",
    "Lösen": "Unblock",
    "Grund (Pflicht, höchstens 200 Zeichen)": "Reason (required, at most 200 characters)",
    "Bestätigen": "Confirm",
    "Abbrechen": "Cancel",
    "✓ Unterschrieben. Deine Karte trägt die Empfehlung jetzt im Raum mit; die App nimmt sie von selbst auf. Zur Sicherheit auch als Text:": "✓ Signed. Your card now carries the recommendation in the room; the app picks it up by itself. Also as text, just in case:",
    "📋 Kopieren": "📋 Copy",
    "✓ Kopiert": "✓ Copied",
    "✓ Widerrufen. Die eigene Karte trägt den Widerruf ab jetzt mit.": "✓ Revoked. Your own card carries the revocation from now on.",
    "✓ Gesperrt.": "✓ Blocked.",
    "✓ Gelöst.": "✓ Unblocked.",
    "Noch keine eigenen Empfehlungen.": "No recommendations of your own yet.",
    "Keine Widerrufe.": "No revocations.",
    "Keine gültige Sperrliste.": "No valid block list.",
    "Stand: ": "As of: ",
    " Kennungen": " node ids",
    "Kennung einfügen (für eine App, die nicht in der Liste steht)": "Paste a node id (for an app not in the list)",
    "Keine gültige Kennung.": "Not a valid node id.",
    "Nichts gefunden.": "Nothing found.",
    "von ": "by ",
    " für ": " for ",
    "Grund: ": "Reason: ",
    "gespeichert (gesehen)": "stored (seen)",
    "eigener": "own",
    "„Wer im Raum ist“ zeigt nur, wer gerade eine Seite offen hat. Die dauerhafte Liste sind die Einträge.": "“In the room” only shows who has a page open right now. The lasting list is the entries.",
    "Sperrliste nicht prüfbar (Modul 02 fehlt).": "Block list cannot be checked (module 02 missing).",
    "✕": "✕",
    "von mir widerrufen": "revoked by me",
    "Widerruf zurücknehmen (neu empfehlen)": "Take back the revocation (recommend again)",
    "So empfiehlst du eine App": "How to recommend an app",
    "Diese Seite ist die Netz-Verwaltung dieser App. Sie zeigt, wer im Mycel ist, wen du empfiehlst, welche Widerrufe es gibt und die Sperrliste.": "This page is this app's network admin. It shows who is in the mycel, whom you recommend, which revocations exist, and the block list.",
    "Empfehlen geht aus jeder SBKIM-App, nicht nur hier: im Netz-Fenster (🌐) „👥 Wer ist im Raum?“ → bei der Karte „🤝 Empfehlen“ → die Sicherheitsnummer auf einem zweiten Weg vergleichen (Telefon, persönlich) → „✍ Empfehlung unterschreiben“.": "You can recommend from any SBKIM app, not only here: in the network window (🌐) “👥 Who is in the room?” → on the card “🤝 Recommend” → compare the safety number another way (phone, in person) → “✍ Sign recommendation”.",
    "Hier: „Empfehlen“ in der Zeile der App, oder die Kennung unten einfügen.": "Here: “Recommend” in the app's row, or paste the node id below.",
    "Die Empfehlung kommt von selbst an: deine Karte trägt sie im Raum mit, und die empfohlene App nimmt sie auf, wenn sie „👥 Wer ist im Raum?“ drückt, solange deine Karte frisch ist. Klappt das nicht, gibt es den Text zum Kopieren; die App fügt ihn unter „🤝 Empfehlungen“ ein.": "The recommendation arrives by itself: your card carries it in the room, and the recommended app picks it up when it presses “👥 Who is in the room?” while your card is fresh. If that does not work, there is the text to copy; the app pastes it under “🤝 Recommendations”.",
    "Eine Empfehlung gilt höchstens 180 Tage. Verlängern = neu unterschreiben. Ein Widerruf braucht immer einen Grund; zurücknehmen = neu empfehlen.": "A recommendation lasts at most 180 days. Extend = sign again. A revocation always needs a reason; taking it back = recommending again.",
  };
  function sprache() {
    if (cfg.lang === "de" || cfg.lang === "en") return cfg.lang;
    try {
      var d = global.document;
      var l = String((d && d.documentElement && d.documentElement.lang) || "").slice(0, 2).toLowerCase();
      return l === "en" ? "en" : "de";
    } catch (_e) { return "de"; }
  }
  function T(de) { return (sprache() === "en" && Object.prototype.hasOwnProperty.call(EN, de)) ? EN[de] : de; }

  // ---- Abhängigkeiten (spät aufgelöst, fail-soft) ----
  function rdv() { var r = global.SbkimRendezvous; return (r && typeof r.vouchTrust === "function") ? r : null; }
  function sporeMod() { return global.SbkimSpore || null; }
  function nowSec() { return Math.floor(Date.now() / 1000); }
  function suffix() {
    if (cfg.dbSuffix) return cfg.dbSuffix;
    var s = global.SBKIM_DB_SUFFIX;
    return (typeof s === "string" && s) ? s : null;
  }
  function store() { try { return global.localStorage || null; } catch (_e) { return null; } }

  async function eigeneKennung() {
    var s = sporeMod();
    if (!s || typeof s.getOwnSpore !== "function") return null;
    try { var o = await s.getOwnSpore(); return (o && typeof o.id === "string") ? o.id : null; } catch (_e) { return null; }
  }

  // Wer bin ich in diesem Netz? → { ownId, admin, isAdmin }
  async function role() {
    var r = rdv(), own = await eigeneKennung();
    var admin = (r && typeof r.currentNetAdmin === "function") ? r.currentNetAdmin() : null;
    return { ownId: own, admin: admin || null, isAdmin: !!(own && admin && own === admin) };
  }

  // ---- Eigene ausgestellte Zettel ("sbkim_ausgestellt_" + dbSuffix) ----
  // Nur Ablage. Was daraus angezeigt wird, prüft Modul 23 bei jedem Lesen neu
  // (vouchTrust mit der eigenen Kennung als Wurzel): ein von einer
  // Geschwister-App untergeschobener Zettel ohne gültige Unterschrift zählt nie.
  function ablageSchluessel() { var s = suffix(); return s ? NV_STORE_PREFIX + s : null; }
  function ablageLesen() {
    var st = store(), k = ablageSchluessel(), leer = { v: 1, zettel: [] };
    if (!st || !k) return leer;
    var roh; try { roh = st.getItem(k); } catch (_e) { return leer; }
    var o; try { o = roh ? JSON.parse(roh) : null; } catch (_e) { o = null; }
    if (!o || !Array.isArray(o.zettel)) return leer;
    return { v: 1, zettel: o.zettel.filter(function (z) {
      return z && typeof z === "object" && typeof z.sig === "string" &&
        (z.kind === "sbkim-vouch" || z.kind === "sbkim-vouch-revoke") &&
        typeof z.subject === "string" && typeof z.ts === "number";
    }).slice(0, NV_STORE_MAX) };
  }
  function ablageMerken(z) {
    var st = store(), k = ablageSchluessel();
    if (!st || !k) return { ok: false, reason: "Ohne dbSuffix wird nicht gespeichert (geteilte Adresse)." };
    var o = ablageLesen();
    if (o.zettel.some(function (x) { return x.sig === z.sig; })) return { ok: true };
    o.zettel.unshift(z);
    o.zettel = o.zettel.slice(0, NV_STORE_MAX);
    try { st.setItem(k, JSON.stringify(o)); } catch (e) { return { ok: false, reason: "Speichern fehlgeschlagen: " + (e && e.message ? e.message : e) }; }
    return { ok: true };
  }

  // Eigene Bürgschaften, je subject die neueste GÜLTIGE, von Modul 23 neu geprüft.
  // Jeder Zettel wird EINZELN geprüft (Wurzel = nur die eigene Kennung): eine
  // untergeschobene Fassung mit falscher Unterschrift darf weder zählen noch
  // das angezeigte Ablaufdatum einer echten stellen. (Gefunden 2026-10-16 von
  // Probe V7b: geprüft wurde erst die App, angezeigt dann der neueste Zettel.)
  // ⚠ Benannte Grenze: ist die App selbst eigener Kontakt oder Netzadmin,
  //   meldet Modul 23 „kontakt"/„anker" statt „verbuergt" — sie fehlt dann hier.
  // → [{ subject, exp, ts, bald, zettel }]
  async function issued() {
    var r = rdv(); if (!r) return [];
    var me = await eigeneKennung(); if (!me) return [];
    var alle = ablageLesen().zettel.filter(function (z) { return z.voucher === me; });
    var widerrufe = alle.filter(function (z) { return z.kind === "sbkim-vouch-revoke"; });
    var jetzt = nowSec();
    var kandidaten = alle.filter(function (z) {
      return z.kind === "sbkim-vouch" && typeof z.exp === "number" && z.exp > jetzt;
    }).sort(function (a, b) { return (b.ts - a.ts) || (b.exp - a.exp); });   // neueste zuerst; gleiche Sekunde: längere Frist
    var je = Object.create(null), aus = [];
    for (var i = 0; i < kandidaten.length; i++) {
      var z = kandidaten[i];
      if (je[z.subject]) continue;
      var g = await r.vouchTrust([{ nodeId: z.subject }], { anchors: [me], vouches: [z].concat(widerrufe), contacts: [] });
      var v = g[0] && g[0].vouch;
      if (!v || v.status !== "verbuergt" || !v.by || v.by[v.by.length - 1] !== me) continue;
      je[z.subject] = true;
      aus.push({ subject: z.subject, exp: z.exp, ts: z.ts, bald: z.exp - jetzt <= NV_WARN_SEC, zettel: z });
    }
    return aus.sort(function (a, b) { return a.exp - b.exp; });
  }

  // Widerrufe: eigene (Ablage) und gesehene (Modul 23), je Unterschrift einmal.
  // → [{ voucher, subject, ts, reason, eigen }]
  async function revocations() {
    var r = rdv(); if (!r) return [];
    var me = await eigeneKennung();
    var gesehen = typeof r.loadSeenRevocations === "function" ? r.loadSeenRevocations() : [];
    var eigen = ablageLesen().zettel.filter(function (z) { return z.kind === "sbkim-vouch-revoke" && z.voucher === me; });
    var schon = Object.create(null), aus = [];
    eigen.concat(gesehen).forEach(function (z) {
      if (!z || typeof z.sig !== "string" || schon[z.sig]) return;
      schon[z.sig] = true;
      aus.push({ voucher: String(z.voucher || ""), subject: String(z.subject || ""), ts: z.ts,
        reason: typeof z.reason === "string" ? z.reason : "", eigen: !!(me && z.voucher === me) });
    });
    return aus.sort(function (a, b) { return b.ts - a.ts; });
  }

  async function blocklist() {
    var r = rdv(); if (!r || typeof r.currentBlocklist !== "function") return { stand: "keine", admin: null, ts: 0, ids: [] };
    try { return await r.currentBlocklist(); } catch (_e) { return { stand: "keine", admin: null, ts: 0, ids: [] }; }
  }

  // ---- Handeln (alles mit der eigenen Identität) ----
  async function vouch(nodeId, opts) {
    var r = rdv(); if (!r) return { ok: false, reason: T("Modul 23 fehlt — die Netz-Verwaltung kann nichts tun.") };
    if (typeof nodeId !== "string" || !NV_ID_MUSTER.test(nodeId)) return { ok: false, reason: T("Keine gültige Kennung.") };
    var x = await r.createVouch(nodeId, opts || {});
    if (!x || !x.ok) return x || { ok: false, reason: "?" };
    var m = ablageMerken(x.zettel);
    var weiter = typeof r.vouchPassOn === "function" ? r.vouchPassOn(x.zettel) : [x.zettel];
    return { ok: true, zettel: x.zettel, text: JSON.stringify(weiter), stored: m.ok };
  }
  function extend(nodeId) { return vouch(nodeId, {}); }   // neu unterschreiben, volle Frist
  // Einen eigenen Widerruf zurücknehmen = NEU bürgen. Ein Widerruf lässt sich
  // nicht löschen (andere haben ihn schon gesehen und gespeichert); eine
  // neuere Bürgschaft schlägt ihn aber (Modul 23: ein Widerruf trifft nur
  // Bürgschaften mit ts ≤ Widerruf.ts). In derselben Sekunde gilt noch der
  // Widerruf — darum wird dann um eine Sekunde gewartet.
  async function unrevoke(nodeId) {
    var me = await eigeneKennung();
    var letzter = 0;
    ablageLesen().zettel.forEach(function (z) {
      if (z.kind === "sbkim-vouch-revoke" && z.voucher === me && z.subject === nodeId && z.ts > letzter) letzter = z.ts;
    });
    while (letzter && nowSec() <= letzter) await new Promise(function (r) { setTimeout(r, 250); });
    return vouch(nodeId, {});
  }

  async function revoke(nodeId, reason) {
    var r = rdv(); if (!r) return { ok: false, reason: T("Modul 23 fehlt — die Netz-Verwaltung kann nichts tun.") };
    if (typeof nodeId !== "string" || !NV_ID_MUSTER.test(nodeId)) return { ok: false, reason: T("Keine gültige Kennung.") };
    var x = await r.createRevocation(nodeId, reason);
    if (!x || !x.ok) return x || { ok: false, reason: "?" };
    // Die eigene Karte trägt den Widerruf mit (Modul 23 doAnnounce).
    var c = typeof r.addCarried === "function" ? await r.addCarried(x.zettel) : { ok: false, reason: "addCarried fehlt" };
    if (!c.ok) return { ok: false, reason: c.reason, zettel: x.zettel };
    ablageMerken(x.zettel);
    return { ok: true, zettel: x.zettel };
  }

  // Sperren: nur der Netzadmin. Erst die eigene Bürgschaft widerrufen (falls
  // es eine gibt), dann sperren; ein Fehler beim Widerruf bricht ab.
  async function block(nodeId, reason) {
    var r = rdv(); if (!r) return { ok: false, reason: T("Modul 23 fehlt — die Netz-Verwaltung kann nichts tun.") };
    if (typeof nodeId !== "string" || !NV_ID_MUSTER.test(nodeId)) return { ok: false, reason: T("Keine gültige Kennung.") };
    var ro = await role();
    if (!ro.isAdmin) return { ok: false, reason: "Sperren kann nur der Netzadmin dieses Netzes." };
    var meine = (await issued()).filter(function (b) { return b.subject === nodeId; });
    var widerruf = null;
    if (meine.length) {
      var w = await revoke(nodeId, reason);
      if (!w.ok) return { ok: false, reason: "Widerruf fehlgeschlagen, nicht gesperrt: " + (w.reason || "?") };
      widerruf = w.zettel;
    }
    var s = await r.blockId(nodeId);
    if (!s || !s.ok) return { ok: false, reason: (s && s.reason) || "?", revoked: widerruf };
    return { ok: true, zettel: s.zettel, revoked: widerruf };
  }
  async function unblock(nodeId) {
    var r = rdv(); if (!r) return { ok: false, reason: T("Modul 23 fehlt — die Netz-Verwaltung kann nichts tun.") };
    var b = await blocklist();
    if (b.stand !== "gueltig") return { ok: false, reason: T("Keine gültige Sperrliste.") };
    if (b.ids.indexOf(nodeId) === -1) return { ok: true, schon: true };
    return await r.createBlocklist(b.ids.filter(function (x) { return x !== nodeId; }));
  }

  // ---- Freigabe: die Spore eines Eintrags prüfen (Unterschrift, Kennung passt) ----
  async function checkSpore(spore, expectedId) {
    var s = sporeMod();
    if (!s || typeof s.verifyForeignSpore !== "function") return { ok: false, reason: "Modul 02 fehlt — nicht prüfbar.", status: "nicht-pruefbar" };
    if (!spore || typeof spore !== "object" || typeof spore.id !== "string") return { ok: false, reason: "Keine Spore.", status: "falsch" };
    var v; try { v = await s.verifyForeignSpore(spore); } catch (_e) { v = null; }
    if (!(v === true || (v && v.valid === true))) return { ok: false, reason: "Unterschrift der Spore ungültig.", status: "falsch" };
    if (expectedId && spore.id !== expectedId) return { ok: false, reason: "Die Spore trägt eine andere Kennung als der Eintrag.", status: "andere-kennung", id: spore.id };
    return { ok: true, id: spore.id, status: "gueltig" };
  }
  // Nur auf Knopfdruck (nutzer-ausgelöst): https-Adresse holen, dann prüfen.
  async function fetchSpore(url, expectedId) {
    if (typeof url !== "string" || !/^https:\/\//i.test(url.trim())) return { ok: false, reason: "Nur https-Adressen.", status: "falsch" };
    if (typeof global.fetch !== "function") return { ok: false, reason: "Kein fetch.", status: "nicht-pruefbar" };
    var txt;
    try {
      var res = await global.fetch(url.trim(), { cache: "no-store", credentials: "omit" });
      if (!res.ok) return { ok: false, reason: "HTTP " + res.status, status: "falsch" };
      txt = await res.text();
    } catch (e) { return { ok: false, reason: "Abruf fehlgeschlagen: " + (e && e.message ? e.message : e), status: "nicht-pruefbar" }; }
    if (txt.length > NV_SPORE_BYTES_MAX) return { ok: false, reason: "Spore zu groß.", status: "falsch" };
    var sp; try { sp = JSON.parse(txt); } catch (_e) { return { ok: false, reason: "Keine JSON-Spore.", status: "falsch" }; }
    return await checkSpore(sp, expectedId);
  }

  // ---- Liste (a): Einträge + Raum → Zeilen ----
  // entries: [{label, nodeId?, url?}] · roomCards: Karten aus discover() (mit vouch)
  // → [{ nodeId, label, imRaum, status, by, exp, bald }]
  //   status: "netzadmin" | "gesperrt" | "verbuergt-eigen" | "widerrufen-eigen" |
  //           "verbuergt" | "kontakt" | "unverbuergt" | "ohne-kennung"
  async function rows(entries, roomCards) {
    var r = rdv();
    var ro = await role();
    var meine = await issued();
    var mapMeine = Object.create(null); meine.forEach(function (b) { mapMeine[b.subject] = b; });
    // Von mir widerrufen (und seither nicht neu verbürgt) → „widerrufen", mit Grund.
    var mapWid = Object.create(null);
    if (ro.ownId) ablageLesen().zettel.forEach(function (z) {
      if (z.kind === "sbkim-vouch-revoke" && z.voucher === ro.ownId && (!mapWid[z.subject] || z.ts > mapWid[z.subject].ts)) mapWid[z.subject] = z;
    });
    var raum = Object.create(null);
    (Array.isArray(roomCards) ? roomCards : []).forEach(function (c) {
      if (c && typeof c.nodeId === "string") raum[c.nodeId] = c;
    });
    var aus = [], schon = Object.create(null);
    function zeile(id, label) {
      if (!id) { aus.push({ nodeId: null, label: label, imRaum: false, status: "ohne-kennung", by: [], exp: null, bald: false }); return; }
      if (schon[id]) return; schon[id] = true;
      var c = raum[id], st, by = [];
      var mein = mapMeine[id];
      if (r && typeof r.isBlocked === "function" && r.isBlocked(id)) st = "gesperrt";
      else if (ro.admin && id === ro.admin) st = "netzadmin";
      else if (mein) { st = "verbuergt-eigen"; by = ro.ownId ? [ro.ownId] : []; }
      else if (mapWid[id]) st = "widerrufen-eigen";
      else if (c && c.vouch && c.vouch.status === "verbuergt") { st = "verbuergt"; by = (c.vouch.by || []).slice(); }
      else if (c && c.vouch && c.vouch.status === "kontakt") st = "kontakt";
      else if (c && c.vouch && c.vouch.status === "anker") st = "netzadmin";
      else st = "unverbuergt";
      aus.push({ nodeId: id, label: label || (c && c.nodeName) || "", imRaum: !!c, status: st, by: by,
        exp: mein ? mein.exp : null, bald: mein ? mein.bald : false,
        reason: (st === "widerrufen-eigen") ? String(mapWid[id].reason || "") : null });
    }
    (Array.isArray(entries) ? entries : []).forEach(function (e) {
      if (!e || typeof e !== "object") return;
      var id = (typeof e.nodeId === "string" && NV_ID_MUSTER.test(e.nodeId)) ? e.nodeId : null;
      zeile(id, typeof e.label === "string" ? e.label.slice(0, 120) : "");
    });
    Object.keys(raum).forEach(function (id) { zeile(id, ""); });
    meine.forEach(function (b) { zeile(b.subject, ""); });
    Object.keys(mapWid).forEach(function (id) { zeile(id, ""); });
    return aus;
  }

  // ======================= Oberfläche =======================
  function el(tag, css, text) {
    var d = global.document, n = d.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function knopf(text, fn) {
    var b = el("button", "margin:2px 4px 2px 0;padding:3px 8px;border-radius:6px;border:1px solid #3a4a5a;background:#18222c;color:#e6edf3;cursor:pointer;font:inherit;font-size:12px", text);
    b.type = "button";
    b.addEventListener("click", function (ev) { ev.preventDefault(); fn(b); });
    return b;
  }
  function datum(sec) {
    if (typeof sec !== "number" || !isFinite(sec)) return "";
    var d = new Date(sec * 1000);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function kurz(id) { return id ? (id.length > 14 ? id.slice(0, 6) + "…" + id.slice(-6) : id) : ""; }

  function mount(container, opts) {
    var o = opts || {};
    if (o.dbSuffix) cfg.dbSuffix = o.dbSuffix;
    if (o.lang === "de" || o.lang === "en") cfg.lang = o.lang;
    if (o.entries) cfg.entries = o.entries;
    if (!container || !global.document) return null;
    while (container.firstChild) container.removeChild(container.firstChild);

    var wurzel = el("div", "font:13px/1.45 system-ui,sans-serif;color:#e6edf3;background:#0f161d;border:1px solid #2a3846;border-radius:10px;padding:10px");
    wurzel.setAttribute("data-sbkim-netzverwaltung", NV_VERSION);
    wurzel.appendChild(el("div", "font-weight:600;margin-bottom:4px", T("🕸 Netz-Verwaltung")));
    var wer = el("div", "color:#9fb0c0;margin-bottom:6px", "");
    wurzel.appendChild(wer);
    var hilfe = el("details", "margin:4px 0 8px;color:#c7d2de");
    hilfe.setAttribute("data-nv", "hilfe");
    hilfe.appendChild(el("summary", "cursor:pointer;color:#9be7c4", T("So empfiehlst du eine App")));
    [T("Diese Seite ist die Netz-Verwaltung dieser App. Sie zeigt, wer im Mycel ist, wen du empfiehlst, welche Widerrufe es gibt und die Sperrliste."),
     T("Empfehlen geht aus jeder SBKIM-App, nicht nur hier: im Netz-Fenster (🌐) „👥 Wer ist im Raum?“ → bei der Karte „🤝 Empfehlen“ → die Sicherheitsnummer auf einem zweiten Weg vergleichen (Telefon, persönlich) → „✍ Empfehlung unterschreiben“."),
     T("Hier: „Empfehlen“ in der Zeile der App, oder die Kennung unten einfügen."),
     T("Die Empfehlung kommt von selbst an: deine Karte trägt sie im Raum mit, und die empfohlene App nimmt sie auf, wenn sie „👥 Wer ist im Raum?“ drückt, solange deine Karte frisch ist. Klappt das nicht, gibt es den Text zum Kopieren; die App fügt ihn unter „🤝 Empfehlungen“ ein."),
     T("Eine Empfehlung gilt höchstens 180 Tage. Verlängern = neu unterschreiben. Ein Widerruf braucht immer einen Grund; zurücknehmen = neu empfehlen.")
    ].forEach(function (x) { hilfe.appendChild(el("p", "margin:4px 0", x)); });
    if (o.help !== false) wurzel.appendChild(hilfe);
    var meldung = el("div", "margin:6px 0;white-space:pre-wrap;word-break:break-word", "");
    meldung.setAttribute("data-nv", "meldung");
    var raumKarten = [];

    function eintraege() {
      var e = cfg.entries;
      try { e = (typeof e === "function") ? e() : e; } catch (_e) { e = []; }
      return Array.isArray(e) ? e : [];
    }
    function zeig(text, ok) { meldung.textContent = text || ""; meldung.style.color = ok === false ? "#ff9b9b" : "#9be7c4"; }

    function abschnitt(titel, key) {
      var det = el("details", "margin:6px 0;border-top:1px solid #22303c;padding-top:4px");
      det.open = true;
      det.setAttribute("data-nv", key);
      var sum = el("summary", "cursor:pointer;color:#c7d2de", T(titel));
      det.appendChild(sum);
      var such = el("input", "width:100%;box-sizing:border-box;margin:4px 0;padding:4px 6px;border-radius:6px;border:1px solid #2a3846;background:#0b1117;color:#e6edf3;font:inherit");
      such.type = "search"; such.placeholder = T("Suchen …");
      such.setAttribute("data-nv-suche", key);
      det.appendChild(such);
      var liste = el("div", "");
      liste.setAttribute("data-nv-liste", key);
      det.appendChild(liste);
      such.addEventListener("input", function () { filtern(liste, such.value); });
      return { det: det, liste: liste, such: such, sum: sum };
    }
    function filtern(liste, q) {
      var s = String(q || "").toLowerCase();
      var kinder = liste.children, sichtbar = 0;
      for (var i = 0; i < kinder.length; i++) {
        var k = kinder[i];
        if (k.getAttribute("data-nv-leer") === "1") continue;
        var treffer = !s || String(k.getAttribute("data-nv-text") || k.textContent || "").toLowerCase().indexOf(s) !== -1;
        k.style.display = treffer ? "" : "none";
        if (treffer) sichtbar++;
      }
      return sichtbar;
    }
    function leer(liste, text) { var d = el("div", "color:#8899a8", text); d.setAttribute("data-nv-leer", "1"); liste.appendChild(d); }

    var A = abschnitt("Apps in meinem Mycel", "apps");
    var B = abschnitt("Meine Empfehlungen", "buergschaften");
    var C = abschnitt("Widerrufe", "widerrufe");
    var D = abschnitt("Sperrliste", "sperrliste");

    // Raum lesen — nur auf Knopfdruck (beim Laden kein Netz).
    var raumKnopf = knopf(T("👥 Wer ist gerade im Raum?"), function (b) {
      var r = rdv(); if (!r || typeof r.discover !== "function") return;
      b.disabled = true; zeig(T("Raum wird gelesen …"));
      r.discover().then(function (x) {
        raumKarten = (x && Array.isArray(x.cards)) ? x.cards : [];
        zeig(x && x.ok ? "" : ((x && x.reason) || ""), x && x.ok ? true : false);
        return neu();
      }).catch(function (e) { zeig(String(e && e.message || e), false); })
        .then(function () { b.disabled = false; });
    });
    raumKnopf.setAttribute("data-nv", "raum");
    A.det.insertBefore(raumKnopf, A.such);
    A.det.appendChild(el("div", "color:#8899a8;font-size:11px;margin-top:4px", T("„Wer im Raum ist“ zeigt nur, wer gerade eine Seite offen hat. Die dauerhafte Liste sind die Einträge.")));

    // Freie Kennung (z. B. Sage bürgt für einen Markt, der kein Eintrag ist).
    var frei = el("div", "margin:6px 0");
    var freiFeld = el("input", "width:100%;box-sizing:border-box;padding:4px 6px;border-radius:6px;border:1px solid #2a3846;background:#0b1117;color:#e6edf3;font:inherit");
    freiFeld.placeholder = T("Kennung einfügen (für eine App, die nicht in der Liste steht)");
    freiFeld.setAttribute("data-nv", "frei");
    frei.appendChild(freiFeld);
    frei.appendChild(knopf(T("Empfehlen"), function () {
      var id = String(freiFeld.value || "").trim();
      if (!NV_ID_MUSTER.test(id)) { zeig(T("Keine gültige Kennung."), false); return; }
      tun(vouch(id), "vouch");
    }));
    A.det.appendChild(frei);

    function ergebnisText(text) {
      var box = el("div", "margin:6px 0");
      var ta = el("textarea", "width:100%;box-sizing:border-box;height:70px;font:11px monospace;background:#0b1117;color:#cfe;border:1px solid #2a3846;border-radius:6px");
      ta.readOnly = true; ta.value = text;
      ta.setAttribute("data-nv", "zettel");
      box.appendChild(ta);
      box.appendChild(knopf(T("📋 Kopieren"), function (b) {
        try { global.navigator.clipboard.writeText(text).then(function () { b.textContent = T("✓ Kopiert"); }); }
        catch (_e) { ta.select(); }
      }));
      return box;
    }
    function tun(p, art) {
      zeig("…");
      return Promise.resolve(p).then(function (x) {
        if (!x || !x.ok) { zeig("✗ " + ((x && x.reason) || "?"), false); return neu(); }
        if (art === "vouch") {
          zeig(T("✓ Unterschrieben. Deine Karte trägt die Empfehlung jetzt im Raum mit; die App nimmt sie von selbst auf. Zur Sicherheit auch als Text:"));
          meldung.appendChild(ergebnisText(x.text));
        } else if (art === "revoke") zeig(T("✓ Widerrufen. Die eigene Karte trägt den Widerruf ab jetzt mit."));
        else if (art === "block") zeig(T("✓ Gesperrt."));
        else if (art === "unblock") zeig(T("✓ Gelöst."));
        return neu();
      }).catch(function (e) { zeig("✗ " + (e && e.message ? e.message : e), false); });
    }
    // Grund-Feld für Widerrufen / Sperren (Pflicht).
    function grundFragen(zeileEl, fn) {
      var alt = zeileEl.querySelector ? zeileEl.querySelector("[data-nv=grund]") : null;
      if (alt) return;
      var box = el("div", "margin:4px 0");
      box.setAttribute("data-nv", "grund");
      var f = el("input", "width:100%;box-sizing:border-box;padding:4px 6px;border-radius:6px;border:1px solid #5a4a2a;background:#0b1117;color:#e6edf3;font:inherit");
      f.maxLength = 200; f.placeholder = T("Grund (Pflicht, höchstens 200 Zeichen)");
      f.setAttribute("data-nv", "grund-feld");
      box.appendChild(f);
      box.appendChild(knopf(T("Bestätigen"), function () { fn(String(f.value || "")); }));
      box.appendChild(knopf(T("Abbrechen"), function () { if (box.parentNode) box.parentNode.removeChild(box); }));
      zeileEl.appendChild(box);
    }

    function statusText(z, namen) {
      switch (z.status) {
        case "netzadmin": return T("Netzadmin");
        case "gesperrt": return T("gesperrt");
        case "verbuergt-eigen": return T("empfohlen von mir");
        case "widerrufen-eigen": return T("von mir widerrufen") + (z.reason ? " · " + T("Grund: ") + z.reason : "");
        case "verbuergt": return T("empfohlen von ") + z.by.map(function (b) { return namen[b] || kurz(b); }).join(" → ");
        case "kontakt": return T("eigener Kontakt");
        case "ohne-kennung": return T("keine Kennung hinterlegt");
        default: return T("nicht empfohlen");
      }
    }

    var lauf = 0;
    function neu() {
      var meinLauf = ++lauf;
      return Promise.all([role(), rows(eintraege(), raumKarten), issued(), revocations(), blocklist()]).then(function (x) {
        if (meinLauf !== lauf) return;
        var ro = x[0], zeilen = x[1], meine = x[2], wid = x[3], sp = x[4];
        if (!rdv()) { wer.textContent = T("Modul 23 fehlt — die Netz-Verwaltung kann nichts tun."); }
        else if (!ro.ownId) { wer.textContent = T("Noch keine Identität — erst im Netz-Fenster verbinden."); }
        else wer.textContent = T("Du unterschreibst als") + " " + kurz(ro.ownId) + " · " +
          (ro.isAdmin ? T("Netzadmin dieses Netzes") : T("kein Netzadmin dieses Netzes — Sperren nur lesen"));
        var namen = Object.create(null);
        eintraege().forEach(function (e) { if (e && e.nodeId && e.label) namen[e.nodeId] = String(e.label).slice(0, 60); });
        raumKarten.forEach(function (c) { if (c && c.nodeId && c.nodeName && !namen[c.nodeId]) namen[c.nodeId] = String(c.nodeName).slice(0, 60); });
        if (ro.admin && !namen[ro.admin]) namen[ro.admin] = T("Netzadmin");

        // (a)
        A.liste.textContent = "";
        zeilen.forEach(function (z) {
          var d = el("div", "padding:4px 0;border-bottom:1px solid #1a2530");
          d.setAttribute("data-nv-zeile", z.nodeId || "");
          d.setAttribute("data-nv-status", z.status);
          var kopf = (z.label || namen[z.nodeId] || kurz(z.nodeId)) + (z.nodeId ? "  ·  " + kurz(z.nodeId) : "");
          d.appendChild(el("div", "color:#e6edf3", kopf));
          var info = statusText(z, namen) + (z.exp ? T(" · bis ") + datum(z.exp) : "") + (z.bald ? T(" · ⏳ läuft bald ab") : "") +
            (z.nodeId ? " · " + (z.imRaum ? T("im Raum") : T("nicht im Raum")) : "");
          d.appendChild(el("div", "color:" + (z.status === "gesperrt" ? "#ff9b9b" : z.bald ? "#f5c26b" : "#9fb0c0") + ";font-size:12px", info));
          d.setAttribute("data-nv-text", kopf + " " + info + " " + (z.nodeId || ""));
          if (z.nodeId && ro.ownId && z.nodeId !== ro.ownId && rdv()) {
            var leiste = el("div", "");
            if (z.status === "widerrufen-eigen") {
              leiste.appendChild(knopf(T("Widerruf zurücknehmen (neu empfehlen)"), function () { tun(unrevoke(z.nodeId), "vouch"); }));
            } else if (z.status !== "gesperrt" && z.status !== "netzadmin") {
              leiste.appendChild(knopf(z.status === "verbuergt-eigen" ? T("Verlängern") : T("Empfehlen"), function () {
                tun(z.status === "verbuergt-eigen" ? extend(z.nodeId) : vouch(z.nodeId), "vouch");
              }));
            }
            if (z.status === "verbuergt-eigen") {
              leiste.appendChild(knopf(T("Widerrufen"), function () {
                grundFragen(d, function (g) { tun(revoke(z.nodeId, g), "revoke"); });
              }));
            }
            if (ro.isAdmin && z.status !== "netzadmin") {
              if (z.status === "gesperrt") leiste.appendChild(knopf(T("Lösen"), function () { tun(unblock(z.nodeId), "unblock"); }));
              else leiste.appendChild(knopf(T("Sperren"), function () {
                if (z.status === "verbuergt-eigen") grundFragen(d, function (g) { tun(block(z.nodeId, g), "block"); });
                else tun(block(z.nodeId, ""), "block");
              }));
            }
            d.appendChild(leiste);
          }
          A.liste.appendChild(d);
        });
        if (!zeilen.length) leer(A.liste, T("Nichts gefunden."));
        filtern(A.liste, A.such.value);

        // (b)
        B.liste.textContent = "";
        B.sum.textContent = T("Meine Empfehlungen") + (meine.some(function (b) { return b.bald; }) ? T(" · ⏳ läuft bald ab") : "");
        meine.forEach(function (b) {
          var t = (namen[b.subject] || kurz(b.subject)) + T(" · bis ") + datum(b.exp) + (b.bald ? T(" · ⏳ läuft bald ab") : "");
          var d = el("div", "padding:3px 0;color:" + (b.bald ? "#f5c26b" : "#c7d2de"), t);
          d.setAttribute("data-nv-text", t + " " + b.subject);
          d.setAttribute("data-nv-zeile", b.subject);
          B.liste.appendChild(d);
        });
        if (!meine.length) leer(B.liste, T("Noch keine eigenen Empfehlungen."));
        filtern(B.liste, B.such.value);

        // (c)
        C.liste.textContent = "";
        wid.forEach(function (w) {
          var t = datum(w.ts) + " · " + T("von ") + (namen[w.voucher] || kurz(w.voucher)) + T(" für ") + (namen[w.subject] || kurz(w.subject)) +
            " · " + (w.eigen ? T("eigener") : T("gespeichert (gesehen)"));
          var d = el("div", "padding:3px 0;border-bottom:1px solid #1a2530");
          d.appendChild(el("div", "color:#c7d2de", t));
          d.appendChild(el("div", "color:#9fb0c0;font-size:12px", T("Grund: ") + w.reason));
          d.setAttribute("data-nv-text", t + " " + w.reason + " " + w.voucher + " " + w.subject);
          d.setAttribute("data-nv-zeile", w.subject);
          if (w.eigen && rdv() && !meine.some(function (b) { return b.subject === w.subject; }) &&
              !wid.some(function (x) { return x.eigen && x.subject === w.subject && x.ts > w.ts; })) {
            d.appendChild(knopf(T("Widerruf zurücknehmen (neu empfehlen)"), function () { tun(unrevoke(w.subject), "vouch"); }));
          }
          C.liste.appendChild(d);
        });
        if (!wid.length) leer(C.liste, T("Keine Widerrufe."));
        filtern(C.liste, C.such.value);

        // (d)
        D.liste.textContent = "";
        if (sp.stand === "gueltig") {
          var kopfD = el("div", "color:#9fb0c0;font-size:12px", T("Stand: ") + datum(sp.ts) + " · " + sp.ids.length + T(" Kennungen"));
          kopfD.setAttribute("data-nv-leer", "1");
          D.liste.appendChild(kopfD);
          sp.ids.forEach(function (id) {
            var d = el("div", "padding:2px 0;color:#ff9b9b", (namen[id] ? namen[id] + " · " : "") + id);
            d.setAttribute("data-nv-text", (namen[id] || "") + " " + id);
            d.setAttribute("data-nv-zeile", id);
            if (ro.isAdmin) d.appendChild(knopf(T("Lösen"), function () { tun(unblock(id), "unblock"); }));
            D.liste.appendChild(d);
          });
        } else if (sp.stand === "nicht-pruefbar") leer(D.liste, T("Sperrliste nicht prüfbar (Modul 02 fehlt)."));
        else leer(D.liste, T("Keine gültige Sperrliste."));
        filtern(D.liste, D.such.value);
      }).catch(function (e) { zeig("✗ " + (e && e.message ? e.message : e), false); });
    }

    wurzel.appendChild(meldung);
    [A, B, C, D].forEach(function (x) { wurzel.appendChild(x.det); });
    container.appendChild(wurzel);
    var fertig = neu();
    return { root: wurzel, refresh: neu, ready: fertig };
  }

  // Schwebendes Fenster (für Sage, das kein Markt-Studio hat).
  var fenster = null;
  function open(opts) {
    var d = global.document; if (!d || !d.body) return null;
    if (fenster && fenster.parentNode) { fenster.parentNode.removeChild(fenster); fenster = null; return null; }
    fenster = el("div", "position:fixed;left:50%;transform:translateX(-50%);top:12px;z-index:2147483000;" +
      "width:min(640px,calc(100vw - 16px));max-height:calc(100vh - 24px);overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,.6);border-radius:10px");
    fenster.setAttribute("data-sbkim-studio", "1");
    var zu = el("button", "position:absolute;right:8px;top:6px;z-index:1;background:none;border:0;color:#c7d2de;font-size:16px;cursor:pointer", T("✕"));
    zu.type = "button";
    zu.addEventListener("click", function () { if (fenster && fenster.parentNode) fenster.parentNode.removeChild(fenster); fenster = null; });
    var innen = el("div", "");
    fenster.appendChild(zu); fenster.appendChild(innen);
    d.body.appendChild(fenster);
    return mount(innen, opts);
  }

  // Eigene Seite (Klaus 2026-10-16: „soll eine separate Seite werden … vom
  // Umfang viel zu groß, um einzeln im Studio aufzutauchen"). Die App legt eine
  // kleine netz-verwaltung.html an, die ihre Module 01/02/05b/23 lädt (gleiche
  // Adresse, gleiche Schublade → gleiche Identität wie die App) und dann
  // page({ nodeName, dbSuffix, entries }) ruft. Beim Laden kein Netz.
  async function page(opts) {
    var o = opts || {};
    var d = global.document; if (!d || !d.body) return null;
    var dbs = o.dbSuffix || suffix();
    if (dbs) cfg.dbSuffix = dbs;
    try { if (global.SbkimStorage && typeof global.SbkimStorage.init === "function") await global.SbkimStorage.init({ dbSuffix: dbs }); } catch (_e) { /* fail-soft */ }
    var r = rdv();
    try { if (r && typeof r.init === "function") await r.init({ nodeName: o.nodeName || "SBKIM-Knoten", dbSuffix: dbs }); } catch (_e) { /* fail-soft */ }
    d.body.style.margin = "0";
    d.body.style.background = "#0b1117";
    var huelle = d.getElementById("sbkim-netzverwaltung") || el("div", "");
    huelle.id = "sbkim-netzverwaltung";
    huelle.style.cssText = "max-width:900px;margin:0 auto;padding:12px";
    if (!huelle.parentNode) d.body.appendChild(huelle);
    return mount(huelle, o);
  }

  global.SbkimNetzVerwaltung = {
    version: NV_VERSION,
    mount: mount,
    open: open,
    page: page,
    // Kern (auch für Proben):
    role: role,
    rows: rows,
    issued: issued,
    revocations: revocations,
    blocklist: blocklist,
    vouch: vouch,
    extend: extend,
    unrevoke: unrevoke,
    revoke: revoke,
    block: block,
    unblock: unblock,
    checkSpore: checkSpore,
    fetchSpore: fetchSpore,
    configure: function (o) {
      o = o || {};
      if (o.dbSuffix) cfg.dbSuffix = String(o.dbSuffix);
      if (o.lang === "de" || o.lang === "en") cfg.lang = o.lang;
      if (o.entries) cfg.entries = o.entries;
    },
    _meta: { storePrefix: NV_STORE_PREFIX, storeMax: NV_STORE_MAX, warnSec: NV_WARN_SEC },
  };
})(typeof window !== "undefined" ? window : globalThis);

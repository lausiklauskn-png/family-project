/* ============================================================================
 * Family Projekt — andockbares Status-Widget (LEBT/VERKEHR/FREMD/SIEGEL).
 *
 * Ersetzt die VISIBLE Anzeige des Modul-17-Floating-Widgets durch EIN Element,
 * das Klaus per Maus andocken/lösen kann — keine Doppelung mehr (Klaus
 * 2026-06-27). Modul 17 bleibt geladen (Brief §6b) als Status-Plumbing +
 * Siegel-Proxy (#sbkim-siegel-badge), seine Pille wird in sbkim-init.js
 * versteckt (SbkimWidget.hide()).
 *
 * Zwei Zustände, per Maus umschaltbar:
 *   - DOCKED: kompakt in der Navleiste (#fp-dock), KEIN Minimieren/X.
 *             Mit der Maus nach UNTEN ziehen → löst sich (floating).
 *   - FLOATING: schwebende Pille mit Kopf (– minimieren, ✕ schließen).
 *             Am Kopf greifen und auf die Navleiste ziehen → dockt an.
 *   - CLOSED (✕): kleiner „⊕ Status"-Chip in der Navleiste holt es zurück.
 * Zustand + Position persistiert in localStorage (User-Wahl heilig).
 *
 * Live-Status getrieben von denselben Fenster-Events wie Modul 17:
 *   sbkim:alive · sbkim:postmessage · sbkim:handshake · sbkim:fremd-alert ·
 *   sbkim:siegel-certified. SIEGEL-Klick öffnet das Siegel-Modal (Modul 16)
 *   über einen Proxy-Klick auf #sbkim-siegel-badge.
 * ========================================================================== */
(function (global) {
  "use strict";

  /* ── SPRACHE (Klaus 2026-09-14) ────────────────────────────────────────
   *
   * WARUM HIER UND NICHT IM MODUL. Dieses Widget ERSETZT die sichtbare
   * Modul-17-Pille (SbkimWidget.hide() in sbkim/sbkim-init.js, Klaus
   * 2026-06-27 gegen die Doppelung). Modul 17 spricht seit dem 2026-09-14
   * Deutsch und Englisch — auf family-projekt.de sah das aber NIEMAND: was
   * der Nutzer sieht, sind die Etiketten von hier, und die standen fest im
   * Code. Gemessen headless mit <html lang="en">: „LEBT · VERKEHR · FREMD ·
   * SIEGEL" zwischen englischen Zeilen.
   *
   * App-eigener Klebstoff ist vom Modul-Rollout grundsaetzlich nicht
   * erreichbar — dieselbe Lage wie beim Geraetenamen (NETZWEIT §2).
   *
   * WIE. Byte-gleiches Verfahren wie Modul 16/17/23 UI: SCHLUESSELLOS, der
   * deutsche Satz IST der Schluessel, fail-soft auf Deutsch. Rangfolge hier
   * nur <html lang> — dieses Widget hat kein init({lang}), es wird nicht
   * konfiguriert. Jeder andere Wert faellt auf Deutsch zurueck.
   *
   * ⚠ DIE BEGRIFFE SIND MIT MODUL 17 ABGESTIMMT (alive/traffic/foreign/seal).
   * Zwei Fassungen desselben Wortes liefen auseinander, und dann hiesse
   * dieselbe Lampe im Widget anders als im Modul-Fenster daneben.
   */
  var TEXTE = { en: {
      "LEBT": "ALIVE",
      "VERKEHR": "TRAFFIC",
      "FREMD": "FOREIGN",
      "SIEGEL": "SEAL",
      "SBKIM-Siegel": "SBKIM seal",
      "SBKIM-Siegel ausgestellt": "SBKIM seal issued",
      "SBKIM-Siegel öffnen": "Open the SBKIM seal",
      "Fremdzugriffe ansehen": "View foreign accesses",
      "Schließen": "Close",
      "⊕ Status": "⊕ Status",
      "Status-Widget zurückholen": "Bring the status widget back",
      "Status-Anzeige zurückholen": "Bring the status display back",
    } };

  /* Liest die Sprache bei JEDEM Aufruf. Was schon im DOM steht, wechselt
   * nicht mit — die Leiste wird einmal gebaut. Benannte Grenze, kein Fehler,
   * dieselbe wie bei Modul 17. */
  function T(de) {
    var l = "";
    try { l = (document.documentElement.getAttribute("lang") || "").slice(0, 2).toLowerCase(); } catch (_e) {}
    var tab = TEXTE[l];
    return (tab && Object.prototype.hasOwnProperty.call(tab, de)) ? tab[de] : de;
  }

  var KEY = "fp_widget_state";
  var dock = document.getElementById("fp-dock");
  if (!dock) return;
  var header = document.querySelector("header");

  function loadState() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.mode) return s; } catch (_e) {}
    return { mode: "docked", x: null, y: null, min: false };
  }
  function saveState() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_e) {} }
  var state = loadState();

  // ---- Widget-DOM ----------------------------------------------------------
  var w = document.createElement("span");
  w.className = "fp-sw";
  // Immer dieselbe waagerechte Lampen-Leiste (docked wie floating), kein
  // „Status"-Text. Floating zeigt zusätzlich ein kleines ✕.
  w.innerHTML =
    '<span class="fp-sw-slots">' +
      '<span class="fp-sw-lamp" data-slot="lebt"><i class="dot"></i>' + T("LEBT") + '</span>' +
      '<span class="fp-sw-lamp" data-slot="verkehr"><i class="dot"></i>' + T("VERKEHR") + '</span>' +
      '<span class="fp-sw-lamp" data-slot="fremd"><i class="dot"></i>' + T("FREMD") + '</span>' +
      '<span class="fp-sw-lamp" data-slot="siegel" title="' + T("SBKIM-Siegel") + '"><i class="dot"></i>' + T("SIEGEL") + '</span>' +
    '</span>' +
    '<button type="button" class="fp-sw-x" data-act="close" title="' + T("Schließen") + '" aria-label="' + T("Schließen") + '">✕</button>';

  /* Macht aus einem <span> ein richtiges Bedien-Element (Befund 5.1, 2026-08-01).
   * Die SIEGEL-Lampe und der Zurückhol-Chip waren klickbare <span>-Elemente ohne
   * Tabulator-Halt: per Tastatur kam niemand an sie heran. Gleiche Hilfe wie in
   * assets/app.js — hier eigenständig, weil das Widget ohne app.js läuft.
   * Die Leertaste braucht `preventDefault`, sonst scrollt die Seite weg. */
  function alsKnopf(el, aktion, label) {
    if (!el) return;
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    if (label) el.setAttribute("aria-label", label);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); aktion(e); }
    });
  }

  var restore = document.createElement("span");
  restore.className = "fp-sw-restore";
  restore.textContent = T("⊕ Status");
  restore.title = T("Status-Widget zurückholen");
  restore.style.display = "none";
  restore.addEventListener("click", function () { setMode("docked"); });
  alsKnopf(restore, function () { setMode("docked"); }, T("Status-Anzeige zurückholen"));

  dock.appendChild(w);
  dock.appendChild(restore);

  // ---- Zustand setzen ------------------------------------------------------
  function clampX(x) { return Math.max(8, Math.min(x, (global.innerWidth || 800) - w.offsetWidth - 8)); }
  function clampY(y) { return Math.max(8, Math.min(y, (global.innerHeight || 600) - w.offsetHeight - 8)); }

  function setMode(mode) {
    state.mode = mode;
    w.classList.remove("docked", "floating", "min", "dragging");
    if (mode === "closed") {
      if (w.parentNode) w.parentNode.removeChild(w);
      restore.style.display = "";
      saveState(); return;
    }
    restore.style.display = "none";
    if (mode === "docked") {
      w.style.left = w.style.top = "";
      w.classList.add("docked");
      dock.insertBefore(w, restore);
    } else { // floating
      document.body.appendChild(w);
      w.classList.add("floating");
      var x = state.x == null ? (global.innerWidth - 200) : state.x;
      var y = state.y == null ? 70 : state.y;
      w.style.left = clampX(x) + "px";
      w.style.top = clampY(y) + "px";
    }
    saveState();
  }

  // ---- Schließen (nur floating sichtbar) -----------------------------------
  w.querySelector('[data-act="close"]').addEventListener("click", function (e) {
    e.stopPropagation(); setMode("closed");
  });

  // ---- SIEGEL-Klick öffnet Modul-16-Modal (Proxy-Klick) --------------------
  var siegel = w.querySelector('[data-slot="siegel"]');
  siegel.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); // kein Drag von hier
  function siegelOeffnen() {
    var badge = document.getElementById("sbkim-siegel-badge");
    if (badge) badge.click();
  }
  siegel.addEventListener("click", siegelOeffnen);
  alsKnopf(siegel, siegelOeffnen, T("SBKIM-Siegel öffnen"));

  /* ---- FREMD-Klick öffnet das Fremdzugriff-Fenster (Modul 15) -------------
   * Befund von Klaus, 2026-08-01, im DuckDuckGo-Browser: die FREMD-Lampe stand
   * auf ROT — dieselbe Seite, in Chrome grün. Die Membran hatte also wirklich
   * etwas bemerkt. Nur: **die Lampe ließ sich nicht anklicken.** Der Mauszeiger
   * blieb die Verschiebe-Hand, beim SIEGEL daneben kam der Zeigefinger.
   *
   * Grund: nur die SIEGEL-Lampe hatte einen Handler. FREMD war reine Anzeige.
   * Damit meldete das Widget zwar „hier greift etwas von außen zu", aber der
   * GRUND war für niemanden erreichbar — Modul 15 hält ihn in seinem
   * Fremdzugriff-Fenster bereit und hängt es an den Anker `#lamp-fremd`, den
   * Modul 17 als unsichtbaren Proxy anlegt. Wir haben nur nie dorthin geklickt.
   *
   * Das ist derselbe Mangel-Typ wie Befund 5.1 vom selben Tag: etwas ist
   * sichtbar, aber nicht bedienbar. Eine Warnung, deren Begründung niemand
   * lesen kann, ist eine halbe Warnung.
   *
   * Fail-soft: fehlt der Proxy (Modul 15/17 nicht geladen), passiert nichts —
   * kein Fehler, kein toter Knopf mit falschem Versprechen. Deshalb bekommt die
   * Lampe den Zeigefinger auch nur dann, wenn der Anker wirklich da ist. */
  var fremd = w.querySelector('[data-slot="fremd"]');
  if (fremd) {
    fremd.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); // kein Drag von hier
    var fremdAnker = function () { return document.getElementById("lamp-fremd"); };
    var fremdOeffnen = function () { var a = fremdAnker(); if (a) a.click(); };
    fremd.addEventListener("click", fremdOeffnen);
    alsKnopf(fremd, fremdOeffnen, T("Fremdzugriffe ansehen"));
    /* Der Zeigefinger erscheint erst, wenn es wirklich etwas zu öffnen gibt.
     * Modul 15 hängt seinen Handler beim init() an, also nach uns — deshalb
     * einmal nachsehen, statt sofort zu entscheiden. */
    var zeigefinger = function () { if (fremdAnker()) fremd.style.cursor = "pointer"; };
    zeigefinger();
    global.addEventListener("sbkim:fremd-alert", zeigefinger);
    if (global.setTimeout) global.setTimeout(zeigefinger, 1500);
  }

  // ---- Drag: andocken / lösen ----------------------------------------------
  var drag = null;
  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest("[data-act]")) return;           // ✕ nicht greifen
    drag = { sx: e.clientX, sy: e.clientY, moved: false,
             ox: w.getBoundingClientRect().left, oy: w.getBoundingClientRect().top,
             gx: e.clientX - w.getBoundingClientRect().left, gy: e.clientY - w.getBoundingClientRect().top };
    try { (e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId)); } catch (_e) {}
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  }
  function onMove(e) {
    if (!drag) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && (Math.abs(dx) + Math.abs(dy)) > 5) drag.moved = true;
    if (state.mode === "docked") {
      if (drag.moved && dy > 10) {            // nach unten ziehen → lösen
        setMode("floating"); w.classList.add("dragging");
        var nr = w.getBoundingClientRect();   // Pille mittig unter den Cursor
        drag.gx = nr.width / 2; drag.gy = nr.height / 2;
      } else return;
    }
    if (state.mode === "floating") {
      w.style.left = clampX(e.clientX - drag.gx) + "px";
      w.style.top = Math.max(8, e.clientY - drag.gy) + "px";
      // Über der Navleiste? → Andock-Hinweis
      var hot = header && e.clientY < header.getBoundingClientRect().bottom;
      if (header) header.classList.toggle("fp-dock-hot", !!hot);
    }
  }
  function onUp(e) {
    document.removeEventListener("pointermove", onMove);
    if (header) header.classList.remove("fp-dock-hot");
    w.classList.remove("dragging");
    if (!drag) return;
    if (state.mode === "floating") {
      var overNav = header && e.clientY < header.getBoundingClientRect().bottom;
      if (drag.moved && overNav) { setMode("docked"); }
      else {
        var r = w.getBoundingClientRect();
        state.x = r.left; state.y = r.top; saveState();
      }
    }
    drag = null;
  }
  w.addEventListener("pointerdown", onDown);

  global.addEventListener("resize", function () {
    if (state.mode === "floating") { w.style.left = clampX(parseFloat(w.style.left)) + "px"; w.style.top = clampY(parseFloat(w.style.top)) + "px"; }
  });

  // ---- Live-Status (Event-getrieben) ---------------------------------------
  function lamp(slot, cls) {
    var el = w.querySelector('[data-slot="' + slot + '"]');
    if (!el) return; el.classList.remove("on", "warn"); if (cls) el.classList.add(cls);
  }
  var vkT;
  // VERKEHR-Lampe: bleibt ruhig an, solange der Knoten am Relais lauscht
  // (sbkim:nostr-listening); ein Handschlag/postMessage blitzt kurz auf und
  // kehrt danach in den Lausch-Zustand zurück. Klaus' Befund 2026-06-28: ein
  // bloßer 1,4-s-Blitz ist leicht zu verpassen (man schaut aufs andere Gerät) —
  // die Lampe muss den Lausch-/Verkehrs-Zustand EHRLICH halten (wie Modul 17).
  var verkehrListening = false;
  function flashVerkehr() { lamp("verkehr", "on"); clearTimeout(vkT); vkT = setTimeout(function () { lamp("verkehr", verkehrListening ? "on" : ""); }, 1400); }
  global.addEventListener("sbkim:alive", function () { lamp("lebt", "on"); });
  global.addEventListener("sbkim:postmessage", flashVerkehr);
  global.addEventListener("sbkim:handshake", flashVerkehr);
  global.addEventListener("sbkim:nostr-listening", function (e) {
    verkehrListening = !(e && e.detail && e.detail.active === false);
    lamp("verkehr", verkehrListening ? "on" : "");
  });
  global.addEventListener("sbkim:fremd-alert", function () { lamp("fremd", "warn"); });
  global.addEventListener("sbkim:siegel-certified", function () { lamp("siegel", "on"); var s = w.querySelector('[data-slot="siegel"]'); if (s) s.title = T("SBKIM-Siegel ausgestellt"); });
  setTimeout(function () { lamp("lebt", "on"); }, 1200);   // Spore lebt nach Init

  // ---- Start ---------------------------------------------------------------
  setMode(state.mode === "closed" ? "closed" : (state.mode === "floating" ? "floating" : "docked"));

  global.FPStatusWidget = { setMode: setMode, getState: function () { return state; } };
})(typeof window !== "undefined" ? window : this);

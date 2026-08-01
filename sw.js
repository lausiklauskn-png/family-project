/* Family Projekt — Service-Worker (offline-fähige PWA).
 *
 * App-Schale cache-first (für Offline-Nutzung nach dem ersten Besuch),
 * Netzwerk-Aktualisierung im Hintergrund. FREMD-Origins werden NICHT
 * abgefangen/gecacht — Relais (wss relay.family-projekt.de), Spore-Reads
 * (raw.githubusercontent), Embedding-Modell (HuggingFace) laufen direkt
 * durchs Netz.
 *
 * CACHE-BUST: bei jeder Shell-Änderung CACHE_VERSION erhöhen (oder beim
 * Deploy Hard-Reload), sonst liefert der SW alte Dateien.
 *
 * „Shell-Änderung" heißt JEDE Datei aus CORE — auch reines CSS. Real passiert
 * (2026-07-31): der Melde-Knopf bekam neue Regeln in assets/style.css, die
 * Version blieb auf v65, und im Browser erschien das Melde-Fenster unten im
 * Seitenfluss statt zu schweben, weil `position:fixed` nie ankam. Wer CORE
 * anfasst, erhöht hier. tests/smoke_cache_version.mjs wacht darüber.
 */
var CACHE_VERSION = "family-projekt-v81";
// Versions-Anhang der Asset-Adressen (?v=NN) — MUSS zur Zahl in CACHE_VERSION
// passen und in ALLEN HTML-Seiten identisch stehen.
//
// Grund (Befund 2026-07-31, Ursache korrigiert am 2026-08-01): Nach einem Deploy
// kam die neue markt.html an, die alte assets/style.css aber nicht — der neue
// Melde-Knopf blieb eckig. Ein Service-Worker hilft dagegen nicht, weil der
// HTTP-Cache VOR ihm greift. Nur eine geänderte Adresse hilft.
//
// Die ursprüngliche Erklärung hier lautete „Caddy liefert CSS/JS mit sieben
// Tagen aus" und berief sich auf Caddyfile.example. Am 2026-08-01 am Server
// nachgemessen: diese Regel gab es dort nie. Caddy setzt für CSS/JS GAR KEINEN
// Cache-Header, und dann rät der Browser selbst — üblicherweise ein Zehntel des
// Datei-Alters. Anderer Mechanismus, gleiche Wirkung, gleiche Gegenmaßnahme.
// Merke: eine Vorlage im Repo ist kein Beweis für den Server.
// tests/smoke_cache_version.mjs prüft, dass alles zusammenpasst.
var ASSET_V = "81";
var CORE = [
  "./", "index.html", "netzwerk.html", "werkzeuge.html", "markt.html", "impressum.html", "sicherheit.html",
  // ?v= muss zur ASSET_V unten passen — die Seiten fordern genau diese Adressen an.
  "assets/style.css?v=81", "assets/app.js?v=81", "assets/status-widget.js?v=81",
  "assets/tool-landing.js", "assets/sbkim-siegel-wappen.svg",
  "manifest.json", "icon-192.png", "icon-512.png", "og-image.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  // Promise.allSettled: eine fehlende Datei darf die Installation NICHT kippen.
  //
  // cache:"reload" ist hier entscheidend (Befund 2026-07-31): c.add(url) holt
  // sonst über den normalen HTTP-Cache des Browsers — und legt dann eine ALTE
  // Datei in den frischen Speicher. Real passiert: CACHE_VERSION war korrekt
  // erhöht, trotzdem kam die alte assets/style.css an, und der neue Melde-Knopf
  // blieb eckig. Ein Versions-Sprung allein reicht also nicht; die Dateien
  // müssen ausdrücklich am HTTP-Cache vorbei geholt werden.
  e.waitUntil(caches.open(CACHE_VERSION).then(function (c) {
    return Promise.allSettled(CORE.map(function (u) {
      return c.add(new Request(u, { cache: "reload" }));
    }));
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (_e) { return; }
  if (url.origin !== self.location.origin) return; // Fremd-Origins durchreichen
  // Embedding-Modell (/models/…) NICHT abfangen/cachen: transformers.js
  // pflegt seinen eigenen Modell-Cache, und ein SPA-Fallback (index.html für
  // fehlende Pfade) darf hier nie unter einer Modell-URL zwischengespeichert
  // werden — sonst liest die Bibliothek HTML als JSON. Direkt durchreichen.
  if (url.pathname.indexOf("/models/") === 0) return;

  // Aussehen und Verhalten der Seite ZUERST aus dem Netz (Befund 2026-07-31).
  // Der Rest bleibt cache-first, damit die App offline startet und schnell ist.
  // Grund: cache-first liefert eine geänderte Datei erst beim ZWEITEN Laden aus
  // — bei style.css/app.js sieht man dadurch nach einem Deploy noch den alten
  // Stand. Offline greift der Speicher weiterhin, es geht also nichts verloren.
  // .json ausdrücklich mit drin: das Vektor-Paket (listings-vec.json) ändert
  // sich bei jeder Freigabe und darf NIE aus dem Speicher kommen, sonst sortiert
  // die Suche nach veralteten Vektoren. Beim Test-Bau genau darüber gestolpert.
  var freshFirst = /\/assets\/(style\.css|app\.js)$/.test(url.pathname) ||
                   /\/assets\/config\/[^/]+\.(js|json)$/.test(url.pathname);
  if (freshFirst) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var clone = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var clone = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});

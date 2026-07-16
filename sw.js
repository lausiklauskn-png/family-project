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
 */
var CACHE_VERSION = "family-projekt-v50";
var CORE = [
  "./", "index.html", "netzwerk.html", "werkzeuge.html", "markt.html", "impressum.html", "sicherheit.html",
  "assets/style.css", "assets/app.js", "assets/tool-landing.js", "assets/sbkim-siegel-wappen.svg",
  "manifest.json", "icon-192.png", "icon-512.png", "og-image.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  // Promise.allSettled: eine fehlende Datei darf die Installation NICHT kippen.
  e.waitUntil(caches.open(CACHE_VERSION).then(function (c) {
    return Promise.allSettled(CORE.map(function (u) { return c.add(u); }));
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

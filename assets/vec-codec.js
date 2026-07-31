/* ============================================================================
 * Family Projekt — Vektor-Codec (Stufe 1 der Katalog-Spore).
 *
 * WOZU. Die Bedeutungs-Suche im Marktplatz rechnet die Vektoren aller Einträge
 * heute bei JEDEM Besuch neu (markt.html, embedPassageBatch über alle Karten,
 * nur im Arbeitsspeicher). Bei 14 Einträgen geht das; bei 100 sind es grob 3–8
 * Sekunden pro Besuch, wachsend mit jeder neuen App. Wer sich listen lässt, um
 * gefunden zu werden, verliert genau daran.
 *
 * Die Lösung ist ein vorberechneter Vektor je Eintrag. Damit das keine
 * Riesendatei wird, packt dieser Codec einen 384er-Vektor von 8.025 Bytes
 * (als JSON gemessen an sbkim/spore.json) auf ~530 Bytes — bei 100 Apps also
 * rund 55 KB statt 770 KB.
 *
 * WIE. Symmetrische int8-Quantisierung PRO VEKTOR:
 *     s  = max(|v|) / 127          (ein Faktor je Vektor)
 *     q  = round(v / s)            (ganze Zahlen von -127 bis 127)
 * Beim Lesen wird mit s zurückgerechnet und anschließend auf Länge 1 gebracht.
 * Gemessener Genauigkeitsverlust an echten e5-Vektoren: der Cosinus zwischen
 * Original und zurückgerechnetem Vektor liegt bei 0,99997 bis 0,99999. Für eine
 * Rangfolge ist das ohne Belang; Ränge kippen nur dort, wo der Abstand ohnehin
 * unter ~0,001 lag, also zwischen gleich passenden Einträgen.
 *
 * Pro Vektor, nicht global: Ein gemeinsamer Faktor für alle Einträge würde die
 * Genauigkeit um etwa das Fünfzigfache verschlechtern und spart nur 4 Bytes.
 *
 * WICHTIG für den Aufrufer. Modul 04 (match) ist das reine Skalarprodukt und
 * normalisiert NICHT selbst (04_match.js). decode() liefert deshalb immer einen
 * Float32Array der Länge dim mit Länge 1 — direkt an match() übergebbar.
 *
 * Diese Datei ist die EINZIGE Quelle für encode/decode/textHash. Sie wird von
 * der Leseseite (markt.html), vom Studio (studio-markt.js) und von der
 * Wächter-Aktion gemeinsam genutzt, damit nichts auseinanderläuft.
 * ========================================================================== */
(function (global) {
  "use strict";

  var VERSION = 1;
  var QUANT = "int8-sym-b64";   // Kennung im Katalog-Paket; Umschaltpunkt auf int16

  function bytesToBase64(bytes) {
    var s = "", CH = 0x8000;    // in Blöcken, sonst sprengt apply den Stapel
    for (var i = 0; i < bytes.length; i += CH) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return global.btoa(s);
  }

  function base64ToBytes(b64) {
    var bin = global.atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* Vektor → { s, v }. s = Skalierungsfaktor, v = base64 der int8-Werte.
   * Wirft nur bei offensichtlich falscher Eingabe; ein Null-Vektor ist erlaubt
   * (kommt bei leerem Text vor) und ergibt s = 0. */
  function encode(vec) {
    if (!vec || typeof vec.length !== "number" || vec.length === 0) {
      throw new TypeError("encode: Vektor fehlt oder ist leer");
    }
    var max = 0, i;
    for (i = 0; i < vec.length; i++) {
      var a = Math.abs(vec[i]);
      if (a > max) max = a;
    }
    var s = max / 127;
    var q = new Int8Array(vec.length);
    if (s > 0) {
      for (i = 0; i < vec.length; i++) {
        var r = Math.round(vec[i] / s);
        q[i] = r > 127 ? 127 : (r < -127 ? -127 : r);
      }
    }
    return { s: s, v: bytesToBase64(new Uint8Array(q.buffer, q.byteOffset, q.byteLength)) };
  }

  /* { s, v } → Float32Array(dim), auf Länge 1 gebracht.
   * dim ist Pflicht, damit ein beschädigtes Paket auffällt statt still zu
   * einem Vektor falscher Länge zu führen (den match() klaglos verrechnen
   * würde). Gibt null zurück, wenn das Paket nicht passt — der Aufrufer fällt
   * dann auf die Live-Berechnung zurück (fail-soft). */
  function decode(packed, dim) {
    if (!packed || typeof packed.v !== "string" || typeof packed.s !== "number") return null;
    if (!(dim > 0)) return null;
    var bytes;
    try { bytes = base64ToBytes(packed.v); } catch (_e) { return null; }
    if (bytes.length !== dim) return null;
    var q = new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var out = new Float32Array(dim), i, sum = 0, val;
    for (i = 0; i < dim; i++) { val = q[i] * packed.s; out[i] = val; sum += val * val; }
    var len = Math.sqrt(sum);
    if (!(len > 0) || !isFinite(len)) return null;   // Null-/kaputter Vektor
    for (i = 0; i < dim; i++) out[i] = out[i] / len;
    return out;
  }

  /* Kurzer Hash des Textes, aus dem ein Vektor gebaut wurde (FNV-1a, 32 Bit).
   * Bewusst KEIN SHA-256: das hier ist ein Änderungs-Melder, keine
   * Sicherheitsgrenze (die Katalog-Datei committet Klaus selbst). FNV-1a
   * spart die async/Secure-Context-Abhängigkeit von SubtleCrypto und läuft
   * überall gleich. Arbeitet auf UTF-8-Bytes, damit Umlaute stabil sind. */
  function textHash(str) {
    var s = String(str == null ? "" : str);
    var bytes;
    if (global.TextEncoder) {
      bytes = new global.TextEncoder().encode(s);
    } else {                                   // sehr alter Browser
      var esc = unescape(encodeURIComponent(s));
      bytes = new Uint8Array(esc.length);
      for (var k = 0; k < esc.length; k++) bytes[k] = esc.charCodeAt(k);
    }
    var h = 0x811c9dc5;
    for (var i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }

  global.FPVecCodec = {
    encode: encode,
    decode: decode,
    textHash: textHash,
    _meta: { version: VERSION, quant: QUANT },
  };
})(typeof window !== "undefined" ? window : globalThis);

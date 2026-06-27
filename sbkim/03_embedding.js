/*
 * SBKIM — Modul 03 — Embedding
 *
 * Text → Float32Array(384) via Xenova/multilingual-e5-small (transformers.js).
 * All vectors are L2-normalized so Modul 04 Match can use the dot product
 * as cosine similarity. The e5 role prefix ("query: " / "passage: ") is
 * applied internally — there is no mode parameter.
 *
 * Public surface (registered on window.SbkimEmbedding):
 *   init() -> Promise<void>                          // loads the model (~30 MB on first run)
 *   isReady() -> boolean
 *   embedQuery(text) -> Promise<Float32Array(384)>
 *   embedPassage(text) -> Promise<Float32Array(384)>
 *   embedQueryBatch(texts) -> Promise<Float32Array[]>
 *   embedPassageBatch(texts) -> Promise<Float32Array[]>
 *
 * Self-check: console.info after init() succeeds — not on script load,
 * because the model download is asynchronous. See INTERFACES.md and
 * docs/components/03_embedding.md for the binding spec.
 */
(function (global) {
  "use strict";

  var EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
  var EMBEDDING_DIM = 384;
  var EMBEDDING_MAX_TOKENS = 512;
  var EMBEDDING_QUERY_PREFIX = "query: ";
  var EMBEDDING_PASSAGE_PREFIX = "passage: ";

  // Pinned CDN version so reproducible across browsers / re-installs.
  // Bump in lockstep with a spec note when the e5-small handling changes.
  var TRANSFORMERS_CDN =
    "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

  function makeError(name, message, cause) {
    var e = new Error(message);
    e.name = name;
    if (cause !== undefined) e.cause = cause;
    return e;
  }

  var pipePromise = null;
  var pipe = null;
  var selfCheckEmitted = false;
  var truncateWarned = false;

  function isReady() {
    return pipe !== null;
  }

  function warnTruncateOnce() {
    if (truncateWarned) return;
    truncateWarned = true;
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "MODUL 03 EMBEDDING: Eingabe > " +
        EMBEDDING_MAX_TOKENS +
        " Tokens, abgeschnitten",
      );
    }
  }

  function emitSelfCheckOnce() {
    if (selfCheckEmitted) return;
    selfCheckEmitted = true;
    if (typeof console !== "undefined" && console.info) {
      console.info(
        "MODUL 03 EMBEDDING bereit, Funktionen: " +
        "init/isReady/embedQuery/embedPassage/embedQueryBatch/embedPassageBatch, " +
        "Modell: " + EMBEDDING_MODEL + ", Dim: " + EMBEDDING_DIM,
      );
    }
  }

  function loadTransformers() {
    // Dynamic import works in classic <script> tags as a function call
    // (Top-level await is not needed because we always call this from
    // an async context).
    return import(TRANSFORMERS_CDN).catch(function (err) {
      throw makeError(
        "ModelLoadError",
        "transformers.js-Bibliothek konnte nicht geladen werden (" +
        TRANSFORMERS_CDN + "). Beim ersten Lauf wird Internet benoetigt.",
        err,
      );
    });
  }

  function emitProgress(data) {
    // Pflege 2026-05-28: meldet den Modell-Download-Fortschritt als
    // window-Event, damit UIs (Sage-Andock-Wizard, Modul-18-Wizard) einen
    // Fortschritts-Stand zeigen können statt „lädt ewig" ohne Rückmeldung.
    // Fail-soft + konsumentenfrei (passt zum Event-Bus von Modul 17) — wer
    // nicht lauscht, merkt nichts. transformers.js progress_callback liefert
    // u.a. {status, file, progress(0-100), loaded, total}.
    try {
      if (global && typeof global.dispatchEvent === "function" &&
          typeof global.CustomEvent === "function") {
        global.dispatchEvent(new global.CustomEvent("sbkim:embedding-progress", {
          detail: data,
        }));
      }
    } catch (_e) { /* nb — Render-Hinweis, nie kritisch */ }
  }

  function init() {
    if (pipePromise) return pipePromise.then(function () { /* void */ });
    pipePromise = (async function () {
      var transformers = await loadTransformers();
      var pipeline = transformers.pipeline;
      try {
        var p = await pipeline("feature-extraction", EMBEDDING_MODEL, {
          progress_callback: function (data) { emitProgress(data); },
        });
        pipe = p;
        emitSelfCheckOnce();
        return p;
      } catch (err) {
        // Reset so a retry can attempt again.
        pipePromise = null;
        throw makeError(
          "ModelLoadError",
          "Modell '" + EMBEDDING_MODEL + "' konnte nicht geladen werden: " +
          (err && err.message),
          err,
        );
      }
    })();
    return pipePromise.then(function () { /* void */ });
  }

  function ensureNonEmpty(text, ctx) {
    if (typeof text !== "string" || text.trim().length === 0) {
      throw makeError(
        "EmptyInputError",
        "Leere oder reine Whitespace-Eingabe bei " + ctx + ".",
      );
    }
  }

  function tokenCountOrNull(text) {
    if (!pipe || !pipe.tokenizer) return null;
    try {
      var t = pipe.tokenizer(text);
      if (t && t.input_ids && t.input_ids.dims && t.input_ids.dims.length >= 2) {
        return t.input_ids.dims[1];
      }
    } catch (_e) {
      // Best-effort. If the tokenizer surface changes between
      // transformers.js versions, we silently skip the pre-count.
      return null;
    }
    return null;
  }

  function checkTruncate(prefixedTexts) {
    for (var i = 0; i < prefixedTexts.length; i++) {
      var n = tokenCountOrNull(prefixedTexts[i]);
      if (n !== null && n > EMBEDDING_MAX_TOKENS) {
        warnTruncateOnce();
        return;
      }
    }
  }

  function vectorAt(out, index) {
    // out.data is a Float32Array of length batch * dim; copy out the slice.
    var start = index * EMBEDDING_DIM;
    var end = start + EMBEDDING_DIM;
    return new Float32Array(out.data.slice(start, end));
  }

  async function embedSingle(text, prefix, ctx) {
    ensureNonEmpty(text, ctx);
    if (!pipe) await init();
    var prefixed = prefix + text;
    checkTruncate([prefixed]);
    var out;
    try {
      out = await pipe([prefixed], { pooling: "mean", normalize: true });
    } catch (err) {
      throw makeError(
        "EmbeddingError",
        ctx + " scheiterte: " + (err && err.message),
        err,
      );
    }
    return vectorAt(out, 0);
  }

  async function embedBatch(texts, prefix, ctx) {
    if (!Array.isArray(texts)) {
      throw makeError(
        "EmbeddingError",
        ctx + " erwartet ein Array, bekam: " + typeof texts,
      );
    }
    if (texts.length === 0) return [];
    for (var i = 0; i < texts.length; i++) {
      ensureNonEmpty(texts[i], ctx + "[" + i + "]");
    }
    if (!pipe) await init();
    var prefixed = texts.map(function (t) { return prefix + t; });
    checkTruncate(prefixed);
    var out;
    try {
      out = await pipe(prefixed, { pooling: "mean", normalize: true });
    } catch (err) {
      throw makeError(
        "EmbeddingError",
        ctx + " scheiterte: " + (err && err.message),
        err,
      );
    }
    var result = new Array(texts.length);
    for (var j = 0; j < texts.length; j++) {
      result[j] = vectorAt(out, j);
    }
    return result;
  }

  function embedQuery(text) {
    return embedSingle(text, EMBEDDING_QUERY_PREFIX, "embedQuery");
  }
  function embedPassage(text) {
    return embedSingle(text, EMBEDDING_PASSAGE_PREFIX, "embedPassage");
  }
  function embedQueryBatch(texts) {
    return embedBatch(texts, EMBEDDING_QUERY_PREFIX, "embedQueryBatch");
  }
  function embedPassageBatch(texts) {
    return embedBatch(texts, EMBEDDING_PASSAGE_PREFIX, "embedPassageBatch");
  }

  var SbkimEmbedding = {
    init: init,
    isReady: isReady,
    embedQuery: embedQuery,
    embedPassage: embedPassage,
    embedQueryBatch: embedQueryBatch,
    embedPassageBatch: embedPassageBatch,
    _meta: {
      model: EMBEDDING_MODEL,
      dim: EMBEDDING_DIM,
      maxTokens: EMBEDDING_MAX_TOKENS,
      queryPrefix: EMBEDDING_QUERY_PREFIX,
      passagePrefix: EMBEDDING_PASSAGE_PREFIX,
      transformersCdn: TRANSFORMERS_CDN,
    },
  };

  global.SbkimEmbedding = SbkimEmbedding;

  // No self-check on script load — the model is not yet downloaded.
  // The first successful init() emits the console.info line.
})(typeof window !== "undefined" ? window : globalThis);

/*
 * SBKIM — Modul 04 — Match
 *
 * Skalarprodukt zweier L2-normalisierter Float32Array(384). Bei korrekt
 * normalisierten Eingaben aus Modul 03 ist das identisch zur Cosinus-
 * Aehnlichkeit. Reine Funktion, kein async, kein Zustand.
 *
 * Public surface (registered on window.SbkimMatch):
 *   match(queryVec, passageVec) -> number
 *   isAboveProviderThreshold(score) -> boolean
 *   matchDimensions(queryCap, queryNeeds, passageCap, passageNeeds) -> MatchDimensionsResult
 *   explainMatchLLM(matchResult, apiKey, options?) -> Promise<ExplainResult>
 *   queryLocal(text, k?, options?) -> Promise<Array<{label, score, anchorId}>>
 *   setLocalCorpus(corpus | provider) -> void   (Bau 04.C registriert Korpus-Quelle)
 *   hybridMatch(query, candidates, options?) -> Promise<HybridJudgment>  (Bau 04.D Match-Zeit-Richter)
 *   pickJudgeProvider(options?) -> providerId   (Bau 04.D Anbieter-Wahl, EU-Default)
 *   bidirectionalVerdict(passtA, passtB, rule?) -> boolean   (Bau 04.D streng/großzügig)
 *   PROVIDER_MIN_MATCH -> number   (0.80, gespiegelt aus INTERFACES.md §0)
 *   SCHICHT_MIN_MATCH -> number    (0.60, Bau 04.A, gespiegelt aus INTERFACES.md §0)
 *   DimensionsAllNullError -> ErrorFactory
 *   InvalidApiKeyError -> ErrorFactory       (Bau 04.B sync throw)
 *   InvalidMatchResultError -> ErrorFactory  (Bau 04.B sync throw)
 *   EmptyQueryError -> ErrorFactory          (Bau 04.C sync throw)
 *   QueryTooLongError -> ErrorFactory        (Bau 04.C sync throw)
 *   InvalidKError -> ErrorFactory            (Bau 04.C sync throw)
 *   EmbeddingNotAvailableError -> ErrorFactory (Bau 04.C sync throw)
 *   InvalidCorpusError -> ErrorFactory       (Bau 04.C sync throw)
 *   InvalidCandidatesError -> ErrorFactory   (Bau 04.D sync throw)
 *   InvalidProviderError -> ErrorFactory     (Bau 04.D sync throw)
 *
 * Self-check: emits a console.info line on script load (synchronous,
 * before any call). Modul 04 has no async load step. See INTERFACES.md
 * and docs/components/04_match.md for the binding spec.
 *
 * Bau 04.A `matchDimensions` synchron (2026-05-19): drei orthogonale
 * Schichten (fachlich / prozess / skalierung) gemäß Brief 03 / M04-
 * Erweiterung. In Stufe A sind die drei Schichten eine Heuristik über
 * demselben Embedding-Raum: alle drei ergeben denselben Lane-Cosinus
 * (siehe Karte 04 § Drei-Schichten-Modell „Aufteilung in drei
 * Schichten"). Die echte semantische Differenzierung passiert in
 * Stufe B via `explainMatchLLM` — eigene Folge-Sitzung Bau 04.B.
 * `BridgeProposal` (Brief 03 § Brücken-Feld-Spec) wird NUR von
 * Stufe B befüllt; Bau 04.A liefert `bruecke: null`.
 *
 * Bau 04.B `explainMatchLLM` (2026-05-20): Stufe-B-LLM-Pass gegen
 * Anthropic-API (`https://api.anthropic.com/v1/messages`, hartcodiert),
 * JSON-only-Output, strikte Schema-Validierung, fail-soft.
 * `apiKey` als opaque String vom Aufrufer (Identitäts-Container ist
 * Vision-Anker 5, NICHT Bestandteil dieser Bau-Sitzung). Zwei sync
 * Throws (InvalidApiKeyError + InvalidMatchResultError) als Aufrufer-
 * Validierung; danach alle Fehler-Pfade resolved mit
 * `ExplainResult{available:false, reason:"<deutsch>", fallbackScore:
 * matchResult.overall}` — Aufrufer fällt auf Stufe-A-Resultat zurück.
 * `candidateScope:"netz"` wird still auf `"lokal"` korrigiert
 * (Anti-Missbrauch-Klausel § 8; entfällt erst mit Anker 10/11/12).
 * Spec-Quelle Brief 03 (PR #98) + Karte 04 § Stufe-B-Vertrag.
 *
 * Bau 04.C `queryLocal` (2026-05-26): lokales Such-Feld-Backend.
 * Klaus' Such-Feld-Vision (bidirektionales Cross-Knoten-Matching-Anker).
 * Modul 15 Sub (b) `op:"query"` postMessage-Bridge ruft seit Bau 15.B
 * `SbkimMatch.queryLocal()` fail-soft (typeof-Check) — diese Bau-Sitzung
 * schließt die Lücke, KEIN Code-Update in Modul 15 nötig.
 * Signatur: queryLocal(text, k?, options?) → Promise<Array<{label,score,anchorId}>>.
 * Async (Modul 03 lazy), Default k=5, hartcodierte Schwelle PROVIDER_MIN_MATCH=0.80.
 * Korpus zwei Pfade: options.corpus (Vorrang, Test-Brücken) ODER
 * registrierter Provider via setLocalCorpus(corpus|fn). Embedding via
 * SbkimEmbedding.embedQuery (NICHT embedPassage). Top-k-Cut nach Filter
 * (≥0.80) + Sort. Fünf Fehler-Pfade benannt (EmptyQueryError /
 * QueryTooLongError / InvalidKError / EmbeddingNotAvailableError /
 * InvalidCorpusError); leerer Korpus + alle-unter-Schwelle resolved
 * mit [] ohne Throw. KEIN Netz-Aufruf, KEINE Korpus-Persistierung in
 * Modul 04 (Endknoten-Pflicht). Spec-Quelle Karte 04 § Sub (c) +
 * Tafel-Spec-Pflege Mycel-Vision 2026-05-26.
 *
 * Bau 04.D `hybridMatch` (2026-06-20): Match-Zeit-LLM-Richter, additiv.
 * Hebt den explainMatchLLM-Keim vom Erklärer zum RICHTER über
 * Vorfilter-Kandidaten hoch (docs/HYBRID-MATCH-KONZEPT.md). Drei
 * Eigenschaften: (1) VORFILTER bleibt lokal/server-los (match/queryLocal
 * liefern Kandidaten; deren Default ist UNVERÄNDERT — kein Whitening-Flip,
 * kein Schwellen-Eingriff, das ist der separate Anisotropie-Hebel). (2)
 * RICHTER opt-in: provider-abstrahierter LLM-Pass urteilt pro Kandidat
 * (passt/passt-nicht + Begründung + Score). Anbieter Claude/Mistral/OpenAI/
 * lokal (HYBRID_PROVIDERS), EU-Default "mistral" für DSGVO-Knoten
 * (options.euOnly), BYOK (kein Key im Code). (3) FAIL-SOFT: leerer apiKey
 * (kein opt-in) ODER LLM nicht erreichbar/HTTP-/Schema-Fehler → kein Throw,
 * `available:false` + `fallbackCandidates` (Vorfilter gilt weiter). Zwei
 * sync Throws (InvalidCandidatesError / InvalidProviderError = Aufrufer-
 * Konfig); query.text-Vor-Checks reusen EmptyQueryError / QueryTooLongError.
 * BEZEUGUNG: Erfolg liefert ein signierbares `attestation`-Objekt
 * (kind/judgedAt/provider/region/model + verdicts), das der Aufrufer via
 * Modul 02 signiert in die Inbox legt — Modul 04 signiert NICHT selbst.
 * Bidirektional-Default STRENG ("both", Klaus 2026-06-20) via
 * bidirectionalVerdict-Helfer. KEIN PROTOCOL_VERSION-/DB_VERSION-Bump,
 * KEIN Netz-Default-Aufruf (Empfangsmodus — nur der bewusst konfigurierte
 * Richter-Call).
 */
(function (global) {
  "use strict";

  var EMBEDDING_DIM = 384;
  var PROVIDER_MIN_MATCH = 0.80;
  // Bau 04.A (2026-05-19): pro-Dimension-Schwelle aus § 0 (Brief 03).
  // Eine Schicht unter SCHICHT_MIN_MATCH ist erlaubt (typischer
  // Brücken-Anlass); 2+ Schichten unter SCHICHT_MIN_MATCH triggern
  // Apoptose im Aufrufer (siehe Karte 04 § Schwellen-Vertrag).
  var SCHICHT_MIN_MATCH = 0.60;
  // Bau 04.A: Read-Anker für Tests + Doku-Kommentar im _meta-Block.
  var MATCH_DIMENSIONS_LANES = ["fachlich", "prozess", "skalierung"];

  function makeError(name, message, cause) {
    var e = new Error(message);
    e.name = name;
    if (cause !== undefined) e.cause = cause;
    return e;
  }

  // Bau 04.A: Factory für den synchronen Wurf, wenn alle vier
  // Vektoren null sind. Aufrufer hätte vor dem Aufruf prüfen müssen
  // (siehe Karte 04 § Fehlerverhalten).
  function DimensionsAllNullError(message) {
    return makeError("DimensionsAllNullError", message);
  }

  // Bau 04.B: sync Throws aus explainMatchLLM-Vor-Check.
  function InvalidApiKeyError(message) {
    return makeError("InvalidApiKeyError", message);
  }
  function InvalidMatchResultError(message) {
    return makeError("InvalidMatchResultError", message);
  }

  // Bau 04.C: sync Throws aus queryLocal-Vor-Check. Factory-Stil
  // analog DimensionsAllNullError, deutsch-sprachige Messages.
  function EmptyQueryError(message) {
    return makeError("EmptyQueryError", message);
  }
  function QueryTooLongError(message) {
    return makeError("QueryTooLongError", message);
  }
  function InvalidKError(message) {
    return makeError("InvalidKError", message);
  }
  function EmbeddingNotAvailableError(message) {
    return makeError("EmbeddingNotAvailableError", message);
  }
  function InvalidCorpusError(message) {
    return makeError("InvalidCorpusError", message);
  }

  // Bau 04.B: modul-lokale Konstanten gespiegelt aus § 0 + Karte 04
  // § Stufe-B-Vertrag. Anthropic-API ist hartcodiert (kein Aufrufer-
  // Override; Endpoint-Wechsel wäre eigene Spec-Sitzung).
  var STUFE_B_DEFAULT_MODEL = "claude-sonnet-4";
  var STUFE_B_MAX_TOKENS = 1024;
  var ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
  var ANTHROPIC_API_VERSION = "2023-06-01";
  // Defensiv: Begrenzt LLM-Text-Output vor JSON-Parse (Memory-Schutz
  // bei API-Bugs / pathologischen Outputs).
  var LLM_MAX_OUTPUT_CHARS = 4096;
  var ALLOWED_CANDIDATE_SCOPES = ["lokal", "mailbox", "netz"];
  var ALLOWED_OVERRIDE_RECOMMENDATIONS = ["established", "established-with-bridge", "rejected"];
  var MAX_BEGRUENDUNG_LEN = 200;
  var MAX_ERKLAERUNG_LEN = 600;

  function describe(vec) {
    if (vec === null) return "null";
    if (vec === undefined) return "undefined";
    var ctor = vec && vec.constructor && vec.constructor.name;
    return ctor || typeof vec;
  }

  function assertVector(vec, paramName) {
    if (!(vec instanceof Float32Array)) {
      throw makeError(
        "InvalidVectorError",
        "Parameter '" + paramName + "' muss Float32Array sein, war: " + describe(vec) + ". " +
          "Modul 04 erwartet Vektoren von Modul 03 (Float32Array, Laenge " + EMBEDDING_DIM + ", L2-normalisiert).",
      );
    }
    if (vec.length !== EMBEDDING_DIM) {
      throw makeError(
        "ShapeMismatchError",
        "Parameter '" + paramName + "' hat Laenge " + vec.length + ", erwartet " + EMBEDDING_DIM + ". " +
          "Wahrscheinliche Ursache: Vektor aus anderer Modell-Version. Siehe INTERFACES.md §0 EMBEDDING_DIM.",
      );
    }
  }

  function match(queryVec, passageVec) {
    assertVector(queryVec, "queryVec");
    assertVector(passageVec, "passageVec");
    // Length equality is implied by both being EMBEDDING_DIM. We still
    // guard explicitly in case the constant ever drifts between modules.
    if (queryVec.length !== passageVec.length) {
      throw makeError(
        "ShapeMismatchError",
        "Vektor-Laengen unterscheiden sich: queryVec=" + queryVec.length + ", passageVec=" + passageVec.length + ".",
      );
    }
    var sum = 0;
    for (var i = 0; i < queryVec.length; i++) {
      sum += queryVec[i] * passageVec[i];
    }
    return sum;
  }

  function isAboveProviderThreshold(score) {
    return score >= PROVIDER_MIN_MATCH;
  }

  // Bau 04.A: null-safe wrapper um match(). Returns null, wenn eine
  // Seite null ist; sonst delegiert an match() mit voller Validierung
  // (InvalidVectorError / ShapeMismatchError werden hochgereicht).
  function cosineSafe(a, b) {
    if (a === null || b === null) return null;
    return match(a, b);
  }

  // Bau 04.A: matchDimensions — drei orthogonale Schichten + overall.
  // Berechnung gemäß Karte 04 § Drei-Schichten-Modell:
  //
  //   Lane 1 (queryCap × passageNeeds): A bietet → B sucht.
  //     Berechenbar wenn queryCap != null UND passageNeeds != null.
  //   Lane 2 (queryNeeds × passageCap): A sucht ← B bietet.
  //     Berechenbar wenn queryNeeds != null UND passageCap != null.
  //
  //   availableLanes = Anzahl berechenbarer Lanes ∈ {0, 1, 2}.
  //   Schicht-Score:
  //     beide Lanes berechenbar → Mittelwert der zwei Lane-Cosinus
  //     genau eine Lane → Single-Lane-Wert
  //     keine Lane → null
  //   In Stufe A sind alle drei Schichten (fachlich/prozess/
  //   skalierung) identisch dem Schicht-Score (Heuristik — die echte
  //   Differenzierung kommt in Stufe B / Bau 04.B via explainMatchLLM).
  //   overall = Mittelwert der nicht-null Schichten; in Stufe A also
  //   gleich dem Schicht-Score, weil alle drei identisch sind.
  //
  // Vor-Checks:
  //   alle vier null → DimensionsAllNullError SYNCHRON.
  //   eine Seite vollständig null (queryCap UND queryNeeds null ODER
  //     passageCap UND passageNeeds null) → Nur-Anbieter-Modus:
  //     alle Schichten null, availableLanes:0, kein Throw.
  function matchDimensions(queryCap, queryNeeds, passageCap, passageNeeds) {
    var qCapNull = queryCap === null;
    var qNeedsNull = queryNeeds === null;
    var pCapNull = passageCap === null;
    var pNeedsNull = passageNeeds === null;

    if (qCapNull && qNeedsNull && pCapNull && pNeedsNull) {
      throw DimensionsAllNullError(
        "matchDimensions: alle vier Vektoren null. Aufrufer haette vor dem Aufruf pruefen muessen " +
          "(siehe Karte 04 § Fehlerverhalten + § Drei-Schichten-Modell § Nur-Anbieter-Modus).",
      );
    }

    var qFullNull = qCapNull && qNeedsNull;
    var pFullNull = pCapNull && pNeedsNull;
    if (qFullNull || pFullNull) {
      // Nur-Anbieter-Modus: eine Seite hat gar keine Vektoren.
      // Aufrufer faellt auf match(domainVectorA, domainVectorB) zurueck.
      return {
        fachlich: null,
        prozess: null,
        skalierung: null,
        overall: null,
        availableLanes: 0,
        bruecke: null,
      };
    }

    // Lane-Berechnung. cosineSafe gibt null zurueck, wenn eine Seite null.
    var lane1 = cosineSafe(queryCap, passageNeeds);   // A bietet → B sucht
    var lane2 = cosineSafe(queryNeeds, passageCap);   // A sucht ← B bietet

    var lanes = [];
    if (lane1 !== null) lanes.push(lane1);
    if (lane2 !== null) lanes.push(lane2);
    var availableLanes = lanes.length;

    var schichtScore;
    if (availableLanes === 0) {
      schichtScore = null;
    } else if (availableLanes === 1) {
      schichtScore = lanes[0];
    } else {
      schichtScore = (lanes[0] + lanes[1]) / 2;
    }

    // Stufe-A-Heuristik: alle drei Schichten ergeben denselben
    // Lane-Cosinus (Karte 04 § Drei-Schichten-Modell § „Aufteilung in
    // drei Schichten"). Stufe B (Bau 04.B) liefert die echte
    // Differenzierung via LLM.
    var fachlich = schichtScore;
    var prozess = schichtScore;
    var skalierung = schichtScore;

    // overall = Mittelwert der nicht-null Schichten. Da in Stufe A alle
    // drei Schichten identisch sind, ist overall gleich dem
    // Schicht-Score (oder null, wenn keine Lane berechenbar war).
    var overall = schichtScore;

    return {
      fachlich: fachlich,
      prozess: prozess,
      skalierung: skalierung,
      overall: overall,
      availableLanes: availableLanes,
      bruecke: null,  // Stufe B (Bau 04.B) befüllt das via explainMatchLLM
    };
  }

  // ---- Bau 04.B: explainMatchLLM-Helper ----

  // Sync-Validierung des matchResult (MatchDimensionsResult-Form aus
  // Bau 04.A). Wirft InvalidMatchResultError mit konkreten Hinweis,
  // welches Feld fehlt/falsch ist. Aufrufer-Pflicht: matchResult aus
  // SbkimMatch.matchDimensions(...) ohne Veränderung durchreichen.
  function isNumberOrNull(v) {
    return v === null || (typeof v === "number" && isFinite(v));
  }
  function validateMatchResultShape(matchResult) {
    if (!matchResult || typeof matchResult !== "object" || Array.isArray(matchResult)) {
      throw InvalidMatchResultError(
        "matchResult muss ein Objekt sein (MatchDimensionsResult aus matchDimensions).",
      );
    }
    if (typeof matchResult.availableLanes !== "number" ||
        ![0, 1, 2].includes(matchResult.availableLanes)) {
      throw InvalidMatchResultError(
        "matchResult.availableLanes muss eine Zahl ∈ {0, 1, 2} sein.",
      );
    }
    var laneFields = ["fachlich", "prozess", "skalierung", "overall"];
    for (var i = 0; i < laneFields.length; i++) {
      var f = laneFields[i];
      if (!isNumberOrNull(matchResult[f])) {
        throw InvalidMatchResultError(
          "matchResult." + f + " muss Number oder null sein.",
        );
      }
    }
    // bruecke darf null sein oder ein BridgeProposal-Objekt
    // (Bau 04.A liefert immer null; Bau 04.B's eigener Output ist
    // kein matchResult-Input, sondern ExplainResult — daher hier
    // strikt: bruecke aus matchResult darf nur null sein).
    if (matchResult.bruecke !== null && (typeof matchResult.bruecke !== "object" || Array.isArray(matchResult.bruecke))) {
      throw InvalidMatchResultError(
        "matchResult.bruecke muss null oder ein BridgeProposal-Objekt sein.",
      );
    }
  }

  // Baut die User-Message für die Anthropic-API. Deutscher Prompt mit
  // den vier Schicht-Werten + overall, plus die strikten Anweisungen.
  // Schema-Block aus Karte 04 § Stufe-B-Vertrag wörtlich.
  function buildLlmPrompt(matchResult) {
    function fmt(v) { return v === null ? "null" : v.toFixed(4); }
    var lines = [];
    lines.push("Du bist Stufe B im SBKIM-Protokoll und sollst ein bidirektionales Match zwischen zwei Knoten erklären.");
    lines.push("");
    lines.push("Stufe-A-Resultat:");
    lines.push("- fachlich:   " + fmt(matchResult.fachlich));
    lines.push("- prozess:    " + fmt(matchResult.prozess));
    lines.push("- skalierung: " + fmt(matchResult.skalierung));
    lines.push("- overall:    " + fmt(matchResult.overall));
    lines.push("- availableLanes: " + matchResult.availableLanes);
    lines.push("");
    lines.push("Aufgabe: Differenziere die drei Schichten (fachlich/prozess/skalierung) inhaltlich. Stufe A");
    lines.push("liefert in jeder Schicht denselben Cosinus, weil Stufe A nur über demselben Embedding-Raum");
    lines.push("arbeitet. Du kannst die Schichten semantisch trennen.");
    lines.push("");
    lines.push("Wenn die Schichten zu unterschiedlich sind (z.B. fachlich hoch, prozess niedrig), schlage");
    lines.push("eine Brücke vor: was muss eine Persona zusätzlich bieten oder suchen, damit der Match passt?");
    lines.push("");
    lines.push("Antworte AUSSCHLIESSLICH mit JSON nach folgendem Schema. Kein Prosa-Text drumherum:");
    lines.push("{");
    lines.push("  \"schichten\": {");
    lines.push("    \"fachlich\":   { \"score\": <number in [-1,1]>, \"begruendung\": <string, max " + MAX_BEGRUENDUNG_LEN + " Zeichen> },");
    lines.push("    \"prozess\":    { \"score\": <number in [-1,1]>, \"begruendung\": <string, max " + MAX_BEGRUENDUNG_LEN + " Zeichen> },");
    lines.push("    \"skalierung\": { \"score\": <number in [-1,1]>, \"begruendung\": <string, max " + MAX_BEGRUENDUNG_LEN + " Zeichen> }");
    lines.push("  },");
    lines.push("  \"bruecke\": null | { \"needed\": <string>, \"lookingFor\": <string|null>, \"candidateScope\": \"lokal\"|\"mailbox\"|\"netz\" },");
    lines.push("  \"erklaerung\": <string, max " + MAX_ERKLAERUNG_LEN + " Zeichen>,");
    lines.push("  \"overrideRecommendation\": null | \"established\" | \"established-with-bridge\" | \"rejected\"");
    lines.push("}");
    return lines.join("\n");
  }

  // Sync-Validierung der LLM-Antwort gegen das Karte-04-Schema. Bei
  // Erfolg gibt {result: ExplainResult, reason: null} zurück; bei
  // Mismatch {result: null, reason: "konkreter Hinweis"}.
  // Korrigiert candidateScope:"netz" STILL auf "lokal" (Anti-
  // Missbrauch § 8; KEIN Throw, KEIN Logging — bewusst defensiv).
  function validateLlmResponseSchema(parsedJson, matchResult) {
    if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
      return { result: null, reason: "Antwort ist kein Objekt" };
    }
    var sch = parsedJson.schichten;
    if (!sch || typeof sch !== "object" || Array.isArray(sch)) {
      return { result: null, reason: "Feld 'schichten' fehlt oder ist kein Objekt" };
    }
    var lanes = ["fachlich", "prozess", "skalierung"];
    var normalizedSchichten = {};
    for (var i = 0; i < lanes.length; i++) {
      var lane = lanes[i];
      var laneObj = sch[lane];
      if (!laneObj || typeof laneObj !== "object" || Array.isArray(laneObj)) {
        return { result: null, reason: "schichten." + lane + " fehlt oder ist kein Objekt" };
      }
      var score = laneObj.score;
      if (typeof score !== "number" || !isFinite(score) || score < -1 || score > 1) {
        return { result: null, reason: "schichten." + lane + ".score nicht im Bereich [-1, 1]" };
      }
      var begruendung = laneObj.begruendung;
      if (typeof begruendung !== "string") {
        return { result: null, reason: "schichten." + lane + ".begruendung ist kein String" };
      }
      if (begruendung.length > MAX_BEGRUENDUNG_LEN) {
        return { result: null, reason: "schichten." + lane + ".begruendung > " + MAX_BEGRUENDUNG_LEN + " Zeichen" };
      }
      normalizedSchichten[lane] = { score: score, begruendung: begruendung };
    }

    // bruecke
    var bruecke = null;
    if (parsedJson.bruecke !== null && parsedJson.bruecke !== undefined) {
      var b = parsedJson.bruecke;
      if (typeof b !== "object" || Array.isArray(b)) {
        return { result: null, reason: "bruecke ist kein Objekt oder null" };
      }
      if (typeof b.needed !== "string" || b.needed.length === 0) {
        return { result: null, reason: "bruecke.needed muss nicht-leerer String sein" };
      }
      var lookingFor = b.lookingFor;
      if (lookingFor !== null && lookingFor !== undefined && typeof lookingFor !== "string") {
        return { result: null, reason: "bruecke.lookingFor muss null oder String sein" };
      }
      var candidateScope = b.candidateScope;
      if (typeof candidateScope !== "string" || ALLOWED_CANDIDATE_SCOPES.indexOf(candidateScope) === -1) {
        return { result: null, reason: "bruecke.candidateScope muss 'lokal'|'mailbox'|'netz' sein" };
      }
      // Anti-Missbrauch-Klausel § 8: 'netz' wird still auf 'lokal'
      // korrigiert. Entfällt erst mit Anker 10/11/12.
      if (candidateScope === "netz") {
        candidateScope = "lokal";
      }
      bruecke = {
        needed: b.needed,
        lookingFor: lookingFor === undefined ? null : lookingFor,
        candidateScope: candidateScope,
      };
    }

    // erklaerung
    if (typeof parsedJson.erklaerung !== "string") {
      return { result: null, reason: "erklaerung ist kein String" };
    }
    if (parsedJson.erklaerung.length > MAX_ERKLAERUNG_LEN) {
      return { result: null, reason: "erklaerung > " + MAX_ERKLAERUNG_LEN + " Zeichen" };
    }

    // overrideRecommendation
    var override = parsedJson.overrideRecommendation;
    if (override !== null && override !== undefined) {
      if (typeof override !== "string" || ALLOWED_OVERRIDE_RECOMMENDATIONS.indexOf(override) === -1) {
        return { result: null, reason: "overrideRecommendation muss null oder 'established'|'established-with-bridge'|'rejected' sein" };
      }
    } else {
      override = null;
    }

    return {
      result: {
        schichten: normalizedSchichten,
        bruecke: bruecke,
        erklaerung: parsedJson.erklaerung,
        overrideRecommendation: override,
      },
      reason: null,
    };
  }

  // Bau 04.B: explainMatchLLM — Stufe-B-LLM-Pass gegen Anthropic-API.
  // Fail-soft: nur zwei sync Throws (InvalidApiKeyError +
  // InvalidMatchResultError). Alle anderen Fehlerpfade resolved mit
  // ExplainResult{available:false, reason, fallbackScore}.
  async function explainMatchLLM(matchResult, apiKey, options) {
    // 1. Sync-Vor-Checks. KEIN Promise-Aufbau, vor Netz-Aufruf.
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw InvalidApiKeyError(
        "apiKey muss ein nicht-leerer String sein (Anthropic API-Key, opaque).",
      );
    }
    validateMatchResultShape(matchResult);

    // 2. Options-Defaults.
    var opts = options || {};
    var model = (typeof opts.model === "string" && opts.model.length > 0)
      ? opts.model
      : STUFE_B_DEFAULT_MODEL;
    var maxTokens = (typeof opts.maxTokens === "number" && opts.maxTokens > 0)
      ? opts.maxTokens
      : STUFE_B_MAX_TOKENS;
    var abortSignal = opts.abortSignal || null;

    var fallbackScore = matchResult.overall;

    function failSoft(reason) {
      return {
        available: false,
        reason: reason,
        fallbackScore: fallbackScore,
        model: model,
        tokensUsed: null,
      };
    }

    // 3. Prompt bauen.
    var prompt = buildLlmPrompt(matchResult);

    // 4. fetch() an Anthropic-API. AbortError NICHT abfangen, alle
    //    anderen Fehler fail-soft.
    var fetchOptions = {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    };
    if (abortSignal) fetchOptions.signal = abortSignal;

    var response;
    try {
      response = await fetch(ANTHROPIC_API_URL, fetchOptions);
    } catch (err) {
      // AbortError durchreichen (Standard-DOM-Verhalten).
      if (err && err.name === "AbortError") throw err;
      return failSoft("Netz nicht erreichbar (" + (err && err.message ? err.message : String(err)) + ")");
    }

    // 5. HTTP-Status. 429 sonder-getaggt für Rate-Limit-Hinweis.
    if (!response.ok) {
      if (response.status === 429) {
        return failSoft("API HTTP 429 (Rate-Limit) — Aufrufer-Drossel-Pflicht");
      }
      return failSoft("API HTTP " + response.status + " (" + (response.statusText || "?") + ")");
    }

    // 6. Body JSON parsen.
    var body;
    try {
      body = await response.json();
    } catch (err) {
      return failSoft("Antwort war kein valides JSON");
    }

    // 7. Anthropic-API-Form prüfen.
    if (!body || typeof body !== "object" ||
        !Array.isArray(body.content) || body.content.length === 0 ||
        typeof body.content[0].text !== "string") {
      return failSoft("Antwort entsprach nicht der Anthropic-API-Form");
    }

    // 8. LLM-Text auf LLM_MAX_OUTPUT_CHARS kürzen (Memory-Schutz).
    var llmText = body.content[0].text;
    if (llmText.length > LLM_MAX_OUTPUT_CHARS) {
      llmText = llmText.slice(0, LLM_MAX_OUTPUT_CHARS);
    }

    // 9. LLM-JSON parsen.
    var llmJson;
    try {
      llmJson = JSON.parse(llmText);
    } catch (err) {
      return failSoft("LLM-Output war kein valides JSON");
    }

    // 10. Schema-Validierung + Normalisierung (inkl. netz→lokal-Korrektur).
    var schemaCheck = validateLlmResponseSchema(llmJson, matchResult);
    if (schemaCheck.result === null) {
      return failSoft("Antwort entsprach nicht dem Schema: " + schemaCheck.reason);
    }

    // 11. tokensUsed aus response.usage.input_tokens + output_tokens.
    //     Fail-soft: null wenn API es nicht liefert.
    var tokensUsed = null;
    if (body.usage && typeof body.usage === "object") {
      var inT = body.usage.input_tokens;
      var outT = body.usage.output_tokens;
      if (typeof inT === "number" && typeof outT === "number" && isFinite(inT) && isFinite(outT)) {
        tokensUsed = inT + outT;
      }
    }

    // 12. Erfolg.
    return {
      available: true,
      schichten: schemaCheck.result.schichten,
      bruecke: schemaCheck.result.bruecke,
      erklaerung: schemaCheck.result.erklaerung,
      overrideRecommendation: schemaCheck.result.overrideRecommendation,
      fallbackScore: fallbackScore,
      model: model,
      tokensUsed: tokensUsed,
    };
  }

  // ---- Bau 04.C: queryLocal + Korpus-Provider ----
  //
  // Korpus-Quelle hat zwei Pfade (Karte 04 § Sub (c) § Datenquelle):
  //   1. options.corpus (Vorrang — typisch Test-Brücken, einmaliger Aufruf)
  //   2. registrierter Provider via setLocalCorpus(corpus|fn) (Endknoten-
  //      Andocker ruft das einmal in init() auf)
  // Wer keinen Korpus anbietet, kriegt `[]` zurück (kein Throw — leerer
  // Korpus ist legitim, Endknoten ohne Daten).
  var _localCorpusProvider = null;

  // Validiert ein Korpus-Array gegen das Schema { label, anchorId?,
  // passageVec:Float32Array(384) }. Sync, wirft InvalidCorpusError mit
  // konkretem Hinweis. Wird vor jedem queryLocal-Score-Loop gerufen.
  function validateCorpus(corpus) {
    if (!Array.isArray(corpus)) {
      throw InvalidCorpusError(
        "Korpus muss ein Array sein, war: " + describe(corpus) + ".",
      );
    }
    for (var i = 0; i < corpus.length; i++) {
      var item = corpus[i];
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw InvalidCorpusError(
          "Korpus[" + i + "] muss ein Objekt sein, war: " + describe(item) + ".",
        );
      }
      if (typeof item.label !== "string" || item.label.length === 0) {
        throw InvalidCorpusError(
          "Korpus[" + i + "].label muss nicht-leerer String sein.",
        );
      }
      if (!(item.passageVec instanceof Float32Array)) {
        throw InvalidCorpusError(
          "Korpus[" + i + "].passageVec muss Float32Array sein, war: " + describe(item.passageVec) + ".",
        );
      }
      if (item.passageVec.length !== EMBEDDING_DIM) {
        throw InvalidCorpusError(
          "Korpus[" + i + "].passageVec hat Laenge " + item.passageVec.length +
            ", erwartet " + EMBEDDING_DIM + " (siehe INTERFACES.md §0 EMBEDDING_DIM).",
        );
      }
    }
  }

  // setLocalCorpus akzeptiert ein Array (defensiv kopiert) ODER eine
  // Provider-Funktion (lazy lookup zur queryLocal-Zeit). null/undefined
  // entfernen den Provider. Idempotent — wer mehrmals ruft, überschreibt.
  function setLocalCorpus(corpusOrProvider) {
    if (corpusOrProvider === null || corpusOrProvider === undefined) {
      _localCorpusProvider = null;
      return;
    }
    if (typeof corpusOrProvider === "function") {
      _localCorpusProvider = corpusOrProvider;
      return;
    }
    if (Array.isArray(corpusOrProvider)) {
      // Defensive Kopie auf Array-Ebene (Items selbst bleiben Referenzen —
      // Float32Array kopieren wäre teuer und semantisch unnötig).
      var snapshot = Array.from(corpusOrProvider);
      _localCorpusProvider = function () { return snapshot; };
      return;
    }
    throw InvalidCorpusError(
      "setLocalCorpus erwartet Array, Funktion oder null, war: " + describe(corpusOrProvider) + ".",
    );
  }

  // queryLocal — lokale semantische Such-Funktion. Karte 04 § Sub (c).
  // Async, weil Modul 03 (Embedding) lazy ist (~5–15 s beim ersten
  // Aufruf, danach Cache-Hit). Reihenfolge:
  //   1. Sync-Vor-Checks (Empty/TooLong/InvalidK/EmbeddingNotAvailable).
  //   2. Korpus-Quelle ermitteln (options.corpus | _localCorpusProvider).
  //      InvalidCorpusError sync vor Embedding (Performance + klare
  //      Fehlerquelle).
  //   3. Embedding via SbkimEmbedding.embedQuery (NICHT embedPassage —
  //      Such-Texte sind Anfragen).
  //   4. match() pro Korpus-Eintrag, filter >= PROVIDER_MIN_MATCH, sort
  //      descending, slice(0, k).
  // Returns: leere Liste bei leerem Korpus oder allen Treffern unter
  // Schwelle (kein Throw — Aufrufer interpretiert leere Liste als
  // „keine lokalen Treffer").
  async function queryLocal(text, k, options) {
    // 1. Sync-Vor-Checks.
    if (typeof text !== "string" || text.length === 0) {
      throw EmptyQueryError(
        "queryLocal: 'text' muss nicht-leerer String sein, war: " + describe(text) + ".",
      );
    }
    if (text.length > LLM_MAX_OUTPUT_CHARS) {
      throw QueryTooLongError(
        "queryLocal: 'text' ist " + text.length + " Zeichen lang, max " + LLM_MAX_OUTPUT_CHARS +
          " (defensiv-Schutz gegen pathologische Inputs).",
      );
    }
    var effectiveK = (k === undefined || k === null) ? 5 : k;
    if (typeof effectiveK !== "number" || !isFinite(effectiveK) ||
        effectiveK < 1 || Math.floor(effectiveK) !== effectiveK) {
      throw InvalidKError(
        "queryLocal: 'k' muss Integer >= 1 sein, war: " + describe(k) + ".",
      );
    }
    var embedding = global.SbkimEmbedding;
    if (!embedding || typeof embedding.embedQuery !== "function") {
      throw EmbeddingNotAvailableError(
        "queryLocal: window.SbkimEmbedding.embedQuery fehlt — Modul 03 ist nicht geladen.",
      );
    }

    // 2. Korpus ermitteln (options.corpus hat Vorrang, dann Provider).
    var opts = options || {};
    var corpus;
    if (Object.prototype.hasOwnProperty.call(opts, "corpus") && opts.corpus !== undefined) {
      corpus = opts.corpus;
    } else if (typeof _localCorpusProvider === "function") {
      try {
        corpus = _localCorpusProvider();
      } catch (err) {
        throw InvalidCorpusError(
          "queryLocal: _localCorpusProvider hat geworfen: " + (err && err.message ? err.message : String(err)),
        );
      }
    } else {
      corpus = [];
    }
    validateCorpus(corpus);

    // 3. Leerer Korpus → leere Liste, KEIN Embedding-Call, kein Throw.
    if (corpus.length === 0) return [];

    // 4. Embedding. Modul-03-Fehler werden mit `cause` rethrown.
    var queryVec;
    try {
      queryVec = await embedding.embedQuery(text);
    } catch (err) {
      var failed = makeError(
        "EmbeddingFailedError",
        "queryLocal: SbkimEmbedding.embedQuery hat geworfen: " + (err && err.message ? err.message : String(err)),
        err,
      );
      throw failed;
    }
    if (!(queryVec instanceof Float32Array) || queryVec.length !== EMBEDDING_DIM) {
      throw makeError(
        "EmbeddingFailedError",
        "queryLocal: SbkimEmbedding.embedQuery lieferte unerwartete Form: " + describe(queryVec) +
          " (Laenge " + (queryVec && queryVec.length) + ", erwartet Float32Array(" + EMBEDDING_DIM + ")).",
      );
    }

    // 5. Score + Filter + Sort + Top-k.
    var scored = [];
    for (var i = 0; i < corpus.length; i++) {
      var item = corpus[i];
      var score = match(queryVec, item.passageVec);
      if (score >= PROVIDER_MIN_MATCH) {
        scored.push({
          label: item.label,
          score: score,
          anchorId: (typeof item.anchorId === "string") ? item.anchorId : null,
        });
      }
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, effectiveK);
  }

  // ---- Bau 04.D: Hybrid-Match — Match-Zeit-LLM-Richter (additiv) ----
  //
  // Hebt den vorhandenen Stufe-B-Keim (explainMatchLLM, Erklärer) zum
  // RICHTER über Vorfilter-Kandidaten hoch. Drei Eigenschaften aus
  // docs/HYBRID-MATCH-KONZEPT.md:
  //   1. VORFILTER bleibt lokal + server-los (match() / queryLocal) und
  //      liefert die Kandidaten. Hybrid ändert deren Default NICHT.
  //   2. RICHTER (neu, opt-in): ein provider-abstrahierter LLM-Pass
  //      urteilt über jeden Kandidaten (passt / passt-nicht + Begründung
  //      + Score). Anbieter wählbar (Claude / Mistral / OpenAI / lokal);
  //      EU-Default für DSGVO-Knoten; BYOK (kein hartcodierter Key).
  //   3. FAIL-SOFT: LLM nicht erreichbar ODER kein opt-in (leerer apiKey)
  //      → Vorfilter-Ergebnis gilt weiter, KEIN Throw.
  // Plus BEZEUGUNG: ein signierbares `attestation`-Objekt (Score +
  // Begründung + Anbieter-Marker + Datum), das der Aufrufer in die Inbox
  // legen kann.

  var HYBRID_DEFAULT_MAX_TOKENS = 1024;
  // EU-Default für DSGVO-Knoten (Konzept § Bidirektional / EU-Anbieter).
  var HYBRID_EU_DEFAULT_PROVIDER = "mistral";
  var HYBRID_US_DEFAULT_PROVIDER = "claude";
  // Defensiv: Begrenzt die Kandidaten-Liste pro Richter-Call (Prompt-
  // Größe + Token-Schutz). Aufrufer schneidet die Vorfilter-Finalisten
  // vorher zu — der Richter urteilt über eine kleine Spitzenmenge.
  var HYBRID_MAX_CANDIDATES = 20;
  var MAX_VERDICT_BEGRUENDUNG_LEN = 200;
  // Klaus-Festlegung 2026-06-20 (Bau 04.D): Default-Bidirektional-Regel
  // ist STRENG — ein Paar-Match gilt erst als etabliert, wenn BEIDE
  // Seiten zustimmen. Per Parameter auf "one" (großzügig) stellbar.
  var HYBRID_BIDIRECTIONAL_DEFAULT = "both";

  // Bau 04.D: sync Throws aus hybridMatch-Vor-Check (Aufrufer-Konfig).
  function InvalidCandidatesError(message) {
    return makeError("InvalidCandidatesError", message);
  }
  function InvalidProviderError(message) {
    return makeError("InvalidProviderError", message);
  }

  // Anbieter-Abstraktion. Jeder Adapter weiß, wie er (a) den fetch-Request
  // baut, (b) den Antwort-Text extrahiert, (c) die Token-Zahl liest.
  // Anthropic spricht /v1/messages; Mistral / OpenAI / lokal sprechen das
  // OpenAI-kompatible /chat/completions. KEIN Key hartcodiert — der Key
  // kommt pro Call vom Aufrufer (BYOK).
  function openAiCompatBuild(o) {
    return {
      url: o.url,
      init: {
        method: "POST",
        headers: {
          "authorization": "Bearer " + o.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: o.model,
          max_tokens: o.maxTokens,
          messages: [{ role: "user", content: o.prompt }],
        }),
      },
    };
  }
  function openAiCompatExtractText(body) {
    if (body && Array.isArray(body.choices) && body.choices[0] &&
        body.choices[0].message && typeof body.choices[0].message.content === "string") {
      return body.choices[0].message.content;
    }
    return null;
  }
  function openAiCompatExtractTokens(body) {
    if (body && body.usage && typeof body.usage === "object") {
      var p = body.usage.prompt_tokens, c = body.usage.completion_tokens;
      if (typeof p === "number" && typeof c === "number" && isFinite(p) && isFinite(c)) return p + c;
      if (typeof body.usage.total_tokens === "number" && isFinite(body.usage.total_tokens)) return body.usage.total_tokens;
    }
    return null;
  }

  // Gemini (Google generativelanguage). Eigenes Request-Format (x-goog-api-key,
  // contents/parts, generateContent — Modell steckt im URL-Pfad). Modellnamen
  // ändern sich (alte Namen -> HTTP 404), darum dynamische Auflösung aus dem Konto.
  function geminiBuild(o) {
    var base = String(o.url).replace(/\/+$/, "");
    return {
      url: base + "/" + o.model + ":generateContent",
      init: {
        method: "POST",
        headers: {
          "x-goog-api-key": o.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: o.prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: o.maxTokens },
        }),
      },
    };
  }
  function geminiExtractText(body) {
    if (body && Array.isArray(body.candidates) && body.candidates[0] &&
        body.candidates[0].content && Array.isArray(body.candidates[0].content.parts) &&
        body.candidates[0].content.parts[0] &&
        typeof body.candidates[0].content.parts[0].text === "string") {
      return body.candidates[0].content.parts[0].text;
    }
    return null;
  }
  function geminiExtractTokens(body) {
    if (body && body.usageMetadata &&
        typeof body.usageMetadata.totalTokenCount === "number" &&
        isFinite(body.usageMetadata.totalTokenCount)) {
      return body.usageMetadata.totalTokenCount;
    }
    return null;
  }
  // Fragt EINMAL die Modell-Liste des Kontos ab und nimmt ein verfügbares
  // "flash"-Modell mit generateContent. Überlebt Modell-Wechsel; fester Fallback.
  var _geminiModelCache = null;
  async function geminiResolveModel(apiKey, baseUrl) {
    if (_geminiModelCache) return _geminiModelCache;
    try {
      var r = await fetch(String(baseUrl).replace(/\/+$/, ""), {
        headers: { "x-goog-api-key": apiKey },
      });
      if (r.ok) {
        var d = await r.json();
        var ms = (d && Array.isArray(d.models) ? d.models : []).filter(function (m) {
          return m && Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.indexOf("generateContent") !== -1;
        });
        var nm = function (m) { return String(m.name).replace(/^models\//, ""); };
        var pick = null, i;
        for (i = 0; i < ms.length; i++) {
          if (/flash/i.test(ms[i].name) && !/(thinking|exp|vision|image|tts|live|embedding)/i.test(ms[i].name)) { pick = ms[i]; break; }
        }
        if (!pick) for (i = 0; i < ms.length; i++) { if (/flash/i.test(ms[i].name)) { pick = ms[i]; break; } }
        if (!pick && ms.length) pick = ms[0];
        if (pick) { _geminiModelCache = nm(pick); return _geminiModelCache; }
      }
    } catch (e) { /* offline/CORS -> Fallback */ }
    _geminiModelCache = "gemini-flash-latest";
    return _geminiModelCache;
  }

  var HYBRID_PROVIDERS = {
    claude: {
      label: "Claude (Anthropic)",
      region: "us",
      defaultModel: STUFE_B_DEFAULT_MODEL,
      defaultUrl: ANTHROPIC_API_URL,
      buildRequest: function (o) {
        return {
          url: o.url,
          init: {
            method: "POST",
            headers: {
              "x-api-key": o.apiKey,
              "anthropic-version": ANTHROPIC_API_VERSION,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: o.model,
              max_tokens: o.maxTokens,
              messages: [{ role: "user", content: o.prompt }],
            }),
          },
        };
      },
      extractText: function (body) {
        if (body && Array.isArray(body.content) && body.content[0] &&
            typeof body.content[0].text === "string") {
          return body.content[0].text;
        }
        return null;
      },
      extractTokens: function (body) {
        if (body && body.usage && typeof body.usage === "object") {
          var inT = body.usage.input_tokens, outT = body.usage.output_tokens;
          if (typeof inT === "number" && typeof outT === "number" && isFinite(inT) && isFinite(outT)) {
            return inT + outT;
          }
        }
        return null;
      },
    },
    mistral: {
      label: "Mistral (EU)",
      region: "eu",
      defaultModel: "mistral-small-latest",
      defaultUrl: "https://api.mistral.ai/v1/chat/completions",
      buildRequest: openAiCompatBuild,
      extractText: openAiCompatExtractText,
      extractTokens: openAiCompatExtractTokens,
    },
    openai: {
      label: "OpenAI",
      region: "us",
      defaultModel: "gpt-4o-mini",
      defaultUrl: "https://api.openai.com/v1/chat/completions",
      buildRequest: openAiCompatBuild,
      extractText: openAiCompatExtractText,
      extractTokens: openAiCompatExtractTokens,
    },
    gemini: {
      label: "Gemini (Google, Gratis-Stufe)",
      region: "us",
      defaultModel: "gemini-flash-latest",
      defaultUrl: "https://generativelanguage.googleapis.com/v1beta/models",
      resolveModel: geminiResolveModel,
      buildRequest: geminiBuild,
      extractText: geminiExtractText,
      extractTokens: geminiExtractTokens,
    },
    openrouter: {
      label: "OpenRouter (viele Modelle, auch gratis)",
      region: "us",
      defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
      defaultUrl: "https://openrouter.ai/api/v1/chat/completions",
      buildRequest: openAiCompatBuild,
      extractText: openAiCompatExtractText,
      extractTokens: openAiCompatExtractTokens,
    },
    local: {
      label: "Lokal / selbst-gehostet (OpenAI-kompatibel)",
      region: "local",
      defaultModel: "local-model",
      defaultUrl: null,   // Aufrufer MUSS options.endpoint setzen
      buildRequest: openAiCompatBuild,
      extractText: openAiCompatExtractText,
      extractTokens: openAiCompatExtractTokens,
    },
  };

  // Wählt den Default-Anbieter. DSGVO-Knoten (options.euOnly === true,
  // typisch für europäische Knoten wie BLP) bekommen den EU-Anbieter;
  // sonst Claude. Aufrufer überschreibt jederzeit via options.provider.
  function pickJudgeProvider(options) {
    var opts = options || {};
    if (typeof opts.provider === "string" && opts.provider.length > 0) {
      if (!HYBRID_PROVIDERS[opts.provider]) {
        throw InvalidProviderError(
          "Unbekannter Anbieter '" + opts.provider + "'. Erlaubt: " +
            Object.keys(HYBRID_PROVIDERS).join(" / ") + ".",
        );
      }
      return opts.provider;
    }
    return opts.euOnly === true ? HYBRID_EU_DEFAULT_PROVIDER : HYBRID_US_DEFAULT_PROVIDER;
  }

  // Sync-Validierung der Kandidaten-Liste (Vorfilter-Finalisten). Jeder
  // Kandidat braucht label (anzeigbar) + text (was der Richter inhaltlich
  // beurteilt). cosine/anchorId optional.
  function validateCandidates(candidates) {
    if (!Array.isArray(candidates)) {
      throw InvalidCandidatesError(
        "candidates muss ein Array sein, war: " + describe(candidates) + ".",
      );
    }
    if (candidates.length === 0) {
      throw InvalidCandidatesError(
        "candidates ist leer — der Vorfilter muss mindestens einen Kandidaten liefern, " +
          "bevor der Richter urteilt (sonst gibt es nichts zu beurteilen).",
      );
    }
    if (candidates.length > HYBRID_MAX_CANDIDATES) {
      throw InvalidCandidatesError(
        "candidates hat " + candidates.length + " Einträge, max " + HYBRID_MAX_CANDIDATES +
          ". Aufrufer schneidet die Vorfilter-Finalisten vorher zu (Top-k).",
      );
    }
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (!c || typeof c !== "object" || Array.isArray(c)) {
        throw InvalidCandidatesError(
          "candidates[" + i + "] muss ein Objekt sein, war: " + describe(c) + ".",
        );
      }
      if (typeof c.label !== "string" || c.label.length === 0) {
        throw InvalidCandidatesError(
          "candidates[" + i + "].label muss nicht-leerer String sein.",
        );
      }
      if (typeof c.text !== "string" || c.text.length === 0) {
        throw InvalidCandidatesError(
          "candidates[" + i + "].text muss nicht-leerer String sein (der Richter " +
            "beurteilt den Bedeutungs-Text, nicht nur das Label).",
        );
      }
    }
  }

  // Baut den Richter-Prompt. Deutscher Prompt, nummerierte Kandidaten,
  // JSON-only-Output mit verdicts-Array in derselben Reihenfolge.
  function buildJudgePrompt(queryText, queryLabel, candidates) {
    var lines = [];
    lines.push("Du bist der Match-Richter im SBKIM-Protokoll. Ein Knoten sucht semantische");
    lines.push("Partner. Ein lokaler Vorfilter (Embedding-Cosinus) hat bereits grob gefiltert;");
    lines.push("deine Aufgabe ist das ECHTE Bedeutungs-Urteil über jeden Kandidaten — auch aus");
    lines.push("unsauberem Text. Urteile streng nach inhaltlicher Passung, nicht nach Sprach-");
    lines.push("Oberfläche.");
    lines.push("");
    lines.push("Suchender Knoten" + (queryLabel ? " (" + queryLabel + ")" : "") + " sucht:");
    lines.push(queryText);
    lines.push("");
    lines.push("Kandidaten:");
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      var cosNote = (typeof c.cosine === "number" && isFinite(c.cosine))
        ? " [Vorfilter-Cosinus " + c.cosine.toFixed(3) + "]"
        : "";
      lines.push((i + 1) + ". " + c.label + cosNote + ": " + c.text);
    }
    lines.push("");
    lines.push("Antworte AUSSCHLIESSLICH mit JSON nach diesem Schema, kein Prosa-Text drumherum.");
    lines.push("Das verdicts-Array hat genau " + candidates.length + " Einträge in DERSELBEN");
    lines.push("Reihenfolge wie die Kandidaten oben:");
    lines.push("{");
    lines.push("  \"verdicts\": [");
    lines.push("    { \"passt\": true|false, \"score\": <number in [0,1]>, \"begruendung\": <string, max " + MAX_VERDICT_BEGRUENDUNG_LEN + " Zeichen> }");
    lines.push("  ]");
    lines.push("}");
    return lines.join("\n");
  }

  // Strikte Validierung + Normalisierung der Richter-Antwort. Mappt das
  // verdicts-Array per Index auf die Kandidaten zurück. Bei Mismatch
  // {result:null, reason:"<deutsch>"}.
  function validateJudgeResponseSchema(parsedJson, candidates) {
    if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
      return { result: null, reason: "Antwort ist kein Objekt" };
    }
    var verdicts = parsedJson.verdicts;
    if (!Array.isArray(verdicts)) {
      return { result: null, reason: "Feld 'verdicts' fehlt oder ist kein Array" };
    }
    if (verdicts.length !== candidates.length) {
      return {
        result: null,
        reason: "verdicts-Länge " + verdicts.length + " != Kandidaten-Anzahl " + candidates.length,
      };
    }
    var out = [];
    for (var i = 0; i < verdicts.length; i++) {
      var v = verdicts[i];
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        return { result: null, reason: "verdicts[" + i + "] ist kein Objekt" };
      }
      if (typeof v.passt !== "boolean") {
        return { result: null, reason: "verdicts[" + i + "].passt ist kein Boolean" };
      }
      var score = v.score;
      if (typeof score !== "number" || !isFinite(score) || score < 0 || score > 1) {
        return { result: null, reason: "verdicts[" + i + "].score nicht im Bereich [0, 1]" };
      }
      var begruendung = v.begruendung;
      if (typeof begruendung !== "string") {
        return { result: null, reason: "verdicts[" + i + "].begruendung ist kein String" };
      }
      if (begruendung.length > MAX_VERDICT_BEGRUENDUNG_LEN) {
        return { result: null, reason: "verdicts[" + i + "].begruendung > " + MAX_VERDICT_BEGRUENDUNG_LEN + " Zeichen" };
      }
      var c = candidates[i];
      out.push({
        label: c.label,
        anchorId: (typeof c.anchorId === "string") ? c.anchorId : null,
        passt: v.passt,
        score: score,
        begruendung: begruendung,
        cosine: (typeof c.cosine === "number" && isFinite(c.cosine)) ? c.cosine : null,
      });
    }
    return { result: out, reason: null };
  }

  // hybridMatch — der Match-Zeit-LLM-Richter. Vorfilter-Kandidaten rein,
  // ein bezeugtes Urteil raus. Fail-soft auf allen Pfaden:
  //   - kein/leerer apiKey  → opt-in aus → available:false (Vorfilter gilt)
  //   - LLM nicht erreichbar/HTTP-/Schema-Fehler → available:false
  // KEIN Throw außer Aufrufer-Konfig-Fehlern (Kandidaten-Form / Provider).
  async function hybridMatch(query, candidates, options) {
    // 1. Sync-Vor-Checks (Aufrufer-Konfig — diese werfen bewusst).
    var queryText, queryLabel = null;
    if (typeof query === "string") {
      queryText = query;
    } else if (query && typeof query === "object" && !Array.isArray(query)) {
      queryText = query.text;
      if (typeof query.label === "string" && query.label.length > 0) queryLabel = query.label;
    } else {
      throw EmptyQueryError(
        "hybridMatch: 'query' muss String oder { text, label? } sein, war: " + describe(query) + ".",
      );
    }
    if (typeof queryText !== "string" || queryText.length === 0) {
      throw EmptyQueryError(
        "hybridMatch: query.text muss nicht-leerer String sein.",
      );
    }
    if (queryText.length > LLM_MAX_OUTPUT_CHARS) {
      throw QueryTooLongError(
        "hybridMatch: query.text ist " + queryText.length + " Zeichen, max " + LLM_MAX_OUTPUT_CHARS + ".",
      );
    }
    validateCandidates(candidates);

    var opts = options || {};
    var providerId = pickJudgeProvider(opts);   // wirft InvalidProviderError bei Unfug
    var provider = HYBRID_PROVIDERS[providerId];
    var model = (typeof opts.model === "string" && opts.model.length > 0)
      ? opts.model : provider.defaultModel;
    var maxTokens = (typeof opts.maxTokens === "number" && opts.maxTokens > 0)
      ? opts.maxTokens : HYBRID_DEFAULT_MAX_TOKENS;
    var url = (typeof opts.endpoint === "string" && opts.endpoint.length > 0)
      ? opts.endpoint : provider.defaultUrl;
    var abortSignal = opts.abortSignal || null;
    var apiKey = opts.apiKey;

    // Defensive Kopie der Vorfilter-Kandidaten für den Fail-soft-Pfad
    // (Aufrufer fällt auf die rohe Cosinus-Reihenfolge zurück).
    var fallbackCandidates = candidates.map(function (c) {
      return {
        label: c.label,
        anchorId: (typeof c.anchorId === "string") ? c.anchorId : null,
        cosine: (typeof c.cosine === "number" && isFinite(c.cosine)) ? c.cosine : null,
      };
    });

    function failSoft(reason) {
      return {
        available: false,
        reason: reason,
        provider: providerId,
        model: model,
        region: provider.region,
        judgedAt: null,
        verdicts: null,
        fallbackCandidates: fallbackCandidates,
        tokensUsed: null,
        attestation: null,
      };
    }

    // 2. Opt-in-Gate: kein/leerer Key → Richter ist aus, Vorfilter gilt.
    //    KEIN Throw (Unterschied zu explainMatchLLM) — das IST der
    //    fail-soft-„kein opt-in"-Pfad aus dem Konzept.
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      return failSoft("Richter nicht opt-in (kein apiKey) — Vorfilter-Ergebnis gilt");
    }
    // 3. Lokaler Anbieter ohne Endpoint kann nicht aufgerufen werden.
    if (!url) {
      return failSoft("Anbieter '" + providerId + "' ohne Endpoint (options.endpoint setzen) — Vorfilter-Ergebnis gilt");
    }

    // 3b. Dynamische Modell-Auflösung (z.B. Gemini: Modellnamen ändern sich ->
    //     HTTP 404). Nur wenn der Anbieter einen resolveModel-Hook hat und der
    //     Aufrufer KEIN festes Modell vorgegeben hat. Fail-soft: bei Fehler bleibt
    //     defaultModel.
    if (typeof provider.resolveModel === "function" &&
        !(typeof opts.model === "string" && opts.model.length > 0)) {
      try {
        var resolved = await provider.resolveModel(apiKey, url);
        if (typeof resolved === "string" && resolved.length > 0) model = resolved;
      } catch (e) { /* defaultModel bleibt */ }
    }

    // 4. Prompt + Request bauen.
    var prompt = buildJudgePrompt(queryText, queryLabel, candidates);
    var req = provider.buildRequest({
      url: url, apiKey: apiKey, model: model, maxTokens: maxTokens, prompt: prompt,
    });
    if (abortSignal) req.init.signal = abortSignal;

    // 5. fetch. AbortError durchreichen, alle anderen Fehler fail-soft.
    var response;
    try {
      response = await fetch(req.url, req.init);
    } catch (err) {
      if (err && err.name === "AbortError") throw err;
      return failSoft("Netz nicht erreichbar (" + (err && err.message ? err.message : String(err)) + ")");
    }
    if (!response.ok) {
      if (response.status === 429) {
        return failSoft("API HTTP 429 (Rate-Limit) — Aufrufer-Drossel-Pflicht");
      }
      return failSoft("API HTTP " + response.status + " (" + (response.statusText || "?") + ")");
    }

    // 6. Body parsen + Anbieter-spezifischen Text extrahieren.
    var body;
    try {
      body = await response.json();
    } catch (err) {
      return failSoft("Antwort war kein valides JSON");
    }
    var llmText = provider.extractText(body);
    if (typeof llmText !== "string") {
      return failSoft("Antwort entsprach nicht der Anbieter-API-Form (" + providerId + ")");
    }
    if (llmText.length > LLM_MAX_OUTPUT_CHARS) {
      llmText = llmText.slice(0, LLM_MAX_OUTPUT_CHARS);
    }

    // 7. Richter-JSON parsen + strikt validieren.
    var llmJson;
    try {
      // Manche Anbieter (z.B. Gemini) verpacken JSON in ```-Code-Fences —
      // vor dem Parsen entfernen. Reine-JSON-Antworten bleiben unberührt.
      var cleaned = llmText.replace(/```json/gi, "").replace(/```/g, "").trim();
      llmJson = JSON.parse(cleaned);
    } catch (err) {
      return failSoft("Richter-Output war kein valides JSON");
    }
    var schemaCheck = validateJudgeResponseSchema(llmJson, candidates);
    if (schemaCheck.result === null) {
      return failSoft("Antwort entsprach nicht dem Schema: " + schemaCheck.reason);
    }

    var tokensUsed = provider.extractTokens(body);
    var judgedAt = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD (Bezeugung)

    // 8. BEZEUGUNG: signierbares attestation-Objekt (Anbieter-Marker +
    //    Datum + Urteil-Kern). Der Aufrufer signiert das via Modul 02 und
    //    legt es in die Inbox — Modul 04 signiert NICHT selbst (kein
    //    Identitäts-Zugriff im Match-Modul).
    var attestation = {
      kind: "sbkim-hybrid-match-judgment",
      version: 1,
      judgedAt: judgedAt,
      provider: providerId,
      model: model,
      region: provider.region,
      queryLabel: queryLabel,
      verdicts: schemaCheck.result.map(function (v) {
        return {
          label: v.label,
          anchorId: v.anchorId,
          passt: v.passt,
          score: Number(v.score.toFixed(4)),
          begruendung: v.begruendung,
        };
      }),
    };

    // 9. Erfolg.
    return {
      available: true,
      reason: null,
      provider: providerId,
      model: model,
      region: provider.region,
      judgedAt: judgedAt,
      verdicts: schemaCheck.result,
      fallbackCandidates: fallbackCandidates,
      tokensUsed: tokensUsed,
      attestation: attestation,
    };
  }

  // Bidirektional-Kombinator (Konzept § Bidirektional). Jede Seite urteilt
  // mit ihrer eigenen KI; dieser Helfer kombiniert die zwei booleschen
  // Urteile. Default „both" (streng — beide nötig, Klaus 2026-06-20);
  // „one" = großzügig (eine Seite genügt). Reine Funktion, kein Netz.
  function bidirectionalVerdict(passtA, passtB, rule) {
    var r = (rule === "one" || rule === "both") ? rule : HYBRID_BIDIRECTIONAL_DEFAULT;
    if (typeof passtA !== "boolean" || typeof passtB !== "boolean") {
      throw InvalidCandidatesError(
        "bidirectionalVerdict: passtA und passtB müssen Boolean sein.",
      );
    }
    return r === "both" ? (passtA && passtB) : (passtA || passtB);
  }

  var SbkimMatch = {
    match: match,
    isAboveProviderThreshold: isAboveProviderThreshold,
    matchDimensions: matchDimensions,
    explainMatchLLM: explainMatchLLM,
    queryLocal: queryLocal,
    setLocalCorpus: setLocalCorpus,
    hybridMatch: hybridMatch,
    pickJudgeProvider: pickJudgeProvider,
    bidirectionalVerdict: bidirectionalVerdict,
    PROVIDER_MIN_MATCH: PROVIDER_MIN_MATCH,
    SCHICHT_MIN_MATCH: SCHICHT_MIN_MATCH,
    DimensionsAllNullError: DimensionsAllNullError,
    InvalidApiKeyError: InvalidApiKeyError,
    InvalidMatchResultError: InvalidMatchResultError,
    EmptyQueryError: EmptyQueryError,
    QueryTooLongError: QueryTooLongError,
    InvalidKError: InvalidKError,
    EmbeddingNotAvailableError: EmbeddingNotAvailableError,
    InvalidCorpusError: InvalidCorpusError,
    InvalidCandidatesError: InvalidCandidatesError,
    InvalidProviderError: InvalidProviderError,
    _meta: {
      embeddingDim: EMBEDDING_DIM,
      providerMinMatch: PROVIDER_MIN_MATCH,
      schichtMinMatch: SCHICHT_MIN_MATCH,
      matchDimensionsLanes: MATCH_DIMENSIONS_LANES.slice(),
      stufeBDefaultModel: STUFE_B_DEFAULT_MODEL,
      stufeBMaxTokens: STUFE_B_MAX_TOKENS,
      anthropicApiUrl: ANTHROPIC_API_URL,
      anthropicApiVersion: ANTHROPIC_API_VERSION,
      queryLocalDefaultK: 5,
      queryLocalMaxTextLen: LLM_MAX_OUTPUT_CHARS,
      get localCorpusRegistered() { return typeof _localCorpusProvider === "function"; },
      // Bau 04.D Hybrid-Match (Richter) Read-Anker.
      hybridProviders: Object.keys(HYBRID_PROVIDERS).map(function (id) {
        return { id: id, label: HYBRID_PROVIDERS[id].label, region: HYBRID_PROVIDERS[id].region };
      }),
      hybridEuDefaultProvider: HYBRID_EU_DEFAULT_PROVIDER,
      hybridUsDefaultProvider: HYBRID_US_DEFAULT_PROVIDER,
      hybridMaxCandidates: HYBRID_MAX_CANDIDATES,
      hybridBidirectionalDefault: HYBRID_BIDIRECTIONAL_DEFAULT,
    },
  };

  global.SbkimMatch = SbkimMatch;

  // Self-check: emitted on script load (synchronous, no async load step).
  // Format is uniform across all SBKIM modules — see INTERFACES.md.
  // Bau 04.A erweitert die Funktions-Liste um matchDimensions; Schwellen-
  // Block nennt PROVIDER_MIN_MATCH und SCHICHT_MIN_MATCH.
  if (typeof console !== "undefined" && console.info) {
    console.info(
      "MODUL 04 MATCH bereit, Funktionen: match/isAboveProviderThreshold/matchDimensions/explainMatchLLM/queryLocal/hybridMatch, " +
        "Schwellen: PROVIDER_MIN_MATCH=" + PROVIDER_MIN_MATCH +
        ", SCHICHT_MIN_MATCH=" + SCHICHT_MIN_MATCH,
    );
  }
})(typeof window !== "undefined" ? window : globalThis);

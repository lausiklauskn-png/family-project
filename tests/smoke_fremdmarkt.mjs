/* Wächter über die GEFUNDENEN Mess-Ziele (SEO-Plan S8a, 2026-09-21).
 *
 *   node tests/smoke_fremdmarkt.mjs
 *
 * Der Befund: PWA Toolpoint misst nicht selbst, es HOLT die Zahlen aus
 * `forschung/messreihe.json`. Ein Eintrag, der nur dort steht, wird nie
 * gemessen — und seine Detailseite bleibt leer, also genau die dünne Seite,
 * gegen die der ganze Plan gebaut ist. Nachgezählt am 2026-09-21: von 29
 * Einträgen traf das **einen** (`eigen-kim-hub-company`). Morgen trifft es
 * jeden fremden Eintrag, den Klaus dort freigibt.
 *
 * ⚠ GEMESSEN WIRD MIT GESTELLTEN LAGEN, nicht nur am Bestand. Die echte
 * Datenlage deckt heute weder ein Schaufenster noch eine doppelte Kennung noch
 * einen unerreichbaren Markt ab — und genau die sind die Fälle, an denen so
 * etwas still schiefgeht.
 *
 * ⚠ UND DER LETZTE ABSCHNITT MISST DEN ECHTEN LAUF, nicht den Quelltext. Ein
 * Wächter auf „die Zeile steht in der Datei" wäre auch dann grün, wenn das
 * Ergebnis danach weggeworfen wird. */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fremdeZiele, bekannteKennungen, FREMDMAERKTE } from "../tools/lib/fremdmarkt.mjs";
import { reihenfolge } from "../tools/messung.mjs";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0, offen = 0;
const ok = (b, t, h) => { if (b) { pass++; console.log("  ✓", t); }
                          else { fail++; console.log("  ✗", t, h ? "→ " + h : ""); } };
const still = (t) => { offen++; console.log("  ⊘", t); };

const WEG = fs.mkdtempSync(path.join(os.tmpdir(), "fp-fremdmarkt-"));
const stelleListe = (name, eintraege) => {
  const p = path.join(WEG, name + ".js");
  fs.writeFileSync(p, "window.PT_LISTINGS = " + JSON.stringify(eintraege, null, 1) + ";\n", "utf8");
  return p;
};
const markt = (datei, extra = {}) =>
  [{ markt: "Testmarkt", global: "PT_LISTINGS", nachbarn: [datei],
     netz: "https://example.invalid/liste.js", ...extra }];

/* ── 1 · Wer misst schon? Die Menge, die NICHT angefasst wird ─────────────── */
console.log("── Wer misst schon ──");
{
  const ziele = [{ id: "eigen-a", aktiv: true }, { id: "eigen-aus", aktiv: false }];
  const quelle = 'window.FP_LISTINGS = [{ anchorId: "markt-b" }, { anchorId: "markt-c" }];';
  const b = bekannteKennungen({ ziele, marktQuelle: quelle });
  ok(b.has("eigen-a"), "ein aktives eigenes Ziel zählt als „misst schon jemand“");

  /* Der Kern dieses Abschnitts. Ein abgeschaltetes Ziel trägt eine
     Entscheidung MIT Begründung; ein gefundenes Ziel, das sie still wieder
     anschaltet, wäre der leiseste Weg, sie zurückzunehmen. */
  ok(b.has("eigen-aus"), "ein ABGESCHALTETES eigenes Ziel ebenso — es wird nicht still wieder angeschaltet");
  ok(b.has("markt-b") && b.has("markt-c"), "und jeder Eintrag des eigenen Marktplatzes");

  let gesagt = "";
  const kaputt = bekannteKennungen({ ziele, marktQuelle: "das ist kein JavaScript {{{",
                                     log: (t) => { gesagt += t; } });
  ok(kaputt.has("eigen-a") && kaputt.size === 2,
     "ein unlesbarer Marktplatz macht die Menge KLEINER statt den Lauf kaputt", String(kaputt.size));
  ok(/nicht lesbar/.test(gesagt), "… und es wird gesagt, statt still übergangen", gesagt || "(nichts gesagt)");
}

/* ── 2 · Das Finden, an gestellten Lagen ──────────────────────────────────── */
console.log("\n── Gefunden wird, was niemand misst ──");
{
  const datei = stelleListe("normal", [
    { anchorId: "fremd-neu", label: "Fremd Neu", url: "https://beispiel.test/neu/" },
    { anchorId: "eigen-a", label: "Schon bekannt", url: "https://beispiel.test/alt/" },
    { anchorId: "fremd-schaufenster", label: "Mit Schaufenster",
      url: "https://beispiel.test/laden/", appUrl: "https://beispiel.test/laden/app/" },
    { anchorId: "", label: "Ohne Kennung", url: "https://beispiel.test/x/" },
    { anchorId: "fremd-ohne-url", label: "Ohne Adresse", url: "" },
    { anchorId: "fremd-http", label: "Nur http", url: "http://beispiel.test/y/" },
    { anchorId: "fremd-neu", label: "Noch einmal dieselbe Kennung", url: "https://beispiel.test/doppelt/" }
  ]);
  const z = await fremdeZiele({ bekannt: new Set(["eigen-a"]), maerkte: markt(datei) });
  const ids = z.map((x) => x.id);

  ok(ids.includes("fremd-neu"), "ein Eintrag, den niemand misst, wird gefunden", ids.join(","));
  ok(!ids.includes("eigen-a"), "ein Eintrag, den schon jemand misst, wird übersprungen", ids.join(","));
  ok(!ids.includes(""), "ein Eintrag ohne Kennung wird übersprungen — keine geratene Kennung");
  ok(!ids.includes("fremd-ohne-url"), "ein Eintrag ohne Adresse ebenso");
  ok(!ids.includes("fremd-http"), "und eine Adresse ohne https ebenso", ids.join(","));
  ok(ids.filter((x) => x === "fremd-neu").length === 1,
     "dieselbe Kennung zweimal ergibt EIN Ziel, nicht zwei", ids.join(","));

  /* Gemessen wird dieselbe Adresse, die auch der eigene Marktplatz-Lauf
     messen würde: bei einem Schaufenster die APP (Klaus 2026-08-02). Sonst
     stünde bei einem Eintrag die Bewertung einer Landingpage neben der
     Bewertung der Apps aller anderen. */
  const sf = z.find((x) => x.id === "fremd-schaufenster");
  ok(sf && sf.url === "https://beispiel.test/laden/app/",
     "bei einem Schaufenster wird die APP gemessen, nicht die Landingpage", sf && sf.url);
  ok(!ids.some((x) => /--schaufenster$/.test(x)),
     "… und es entsteht KEINE zweite Reihe fürs Schaufenster (benannte Grenze)", ids.join(","));

  const neu = z.find((x) => x.id === "fremd-neu");
  ok(neu && neu.name === "Fremd Neu" && neu.aktiv === true && neu.gefunden === "Testmarkt",
     "ein gefundenes Ziel trägt Name, aktiv und den Markt, aus dem es kommt",
     neu && JSON.stringify(neu));
}

/* ── 3 · Fail-soft: der nächtliche Lauf stirbt hier nicht ─────────────────── */
console.log("\n── Fail-soft ──");
{
  /* Der Grund steht im Kopf der Bibliothek: dieser Lauf ist im September 2026
     sechs Nächte hintereinander gestorben, und die Arbeit war jedes Mal weg. */
  let gesagt = "";
  const a = await fremdeZiele({ bekannt: new Set(), log: (t) => { gesagt += t + "\n"; },
                                maerkte: markt("/gibt/es/nicht.js") });
  ok(Array.isArray(a) && a.length === 0, "unerreichbarer Markt → leere Liste, kein Wurf");
  ok(/nicht erreichbar/.test(gesagt), "… und eine Zeile im Protokoll", gesagt.trim() || "(nichts)");

  const kaputt = path.join(WEG, "kaputt.js");
  fs.writeFileSync(kaputt, "window.PT_LISTINGS = [ {{{ ;", "utf8");
  let g2 = "";
  const b = await fremdeZiele({ bekannt: new Set(), log: (t) => { g2 += t + "\n"; },
                                maerkte: markt(kaputt) });
  ok(b.length === 0 && /nicht lesbar/.test(g2), "unlesbare Liste → leer und benannt", g2.trim() || "(nichts)");

  const leer = path.join(WEG, "leer.js");
  fs.writeFileSync(leer, "window.ETWAS_ANDERES = [];", "utf8");
  let g3 = "";
  const c = await fremdeZiele({ bekannt: new Set(), log: (t) => { g3 += t + "\n"; },
                                maerkte: markt(leer) });
  ok(c.length === 0 && /keine Liste/.test(g3), "fehlendes Listen-Global → leer und benannt", g3.trim() || "(nichts)");
}

/* ── 4 · Der Netz-Weg trägt wirklich ──────────────────────────────────────── */
console.log("\n── Der Netz-Weg ──");
{
  /* ⚠ Gemessen wird die MECHANIK an einem gestellten Server, nicht die echte
     Adresse: `pwa-toolpoint.de` ist aus dem Behälter einer Sitzung nicht
     erreichbar (der Ausgangs-Proxy sperrt sie, gemessen HTTP 000). Ohne diesen
     Abschnitt wäre der Netz-Weg der Weg, den in einem GitHub-Lauf jeder geht
     und den niemand je gefahren ist. */
  const inhalt = 'window.PT_LISTINGS = [{ anchorId: "aus-dem-netz", label: "Aus dem Netz", url: "https://beispiel.test/n/" }];';
  const server = http.createServer((q, a) => { a.writeHead(200, { "content-type": "text/javascript" }); a.end(inhalt); });
  await new Promise((f) => server.listen(0, "127.0.0.1", f));
  const adr = `http://127.0.0.1:${server.address().port}/listings.js`;
  const z = await fremdeZiele({ bekannt: new Set(),
                                maerkte: markt("/gibt/es/nicht.js", { netz: adr }) });
  server.close();
  ok(z.length === 1 && z[0].id === "aus-dem-netz",
     "ohne Nachbarn wird die Liste aus dem Netz geholt", JSON.stringify(z));
}

/* ── 5 · Die Adresse ist die AUSGELIEFERTE Seite, nicht das Depot ─────────── */
console.log("\n── Welche Adresse ──");
{
  /* Gemessen am 2026-09-21: `PWA-Toolpoint` steht auf privat, und `raw
     .githubusercontent.com` antwortet einem privaten Depot ohne Token mit 404.
     Die Seite wird trotzdem ausgeliefert. Wer hier auf das Depot zeigt, baut
     einen Weg, der im GitHub-Lauf jede Nacht ins Leere greift. */
  for (const m of FREMDMAERKTE) {
    ok(/^https:\/\//.test(m.netz), `${m.markt}: die Netz-Adresse ist https`, m.netz);
    ok(!/raw\.githubusercontent\.com/.test(m.netz),
       `${m.markt}: … und zeigt auf die ausgelieferte Seite, nicht aufs Depot`, m.netz);
    ok(m.nachbarn.length > 0 && m.nachbarn.every((p) => p.startsWith(path.dirname(WURZEL) + path.sep)),
       `${m.markt}: der Nachbar liegt neben der eigenen Wurzel`, m.nachbarn.join(" | "));
  }

  /* ⚠ DIE ZEILE DARÜBER KANN HIER NICHT ZWISCHEN „abgeleitet" UND „fest
     eingetippt" UNTERSCHEIDEN: in diesem Behälter ergibt beides denselben
     Pfad (`/home/user/PWA-Toolpoint/…`). Gemessen wird deshalb die
     EIGENSCHAFT, auf die es ankommt — der Pfad WANDERT mit der Wurzel. Dafür
     läuft eine Kopie der Bibliothek an einem anderen Ort; ein fest
     eingetipptes `/home/user/…` bliebe dort stehen, wo es steht. */
  const anderswo = path.join(WEG, "anderswo", "family-project", "tools", "lib");
  fs.mkdirSync(anderswo, { recursive: true });
  fs.copyFileSync(path.join(WURZEL, "tools", "lib", "fremdmarkt.mjs"),
                  path.join(anderswo, "fremdmarkt.mjs"));
  const fern = await import(path.join(anderswo, "fremdmarkt.mjs"));
  const wandert = fern.FREMDMAERKTE.every((m) =>
    m.nachbarn.every((p) => p.startsWith(path.join(WEG, "anderswo") + path.sep)));
  ok(wandert, "der Nachbar-Pfad WANDERT mit der Wurzel — er ist nicht fest eingetippt",
     fern.FREMDMAERKTE.map((m) => m.nachbarn.join("|")).join(" · "));
}

/* ── 6 · Gefunden nützt nur, wenn es auch drankommt ───────────────────────── */
console.log("\n── Und es kommt dran ──");
{
  /* Ohne diesen Abschnitt hinge das Finden in der Luft: ein Ziel, das zwar in
     der Liste steht, aber hinter dem Deckel liegt, wird trotzdem nie gemessen.
     `reihenfolge` stellt nie Gemessene nach vorn — genau darauf baut das hier. */
  const r = reihenfolge([{ id: "alt" }, { id: "gefunden" }], { alt: { gemessen: "2026-01-01" } })
    .map((x) => x.id);
  ok(r[0] === "gefunden", "ein gefundenes, nie gemessenes Ziel steht im nächsten Lauf ganz vorn", r.join(","));
}

/* ── 7 · Der ECHTE Lauf reicht die gefundenen Ziele durch ─────────────────── */
console.log("\n── Der echte Lauf ──");
{
  /* Hier wird nicht gelesen, sondern gefahren. Ein Wächter auf „die Zeile steht
     in forschung.mjs" wäre auch dann grün, wenn das Ergebnis danach weggeworfen
     wird — und genau das ist der Fehler, den man nicht sieht.
     `FORSCHUNG_MAX=0` hält den Lauf bei null Messungen: er nennt dann, wie
     viele Ziele NICHT drankommen, und das ist genau die Zahl der aktiven. */
  const ziele = JSON.parse(fs.readFileSync(path.join(WURZEL, "forschung", "messziele.json"), "utf8")).ziele || [];
  const eigenAktiv = ziele.filter((z) => z.aktiv !== false).length;
  const gefunden = await fremdeZiele({
    bekannt: bekannteKennungen({
      ziele,
      marktQuelle: fs.readFileSync(path.join(WURZEL, "assets", "config", "listings.js"), "utf8")
    })
  });

  const REIHE = path.join(WURZEL, "forschung", "messreihe.json");
  const vorher = fs.statSync(REIHE).mtimeMs;
  const lauf = spawnSync("node", ["tools/forschung.mjs", "--messen"],
    { cwd: WURZEL, encoding: "utf8", timeout: 120000, env: { ...process.env, FORSCHUNG_MAX: "0" } });
  const aus = String(lauf.stdout || "") + String(lauf.stderr || "");
  const m = aus.match(/Deckel 0: (\d+) Ziel/);

  /* ⚠ HIER STAND ZUERST `/PWA Toolpoint/` — und das traf ein MESS-ZIEL, das
     zufällig so heißt („Auslieferungsprüfer (PWA Toolpoint)"). Der Wächter war
     damit grün, während die fremden Märkte gar nicht gefragt wurden; gefunden
     hat es nicht der Gegenprobe-Lauf (der Fall fiel über den Zähler darunter),
     sondern das Nachstellen von Hand. Gemessen wird jetzt die MELDUNG dieses
     Blocks, die kein Ziel-Name tragen kann. */
  const gemeldet = /Eintrag\/Einträge gelesen|Liste nicht erreichbar|Liste nicht lesbar|ist keine Liste|fremde Märkte nicht abgefragt/;
  ok(gemeldet.test(aus), "der Lauf fragt die fremden Märkte überhaupt",
     aus.split("\n").slice(0, 2).join(" / ") || "(nichts)");

  if (!gefunden.length) {
    /* Selbst-Riegel: ohne ein gefundenes Ziel misst die Zeile darunter nichts —
       eigenAktiv und die Gesamtzahl wären dann trivial gleich. */
    still("kein fremdes Ziel gefunden (Nachbar fehlt?) — die Durchreichung ist damit UNGEMESSEN");
  } else if (!m) {
    fail++; console.log("  ✗ der Lauf nennt keine Ziel-Zahl → ", aus.split("\n").slice(0, 3).join(" / "));
  } else {
    ok(Number(m[1]) === eigenAktiv + gefunden.length,
       `die ${gefunden.length} gefundene(n) Ziel(e) stehen wirklich in der Mess-Liste`,
       `Lauf nennt ${m[1]}, erwartet ${eigenAktiv} eigene + ${gefunden.length} gefundene`);
  }

  /* ⚠ Hier stand zuerst ein `|| true` — also eine Zusicherung, die nichts
     messen kann. Gemessen wird jetzt die Datei: ein Lauf ohne Messung darf die
     Messreihe nicht anfassen, sonst stünde in ihr ein Punkt ohne Messung. */
  ok(vorher === fs.statSync(REIHE).mtimeMs,
     "der Trockenlauf fasst die Messreihe nicht an", `${vorher} → ${fs.statSync(REIHE).mtimeMs}`);
}

fs.rmSync(WEG, { recursive: true, force: true });
console.log(`\n${pass} bestanden, ${fail} durchgefallen.` + (offen ? ` ${offen} ungemessen.` : ""));
process.exit(fail ? 1 : 0);

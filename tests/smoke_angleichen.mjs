/* family-projekt.de — Angleichen an PWA Toolpoint, Erklärvideo, Weg zur App
 * (Klaus 2026-09-28).
 *
 * Auftrag: „Jede App aus PWA Toolpoint soll auch auf family-projekt.de zu sehen
 * sein", Workfloh PDF samt Erklärvideo („Detailseite + Hinweis an Karte"), und
 * „die Leute sollen auch wirklich da ankommen, wo sie hinwollen. Die
 * Landingpage ist nur eine Vorschau."
 *
 * Ohne Browser. Gemessen werden die ECHTEN Daten, die GEBAUTEN Seiten und das
 * echte Bau-Werkzeug — keine Zahl ist festgenagelt: jede Zusicherung heißt
 * „jeder, der X trägt, …", und daneben steht ein Selbst-Riegel, dass es X
 * überhaupt gibt. Sonst wäre sie bei null trivial wahr.
 *
 *   node tests/smoke_angleichen.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { markteintraege, marktHtml, videoVon } from "../tools/statische-listen.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => readFileSync(join(WURZEL, p), "utf8");
let gruen = 0, rot = 0;
const ok = (b, t, extra = "") => {
  if (b) { gruen++; console.log("  ✓ " + t); }
  else { rot++; console.log("  ✗ ROT: " + t + (extra ? "  → " + extra : "")); }
};

const welt = {};
new Function("window", lies("assets/config/listings.js"))(welt);
const L = welt.FP_LISTINGS || [];
const hand = JSON.parse(lies("assets/config/wache-hand.json"));
const bericht = JSON.parse(lies("assets/config/spore-stand.json"));
const wache = {};
for (const [id, e] of Object.entries(bericht.eintraege || {})) if (e && e.wache) wache[id] = e.wache;

console.log("── Angleichen: die Einträge aus PWA Toolpoint ──");
/* Die Kennungen der Forschungs-Ziele: steht eine davon im Marktplatz, misst
 * der Marktplatz sie — das Ziel muss dann ruhen, sonst zwei Punkte je Tag. */
const ziele = JSON.parse(lies("forschung/messziele.json")).ziele || [];
const imMarkt = new Set(L.map((e) => e.anchorId));
const doppelt = ziele.filter((z) => imMarkt.has(z.id) && z.aktiv !== false);
ok(ziele.some((z) => imMarkt.has(z.id)),
   "es gibt Forschungs-Ziele, die im Marktplatz stehen (sonst misst die Zeile darunter nichts)");
ok(doppelt.length === 0, "kein Eintrag wird zweimal gemessen (Marktplatz UND aktives Forschungs-Ziel)",
   doppelt.map((z) => z.id).join(", "));
const ohneGrund = ziele.filter((z) => imMarkt.has(z.id) && z.aktiv === false && !String(z.grund || "").trim());
ok(ohneGrund.length === 0, "… und jedes ruhende Ziel nennt seinen Grund", ohneGrund.map((z) => z.id).join(", "));

/* Der Nachbar-Klon: ob wirklich JEDE App von drüben hier steht. Ohne Klon
 * nicht messbar — das wird gesagt, nicht als grün gezählt. */
const ptPfad = join(WURZEL, "..", "PWA-Toolpoint", "assets", "config", "listings.js");
if (existsSync(ptPfad)) {
  const pt = {};
  new Function("window", readFileSync(ptPfad, "utf8"))(pt);
  const hierUrls = new Set(L.flatMap((e) => [e.url, e.appUrl].filter(Boolean)));
  /* Benannte Ausnahmen, und nur diese: der Eintrag family-projekt.de IST
   * dieser Marktplatz; die KI-Schulung steht hier in eigener Fassung. */
  const AUSNAHME = /^https:\/\/(family-projekt\.de\/?$|pwa-toolpoint\.de\/ki-schulung\.html)/;
  const fehlt = (pt.PT_LISTINGS || []).filter((e) => !AUSNAHME.test(e.url) &&
    !hierUrls.has(e.url) && !(e.appUrl && hierUrls.has(e.appUrl)));
  ok((pt.PT_LISTINGS || []).length > 10, "der Nachbar-Klon PWA Toolpoint trägt Einträge");
  ok(fehlt.length === 0, "jede App aus PWA Toolpoint steht auch hier", fehlt.map((e) => e.label).join(", "));
} else {
  console.log("  ⊘ nicht messbar: kein Nachbar-Klon PWA-Toolpoint — ungeprüft, nicht grün");
}

console.log("── Wartung: Alis Moderaum ──");
const inWartung = Object.entries(hand).filter(([k, v]) => v && v.wartung === true).map(([k]) => k);
ok(inWartung.includes("eigen-alis-moderaum") && inWartung.includes("eigen-alis-warenwirtschaft"),
   "Alis Moderaum und die Warenwirtschaft stehen auf Wartung (Klaus: „Mitnehmen, auch auf Wartung“)");
const gebaut = markteintraege(L, wache);
const gebauteIds = new Set(gebaut.map((e) => e.anchorId));
ok(inWartung.every((k) => !L.some((e) => e.anchorId === k) || !gebauteIds.has(k)),
   "… und keiner in Wartung steht in der gebauten Liste (der Bericht trägt die Marke schon)",
   inWartung.filter((k) => gebauteIds.has(k)).join(", "));
const markt = lies("markt.html");
ok(!/apps\/eigen-alis-moderaum\//.test(markt), "… und nicht im ausgelieferten markt.html");
ok(!existsSync(join(WURZEL, "apps", "eigen-alis-moderaum", "index.html")),
   "… und ohne Detailseite (unsichtbar heißt unsichtbar)");

console.log("── Erklärvideo ──");
const mitVideo = gebaut.filter((e) => e.video);
const ohneVideo = gebaut.filter((e) => !e.video);
ok(mitVideo.length > 0 && ohneVideo.length > 0, "es gibt Einträge MIT und OHNE Video (sonst misst der Rest nichts)");
ok(videoVon({ video: { quer: "javascript:alert(1)" } }) === null && videoVon({ video: "x" }) === null,
   "ein Video ohne https-Adresse fällt weg, statt halb dazustehen");
const html = marktHtml(gebaut);
ok(mitVideo.every((e) => html.includes(`href="apps/${e.anchorId}/#video"`)),
   "jede gebaute Karte mit Video führt zu ihrem #video");
ok(ohneVideo.every((e) => !new RegExp(`apps/${e.anchorId}/#video`).test(html)) && (html.match(/class="mk-video"/g) || []).length === mitVideo.length,
   "… und keine Karte ohne Video trägt den Hinweis");
ok(!/<video|\.mp4/.test(html), "die Karte bettet KEIN Video ein");
ok(mitVideo.every((e) => markt.includes(`href="apps/${e.anchorId}/#video"`)),
   "… und markt.html trägt den Hinweis im ausgelieferten HTML");
const karteJs = (markt.match(/function card\(x\) \{[\s\S]*?\n {6}\}/) || [""])[0];
ok(/mk-video/.test(karteJs) && /FP\.t\("mk_video"\)/.test(karteJs),
   "markt.html card() zeichnet den Hinweis ebenso (zwei Fassungen, eine Regel)");
ok(/mk_video: "🎬 Erklärvideo"/.test(markt) && /mk_video: "🎬 Explainer video"/.test(markt),
   "… auf Deutsch und Englisch");

const seite = (id) => { try { return lies(`apps/${id}/index.html`); } catch { return ""; } };
const block = (h) => (h.match(/<section[^>]*id="video"[\s\S]*?<\/section>/) || [""])[0];
for (const e of mitVideo) {
  const b = block(seite(e.anchorId));
  ok(!!b, `VIDEO ${e.anchorId}: die Detailseite trägt den Abschnitt #video`);
  ok(/<video[^>]*preload="none"/.test(b), `VIDEO ${e.anchorId}: lädt erst auf Tipp (preload="none")`);
  ok(!e.video.poster || b.includes(`poster="${e.video.poster}"`), `VIDEO ${e.anchorId}: trägt das Vorschaubild`);
  ok(!e.video.hoch || b.includes(`<source src="${e.video.hoch}" type="video/mp4" media="(orientation: portrait)">`),
     `VIDEO ${e.anchorId}: hochkant läuft die Hochformat-Fassung`);
  ok(b.includes(`src="${e.video.quer}"`) && !/family-projekt\.de/.test(e.video.quer),
     `VIDEO ${e.anchorId}: verlinkt, nicht kopiert (fremde Adresse)`);
}
ok(ohneVideo.every((e) => !block(seite(e.anchorId))), "keine Detailseite ohne Video trägt den Abschnitt");
ok(!/\.mp4/.test(lies("sw.js")), "kein .mp4 im Service-Worker-Vorrat");

console.log("── Weg zur App ──");
const mitApp = gebaut.filter((e) => e.appUrl && e.appUrl !== e.url);
ok(mitApp.length > 0, "es gibt Einträge mit vorgeschalteter Seite (sonst misst der Rest nichts)");
for (const e of mitApp) {
  ok(seite(e.anchorId).includes(`class="btn ghost ext zur-app" href="${e.appUrl}"`),
     `ZUR APP ${e.anchorId}: die Detailseite führt direkt zur App`);
}
ok(gebaut.filter((e) => !(e.appUrl && e.appUrl !== e.url)).every((e) => !/zur-app/.test(seite(e.anchorId))),
   "… und ohne eigene App-Adresse steht kein zweiter Knopf da");
const rot1 = markteintraege([{ label: "P", anchorId: "p", img: "https://x.invalid/a.png",
  url: "https://v.invalid/", appUrl: "https://a.invalid/" }], { p: { ampel: "rot" } })[0];
ok(rot1 && rot1.appUrl === "" && rot1.url === "", "rot heißt auch hier kein Weg zur App");

console.log(`\n${gruen} grün · ${rot} ROT`);
process.exit(rot ? 1 : 0);

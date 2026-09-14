/* Prüft den kurzen Weg zur Anfrage auf dem Marktplatz.
 *
 * Anlass (2026-08-09): der Abschnitt „Eigene App oder Website gewünscht?"
 * existiert seit dem 21.07. und ist sauber verdrahtet — aber er steht hinter
 * allen Einträgen, und die Seite hatte KEINE einzige Sprungmarke. Wer etwas in
 * Auftrag geben wollte, musste erst an vierzehn App-Karten vorbeiscrollen.
 */
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../markt.html', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ✓ ' + n)) : (fail++, console.log('  ✗ ' + n)); };

// Ziel und Weg
ok('der Anfrage-Abschnitt hat ein Sprungziel', /<section id="anfrage">/.test(html));
ok('es gibt einen Verweis darauf', /href="#anfrage"/.test(html));

// Der Verweis muss VOR den Einträgen stehen, sonst nützt er nichts.
const posLink = html.indexOf('href="#anfrage"');
const posListings = html.indexOf('id="mkListings"');
const posZiel = html.indexOf('<section id="anfrage">');
ok('der Verweis steht vor den Einträgen', posLink > 0 && posLink < posListings);
ok('das Ziel steht hinter den Einträgen', posZiel > posListings);

// Das Formular dahinter muss unangetastet funktionieren.
ok('das Kontakt-Formular ist noch da', /id="mkContact"/.test(html));
ok('es sendet weiterhin zweck:"kontakt"', /zweck: "kontakt"/.test(html));
ok('die Spam-Falle ist unberührt', /id="ctHp" name="fp_hp_url"/.test(html));

// Beschriftung in beiden Sprachen — sonst steht bei EN der deutsche Text.
for (const k of ['mk_build_teaser', 'mk_build_link']) {
  ok(`${k} ist zweisprachig`, (html.match(new RegExp(k + ':', 'g')) || []).length >= 2);
}

/* Kein Versprechen, das Stufe 2 wäre (§ 8d): keine Preise, keine Provision.
 *
 * ⚠ GEMESSEN WIRD, WAS EIN BESUCHER SIEHT — nicht ein Zeichen-Fenster um den
 * Verweis herum. Die erste Fassung nahm `html.slice(posLink-400, posLink+200)`
 * und schlug am 2026-09-14 an einem ERKLÄR-KOMMENTAR an, in dem das Wort
 * „Prozentsatz" stand: eine rote Zeile, ohne dass eine Zusicherung gefallen
 * wäre. Dieselbe Falle wie ein Wächter, der seinen Suchbegriff im Kommentar
 * findet, nur von der anderen Seite.
 *
 * Und das Fenster war auch in der Gegenrichtung blind: ein Preis, der 401
 * Zeichen vor dem Verweis steht, lag außerhalb. Gemessen wird jetzt der
 * BLOCK — der Hinweis-Absatz und der Anfrage-Abschnitt —, und zwar ohne
 * Kommentare. */
const ohneKommentare = (t) => t.replace(/<!--[\s\S]*?-->/g, ' ');
const teaser = (html.match(/<p class="sub mk-anfrage-weg">[\s\S]*?<\/p>/) || [''])[0];
const anfrageBlock = html.slice(posZiel, html.indexOf('</section>', posZiel));
const sichtbar = ohneKommentare(teaser + anfrageBlock);
ok('der Hinweis-Absatz ist da', teaser.length > 0);
ok('der Hinweis nennt keinen Preis', !/€|EUR|Prozent|%/.test(sichtbar));

console.log(`\n${pass}/${pass + fail} bestanden`);
process.exit(fail ? 1 : 0);

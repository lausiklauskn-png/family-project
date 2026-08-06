# Regeln für Text und Auffindbarkeit

> Lies das hier, bevor du Titel, Beschreibung, Überschriften oder Fließtext einer
> Seite anlegst oder änderst — und immer, wenn die Auffindbarkeit (SEO) unter 100
> liegt.

## Warum das zählt

Bei Google sieht ein Suchender **genau zwei Dinge**: die Titel-Zeile und die
Beschreibung darunter. Fehlt die Beschreibung, setzt Google irgendein Textstück
aus der Seite ein — bei einer App, die mit einer leeren Liste startet, wird das
nichts Brauchbares.

Mein-WorkFloh hatte im Kopf `<title>WorkFloh</title>` und **sonst nichts**.
Auffindbarkeit **80** — der schlechteste Wert im Netz, ausgerechnet bei der
einzigen App, die Klaus verkauft. Mit Titel, Beschreibung, `robots.txt` und
Sitemap: **80 → 92**.

Das Tückische: **ein fehlendes `<meta description>` sieht man der Seite im
Browser nicht an.** Man merkt es Wochen später an einem Suchergebnis, das
niemand anklickt.

---

## Der Pflicht-Kopf jeder Seite

```html
<title>WorkFloh · Digitaler Auftragszettel für Werbetechnik</title>
<meta name="description" content="… 120–160 Zeichen …" />
<link rel="canonical" href="https://…/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="…" />
<meta property="og:description" content="…" />
<meta property="og:url" content="https://…/" />
<meta property="og:image" content="https://…/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
```

### Titel

- **50–60 Zeichen.** Länger schneidet Google ab.
- **Name + was es tut.** „WorkFloh" allein sagt niemandem etwas, der den Namen
  nicht kennt. „WorkFloh · Digitaler Auftragszettel für Werbetechnik" schon.
- Kein Füllwerk („Startseite", „Willkommen bei").

### Beschreibung

- **120–160 Zeichen.** Über 160 schneidet Google mitten im Satz ab.
- Sag, **was jemand hier tun kann** — nicht, wie großartig es ist.
- Die Wörter hineinnehmen, nach denen jemand wirklich sucht („Auftragszettel",
  „Werbetechnik", „Zeiterfassung"), aber als **lesbarer Satz**, nicht als
  Stichwort-Halde.

### `robots.txt` und `sitemap.xml`

Ohne `robots.txt` bekommt jede Suchmaschine bei jedem Besuch einen 404. Sie
gehört hin, und sie zeigt auf die Sitemap.

**Die Sitemap nennt nur Adressen, die es wirklich gibt.** Bei WorkFloh sind das
genau zwei Dateien — alles andere sind Ansichten **innerhalb** der einen Seite
ohne eigene Adresse. Eine Sitemap mit erfundenen Adressen ist **schlimmer als
keine**: wiederholte 404 wertet eine Suchmaschine negativ.

---

## Regeln für den sichtbaren Text

### Eine `<h1>` pro Seite, Überschriften ohne Sprünge

`h1` → `h2` → `h3`, keine Stufe überspringen. Eine Vorlesehilfe navigiert
darüber; für sie ist die Überschriften-Gliederung das Inhaltsverzeichnis.

### Links müssen aus sich heraus verständlich sein

„Hier klicken" ist unbrauchbar, sobald jemand sich nur die Links vorlesen lässt.
Schreib, **wohin** es geht: „→ Werkzeugkiste ansehen".

### Jeder Link braucht ein `href`

Ein `<a>` ohne `href` ist für Google kein Link. Genau das meldet
`crawlable-anchors`. Wenn etwas wie ein Link aussieht, aber nur JavaScript
auslöst, ist es ein **`<button>`** — kein `<a>`.

> Bekannter Fall im Netz: `sbkim-rendezvous-ui.js` legt „🔑 Schlüssel holen ↗"
> als `<a>` ohne `href` an. Der **Sage-Kanon hat das längst behoben**; die Kopien
> in den Apps sind eine ältere Generation. Das gehört in den netzweiten
> Modul-Rollout, **nicht** in eine lokale Reparatur (siehe
> [`skripte.md`](skripte.md) Regel 7).

### Fremde Sprache auszeichnen

`lang="de"` am `<html>`. Steht ein englischer Absatz darin, bekommt er
`lang="en"` — sonst liest die Vorlesehilfe ihn deutsch aus.

### Ton

Für Klaus' Seiten gilt: **ruhig, konkret, ohne Imponiergehabe.** Wer den Text
liest, ist oft kein Techniker. Für die Feinarbeit gibt es den Skill
`menschlich-schreiben` — der behandelt die typischen KI-Verräter (Gedankenstrich-
Flut, gleich lange Sätze, das „nicht X, sondern Y"-Muster).

---

## Reihenfolge beim Nachbessern

1. In `forschung/messreihe.json` nachsehen, **was Google konkret bemängelt** —
   die Mängelliste ist genauer als jede Vermutung.
2. Titel und Beschreibung setzen (der größte Einzelsprung).
3. `robots.txt` + `sitemap.xml`, Sitemap **gegen die Platte prüfen**.
4. Open Graph / Twitter Card (was ein Messenger beim Teilen zeigt).
5. Gegenmessen.

## Einen Wächter dazulegen

Weil man einen fehlenden Kopf-Eintrag **nicht sieht**, gehört eine Prüfung in
die Testdatei. Bei Mein-WorkFloh (`test/smoke.test.js`, 4 → 6 Prüfungen):

- Titel und Beschreibung sind da **und** passen in ein Suchergebnis (Längen).
- **Jede Adresse in der Sitemap existiert als Datei.**

Und: **Gegenprobe fahren.** Beschreibung entfernen → muss rot werden. Titel
zurücksetzen → rot. Sitemap auf eine nicht existierende Seite zeigen lassen →
rot. Ein Wächter, der nie rot wird, bewacht nichts.

## Abhakliste

- [ ] `<title>` 50–60 Zeichen, Name **und** Zweck
- [ ] `<meta name="description">` 120–160 Zeichen, lesbarer Satz
- [ ] `rel="canonical"`
- [ ] Open Graph + `twitter:card`
- [ ] `robots.txt` vorhanden, zeigt auf die Sitemap
- [ ] `sitemap.xml` nennt **nur existierende** Adressen (geprüft)
- [ ] eine `<h1>`, Überschriften ohne Sprünge
- [ ] Links sprechend, jedes `<a>` mit `href`
- [ ] `lang` gesetzt, fremdsprachige Stellen ausgezeichnet
- [ ] Wächter im Test ergänzt **und mit Gegenprobe belegt**

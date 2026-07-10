# Selbst-gehostetes Embedding-Modell — hier hinein

Dieser Ordner ist der Platz für das Embedding-Modell **`Xenova/multilingual-e5-small`**,
damit Family-Projekt es vom **eigenen Server** lädt statt live von HuggingFace
(offline-first, keine fremde Abhängigkeit mehr).

Sobald die Dateien hier liegen, erkennt die App das **automatisch** und lädt
lokal — es ist **keine** Code-Änderung nötig (siehe `sbkim/03_embedding.js`,
Funktion `detectModelSource`). Solange sie fehlen, lädt die App weiter von
HuggingFace (braucht dann beim ersten Anmelden einmal Internet).

## Diese Dateien gehören hierher (Struktur genau so lassen)

```
models/Xenova/multilingual-e5-small/
├── config.json
├── tokenizer.json
├── tokenizer_config.json
├── special_tokens_map.json
└── onnx/
    └── model_quantized.onnx      (~30 MB — das ist der große Brocken)
```

Quelle (das Original): `https://huggingface.co/Xenova/multilingual-e5-small`
(Dateipfad je Datei: `…/resolve/main/<dateiname>`).

## Wie kommen die Dateien hierher?

Am einfachsten über den fertigen GitHub-Action-Knopf:
**Actions → „Embedding-Modell ins Repo holen" → „Run workflow".**
Der Lauf holt die Dateien auf GitHubs Servern (die HuggingFace erreichen dürfen)
und committet sie automatisch in diesen Ordner. Danach in Termux `git pull` und
auf der Seite einmal **Strg+Shift+R**.

> Hinweis: Diese `PLATZHALTER.md` kann bleiben — sie stört das Laden nicht.

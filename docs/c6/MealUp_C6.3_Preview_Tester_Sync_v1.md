# MealUp C6.3 — Tester preview sync

Stato al 30 settembre 2026: il branch ufficiale di test `mealup-redesign-preview` contiene il payload congelato della PR #1, integrato preservando le modifiche Home specifiche del tester.

## Integrazione

- Commit di sync: `d1300440cca578b9cf7a3b0ce70116c788645903`.
- Sono stati applicati i 289 percorsi della PR #1 (288 file più `index.html`), incluse le dipendenze G5–G9/G11 e i 118 asset canonici con i relativi metadati.
- `index.html` è stato unito in modo puntuale: l’adapter `MealUpVisualData` e `G11/bootstrap.mjs` sono stati inseriti nel file del tester. Rimuovendo quei due blocchi aggiunti, l’HTML risultante è identico byte per byte all’`index.html` esistente sul tester; le variazioni Home sono quindi preservate.
- La PR #1 resta aperta; il branch `main` non è stato modificato. Il branch storico `preview/cooking-mode-redesign` è ancora presente.

## Verifiche sul merge tester

- Browser Chromium 154 sull’app reale: 69/69 controlli d’interazione PASS, inclusi Home/Dimmi tu, Ricette/lista/ricerca, dettaglio, Kitchen Mode, cambio porzioni e Gauge.
- G12 DOM reale: 3.632/3.632 casi PASS (454 ricette × 8 superfici), canvas verificato e nessuno SVG/marker legacy residuo negli host migrati.
- 118/118 asset PNG verificati rispetto allo SHA-256 del catalogo.
- `index.html` locale verificato con lo stesso Git blob SHA del file caricato sul branch: `e76b98825dff56279d3cabe53f7896a4f0df6f27`.

## Pubblicazione del tester

Non è stata avviata una pubblicazione web. Nel repository non è stata trovata una procedura di preview sicura: `pubblica.yml` si attiva solo su modifiche a `MealUp.zip`, poi estrae il pacchetto e fa push sul branch. Il commit di sync non include `MealUp.zip`. La configurazione Pages e un URL browser dedicato non sono stati reperiti; non è stato creato un nuovo hosting. Il branch verificabile è:
https://github.com/battagliafilippo/MealUp/tree/mealup-redesign-preview

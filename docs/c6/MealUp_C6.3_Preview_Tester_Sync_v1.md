# MealUp C6.3 — Tester preview sync

Stato finale al 30 settembre 2026: il branch ufficiale di test `mealup-redesign-preview` contiene il payload C6.3/G13 congelato, integrato preservando le modifiche Home specifiche del tester.

## Stato

- G11: PASS / FROZEN.
- G12: PASS / FROZEN.
- G13: PASS / FROZEN con eccezione esplicita sul report umano del tester.
- Tester branch: `mealup-redesign-preview`.
- Stato tester: `READY_FOR_MANUAL_TEST`.
- `main`: non modificato.
- Deploy produzione: non eseguito.

## Integrazione

- Commit di sync iniziale: `d1300440cca578b9cf7a3b0ce70116c788645903`.
- Sono stati applicati i 289 percorsi della PR #1, incluse le dipendenze G5–G9/G11 e i 118 asset canonici con i relativi metadati.
- `index.html` è stato unito in modo puntuale preservando le modifiche Home del tester.
- Le modifiche successive al sync hanno riguardato documentazione di chiusura e l'allineamento del digest atteso di `recipe-geometry.json`; il payload runtime validato non è stato modificato.

## Verifiche finali

- Browser Chromium 154 sull'app reale: 69/69 controlli d'interazione PASS.
- G11 runtime: 10.896/10.896 casi PASS; 33.639 controlli bounds/alpha PASS.
- G12 DOM reale: 3.632/3.632 casi PASS.
- 118/118 asset PNG verificati rispetto allo SHA-256 del catalogo.
- 0 SVG/marker legacy residui negli host ricetta migrati.
- Funzioni protette byte-identiche.
- `index.html` sul branch tester mantiene il Git blob verificato: `e76b98825dff56279d3cabe53f7896a4f0df6f27`.
- `G11/bootstrap.mjs`: `29edb3d4d77263b4ac70c2e2001d2ddcf0979b08`.
- `G11/app-wiring.mjs`: `9f027e8fb9c8337447a051d13e13734d5fb9d905`.

## Freeze G13

G13 è chiuso e congelato. Il report umano PASS/FAIL del tester non è stato ricevuto; Filippo ha autorizzato esplicitamente la chiusura senza attendere tale report. L'eccezione è limitata a quel requisito e non sostituisce le verifiche tecniche sopra elencate.

## Tester

Il branch è pronto per il test manuale MealUp.

Branch verificabile:
https://github.com/battagliafilippo/MealUp/tree/mealup-redesign-preview

Non esiste nel repository una workflow isolata e verificata per pubblicare questo branch come URL web separato. `pubblica.yml` non è stata usata perché opera sul branch corrente tramite `MealUp.zip` e non costituisce un meccanismo di preview isolato.

Non effettuare merge su `main` o deploy produzione come conseguenza automatica del test.

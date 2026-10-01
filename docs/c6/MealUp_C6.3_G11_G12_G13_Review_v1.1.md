# MealUp C6.3 — G11/G12/G13 chiusi e congelati

**G11, G12 e G13: PASS / FROZEN.** G13 è stato chiuso e congelato il 30 settembre 2026 su autorizzazione esplicita di Filippo.

## Base della chiusura G13

La chiusura usa la baseline tecnica già verificata sul branch tester `mealup-redesign-preview`:

- G11 runtime: 10.896/10.896 casi PASS su Chromium 154, 454 ricette × 8 superfici × 3 viewport (320/390/600 px).
- 33.639 controlli bounds/alpha PASS.
- 69/69 interazioni app reale PASS, incluse Home/Dimmi tu, Ricette, dettaglio, ricerca/lista/wheel, Kitchen Mode, porzioni, step, Gauge e rollback.
- G12 DOM reale: 3.632/3.632 PASS.
- 118/118 PNG canonici verificati rispetto al catalogo.
- Canvas presente negli host migrati e 0 SVG/marker legacy residui.
- Sette corpi funzione protetti byte-identici.
- Le modifiche Home specifiche del tester sono preservate.
- Baseline G10 upstream: `120104b633d6676a6bb04f91b2e7e3e285198424`.
- Commit tester verificato prima della chiusura: `6932e427bf9db317ab6580990a24d851832ccb9d`.

## Eccezione autorizzata

Il PASS umano del tester era stato definito come ultimo requisito di chiusura. Non è stato ricevuto un report umano PASS/FAIL.

Filippo ha quindi autorizzato esplicitamente la chiusura e il freeze di G13 senza attendere tale report. Questa decisione costituisce un'eccezione circoscritta al requisito del tester umano; non modifica né invalida le verifiche tecniche sopra riportate.

## Stato finale

- G11: `PASS_FROZEN`
- G12: `PASS_FROZEN`
- G13: `PASS_FROZEN_USER_WAIVER_TESTER`
- `main`: non modificato.
- Deploy: non eseguito.
- PR #1: rimane separata dalla chiusura del gate; merge e deploy richiedono decisioni dedicate.

Il masterplan deve considerare G13 chiuso e congelato con l'eccezione sopra registrata.
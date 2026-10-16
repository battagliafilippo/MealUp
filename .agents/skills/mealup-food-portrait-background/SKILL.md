---
name: mealup-food-portrait-background
description: Riprende in background una coda Food Portrait MealUp gia autorizzata e persistita, eseguendo un solo candidato per ciclo con QA fail-closed. Usa quando un task pianificato deve continuare un lotto senza conferme ricetta-per-ricetta; non crea lotti, non approva, non congela, non integra e non pubblica.
---

# MealUp Food Portrait background

Lavora esclusivamente nel repository e branch correnti. Prima di ogni azione leggi `AGENTS.md`, il mandato indicato dallo stato e i contratti Food Portrait sotto `docs/food-portrait-pipeline/`.

## Preflight obbligatorio

Esegui:

```powershell
node tools/food-portrait-pipeline/background-preflight.cjs --state docs/food-portrait-pipeline/checkpoints/controlled-lot-001-autonomy-state.json --mandate docs/food-portrait-pipeline/controlled-autonomy-authorization-v1.json
```

- `NOOP_TERMINAL`: non modificare nulla e riferisci che non esiste lavoro autorizzato pendente.
- `BLOCKED`: non tentare alternative; registra il motivo e torna all'owner.
- `READY`: lavora soltanto sul `recipeId` restituito.

## Ciclo autorizzato

1. Verifica la ricetta sulla card sorgente e sulla composition matrix, inclusi kcal e vessel.
2. Verifica l'hash della reference FROZEN specifica. Un gate storico o un hash non dimostrato non puo essere usato come evidenza.
3. Usa `$imagegen` per creare esattamente una sola immagine, includendo il gauge fisico MealUp con valore kcal esatto e lancetta calibrata. Nessun altro testo o UI.
4. Conserva l'output originale. Esegui QA tecnico sul file salvato e ispezione visiva indipendente dei pixel. Una ricodifica lossless e consentita; una seconda generazione non lo e.
5. Se entrambi i QA passano, aggiorna manifest, checkpoint, issue log e stato persistente, poi passa alla successiva voce autorizzata. Al primo FAIL, ambiguita o conflitto, blocca il lotto.
6. Al termine torna all'owner con le sole visual candidate. Non trasformarle in asset approvati senza una successiva decisione owner esplicita.

## Confini invarianti

- Budget aggiuntivo `0 EUR`; nessuna API esterna o nuova credenziale.
- Una candidate per ciclo; niente batch e niente ricette fuori dalla coda.
- Vietati auto-accept, auto-freeze, integrazione, deploy e modifiche a `main`, tester, PWA o asset FROZEN.
- Non dichiarare ImageGen disponibile in background finche una run pianificata reale non lo dimostra.
- Ogni risultato deve distinguere `visual candidate`, `owner approved`, `FROZEN`, `integrated` e `deployed`.


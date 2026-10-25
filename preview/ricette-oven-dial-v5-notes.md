# Ricette · V5 — chiarimenti UI/UX (25 ottobre 2026)

## Vincoli e decisioni confermate
- La ghiera e **la struttura visiva identica della finestrella V4** restano approvate e immutate (geometria/bordo/materiali/colori).
- Nella finestrella, quando non si interagisce, **si vede soltanto la portata attiva**. Rimossi i due testi laterali di anteprima; la microanimazione direzionale già approvata resta attiva.
- I filtri sotto la ghiera **non sono un questionario**, né una procedura obbligatoria: i tre accessi Tempo / Voglia / Gusti sono sempre visibili, selezionabili in qualsiasi ordine, cumulabili e reversibili.
- Le alternative richieste sotto Voglia sono: **Super rapido, Semplice, Con calma, Più sfizioso**.
- Tempo: 10 min / 20 min / 30 min / Non importa; scelta facoltativa ed esclusiva. Voglia: una scelta facoltativa. Gusti: multi-selezione (Leggero, Proteico, Vegetariano, Con le tue scorte). Lo stato rimane visibile nei tre controlli e la lista viene aggiornata immediatamente.
- Il reset filtri lascia invariata la portata attiva. Un risultato vuoto mostra una spiegazione, senza imporre suggerimenti casuali.

## Artefatto
- `preview/ricette-oven-dial-v5.html` (isolato).
- Finestra V4 confrontata e verificata CSS-identica nelle definizioni `.date-window`, `.date-window::before`, `.reel-display`, `.oven-pointer`.
- Non sovrascrivere `preview/ricette-oven-dial-v4.html`.

## Test in browser eseguiti
- Chromium / Playwright con emulazione mobile: 320, 390, 430 CSS px.
- Nessuna pagina in overflow orizzontale, nessuna anteprima laterale residua, nove portate invarianti.
- Cambio portata toccando la manopola; filtri cumulati in ordine non obbligato Gusti → Tempo → Voglia; selezione/disattivazione autonoma; stato sincronizzato nel pannello Filtri; Azzera filtri; nessun errore JavaScript osservato.

## Limiti / blocchi
- Test su iPhone fisico/Safari **non effettuato**.
- I 16 esempi e i tag dimostrativi non corrispondono al database o alle proprietà reali delle 454+ ricette.
- L'implementazione **non è stata integrata** nel branch corrente in esecuzione sul PC a `192.168.1.3`; non è disponibile il codice corrispondente in questa chat.
- Nessuna modifica a main, tester ufficiale, Master, freeze grafici o branch Food Portrait.

## Prossimo passo
Recuperare il branch sorgente del server locale aggiornato; mappare senza perdita tutte le funzioni/filtri reali; applicare il componente V5 nella sezione Ricette in un branch isolato e collaudare con i dati reali, prestazioni e iPhone prima del merge.

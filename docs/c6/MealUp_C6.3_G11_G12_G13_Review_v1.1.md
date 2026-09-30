# MealUp C6.3 — G11/G12 completati, G13 approvato

**G11 e G12: PASS / FROZEN. G13: approvato da Filippo il 30 settembre 2026.** Il candidato è applicato su un branch di revisione; `main` non è stato modificato e il deploy non è stato eseguito.

## Verifiche

- G11 runtime: 10.896/10.896 casi su Chromium 154, 454 ricette × 8 superfici × 3 viewport (320/390/600 px); 33.639 controlli bounds/alpha; zero errori.
- G11 interazioni app reale: 69/69 pass, 23 per viewport, incluse dettaglio/micro, ricerca, card/lista/wheel, reduced-motion, Home/Dimmi tu, Kitchen Mode, porzioni, step e rollback.
- G12 DOM reale: 3.632/3.632 pass. Canvas presente in tutti i casi, poi 0 SVG/marker legacy nei soli host ricetta migrati.
- Sette corpi funzione protetti byte-identici. `arteRicetta()` mantenuta per superfici non migrate.
- Baseline G10 upstream: `120104b633d6676a6bb04f91b2e7e3e285198424`; blob originale `index.html` verificato identico al baseline congelato prima dell'overlay.

Il masterplan e il pacchetto takeover completi, inclusi report e screenshot, sono conservati nell'artefatto di revisione. Questo branch è pronto per review; merge su `main` e deploy restano separati.

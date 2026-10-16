---
name: mealup-food-portrait-fast-same-gates
description: Progetta e verifica una pipeline Food Portrait MealUp piu rapida e con meno token mantenendo identici reference FROZEN, ImageGen per-asset, QA indipendente e gate owner. Usa per audit, benchmark e pilot di ottimizzazione; non autorizza produzione catalogo, auto-approvazione, freeze, integrazione o deploy.
---

# MealUp Food Portrait — FAST SAME GATES

Obiettivo: ridurre token di orchestrazione e tempo di coordinamento senza ridurre la qualita o cambiare il significato di alcun gate.

## Principio non negoziabile

Un generatore probabilistico non garantisce che ogni prima immagine sia perfetta. La pipeline deve invece garantire che nessun output difettoso superi i gate. La qualita resta affidata agli stessi pixel, reference FROZEN e controlli usati dalla baseline approvata.

## Ruoli e separazione

- `director`: definisce scope, packet contract, metriche, stop e decisione da presentare all'owner; non produce e non certifica.
- `source_data`: compila un packet minimo da fonte canonica, composition matrix e reference hashata.
- `efficiency`: misura token, contesto, latenza e chiamate per asset; non propone tagli ai gate.
- `prompt_architect`: applica un template versionato con soli delta della ricetta; non esegue ImageGen.
- `visual`: esegue una chiamata ImageGen separata per ricetta e conserva l'originale.
- `qa_technical`: verifica file, pixel, formato, dimensioni, byte, hash e trasformazioni lossless.
- `qa_visual`: revisore diverso dal produttore; verifica ingredienti, preparazione, vessel, stile, kcal, lancetta, testo/UI e crop.
- `audit`: aggiorna eventi/checkpoint atomici e prepara la review owner.

## Fast path ammesso

1. Preflight compatto: restituisci solo decisione, contatori, prossima ricetta, source hash, vessel, reference path+SHA e versione dei gate.
2. Compila un job packet immutabile e hashato. Non caricare la coda completa, `OPERATIONS.md` o cronologia chat quando il packet e sufficiente.
3. Usa una sola reference FROZEN pertinente al vessel e un prompt canonico corto con soli dati variabili.
4. Ogni asset mantiene una chiamata ImageGen distinta. Un micro-lotto puo restare nello stesso turno, ma la produzione e seriale e si ferma al primo FAIL.
5. Esegui QA tecnico deterministico sui pixel salvati, poi QA visivo indipendente con rubric compatta invariata.
6. Registra un evento minimo per ciclo; genera il rollup narrativo e la review soltanto al gate del lotto.
7. Nessun unchanged polling quando lo stato e sospeso o terminale.

## Gate invarianti

- kcal visibile esatta e unica; nessun testo/UI extra.
- Lancetta coerente con le kcal e con la scala FROZEN.
- Vessel e reference SHA verificati.
- Ingredienti e forma preparata coerenti con la fonte.
- Stile, composizione, leggibilita mobile e crop equivalenti alla baseline FROZEN.
- Una sola candidate per ciclo; nessun retry automatico.
- QA visivo indipendente; review owner per lotto.
- Vietati auto-accept, auto-freeze, integrazione, deploy, modifiche a main/tester/PWA/FROZEN e spesa aggiuntiva.

## Benchmark obbligatorio

Confronta la baseline corrente e FAST SAME GATES su un pilot stratificato per vessel e rischio. Registra per asset: token input/output, byte di contesto, tempo wall-clock, chiamate ImageGen, first-shot PASS, difetti per gate, decisione owner.

`GO` soltanto se:

- zero regressioni critiche su kcal, testo, vessel, ingredienti, reference e stile;
- owner acceptance non inferiore alla baseline;
- first-shot PASS non inferiore alla baseline osservata;
- token di orchestrazione ridotti almeno del 40%;
- tempo mediano per asset ridotto almeno del 20%;
- rollback alla pipeline precedente provato.

Altrimenti `NO_GO` e ripristino della pipeline corrente. Nessuna estensione al catalogo prima della decisione owner.

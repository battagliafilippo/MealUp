---
name: mealup-food-portrait-fast-same-gates
description: Orchestra un ciclo Food Portrait MealUp compatto: facts e display roles, una reference selezionata, una candidate ImageGen food-only, QA stile anticipato, vessel e gauge deterministici, QA finale e checkpoint. Usa soltanto per cicli autorizzati; non approva, congela, integra o pubblica.
---

# MealUp Food Portrait — FAST SAME GATES

Obiettivo: ridurre token di orchestrazione e tempo di coordinamento senza ridurre la qualita o cambiare il significato di alcun gate.

## Principio non negoziabile

Un generatore probabilistico non garantisce che ogni prima immagine sia perfetta. La pipeline deve invece garantire che nessun output difettoso superi i gate. La qualita resta affidata agli stessi pixel, reference FROZEN e controlli usati dalla baseline approvata.

## Selezione minima per ruolo

- `FOOD`: blocca facts canonici e display roles.
- `PROMPT_ARCHITECT`: seleziona una sola reference pertinente e compila il prompt compatto.
- `VISUAL_PRODUCTION`: genera una sola food layer con alpha; non disegna vessel, gauge, testo o sfondo.
- `QA / EARLY_STYLE`: revisore diverso dal produttore; blocca fotorealismo, alpha falso, vessel o gauge presenti prima della composizione.
- `ENGINEERING`: soltanto dopo `EARLY_STYLE_QA_PASS`, applica vessel e gauge FROZEN con strumenti deterministici.
- `QA / FINAL`: verifica composito, contenuto, crop, kcal e hash. Puo essere lo stesso revisore QA anticipato, mai il produttore.
- `DIRECTOR`: persiste checkpoint e audit; non certifica il proprio output.

Il piano machine-readable e in `tools/ai-office/food-portrait-office-profile.json`; il catalogo e in `tools/ai-office/food-portrait-skill-catalog.json`. Non aggiungere la correction library o il pre-lot gate a un ciclo ordinario: si attivano soltanto quando il task li richiede.

## Fast path ammesso

1. Preflight compatto: restituisci solo decisione, contatori, prossima ricetta, source hash, vessel, reference path+SHA e versione dei gate.
2. Compila un job packet immutabile e hashato. Non caricare la coda completa, `OPERATIONS.md` o cronologia chat quando il packet e sufficiente.
3. Usa una sola reference FROZEN pertinente e un prompt canonico corto con soli dati variabili.
4. Genera esattamente una food layer nativa con alpha. Non generare vessel, gauge, testo, sfondo o ombra da piano.
5. Conserva l'originale ed esegui subito QA tecnico minimo e QA stile indipendente. Al primo FAIL registra il checkpoint e fermati, senza retry.
6. Solo dopo `EARLY_STYLE_QA_PASS`, componi vessel e gauge deterministicamente ed esegui il QA finale indipendente.
7. Registra un evento minimo per ciclo; genera il rollup narrativo soltanto al gate del lotto.
8. Nessun unchanged polling quando lo stato e sospeso o terminale.

## Gate invarianti

- La candidate ImageGen contiene solo cibo con alpha reale; vessel, gauge e kcal sono assenti.
- Nel composito, kcal e lancetta sono esatte secondo la scala FROZEN.
- Vessel, reference e componenti deterministici hanno SHA verificati.
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

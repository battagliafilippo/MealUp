# MealUp Food Portrait — Mandato tracciato senza perdita di requisiti

Versione documento: 2026-10-15 / 1.0. **Registro operativo, NON documento FROZEN.**
Fonte: mandato completo iniziale dell'utente in questa chat; integrazioni autorizzate in chat successive.
Principio: questa matrice conserva **tutti gli obblighi** e impedisce di chiamare DONE una fase rimasta incompleta.

## Vincoli permanenti e prova per ogni requisito

| Mandato | Requisiti da preservare | Attuazione / stato |
| --- | --- | --- |
| 1 — Obiettivo | 454 ricette attuali + future; UN Food Portrait per ricetta; stile MealUp Toys 3D premium; riconoscibile; materiali, luce, proporzioni coerenti; vessel specifico quando previsto; mobile leggero; QA prima dell'uso; intervento owner per eccezione; no falsa identità pixel-perfect | Source-traced specs 454 PASS; qualità e immagini finali **NOT VERIFIED** |
| 2 — Vincoli | costo aggiuntivo permanente 0 €; riusare code/assets/Plus; Images preferito senza assumere API gratuita/illimitata; nessuna dipendenza da crediti di benvenuto; DO NOT TOUCH main, tester, PWA, FROZEN; niente perdita ID/file, bulk prima del pilota, lag, dipendenze pesanti; ambiente separato da AI Office | Branch isolato, registry fail-closed, output reale quarantinato, nessun deploy. Image gen una volta da ChatGPT Images, no nuova API. |
| 3 — Stato e fonti | partenza branch experiment/recipe-visual-agents; audit M2, M3, Groq, G8, G5, manifest famiglie, workflow, stato v124; Master più recente, Costituzione 1.9, FO/card; distinguere proposte storiche e ACTIVE; riusare/correggere | Audit e hashes ricostruiti; M2/M3 riusati; Master patch NON ancora applicata |
| 4 — Visivo | FO famiglia ≠ Food Portrait piatto completo; vietati collage di ingredienti; non eliminare vessel o sostituire vessel_id; VESSEL_FREE senza aggiunta; non confondere hero Pasta Lunga FROZEN con master ritratto; non inventare Golden Master | Prompt A–E con separazione esplicita; reference user stile candidata non Golden Master; G5 vessel SHA mismatch rimane in gate |
| 5A — Golden Registry | fonte approvata, identifier/versione/hash/ambito, MUST, forbidden, registry versionato | Registro iniziale presente; **zero** Golden Master Portrait con fonte verificata; stile utente registrato e originale in libreria |
| 5B — Recipe Spec | recipe ID, ingredienti, preparazione, composizione, famiglia, vessel, reference, eccezioni/output, unknown espliciti | 454 voci reali con revision e SHA, 6 pilot prompt pack, incognite marcate |
| 5C — Queue | batch raggruppabili, checkpoint, resume, cache/dedup, gestione failures, niente duplicate generation | Coda 454 + checkpoint atomici doppio replay PASS; orchestrazione di generazione live ancora aperta |
| 5D — Engine | valutare generazione/riuso/varianti/determinismo/ibrido, budget zero e limite API reale | Architettura ibrida offline-first scelta; ChatGPT Images interattivo provato: candidato 001 FAILED; soluzione unattended **NON DIMOSTRATA** |
| 5E — QA | ingredienti, composizione, vessel, stile, proporzioni, leggibilità, crop, trasparenza, risoluzione, byte; automatico misurabile + visuale indipendente; nomi/file non sufficienti | sharp su pixel + test fixture PASS; output r2 failed verificato a vista e PIL; secondo revisore non ancora qualificato |
| 5F — Exceptions | conformi accettabili automaticamente SOLO dopo pilota, affidabilità QA e approvazione owner; dubbi isolati con motivazione/fix/decisione | status autoaccept=false, exception queue per cause, r2 failed registrato con causa non ancora dimostrata |
| 5G — Staging | mapping, fallback/versioni, WebP/naming, report copertura e performance; deploy separato | Catalogo 454 mapping no fake, 0 disponibili; WebP finali non prodotti; PWA intatta |
| 6 — Metodo | Costituzione AI v1.9 FROZEN integrale; per fase obiettivo/stato/fonti/MUST/invarianti/skill/microstep/dipendenze/QA/rischi/stop/evidenza/next; checkpoint persistente; error-prevention/revalidation; piano riconciliato; freeze Master solo a sezione completa | OPERATIONS.md + audit CI/artefatti; primo fallimento recovery corretto e rivalidato; immagine fallita conservata |
| 7 — Fasi | 1 audit; 2 architettura minima; 3 GM e contratti; 4 implementazione; 5 pilota reale; 6 QA/calibrazione; 7 produzione progressiva solo dopo gate; 8 staging senza deploy | 1 parziale per hash bloccato; 2 definita; 3/4 preproduzione parzialmente PASS; 5 una generazione FAIL; 6-8 da completare |
| 8 — Human-min | eseguire direttamente codice/test/asset; NO approvazioni immagine singola; una sola decisione se davvero necessaria; owner approva standard, pilota, condizioni di autoaccept | Nessuna conferma chiesta per singole operazioni; autoaccept bloccato |
| 9 — AI Office | lavori paralleli isolati; interfacce Director/Food/Design/Visual/QA; non fingere agenti attivi/qualificati; segnare blocchi e continuare | 18 handoff PROPOSAL_ONLY generati/validati con `tools/ai-office/office-orchestrator.cjs`; 0 chiamate modelli con questi handoff |
| 10 — Avvio | audit, DoD, piano micro-step, primo eseguito/validato/checkpoint; real pipeline non documento teorico; master reali o blocco dichiarato | 454-spec, CI, queue, recovery, QA, staging e pacchetti ufficio verificati, un candidato visivo FAIL registrato |

## Revisioni successive del mandato

**15 ottobre — Modifica Master consentita:** obiettivo finale 1 Food Portrait per ogni ricetta; patch mirata alla sezione a chiusura/freeze. Non sostituisce automaticamente gli altri FROZEN, il runtime o i riferimenti più vecchi; evitare aggiornamenti prematuri.

**15 ottobre — Foto reference owner (storico, SUPERSEDED per produzione):** screenshot `IMG_1277(2).jpeg` conservato ORIGINALE nella Library privata; SHA-256 `bc8c117581375c4826cb35072d2033d1274723b525debc023f80fe299fa36790`. Preview crop disponibile con hash indipendente. **STYLE CANDIDATE NON MASTER VESSEL**. La precedente separazione del gauge resta evidenza storica, ma non governa più i nuovi candidati Food Portrait.

**15 ottobre — Contratto gauge Food Portrait FROZEN:** il candidato raster include il gauge fisico visibile con kcal esatte e lancetta derivata dalla mapping FROZEN. Il mismatch richiede rigenerazione e FAIL QA; non è consentito correggere silenziosamente l'immagine con un layer separato. Questa sostituzione vale solo per la produzione Food Portrait nel laboratorio e non autorizza modifiche a tester o PWA.

**15 ottobre — Riallineamento AI Office:** Visual Production usa `OPENAI_BUILT_IN_IMAGEGEN_INTERACTIVE` con una sola candidate per ciclo, checkpoint persistente non sovrascrivibile e budget 0 EUR. La QA tecnica e la QA visuale indipendente sono gate separati; auto-accept, auto-freeze, integrazione e deploy restano vietati. La prova di calibrazione riusa soltanto v10 e genera 0 nuove immagini; `do01` resta esplicitamente bloccato.

**15 ottobre — AI Office + ibrido:** tentare coordinamento tramite il vero AI Office: `office-orchestrator.cjs` 1.3 e ruoli registrati; non dichiarare esecuzione/provider con soli handoff. 6 pilot pack + 18 handoff verificati in CI; nessun cambio al branch ufficio.

**15 ottobre — Primo tentativo visuale:** ChatGPT Images ha reso una griglia con sei immagini, non un singolo r2. QA **FAIL_QUARANTINED**. Hash, ragioni, archivio in Library: `pilot-001-r2-rejected.json`. Non rimuovere evidence, non usarla come asset.

## Golden Rule di continuazione senza perdita

Un evento può avanzare da `PLANNED` a `EXECUTED` solo se esiste l'artefatto; da `EXECUTED` a `VERIFIED` solo dopo QA; da `VERIFIED` ad `APPROVED` solo con policy e fonti necessarie; da `APPROVED` a `FROZEN` solo a chiusura sezione e secondo Costituzione v1.9.

Se un modulo va in FAIL, preservare input, hash, output, errore, causa certa/ignota, prevenzione e test di rivalidazione. Non cancellare/mascherare i fallimenti e non dichiarare pipeline completa finché restano target e gate incompleti.

**Prossimo micro-step:** costruire un unico request packet r2 isolato per verificare l'aderenza del generatore a una singola ricetta; confrontare output con reference disponibile e QA multi-modalità prima di passare agli altri cinque.

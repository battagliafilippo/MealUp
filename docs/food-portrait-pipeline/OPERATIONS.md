# MealUp — Food Portrait Production Pipeline (laboratorio isolato)

Stato: **IN PROGRESS / PARTIALLY VERIFIED**. Data: 2026-10-15.
Questa pagina NON è un FROZEN e non modifica MealUp Master o le decisioni approvate.

## Mandato e confini

- Obiettivo: Food Portrait completi MealUp Toys 3D per le 454 ricette correnti e le future.
- Food Portrait = piatto preparato, vessel canonico se previsto. FO di famiglia = simbolo generico differente.
- Budget ricorrente aggiuntivo 0 €. Nessuna assunzione che ChatGPT Plus fornisca un'API immagini gratuita.
- DO NOT TOUCH: main, tester ufficiale, PWA/runtime, ricette e ID, FROZEN, vecchi asset approvati, pipeline AI Office e segreti.
- Vietate generazione massiva, pubblicazione, accettazione automatica, cambi ai vessel o scelta inventata di Golden Master.
- Branch dedicato: experiment/food-portrait-pipeline-20261015
- Baseline immutabile di lettura: 75d72a8e546005da7bca3284d80a7d6cdbe72aef.
- Protezioni Costituzione Operativa AI v1.9: verità operativa, audit integrale, piano adattivo, stop condition, recovery, High-Fidelity Critical.

## Fonti verificate

- G8/composition-matrix.json, blob dbbfde8da535eb6dafdba912fed0e1d983ff3233, 454 righe.
- assets/family-fo/manifest.json, blob 1c3ea65dc462864741f4cde8289a590e09a557a8, 454 mapping, 14 famiglie.
- tools/recipe-visuals/recipe-analyzer.cjs, blob cb573858527952355b4854521a4d645cc015b66b.
- tools/recipe-visuals/visual-director.cjs, blob 8145b3e985804e47f2eb57eb887db83538c69027.
- tools/recipe-visuals/groq-reasoner.cjs, blob f788c5ecf0ae20937f55f6ce17ba07ecd8edc9fe.
- G8/recipe-scene.mjs, G5/assets/food-objects/catalog.json (storico; non sono Food Portrait già approvati).
- .github/workflows/qa-recipe-analyzer.yml e docs/design/mealup-v124-implementation-state.md (evidenza storica, non automaticamente nuovo ACTIVE).
- Costituzione_Operativa_AI_v1.9_FROZEN.docx e MealUpMaster_v1.24_Profilo_R11_FROZEN.docx disponibili nella libreria. Il Master v1.24 prevede FO di famiglia nelle card R2.2; ogni eventuale sostituzione nella PWA richiede decisione separata.
- Approvazioni Food Portrait successive, quando disponibili, sono nuove decisioni da qualificare; la specifica della Pasta Lunga FO non è un Golden Master universale Food Portrait.

## Audit — risultati e limitazioni

- 454/454 ID matrice univoci e presenti nel manifest; 14 famiglie risolte; nessuna famiglia non riconosciuta.
- Vessel in matrice: PLATE 249, BOWL 124, RAMEKIN 39, DESSERT_MOLD 17, FREE 14, BAKING_DISH 6, CUP 4, PIZZA_SURFACE 1. VESSEL_FREE deve rimanere senza vessel.
- Le righe con status READY_FOR_ASSET_INSTANTIATION NON sono immagini prodotte o certificate.
- M2 ha l'estrattore dei fatti e protegge gli ID; M3 prepara brief completi (352 casi senza evidenza esplicita di impiattamento secondo il workflow storico); M3b è un adapter di ragionamento con mock/dry-run, non un generatore immagini.
- Le vecchie composizioni a ingredienti separati non sono automaticamente valide come nuovo Food Portrait completo.
- Non sono stati verificati Golden Master Food Portrait corredati di sorgente, hash e approvazione né confrontate visivamente immagini pilota.
- ChatGPT Images in chat può produrre immagini, ma non esiste qui prova di un'API di generazione automatica gratuita ricorrente. Quest'ultima resta UNKNOWN/BLOCKED.
- Risultati PASS del controllo di contratti non provano correttezza culinaria, resa 3D o qualità su smartphone.

## Scelta architetturale proposta (Fase 2 — vincoli tecnici)

Una sola pipeline minima **Node.js offline-first, manifest JSON versionati, file locali, nessun database, nessun server, nessun servizio ricorrente**:

M2 analyzer → M3 director e validazione specialistica → Recipe Portrait Spec immutabile per revisione → queue/checkpoint/caching → generatore selezionabile controllato o riuso/composizione deterministica dove accettabile → QA tecnico automatico + QA visivo indipendente → eccezioni/accettazione → staging WebP e manifest per recipe_id.

Motivazione: componenti M2/M3 già funzionanti come preparazione, riuso controllato G8, costo basso, riproducibilità e Git versioning. Scartata la generazione autonoma in massa via ChatGPT Plus come presupposto non dimostrato; scartata la promozione automatica del renderer multi-asset storico a Golden Master. Il motore immagine definitivo va qualificato su riferimento e pilota: un'alternativa automatica gratuita non verificata NON sarà dichiarata disponibile.

## Definition of Done finale — non ancora raggiunta

1. Ogni recipe_id storico e futuro ha spec revisionata con ingredienti, passaggi, vessel_id, fonte, known unknowns e Golden Master valido o eccezione.
2. Golden Master Registry con sorgente effettiva verificata, SHA-256, ambito, regole positive/negative, versione e stato di approvazione.
3. Queue riprendibile, checkpoint atomici, cache/dedup su source hash e reference revision, nessuna immagine persa o approvata per errore.
4. Pilota reale multi-tipologia e multi-vessel con immagini ispezionate da QA indipendente. Misurazione e accettazione esplicita della policy automatica prima dell'autopromozione.
5. Ogni immagine usabile supera test misurabili (dimensioni, alpha, crop, bytes, formato), verifica visuale (piatto corretto, ingredienti, vessel, stile, scala), vincoli mobile e coerenza reference.
6. Asset ottimizzati e manifest di staging recipe_id → versione → asset → fallback, report di copertura ed eccezioni; PWA non modificata.
7. Nessun costo ricorrente aggiuntivo, nessuna modifica ai FROZEN o ai branch protetti senza altra autorizzazione.

## Piano atomico e dipendenze

| ID | Fase | Unica attività | Stato | Dipendenza / verifica |
| --- | --- | --- | --- | --- |
| P1.1 | Audit | Creare branch isolato e fissare la baseline | VERIFIED | branch puntato allo SHA corretto |
| P1.2 | Audit | Inventariare gli script e i riferimenti | VERIFIED | file e SHA letti, limiti espliciti |
| P1.3 | Audit | Eseguire gate di integrità dati | VERIFIED | codice + test remoto CI green |
| P1.4 | Audit | Registrare conflitti, riferimenti mancanti e recovery | PARTIALLY VERIFIED / BLOCKED SOURCE | report reference-audit.v1.json; board originale non recuperato |
| P2.1 | Architettura | Confrontare i metodi di produzione rispetto ai vincoli | VERIFIED DECISION | ARCHITECTURE-AND-MASTER-SCOPE.md |
| P2.2 | Architettura | Formalizzare unico contratto di pipeline offline-first | VERIFIED CONTRACT | ARCHITECTURE-AND-MASTER-SCOPE.md |
| P3.1 | Golden Master | Inventariare i file sorgente effettivi approvati | PARTIAL / UNKNOWN | golden-registry.v1.json; nessun GM Portrait verificato |
| P3.2 | Golden Master | Validare integrità/ambito/hash dei riferimenti | PLANNED | P3.1 |
| P3.3 | Spec | Formalizzare schema per Food Portrait | VERIFIED PREPRODUCTION | portrait-contract.cjs, CI real catalog 454 |
| P3.4 | QA | Definire contratto di ammissione e quarantena | PLANNED | P3.3 |
| P4.1 | Queue | Implementare coda deterministica delle spec | VERIFIED PREPRODUCTION | 454 records, 0 READY |
| P4.2 | Recovery | Implementare checkpoint, dedup e ripresa sicura | VERIFIED PREPRODUCTION | queue-recovery.cjs, 454 replays real CI |
| P4.3 | Engine | Implementare adapter di produzione immagini selezionato | PLANNED | P3.2, P4.2 |
| P4.4 | QA | Implementare validatori misurabili su immagini vere | PARTIAL PASS | sharp pixel analyzer/test e FO reale, QA visuale da qualificare |
| P4.5 | Exceptions | Implementare registro eccezioni fail-closed | VERIFIED PREPRODUCTION | staging-catalog.cjs 2 cause raggruppate, 0 accettazioni |
| P5.1 | Pilota | Selezionare piccolo lotto di vessel diversi | PLANNED | P4.5 |
| P5.2 | Pilota | Produrre immagini reali nel laboratorio | BLOCKED until pilot references | P5.1, riferimenti |
| P5.3 | Pilota | Validare visivamente le immagini reali | PLANNED | P5.2 |
| P6.1 | Calibrazione | Misurare errori e falsi positivi del QA | PLANNED | P5.3 |
| P6.2 | Governance | Richiedere approvazione degli standard e della policy auto-accept | PLANNED | P6.1 |
| P7.1 | Produzione | Ampliare i lotti per eccezione | BLOCKED until authorization | P6.2 |
| P8.1 | Staging | Produrre manifest, WebP e rapporti di copertura | PARTIAL | 454 mapping staged senza asset; WebP pilota assenti |

## Primo checkpoint QA

Workflow: .github/workflows/qa-food-portrait-pipeline.yml
Esecuzione: https://github.com/battagliafilippo/MealUp/actions/runs/38717833831
Commit verificato: 766bbf05295716cd940b76b1ef2e536227ff57bf
Esito: SUCCESS. Passati parsing, fixture negative, crescita futura, audit reale di 454 voci e gate "0 approvazioni immagini". Artefatto: food-portrait-contract-baseline (retention 30 giorni).
NESSUNA immagine prodotta, nessuna integrazione o distribuzione.

## Registro criticità e stop condition

| ID | Problema / causa | Prevenzione | Stato |
| --- | --- | --- | --- |
| E01 | Branch iniziale condiviso con AI Office | branch separato ancorato a SHA | MITIGATED |
| E02 | Il Master della card impone FO famiglia, non portrait | integrazione PWA vietata senza approvazione | OPEN |
| E03 | Nessun Golden Master completo verificato in laboratorio | non scegliere reference inventate | OPEN |
| E04 | 352 ricette senza plating esplicito nei precedenti brief | fatti separati dalle inferenze, QA specialistico | OPEN |
| E05 | Nessun API ChatGPT Images gratuito ricorrente verificato | no promessa di bulk unattended | OPEN |
| E06 | Renderer storico usa strati di ingredienti separati | non trasformarlo in Food Portrait automaticamente | OPEN |
| E07 | Test pixels/crop/mobile e confronto golden mancano | auto-accept disabilitato | OPEN |

Stop immediato su mismatch ID, vessel ignoto, asset o hash golden non verificabile, uscita immagine non ispezionabile, costo aggiuntivo, tentativo di modifica dei FROZEN o degrado mobile.

### Diagnostica reale aggiuntiva — 2026-10-15

**P1.4 ha identificato un blocco concreto non aggirabile modificando l'asset.**

- Nuovo validatore: `tools/food-portrait-pipeline/vessel-asset-audit.cjs` con fixture negative. Verifica gli SHA-256 effettivi delle reference, dei sedici file maschera e la copertura delle otto geometrie G5.
- CI sul commit `c9486158adff83c23f5fac723892b3255695a6ff`: https://github.com/battagliafilippo/MealUp/actions/runs/38719090602 — **FAIL INTENZIONALE DEL GATE** (non è un test tecnico considerato verde).
- Unico errore rimasto: `G5/references/VESSEL_LIBRARY_reference.png`. Hash FROZEN dichiarato da G0/G5: `3318fbf8a718438520b12e9d8d28d88374a46041fc94b3efac1f23b38a50d5c8`. Hash SHA-256 binario reale nel repository: `28bba33ad0caaf6da129ae32ec5e9b771723f99ac9c9fd83aeec3e5c310bef7e`.
- Sedici maschere G5: nessun errore hash rilevato. Otto `source-view.png` mancanti: **warning** (G5 le classifica `PROVENANCE_RGB_VIEW_ONLY`, non sprite runtime necessari), non modifica dei FROZEN; restano recupero/stato aperti.
- Origin del file board presente sin dal commit storico `d1300440cca578b9cf7a3b0ce70116c788645903`: non è un cambiamento causato da questa pipeline.
- Tutti i controlli dati/contratti/fixture precedenti PASS; il QA ha conservato entrambi i report come artifact anche con il gate FAILED, senza modificare immagini.
- Checkpoint leggibile da altri agenti: `docs/food-portrait-pipeline/reference-audit.v1.json`.

| ID | Problema / causa | Prevenzione / recovery | Stato |
| --- | --- | --- | --- |
| E08 | SHA-256 della board vessel storica diverso dal valore G0 FROZEN | reperire sorgente originale/ricostruire provenienza con prova indipendente; vietato cambiare hash previsto per far passare CI | **BLOCKING SOURCE APPROVAL** |
| E09 | Otto preview `source-view.png` dichiarate ma non depositate | classificate come provenance-only, non rigenerate né spacciate per presenti | WARNING DOCUMENTATO |

**Impatto:** il dato `vessel_id` e le sedici maschere sono riutilizzabili come specifiche strutturali, ma l'immagine della board corrente NON può ancora essere promossa a Golden Master ufficiale. La generazione di output finali basata su tale sorgente è sospesa; lavoro su schemi, coda e QA indipendente può proseguire senza dipendere da essa.

**Prossimo micro-step indipendente:** P2.1 — verificare e confrontare tecnicamente produzione AI via ChatGPT Images, riuso deterministico e pipeline ibrida, scegliendo un'unica architettura sostenibile. In parallelo l'issue E08 resta aperto senza richiedere all'utente un riferimento inventato.



## Checkpoint implementazione — 2026-10-15, lavoro autorizzato

**Owner scope:** e' ora autorizzata una futura modifica *mirata* del Master per realizzare Food Portrait specifici per ricetta. Si applica patch al freeze della sezione completa, non aggiornamento distruttivo anticipato; vedi `ARCHITECTURE-AND-MASTER-SCOPE.md`.

**Test remoto effettivo:** https://github.com/battagliafilippo/MealUp/actions/runs/38721300671
- Job `preproduction-specs`: **SUCCESS**, incluso harness M2/M3 di tutte le 454 ricette, `portrait-contract.cjs` con fixture negative e 455a ricetta simulata, `queue-recovery.cjs` con doppio replay del catalogo, `image-technical-qa.cjs` con veri pixel generati da Sharp e decodifica di un FO esistente, `staging-catalog.cjs` con 454 mapping/440 vessel obbligatori e nessuna auto-accettazione.
- Artifact GitHub `food-portrait-preproduction-454`: spec, queue, checkpoint, report, manifest di staging e cause di eccezione.
- Job `contract-baseline`: **FAIL per gate sorgente FROZEN**. Mismatch SHA-256 della board vessel E08, già isolato: NON contrassegnare l'intero workflow SUCCESS.
- Nessuna immagine Food Portrait generata, approvata, integrata o congelata.

**Prevenzione bug introdotto in questo ciclo:** `queue-recovery.cjs` aveva una condizione impossibile per `history` (`!Array.isArray(history) && Array.isArray(history)`), rilevata in CI; corretto e rivalidato con 454 record/replay. Nessuna perdita dati riscontrata.

**Stato finale sottosistemi:**
- PREPRODUCTION SOURCE CONTRACT: VERIFIED
- QUEUE/CHECKPOINT: VERIFIED (soli stati preproduzione)
- MEASURABLE IMAGE QA ENGINE: VERIFIED ON FIXTURES + EXISTING FO (NON sui Food Portrait)
- GOLDEN MASTER BINARY SOURCE: BLOCKED HASH MISMATCH
- VISUAL QUALITY / PILOT / AUTO-ACCEPT POLICY: NOT VERIFIED / NOT AUTHORIZED
- STAGING INDEX: VERIFIED STRUCTURE, PORTRAIT COVERAGE 0/454
- PWA + AI Office: UNCHANGED

**Next atomic step:** recuperare e confrontare una reference Food Portrait/vessel realmente approvata con identità dei byte verificabile oppure ricostruire scientificamente la provenienza della board G5. Non eseguire generazione o approvazione automatica da un riferimento difforme. Continuare i controlli indipendenti che non dipendono dall'asset bloccato.

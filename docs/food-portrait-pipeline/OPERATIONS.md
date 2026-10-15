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


## Checkpoint 2026-10-15 — AI Office ibrido e primo tentativo visivo

**Obiettivo del micro-step:** integrare senza accorpare branch il router AI Office v1.3 con la Food Portrait Pipeline e provare un lotto pilota realmente tracciato.

- Stato branch Food Portrait: preservato su `experiment/food-portrait-pipeline-20261015`; il branch Office `experiment/recipe-visual-agents`, `main`, tester, PWA e Master rimangono inalterati.
- Mandato integrale tracciato: `docs/food-portrait-pipeline/MANDATE-TRACEABILITY.md` (10 sezioni + otto fasi, FROZEN, eccezioni, user approval).
- Reference owner **originale** salvata in Library privata `/MealUp_FoodPortrait_Lab_20261015/References/`: SHA-256 `bc8c117581375c4826cb35072d2033d1274723b525debc023f80fe299fa36790`, con crop/manifest indipendenti. Registrata in `owner-style-reference.v1.json` come **style candidate ONLY**, non Golden Master o prova di vessel.
- Sei ricette REALI M2/G8 selezionate: r2 BOWL, r1 PLATE, s02 RAMEKIN, do08 DESSERT_MOLD, p12 BAKING_DISH, v08 VESSEL_FREE. Controlli sorgente rilevano vino nei passaggi delle lasagne ma non nella lista ingredienti, e bicchiere menzionato nel succo VESSEL_FREE; non cambiati automaticamente.
- Il codice `pilot-office-bridge.cjs` riusa `tools/ai-office/office-orchestrator.cjs`: 18 handoff di proposta (3 per ricetta), ruoli registrati Food, Design, Visual e QA. **NON** sono 18 agenti/provider eseguiti. Zero chiamate a modelli esterni per questi handoff; Office rimane intatto.
- Prompt strutturati A/B/C/D/E per ciascuna ricetta, output persistenti sia come artifact GitHub Actions sia in Library privata `/MealUp_FoodPortrait_Lab_20261015/Pilot_001/` (prompt pack, office assignments, exception review, 454 specs, queue e checkpoint).
- Test end-to-end CI `https://github.com/battagliafilippo/MealUp/actions/runs/38727195386`: job `preproduction-specs` **SUCCESS** (re-test Office routing, dry-run Groq con **0 API calls**, M2/M3 reale 454, prompt pack 6, handoff 18, template isolato singola ricetta, checkpoint 454); job `contract-baseline` continua **FAIL** per E08 board vessel mismatch, quindi **NON** dichiarare workflow globale verde.
- **Prima generazione reale in ChatGPT Images** per r2: il generatore ha prodotto per errore una tavola a sei card con altri piatti, gauge e label incorporati. Evidenza visuale e tecnica `docs/food-portrait-pipeline/pilot-001-r2-rejected.json`, immagine rifiutata in Library privata `Pilot_001/REJECTED_R2_MultiPanel.png`, SHA `d622c345ded16fd6b4a0f0097d641b4421d1d3ed8e58563ecbf82b75e9c4c754`. **FAIL_QUARANTINED**; non Golden Master, non Food Portrait utilizzabile, non PWA. Diagnosi causale ancora ipotesi (contesto multiplo).
- Correzione preventiva codificata: `single-portrait-request.cjs` emette una richiesta r2 UNICA, blocco ingredienti fonte, 1 immagine 1 ricetta, no gauges/UI, nessun confronto/multi-panel; fixture negative e CI PASS. Non prova che ChatGPT Images la esegua correttamente, perché questo ambiente non espone un'API con prompt isolato e generazione unattended garantita.
- Artefatti di checkpoint anche esportati in ZIP privato `MealUp_FoodPortrait_Pilota_01_Checkpoint.zip` (14 voci e validazione archivio integra), conservato in Library. SHA-256 ZIP `7b7ade7723d55e86ef67a1ad3d22548ef67c98eebecfed2afd853e88fdace087`.

**Nuove anomalie e blocchi:**

| ID | Tipo | Stato e decisione |
| --- | --- | --- |
| E10 | OUTPUT_MULTIPANEL_UNEXPECTED | FAIL verificato, candidato isolato e preservato; prevenzione singola ricetta aggiunta e testata; **re-test GENERATORE non eseguito** |
| E11 | PROMPT_ENGINE_NOT_AUTOMATED | Un prompt modulare preparato in CI non equivale a invocazione ImageGen automatica controllata. Non attribuire a Office ruoli visuali eseguiti senza provider e QA |
| E12 | PRIVATE_STYLE_REFERENCE_OUTSIDE_REPO | Immagine originale con hash in Library, non accessibile ai runner GitHub senza montaggio autorizzato; confronto per pixel in CI blocca correttamente |
| E08 | HISTORICAL_VESSEL_SHA_MISMATCH | IRRISOLTO; non alterare SHA canonico né promuovere candidate a reference FROZEN |

**Stato aggiornato:**
- P1–P4 infrastruttura offline e routing: PARTIALLY VERIFIED; packet prompts preparati.
- P5 pilota reale: 1 output generato, 1 **FAIL**, 0 PASS; non completato.
- P6 independent visual QA calibration: incompleto; STOP autoaccept.
- P7 produzione 454 immagini: non autorizzata; 0 immagini utilizzabili.
- P8 manifest staging: 454 mapping presenti; zero portrait integrati.

**Prossimo micro-step autorizzato:** qualificare un generatore capace di consumare la richiesta singola `r2` come contratto isolato, montando la source style reference con hash verificato, e condurre test QA reale; affrontare E08 in parallelo senza riscrivere asset FROZEN. Non aumentare il lotto finché il test non passa.


## Checkpoint 2026-10-15 — secondo tentativo r2 singolo con reference owner verificata

**Obiettivo del micro-step:** generare una sola immagine sperimentale per `r2 — Poke bowl tonno e avocado`, usando la vera reference utente e senza gauge, testi, UI, griglie o altre ricette; eseguire QA tecnico e visuale separato senza auto-accept, freeze o deploy.

- Checkout isolato verificato sul branch `experiment/food-portrait-pipeline-20261015`; `main`, tester ufficiale, PWA e AI Office non modificati.
- Reference utente montata direttamente dall'allegato `IMG_1277(2).jpeg`; SHA-256 ricalcolato `bc8c117581375c4826cb35072d2033d1274723b525debc023f80fe299fa36790`, identico a `owner-style-reference.v1.json`.
- Una sola generazione eseguita con il provider ImageGen integrato, costo aggiuntivo 0 EUR. Output: `docs/food-portrait-pipeline/candidates/r2-poke-visual-candidate-002.png`, SHA-256 `ad2cca0c90da0c1137b5e48e885b009727cda6dc661200ee2ffb565458960f85`, 1254 x 1254, 1.773.915 byte.
- QA visuale post-generazione sull'immagine salvata: **PASS_CANDIDATE_ONLY** per singolo piatto, identità r2, BOWL crema/arancione, riso, cubetti di tonno e avocado, soia integrata, sesamo, leggibilità e assenza di gauge/testi/UI/collage. Nessuna approvazione implicita.
- QA tecnico reale con `image-technical-qa.cjs`: **FAIL** per assenza canale alpha/sfondo trasparente. Il full canvas opaco produce anche `SUBJECT_TOO_LARGE_OR_BACKGROUND`, `NO_TRANSPARENT_BACKGROUND` e `SUBJECT_TOUCHES_CROP_BORDER`. Il file è quadrato e sotto il limite operativo 2 MB, ma questi dati non annullano il FAIL.
- Report completo: `docs/food-portrait-pipeline/pilot-002-r2-visual-candidate.json`.

**Issue log aggiornato:**

| ID | Tipo | Stato e decisione |
| --- | --- | --- |
| E10 | OUTPUT_MULTIPANEL_UNEXPECTED | **MITIGATO nel re-test r2**: il secondo output contiene una sola ricetta e nessuna UI. L'errore storico resta preservato nel report del tentativo 001; nessuna generalizzazione a produzione massiva. |
| E13 | OPAQUE_BACKGROUND_VS_ALPHA_CONTRACT | **OPEN / TECHNICAL FAIL**: il generatore ha prodotto un PNG opaco; non trasformare o approvare automaticamente. Serve una decisione separata sul requisito alpha e, solo se autorizzata, una nuova generazione mirata. |
| E08 | HISTORICAL_VESSEL_SHA_MISMATCH | **BLOCKED invariato**: SHA atteso `3318fbf8...`, SHA repository `28bba33a...`; la candidate non dimostra la tavola vessel FROZEN e non può diventare asset approvato. |

**Stato aggiornato:** un generatore ha dimostrato il rispetto del contratto singola-ricetta per un solo tentativo; `r2` resta `VISUAL_CANDIDATE_REVIEW_REQUIRED_NOT_APPROVED` per FAIL tecnico. Produzione batch, auto-accept, freeze, integrazione e deploy restano vietati.

**Prossimo micro-step necessario ma non ancora autorizzato:** decidere se la trasparenza è obbligatoria per lo staging Food Portrait. Se sì, autorizzare un solo retry r2 che cambi esclusivamente lo sfondo in trasparente e preservi tutti i vincoli visuali già passati; E08 resta indipendentemente bloccato.


## Decision checkpoint 2026-10-15 — trasparenza opzionale, gauge obbligatorio

- Decisione owner: la trasparenza del Food Portrait è **opzionale**; va scelta la soluzione che rende la produzione più semplice e affidabile.
- Decisione owner: il gauge deve essere **visibile nella presentazione finale**.
- Nuova reference gauge fornita: `IMG_1264.jpeg`, SHA-256 `fb7473e2da2cfafe84d0e33a9316c458207e0536b688267e6c18ab0c32535b47`, 497 x 422 RGB. Manifest: `owner-gauge-reference.v1.json`.
- Boundary implementativo: gauge obbligatorio come **UI dinamica separata**, non incorporato nei pixel del Food Portrait. Il valore kcal, la lancetta, accessibilità e posizione responsive devono poter cambiare senza rigenerare il piatto.
- La candidate r2 esistente resta invariata e classificata `VISUAL_CANDIDATE_PORTRAIT_ONLY`; non contiene il gauge e non è un asset approvato.

**Issue log aggiornato:**

| ID | Tipo | Stato e decisione |
| --- | --- | --- |
| E13 | OPAQUE_BACKGROUND_VS_ALPHA_CONTRACT | **OWNER DECISION RECEIVED / IMPLEMENTATION PENDING**: alpha non obbligatorio. Il FAIL storico resta prova corretta del test eseguito; aggiornare esplicitamente la policy QA e rieseguire prima di dichiarare PASS tecnico. |
| E14 | GAUGE_REQUIRED_BUT_NOT_BAKED | **OPEN**: la presentazione finale deve mostrare il gauge secondo la nuova reference owner, come layer UI dinamico separato. Nessuna modifica a tester/PWA autorizzata. |
| E08 | HISTORICAL_VESSEL_SHA_MISMATCH | **BLOCKED invariato**: la decisione su trasparenza e gauge non dimostra né sostituisce la tavola vessel FROZEN. |

**Prossimo micro-step necessario:** aggiornare nel solo laboratorio la configurazione QA affinché l'alpha sia opzionale, rieseguire il controllo sulla candidate invariata e costruire una composizione review r2 non deployata con gauge dinamico separato. Nessun auto-accept o freeze.


## Checkpoint 2026-10-15 — QA opaco e composizione review r2 con gauge separato

- `image-technical-qa.cjs` aggiornato: alpha opzionale per default; su immagini opache non inventa più bounding box o crop derivati dall'alpha. Emesso l'avviso obbligatorio `OPAQUE_BACKGROUND_REQUIRES_VISUAL_CROP_REVIEW`. Il profilo `requiresAlpha:true` resta disponibile e testato fail-closed.
- Self-test veri pixel: PASS per asset trasparente, opaco opzionale, opaco con alpha obbligatorio, crop, risoluzione e byte budget. Auto-accept resta sempre `false`.
- Candidate r2 invariata, SHA-256 `ad2cca0c90da0c1137b5e48e885b009727cda6dc661200ee2ffb565458960f85`: `TECHNICAL_PASS_VISUAL_REVIEW_REQUIRED`, con crop opaco demandato alla review visuale.
- Composizione isolata non deployata: `review/r2-gauge-composition.html`. Il gauge è un layer DOM/SVG separato; il PNG portrait non è stato modificato.
- `490 kcal` deriva dalla ricetta r2 in `index.html`; il `320` della reference non è stato copiato come dato.
- Browser QA reale su larghezza mobile: immagine, crop, titolo e gauge leggibili. Test dinamico 490 → 650 → 490 ha aggiornato numero, label accessibile e lancetta.
- Report: `review/r2-gauge-composition.qa.json`. Stato `VERIFIED_REVIEW_COMPOSITION_ONLY`, non approvato e non FROZEN.

**Issue log aggiornato:**

| ID | Tipo | Stato e decisione |
| --- | --- | --- |
| E13 | OPAQUE_BACKGROUND_VS_ALPHA_CONTRACT | **RESOLVED FOR REVIEW PIPELINE**: alpha opzionale, crop opaco sottoposto a review visuale obbligatoria; nessun auto-accept. |
| E14 | GAUGE_REQUIRED_BUT_NOT_BAKED | **IMPLEMENTED + VERIFIED IN ISOLATED REVIEW**: gauge dinamico separato e visibile; nessuna integrazione tester/PWA. |
| E08 | HISTORICAL_VESSEL_SHA_MISMATCH | **BLOCKED invariato**: la review non prova la tavola vessel FROZEN e non abilita freeze o produzione batch. |

**Prossimo micro-step:** review visuale owner della composizione r2. Senza approvazione esplicita non eseguire freeze, integrazione, batch o deploy.


## Owner rejection checkpoint 2026-10-15 — richiesta identità con IMG_1277.png

- L'owner ha respinto la composizione ricostruita: Food Portrait e gauge separato non erano identici alla nuova foto allegata.
- Nuova regola per r2: usare direttamente `IMG_1277.png` come source visiva; vietata rigenerazione o reinterpretazione per dichiarare identità.
- Source copiata senza alterazione in `candidates/r2-owner-exact-source-003.png`; SHA-256 sorgente e copia `027938a98ef75a4da87fae437c242b54c2b74997ded899ffc499a924366a579a`, identità byte verificata.
- Il file 1179 x 2556 contiene un'area visiva quadrata 1179 x 1179 nel bounding box non nero `[0,688,1179,1867]`. La review applica solo crop CSS centrale non distruttivo; nessun pixel del source viene riscritto.
- La review precedente resta preservata ma `REJECTED_BY_OWNER_NOT_IDENTICAL_SUPERSEDED`.
- Conflitto dati bloccante: la source owner mostra `480 kcal`; la ricetta r2 corrente in `index.html` dichiara `490 kcal`. Nessun dato o pixel modificato automaticamente.

**Issue log aggiornato:**

| ID | Tipo | Stato e decisione |
| --- | --- | --- |
| E15 | RECONSTRUCTED_REVIEW_NOT_IDENTICAL | **REJECTED + SUPERSEDED**: non ricostruire bowl/gauge quando è richiesta identità; usare i byte owner. |
| E16 | OWNER_IMAGE_480_VS_RECIPE_490_KCAL | **BLOCKED DECISION**: identità visiva e coerenza catalogo non possono essere entrambe vere senza una decisione sul valore autorevole. |
| E08 | HISTORICAL_VESSEL_SHA_MISMATCH | **BLOCKED invariato**: la nuova source owner non dimostra la tavola vessel FROZEN storica. |

**Prossimo micro-step necessario:** ottenere una decisione owner sul valore kcal autorevole. Fino ad allora la source è `VISUAL_SOURCE_EXACT`, ma non asset approvato/FROZEN e non deployabile.


## Owner decision checkpoint 2026-10-15 — visual approvato, kcal dalla card

- L'owner dichiara perfetta la composizione basata sulla source `IMG_1277.png`.
- Il valore kcal autorevole è quello già calcolato nella card ricetta: per r2 `490 kcal` da `index.html`.
- Per preservare la source visiva approvata, i byte `027938a98ef75a4da87fae437c242b54c2b74997ded899ffc499a924366a579a` restano invariati. La review copre soltanto il testo kcal incorporato con un layer UI dinamico `490 kcal` ancorato al quadrante.
- La decisione risolve il conflitto E16 a livello review; richiede comunque QA visuale sul posizionamento. Non equivale a freeze o autorizzazione deploy.

**Issue log aggiornato:**

| ID | Tipo | Stato e decisione |
| --- | --- | --- |
| E16 | OWNER_IMAGE_480_VS_RECIPE_490_KCAL | **RESOLVED IN REVIEW**: source invariata, valore visibile 490 letto dalla card tramite layer dinamico. |
| E15 | RECONSTRUCTED_REVIEW_NOT_IDENTICAL | **CLOSED**: bowl e gauge non vengono più ricostruiti; si usa la source owner diretta. |
| E08 | HISTORICAL_VESSEL_SHA_MISMATCH | **BLOCKED invariato**: l'approvazione visuale r2 non dimostra la tavola vessel FROZEN storica. |

**Prossimo micro-step:** QA visuale del solo overlay 490 sul gauge. Senza successiva autorizzazione esplicita non eseguire freeze, integrazione, batch o deploy.

### Esito QA overlay kcal

- Browser QA reale: **PASS**. `490 kcal` copre il precedente 480 ed è centrato nel quadrante.
- Lancetta, perno, arco colorato, bowl e cibo restano visivamente invariati.
- Etichetta accessibile verificata: `490 chilocalorie dalla card ricetta`.
- Stato r2: `OWNER_VISUAL_APPROVED_DYNAMIC_KCAL_REVIEW_NOT_FROZEN`.

**Prossimo micro-step necessario:** nessuna decisione visuale o kcal rimasta per la review r2. Attendere un'autorizzazione separata prima di freeze, integrazione, estensione del batch o deploy; E08 resta bloccato.


## Owner approval checkpoint 2026-10-15 — r2 APPROVED, non FROZEN

- L'owner approva esplicitamente la composizione r2 basata sulla source `IMG_1277.png` e sul layer dinamico `490 kcal` proveniente dalla card ricetta.
- Stato aggiornato: `OWNER_APPROVED_DYNAMIC_KCAL_NOT_FROZEN`.
- Scope dell'approvazione: Food Portrait r2, visuale owner e corrispondenza dinamica del valore kcal alla card.
- Non autorizzati da questa decisione: stato FROZEN, integrazione tester/PWA, estensione batch o deploy.
- E08 resta `BLOCKED_HASH_MISMATCH`: l'approvazione r2 non dimostra né sostituisce la tavola vessel FROZEN storica.

**Prossimo micro-step necessario:** definire con autorizzazione separata se congelare r2 come riferimento o usarlo come base per il successivo pilota controllato. Nessuna azione automatica.


## Delegated decision checkpoint 2026-10-15 — Food Portrait Style v1 FROZEN

- L'owner delega la decisione operativa con il vincolo che tutti i Food Portrait seguano identicamente lo stile r2 approvato e che la lancetta avanzi dal verde al rosso al crescere delle calorie.
- Decisione: congelare r2 come **riferimento stilistico canonico**, non come ricetta universale. Contratto: `food-portrait-style-frozen-v1.json`.
- Invarianti FROZEN: MealUp Toys 3D premium, vessel crema/arancio, luce calda, composizione hero tre-quarti, singolo piatto integrato, materiali soft glossy, proporzioni mobile e linguaggio del gauge identici alla source owner SHA `027938a98ef75a4da87fae437c242b54c2b74997ded899ffc499a924366a579a`.
- Variabili per ricetta: ingredienti/preparazione, vessel canonico, numero kcal letto dalla card, posizione lancetta.
- Audit sui 454 valori kcal reali: minimo 0, mediana 480, P75 645, P90 820, P95 995, massimo 3900, 23 ricette oltre 1000.
- Scala FROZEN scelta: 0–1000 kcal, angolo lineare -60° verde → +60° rosso. Oltre 1000 la lancetta satura sul rosso ma il numero resta esatto. Formula verificata da `gauge-mapping.cjs`.
- Lo stile FROZEN non risolve E08 e non autorizza produzione batch, integrazione tester/PWA o deploy.

**Stato:** r2 APPROVED; Food Portrait Style v1 FROZEN; gauge mapping FROZEN; E08 BLOCKED; produzione massiva NON AUTORIZZATA.

**Prossimo micro-step necessario:** preparare un secondo pilot controllato con ricetta/vessel diversi applicando il nuovo contratto, quindi confrontarlo visivamente con r2 prima di autorizzare qualsiasi lotto.


## Second pilot checkpoint 2026-10-15 — r1 PLATE visual candidate

- Generata una sola immagine per `r1`, **Carpaccio di manzo con rucola e feta**, usando direttamente come reference il source r2 FROZEN SHA `027938a98ef75a4da87fae437c242b54c2b74997ded899ffc499a924366a579a`.
- Candidate: `candidates/r1-carpaccio-plate-candidate-001.png`, SHA-256 `13146e628da3aca5f0a1774051ad5f9187f7c194a79b66e939fd5245c07f6f27`, 1254 x 1254 PNG.
- QA visivo indipendente su pixel originali e confronto browser reale: **PASS CANDIDATE ONLY**. Verificati un solo piatto, vessel `VESSEL_PLATE`, carpaccio a raggiera, rucola centrale, feta, condimento, stile r2, testo esatto `380 kcal`, lancetta più verde rispetto ai `490 kcal` di r2, leggibilità mobile e assenza di UI/testi estranei.
- QA tecnico: **FAIL**. Peso `2.030.093` byte contro limite `2.000.000`; eccedenza esatta `30.093` byte. Nessuna ottimizzazione applicata prima dell'approvazione visuale owner.
- Stato: `VISUAL_CANDIDATE_TECHNICAL_FAIL_NOT_APPROVED`. Nessun auto-accept, freeze, batch, integrazione o deploy.

**Issue log aggiornato:**

| ID | Tipo | Stato e decisione |
| --- | --- | --- |
| E17 | R1_PNG_BYTE_BUDGET_EXCEEDED | **OPEN / TECHNICAL FAIL**: il candidato supera il budget di 30.093 byte. Se approvato visualmente dall'owner, il solo passo successivo consentito è un'ottimizzazione lossless/visually lossless con nuovo SHA e nuova QA comparativa. |
| E08 | HISTORICAL_VESSEL_SHA_MISMATCH | **BLOCKED invariato**: il pilot r1 non dimostra la tavola vessel FROZEN storica. |

**Prossimo micro-step necessario:** review visuale owner del candidato r1. Solo dopo approvazione esplicita, ottimizzare il file per rientrare nel budget e rieseguire QA tecnica e visiva; nessun lotto o deploy.


## Owner approval + lossless optimization checkpoint 2026-10-15 — r1 APPROVED, non FROZEN

- Decisione owner: il candidato r1 è «perfetto» e quindi approvato visualmente.
- Ottimizzazione eseguita esclusivamente dopo l'approvazione: PNG `2.030.093` byte → WebP lossless `1.428.452` byte.
- Asset approvato: `candidates/r1-carpaccio-plate-approved-001.webp`, SHA-256 `7be03065e37431a37dc97798cb4c2a2d8660080c30d193f4061ad2808dfc78c0`.
- Confronto raw indipendente: **PASS**, 1254 x 1254 x 3 pixel decodificati identici al PNG approvato.
- QA tecnico sul WebP: **PASS**, nessun errore; review crop opaco già completata visivamente.
- Stato r1: `OWNER_APPROVED_TECHNICAL_PASS_NOT_FROZEN`. Approvazione visuale e tecnica non autorizzano freeze, produzione batch, integrazione o deploy.

**Issue log aggiornato:**

| ID | Tipo | Stato e decisione |
| --- | --- | --- |
| E17 | R1_PNG_BYTE_BUDGET_EXCEEDED | **RESOLVED**: conversione WebP lossless sotto budget e identità pixel verificata; PNG storico preservato come prova del candidato originario. |
| E08 | HISTORICAL_VESSEL_SHA_MISMATCH | **BLOCKED invariato**: approvazione e ottimizzazione r1 non dimostrano la tavola vessel FROZEN storica. |

**Prossimo micro-step necessario:** decidere separatamente se congelare r1 come secondo riferimento verificato o autorizzare un nuovo pilot atomico. Nessun batch o deploy automatico.


## Delegated use decision 2026-10-15 — r1 PLATE FROZEN

- L'owner conferma che r1 è perfetto in ogni dettaglio, coincide con la visione desiderata e delega la decisione se usarlo.
- Decisione tecnica: **usarlo e congelarlo** come riferimento canonico `VESSEL_PLATE`, affiancato al riferimento r2 `VESSEL_BOWL`.
- Manifest immutabile: `r1-plate-frozen-v1.json`.
- Asset FROZEN: `candidates/r1-carpaccio-plate-approved-001.webp`, SHA-256 `7be03065e37431a37dc97798cb4c2a2d8660080c30d193f4061ad2808dfc78c0`.
- Il contratto `food-portrait-style-frozen-v1.json` ora contiene riferimenti canonici distinti per `VESSEL_BOWL` e `VESSEL_PLATE`.
- Freeze circoscritto: asset r1, geometria/stile PLATE, composizione ingredienti e gauge 380. Non autorizza batch, integrazione o deploy.
- E08 resta `BLOCKED_HASH_MISMATCH`: questo nuovo riferimento non dimostra la tavola vessel storica.

**Stato:** r1 PLATE FROZEN; r2 BOWL FROZEN; stile generale FROZEN; produzione massiva NON AUTORIZZATA.

**Prossimo micro-step necessario:** scegliere una singola ricetta con un vessel non ancora coperto e produrre un solo nuovo pilot contro i due riferimenti FROZEN, oppure fermarsi qui. Nessuna espansione automatica.

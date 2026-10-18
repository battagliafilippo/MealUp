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


## Third pilot checkpoint 2026-10-15 — s02 RAMEKIN visual candidate

- Selezionata la prossima ricetta prevista dal pilot: `s02`, **Salsa yogurt e cetriolo**, `VESSEL_RAMEKIN`, `100 kcal` dalla card.
- Generata una sola immagine con ImageGen built-in usando entrambi i riferimenti FROZEN r1 PLATE e r2 BOWL; costo aggiuntivo dichiarato `0 EUR`.
- Candidate: `candidates/s02-yogurt-cucumber-ramekin-candidate-001.png`, SHA-256 `d7d816ad48ca1d2238930d9faa3246e1a0c23a6c217e54806bb5df35b684df2`, 1254 x 1254, `1.790.992` byte.
- QA tecnico: **PASS**, con soli warning previsti per crop opaco e successiva conversione WebP dopo approvazione.
- QA visivo indipendente: singola salsa, identità yogurt/cetriolo/menta, nessun ingrediente estraneo evidente, `100 kcal` esatto, lancetta profonda nel verde coerente con angolo atteso `-48°`, stile e leggibilità mobile PASS come candidate.
- Punto aperto per owner review: il contenitore è coerente nello stile ma appare generoso; confermare che legga come ramekin e non come bowl.
- Stato: `VISUAL_CANDIDATE_REVIEW_REQUIRED_NOT_APPROVED`. Nessun auto-accept, freeze, batch, integrazione o deploy.
- E08 resta `BLOCKED_HASH_MISMATCH` e indipendente dal nuovo pilot.

**Prossimo micro-step necessario:** review visuale owner del solo candidato s02. Se approvato, ottimizzazione lossless, nuova QA e decisione separata sull'eventuale freeze RAMEKIN.


## Owner approval + RAMEKIN freeze checkpoint 2026-10-15 — s02 FROZEN

- Decisione owner: s02 è perfetto ed esattamente conforme alla visione desiderata; il dubbio sulla scala del ramekin è risolto.
- Ottimizzazione lossless: PNG `1.790.992` byte → WebP `1.207.478` byte, con pixel decodificati identici.
- Asset FROZEN: `candidates/s02-yogurt-cucumber-ramekin-approved-001.webp`, SHA-256 `32fefca8fcfd22db9f996dd6b5ca47b81abc5bfbe16d63c82268dba84117ad4c`.
- QA tecnico: **PASS**; valore `100 kcal` e angolo gauge `-48°` verificati rispetto alla mapping FROZEN.
- Manifest: `s02-ramekin-frozen-v1.json`. Contratto stilistico aggiornato con il terzo riferimento canonico `VESSEL_RAMEKIN`.
- Stato: r1 PLATE FROZEN; r2 BOWL FROZEN; s02 RAMEKIN FROZEN. Nessun batch, integrazione o deploy autorizzato.
- E08 resta `BLOCKED_HASH_MISMATCH` e indipendente dai tre riferimenti verificati.

**Prossimo micro-step necessario:** un solo pilot per il prossimo vessel previsto (`VESSEL_DESSERT_MOLD`) oppure arresto della sperimentazione. Nessuna produzione massiva automatica.


## Fourth pilot checkpoint 2026-10-15 — do08 DESSERT_MOLD visual candidate

- Ricetta reale verificata: `do08`, **Cheesecake fredda allo yogurt**, `VESSEL_DESSERT_MOLD`, `1600 kcal` dalla card.
- Regola overflow applicata: numero esatto `1600`, lancetta saturata al massimo rosso (`60°`) sulla scala FROZEN 0–1000.
- Generata una sola immagine con ImageGen built-in usando i tre riferimenti FROZEN; costo aggiuntivo dichiarato `0 EUR`.
- Candidate: `candidates/do08-yogurt-cheesecake-dessert-mold-candidate-001.png`, SHA-256 `028089929538746cabba0af31178cd96097b0b238101456cfb5600e2f4a86b61`, 1254 x 1254, `2.007.594` byte.
- QA visivo indipendente: **PASS CANDIDATE ONLY**. Stampo apribile distinto, cheesecake intera, base avena/burro, crema yogurt/formaggio/miele, copertura di fragole, nessun ingrediente estraneo rilevato, gauge e testo corretti.
- QA tecnico: **FAIL** esclusivamente per eccedenza di `7.594` byte sul limite di 2 MB. Nessuna ottimizzazione prima dell'approvazione owner.
- Stato: `VISUAL_CANDIDATE_TECHNICAL_FAIL_NOT_APPROVED`. Nessun auto-accept, freeze, batch, integrazione o deploy.
- E08 resta `BLOCKED_HASH_MISMATCH` e indipendente dal pilot.

**Prossimo micro-step necessario:** review visuale owner del candidato do08. Se approvato, conversione WebP lossless, QA ripetuta e decisione separata sul freeze `VESSEL_DESSERT_MOLD`.


## Owner approval + DESSERT_MOLD freeze checkpoint 2026-10-15 — do08 FROZEN

- Decisione owner: do08 è perfetto ed esattamente conforme alla visione desiderata.
- Ottimizzazione lossless: PNG `2.007.594` byte → WebP `1.417.140` byte, con pixel decodificati identici.
- Asset FROZEN: `candidates/do08-yogurt-cheesecake-dessert-mold-approved-001.webp`, SHA-256 `741b17c19c28cdb679abf7d5c85292281ed40579cf4c90667b37d81df1e81dc4`.
- QA tecnico: **PASS**; `1600 kcal` resta esatto mentre la lancetta è saturata a `60°` rosso secondo la mapping FROZEN.
- Manifest: `do08-dessert-mold-frozen-v1.json`. Contratto stilistico aggiornato con `VESSEL_DESSERT_MOLD`.
- Stato: PLATE, BOWL, RAMEKIN e DESSERT_MOLD FROZEN. Nessun batch, integrazione o deploy autorizzato.
- E08 resta `BLOCKED_HASH_MISMATCH` e indipendente dai quattro riferimenti verificati.

**Prossimo micro-step necessario:** un solo pilot per il prossimo vessel previsto (`VESSEL_BAKING_DISH`) oppure arresto della sperimentazione. Nessuna produzione massiva automatica.


## Fifth pilot checkpoint 2026-10-15 — p12 BAKING_DISH visual candidate

- Ricetta reale verificata: `p12`, **Lasagne alla bolognese**, `VESSEL_BAKING_DISH`, `790 kcal` dalla card.
- Anomalia source preservata: il vino è citato nei passaggi ma assente dalla lista ingredienti; non è stato reso come bottiglia, bicchiere o prop.
- Mapping gauge verificata: `790 kcal` → `34,8°`, zona arancione alta, non saturata sul rosso.
- Generata una sola immagine con ImageGen built-in usando i quattro riferimenti FROZEN; costo aggiuntivo dichiarato `0 EUR`.
- Candidate: `candidates/p12-lasagne-baking-dish-candidate-001.png`, SHA-256 `d0a1f708c8dc6dfd7f48c8feb697b90f351f20c5e4e7e9d55d1de6b36d332add`, 1254 x 1254, `2.000.783` byte.
- QA visivo indipendente: **PASS CANDIDATE ONLY**. Teglia rettangolare con due manici, cinque strati leggibili, ingredienti coerenti, nessun prop estraneo, `790 kcal` e lancetta corretti.
- QA tecnico: **FAIL** esclusivamente per eccedenza di `783` byte sul limite di 2 MB. Nessuna ottimizzazione prima dell'approvazione owner.
- Stato: `VISUAL_CANDIDATE_TECHNICAL_FAIL_NOT_APPROVED`. Nessun auto-accept, freeze, batch, integrazione o deploy.
- E08 resta `BLOCKED_HASH_MISMATCH` e indipendente dal pilot.

**Prossimo micro-step necessario:** review visuale owner del candidato p12. Se approvato, conversione WebP lossless, QA ripetuta e decisione separata sul freeze `VESSEL_BAKING_DISH`.


## Owner approval + BAKING_DISH freeze checkpoint 2026-10-15 — p12 FROZEN

- Decisione owner: p12 è perfetto ed esattamente conforme alla visione desiderata.
- Ottimizzazione lossless: PNG `2.000.783` byte → WebP `1.362.496` byte, con pixel decodificati identici.
- Asset FROZEN: `candidates/p12-lasagne-baking-dish-approved-001.webp`, SHA-256 `e11055f04bd0424fcd495c23fa20206d13b62eb7d985a58d1ac4e028edebafe2`.
- QA tecnico: **PASS**; `790 kcal`, angolo `34,8°` e zona arancione verificati sulla mapping FROZEN.
- Manifest: `p12-baking-dish-frozen-v1.json`. Contratto stilistico aggiornato con `VESSEL_BAKING_DISH`.
- Stato: PLATE, BOWL, RAMEKIN, DESSERT_MOLD e BAKING_DISH FROZEN. Nessun batch, integrazione o deploy autorizzato.
- E08 resta `BLOCKED_HASH_MISMATCH` e indipendente dai cinque riferimenti verificati.

**Prossimo micro-step necessario:** trattare separatamente il caso `v08 VESSEL_FREE`, che presenta un conflitto tra classificazione FREE e bicchiere citato nei passaggi; non generare finché il conflitto non è risolto.


## VESSEL_FREE exception resolution 2026-10-15 — v08 deciso, non generato

- Source verificata: `v08`, **Succo d'arancia**, `90 kcal`, ingrediente `succo di arancia 200 ml`.
- G8 assegna `VESSEL_FREE` e primary `BEVERAGE_JUICE_BOX` variante `ARANCIA`; G5 conferma `VESSEL_FREE`. La categoria `VESSEL_GLASS` esiste ma non è assegnata a v08.
- I passaggi dicono «Agita la bottiglia» e poi «Versa in un bicchiere»: bottiglia/bicchiere descrivono confezione e consumo, non autorizzano la sostituzione del vessel canonico.
- Decisione: **mantenere `VESSEL_FREE`**. Il futuro Food Portrait userà come soggetto il contenitore neutro del succo; non aggiungerà bicchiere né altro vessel.
- Nessuna modifica a G8, G5, main, tester o AI Office. Manifest decisionale: `v08-vessel-resolution-v1.json`.
- Nessuna immagine generata in questo micro-step. E08 resta `BLOCKED_HASH_MISMATCH`.

**Prossimo micro-step necessario:** generare una sola candidate v08 con package/bottle `VESSEL_FREE`, `90 kcal` e lancetta verde, quindi QA e review owner prima di qualsiasi approvazione.


## Sixth pilot checkpoint 2026-10-15 — v08 VESSEL_FREE visual candidate

- Generata una sola immagine per `v08`, **Succo d'arancia**, mantenendo `VESSEL_FREE` secondo la decisione verificata.
- Soggetto: una sola bottiglia neutra di succo; nessun bicchiere, cup, bowl, plate, frutta sciolta, label o branding.
- Candidate: `candidates/v08-orange-juice-vessel-free-candidate-001.png`, SHA-256 `9a79f281726d09140a4f6a283e3a4d6950fab06335c2d02190da79b3ee1b24d2`, 1254 x 1254, `1.593.369` byte.
- Mapping gauge verificata: `90 kcal` → `-49,2°`, zona verde, leggermente più bassa del riferimento s02 da 100 kcal.
- QA tecnico: **PASS**. QA visivo indipendente: **PASS CANDIDATE ONLY**; contratto VESSEL_FREE preservato e nessun extra rilevato.
- Stato: `VISUAL_CANDIDATE_REVIEW_REQUIRED_NOT_APPROVED`. Nessun auto-accept, freeze, batch, integrazione o deploy.
- E08 resta `BLOCKED_HASH_MISMATCH` e indipendente dal pilot.

**Prossimo micro-step necessario:** review visuale owner del candidato v08. Se approvato, conversione WebP lossless, QA ripetuta e decisione separata sull'eventuale freeze del caso VESSEL_FREE.


## Owner approval + VESSEL_FREE freeze checkpoint 2026-10-15 — v08 FROZEN

- Decisione owner: v08 è perfetto ed esattamente conforme alla visione desiderata.
- Ottimizzazione lossless: PNG `1.593.369` byte → WebP `965.934` byte, con pixel decodificati identici.
- Asset FROZEN: `candidates/v08-orange-juice-vessel-free-approved-001.webp`, SHA-256 `10e4255f30383b50d75db0e1a07309da7a5c50a8616f098d8b21fc44b4fd6b64`.
- QA tecnico: **PASS**; `90 kcal`, angolo `-49,2°` e zona verde verificati sulla mapping FROZEN.
- Manifest: `v08-vessel-free-frozen-v1.json`. Contratto stilistico aggiornato con `VESSEL_FREE` e regola nessun serving vessel aggiunto.
- Stato: PLATE, BOWL, RAMEKIN, DESSERT_MOLD, BAKING_DISH e VESSEL_FREE FROZEN. Nessun batch, integrazione o deploy autorizzato.
- E08 resta `BLOCKED_HASH_MISMATCH` e indipendente dai sei riferimenti verificati.

**Prossimo micro-step necessario:** consolidare i sei pilot FROZEN in un report di copertura e valutare, con autorizzazione separata, se il campione è sufficiente per progettare il primo lotto controllato. Nessuna produzione massiva automatica.


## Frozen reference coverage checkpoint 2026-10-15 — campione sufficiente con boundary

- Consolidati sei riferimenti FROZEN con asset, SHA, kcal, QA e approvazione owner nel report `frozen-reference-coverage-v1.json`.
- Copertura catalogo verificata: **449/454 ricette (98,90%)** e **6/8 categorie vessel (75%)**.
- Categorie coperte: PLATE 249, BOWL 124, RAMEKIN 39, DESSERT_MOLD 17, BAKING_DISH 6, VESSEL_FREE 14.
- Gap: `VESSEL_CUP` 4 ricette e `VESSEL_PIZZA_SURFACE` 1 ricetta; non possono entrare in un lotto finché non avranno riferimenti FROZEN dedicati.
- Copertura gauge dimostrata: verde basso 90/100, fascia intermedia 380/490, arancione 790, clamp rosso con numero esatto 1600.
- Decisione tecnica: **campione sufficiente per progettare un primo lotto controllato ristretto ai sei vessel coperti**. Non sufficiente per produzione catalogo completa.
- Nessuna produzione autorizzata da questa decisione. Restano obbligatori QA tecnico per immagine, QA visivo indipendente e approvazione owner; vietati auto-accept, integrazione e deploy.
- E08 resta `BLOCKED_HASH_MISMATCH` e non viene aggirato dal report di copertura.

**Prossimo micro-step necessario:** progettare, senza produrre immagini, il perimetro del primo lotto controllato ristretto ai vessel coperti e sottoporlo ad autorizzazione separata.


## Controlled lot design checkpoint 2026-10-15 — FPP-LOT-001 PROPOSED, non autorizzato

- Progettato il primo lotto controllato come sequenza di **6 nuove ricette**, una per ciascuna categoria vessel coperta da reference FROZEN.
- Ordine per rischio crescente: `v10` VESSEL_FREE, `do01` RAMEKIN, `a07` PLATE, `r3` BOWL, `d32` BAKING_DISH, `do10` DESSERT_MOLD.
- Ricette, ingredienti, kcal e vessel verificati contro `index.html` e `G8/composition-matrix.json`; SHA delle fonti registrati nel piano `controlled-lot-001-plan-v1.json`.
- Il gauge è obbligatorio secondo il contratto FROZEN: valore dalla card e angolo deterministico; per `do10` il numero resta `1560 kcal` e la lancetta satura a `60°` rosso.
- Modalità prevista: **una sola candidate per ciclo**, poi QA tecnico, QA visivo indipendente e review owner. Vietata l'esecuzione batch.
- Stato: `PROPOSED_NOT_AUTHORIZED_FOR_GENERATION`. Nessuna immagine prodotta, nessun auto-accept, freeze, integrazione o deploy.
- `VESSEL_CUP` e `VESSEL_PIZZA_SURFACE` restano esclusi; E08 resta `BLOCKED_HASH_MISMATCH`.

**Prossimo micro-step necessario:** autorizzazione separata del solo elemento 1, `v10 — Succo ACE`; gli altri cinque elementi restano soltanto pianificati.


## Controlled lot 001 · cycle 1 checkpoint 2026-10-15 — v10 visual candidate

- Generata **una sola immagine** per `v10`, **Succo ACE**, primo e unico elemento autorizzato del lotto 001.
- Candidate: `candidates/v10-ace-juice-vessel-free-candidate-001.png`, SHA-256 `9a5035c01b2658eaba91e06513d4f238825d06600fd9a4dc78206e9b21f26f92`, 1254 × 1254, `1.578.034` byte.
- Vincolo `VESSEL_FREE` rispettato: una confezione neutra come soggetto; nessun bicchiere, cup, bowl, plate, frutta sciolta, label o brand.
- Gauge visibile con testo esatto `95 kcal`; lancetta in zona verde coerente con l'angolo atteso `-48,6°`. Non viene dichiarata una precisione sub-grado misurata dal raster.
- QA tecnico su pixel reali: **PASS**, con warning previsti per crop opaco e futura conversione WebP solo dopo eventuale approvazione visuale.
- QA visivo post-generazione: **PASS CANDIDATE ONLY** per stile FROZEN, singolo soggetto, leggibilità mobile, crop, assenza di elementi estranei e direzione del gauge.
- Limite registrato: senza label o ingredienti sciolti, l'identità ACE è sostenuta dalla mapping canonica e dal colore del succo, ma non è distinguibile autonomamente dal succo d'arancia.
- Stato: `VISUAL_CANDIDATE_REVIEW_REQUIRED_NOT_APPROVED`. Nessun auto-accept, ottimizzazione, freeze, integrazione, deploy o avanzamento a `do01`.
- E08 resta `BLOCKED_HASH_MISMATCH` e indipendente da questo ciclo.

**Prossimo micro-step necessario:** review visuale owner della sola candidate v10. Solo dopo un'approvazione esplicita sarà consentita l'ottimizzazione lossless e la nuova QA; il secondo elemento del lotto resta non autorizzato.


## Owner approval + lossless optimization checkpoint 2026-10-15 — v10 APPROVED, non FROZEN

- Decisione owner: la candidate v10 è approvata.
- Ottimizzazione lossless: PNG `1.578.034` byte → WebP `944.940` byte.
- Asset approvato: `candidates/v10-ace-juice-vessel-free-approved-001.webp`, SHA-256 `0c0bd1f2023c34bf81963109c4856d50ff6f76b54a876fc97c68d879eb24d6ba`.
- Confronto raw: **PASS**, 1254 × 1254 × 3 pixel decodificati identici alla candidate approvata.
- QA tecnico sul WebP: **PASS**; crop opaco già verificato visivamente nella review browser.
- Stato v10: `OWNER_APPROVED_TECHNICAL_PASS_NOT_FROZEN`. Nessun auto-freeze, integrazione, deploy o avanzamento automatico al secondo elemento del lotto.

**Audit indipendenza AI Office:** lo stato corrente non è autonomo. `agent-registry.cjs` dichiara Director `INTERACTIVE_ONLY`, Visual Production `MANUAL_AUTHORIZATION_REQUIRED` e `autonomousExecution: false`; `pilot-office-bridge.cjs` prepara handoff e prompt ma non chiama provider. Il bridge conserva inoltre la vecchia separazione del gauge dai pixel, in conflitto con il contratto Food Portrait FROZEN ora approvato. Prima dell'autonomia servono riallineamento del contratto, esecuzione ImageGen realmente collegata, checkpoint persistenti e benchmark reali con QA indipendente.

**Prossimo micro-step necessario:** decidere separatamente se congelare v10 oppure avviare il riallineamento controllato dell'AI Office alla pipeline Food Portrait FROZEN. `do01` resta non autorizzato.

## AI Office realignment checkpoint 2026-10-15 — v10 calibration only

- Corretto il contratto gauge storico per la produzione Food Portrait: il raster candidato deve includere il gauge fisico FROZEN, con kcal esatte e lancetta calcolata dalla mapping; resta vietata qualunque UI aggiuntiva.
- Visual Production è collegata all'adapter interattivo `OPENAI_BUILT_IN_IMAGEGEN_INTERACTIVE`, con limite rigido di una sola candidate per ciclo e budget aggiuntivo `0 EUR`.
- Aggiunto checkpoint JSON atomico e persistente: un ciclo esistente non può essere sovrascritto o duplicato.
- La QA visuale deve dichiarare un revisore distinto dal produttore; QA tecnica e visuale restano gate separati e nessuna delle due abilita auto-accept, freeze, integrazione o deploy.
- Calibrazione eseguita soltanto come replay verificato dell'asset v10 già approvato: hash, ricevuta ImageGen, gauge `95 kcal / -48,6° / GREEN`, QA tecnica e QA visuale indipendente verificati. Nuove immagini generate in questo step: `0`.
- `do01` è bloccato esplicitamente dal test di calibrazione e non è stato generato.
- Costituzione v1.9 completa: non caricata perché le copie `.txt` locali disponibili non corrispondono allo SHA-256 canonico fissato dal repository. Applicate le regole permanenti e il puntatore procedurale `AGENTS.md`; nessun testo costituzionale è stato inventato.
- Master v1.24 FROZEN: recuperato in sola lettura. La regola FO famiglia della card resta invariata; questa attività non integra Food Portrait nel tester o nella PWA.

**Stato:** REALIGNMENT IMPLEMENTED / LOCAL QA VERIFIED. Nessun avanzamento al lotto 001 elemento 2.

**Prossimo micro-step necessario:** pubblicare il branch isolato per ottenere il checkpoint CI remoto. Una decisione separata resta necessaria per il freeze di v10 o per qualunque futuro ciclo di generazione.

### Remote verification 2026-10-15

- Commit verificato: `6c67c5e`, branch `experiment/food-portrait-pipeline-20261015`.
- Workflow: https://github.com/battagliafilippo/MealUp/actions/runs/38790711232.
- Job `preproduction-specs`: **SUCCESS**. Passano 454 recipe specs con kcal, propagazione M2/M3/Portrait, routing AI Office, request singola con gauge FROZEN, calibrazione v10, checkpoint persistente e blocco `do01`.
- Job `contract-baseline`: **FAIL** soltanto al passo storico `Verify historical FROZEN vessel image binaries`, coerente con `E08 BLOCKED_HASH_MISMATCH`; i passi precedenti del job sono PASS e l'evidenza è stata salvata.
- Stato complessivo: **PARTIALLY VERIFIED / KNOWN INDEPENDENT BLOCKER E08**. Nessun requisito di questo riallineamento è fallito; il workflow rimane intenzionalmente non verde finché la sorgente vessel storica non viene recuperata con hash canonico.

**Prossimo micro-step necessario:** recuperare da fonte autorizzata la board vessel storica con SHA-256 canonico per chiudere E08. Restano decisioni separate il freeze di v10 e qualunque nuovo ciclo di generazione; `do01` non è autorizzato.

### E08 recovery audit 2026-10-15

- Hash canonico richiesto: `3318fbf8a718438520b12e9d8d28d88374a46041fc94b3efac1f23b38a50d5c8`.
- Hash dell'unico blob Git disponibile per `G5/references/VESSEL_LIBRARY_reference.png`: `28bba33ad0caaf6da129ae32ec5e9b771723f99ac9c9fd83aeec3e5c310bef7e`.
- Eseguiti `fetch --prune` e ricerca su tutti i branch/ref e oggetti Git: un solo blob storico per il percorso, non conforme.
- Cercati tutti i file omonimi nei checkout locali MealUp: due copie, entrambe con hash `28bba3…`.
- Ispezionati gli archivi locali `MealUp_1.zip`, `MealUp-main (1).zip`, `MealUp-main.zip` e `MealUp.zip`: nessuna board vessel o cartella G5 recuperabile.
- Esaminati i thread pertinenti e i relativi allegati disponibili: presenti reference Food Portrait owner, non la board vessel canonica.
- Nessun file è stato sostituito, rigenerato o rinominato; il digest canonico non è stato modificato per adattarlo al blob errato.

**Stato E08:** `BLOCKED_SOURCE_NOT_AVAILABLE_AFTER_EXHAUSTIVE_RECOVERY`. La chiusura richiede che l'owner fornisca la board originale o un archivio autorizzato che contenga un file con hash esatto `3318fb…`.

### E08 canonical recovery 2026-10-15

- Fonte autorizzata: file fornito direttamente dall'owner come `222BFAED-4125-4E09-BD4E-598B0D640527 (1).png`.
- SHA-256 verificato prima del ripristino: `3318fbf8a718438520b12e9d8d28d88374a46041fc94b3efac1f23b38a50d5c8`, identico al digest FROZEN dichiarato da G0/G5.
- Ripristinato esclusivamente `G5/references/VESSEL_LIBRARY_reference.png` sul branch isolato; il blob non conforme `28bba33a…` è stato sostituito, senza cambiare il contratto o il digest atteso.
- La CI ora osserva esplicitamente la board e `G5/vessel-geometry.json`, così ogni futura modifica riattiva l'audit binario.
- Audit locale: self-test **PASS**; board e 16 asset binari caricati (`loadedBinaryFileCount: 17`); 8 geometrie e 14 ricette `VESSEL_FREE`; `errors: []`; stato `PASS_BINARY_INTEGRITY_ONLY`. Gli otto warning riguardano preview di provenienza non-runtime mancanti e non alterano il gate binario.
- Nessuna immagine Food Portrait generata; `v10` resta sola calibrazione e `do01` non è stato generato. Nessuna modifica a `main`, tester ufficiale, PWA o AI Office esterno al branch.

**Stato E08:** `SOURCE_RECOVERED / LOCAL_AUDIT_PASS / REMOTE_CI_PENDING`. La chiusura richiede il checkpoint CI remoto verde.

### E08 remote closure 2026-10-15

- Commit verificato: `747c0c0`; workflow `QA - MealUp Food Portrait Contracts`, run `38794555114`.
- Job `contract-baseline`: **SUCCESS**, inclusi self-test fail-closed, verifica della board FROZEN e copertura vessel esatta.
- Job `preproduction-specs`: **SUCCESS**, inclusi 454 record, checkpoint persistenti, QA indipendente, singola candidate per ciclo e calibrazione limitata a `v10`.
- Nessun deploy o image generation eseguito; `do01` resta non generato.

**Stato finale E08:** `CLOSED_CANONICAL_SOURCE_VERIFIED`. Il prossimo passo resta una decisione separata dell'owner su un eventuale nuovo ciclo; nessun batch è autorizzato implicitamente.

### Independent v10 freeze review 2026-10-15

- Riesaminato a vista l'asset approvato v10 contro il riferimento FROZEN VESSEL_FREE v08 e contro il mandato di riconoscibilità per ricetta. Hash di entrambi gli asset riconfermati.
- Passano stile, singolo soggetto, contratto VESSEL_FREE, leggibilità `95 kcal`, zona verde e assenza di elementi estranei.
- Blocco: v10 e v08 presentano lo stesso contenitore neutro, lo stesso liquido arancione e la stessa composizione. Escludendo il diverso numero kcal, l'identità ACE non è distinguibile dal succo d'arancia. Il limite era già dichiarato nel manifest v10 e impedisce un freeze responsabile.
- Esito registrato in `v10-freeze-review-v1.json`: `REVISION_REQUIRED_NOT_FROZEN`.
- Errore operativo registrato: il primo tentativo di rilanciare la QA tecnica locale non ha trovato la dipendenza build-time `sharp`; ciò non invalida la precedente QA tecnica e la CI verde sul medesimo hash, ma non viene contato come nuova prova tecnica locale.
- Nuove immagini generate: `0`; `do01` non generato; nessun batch, integrazione o deploy; budget `0 EUR`.

**Prossimo micro-step necessario:** autorizzazione separata per un solo ciclo di revisione v10 che aggiunga un segnale ACE riconoscibile senza label, brand, ingredient collage o modifica del gauge FROZEN. Fino ad allora v10 resta approvato dall'owner ma non FROZEN.

### Owner-scoped beverage decision 2026-10-15 — v10 FROZEN

- L'owner ha chiarito che la somiglianza visiva tra bevande dello stesso colore è accettabile; per `v10` non è richiesto distinguere autonomamente ACE dal succo d'arancia.
- L'eccezione è circoscritta alle bevande. Le ricette di cibo devono continuare a essere riconoscibili e differenti nella forma preparata; nessuna riduzione del gate visuale viene applicata al cibo.
- Il precedente finding di QA resta documentato ma non è più bloccante. Esito aggiornato: `APPROVED_REFERENCE_FROZEN`.
- Manifest FROZEN: `v10-vessel-free-frozen-v1.json`; asset e hash invariati; nessuna rigenerazione.
- Nuove immagini generate: `0`; `do01` non generato; nessun avanzamento automatico del lotto, integrazione o deploy; budget `0 EUR`.

**Prossimo micro-step necessario:** scegliere separatamente una ricetta di cibo pilota diversa da `do01`; prima di generare servirà una singola autorizzazione esplicita per quella candidate.

### Controlled food pilot 2026-10-15 — a07 single candidate

- Scelta autonoma: `a07`, **Prosciutto e melone**, perché è il caso PLATE a rischio basso già previsto dal lotto controllato e verifica la riconoscibilità del cibo senza coinvolgere `do01`.
- Generata una sola candidate tramite ImageGen built-in con riferimenti FROZEN `r1` PLATE e `r2` stile canonico. Costo aggiuntivo: `0 EUR`.
- Asset: `candidates/a07-prosciutto-melone-plate-candidate-001.png`, SHA-256 `a747f64435629a174556573fc76fd6ac9b5c20e7d70bf9bb9a5392b556a613e9`, 1254 × 1254, 1.912.133 byte.
- QA tecnica: **PASS**, `errors: []`; sfondo opaco da review visuale e ottimizzazione WebP rinviata fino all'approvazione owner.
- QA visuale indipendente: **PASS CANDIDATE ONLY**. Melone e prosciutto sono distinguibili, integrati in un solo piatto, senza garnish, ingredienti estranei o props; stile, crop, `270 kcal` e direzione verde/lime del gauge sono coerenti. Non viene dichiarata precisione sub-grado della lancetta dalla sola ispezione visiva.
- Checkpoint persistente: `checkpoints/a07-visual-production-cycle-001.json`; una candidate registrata, auto-accept e auto-freeze disabilitati.
- Errore operativo non sostanziale: il primo comando di validazione del manifest ometteva la variabile locale con il percorso asset ed è terminato con `ERR_INVALID_ARG_TYPE`; corretto il comando, la verifica con hash reale e gate singola-candidate/no-`do01` è **PASS**.
- `do01` non generato; nessun batch, integrazione o deploy.

**Stato:** `VISUAL_CANDIDATE_REVIEW_REQUIRED_NOT_APPROVED`.

**Prossimo micro-step necessario:** review visuale owner della sola candidate a07. Solo dopo approvazione esplicita saranno consentite ottimizzazione lossless, nuova QA e decisione separata sul freeze.

### Owner approval + a07 freeze checkpoint 2026-10-15

- Decisione owner: `ottimo è perfetto`; la sola candidate a07 è approvata.
- Convertita in WebP lossless senza rigenerazione: `candidates/a07-prosciutto-melone-plate-approved-001.webp`, SHA-256 `0277d9faf985ff415afb80f6de74a272743c6a9f939995ea7419839cb6cab299`.
- Pixel decodificati identici alla PNG approvata: **PASS**. Dimensioni 1254 × 1254; byte ridotti da 1.912.133 a 1.335.604.
- QA tecnica ripetuta sul WebP: **PASS**, `errors: []`; resta soltanto il warning già esaminato sullo sfondo opaco.
- Errore di verifica registrato: il primo controllo aggregato confrontava per errore l'hash WebP con il campo `asset` della PNG sorgente e ha segnalato `hash contract mismatch`; corretto il selettore su `approvedAsset`, la verifica completa di hash, pixel, freeze e blocco `do01` è **PASS**.
- Creato checkpoint append-only `checkpoints/a07-owner-approval-001.json`; il checkpoint originario di generazione non è stato sovrascritto.
- Manifest FROZEN: `a07-plate-frozen-v1.json`. Nessuna integrazione o deploy.
- Nuove immagini generate in questo checkpoint: `0`; `do01` non generato; budget `0 EUR`.

**Stato a07:** `OWNER_APPROVED_TECHNICAL_PASS_FROZEN`.

**Prossimo micro-step necessario:** nessun avanzamento automatico. La scelta e generazione di un'altra ricetta richiedono un'autorizzazione separata.

### Controlled food pilot 2026-10-16 — r3 single candidate

- Verificato il checkpoint dell'altra chat: riallineamento AI Office, CI verde, E08 chiuso, v10 e a07 FROZEN; worktree pulita sul branch isolato.
- Scelta autonoma: `r3`, **Yogurt bowl proteica ai frutti di bosco**, `VESSEL_BOWL`, perché è un caso alimentare a rischio basso con composizione e ingredienti espliciti; `do01` resta escluso.
- Generata una sola candidate tramite Visual Production `OPENAI_BUILT_IN_IMAGEGEN_INTERACTIVE`, usando r2 BOWL e a07 come reference FROZEN. Costo aggiuntivo: `0 EUR`.
- Asset: `candidates/r3-yogurt-berry-bowl-candidate-001.png`, SHA-256 `bf5d70cf94a73ff98fb9a2687da829a74fac5279bea4776f6cb17ead173123ba`, 1254 × 1254, `1.919.299` byte.
- QA tecnica: **PASS**, `errors: []`; sfondo opaco da review visuale e ottimizzazione WebP rinviata fino all'approvazione owner.
- QA visuale indipendente: **PASS CANDIDATE ONLY**. Yogurt greco, frutti di bosco, mandorle e miele sono riconoscibili e integrati in un'unica bowl; nessun ingrediente o prop estraneo; stile, crop, testo `320 kcal` e direzione verde-lime del gauge sono coerenti. Nessuna precisione sub-grado della lancetta viene dichiarata dalla sola ispezione visiva.
- Evidenza visuale eseguita sui pixel originali salvati. La pagina comparativa è stata preparata ma non riaperta nel browser perché il browser locale non era disponibile nella sessione; nessun browser PASS viene dichiarato.
- Checkpoint persistente: `checkpoints/r3-visual-production-cycle-001.json`; una candidate registrata, auto-accept e auto-freeze disabilitati.
- `do01` non generato; nessun batch, integrazione o deploy.

**Stato:** `VISUAL_CANDIDATE_REVIEW_REQUIRED_NOT_APPROVED`.

**Prossimo micro-step necessario:** review visuale owner della sola candidate r3. Solo dopo approvazione esplicita saranno consentite ottimizzazione lossless, nuova QA e decisione separata sul freeze.

### Owner approval + r3 freeze checkpoint 2026-10-16

- Decisione owner: `è perfetto come lo volevo`; la sola candidate r3 è approvata.
- Conversione WebP lossless senza rigenerazione: `candidates/r3-yogurt-berry-bowl-approved-001.webp`, SHA-256 `64b23af744baa469be91dfec6ffda39dc6b2f054dddc61a8f1bae6f81ea91cd2`.
- Pixel decodificati identici alla PNG approvata: **PASS**. Dimensioni 1254 × 1254; byte ridotti da `1.919.299` a `1.335.722`.
- QA tecnica ripetuta sul WebP: **PASS**, `errors: []`; resta soltanto il warning già esaminato sullo sfondo opaco.
- Checkpoint append-only: `checkpoints/r3-owner-approval-001.json`; il checkpoint di generazione non è stato sovrascritto.
- Manifest FROZEN: `r3-bowl-frozen-v1.json`. Nessuna integrazione o deploy.
- Nuove immagini generate in questo checkpoint: `0`; `do01` non generato; budget `0 EUR`.

**Stato r3:** `OWNER_APPROVED_TECHNICAL_PASS_FROZEN`.

**Valutazione autonomia:** non è ancora dimostrata la piena autonomia. Visual Production ha due nuove produzioni alimentari approvate su vessel differenti (`a07` PLATE e `r3` BOWL), mentre il runtime canonico resta `OPENAI_BUILT_IN_IMAGEGEN_INTERACTIVE` e `autonomousExecution: false`. Serve almeno un terzo pilot alimentare su una categoria vessel differente e il successivo aggiornamento esplicito del contratto operativo prima di autorizzare avanzamento controllato senza conferma ricetta-per-ricetta.

**Prossimo micro-step necessario:** un solo terzo pilot alimentare su vessel differente, consigliato `d32` BAKING_DISH. Nessun passaggio ad autonomia o generazione ulteriore senza autorizzazione separata.

### Controlled production autonomy mandate 2026-10-16 — ACTIVE, scoped

- Decisione owner: `fallo`; eliminare la richiesta di conferma ricetta-per-ricetta durante un lotto già delimitato.
- Attivata autonomia controllata esclusivamente per `FPP-LOT-001` e per le candidate `d32` e `do10`; `do01` resta esclusa.
- Visual Production resta interattiva ma il mandato passa a `CONNECTED_GUARDED_CONTROLLED_LOT`: una candidate per ciclo, avanzamento della coda solo dopo QA tecnico `PASS` e QA visivo indipendente `PASS_CANDIDATE_ONLY`.
- Qualunque FAIL, ambiguità o conflitto di fonte blocca immediatamente il lotto e torna all'owner.
- Auto-accept, auto-freeze, integrazione, deploy e costi aggiuntivi restano vietati. La review owner avviene alla fine delle candidate autorizzate o al primo blocco.
- Contratto: `controlled-autonomy-authorization-v1.json`; controller fail-closed: `controlled-lot-autonomy.cjs`.

**Prossimo micro-step necessario:** creare e verificare lo stato persistente del lotto; se PASS, l'Office può iniziare da `d32` senza ulteriore conferma ricetta-per-ricetta.

### Controlled production autonomy activation 2026-10-16 — VERIFIED

- Controller e registro Office verificati: test autonomia fail-closed **PASS** e 6/6 test del registro agenti **PASS**.
- Creato lo stato persistente `checkpoints/controlled-lot-001-autonomy-state.json`, stato `ACTIVE_READY`.
- Coda autorizzata: `d32` → `do10`; entrambe ancora `PENDING`. `do01` non è presente nella coda.
- Errore operativo registrato: il primo test del nuovo controller ha rilevato una parentesi mancante nel comando CLI di inizializzazione. Corretta la singola riga e rilanciati tutti i test con esito PASS prima dell'attivazione.
- Gate confermati: una candidate per ciclo; QA tecnico e visuale indipendente obbligatori; stop su FAIL; auto-accept, auto-freeze, integrazione, deploy e costi vietati.

**Stato:** `ACTIVE_SCOPED_AUTONOMY / READY_FOR_D32`. L'Office non richiederà conferme ricetta-per-ricetta per `d32` e `do10`; tornerà all'owner al termine del lotto o al primo blocco.

**Prossimo micro-step necessario:** Visual Production avvia autonomamente il ciclo `d32` alla prossima esecuzione del lotto.

### Controlled lot candidate production 2026-10-16 — COMPLETE, awaiting owner

- Eseguita in autonomia controllata la coda autorizzata `d32` → `do10`, rigorosamente un'immagine per ciclo e senza `do01`.
- `d32`: QA tecnico **PASS** dopo codifica WebP lossless; QA visuale indipendente **PASS CANDIDATE ONLY**. Asset SHA-256 `bb7b34114530fc2be8f635b1bf13f7c2bc56cf1354e3458be0c4ec496d7a8366`.
- `do10`: QA tecnico **PASS** dopo codifica WebP lossless; QA visuale indipendente **PASS CANDIDATE ONLY**. Asset SHA-256 `b75964e4da7c9e0a1f8383003aafcfcdf19e44b43b486312cbc60512958e3927`.
- In entrambi i cicli il PNG generato superava il budget byte. È stata applicata una conversione WebP lossless senza rigenerazione; gli hash dei pixel decodificati coincidono tra PNG e WebP.
- Stato persistente: `LOT_CANDIDATES_COMPLETE_AWAITING_OWNER_REVIEW`. Auto-accept, auto-freeze, integrazione, deploy e costi aggiuntivi restano disabilitati.

**Prossimo micro-step necessario:** review owner congiunta di `d32` e `do10`; solo una decisione esplicita può autorizzare freeze o ulteriori passaggi.

### Controlled lot owner approval 2026-10-16 — FROZEN

- Decisione owner: `Le immagini sono perfette`; approvati `d32` e `do10`.
- Congelati esattamente i WebP verificati, senza rigenerazione o modifica dei pixel.
- `d32` FROZEN SHA-256 `bb7b34114530fc2be8f635b1bf13f7c2bc56cf1354e3458be0c4ec496d7a8366`; QA tecnico post-approvazione PASS.
- `do10` FROZEN SHA-256 `b75964e4da7c9e0a1f8383003aafcfcdf19e44b43b486312cbc60512958e3927`; QA tecnico post-approvazione PASS.
- Stato lotto: `LOT_OWNER_APPROVED_FROZEN`. Nessuna integrazione, deploy o modifica di main/tester/AI Office.

**Prossimo micro-step necessario:** decisione separata tra integrazione degli asset e realizzazione/collaudo della modalità Office in background.

### Background Office activation 2026-10-16 — ACTIVE, first run pending

- Creata la skill repository `$mealup-food-portrait-background`, limitata alla ripresa di code già autorizzate e persistite.
- Creato `background-preflight.cjs`: self-test PASS su READY, terminal no-op, violazione di scope e blocker persistente.
- Sul lotto attuale il preflight restituisce `NOOP_TERMINAL`, quindi nessun asset FROZEN viene toccato.
- Heartbeat della chat `mealup-food-portrait-office` creato ACTIVE ogni 30 minuti. La chat conserva contesto e checkout isolato; PC acceso e app desktop attiva sono necessari per i file locali.
- Il primo tentativo di creazione è stato respinto per destinazione non esplicita; nessun duplicato creato. Il secondo tentativo con `destination=thread` è riuscito.
- Il quick validator Python non è eseguibile per assenza di PyYAML nel runtime bundled; controllo manuale struttura/frontmatter PASS, senza installare dipendenze.
- Auto-accept, auto-freeze, integrazione, deploy, modifiche a main/tester/PWA/AI Office e costi aggiuntivi restano vietati.

**Stato:** infrastruttura background `ACTIVE_AWAITING_FIRST_SCHEDULED_RUN`. La disponibilità reale di ImageGen in una run non presidiata resta da dimostrare al prossimo lotto autorizzato.

**Prossimo micro-step necessario:** osservare la prima esecuzione pianificata. Con lo stato corrente deve produrre un no-op; un futuro lotto autorizzato servirà al collaudo reale ImageGen background.

### Catalog-wide guarded production authorization 2026-10-16 — ACTIVE

- Decisione owner: `Autorizzo tutto`; interpretata come autorizzazione alla generazione autonoma delle ricette con reference vessel FROZEN verificata, non come pre-approvazione di pixel futuri o permesso di integrare/deployare.
- Catalogo verificato: 454 ricette; 449 coperte da sei categorie vessel FROZEN; 437 nuove candidate in coda dopo esclusione degli asset già FROZEN/reference e di `do01`.
- Cinque ricette restano bloccate: `r6` (`VESSEL_PIZZA_SURFACE`) e `k01`, `w01`, `w12`, `k14` (`VESSEL_CUP`).
- Creato mandato `catalog-production-authorization-v1.json` e stato persistente `catalog-autonomy-state-v1.json`; hash di tutte e sei le reference verificati dal builder.
- Creato estrattore deterministico `catalog-recipe-source.cjs`: invarianti 454/ID/matrix e self-test PASS. Prima ricetta `r7`, 320 kcal, `VESSEL_PLATE`, fonte strutturata verificata.
- Heartbeat `mealup-food-portrait-office` aggiornato: una candidate per run, pausa ogni 10 QA PASS per review owner, stop su FAIL o ambiguità.
- Rimangono vietati auto-accept, auto-freeze, integrazione, deploy, modifiche a main/tester/PWA/AI Office e costi aggiuntivi.

**Stato:** `ACTIVE_READY_FIRST_RECIPE_R7`. Il prossimo heartbeat può tentare la prima vera generazione ImageGen non presidiata.

**Prossimo micro-step necessario:** prima run background su `r7`; se ImageGen non è disponibile nel task pianificato, il programma si bloccherà senza avanzare la coda.

### Catalog cycle 001 — r7 candidate QA PASS

- Generata una sola candidate `r7` usando la reference FROZEN `r1` PLATE; valore esatto `320 kcal`.
- QA tecnico PASS dopo ricodifica WebP lossless; pixel decodificati identici al PNG generato.
- QA visivo indipendente PASS CANDIDATE ONLY: bresaola, rucola e scaglie di grana riconoscibili; dressing integrato; nessun ingrediente, testo, UI o prop estraneo.
- Asset SHA-256 `9314c128e9452cf0b42832658cd8c1e6a98062d22c89e45995d5c55c2ec18137`; coda: 1 completata, 436 pendenti; batch review 1/10.
- Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** il prossimo ciclo autonomo lavora esclusivamente sulla successiva ricetta PENDING (`r4`) e mantiene lo stop al decimo QA PASS.

### Catalog cycle 002 — r4 candidate QA PASS

- Generata una sola candidate `r4` usando la reference FROZEN `r2` BOWL; valore esatto `520 kcal`.
- QA tecnico PASS sul PNG originale, senza ricodifica.
- QA visivo indipendente PASS CANDIDATE ONLY: pollo piastrato affettato, riso integrale e spinaci saltati riconoscibili e integrati; nessun ingrediente, testo, UI o prop estraneo.
- Asset SHA-256 `edb8904b1a50c6110c888f19ea78e3cf01a422e9dd9f94c2ebb278674755bdc5`; coda: 2 completate, 435 pendenti; batch review 2/10.
- Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** il prossimo ciclo autonomo lavora esclusivamente sulla successiva ricetta PENDING (`r5`).

### r4 owner approval + background cadence correction

- Decisione owner: `L'immagine è approvata`; congelato lo stesso raster `r4` dopo conversione WebP lossless.
- Asset FROZEN SHA-256 `26792719ab69fa2475ce62b2bad13ad9658dad815b8a8b00430af56c6a3d0f10`; pixel decodificati identici al PNG candidate; QA tecnico post-ottimizzazione PASS.
- Chiarimento operativo: `r7` e `r4` sono stati prodotti in foreground su comando `procedi`; non costituiscono prova di una run heartbeat non presidiata.
- Heartbeat aggiornato: nessuna richiesta di approvazione intermedia; prosegue sulle candidate QA PASS e si ferma soltanto alla review aggregata 10/10 o al primo blocker.
- Il freeze resta separato: nessun pixel futuro viene pre-approvato automaticamente.

**Prossimo micro-step necessario:** continuazione autonoma da `r5` fino al batch 10/10, senza richieste owner intermedie.

### Catalog cycle 003 — r5 background run blocked by visual QA

- Prima esecuzione heartbeat non presidiata con ImageGen realmente completata: una sola candidate `r5`, reference FROZEN `r1` PLATE e testo esatto `410 kcal`.
- Il PNG originale superava il budget byte; unica ricodifica WebP lossless autorizzata, pixel decodificati identici e QA tecnico PASS sul WebP (`1.436.136` byte).
- QA visivo indipendente FAIL: garnish verde estraneo alla fonte verificata e lancetta nell'arancione, troppo redward per `410 kcal` rispetto alla scala FROZEN.
- Asset conservato come evidenza non approvata, SHA-256 `bdc3def79e6690742202105840e23989f9c4ffa36d23e6d8481c812459c07b04`.
- Coda fermata fail-closed a 2/10. Nessuna seconda generazione, auto-approvazione, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** decisione owner separata per autorizzare o meno un nuovo tentativo corretto di `r5`; fino ad allora l'Office resta bloccato.

### Catalog cycle 004 — r5 targeted correction QA PASS

- Owner ha autorizzato `riprendi ... e finisci`; eseguito un solo nuovo tentativo mirato sul raster `r5`, senza alterare asset FROZEN.
- Rimossi tutti i garnish verdi estranei; mantenuti esclusivamente frittata piegata, ceci, feta e paprika. Lancetta spostata nel giallo, coerente con `410 kcal` e più redward della reference 380 senza entrare nell'arancione.
- QA tecnico PASS sul PNG originale: `1254×1254`, `1.961.482` byte, SHA-256 `7afc477622da9b9e81e0c2fe431594cb5efe0cd017cfe8e02b614fee16edbcaa`.
- QA visivo indipendente PASS CANDIDATE ONLY; coda riattivata, batch review 3/10. Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** l'Office riprende automaticamente dalla prossima ricetta PENDING (`p01`) e continua fino alla review aggregata 10/10 o al primo blocker reale.

### Catalog cycle 005 — p01 candidate QA PASS

- Generata una sola candidate `p01` usando la reference FROZEN `r2` BOWL; testo esatto `775 kcal` e lancetta nella zona rosso intenso.
- QA tecnico PASS sul PNG originale (`1254×1254`, `1.887.527` byte, SHA-256 `74e1cc937dd42c2df5bece4daf7087a666c8b6abecaaf801574c5dfb297732c8`).
- QA visivo indipendente PASS CANDIDATE ONLY: spaghetti, guanciale, crema uovo-pecorino, pecorino e pepe riconoscibili; nessun ingrediente, testo, UI o prop estraneo.
- Coda avanzata a 4/10. Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** prossimo heartbeat sulla successiva ricetta PENDING; review owner unica al raggiungimento di 10/10.

### Catalog cycle 010 — p06 candidate QA PASS

- Generata una sola candidate `p06` usando la reference FROZEN `r2` BOWL; testo esatto `505 kcal` e lancetta nella transizione giallo-arancione.
- QA tecnico PASS sul PNG originale (`1254×1254`, `1.876.845` byte, SHA-256 `57ee8138c7e39e93fdd6d958b0f417370f072bbe4d77287dc7d0ecbbde5efc9b`).
- QA visivo indipendente PASS CANDIDATE ONLY: penne, pomodoro, olio, aglio, peperoncino e prezzemolo riconoscibili; formaggio assente come richiesto; nessun testo, UI o prop estraneo.
- Coda avanzata a 9/10. Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** un ultimo ciclo QA PASS per raggiungere 10/10, poi pausa e review owner aggregata.

### Catalog cycle 011 — p07 QA PASS, batch review gate 10/10

- Generata una sola candidate `p07` usando la reference FROZEN `r2` BOWL; testo esatto `510 kcal` e lancetta nella transizione giallo-arancione.
- QA tecnico PASS sul PNG originale (`1254×1254`, `1.925.228` byte, SHA-256 `ee75a3eda156e1034583fcb3cfddb212a8cc87b4b7c1f9e078b0f7f6209068f3`).
- QA visivo indipendente PASS CANDIDATE ONLY: spaghetti, pomodoro, olio e basilico riconoscibili; aglio e formaggio assenti coerentemente con fonte/preparazione; nessun testo, UI o prop estraneo.
- Raggiunto il gate 10/10. Coda sospesa in `PAUSED_OWNER_BATCH_REVIEW_10`; creata review aggregata `review/catalog-batch-001-review.html`.
- Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** review owner unica del lotto; solo una decisione esplicita potrà approvare/freeze le candidate o riaprire la coda.

### Catalog cycle 009 — p05 candidate QA PASS

- Generata una sola candidate `p05` usando la reference FROZEN `r2` BOWL; testo esatto `490 kcal` e lancetta vicino alla transizione giallo-arancione.
- QA tecnico PASS sul PNG originale (`1254×1254`, `1.873.542` byte, SHA-256 `c6ee4b4db947034fe4b2af35d5a2ed977ac054ebc4561b9b928567d64536d2a3`).
- QA visivo indipendente PASS CANDIDATE ONLY: spaghetti, emulsione d'olio, peperoncino e prezzemolo riconoscibili; aglio intero assente coerentemente con la preparazione; nessun testo, UI o prop estraneo.
- Coda avanzata a 8/10. Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** prossimo heartbeat sulla successiva ricetta PENDING; review owner unica al raggiungimento di 10/10.

### Catalog cycle 008 — p04 candidate QA PASS

- Generata una sola candidate `p04` usando la reference FROZEN `r2` BOWL; testo esatto `515 kcal` e lancetta nella transizione giallo-arancione.
- QA tecnico PASS sul PNG originale (`1254×1254`, `1.823.542` byte, SHA-256 `9d884d865bc4e27fc86f4bc75ee17d5ce629deaaa79d40aa03676a871089c528`).
- QA visivo indipendente PASS CANDIDATE ONLY: tonnarelli, emulsione e grattugiato di pecorino e pepe nero riconoscibili; nessun ingrediente, testo, UI o prop estraneo.
- Coda avanzata a 7/10. Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** prossimo heartbeat sulla successiva ricetta PENDING; review owner unica al raggiungimento di 10/10.

### Catalog cycle 007 — p03 candidate QA PASS

- Generata una sola candidate `p03` usando la reference FROZEN `r2` BOWL; testo esatto `635 kcal` e lancetta nella transizione arancione-rosso.
- PNG sopra budget; unica ricodifica WebP lossless, pixel identici e QA tecnico PASS (`1254×1254`, `1.412.734` byte, SHA-256 `fc40da34c8d8e3a3349ba8b10e68d40d7c7eca439575904ab8693152d58e873c`).
- QA visivo indipendente PASS CANDIDATE ONLY: rigatoni, guanciale, emulsione di pecorino, pecorino e pepe riconoscibili; nessun ingrediente, testo, UI o prop estraneo.
- Coda avanzata a 6/10. Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** prossimo heartbeat sulla successiva ricetta PENDING; review owner unica al raggiungimento di 10/10.

### Catalog cycle 006 — p02 candidate QA PASS

- Generata una sola candidate `p02` usando la reference FROZEN `r2` BOWL; testo esatto `635 kcal` e lancetta nella transizione arancione-rosso.
- QA tecnico PASS sul PNG originale (`1254×1254`, `1.965.172` byte, SHA-256 `748c5151f5be2ceb1a168b70ad47131624e1b02b5b25b975226d1f44a4876f92`).
- QA visivo indipendente PASS CANDIDATE ONLY: bucatini, pomodoro, guanciale, pecorino e peperoncino riconoscibili; nessun ingrediente, testo, UI o prop estraneo.
- Coda avanzata a 5/10. Nessuna approvazione automatica, freeze, integrazione o deploy.

**Prossimo micro-step necessario:** prossimo heartbeat sulla successiva ricetta PENDING; review owner unica al raggiungimento di 10/10.
### AI Office deterministic visual planning integration 2026-10-18

- Audit collegiale dei ruoli, skill e orchestrazione: il problema principale non richiede un nuovo agente generativo; `VISUAL_SYSTEMS_ENGINEERING` è introdotto come sottoruolo di Engineering.
- Aggiunti profilo centrale `FOOD_PORTRAIT_DETERMINISTIC_PILOT`, catalogo dedicato di 9 skill e planner fail-closed che copre 10 capacità obbligatorie.
- Il piano ordina Food facts, Design style lock, food-only ImageGen, composizione vessel/gauge deterministica, due corsie QA indipendenti, recovery/pre-lot e libreria correzioni.
- L'orchestratore allega il piano esplicito `skill → capacità → ordine → ruolo → motivazione` solo per il nuovo task type; i percorsi legacy restano invariati.
- Gate verificati: attori producer/reviewer distinti, hash input, quota zero-cost, capacità complete, dipendenze, limite massimo e nessun freeze automatico.
- Errore operativo registrato: il primo baseline test era stato lanciato fuori dalla root repository e mostrava 3 falsi fallimenti di path; rilanciato dalla root corretta: 141/141 PASS.
- QA dopo l'integrazione: 146/146 test Office PASS; nessuna immagine generata, nessun lotto avviato, nessuna modifica a main/tester/PWA.

**Stato:** `OFFICE_SKILL_PLANNING_INTEGRATED / EXECUTION_DISABLED`. Il motore resta fail-closed finché body PLATE e gauge Food Portrait non sono coerenti.

**Prossimo micro-step necessario:** implementare il compositore deterministico a07 usando asset verificati o bloccare con prova puntuale se il body PLATE canonico non è disponibile.

### Deterministic visual engine preflight 2026-10-18

- Aggiunto preflight eseguibile e fail-closed per verificare geometria, body/clip/occluder vessel, contratto e asset gauge, mapping Food Portrait e manifest ricetta FROZEN prima di qualunque generazione.
- `a07` è correttamente `BLOCKED`: `VESSEL_BODY_MISSING`, `GAUGE_SHELL_SHA_MISMATCH`, `GAUGE_LEGACY_CALIBRATION_NOT_FOOD_PORTRAIT_FROZEN`.
- Prove: shell atteso `db159463…`, reale `f452fe0b…`; G7 usa 0–800 / −70°…70°, mentre la mapping Food Portrait verificata produce 270 kcal → −27,6° / LIME su 0–1000 / −60°…60°.
- Il manifest FROZEN a07 e il relativo asset SHA restano conformi; ImageGen non è stato invocato e il lotto non è avanzato.
- Errore test registrato: il primo assert usava uguaglianza stretta sul floating point `-27.599999999999994`; sostituito con tolleranza `1e-9`, senza alterare formula o risultato.

**Stato motore:** `BLOCKED_CANONICAL_TEMPLATE_AND_GAUGE_ASSETS`. Vietato aggirare il blocco cambiando gli hash attesi o riusando la calibrazione G7 legacy.

### Remote checkpoint 2026-10-18

- Commit motore/preflight verificato: `43b306e`; workflow `QA - MealUp Food Portrait Contracts`, run `39110008123`.
- Job `contract-baseline`: **SUCCESS**. Job `preproduction-specs`: **SUCCESS**.
- Il checkpoint remoto conferma che i contratti preesistenti restano verdi; i nuovi test Office/preflight sono stati eseguiti localmente con esito 148/148 PASS.
- Micro-step CI successivo completato: aggiunti al workflow il planner Food Portrait dell'AI Office e il preflight deterministico fail-closed; aggiunto anche `tools/ai-office/**` ai path che attivano il workflow.
- Commit CI `33541ca`; run remoto `39110130844`: **SUCCESS**. Job `contract-baseline`: **SUCCESS**. Job `preproduction-specs`: **SUCCESS**, compresi gli step `Enforce deterministic visual engine fail-closed preflight` e `Revalidate existing AI Office role routing and Groq reasoning guards`.
- Limite strumento registrato: il comando locale `gh` non era disponibile; stato e job sono stati verificati tramite GitHub API.
- Nessun output visivo, deploy o modifica a main/tester/PWA.

# MealUp — Piano unico Recipe Visual Agents (V1)
Stato: PIANO OPERATIVO, NON FROZEN. Non sostituisce MealUp Master, Costituzione v1.9 né alcun freeze grafico. Aggiornare questo file come registro degli avanzamenti; non aprire altri piani paralleli.

## Obiettivo finale (vincolante)
Per ciascuna ricetta MealUp esiste una rappresentazione unica del piatto COMPLETO, nello stile MealUp Toys 3D, composta in modo culinariamente corretto. L'asset è associato stabilmente alla coppia `recipe.id` + versione visuale della ricetta; tutte le superfici già autorizzate lo riutilizzano. L'asset definitivo si salva una volta sola e non si genera durante lo scroll.
- Le 454 ricette del catalogo storico devono essere processabili in batch, senza 454 prompt manuali.
- Ogni nuova ricetta deve poter entrare in una coda; stato pending finché non pronta; QA prima della pubblicazione; FO canonico di famiglia come fallback.
- Ingredienti corretti, presentazione credibile, FO senza collage dinamico; la generazione avviene FUORI dalla UI.
- Nessun costo aggiuntivo non approvato; nessuna promessa di crediti illimitati. ChatGPT e Runway manuali non equivalgono ad API automatizzabili gratuite. Groq potenziale motore testo/analisi, NON generatore immagini.
- Nessuna regressione di Home / Ricette / Dettaglio / Kitchen / Scanner / Spesa / Scorte / Diario / suggestFor / gauge / scroll.
- Nessun deploy o modifica a main senza esplicita approvazione. Un solo tester ufficiale: `mealup-tester-family-fo`; laboratorio di sviluppo solo su `experiment/recipe-visual-agents`, NON secondo tester.

## Stato attuale verificato al 2026-10-14
- AUDIT: 454 righe G8 e 454 ID mappati al sistema FO di famiglia; 14 famiglie. PASS statico; non equivale a 454 immagini complete.
- DUPLICE MOTORE: `assets/family-fo/runtime.js` canonico e G11 storico composito coesistevano nell'app. L'avvio automatico G11 è disattivato SOLO nel laboratorio rimuovendo due script da ciascuno di `index.html` e `dist/index.html`, senza cancellare file storici G11.
- TEST: controllo statico motore singolo PASS; smoke v1.24 7/7 PASS sul laboratorio dopo correzione dei selettori obsoleti nei test.
- REGRESSIONE ESTESA: 253 PASS / 11 FAIL su `test/run.js`. Cause/non-regressioni NON ancora classificate mediante confronto con baseline; non correggere alla cieca i fallimenti generici nel filone immagini.
- VALIDAZIONE VISIVA iPhone e impatto Kitchen Mode dopo disattivazione G11: NON eseguiti; fix NON trasferito nel tester ufficiale.
- AGENTI: non installati. Immagini complete ricetta: non generate da questa pipeline. `main` e tester ufficiale invariati.

## Sequenza unica di micro-step (uno per volta)
- [x] M0. Audit di struttura, mapping e superfici; decisione un solo tester.
- [x] M1. Isolare nel laboratorio il motore storico G11 senza cancellazioni; controllo statico e smoke superati.
- [ ] M1b. Confronto MIRATO con la baseline solo per i difetti che impediscono il motore visuale; test Kitchen Mode visuale necessario prima del passaggio al tester ufficiale. Gli altri fallimenti restano segnalati, non bloccano la progettazione degli agenti; niente correzioni fuori scope.
- [x] M2. AGENTE 1 (COMPLETATO, QA PASS): Recipe Analyzer in laboratorio. Input dati reali ricetta `id/title/ing/steps`; output deterministico di schede JSON con ingredienti visualmente rilevanti, tecniche/forme (fettine, scaglie, impiattamento), vincoli, confidenza e motivi review. Batch 454, senza immagini, senza API segrete, senza toccare UI. Test minimo: 454 ID unici; output validi; 0 ricette perse; fallimenti isolati.
- [ ] M3. Visual Director + prompt builder: [x] M3a builder JSON per 454 schede e QA (senza costi), [ ] M3b vera interpretazione culinaria tramite modello AI e verifica delle proposte; niente collage FO e nessun avanzamento a immagini senza QA.
- [ ] M4. Provider abstraction: [x] adapter Groq Free in modalita opt-in/dry-run e testato, [ ] collegamento reale di un account Groq Free verificato; verificare limiti tecnici, termini e costo per API Groq/testo e generatori immagini. ChatGPT Plus / Runway crediti personali NON presumere automaticamente pilotabili da API. Imporre budget cap 0, backoff, pausa e ripresa; mai chiavi nel frontend.
- [ ] M5. Produzione immagini pilota con gli strumenti effettivamente disponibili; confronto 5 piatti difficili; controllo ingredienti inventati/mancanti/posizione e coerenza MealUp; approvazione prima del batch.
- [ ] M6. Registro persistente asset: `recipe.id`, `visualRevision`, `imageUrl`, hash, provenienza, QA e status pending/ready/review/error. Una sorgente immagine per tutte le superfici consentite; family FO fallback; lazy load/preload mirato e test zero micro-lag. Nessuna modifica ai dati personali locali.
- [ ] M7. Batch progressivo sul catalogo completo, dedup, resume, report QA automatico + eccezioni per review umana; nessuna rigenerazione degli asset approvati senza motivo.
- [ ] M8. Nuove ricette: coda asincrona sicura, controllo della privacy, trigger post-salvataggio, soluzione gratuita sostenibile da validare prima di attivarla sugli utenti.

## Regola anti-deriva
Ogni intervento deve riportare: micro-step corrente, risultato verificato, impatto sui FROZEN, eventuale blocco, e **un solo** prossimo passo.
Difetti già presenti o estranei alle immagini: registrare in backlog, verificare se bloccanti e NON intraprendere fix collaterali in questo filone. Non aggiungere nuovi tester, branch, design, servizi, API o workflow senza necessità esplicita.
L'avanzamento agli agenti NON richiede correggere tutte le 11 anomalie storiche: l'analizzatore può lavorare sui dati in isolamento. La promozione dei cambiamenti visivi richiede invece prova di non regressione mirata e approvazione esplicita.


## Audit comparativo sui 11 fallimenti (2026-10-14)
- **Baseline testata realmente:** commit originale tester `4716804ea4a6e38ecd8fdf462de61d81d4d4e857`. Job GitHub Actions `38594611752`, `baseline_11`: stessi 11 casi selezionati, **0 PASS / 11 FAIL**, con stessi messaggi riscontrati nel laboratorio (`test/run.js`: 253 PASS / 11 FAIL). Nessuno degli 11 fallimenti è una regressione introdotta dalla rimozione dell'autoload G11.
- **Non confondere origine e gravità:** preesistente NON significa innocuo. I test riflettono possibili bug reali di Spesa, Scorte, Kitchen Mode, Dettaglio e possibili controlli obsoleti. Le classi `.ricette-icon` e `.scorte-icon` attese dal vecchio test non sono quelle realmente utilizzate nella navbar approvata: il relativo fallimento è obsolescenza del test.
- **Priorità di prodotto fuori dall'analizzatore:** (P1) quantità e conteggi confezioni, completamento campo suggerimenti Spesa; (P1/P2 dopo riproduzione) indicatori Scorte e testo scadenze freezer; (P1/P2) presenza voto /100 in Dettaglio secondo FROZEN; (P2) aspettative animazione/riconoscimento gesto Kitchen Mode solo dopo confronto con FROZEN; (test-only) icone navigazione. Sono ipotesi da confermare su UI reale, non bug dichiarati risolti.
- **Gate sviluppo:** Recipe Analyzer M2 NON dipende da queste funzioni e può procedere in isolamento. Prima di promuovere cambiamenti visivi nel tester ufficiale occorre test di regressione pertinente, verifica Kitchen Mode e decisione esplicita sugli eventuali bug preesistenti che impattano l'app. Non correggere 11 casi in blocco e non cambiare i FROZEN senza autorizzazione.
- **Budget/sicurezza:** confronto fatto esclusivamente sul branch laboratorio con checkout temporaneo del commit originale; `main` e `mealup-tester-family-fo` non modificati, nessun deploy.


## Milestone M2 — Recipe Analyzer eseguito (2026-10-14)
- Installati `tools/recipe-visuals/recipe-analyzer.cjs` e `.github/workflows/qa-recipe-analyzer.yml` esclusivamente su `experiment/recipe-visual-agents`.
- Esecuzione GitHub Actions: https://github.com/battagliafilippo/MealUp/actions/runs/38596095729 — **SUCCESS**; self-test PASS, 454/454 ID reali e unici, 454 associazioni FO, 0 perdite, nessuna immagine generata, nessuna API chiamata.
- Rilevamento preliminare tramite euristiche su testo originale: **102** ricette con esplicita evidenza di impiattamento riconosciuta, **352** necessitano ulteriore direzione visiva. Questo dato non certifica la correttezza culinaria delle future immagini e non è una quota di immagini prodotte.
- Le schede JSON e il report sono disponibili nell'artifact GitHub `mealup-recipe-analyzer-m2` del run (scadenza 30 giorni); riproducibili lanciando lo stesso script. Lo script/versione sorgente sono persistenti nel repository.
- È un modulo di analisi dati automatico e deterministico, non ancora un modello AI con comprensione culinaria e non ancora un agente di generazione immagini. Il passo M3 deve aggiungere la direzione visiva senza cambiare l'app.
- Nessuna modifica a `main` né a `mealup-tester-family-fo`; niente deploy e nessun costo di generazione.

## Milestone M3a — Visual Director: preparazione completata (2026-10-14)
- Il modulo `tools/recipe-visuals/visual-director.cjs` legge le 454 schede M2 e costruisce 454 richieste strutturate per un futuro modello di ragionamento culinario; ogni richiesta contiene ingredienti completi, passi originali, evidenze esplicite, vincoli anti-invenzione, schema JSON atteso e QA obbligatorio.
- GitHub Actions: https://github.com/battagliafilippo/MealUp/actions/runs/38597373060 — job `analyze` **SUCCESS**. 454/454 ID unici, 102 casi con evidenza esplicita da validare, 352 senza evidenza esplicita che richiedono inferenza, nessun ID perso, `safeToGenerate=0`, zero immagini e zero chiamate API. Artefatto temporaneo `mealup-visual-director-m3`.
- **Distinzione essenziale:** il builder NON ha ancora eseguito un modello AI e NON ha inferito davvero le composizioni delle 352 ricette. Ha predisposto le richieste, con gate per bloccare qualunque approvazione automatica. M3b dipende dalla scelta/connessione di un provider di ragionamento disponibile nel budget M4.
- Non sono stati modificati `main`, tester ufficiale, FROZEN o funzionalità dell'app. Non aprire branch o tester aggiuntivi.


## Milestone M3b — Groq adapter installato, testato, NON ancora connesso live (2026-10-14)
- **Provider scelto:** Groq Free, modello testo `openai/gpt-oss-20b` per descrivere l'impaginazione culinaria. GitHub Models non va utilizzato: dismesso definitivamente il 30 luglio 2026. Groq fornisce un piano Free limitato e un piano Developer a pagamento; verificare sempre il piano Free nell'account prima della prima chiamata.
- **Codice realmente installato** su `experiment/recipe-visual-agents`: `tools/recipe-visuals/groq-reasoner.cjs`. Input: 454 brief M3. Output previsto: proposta JSON per piatto completo, ruoli di ogni ingrediente, forma, posizionamento, riferimenti ai passaggi, inferenze dichiarate, eventuali contraddizioni, prompt candidato. I dati ricetta sono trattati come contenuto non attendibile.
- **Precondizioni LIVE inviolabili:** flag esplicito `--live`, variabile `MEALUP_GROQ_FREE_TIER_CONFIRMED=YES`, chiave `GROQ_API_KEY` in ambiente segreto (mai in HTML, console pubblica o chat); max 3 ricette/esecuzione (default 1), stop immediato su 429/401/403/timeout, nessun retry né provider a pagamento; checkpoint di ripresa JSON. Un account Free verificato va configurato prima di usare LIVE. Il software non può certificare da sé il livello di fatturazione di Groq.
- **QA risultato:** nessun modello può autorizzare automaticamente immagini. `qaApproved=false`, `imageStatus=PENDING`, `safeToGenerate=false`. Controlli su completezza ingredienti, ID/revisione, fonti dei passaggi e posizionamenti espliciti supportati. Il controllo automatico NON assicura correttezza estetico-culinaria: verifica umana obbligatoria prima dei pilot visivi.
- **Test GitHub:** https://github.com/battagliafilippo/MealUp/actions/runs/38599257376 — **SUCCESS**; M2/M3 ancora PASS 454/454; M3b self-test PASS; `--dry-run` su 454/454 con **0 API calls**; mock di 3 schede con checkpoint e resume verificati; 0 immagini. Il mock NON costituisce ragionamento reale dell'AI e non fornisce 3 ricette pronte all'uso.
- **M3b non chiuso:** serve l'abilitazione esplicita di una chiave Groq **con piano Free confermato dall'utente** e un pilot LIVE (una ricetta difficile) più QA dei contenuti. Non eseguire automazione massiva prima di ciò. Nessun deploy / modifica al tester ufficiale o main.


## Pilot alternativo senza registrazione Groq — 2026-10-14
- L'utente non possiede un account Groq e desidera che il lavoro prosegua senza doverne creare uno. L'AI Groq LIVE **non è collegata**; NON fingere alcuna chiamata. Account, verifica email, consenso e API key richiedono azione esplicita dell'utente; non creare account a nome dell'utente.
- È già collegato Runway, workspace personale `Filippo` con 500 crediti inclusi prima della prova. È stato inviato UN pilot di immagine 1:1 per `r2`, **Poke bowl tonno e avocado**, usando 4 crediti inclusi (496 stimati dopo invio), zero pagamenti aggiuntivi. Task Runway `5d5c8c5b-a721-43b7-9eb7-fd2e133bd855`. Stato al momento dell'invio: `task_pending`, non dichiarare completata l'immagine finché non verificata.
- L'interpretazione culinaria del pilot è stata prodotta direttamente da ChatGPT nel dialogo, **non** da una pipeline automatica Groq. La proposta e il task ID sono conservati nel file `docs/recipe-visual/pilots/r2-poke-chatgpt-runway-v1.json`: 5 ingredienti reali, forme/posizioni ipotizzate marcate, `qaApproved=false`, `readyForApp=false`.
- L'esperimento M5 anticipato NON equivale a terminare M4/M5: il batch automatico 454 richiede ancora una strada di esecuzione e accesso al modello, con limiti di quota, approvazione degli asset e QA; la ripresa checkpoint M3b resta testata solo mock. L'immagine non è approvata e non va aggiunta al tester.
- Prossimo micro-step sul filone immagini: ispezionare l'output del pilot Runway quando pronto e valutarne ingredienti, stile, vessel, ritaglio e leggibilità. Non usare altri crediti prima dell'esito.
- `main` e unico tester ufficiale `mealup-tester-family-fo` invariati, nessun deploy.

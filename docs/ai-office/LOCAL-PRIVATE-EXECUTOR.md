# AI Office — esecutore locale privato e verificabile
**Laboratorio soltanto — 18 ottobre 2026.** NON installa un servizio cloud, NON crea agenti LLM autonomi, NON usa GitHub Actions come archivio privato.

## Che cosa esiste
- `tools/ai-office/director-local-readonly.cjs`: esegue, solo in un checkout del branch `experiment/recipe-visual-agents`, un test di sola lettura con il percorso **Director -> Constitution v1.9 originale -> Engineering (strumento interno deterministico) -> QA (script di regressione indipendente) -> checkpoint CEO**.
- `constitution-protected-handoff.cjs` prepara un pacchetto privato di norme effettivamente estratte dalla Costituzione originale dopo controllo dello SHA-256 canonico; il Director salva l'hash del **pacchetto specifico**.
- `director-private-ledger.cjs` registra task, step S1, step S2, QA ed esito CEO, con rilevamento replay e ripristino su **lo stesso** volume persistente.
- `director-private-mailbox.cjs` registra offerta, risultato Engineering e ricevuta QA, con corrispondenza di task ID, ruolo, brief, baseline e pacchetto.
- Lo script esecutore usa due comandi Node precisi, già nella libreria del laboratorio. **Non** accetta comandi arbitrari, installa Skill esterne, invoca LLM, accede a API a pagamento, modifica l'app o esegue deploy. Prima e dopo ciascuno strumento controlla che il checkout non abbia file modificati o non tracciati.

## Come si esegue su un computer autorizzato
Questo NON va avviato dal GitHub runner pubblico: il file originale privato resta esterno al repository. Un operatore autorizzato può predisporre un proprio host con Node 22, Python 3, checkout del **branch sperimentale** e una cartella permanente non pubblica, con permessi `0700`. Copiare il DOCX originale del CEO **fuori** dal repository con permessi `0600`. Non inviare il DOCX in pull request, GitHub artifacts, issue, log o chat pubbliche.

Il processo legge tre percorsi/valori soltanto dal suo ambiente locale, senza inserirli nei commit:
- `MEALUP_PRIVATE_CONSTITUTION_PATH`: percorso assoluto del DOCX originale con permessi `0600`;
- `MEALUP_PRIVATE_WORKDIR`: cartella assoluta permanente privata, permessi `0700`, dedicata ai checkpoint;
- `MEALUP_LAB_EXPECTED_SHA`: SHA a 40 caratteri dell'HEAD atteso del checkout sperimentale.

Per attivare volontariamente il pilota occorre impostare `GITHUB_REF_NAME=experiment/recipe-visual-agents` e `MEALUP_LAB_EXECUTE=YES`, quindi eseguire `node tools/ai-office/director-local-readonly.cjs` nel checkout. Tutti i valori vengono rivalidati; un ambiente non conforme fallisce prima di eseguire gli strumenti. Non utilizzare il comando con un repository sporco o una macchina non attendibile.

Il programma stampa soltanto un riepilogo senza corpo delle regole: stato, hash del pacchetto, capacità scelte, conteggi e checkpoint. Nessun estratto originale della Costituzione viene pubblicato. Se la fonte è assente, diversa, troppo accessibile, nel repository pubblico o se il brief/branch non coincide, il lavoro viene BLOCCATO. Un task interrotto può riprendere sul **medesimo disco privato** e sulla medesima revisione; in caso di evidenze contraddittorie si ferma per revisione anziché inventare un PASS.

## Evidenza di test e confini dell'autonomia
Test automatici eseguono casi **negativi** per assenza del documento, fonte contraffatta, privilegi e cartelle errate, branch/baseline errate e replay del checkpoint. Le Skill Engineering e QA sono state eseguite realmente e in sequenza nel workflow read-only del laboratorio, ma **il run GitHub non può testare un percorso positivo con il DOCX canonico**, perché quest'ultimo non deve essere caricato su repository/CI pubblici. Il collaudo end-to-end POSITIVO con originale disponibile sullo stesso host resta un gate di attivazione.

Il codice produce un prototipo locale a privilegi limitati, NON dimostra ancora:
- un servizio Director attivo fra le conversazioni, un collegamento diretto e duraturo alla Libreria privata ChatGPT o backup multi-host;
- l'identità autenticata di agenti remoti o un ordine del CEO firmato; i ruoli sono identità interne al codice, non autenticazioni crittografiche;
- selezione linguistica libera di Skill da parte di otto modelli AI, produzione immagini, failover e quote reali;
- affidabilità della qualità semantica o visiva della pipeline Food Portrait.

**Gate successivo `AIOS-02.2`:** approvare e collaudare un ambiente privato persistente che mantenga documento originale e checkpoint disponibili al Director, con accesso minimo, identità verificabili e recupero dopo interruzioni. In assenza di questa infrastruttura lo stato rimane `PARTIALLY_VERIFIED`. Tutto nel laboratorio, budget aggiuntivo 0 € e FROZEN intatti.

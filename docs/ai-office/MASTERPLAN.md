# MEALUP — AI OFFICE MASTERPLAN UNICO

**Data prima riconciliazione:** 15 ottobre 2026. **Baseline verificata:** `75d72a8e546005da7bca3284d80a7d6cdbe72aef`. **Ambito esclusivo:** `experiment/recipe-visual-agents`. **Budget aggiuntivo:** 0 €. **Stato:** Masterplan operativo del laboratorio, NON un nuovo freeze della Costituzione o del design MealUp.

## Come si usa, senza perdere nulla

**Unica fonte strutturata del piano:** [`tools/ai-office/masterplan-ledger.json`](../../tools/ai-office/masterplan-ledger.json). Il presente documento serve per la lettura umana e non sostituisce il registro. Identificativi canonici e persistenti: `DEC-...` (decisioni), `CMP-...` (componenti), `AIOS-01.1...` (micro-step), `UNK-...` (informazioni o vincoli irrisolti). Il controllo automatico [`masterplan-audit.cjs`](../../tools/ai-office/masterplan-audit.cjs) blocca riferimenti mancanti, duplicazioni, assenza di evidenze e cancellazioni silenziose rispetto alla versione precedente; confrontare le versioni con `--compare <precedente.json>`. **Non fornisce prova dell'autenticità delle autorizzazioni esterne**.

Un componente può avere **due stati distinti**: uno di autorità (`ACTIVE / FROZEN / SUPERSEDED / PROPOSED`) e uno di verificabilità (`VERIFIED / PARTIALLY_VERIFIED / UNVERIFIED / BLOCKED`). Per esempio, una regola può essere ACTIVE e la sua applicazione automatica reale ancora NON VERIFICATA. Una suite verde dimostra l'esecuzione dei test, non l'esistenza di otto agenti AI autonomi.

**Gerarchia approvata:** CEO decide; Director assegna incarichi operativi; lo Scout cerca candidati, riporta direttamente al CEO e non dirige quotidianamente gli altri specialisti; ogni specialista sceglie autonomamente soltanto le Skill realmente pertinenti, verificabili e autorizzate al task; QA indipendente può bloccare. Non si delegano nuove autorizzazioni, account, privilegi, licenze, costi o modifiche FROZEN senza approvazione prevista. Constitution v1.9 FROZEN rimane superiore.

## Mappa dello stato reale

| ID | Area | Situazione verificata / limite |
|---|---|---|
| CMP-001 | Office v1.3, router e handoff | Contratti ACTIVE; instradamento simulato e testato, nessun Director AI persistente |
| CMP-002 | Costituzione v1.9 | Estrattore e 19 test sintetici riusciti; originale privato non accessibile all'attuale runtime GitHub |
| CMP-003 | Scelta dinamica Skill | Logica testata; gli agenti reali non sono tutti collegati |
| CMP-004 | Engineering + QA | Pipeline di script read-only realmente eseguita sul laboratorio |
| CMP-005 | Qwen candidato Design | Una chiamata con due Skill riuscita tecnicamente; QUALITÀ VISIVA NON APPROVATA |
| CMP-006 | Talent Scout | Matrice otto ruoli + benchmark/requisiti; nessuna nomina automatica |
| CMP-007 | Scout programmato | Task settimanale abilitato, ma nessuna esecuzione registrata e notifiche disabilitate |
| CMP-008 | Director persistente | **Prototipo privato funzionante:** registro hash-linked, checkpoint e ripresa su stesso filesystem testati; runtime ospitato e autentificazione agenti NON pronti |
| CMP-009 | Quote e provider | Simulatore presente; gestione quote in tempo reale non implementata |
| CMP-010 | Otto agenti AI autonomi | Non qualificati né integrati |
| CMP-011 | QA e postflight | CI funziona; non sostituisce QA semantico o visuale |
| CMP-012 | Food Portrait | Sviluppo indipendente in altra chat; non eseguire immagini o scritture qui |

Evidenze storiche al checkpoint: [134/134 test AI Office](https://github.com/battagliafilippo/MealUp/actions/runs/38704501417), [19 test sintetici Costituzione](https://github.com/battagliafilippo/MealUp/actions/runs/38704501391), [Engineering→QA read-only](https://github.com/battagliafilippo/MealUp/actions/runs/38704501376), [Qwen una chiamata, QA visivo richiesto](https://github.com/battagliafilippo/MealUp/actions/runs/38699460011). Il numero dei test crescerà con il validatore del Masterplan: consultare il run corrente.

## Le cinque fasi, nell'ordine vincolante

| Fase | Obiettivo finale | Stato attuale e condizione di uscita |
|---|---|---|
| **01 — Unificazione** | Un solo registro autorevole di componenti, decisioni, stato, micro-step e recovery | Registro, vista umana, controllo CI e confronto senza perdite; dichiarare VERIFIED solo dopo QA |
| **02 — Sicurezza + Costituzione** | Proteggere `main` e consentire preflight con l'originale v1.9 senza pubblicarlo | **PARTIALLY VERIFIED:** `main` PROTETTO con ruleset attivo (18/10); Costituzione originale privata verificata ma non collegata in modo persistente al Director/GitHub CI |
| **03 — Director operativo** | Persistenza task, eventi, checkpoint, recupero, quota zero e fail-closed | **PARZIALE:** registro e mailbox privati testati con messaggi Director → reparto → QA e ripresa locale; manca esecuzione degli agenti, autenticazione, ripresa su altri host e controllo quote reale |
| **04 — Qualificazione specialisti** | Candidati con capacità, Skill, costi e prove reali approvati; notifica Scout verificata | Qwen non qualificato Design; no otto agenti nominati |
| **05 — Pilot end-to-end** | Un lavoro attraversa Director → specialista → Skill+Costituzione → QA → CEO e riprende da checkpoint | Non avviare finché fonte costituzionale, sicurezza, QA e permessi non sono verificati |

Per ogni micro-step il JSON contiene: **obiettivo, scope, precondizioni, dipendenze, output atteso, test, condizione d'uscita, stato, evidenze e blocker**. Prima di eseguire un task recuperare [`AGENTS.md`](../../AGENTS.md), l'Active Brief e la **Costituzione originale v1.9**. Attivare tutti i dogmi universali e le sole regole condizionali/speciali pertinenti, evitando di confondere test su fonti sintetiche con un handoff validato sull'originale. Una nuova richiesta non elimina mai implicitamente gli step precedenti: le revisioni richiedono riconciliazione motivata, tracciabilità e fonte verificata.

## Rischi e limiti da non nascondere

1. **Protezione `main` — RISOLTO il 18/10/2026:** GitHub dichiara `protected:true`; ruleset attivo [`Protect main`](https://github.com/battagliafilippo/MealUp/rules/25214872), obbligo di pull request, divieto di cancellazione e aggiornamenti non-fast-forward, nessun bypass actor. Questo non autorizza comunque nuovi agenti a scrivere.
2. **Accesso privato alla Costituzione:** il documento canonico è nella Libreria privata dell'utente, non nel repository pubblico. Non copiare la Costituzione su GitHub o negli artifact/log. Il codice attuale verifica hash e versione ma CI non può fornirgli il file; un workflow senza fonte deve rimanere BLOCKED.
3. **Scout:** il controllo del task schedulato registra `last_run_time:null`, notifiche e email `false`. È configurato, non dimostrato come osservatorio che recapita rapporti.
4. **Provider/quote:** Qwen Groq è un candidato collegato ma non un Design approvato; quote e failover tra fornitori non sono enforceable con i soli simulatori.
5. **Sicurezza e limiti:** il fatto che il branch `main` non sia protetto non autorizza a modificarlo. Le versioni FROZEN, la PWA, il tester e il lavoro Food Portrait sono fuori scope.

## Verifica fase 02 — 15/10/2026

Controllo **reale indipendente** sulla Costituzione originale privata: hash SHA-256 identico a `constitution-task-packet.py`, **152 sezioni non vuote**; i codici canonici `1.3`, `2.1`, `2.17`, `8.6`, `8.9`, `9.3.1`, `9.10`, `12.15`, `12.16`, `13.5`, `14`, `A.14` e `B.4` sono presenti. Il testo del documento è rimasto fuori dal repository. Il motore offre ora un controllo `--verify-source-only` che non emette clausole né crea file; il salvataggio dei pacchetti con le clausole richiede cartelle private e file con permessi limitati. [22 test Python (19+3) PASS](https://github.com/battagliafilippo/MealUp/actions/runs/38760713791).

**Stato accurato:** `AIOS-02.2 PARTIALLY_VERIFIED` perché il documento autentico è stato letto in una sessione privata, ma NON è collegato in modo persistente al Director né disponibile a GitHub Actions. `AIOS-02.1 BLOCKED` perché attivare la protezione di main richiede amministrazione GitHub. La procedura guidata e i criteri di verifica sono in [SECURITY-PHASE-02.md](SECURITY-PHASE-02.md).

## Aggiornamento indipendente al 18/10/2026

Il gate `AIOS-02.1` è ora **VERIFIED**: la protezione `main` è stata applicata realmente il 16/10 e verificata via GitHub API il 18/10, con regola attiva `Protect main`, pull request richiesta e blocco di cancellazione e force push. Evidenza: [ruleset](https://github.com/battagliafilippo/MealUp/rules/25214872). Il branch `main` non è stato modificato dal presente controllo.

Il prossimo step è `AIOS-02.2` (ancora PARTIALLY_VERIFIED): collegare, in un runtime privato autorizzato, l'originale della Costituzione v1.9 al preflight di ogni vero incarico del Director. Fino ad allora router, selector e simulazioni non sono una squadra autonoma pronta alla produzione.

## Checkpoint 18/10/2026 — Director gated preflight + memoria privata

Implementati e testati nel branch isolato: `director-private-ledger.cjs` (journal locale persistente, replay idempotente, hash di integrità, privato con permessi restrittivi), `director-secure-preflight.cjs` (selezione Skill e recupero Costituzione reale obbligatorio **prima** di creare il checkpoint), `director-private-ledger.test.cjs` e `director-secure-preflight.test.cjs`. [Audit iniziale 166 test PASS](https://github.com/battagliafilippo/MealUp/actions/runs/39121708920). [Contratto e limitazioni](DIRECTOR-PRIVATE-LEDGER.md).

**Conferme:** il journal può essere riaperto senza perdita di cronologia sullo stesso filesystem privato; la mancanza del documento originale blocca il mandato; non sono stati chiamati modelli AI, dati nuovi privilegi, creati agenti o modificati documenti FROZEN.

**Limiti:** il journal e il bridge non sono ancora un Director AI attivo; GitHub CI non legge la Libreria privata di ChatGPT e un file in /tmp non costituisce memoria cloud duratura fra esecuzioni diverse. `AIOS-03.1` è `PARTIALLY_VERIFIED`, mentre il prossimo gate resta `AIOS-02.2` sul collegamento privato del documento originale. Non confondere il successo dei test con comunicazione autonoma tra reparti o esecuzione reale di un incarico.

## Checkpoint 18/10/2026 — Comunicazione interna in laboratorio

Aggiunto `tools/ai-office/director-private-mailbox.cjs`: mailbox privata e persistente che registra offerta del Director, risultato del reparto assegnato e riscontro QA, con ordine degli eventi, associazione al brief, idempotenza e rilevazione dei conflitti. [179 test JavaScript PASS](https://github.com/battagliafilippo/MealUp/actions/runs/39127525590). Non esegue inferenze AI né autentica l'identità dei modelli: al momento i messaggi sono metadati offline.

Il registro canonico classifica `AIOS-03.2` come `PARTIALLY_VERIFIED`, mantenendo `AIOS-02.2` come prossimo gate non concluso. La Costituzione v1.9 resta privata e non è disponibile al runtime GitHub.

## Checkpoint 18/10/2026 — pacchetto costituzionale legato ai messaggi

Il percorso preparazione del task -> Constitution v1.9 originale -> Director journal -> mailbox privata ora usa l'hash SHA-256 **del pacchetto preciso generato**, non un semplice flag `sourceVerified:true`. Un'offerta priva di `taskPacketSha`, con hash differente, baseline differente o Active Brief diverso viene respinta. Questo migliora la continuità causale e riduce i falsi handoff. Prove: [181 test Node riusciti e verifiche di continuità](https://github.com/battagliafilippo/MealUp/actions/runs/39129081580) e [run di regressione del Masterplan](https://github.com/battagliafilippo/MealUp/actions/runs/39129273058).

La lettura separata dell'originale v1.9 privato in questa sessione ha confermato lo SHA canonico e **152 sezioni**, senza esporre il contenuto. I pacchetti con estratti restano fuori dal repository pubblico. **NON equivale ancora** ad accesso ricorrente del Director alla Libreria privata, ad autenticazione crittografica di agenti terzi o a esecuzione automatica di AI specialiste. `AIOS-02.2` e `AIOS-03.2` rimangono PARTIALLY_VERIFIED; il prossimo gate è un runtime privato durevole con vero original-source binding e identità verificate. Nessuna modifica a MealUp, Food Portrait o FROZEN.

## Checkpoint 18/10/2026 — runtime locale con fonte originale obbligatoria

È ora presente [l'esecutore locale read-only](../../tools/ai-office/director-local-readonly.cjs), documentato in [LOCAL-PRIVATE-EXECUTOR.md](LOCAL-PRIVATE-EXECUTOR.md). La catena autorizzata è: **Director -> verifica reale SHA-256 del DOCX originale v1.9 -> pacchetto privato specifico -> mailbox -> strumento Engineering già approvato -> verifica QA indipendente -> checkpoint e riepilogo CEO**. Lo script non accetta istruzioni eseguibili arbitrarie né nuove Skill, ricontrolla il branch e la baseline Git e blocca checkout modificati. Il suo registro privato e i messaggi conservano le operazioni per l'eventuale ripresa sullo stesso disco.

Prove: [189/189 test Node](https://github.com/battagliafilippo/MealUp/actions/runs/39129733082), inclusi **8 nuovi casi negativi del runtime privato**, e [esecuzione reale di strumenti interni Engineering + QA](https://github.com/battagliafilippo/MealUp/actions/runs/39129733085). **Limite sostanziale:** GitHub Actions NON dispone della Costituzione privata; pertanto in CI è verificata l'assenza di bypass e l'esecuzione separata dei due script, non il percorso positivo completo con sorgente privata nello stesso host. Il collegamento permanente alla Libreria ChatGPT e identità di modelli AI differenti non sono installati. `AIOS-02.2` resta PARTIALLY_VERIFIED, così come `AIOS-03.2`. Prossima prova: run positivo e prova di riavvio su host privato realmente autorizzato.

## Collaudo privato positivo con originale — 18/10/2026

**Novità verificata in sessione privata:** ho estratto una capsula pubblica del codice AI Office dal [workflow GitHub](https://github.com/battagliafilippo/MealUp/actions/runs/39131439877), senza inserire la Costituzione né credenziali negli artifact. In una copia Git locale **isolata** ho usato la Costituzione v1.9 originale conservata in una directory privata diversa dal repository e ho avviato il programma reale `director-local-readonly.cjs`. Il percorso Constitution → Director → Engineering → QA → CEO è arrivato a `PRIVATE_ORIGINAL_LAB_CHAIN_PASS_NOT_AUTONOMOUS_AI`: **67 clausole attive**, Engineering PASS, QA 189/189 PASS, 5 checkpoint e 3 messaggi, nessuna modifica al progetto né chiamata a modelli. Ripetendolo su identica baseline, Engineering e QA sono stati correttamente **riutilizzati** senza eseguire gli script una seconda volta. Fonte mancante e SHA Git errato vengono bloccati.

[Rapporto dettagliato senza testo riservato](PRIVATE-ORIGINAL-PILOT-20261018.md). Questa prova privata e il suo resoconto non costituiscono un CI GitHub che abbia letto il documento originale: la fonte riservata è rimasta fuori da GitHub e l'ambiente isolato del test non è un servizio Director durevole.

**Avanzamento senza overclaim:** `AIOS-02.2 PARTIALLY_VERIFIED` e `AIOS-03.2 PARTIALLY_VERIFIED` restano tali. Prossimo micro-step: definire e provare **dove ospitare in modo duraturo e autorizzato** il runtime privato (senza upload pubblico della Costituzione), con identità di specialisti e QA indipendente; solo in seguito qualificare agenti AI veri.

## Recupero e prossimo incarico

- Conservare **tutti gli ID**, le decisioni `DEC`, i problemi `UNK`, i checkpoint e i riferimenti all'evidenza. Usare Git come cronologia delle versioni del JSON, non riscrivere decisioni approvate senza nuova decisione esplicita e traccia di sostituzione.
- Recuperare baseline/brief/task originali, marcare STALE ogni output vecchio dopo cambi materiali e riconciliare tutto ciò che resta aperto.
- **Prossimo micro-step verificato al 18/10:** `AIOS-02.2` — collegamento privato e persistente alla Costituzione, senza pubblicare alcun testo riservato. `AIOS-02.1` è completato.
- **Non avviare automaticamente i passi 03–05**. Budget aggiuntivo 0 €, nessun deploy.

Questo piano è separato dal **MealUp Master v1.24 dell'app** e dalla **Food Portrait Production Pipeline**. Nessun loro file è stato modificato nell'unificazione.

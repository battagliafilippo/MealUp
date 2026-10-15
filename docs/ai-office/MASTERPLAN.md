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
| CMP-008 | Director persistente | Non implementato |
| CMP-009 | Quote e provider | Simulatore presente; gestione quote in tempo reale non implementata |
| CMP-010 | Otto agenti AI autonomi | Non qualificati né integrati |
| CMP-011 | QA e postflight | CI funziona; non sostituisce QA semantico o visuale |
| CMP-012 | Food Portrait | Sviluppo indipendente in altra chat; non eseguire immagini o scritture qui |

Evidenze storiche al checkpoint: [134/134 test AI Office](https://github.com/battagliafilippo/MealUp/actions/runs/38704501417), [19 test sintetici Costituzione](https://github.com/battagliafilippo/MealUp/actions/runs/38704501391), [Engineering→QA read-only](https://github.com/battagliafilippo/MealUp/actions/runs/38704501376), [Qwen una chiamata, QA visivo richiesto](https://github.com/battagliafilippo/MealUp/actions/runs/38699460011). Il numero dei test crescerà con il validatore del Masterplan: consultare il run corrente.

## Le cinque fasi, nell'ordine vincolante

| Fase | Obiettivo finale | Stato attuale e condizione di uscita |
|---|---|---|
| **01 — Unificazione** | Un solo registro autorevole di componenti, decisioni, stato, micro-step e recovery | Registro, vista umana, controllo CI e confronto senza perdite; dichiarare VERIFIED solo dopo QA |
| **02 — Sicurezza + Costituzione** | Proteggere `main` e consentire preflight con l'originale v1.9 senza pubblicarlo | **BLOCKED:** `main` risultava `protected:false` e nessun ruleset; originale v1.9 disponibile soltanto in libreria privata |
| **03 — Director operativo** | Persistenza task, eventi, checkpoint, recupero, quota zero e fail-closed | Da sviluppare su laboratorio dopo architettura e gate di sicurezza |
| **04 — Qualificazione specialisti** | Candidati con capacità, Skill, costi e prove reali approvati; notifica Scout verificata | Qwen non qualificato Design; no otto agenti nominati |
| **05 — Pilot end-to-end** | Un lavoro attraversa Director → specialista → Skill+Costituzione → QA → CEO e riprende da checkpoint | Non avviare finché fonte costituzionale, sicurezza, QA e permessi non sono verificati |

Per ogni micro-step il JSON contiene: **obiettivo, scope, precondizioni, dipendenze, output atteso, test, condizione d'uscita, stato, evidenze e blocker**. Prima di eseguire un task recuperare [`AGENTS.md`](../../AGENTS.md), l'Active Brief e la **Costituzione originale v1.9**. Attivare tutti i dogmi universali e le sole regole condizionali/speciali pertinenti, evitando di confondere test su fonti sintetiche con un handoff validato sull'originale. Una nuova richiesta non elimina mai implicitamente gli step precedenti: le revisioni richiedono riconciliazione motivata, tracciabilità e fonte verificata.

## Rischi e limiti da non nascondere

1. **Protezione `main`:** GitHub dichiara `protected:false` e `rulesets:[]` nel controllo del 15 ottobre 2026. Il connettore GitHub disponibile può leggere e scrivere file nel laboratorio ma NON impostare in chat le regole amministrative. Senza gate verificato non dare nuovi permessi di scrittura agli agenti.
2. **Accesso privato alla Costituzione:** il documento canonico è nella Libreria privata dell'utente, non nel repository pubblico. Non copiare la Costituzione su GitHub o negli artifact/log. Il codice attuale verifica hash e versione ma CI non può fornirgli il file; un workflow senza fonte deve rimanere BLOCKED.
3. **Scout:** il controllo del task schedulato registra `last_run_time:null`, notifiche e email `false`. È configurato, non dimostrato come osservatorio che recapita rapporti.
4. **Provider/quote:** Qwen Groq è un candidato collegato ma non un Design approvato; quote e failover tra fornitori non sono enforceable con i soli simulatori.
5. **Sicurezza e limiti:** il fatto che il branch `main` non sia protetto non autorizza a modificarlo. Le versioni FROZEN, la PWA, il tester e il lavoro Food Portrait sono fuori scope.

## Recupero e prossimo incarico

- Conservare **tutti gli ID**, le decisioni `DEC`, i problemi `UNK`, i checkpoint e i riferimenti all'evidenza. Usare Git come cronologia delle versioni del JSON, non riscrivere decisioni approvate senza nuova decisione esplicita e traccia di sostituzione.
- Recuperare baseline/brief/task originali, marcare STALE ogni output vecchio dopo cambi materiali e riconciliare tutto ciò che resta aperto.
- **Dopo il QA della fase 01, prossimo micro-step:** `AIOS-02.1` — determinare quale protezione di branch sia realmente applicabile e verificarla prima di introdurre agenti con WRITE SCOPE. In parallelo è analizzabile, **senza pubblicare alcun testo riservato**, `AIOS-02.2` — architettura del collegamento privato alla Costituzione.
- **Non avviare automaticamente i passi 03–05**. Budget aggiuntivo 0 €, nessun deploy.

Questo piano è separato dal **MealUp Master v1.24 dell'app** e dalla **Food Portrait Production Pipeline**. Nessun loro file è stato modificato nell'unificazione.

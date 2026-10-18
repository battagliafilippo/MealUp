# AI Office — pilot con Costituzione v1.9 originale su host isolato

**Data verifica:** 18 ottobre 2026. **Stato:** POSITIVE LOCAL CONTROLLED TEST PASS; autonomous agents NOT QUALIFIED.

## Oggetto, perimetro e origine

Il codice AI Office è stato acquisito tramite un archive di soli file **pubblici** del laboratorio esportato dal workflow [AI Office — Public Lab Source Capsule](https://github.com/battagliafilippo/MealUp/actions/runs/39131439877), commit GitHub `8304eb1d5515111cf6868319af3c0e1475afd6c8`. Nessuna fonte privata è stata esportata da GitHub.

La capsula pubblica è stata ricostruita **in una nuova copia Git locale isolata**, branch `experiment/recipe-visual-agents`, con commit locale `f9430a256bca1d07f6f1d64b4c43d8171f8b6471`. **Questi due commit non sono identici**: il secondo identifica soltanto la copia locale usata per la prova, non sostituisce la baseline del repository GitHub.

La Costituzione `Costituzione_Operativa_AI_v1.9_FROZEN.docx` è stata letta da una copia **privata separata** nel medesimo host, fuori dalla checkout, con SHA-256 canonico `51043574d188c085de51282e50f8784d8f5cf779300891dee0fe8014414470eb`, permessi `0600`. La directory dei checkpoint aveva permessi `0700`; journal e mailbox `0600`. Non sono stati copiati sul repository né caricati negli artifact il DOCX o gli estratti delle clausole.

## Prima esecuzione — POSITIVA

Sullo script `tools/ai-office/director-local-readonly.cjs`, con branch, consentimento esplicito, directory privata e baseline locale verificati:

- **Constitution preflight:** `VERIFIED_REAL_ORIGINAL`, SHA canonico verificato e 67 regole pertinenti attivate; assegnata la Skill `MEALUP_ENGINEERING_JS_AUDIT`.
- **Director → Engineering:** eseguito lo script read-only di controllo sintassi, **PASS**.
- **Engineering → QA indipendente:** suite Node in un processo separato, **189 test, 189 pass, 0 fail**.
- **QA → Director → CEO:** checkpoint metadata-only completato: 5 eventi ordinati nel journal e 3 messaggi nella mailbox.
- **Economia e scopo:** 0 chiamate LLM/API, 0 costo aggiuntivo, 0 file MealUp modificati, 0 deploy, 0 cambi su main/tester/FROZEN/Food Portrait.

**Non è prova di otto agenti AI autonomi.** Engineering e QA qui sono script locali a percorso fissato, non modelli LLM remoti autenticati.

## Seconda esecuzione e casi negativi

- Seconda esecuzione sullo **stesso** filesystem e baseline: `reusedEngineering:true`, `reusedQA:true`, stessi 5 eventi e 3 messaggi; niente doppia esecuzione.
- Sorgente originale assente: `BLOCKED_CANONICAL_SOURCE_NOT_AVAILABLE`; nessun evento.
- Baseline Git sbagliata: `BLOCKED_STALE_BRANCH_OR_BASELINE`; nessun evento.
- Nessun file del progetto o documento FROZEN è stato modificato dalle due esecuzioni.

La prova positiva è stata effettuata **fuori** dai runner pubblici GitHub e il suo esito è riportato qui come evidenza operativa della sessione privata, non come test CI remoto riproducibile senza la fonte. [Gli ultimi test CI pubblici della capsula](https://github.com/battagliafilippo/MealUp/actions/runs/39131439877) verificano soltanto il suo archivio di codice pubblico. Gli altri controlli sintetici continuano a essere eseguiti su GitHub.

## Cosa rimane aperto

1. Una **macchina o servizio autorizzato e durevole**, cui il Director possa accedere tra conversazioni diverse con lo stesso archivio privato. La directory locale di questa prova NON è un servizio sempre attivo o un backup garantito.
2. Autenticazione separata e attestazioni del CEO e degli agenti specialisti; i nomi dei ruoli nei record locali non sono identità crittografiche.
3. Collegamento autorizzato e persistente alla Libreria privata: il trasferimento manuale di una copia locale sulla stessa macchina NON equivale a un connector Live della Libreria ChatGPT.
4. Quote reali e failover fra fornitori gratuiti, promozione specialisti dopo QA e un pilot di collaborazione **con veri agenti**.

**Stati del Masterplan invariati:** `AIOS-02.2 PARTIALLY_VERIFIED`, `AIOS-02.3 OPEN`, `AIOS-03.2 PARTIALLY_VERIFIED`. È stata provata la catena tecnica sul medesimo host, non l'autonomia continua. Il prossimo gate deve rendere duratura la custodia privata con accesso minimizzato e identità verificate, senza costi aggiuntivi o copie pubbliche.

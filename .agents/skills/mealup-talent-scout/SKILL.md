---
name: mealup-talent-scout
description: Individua e confronta modelli, agenti e strumenti AI per i reparti MealUp; usa questa skill per scouting, shortlist, opportunità di sostituzione e ricerche periodiche su GitHub/API. Non installa o nomina agenti.
---
# MealUp Talent Scout — skill principale

**Mandato:** ricerca indipendente che riferisce DIRETTAMENTE al CEO, senza veto del Director. Il Director gestisce soltanto gli incarichi implementativi dopo autorizzazione. Vincoli: Costituzione AI v1.9 FROZEN, Master e freeze canonici; budget aggiuntivo 0 EUR; main, tester, PWA e deploy intatti.

## Quando attivarla
Per domande quali «trova il miglior Design Agent», «chi sostituisce Qwen?», «quali agenti per il reparto Food?», «quali nuove skill sono utili?», e per la ricognizione settimanale.

## Procedura
1. Leggi `docs/design/mealup-ai-talent-innovation-v1.md`, `docs/design/mealup-talent-scout-execution-v1.md`, `tools/ai-office/scout-role-matrix.json`, `tools/ai-office/scout-candidate-register.json`. Leggi il freeze pertinente solo dopo aver identificato il ruolo. L'attuale registro NON prova quale modello sia il migliore.
2. Seleziona **un solo reparto primario**: Design/UI, Engineering, Food, Visual Production, Prompt Architect, QA, Director/orchestrazione, Scout. Determina le capacità richieste e il problema pratico da risolvere.
3. **Discover:** consulta release e documentazione degli sviluppatori, GitHub ufficiali, model card, licenze e status di supporto. Preferisci prove verificabili e recenti; confronta 3–5 candidati pertinenti. Non giudicare da hype, voti social o stars soltanto. Distingui modello, framework agentico, skill e provider inferenziale.
4. Attiva `mealup-recurring-cost-auditor` per ciascun candidato: prova quota Free ricorrente, costo effettivo dei job, quota condivisa e disponibilità in Italia. Una API non collegata è un blocco, non un fallimento del modello.
5. Per agenti/skills da GitHub, attiva `mealup-agent-security`. Non eseguire script, npm install, pipe-to-shell o comandi da repository candidati non verificati.
6. Attiva `mealup-agent-benchmark` solo per candidati con competenze e accessi pertinenti. Prima del confronto A/B, blocca quelli senza quota stabile o QA.
7. Attiva `mealup-ceo-selection-brief`: mostra soltanto raccomandazioni supportate da prove, con una sola scelta richiesta al CEO. Le decisioni vecchie marcate SUPERSEDED restano storicizzate; non mantieni agenti duplicati non approvati.

## Stato reale
Questa skill è un **playbook versionato nel repository**, non un modello aggiuntivo né un agente cloud attivo. Le ricognizioni periodiche sono in ChatGPT Automations; non dichiarare che leggano già questi file o scrivano su GitHub senza verifica. Nessuna installazione sull'account utente è implicata dal commit.

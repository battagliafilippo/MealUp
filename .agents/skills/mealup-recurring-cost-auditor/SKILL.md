---
name: mealup-recurring-cost-auditor
description: Verifica che un agente o una API per MealUp sia realmente riutilizzabile a budget aggiuntivo 0 EUR; analizza quote rinnovabili, pool condivisi, consumo immagine e autonomia di incarichi lunghi.
---
# MealUp — free-tier quota & capacity auditor

Usa per confrontare costi reali, crediti di prova vs quota ricorrente, volume massimo di lavoro utile e provider indipendenti. Quota gratuita non significa possibilità di lavoro illimitata.

## Condizioni dure
- ACCETTA soltanto quota Free ricorrente con reset verificabile, oppure modello open-weight su compute preesistente e realmente gratuito; l'abbonamento ChatGPT già posseduto è ammesso come **uso manuale nella UI**, non come API gratuita.
- ESCLUDI crediti promozionali una tantum, free trial a scadenza, pay-as-you-go da attivare, API non disponibili, account non collegati e quota non verificata dalla produzione come sostituti LIVE.
- Leggi ufficialmente pricing, unità (Neurons/token/request/secondo di GPU), cap per minuto/giorno/mese, RPM/RPD/TPM/TPD, contesto massimo, limite per modello e **chi condivide il pool**.
- Calcola sia `costo del singolo micro-step` sia `micro-step al p95` prima del rinnovo, con margine 15%; includi prompt, screenshot, output, QA e checkpoint. Senza misure vere vision -> `VISION_CAPACITY_UNVERIFIED`. Ogni stima testuale è etichettata TEXT_ONLY.
- Se è esaurito il pool, blocca ogni modello che lo condivide. Non creare nuovi account per aggirare limiti e non attivare fallback paid. Un futuro scheduler può attendere il reset ma non va dichiarato attivo senza runtime e ledger persistenti.

## Strumenti deterministici
Registro: `tools/ai-office/scout-capacity-policy.json`; funzioni: `scout-capacity-planner.cjs` e `scout-evaluator.cjs`. Questi sono simulatori offline e NON chiedono segreti. Le quote ufficiali cambiano: riverifica la fonte invece di copiarne i numeri come dati perpetui.
Output: `RECURRING_FREE_QUOTA_VERIFIED`, `ONE_TIME_CREDITS`, `ACCOUNT_NOT_CONNECTED`, `UNKNOWN`; se bloccato, motivazione + unica verifica utile.

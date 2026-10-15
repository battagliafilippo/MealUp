---
name: mealup-agent-benchmark
description: Progetta e valuta benchmark riproducibili di agenti MealUp per Design vision, codice Engineering, ricette Food, generazione asset e QA, con score indipendente e controlli FROZEN.
---
# MealUp — task-specific benchmark & independent QA

Attiva SOLO con compito e candidati ammissibili. Non inventare API, prove, output o risultati. `tools/ai-office/scout-role-matrix.json` definisce requisiti minimi specifici per ruolo.

## Protocollo
1. Definisci **prima** delle chiamate: versione dei brief/FROZEN, task realistici, criteri, negativi (es. card non fornita, immagine singola con trasparenza), output e checkpoint; 4+ casi diversi, un caso di fallimento controllato; per Design includi almeno uno screenshot UI reale, non solo FO isolato.
2. Pareggia immagini, checksum, prompt, documenti, versione input e condizioni d'esecuzione nei limiti supportati dai provider. Registra differenze per token/effort e non assumere che parametri nominalmente uguali siano identici in modelli diversi.
3. Misura qualità dei dettagli, falsi positivi e invenzioni, formati, rispetto dei FROZEN, regressioni, costi reali incluse immagini, latenza, disponibilità e comportamento ai limiti. Valuta sul risultato **utilizzabile**, non solo sulla risposta API.
4. QA separato dal modello candidato: verifiche deterministicamente riproducibili e controllo visivo/umano indipendente; vietato che il modello certifichi il proprio output. Lo scorer registra `UNVERIFIED` se mancano dati.
5. Evita decisioni da singola prova. Dove possibile ripeti in momenti distinti per varianza e documenta limiti del campione. Se una richiesta è HTTP 403 o l'account manca, risultato `ACCESS_BLOCKED`, non modello scadente.
6. Le librerie open source `promptfoo` (valutazioni dichiarative anche multimodali) e `Inspect AI` sono strumenti opzionali da verificare ed eventualmente adottare dopo QA; **non** installarle automaticamente né usare API paid.

## Ruoli
- Design: screenshot reali, FO, alpha/background, layout e FROZEN, accessibilità, nessun frame inventato.
- Engineering: branch laboratorio, diff minimale, test automatici, regressioni e prestazioni iPhone/PWA.
- Food: mapping canonico delle 454 ricette e 14 famiglie FO, sicurezza/realismo culinario, vessel_id Food Portrait.
- Visual Production: ChatGPT Images già compreso nell'abbonamento come interfaccia manuale, asset approvati e reviewer visivo. API OpenAI separata NON gratis.
- QA: falsi PASS, difetti introdotti, copertura e indipendenza.
- Director/Scout: routing selettivo, version lock, costi, governance, accuratezza scouting.

Output: QA `PASS/PARTIAL/FAIL/BLOCKED` con prove, non promozione. Senza A/B su modelli distinti -> `NO_CROSS_MODEL_BENCHMARK`.

---
name: mealup-design-no-overclaim
description: Previene false dichiarazioni di approvazione, conformità FROZEN, file modificati, agenti attivati o test mobili effettuati nei rapporti visivi MealUp.
---
# Skill — Confini della prova visuale

Attivazione: ogni rapporto Design su input di portata limitata, compresi Food Object senza screenshot delle card.
Se non è presente una card reale, non descrivere card come già vista. Se non hai accesso al documento FROZEN completo, NON certificarne la conformità.
Scrivi suggerimenti di test futuri, non dichiarare test già effettuati.
Output JSON: `family`, `visibleObservations` (1–4 testi), `uncertainties` (array), `suggestedMobileCheck` (testo).
Gli unici valori consentiti per gli effetti: `claimedFrozenCompliance:false`, `filesModified:[]`, `otherDepartmentsActivated:[]`.
Non proporre costi, modifiche di produzione o sostituzioni dell'agente; il risultato richiede QA indipendente.

# MealUp v1.24 implementation state

## Governance

- Constitution: Costituzione Operativa AI v1.9 FROZEN
- Design authority: MealUp Master v1.24 corrected
- Runtime branch: mealup-tester-family-fo
- Current starting commit: 99ba1fda0a05c44d4d9c8e4dd7a26f84f393290e
- Historical audit baseline: 427c2708d7b47f9e4ee9851c28b9276271cff760

## Implemented in the current working state

- Shared MealUp v1.24 presentation adapter in assets/mealup-v124.css.
- Canonical five-item bottom navigation retained.
- Home single suggestion card and card-local swipe retained from the active Home recovery step.
- Recipes lead result plus compact exploration grid.
- Shopping and secondary surfaces moved to the cream porcelain field.
- Scorte hub with Dispensa, Frigo, Freezer and Avanzi destinations.
- Profile route hub for goals, eating preferences, Diary and connections.
- Diary surface restored and connected to the existing renderDiary engine.
- Kitchen Mode dark visual adapter.
- Service-worker cache version advanced and the new visual assets added to the shell.
- Source and dist kept synchronized.

## Verification

- test/master-v124-smoke.js: 7 passed, 0 failed.
- Responsive browser inspection completed at 390 by 844 for Recipes, Shopping, Scorte and Profile.
- Complete regression suite after reconciliation: 263 passed, 0 failed.
- Kitchen resume, timers, portions, step ingredients and final state are verified.
- Leftovers keep their origin meal and remain available in the canonical Avanzi destination.
- Home meal state, daily totals, macro totals, training mode and breakfast drink rules are verified against the current runtime.
- Legacy visual assertions were replaced only where Master v1.24 explicitly supersedes the old Home structure.
- The scale update no longer replaces the scale SVG with legacy counter digits; its value, needle and settling response remain intact after meal registration.
- Scanner live, manual/offline, result and retry states now follow the R7 visual hierarchy.
- Scanner result presents the existing calculated score on a 0–100 scale through five display levels, without changing the protected scoring engine.
- Barcode memory, real-product matching, package quantity and Shopping handoff are verified.

## State

VERIFIED CHECKPOINT

No FROZEN element has been reclassified. No protected calculation engine was intentionally changed.

## Next atomic step

Continue from this passing checkpoint with the next bounded visual slice:

1. Implement the detailed Shopping states: add product, product details, unit selection and purchased grouping.
2. Preserve recipe aggregation, corrected quantities, real-product matching and final transfer to Scorte.
3. Add focused Shopping state tests before changing the next section.

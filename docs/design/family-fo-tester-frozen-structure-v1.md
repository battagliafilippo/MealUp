# MealUp — Family FO Tester: frozen structure v1

Branch: `mealup-tester-family-fo`
Date: 2026-10-05
Method: Costituzione Operativa AI v1.9

## Applied
- Global Satoshi enforcement.
- Frozen palette tokens from `docs/design/frozen-home-reference.json`.
- Home frozen orange identity + MU background foundation.
- Ricette approved cream identity + MU foundation; final card/detail hierarchy remains OPEN.
- Kitchen Mode frozen anthracite/cream/orange identity foundation.
- Bottom navigation frozen cream material language + soft orange active state.
- Shared `.mealup-fo-slot` contract for the new family FO resolver.

## Not redesigned
Scorte hub, Dispensa, Frigo, Freezer, Avanzi, Spesa, Diario, Profilo, Scanner final UI, Ricette final card hierarchy and Dettaglio final hero/layout.

## Protected
`suggestFor()`, Kitchen Mode engines/session/timers, Diario, Scanner, Spesa, recipe catalog/schema, favorites, search/filters, recipe opening, quantities/portions, Scorte logic, persistence/state.

## Next
Install approved family FO assets into this structure on this branch only.


## Runtime integration checkpoint — 2026-10-05

Status: PARTIAL_PASS_BINARY_TRANSFER_BLOCKED.

Verified:
- 14/14 family records present.
- 454/454 recipe IDs mapped exactly once.
- No invalid family references.
- Runtime resolver loaded by the tester index.
- Recipe visual rendering is intercepted by `MealUpFamilyFO` before the legacy `arteRicetta` body.
- Explicit hosts wired: RECIPE_CARD and RECIPE_DETAIL.
- Missing binary asset resolves to the neutral placeholder.
- `no_vessels=true`, `no_compositions=true`.
- All 14 manifest filenames exactly match the approved asset package.

Binary transfer:
- The approved package contains all 14 WEBP files.
- The current GitHub connector accepts repository blob content, but cannot consume binary bytes directly from the local conversation/container file.
- Therefore the 14 image binaries are NOT claimed as uploaded.
- Runtime state remains `MAPPING_ACTIVE_ASSET_TRANSFER_PENDING`.
- main and the previous tester remain unchanged.

Next required action:
Upload the 14 approved WEBP files into `assets/family-fo/` using the exact manifest filenames, then run browser/device QA before declaring PASS.

## Family asset installation — 2026-10-05

Status: ASSETS_PRESENT_RESOLVER_PASS.

- The four approved source boards supplied by the owner were split into the 14 family assets.
- The revised dessert board is installed as `dolce-pasticceria.webp`.
- Every asset is a transparent 1024 × 1024 WEBP and matches its manifest path.
- All 454 recipe IDs resolve to the expected family asset.
- Unknown recipe IDs retain the neutral placeholder and invalid hosts remain rejected.
- `main` and the previous tester remain unchanged.

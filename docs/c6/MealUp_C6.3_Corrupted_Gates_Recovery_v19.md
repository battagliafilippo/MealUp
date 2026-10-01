# MealUp C6.3 — Corrupted Gates Recovery v19

Date: 2026-10-01  
Branch: `mealup-redesign-preview`  
Scope: recovery from the corrupted historical `G5/recipe-geometry.json`.

## Canonical correction

The historical file `G5/recipe-geometry.json` is preserved unchanged for traceability and is superseded operationally by:

- `G5/recipe-geometry.v2.corrected.json`
- SHA-256: `02e0fdd7ec1490a329eab73755f6c882995708e2cddcec712d2a92623f192ad6`
- 454/454 recipes
- 454 unique recipe IDs
- 1,537 layers
- 0 structural audit errors
- 0 validated-slot-source failures
- 72 recoverable healthy-prefix recipes compared with 0 mismatches

The successor is deterministic from the frozen G4/G5 inputs and does not introduce a redesign.

## Gate recovery status

- **G5 geometry payload:** `PASS_SUCCESSOR_CORRECTION`
- **G8 verified-kit input binding:** `PASS_RECERTIFIED_SUCCESSOR`
  - `EXPECTED_INPUTS.recipes` points to the corrected successor and its verified SHA.
- **G11 runtime package/binding:** `PASS_STATIC_RECERTIFICATION`
  - the single tester loads `G11/mealup-g11-bundle.js`;
  - the bundle is bound to the corrected successor;
  - 12 corrected transport shards are present;
  - old corrupted transport shards are absent.
- **G12 DOM/browser assertions:** `RUNTIME_RETEST_PENDING`
  - previous browser evidence remains historical evidence, but is not re-labelled as a fresh rerun against the corrected successor.
- **G13 frozen review:** `FROZEN_WITH_SUCCESSOR_CORRECTION_PATCH`
  - historical G13 freeze is preserved;
  - this v19 recovery addendum is the canonical correction layer;
  - manual iPhone visual confirmation is still pending.

## Integrity / isolation

- `main` SHA remains `120104b633d6676a6bb04f91b2e7e3e285198424`.
- No production deploy was performed.
- No second tester was created.
- Food Object PNGs, Master IDs, mappings, vessel geometry, Gauge geometry and protected application logic were not redesigned by this correction.
- The only active tester remains `mealup-redesign-preview`.

## Remaining closure condition

The repository-side corruption recovery is complete. Full post-correction closure of G12/G13 requires one fresh runtime/browser validation against the corrected successor, including manual iPhone visual confirmation that migrated recipe surfaces show the canonical Food Objects rather than legacy `arteRicetta()`.

## Cache correction update — 2026-10-01

- Bundle cache-busting patch published on the tester branch: `9bb279bf8f18ab524ab56753bb2ad9549c683481`.
- Tester HTML bundle-version patch published: `703d2c49e2c5be00921469f67db56c77726ae5c3`.
- The corrected geometry and its 12 shards remain unchanged and verified.
- Fresh visual retest remains pending until the preview CDN serves the new versioned page.

# MealUp Food Object Assets

This directory contains reusable MealUp Toy Food Objects used by recipe compositions.

## Registration contract

Each registered asset must have:
- one final transparent image file;
- a stable `master_id`;
- an optional `variant_id`;
- a matching C6.1 queue entry;
- linked recipe IDs;
- review/approval status;
- no recipe-specific composition baked into the object.

## Current C6.2 state

The authoritative production queue contains 186 unique asset instantiations.

Assets previously generated in ChatGPT are tracked separately as `GENERATED_UNREGISTERED` until their actual image files are available for repository registration.

Do not mark an asset `REGISTERED` without the actual binary image.

## Planned structure

```
assets/food-objects/<master_id>/
  <asset_key>.png
  asset.json
```

Variants use:

```
assets/food-objects/<master_id>/<variant_id>/
  <asset_key>.png
  asset.json
```

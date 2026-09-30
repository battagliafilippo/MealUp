/* MealUp C6.3 — G3 resolver corrected by G4 preflight.
   Semantic resolver only. It intentionally does NOT turn mapping bases into
   extra visual layers. Geometry expansion/collapse belongs to G4/G5.
   No app behavior is wired at this stage. */
(function (root) {
  'use strict';

  function normalizeIngredient(value) {
    return String(value == null ? '' : value)
      .toLowerCase().trim().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function hardError(code, detail) {
    return { ok: false, error: code, detail: detail || null };
  }

  function create(config) {
    config = config || {};
    const catalog = config.catalog || {};
    const mappingDoc = config.mappings || {};
    const matrix = config.matrix || {};
    const aliases = config.aliases || {};

    const assetByMaster = new Map((catalog.assets || []).map(x => [x.master_id, x]));
    const mappingByMaster = new Map((mappingDoc.entries || []).map(x => [x.master_id, x]));
    const recipeById = new Map((matrix.rows || []).map(x => [x.recipe_id, x]));
    const aliasByName = new Map(Object.entries(aliases.records || {}));

    function resolveMaster(masterId) {
      if (!masterId) return hardError('MASTER_ID_REQUIRED');
      const asset = assetByMaster.get(masterId);
      if (asset) {
        return {
          ok: true, type: 'ASSET', master_id: masterId,
          asset_file: asset.asset_file,
          metadata_file: asset.metadata_file || null,
          sha256: asset.sha256 || null,
          immutable: asset.immutable !== false
        };
      }
      const mapping = mappingByMaster.get(masterId);
      if (!mapping) return hardError('MASTER_NOT_REGISTERED', masterId);
      return {
        ok: true,
        type: 'MAPPING',
        master_id: masterId,
        mapping_type: mapping.mapping_type,
        base_candidates: Array.isArray(mapping.base) ? mapping.base.slice() : [],
        variant: mapping.variant || null,
        synthetic_generation_allowed: false,
        note: 'G4 geometry policy chooses exactly how this logical mapping renders.'
      };
    }

    function resolveRole(item, role, slotIndex) {
      if (!item || !item.master_id) return hardError('ROLE_MASTER_REQUIRED', role);
      const master = resolveMaster(item.master_id);
      if (!master.ok) return master;
      return {
        ok: true,
        role: role,
        slot_index: slotIndex || 0,
        master_id: item.master_id,
        variant_id: item.variant_id || null,
        master: master
      };
    }

    function resolveRecipe(recipeId) {
      const row = recipeById.get(recipeId);
      if (!row) return hardError('RECIPE_COMPOSITION_NOT_FOUND', recipeId);
      const layers = [];

      let r = resolveRole(row.primary, 'primary', 0);
      if (!r.ok) return r; layers.push(r);

      for (let i=0;i<(row.secondary || []).length;i++) {
        r = resolveRole(row.secondary[i], 'secondary', i);
        if (!r.ok) return r; layers.push(r);
      }
      for (let i=0;i<(row.details || []).length;i++) {
        r = resolveRole(row.details[i], 'detail', i);
        if (!r.ok) return r; layers.push(r);
      }
      if (row.sauce) {
        r = resolveRole(row.sauce, 'sauce', 0);
        if (!r.ok) return r; layers.push(r);
      }

      return {
        ok: true,
        recipe_id: recipeId,
        composition_id: row.composition_id,
        vessel_id: row.vessel_id,
        logical_layers: layers,
        gauge: {
          required: true,
          component: 'MEALUP_GAUGE',
          state_source: 'recipe/portion'
        }
      };
    }

    function resolveIngredient(name) {
      const key = normalizeIngredient(name);
      if (!key) return hardError('INGREDIENT_NAME_REQUIRED');
      const rec = aliasByName.get(key);
      if (!rec) return hardError('UNKNOWN_INGREDIENT', name);

      if (rec.classification === 'NON_VISUAL_SUPPORT') {
        return { ok:true, visual:false, classification:rec.classification,
          source_label:rec.source_label, reason:rec.reason };
      }
      if (rec.classification === 'CONTEXT_REQUIRED') {
        return hardError('INGREDIENT_CONTEXT_REQUIRED', {
          source_label:rec.source_label, candidates:rec.candidates, reason:rec.reason
        });
      }
      const master = resolveMaster(rec.master_id);
      if (!master.ok) return master;
      return {
        ok:true, visual:true, classification:rec.classification,
        source_label:rec.source_label, master_id:rec.master_id,
        variant_id:rec.variant_id || null, reason:rec.reason || null, master:master
      };
    }

    function validate() {
      const failures = [];
      const ids = new Set(Array.from(assetByMaster.keys()).concat(Array.from(mappingByMaster.keys())));
      ids.forEach(id => { const r=resolveMaster(id); if(!r.ok) failures.push({kind:'MASTER',id,error:r}); });
      recipeById.forEach((_,id) => { const r=resolveRecipe(id); if(!r.ok) failures.push({kind:'RECIPE',id,error:r}); });
      return {
        ok: failures.length===0,
        physical_assets: assetByMaster.size,
        mappings: mappingByMaster.size,
        canonical_masters: ids.size,
        recipes: recipeById.size,
        ingredient_alias_records: aliasByName.size,
        failures: failures
      };
    }

    return Object.freeze({
      resolveMaster, resolveRecipe, resolveIngredient, normalizeIngredient, validate
    });
  }

  root.MealUpFoodObjectResolver = Object.freeze({ create, normalizeIngredient });
})(typeof window !== 'undefined' ? window : globalThis);

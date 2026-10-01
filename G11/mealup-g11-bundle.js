/* MealUp C6.3 G11 classic bundle — generated from frozen modules for single-tester browser compatibility. */
(function(){'use strict';
const __MEALUP_G11_SCRIPT_BASE=new URL('./',document.currentScript.src);

/* source: G5/assets/food-objects/resolver.js @ 95b93280cbc669ea35a7d9372bf2095e9c3d3012 */
(()=>{
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

})();

/* source: G6/surface-profile-resolver.mjs @ 5af1850278c8e7eb9a2773e739bb31c2687d658b */
const __m1=(()=>{
/** G6 pure contract adapter. No DOM, application logic, asset edits or remote I/O. */
const finite=(x,name)=>{if(!Number.isFinite(x)||x<0)throw Error('INVALID_MEASUREMENT:'+name);return x;};
function motionPose(profile,{progress=1,distance=0,reducedMotion=false}={}) {
 if(reducedMotion||profile.motion.kind==='static')return {uniformScale:1,translateY:0,opacity:1,reveal:1,decorativeCover:false,interactive:profile.motion.kind!=='wheel'||distance===0};
 if(profile.motion.kind==='wheel') {
  if(!Number.isFinite(distance)||Math.abs(distance)>1)throw Error('INVALID_WHEEL_DISTANCE');
  const d=Math.abs(distance);return {uniformScale:1-.24*d,translateY:.045*distance,opacity:1-.65*d,reveal:1,decorativeCover:false,interactive:distance===0};
 }
 if(!Number.isFinite(progress)||progress<0||progress>1)throw Error('INVALID_PROGRESS');
 const e=progress*progress*(3-2*progress);
 return {uniformScale:.88+.12*e,translateY:.045*(1-e),opacity:e,reveal:e,decorativeCover:progress<1,interactive:progress===1};
}
function compileSurface(contract,input) {
 const {surfaceId,recipe,template,vessel,gaugeState,hostWidth,fontEm,measurements={},motion={}}=input;
 const p=contract.profiles.find(p=>p.id===surfaceId);if(!p)throw Error('UNKNOWN_SURFACE');
 if(!measurements||!['header','title','metadata','controls'].every(k=>Object.hasOwn(measurements,k)))throw Error('MEASURED_UI_HEIGHTS_REQUIRED');
 if(motion.direction!==undefined&&![1,-1].includes(motion.direction))throw Error('INVALID_SWIPE_DIRECTION');
 if(!recipe?.recipe_id||!template||template.template_key!==recipe.template_key||template.status!=='G5_PASS_FROZEN')throw Error('UNKNOWN_TEMPLATE_OR_GEOMETRY');
 if(!gaugeState||gaugeState.recipe_id!==recipe.recipe_id)throw Error('GAUGE_STATE_MISSING_OR_DIFFERENT_RECIPE');
 if(recipe.layers.filter(l=>l.role==='primary').length!==1)throw Error('PRIMARY_MISSING_OR_AMBIGUOUS');
 if(recipe.resolved_vessel_id!==template.vessel_id)throw Error('VESSEL_TEMPLATE_MISMATCH');
 if(template.vessel_id!=='VESSEL_FREE'&&(!vessel||vessel.vessel_id!==template.vessel_id||vessel.status!=='G5_PASS_FROZEN'))throw Error('VESSEL_GEOMETRY_MISSING');
 for(const layer of recipe.layers) {
  const metric=input.metrics?.[layer.render_source_master_id];if(!metric)throw Error('UNKNOWN_MASTER');
  if(layer.sha256!==metric.sha256)throw Error('NONCANONICAL_SOURCE_HASH');
  const sourceKey=recipe.template_key+'|'+layer.role+'|'+layer.slot_index;
  if(p.projection==='full'&&!contract.validated_slot_sources[sourceKey]?.includes(layer.render_source_master_id))throw Error('UNVALIDATED_SLOT_FOOTPRINT_REQUIRES_G5_QA');
 }
 const W=finite(hostWidth,'width'),em=finite(fontEm,'font');if(!W||!em)throw Error('ZERO_HOST');
 const H=finite(measurements.header??0,'header'),T=finite(measurements.title??2*em,'title'),M=finite(measurements.metadata??1.5*em,'metadata'),C=finite(measurements.controls??0,'controls');
 const gap=p.gap_em*em;const pad=Math.min(gap,W*.04);const usable=W-2*pad;if(usable<3*em)throw Error('HOST_TOO_NARROW_FOR_MANDATORY_GAUGE');
 const desiredArt=Math.min(p.max_art_side_em*em,usable*p.art_width_fraction);
 const splitArt=Math.min(p.max_art_side_em*em,usable*p.split_art_fraction);
 const split=p.layout==='adaptive'&&usable-splitArt-gap>=p.min_text_column_em*em&&splitArt/em>=(p.min_split_art_side_em??0);
 const side=split?splitArt:desiredArt;const art=[split?pad:(W-side)/2,H+gap,side,side];
 const gaugeInline=p.projection==='full'&&side/em>=p.gauge_policy.inline_scene_min_side_em;
 const pose=motionPose(p,motion);const scale=p.scene_settled_uniform_scale*pose.uniformScale;
 const sceneOrigin=[art[0]+(1-scale)*side/2,art[1]+((1-scale)/2+pose.translateY)*side];
 const mapBox=b=>[sceneOrigin[0]+b[0]*side*scale,sceneOrigin[1]+b[1]*side*scale,sceneOrigin[0]+b[2]*side*scale,sceneOrigin[1]+b[3]*side*scale];
 const primary=recipe.layers.find(l=>l.role==='primary');let foods=[],vesselBox=null;
 if(p.projection==='primary') {
  const m=input.metrics[primary.render_source_master_id];if(!m)throw Error('UNKNOWN_MASTER');
  const ar=m.alpha_aspect_ratio;const fw=scale*Math.min(1,ar),fh=scale*Math.min(1,1/ar);const center=[art[0]+side/2,art[1]+side/2];
  foods=[{...primary,projected:true,box:[center[0]-side*fw/2,center[1]-side*fh/2,center[0]+side*fw/2,center[1]+side*fh/2],uniformSceneScale:scale}];
 }else {
  foods=recipe.layers.map(layer=>{const slot=template.slots.find(s=>s.role===layer.role&&s.slot_index===layer.slot_index);if(!slot)throw Error('ROLE_SLOT_MISSING');let b=slot.scene_bbox_envelope;
   if(!b){const m=input.metrics[layer.render_source_master_id];const ar=m.alpha_aspect_ratio;const fw=slot.scale*Math.min(1,ar),fh=slot.scale*Math.min(1,1/ar);b=[slot.anchorX-fw/2,slot.anchorY-fh/2,slot.anchorX+fw/2,slot.anchorY+fh/2];}
   return {...layer,box:mapBox(b),uniformSceneScale:scale};});
  if(vessel){const b=vessel.outer_bbox_norm;const tr=vessel.scene_transform;const w=tr.source_canvas_width_scene,h=tr.source_canvas_height_scene,o=tr.source_origin_scene;vesselBox=mapBox([o[0]+b[0]*w,o[1]+b[1]*h,o[0]+b[2]*w,o[1]+b[3]*h]);}
 }
 const textX=split?art[0]+side+gap:pad;const textW=split?W-pad-textX:usable;const textY=split?H+gap:art[1]+side+gap;
 const title=[textX,textY,textW,T];const metadata=[textX,textY+T+gap,textW,M];let gaugeBox;
 if(gaugeInline)gaugeBox=mapBox([.685,.065,.955,.335]);
 else {const gs=Math.min(3*em,textW);gaugeBox=[textX,metadata[1]+M+gap,textX+gs,metadata[1]+M+gap+gs];}
 const rowBottom=Math.max(art[1]+side,metadata[1]+M,gaugeBox[3]);const controls=[pad,rowBottom+gap,usable,C];const hostHeight=(C?controls[1]+C:rowBottom)+gap;
 const uiBoxes=[{id:'header_search_filters_history',rect:[pad,0,usable,H]},{id:'recipe_title_or_kitchen_step',rect:title},{id:'nutrition_metadata',rect:metadata},...(C?[{id:'critical_controls_timer_actions',rect:controls}]:[])];
 const normalizedRect=r=>[r[0]/W,r[1]/hostHeight,r[2]/W,r[3]/hostHeight];
 return {profileId:p.id,recipeId:recipe.recipe_id,bindingKey:recipe.recipe_id+'|'+recipe.template_key,projection:p.projection,layout:split?'split':'stack',host:{width:W,height:hostHeight},artRect:art,artRectNorm:normalizedRect(art),scene:{origin:sceneOrigin,uniformScale:side*scale,maskTransform:'SAME_AFFINE_AS_FOOD_AND_VESSEL',vesselBox},foodLayers:foods,gauge:{state:gaugeState,recipeId:recipe.recipe_id,box:gaugeBox,placement:gaugeInline?'G5_INLINE_RESERVATION':'SEPARATE_FLOW_DOCK',opacity:gaugeInline?pose.opacity:1,zIndex:800,independent:true},uiBoxes,uiBoxesNorm:uiBoxes.map(b=>({id:b.id,rect:normalizedRect(b.rect)})),motion:{...pose,decorativeCoverRect:pose.decorativeCover?[art[0],art[1]+side*pose.reveal,side,side*(1-pose.reveal)]:null,decorativeCoverZIndex:900},interaction:{pointerEventsOnArt:'none',interactive:pose.interactive,neighbourInert:p.motion.kind==='wheel'&&!pose.interactive,cardProgress:p.motion.kind==='book'?(motion.reducedMotion?1:motion.progress??1):null,cardTranslateX:p.motion.kind==='book'&&!motion.reducedMotion?(motion.direction===-1?-1:1)*(1-(motion.progress??1))*W:0},deferred:['G7 actual GaugeState validation and state animation','G8 renderer wiring','G9 actual DOM/font/hit-target/occlusion QA']};
}

function compileWheelCollection(contract,{instances,viewportWidth,viewportHeight,fontEm,metrics,reducedMotion=false}) {
 if(!Array.isArray(instances)||instances.length!==3||new Set(instances.map(i=>i.recipe?.recipe_id)).size!==3)throw Error('WHEEL_REQUIRES_THREE_DISTINCT_RECIPES');
 if(!Number.isFinite(viewportHeight)||viewportHeight<=0)throw Error('INVALID_SAFE_VIEWPORT');
 const make=(instance,surfaceId,distance)=>compileSurface(contract,{...instance,surfaceId,hostWidth:viewportWidth,fontEm,metrics,motion:{distance,reducedMotion}});
 const full=instances.map((i,n)=>make(i,'RECIPE_WHEEL',n-1));const center=full[1],gap=.75*fontEm;
 if(reducedMotion||center.host.height+4*fontEm>viewportHeight) return {mode:'STANDARD_LIST',reason:reducedMotion?'REDUCED_MOTION':'CENTRAL_CARD_AND_PEEKS_DO_NOT_FIT',instances:instances.map(i=>make(i,'RECIPE_LIST',0)),registeredViewportClip:false};
 const centerY=(viewportHeight-center.host.height)/2,positions=[];
 positions[1]={index:1,x:0,y:centerY,scale:1,opacity:1,interactive:true,compiled:center};
 const upperH=full[0].host.height*.76,lowerH=full[2].host.height*.76;
 positions[0]={index:0,x:viewportWidth*.12,y:centerY-gap-upperH,scale:.76,opacity:.35,interactive:false,inert:true,compiled:full[0]};
 positions[2]={index:2,x:viewportWidth*.12,y:centerY+center.host.height+gap,scale:.76,opacity:.35,interactive:false,inert:true,compiled:full[2]};
 if(positions[0].y+upperH<=0||positions[2].y>=viewportHeight)return {mode:'STANDARD_LIST',reason:'NEIGHBOUR_PEEKS_DO_NOT_FIT',instances:instances.map(i=>make(i,'RECIPE_LIST',0)),registeredViewportClip:false};
 return {mode:'WHEEL_THREE',safeViewport:{width:viewportWidth,height:viewportHeight},instances:positions,registeredViewportClip:true,centralCardFullyVisible:true};
}

return {motionPose,compileSurface,compileWheelCollection};
})();
const {motionPose,compileSurface,compileWheelCollection}=__m1;

/* source: G7_Completed/gauge-calibration.mjs @ 7c0a82c1c1efdf7500f1e981b01d177885623157 */
const __m2=(()=>{
const CALIBRATION=Object.freeze({id:'MEALUP_GAUGE_KCAL_0_800_V2',minKcal:0,maxKcal:800,minAngle:-70,maxAngle:70,neutral:'UP',rotation:'CLOCKWISE_DEGREES',overflow:'CLAMP_NEEDLE_KEEP_REAL_VALUE',unknown:'HIDE_NEEDLE_KEEP_UNKNOWN_TEXT',nutritionJudgement:false});
function kcalToAngle(kcal){if(!Number.isFinite(kcal)||kcal<0)throw Error('INVALID_KCAL');return -70+140*Math.min(kcal,800)/800;}

return {CALIBRATION,kcalToAngle};
})();
const {CALIBRATION,kcalToAngle}=__m2;

/* source: G7_Completed/gauge-state.mjs @ 44571769d08f1e4373444fefb731587e1a172a5c */
const __m3=(()=>{

/** G7 reconstructed canonical data component. No DOM, drawing, asset mutation or app side effects. */
const fail=code=>{throw Error(code);};
const text=(x,n)=>typeof x==='string'&&x.trim()?x:fail('INVALID_'+n);
const integer=(x,n,min=0)=>Number.isSafeInteger(x)&&x>=min?x:fail('INVALID_'+n);
function createGaugeState(input) {
 if(!input||typeof input!=='object')fail('S4_GAUGE_STATE_MISSING');
 const recipe_id=text(input.recipe_id,'RECIPE_ID'),context_id=text(input.context_id,'CONTEXT_ID');
 const revision=integer(input.revision,'REVISION');
 const source=text(input.source,'NUTRITION_SOURCE'),portion_ref=text(input.portion_ref,'PORTION_REF');
 const cook_people=integer(input.cook_people,'COOK_PEOPLE',1);
 if(input.kcal_value!==null&&(!Number.isFinite(input.kcal_value)||input.kcal_value<0||input.kcal_value>Number.MAX_SAFE_INTEGER))fail('INVALID_KCAL');
 // Value is resolved by the EXISTING app nutrition/portion functions. Never guess basis.
 const known=input.kcal_value!==null;
 return Object.freeze({schema:'MEALUP_GAUGE_STATE/2',recipe_id,context_id,revision,source,portion_ref,cook_people,
  kcal_value:input.kcal_value,display_kcal:known?Math.round(input.kcal_value):null,
  accessible_text:known?Math.round(input.kcal_value)+' kcal · porzione corrente':'Calorie non disponibili',
  nutrition_status:known?'KNOWN':'UNKNOWN',needle_angle:known?kcalToAngle(Math.round(input.kcal_value)):null,
  visual_status:'READY_CANONICAL_V2'});
}
function validateGaugeState(state,binding) {
 const rebuilt=createGaugeState(state);
 if(!binding||state.recipe_id!==binding.recipe_id||state.context_id!==binding.context_id)fail('S4_WRONG_RECIPE_OR_CONTEXT');
 if(state.schema!==rebuilt.schema||state.display_kcal!==rebuilt.display_kcal||state.accessible_text!==rebuilt.accessible_text||state.nutrition_status!==rebuilt.nutrition_status||state.needle_angle!==rebuilt.needle_angle||state.visual_status!==rebuilt.visual_status)fail('S4_INCONSISTENT_STATE');
 if(binding.revision!==undefined&&state.revision!==binding.revision)fail('S4_STALE_REVISION');
 return rebuilt;
}
function createGaugeStore() {
 const states=new Map();const key=b=>JSON.stringify([text(b.recipe_id,'RECIPE_ID'),text(b.context_id,'CONTEXT_ID')]);
 return Object.freeze({
  publish(input){const next=createGaugeState(input),k=key(next),old=states.get(k);if(old&&next.revision<=old.revision)fail('STALE_OR_DUPLICATE_REVISION');states.set(k,next);return next;},
  snapshot(binding){const state=states.get(key(binding));if(!state)fail('S4_GAUGE_STATE_MISSING');return validateGaugeState(state,binding);}
 });
}

return {createGaugeState,validateGaugeState,createGaugeStore};
})();
const {createGaugeState,validateGaugeState,createGaugeStore}=__m3;

/* source: G7_Completed/gauge-spec.mjs @ fc1320feaf0d798c56f3ebdf565c429c3dea94d1 */
const __m4=(()=>{
const deepFreeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')deepFreeze(v);return Object.freeze(o);};
const GAUGE_SPEC=deepFreeze({"schema": "MealUp_G7_GaugeContract/2", "assets": {"shell": {"path": "assets/MEALUP_GAUGE_SHELL_v2.png", "sha256": "db1594636552cf59c809ac33fce20420085d18cd9414d512106806796de28317", "width": 1536, "height": 1024, "alpha_bbox": [0, 0, 1518, 1024], "transparent": true, "source": "BUILT_IN_IMAGEGEN_RECONSTRUCTION_AUTHORIZED_EXCEPTION", "original_pixels_preserved_after_generation": true}, "needle": {"path": "assets/MEALUP_GAUGE_NEEDLE_v2.png", "sha256": "2889c201eb71fe9d7ddda523fd0a86e9183eda526e486261a89aaf2b8d305183", "width": 1145, "height": 1374, "alpha_bbox": [402, 72, 988, 1332], "transparent": true, "source": "BUILT_IN_IMAGEGEN_RECONSTRUCTION_AUTHORIZED_EXCEPTION", "original_pixels_preserved_after_generation": true}}, "geometry": {"frame": "UNIT_SQUARE", "shell_rect": [0, 0.16666666666666666, 1, 0.6666666666666666], "pivot": [0.4856770833333333, 0.5911458333333334], "needle_source_pivot_px": [572, 1045], "needle_px_to_unit": 0.0003346475856697819, "needle_neutral_angle": 0, "value_rect": [0.285, 0.645, 0.36, 0.075], "value_alignment": "CENTER", "value_min_font_em": 0.875, "compact_value": "EXISTING_MEASURED_METADATA_FLOW", "font": "Satoshi inherited from host", "uniform_scale_only": true, "shell_pixel_edit_at_runtime": false, "unit_min_font_em": 0.625}, "calibration": {"id": "MEALUP_GAUGE_KCAL_0_800_V2", "type": "LINEAR_MONOTONIC", "points": [{"kcal": 0, "angle": -70.0}, {"kcal": 120, "angle": -49.0}, {"kcal": 200, "angle": -35.0}, {"kcal": 280, "angle": -21.0}, {"kcal": 380, "angle": -3.5}, {"kcal": 400, "angle": 0.0}, {"kcal": 450, "angle": 8.75}, {"kcal": 600, "angle": 35.0}, {"kcal": 650, "angle": 43.75}, {"kcal": 800, "angle": 70.0}], "range": [0, 800], "angles": [-70, 70], "overflow": "CLAMP_NEEDLE_KEEP_REAL_VALUE", "unknown": "NEEDLE_HIDDEN; visible unknown label", "angle_input": "rounded display kcal, same snapshot as number", "nutrition_judgement": false, "source": "New operational calibration under authorized exception, not inferred from the illustrative G0 values"}});

return {GAUGE_SPEC};
})();
const {GAUGE_SPEC}=__m4;

/* source: G7_Completed/gauge-renderer.mjs @ f67286a3af5e51d99bed37d9baf587fffe79b06d */
const __m5=(()=>{


const error=s=>{throw Error(s);};
function needleBounds(c,angle){
 const g=c.geometry,a=c.assets.needle.alpha_bbox,[px,py]=g.needle_source_pivot_px,s=g.needle_px_to_unit,[cx,cy]=g.pivot,t=angle*Math.PI/180;
 const points=[[a[0],a[1]],[a[2],a[1]],[a[2],a[3]],[a[0],a[3]]].map(([x,y])=>{x=(x-px)*s;y=(y-py)*s;return [cx+x*Math.cos(t)-y*Math.sin(t),cy+x*Math.sin(t)+y*Math.cos(t)];});
 return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
function needleSweptBounds(c){
 const g=c.geometry,a=c.assets.needle.alpha_bbox,[px,py]=g.needle_source_pivot_px,s=g.needle_px_to_unit,[cx,cy]=g.pivot,lo=-70*Math.PI/180,hi=70*Math.PI/180,points=[];
 for(const [x,y] of [[a[0],a[1]],[a[2],a[1]],[a[2],a[3]],[a[0],a[3]]]){
  const dx=(x-px)*s,dy=(y-py)*s,angles=[lo,hi];
  for(const base of [Math.atan2(-dy,dx),Math.atan2(dx,dy)])for(let k=-2;k<=2;k++){const t=base+k*Math.PI;if(t>=lo&&t<=hi)angles.push(t);}
  for(const t of angles)points.push([cx+dx*Math.cos(t)-dy*Math.sin(t),cy+dx*Math.sin(t)+dy*Math.cos(t)]);
 }
 return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
function compileGauge(c,{state,binding,box,fontEm,metadataRect,measureText}){
 state=validateGaugeState(state,binding);
 for(const field of ['assets','geometry','calibration'])if(JSON.stringify(c[field])!==JSON.stringify(GAUGE_SPEC[field]))error('S6_NONCANONICAL_GAUGE_'+field.toUpperCase());
 if(c.schema!=='MealUp_G7_GaugeContract/2'||c.calibration.id!=='MEALUP_GAUGE_KCAL_0_800_V2'||!c.authorization.G0_exception)error('S5_UNAPPROVED_GAUGE_CONTRACT');
 if(!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite)||box[2]<=box[0]||Math.abs((box[2]-box[0])-(box[3]-box[1]))>1e-6)error('S6_SQUARE_GAUGE_BOUNDS_REQUIRED');
 if(!Number.isFinite(fontEm)||fontEm<=0||typeof measureText!=='function')error('S6_FONT_METRICS_REQUIRED');
 const side=box[2]-box[0],g=c.geometry,known=state.kcal_value!==null;const number=known?String(state.display_kcal):'—';const label=known?'kcal':'kcal n.d.';
 const fontPx=Math.max(g.value_min_font_em*fontEm,side*.06),numberWidth=measureText(number,fontPx),vr=g.value_rect;
 const labelFontPx=Math.max(g.unit_min_font_em*fontEm,fontPx*.55);
 const internal=known&&numberWidth<=vr[2]*side&&fontPx*1.2<=vr[3]*side&&labelFontPx*1.2<=.05*side;
 let value;
 if(internal)value={placement:'IN_BODY',text:number,label,fontPx,labelFontPx,numberRect:[box[0]+vr[0]*side,box[1]+vr[1]*side,vr[2]*side,vr[3]*side],labelRect:[box[0]+vr[0]*side,box[1]+(vr[1]+vr[3]+.005)*side,vr[2]*side,.05*side]};
 else {
  const minFont=g.value_min_font_em*fontEm,text=known?number+' kcal':label;
  if(!Array.isArray(metadataRect)||metadataRect.length!==4||!metadataRect.every(Number.isFinite)||metadataRect[2]<=0||metadataRect[3]<minFont*1.2)error('S7_METADATA_SPACE_FOR_GAUGE_VALUE_REQUIRED');
  const lines=[];let line='';for(const word of text.split(' ')){if(measureText(word,minFont)>metadataRect[2])error('S7_GAUGE_VALUE_CANNOT_FIT_MEASURED_METADATA');const candidate=line?line+' '+word:word;if(line&&measureText(candidate,minFont)>metadataRect[2]){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);
  const requiredMetadataHeight=lines.length*minFont*1.2;if(metadataRect[3]+1e-7<requiredMetadataHeight)throw Object.assign(new Error('S7_GAUGE_VALUE_REQUIRES_MEASURED_REFLOW'),{requiredMetadataHeight});
  value={placement:'EXISTING_METADATA_FLOW',text,lines,label:null,fontPx:minFont,lineHeight:minFont*1.2,numberRect:[...metadataRect],labelRect:null};
 }
 const swept=known?needleBounds(c,state.needle_angle):null;if(swept&&swept.some((v,i)=>i<2?v<0:v>1))error('S6_NEEDLE_OUTSIDE_RESERVED_GAUGE');
 return {recipe_id:state.recipe_id,context_id:state.context_id,revision:state.revision,state,box:[...box],side,assets:c.assets,geometry:g,needle:{visible:known,angle:state.needle_angle,boundsUnit:swept},value,accessible_text:state.accessible_text,independent:true,update:'IMMEDIATE_ATOMIC',reducedMotion:'SAME_IMMEDIATE_ATOMIC',shell_mutated:false};
}
function drawGauge(ctx,plan,images,fontFamily='Satoshi'){
 for(const role of ['shell','needle']){const v=images[role];if(!v||v.sha256!==plan.assets[role].sha256||v.image.width!==plan.assets[role].width||v.image.height!==plan.assets[role].height)error('S1_CANONICAL_GAUGE_ASSET_MISMATCH');}
 const [x,y]=plan.box,s=plan.side,g=plan.geometry;ctx.save();ctx.translate(x,y);ctx.scale(s,s);const sr=g.shell_rect;ctx.drawImage(images.shell.image,sr[0],sr[1],sr[2],sr[3]);
 if(plan.needle.visible){ctx.save();ctx.translate(...g.pivot);ctx.rotate(plan.needle.angle*Math.PI/180);ctx.scale(g.needle_px_to_unit,g.needle_px_to_unit);ctx.translate(-g.needle_source_pivot_px[0],-g.needle_source_pivot_px[1]);ctx.drawImage(images.needle.image,0,0);ctx.restore();}ctx.restore();
 const v=plan.value;if(v.placement==='IN_BODY'){ctx.save();ctx.fillStyle='#292825';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+v.fontPx+'px '+fontFamily;const r=v.numberRect;ctx.fillText(v.text,r[0]+r[2]/2,r[1]+r[3]/2);ctx.font='600 '+v.labelFontPx+'px '+fontFamily;const l=v.labelRect;ctx.fillText(v.label,l[0]+l[2]/2,l[1]+l[3]/2);ctx.restore();}
 return plan.value; // External value is committed with the same state by the host metadata flow.
}
async function loadBrowserAssets(contract,baseURL){
 const out={};for(const role of ['shell','needle']){const a=contract.assets[role];const response=await fetch(new URL(a.path,baseURL));if(!response.ok)error('S1_GAUGE_ASSET_LOAD_FAILED');const bytes=await response.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);const sha256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');if(sha256!==a.sha256)error('S1_CANONICAL_GAUGE_ASSET_MISMATCH');const image=await createImageBitmap(new Blob([bytes],{type:'image/png'}));out[role]={image,sha256};}return out;
}

return {needleBounds,needleSweptBounds,compileGauge,drawGauge,loadBrowserAssets};
})();
const {needleBounds,needleSweptBounds,compileGauge,drawGauge,loadBrowserAssets}=__m5;

/* source: G8/expected-inputs.mjs @ 2cfa8149ef1491085d70f3e8302011756bf7dae5 */
const __m6=(()=>{
const EXPECTED_INPUTS=Object.freeze({"catalog": {"path": "../G5/assets/food-objects/catalog.json", "sha256": "7a1130f8788e232f41b2d82e55bb7f805c6eb1e3ae0d5b518bd46ffa0f842699"}, "mappings": {"path": "../G5/assets/food-objects/mappings.json", "sha256": "cb37e68057f5b2b52c896e5d46d22b311b3981c0709b024e98d8154d195d1cdb"}, "aliases": {"path": "../G5/assets/food-objects/ingredient-aliases.json", "sha256": "38956c69425ec3d8f66ab2aaa1a139e3dc5eae20bbee58c4eba2942d646d1e1c"}, "matrix": {"path": "composition-matrix.json", "sha256": "c660c39aee281f7ae516dde8ebfdf38b7fd67852437f32ce0173a66900f5a239"}, "recipes": {"path": "../G5/recipe-geometry.v2.corrected.json", "sha256": "02e0fdd7ec1490a329eab73755f6c882995708e2cddcec712d2a92623f192ad6"}, "templates": {"path": "../G5/templates.json", "sha256": "bf6eafa12984fcdf1d1587cb7c63a8ac8a3ae30b6033325d74998d9444feef48"}, "vessels": {"path": "../G5/vessel-geometry.json", "sha256": "8d767229a4772141b55fc50c6514d540a52b8040fc46111b066d72218fe9722c"}, "metrics": {"path": "../G6/asset-reference-metrics.json", "sha256": "76957a0291fac402394e70b058d34b2fdacc509710db476a6eb3c4aef6ec9be0"}, "surface": {"path": "../G6/surface-profile-contract.json", "sha256": "fbe054ceaa5ef1b45a74699b290882cedfe387d9e2e67795c51b5641b60e26c9"}, "gauge": {"path": "../G7_Completed/gauge-contract.json", "sha256": "25696322f865c686f52f64fc0db00e33a723c4276391a504c2305f3e3f362854"}, "geometry": {"path": "../G5/geometry-contract-G4-v1.1.json", "sha256": "51d4e4ae42a215a2ae9431134ed6ac3edcbcbd6f5d565c5d20da6cd36a600a7d"}});

return {EXPECTED_INPUTS};
})();
const {EXPECTED_INPUTS}=__m6;

/* source: G8/verified-kit.mjs @ 7cf7ee3be196f94325c0b4963151e4f246454242 */
const __m7=(()=>{

async function loadVerifiedKit({readBytes,sha256}){
 const kit={};for(const [key,expected] of Object.entries(EXPECTED_INPUTS)){const bytes=await readBytes(expected.path);if(await sha256(bytes)!==expected.sha256)throw Error('S1_NONCANONICAL_INPUT:'+key);kit[key]=JSON.parse(new TextDecoder().decode(bytes));}
 kit.vessel_board_sha256='3318fbf8a718438520b12e9d8d28d88374a46041fc94b3efac1f23b38a50d5c8';return kit;
}

return {loadVerifiedKit};
})();
const {loadVerifiedKit}=__m7;

/* source: G8/recipe-scene.mjs @ 4d0e90872861a3db06a6fc604fb3144418ff0c0f */
const __m8=(()=>{




const stop=code=>{throw Error(code);};
function createSceneCompiler(kit){
 const resolver=globalThis.MealUpFoodObjectResolver.create({catalog:kit.catalog,mappings:kit.mappings,matrix:kit.matrix,aliases:kit.aliases});
 if(!resolver.validate().ok)stop('S2_RESOLVER_INVALID');
 const recipes=new Map(kit.recipes.recipes.map(r=>[r.recipe_id,r])),templates=new Map(kit.templates.templates.map(t=>[t.template_key,t])),vessels=new Map(kit.vessels.vessels.map(v=>[v.vessel_id,v]));
 const metrics=Object.fromEntries(kit.metrics.assets.map(a=>[a.master_id,a]));
 return Object.freeze({
  compile(input){
   const recipe=recipes.get(input.recipe_id);if(!recipe)stop('S3_RECIPE_COMPOSITION_MISSING');const logical=resolver.resolveRecipe(input.recipe_id);if(!logical.ok)stop('S2_MASTER_NOT_RESOLVED');const correction=kit.geometry.recipe_corrections?.[input.recipe_id];let resolvedVessel=logical.vessel_id;if(correction){if(correction.field!=='vessel_id'||correction.from!==logical.vessel_id)stop('S3_INVALID_FROZEN_CORRECTION');resolvedVessel=correction.to;}if(logical.composition_id!==recipe.composition_id||resolvedVessel!==recipe.resolved_vessel_id)stop('S3_COMPOSITION_PARITY_MISMATCH');
   for(const layer of recipe.layers){const row=logical.logical_layers.find(x=>x.role===layer.role&&x.slot_index===layer.matrix_slot_index);if(!row||row.master_id!==layer.logical_master_id)stop('S3_LOGICAL_RENDER_LAYER_MISMATCH');if(!layer.transform?.uniform_scale||layer.transform.mirror||layer.transform.crop||layer.transform.filter||layer.rotation_deg!==0)stop('S6_NONCANONICAL_FOOD_TRANSFORM');}
   const state=validateGaugeState(input.gaugeState,{recipe_id:input.recipe_id,context_id:input.context_id,revision:input.revision});
   const vessel=vessels.get(recipe.resolved_vessel_id),template=templates.get(recipe.template_key);
   const surface=compileSurface(kit.surface,{...input,recipe,template,vessel,gaugeState:state,metrics,surfaceId:input.surfaceId});
   const gauge=compileGauge(kit.gauge,{state,binding:state,box:surface.gauge.box,fontEm:input.fontEm,metadataRect:surface.uiBoxes.find(u=>u.id==='nutrition_metadata').rect,measureText:input.measureText});
   if(vessel&&(!vessel.outer_boundary_norm?.length||!vessel.food_clip_mask_or_equivalent_geometry?.sha256||!vessel.front_occluder_mask_or_equivalent_geometry?.sha256))stop('S6_VESSEL_MASKS_UNDEFINED');
   return {recipe_id:input.recipe_id,context_id:input.context_id,revision:input.revision,surface,gauge,vessel:surface.projection==='full'?vessel:null,metrics,logical,source_board:{path:'references/VESSEL_LIBRARY_reference.png',sha256:kit.vessel_board_sha256},canonical_food_layers:surface.foodLayers,required_state:state};
  }
 });
}
function requiredAssets(plan){
 const req=plan.canonical_food_layers.map(l=>({key:l.asset_file,path:'../'+l.asset_file,sha256:l.sha256}));
 if(plan.vessel){req.push({key:'vessel-board',path:'../G5/'+plan.source_board.path,sha256:plan.source_board.sha256});for(const role of ['food_clip_mask_or_equivalent_geometry','front_occluder_mask_or_equivalent_geometry']){const a=plan.vessel[role];req.push({key:a.file,path:'../G5/'+a.file,sha256:a.sha256,mask:true});}}
 for(const role of ['shell','needle']){const a=plan.gauge.assets[role];req.push({key:'gauge-'+role,path:'../G7_Completed/'+a.path,sha256:a.sha256});}
 return [...new Map(req.map(a=>[a.key,a])).values()];
}
function verified(assets,key,sha){const value=assets[key];if(!value||value.sha256!==sha||!value.image)stop('S1_CANONICAL_ASSET_MISSING_OR_MISMATCH');return value;}
function pathPolygon(ctx,points,x,y,w,h){ctx.beginPath();points.forEach(([px,py],i)=>{if(i)ctx.lineTo(x+px*w,y+py*h);else ctx.moveTo(x+px*w,y+py*h);});ctx.closePath();}
function renderRecipeScene(ctx,plan,assets,{createCanvas,fontFamily='Satoshi'}={}){
 if(typeof createCanvas!=='function')stop('S6_CANVAS_FACTORY_REQUIRED');const s=plan.surface,{width:W,height:H}=s.host;
 const art=createCanvas(Math.ceil(W),Math.ceil(H)),a=art.getContext('2d');a.save();a.beginPath();a.rect(...s.artRect);a.clip();a.globalAlpha=1;
 let vesselDst;
 if(plan.vessel){const v=plan.vessel,tr=v.scene_transform,scale=s.scene.uniformScale;vesselDst=[s.scene.origin[0]+tr.source_origin_scene[0]*scale,s.scene.origin[1]+tr.source_origin_scene[1]*scale,tr.source_canvas_width_scene*scale,tr.source_canvas_height_scene*scale];const board=verified(assets,'vessel-board',plan.source_board.sha256).image;
  const [sx,sy,ex,ey]=v.source_rect_norm,src=[sx*board.width,sy*board.height,(ex-sx)*board.width,(ey-sy)*board.height];
  a.save();pathPolygon(a,v.outer_boundary_norm,...vesselDst);a.clip();a.drawImage(board,...src,...vesselDst);a.restore();
 }
 const food=createCanvas(Math.ceil(W),Math.ceil(H)),f=food.getContext('2d');
 for(const layer of [...plan.canonical_food_layers].sort((a,b)=>a.z_index-b.z_index)){
  const image=verified(assets,layer.asset_file,layer.sha256).image;
  if(image.width!==512||image.height!==512)stop('S1_NONCANONICAL_FOOD_DIMENSIONS');
  if(s.projection==='primary'){const bb=plan.metrics[layer.render_source_master_id].alpha_bbox_px,b=layer.box,scale=Math.min((b[2]-b[0])/(bb[2]-bb[0]),(b[3]-b[1])/(bb[3]-bb[1])),x=(b[0]+b[2])/2-(bb[0]+bb[2])*scale/2,y=(b[1]+b[3])/2-(bb[1]+bb[3])*scale/2;f.drawImage(image,x,y,512*scale,512*scale);}
  else {const t=layer.transform,size=t.raw_image_side_scene*s.scene.uniformScale,x=s.scene.origin[0]+t.raw_image_center_scene[0]*s.scene.uniformScale-size/2,y=s.scene.origin[1]+t.raw_image_center_scene[1]*s.scene.uniformScale-size/2;f.drawImage(image,x,y,size,size);}
 }
 if(plan.vessel&&s.projection==='full'){const mask=plan.vessel.food_clip_mask_or_equivalent_geometry;const alpha=verified(assets,mask.file,mask.sha256).alphaMask;if(!alpha)stop('S6_LUMINANCE_MASK_ALPHA_ADAPTER_REQUIRED');f.globalCompositeOperation='destination-in';f.drawImage(alpha,...vesselDst);f.globalCompositeOperation='source-over';}
 a.drawImage(food,0,0);
 if(plan.vessel&&s.projection==='full'){const v=plan.vessel,mask=v.front_occluder_mask_or_equivalent_geometry,alpha=verified(assets,mask.file,mask.sha256).alphaMask;if(!alpha)stop('S6_FRONT_OCCLUDER_MISSING');const front=createCanvas(Math.ceil(W),Math.ceil(H)),fc=front.getContext('2d'),board=verified(assets,'vessel-board',plan.source_board.sha256).image,[sx,sy,ex,ey]=v.source_rect_norm;fc.save();pathPolygon(fc,v.outer_boundary_norm,...vesselDst);fc.clip();fc.drawImage(board,sx*board.width,sy*board.height,(ex-sx)*board.width,(ey-sy)*board.height,...vesselDst);fc.restore();fc.globalCompositeOperation='destination-in';fc.drawImage(alpha,...vesselDst);a.drawImage(front,0,0);}
 a.restore();ctx.save();ctx.globalAlpha=s.motion.opacity;ctx.drawImage(art,0,0);ctx.restore();
 // Gauge independently follows registered inline/flow opacity; it is never baked into food.
 ctx.save();ctx.globalAlpha=s.gauge.opacity;drawGauge(ctx,plan.gauge,{shell:verified(assets,'gauge-shell',plan.gauge.assets.shell.sha256),needle:verified(assets,'gauge-needle',plan.gauge.assets.needle.sha256)},fontFamily);ctx.restore();
 if(s.motion.decorativeCoverRect){ctx.save();ctx.fillStyle='#fff8e9';ctx.fillRect(...s.motion.decorativeCoverRect);ctx.restore();}
 return {gaugeValue:plan.gauge.value,accessibleText:plan.gauge.accessible_text,interaction:s.interaction,host:s.host};
}
function luminanceMaskToAlpha(image,{createCanvas}){const mask=createCanvas(image.width,image.height),ctx=mask.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i+3]=pixels.data[i];pixels.data[i]=255;pixels.data[i+1]=255;pixels.data[i+2]=255;}ctx.putImageData(pixels,0,0);return mask;}

return {createSceneCompiler,requiredAssets,renderRecipeScene,luminanceMaskToAlpha};
})();
const {createSceneCompiler,requiredAssets,renderRecipeScene,luminanceMaskToAlpha}=__m8;

/* source: G11/g11-app-rollout-candidate.mjs @ fe5f56b2f7d2c38099fb3a39fcfb0a267d43cb7e */
const __m9=(()=>{




const G11_ROLLOUT_ORDER=Object.freeze([
  'RECIPE_DETAIL','TITLE_MICRO','SEARCH_CARD','RECIPE_CARD','RECIPE_LIST','RECIPE_WHEEL','HOME_DIMMI_TU','KITCHEN_MODE'
]);
const G11_BINDINGS=Object.freeze({
  RECIPE_DETAIL:{selector:'#modal-detail.active #detail-body',recipe:'captured detail data-val'},
  TITLE_MICRO:{selector:'#modal-detail.active #detail-body h2',recipe:'same detail binding'},
  SEARCH_CARD:{selector:'#recipe-list .scheda[data-val]',recipe:'element data-val'},
  RECIPE_CARD:{selector:'.pagina .scheda[data-val]',recipe:'element data-val'},
  RECIPE_LIST:{selector:'.cards-list .scheda[data-val], .storico[data-rid]',recipe:'element recipe binding'},
  RECIPE_WHEEL:{selector:'G11 wheel host derived from three current recipe bindings',recipe:'three distinct recipe ids'},
  HOME_DIMMI_TU:{selector:'.pagina .sugg[data-act="detail"][data-val]',recipe:'element data-val'},
  KITCHEN_MODE:{selector:'#cook-mode:not([hidden])',recipe:'captured cook-open data-val'}
});
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
async function createG11Runtime({fontFamily='Satoshi'}={}){
 await document.fonts.ready;if(!document.fonts.check(`700 16px ${fontFamily}`))throw Error('G11_S6_FONT_NOT_LOADED');
 const readBytes=async path=>{
  if(path==='../G5/recipe-geometry.v2.corrected.json'){
   const files=["transport/recipe-geometry-v2.part01.txt","transport/recipe-geometry-v2.part02.txt","transport/recipe-geometry-v2.part03.txt","transport/recipe-geometry-v2.part04.txt","transport/recipe-geometry-v2.part05.txt","transport/recipe-geometry-v2.part06.txt","transport/recipe-geometry-v2.part07.txt","transport/recipe-geometry-v2.part08.txt","transport/recipe-geometry-v2.part09.txt","transport/recipe-geometry-v2.part10.txt","transport/recipe-geometry-v2.part11.txt","transport/recipe-geometry-v2.part12.txt"];
   const chunks=[];
   for(const file of files){
    const shardBase='https://raw.githubusercontent.com/battagliafilippo/MealUp/97a71f11c0b3d324c75509c89696b413ee963d40/G11/';
    const r=await fetch(new URL(file,shardBase),{cache:'no-store'});
    if(!r.ok)throw Error('G11_S1_FETCH_RECIPE_GEOMETRY_V2_SHARD');
    chunks.push(await r.text());
   }
   return new TextEncoder().encode(chunks.join(''));
  }
  const assetURL=new URL(path,'https://raw.githubusercontent.com/battagliafilippo/MealUp/97a71f11c0b3d324c75509c89696b413ee963d40/');
  const r=await fetch(assetURL);
  if(!r.ok)throw Error('G11_S1_FETCH');
  return new Uint8Array(await r.arrayBuffer());
 };
 const kit=await loadVerifiedKit({readBytes,sha256:digest}),compiler=createSceneCompiler(kit),cache=new Map(),versions=new WeakMap();
async function assetsFor(plan){const out={};for(const a of requiredAssets(plan)){if(!cache.has(a.key)){const bytes=await readBytes(a.path);if(await digest(bytes)!==a.sha256)throw Error('G11_S1_HASH');const image=await createImageBitmap(new Blob([bytes],{type:'image/png'}));cache.set(a.key,{image,sha256:a.sha256,...(a.mask?{alphaMask:luminanceMaskToAlpha(image,{createCanvas:canvas})}:{})});}out[a.key]=cache.get(a.key);}return out;}
 async function render({surfaceEl,artHost,valueHost,recipe_id,surfaceId,kcal_value,context_id='g11-app',revision=0,cook_people=1,hostWidth,fontEm=19.52,measurements,motion={}}){
  if(!G11_ROLLOUT_ORDER.includes(surfaceId))throw Error('G11_UNKNOWN_SURFACE');if(!surfaceEl||!artHost||!valueHost)throw Error('G11_HOSTS_REQUIRED');
  const token=(versions.get(surfaceEl)||0)+1;versions.set(surfaceEl,token);const state=createGaugeState({recipe_id,context_id,revision,kcal_value,source:'EXISTING_APP_VALUE',portion_ref:'standard',cook_people});
  const mc=canvas(1,1).getContext('2d'),measureText=(t,px)=>{mc.font=`700 ${px}px ${fontFamily}`;return mc.measureText(t).width;};
  const plan=compiler.compile({recipe_id,context_id,revision,surfaceId,hostWidth,fontEm,measurements,gaugeState:state,motion,measureText});const assets=await assetsFor(plan);if(versions.get(surfaceEl)!==token)return {mode:'SUPERSEDED'};
  const c=canvas(Math.ceil(plan.surface.host.width),Math.ceil(plan.surface.host.height)),result=renderRecipeScene(c.getContext('2d'),plan,assets,{createCanvas:canvas,fontFamily});c.style.pointerEvents='none';c.setAttribute('role','img');c.setAttribute('aria-label',result.accessibleText);
  const v=document.createElement('span');v.textContent=result.gaugeValue.placement==='EXISTING_METADATA_FLOW'?result.gaugeValue.lines.join('\n'):'';v.setAttribute('aria-hidden','true');v.style.whiteSpace='pre-line';v.style.fontFamily=fontFamily;v.style.fontWeight='700';v.style.fontSize=result.gaugeValue.fontPx+'px';
  if(versions.get(surfaceEl)!==token)return {mode:'SUPERSEDED'};artHost.replaceChildren(c);valueHost.replaceChildren(v);surfaceEl.dataset.g11Migrated='1';return {mode:'NEW_RENDERER',plan};
 }
 return Object.freeze({render,compile:input=>compiler.compile(input),kit,profiles:G11_ROLLOUT_ORDER.slice(),bindings:G11_BINDINGS,cacheSize:()=>cache.size});
}

return {G11_ROLLOUT_ORDER,G11_BINDINGS,createG11Runtime};
})();
const {G11_ROLLOUT_ORDER,G11_BINDINGS,createG11Runtime}=__m9;

/* source: G11/app-wiring.mjs @ 9f027e8fb9c8337447a051d13e13734d5fb9d905 */
const __m10=(()=>{




// Isolated presentation adapter. Nutrition and application actions remain owned by the app.
async function mountAppRollout({app,root=document,enabled=true}={}) {
 if(!app?.recipe||!app?.current)throw Error('G11_READ_ONLY_APP_ADAPTER_REQUIRED');
 const records=new Map(),errors=[],coverage=[],stages=[];let runtime;
 let active=enabled,stage=0,busy=false,pending=false,revision=0,removeLegacy=false,wheelEnabled=false,wheelOffset=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const style=document.createElement('style');style.textContent=`
 @font-face{font-family:Satoshi;src:url('./G9/fonts/Satoshi-Bold.woff2');font-weight:700;font-display:block}
 .g11-scene{position:relative;display:block;flex:1 1 100%;width:100%;min-width:0;font-family:Satoshi,sans-serif;overflow:visible}
 .g11-art{position:absolute;inset:0;pointer-events:none;z-index:1}
 .g11-art canvas{display:block;width:100%;height:100%;pointer-events:none}
 .g11-ui{position:absolute!important;display:block;box-sizing:border-box;margin:0!important;min-width:0;z-index:1000;overflow-wrap:anywhere;white-space:normal}
 .g11-title{font-family:Satoshi,sans-serif!important;font-size:1.2em!important;line-height:1.25!important;font-weight:700!important;text-align:left;overflow:visible!important;-webkit-line-clamp:unset!important;padding:0!important}
 .g11-metadata{font-size:.875em;line-height:1.3;text-align:left}
 .g11-metadata .g11-value{display:block;font-weight:700;line-height:1.2}
 .g11-controls{display:flex!important;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-start}
 .g11-controls[role=button]{min-width:44px;min-height:44px}
 .g11-controls button,.g11-controls [role=button]{min-width:44px;min-height:44px;position:static!important;display:inline-flex;align-items:center;justify-content:center}
 .g11-scene .scheda-dati{flex-wrap:wrap;white-space:normal}.g11-controls .stella{position:static!important}
 .scheda[data-g11-card],.sugg[data-g11-card],.storico[data-g11-card]{display:block!important;width:100%;padding:12px!important;overflow:visible!important}
 [data-g11-card]::before,[data-g11-card]::after{pointer-events:none}
 .g11-view-controls{display:flex;gap:8px;margin:12px 0}.g11-view-controls button{min-width:44px;min-height:44px}
 .g11-wheel{position:relative;overflow:hidden}.g11-wheel>.g11-scene{position:absolute}
 .g11-wheel-fallback>.g11-scene{margin-bottom:12px}
 `;document.head.append(style);await document.fonts.load('700 16px Satoshi');runtime=await createG11Runtime();
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 const place=(n,r)=>{Object.assign(n.style,{left:r[0]+'px',top:r[1]+'px',width:r[2]+'px',height:r[3]+'px'});};
 const height=(n,w)=>{if(!n||!n.textContent.trim()&&!n.children.length)return 0;const c=n.cloneNode(true);c.style.cssText=`position:fixed!important;visibility:hidden;left:0;top:0;width:${w}px;height:auto;margin:0;`;document.body.append(c);const h=c.getBoundingClientRect().height;c.remove();return h;};
 function frame(surfaceId,title,metadata,controls){
  const f=el('div','g11-scene');f.dataset.g11Surface=surfaceId;f.style.fontSize=getComputedStyle(document.body).fontSize;
  const art=el('div','g11-art'),t=title||el('div','g11-title'),m=metadata||el('div','g11-metadata'),c=controls||el('div','g11-controls'),v=el('span','g11-value');
  for(const [n,cls] of [[t,'g11-title'],[m,'g11-metadata'],[c,'g11-controls']])n.classList.add('g11-ui',cls);
  m.append(v);f.append(art,t,m,c);return {f,art,t,m,c,v};
 }
 async function paint(parts,r,surfaceId,width,motion={progress:1,distance:0,reducedMotion:reduced.matches}){
  const {f,art,t,m,c,v}=parts,em=parseFloat(getComputedStyle(f).fontSize)||19.52;
 let measurements={header:0,title:height(t,width),metadata:Math.max(em*1.5,height(m,width)+em*1.2),controls:height(c,width)},result;
  for(let i=0;i<6;i++){
   try{result=await runtime.render({surfaceEl:f,artHost:art,valueHost:v,recipe_id:r.recipe_id,surfaceId,kcal_value:r.kcal,cook_people:r.people,context_id:'app:'+surfaceId,revision:++revision,hostWidth:width,fontEm:em,measurements,motion});}
   catch(e){if(e.requiredMetadataHeight){measurements.metadata=e.requiredMetadataHeight;continue;}throw e;}
   if(result.mode!=='NEW_RENDERER')throw Error('G11_RENDER_SUPERSEDED');const p=result.plan;
   for(const [id,n] of [['recipe_title_or_kitchen_step',t],['nutrition_metadata',m],['critical_controls_timer_actions',c]]){const box=p.surface.uiBoxes.find(b=>b.id===id);if(box)place(n,box.rect);else n.style.display='none';}
   const titleBox=p.surface.uiBoxes.find(b=>b.id==='recipe_title_or_kitchen_step').rect,metaBox=p.surface.uiBoxes.find(b=>b.id==='nutrition_metadata').rect,controlBox=p.surface.uiBoxes.find(b=>b.id==='critical_controls_timer_actions')?.rect;
   const next={header:0,title:height(t,titleBox[2]),metadata:Math.max(em*1.5,height(m,metaBox[2])),controls:height(c,controlBox?.[2]||width)};
   f.style.height=p.surface.host.height+'px';
   if(['title','metadata','controls'].every(k=>Math.abs(next[k]-measurements[k])<1))break;
   if(i===5)throw Error('G11_MEASUREMENTS_DID_NOT_SETTLE');measurements=next;
  }
  f.dataset.g11Recipe=r.recipe_id;f.dataset.g11Kcal=String(r.kcal);f.inert=!result.plan.surface.interaction.interactive;
  f.setAttribute('aria-hidden',String(f.inert));f.style.transform=`translateX(${result.plan.surface.interaction.cardTranslateX}px)`;
  parts.plan=result.plan;coverage.push({recipe_id:r.recipe_id,surfaceId,width,kcal:r.kcal,people:r.people,status:'PASS'});return parts;
 }
 const placeholders=[];
 function detach(n){if(!n)return;const marker=document.createComment('g11-original');n.before(marker);placeholders.push({n,marker,children:[...n.childNodes],style:n.getAttribute('style'),className:n.className});n.remove();return n;}
 function restore(){for(const rec of records.values())rec.parts?.f.remove();for(const {n,marker,children,style:st,className} of placeholders.splice(0)){if(marker.isConnected){marker.replaceWith(n);n.replaceChildren(...children);if(st===null)n.removeAttribute('style');else n.setAttribute('style',st);n.className=className;}}
  records.clear();root.querySelectorAll('[data-g11-card]').forEach(n=>delete n.dataset.g11Card);root.querySelectorAll('.g11-home,.g11-wheel,.g11-wheel-fallback,.g11-view-controls').forEach(n=>n.remove());
  root.querySelectorAll('[data-g11-legacy]').forEach(n=>{n.hidden=false;delete n.dataset.g11Legacy;});
 }
 async function migrate(key,container,r,surfaceId,{title,metadata,controls,legacy,insertBefore}={}){
  if(!r||!container.isConnected)return;const width=container.clientWidth;if(width<80)return;
  const signature=JSON.stringify([r,width,surfaceId,title?.textContent,metadata?.textContent]);let rec=records.get(key);if(rec&&!rec.parts.f.isConnected){records.delete(key);rec=null;}
  if(rec?.signature===signature)return;
  if(rec){await paint(rec.parts,r,surfaceId,rec.parts.f.clientWidth);rec.signature=signature;return;}
  const parts=frame(surfaceId,title?.cloneNode(true),metadata?.cloneNode(true),controls?.cloneNode(true));
  parts.f.style.visibility='hidden';container.insertBefore(parts.f,insertBefore||container.firstChild);
  try{await paint(parts,r,surfaceId,parts.f.clientWidth||width);if(!container.isConnected){parts.f.remove();return;}
   // Preserve the exact original action nodes and event delegation.
   for(const [name,n] of [['t',title],['m',metadata],['c',controls]])if(n){const old=parts[name];detach(n);n.classList.add('g11-ui',name==='t'?'g11-title':name==='m'?'g11-metadata':'g11-controls');n.style.cssText=old.style.cssText;old.replaceWith(n);parts[name]=n;if(name==='m'){n.append(parts.v);}}
   for(const n of legacy||[]){if(removeLegacy)detach(n);else{n.hidden=true;n.dataset.g11Legacy='1';}}
   parts.f.style.visibility='';container.dataset.g11Card='1';await paint(parts,r,surfaceId,parts.f.clientWidth);records.set(key,{parts,signature,legacy:legacy||[],container,r,surfaceId});
  }catch(e){parts.f.remove();throw e;}
 }
 async function detail(){const c=root.querySelector('#modal-detail.active #detail-body'),r=app.current().detail;if(!c||!r)return;
  const h=c.querySelector(':scope>h2');
  await migrate(c,c,r,'RECIPE_DETAIL',{title:h,metadata:c.querySelector(':scope>.detail-meta'),controls:c.querySelector(':scope>.azioni-rapide'),legacy:[...c.querySelectorAll(':scope>.dettaglio-arte')]});
 }
 async function micro(){const c=root.querySelector('#modal-detail.active #detail-body'),r=app.current().detail;if(!c||!r)return;const rec=records.get(c);if(!rec)return;
  const t=rec.parts.t;if(t.querySelector('[data-g11-surface=TITLE_MICRO]'))return;
  const parts=frame('TITLE_MICRO',el('span','',r.title));t.textContent='';t.append(parts.f);await paint(parts,r,'TITLE_MICRO',t.clientWidth);records.set(parts.f,{parts,signature:'micro',container:t,r,surfaceId:'TITLE_MICRO',legacy:[]});
  await paint(rec.parts,r,'RECIPE_DETAIL',rec.parts.f.clientWidth);
 }
 async function cards(profile){for(const c of root.querySelectorAll('.scheda[data-act=detail][data-val]')){
  if(!c.getClientRects().length||c.closest('.g11-wheel'))continue;
  const dest=c.closest('#recipe-list')?(root.querySelector('#search-input')?.value.trim()?'SEARCH_CARD':'RECIPE_LIST'):'RECIPE_CARD';if(dest!==profile)continue;
  const r=app.recipe(c.dataset.val);await migrate(c,c,r,profile,{title:c.querySelector('.scheda-titolo'),metadata:c.querySelector('.scheda-dati,.scheda-cov'),controls:c.querySelector('.stella'),legacy:[...c.querySelectorAll(':scope>.scheda-arte')]});
 }if(profile==='RECIPE_LIST')for(const c of root.querySelectorAll('.storico')){const id=c.querySelector('[data-act=storico-apri]')?.dataset.val;if(id&&c.getClientRects().length)await migrate(c,c,app.recipe(id),profile,{title:c.querySelector('.storico-nome'),legacy:[...c.querySelectorAll(':scope>.storico-arte')]});}}
 async function wheel(){const list=root.querySelector('#recipe-list');if(!list?.getClientRects().length)return;
  if(!list.previousElementSibling?.classList.contains('g11-view-controls')){const nav=el('div','g11-view-controls'),button=el('button','chip','Sfoglia'),prev=el('button','chip','Precedente'),next=el('button','chip','Successiva');for(const b of [button,prev,next])b.type='button';button.onclick=()=>{wheelEnabled=!wheelEnabled;button.textContent=wheelEnabled?'Mostra lista':'Sfoglia';prev.hidden=next.hidden=!wheelEnabled;schedule();};prev.hidden=next.hidden=true;prev.onclick=()=>{wheelOffset=Math.max(0,wheelOffset-1);schedule();};next.onclick=()=>{wheelOffset=Math.min(Math.max(0,list.querySelectorAll(':scope>.scheda').length-3),wheelOffset+1);schedule();};nav.append(button,prev,next);list.before(nav);}
  let host=list.querySelector(':scope>.g11-wheel,:scope>.g11-wheel-fallback');if(!wheelEnabled){if(host)host.remove();list.querySelectorAll(':scope>.scheda').forEach(n=>n.hidden=false);return;}
  const originals=[...list.querySelectorAll(':scope>.scheda')],selected=originals.slice(wheelOffset,wheelOffset+3),rs=selected.map(n=>app.recipe(n.dataset.val));if(rs.length!==3||rs.some(r=>!r))return;
  const signature=JSON.stringify([rs,list.clientWidth,innerHeight,reduced.matches]);if(host?.dataset.signature===signature)return;if(host)host.remove();
  host=el('div','g11-wheel');host.dataset.signature=signature;list.prepend(host);const width=list.clientWidth,em=parseFloat(getComputedStyle(document.body).fontSize),safe=Math.max(120,innerHeight-180),parts=[];
  for(const r of rs){const p=frame('RECIPE_WHEEL',el('span','',r.title),el('div','',`${r.kcal} kcal`));p.f.dataset.act='detail';p.f.dataset.val=r.recipe_id;p.f.setAttribute('role','button');p.f.tabIndex=0;p.f.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();p.f.click();}};host.append(p.f);parts.push(p);}
  const metrics=Object.fromEntries(runtime.kit.metrics.assets.map(a=>[a.master_id,a]));
  const instances=rs.map(r=>({recipe:runtime.kit.recipes.recipes.find(x=>x.recipe_id===r.recipe_id),template:runtime.kit.templates.templates.find(t=>t.template_key===runtime.kit.recipes.recipes.find(x=>x.recipe_id===r.recipe_id).template_key),vessel:runtime.kit.vessels.vessels.find(v=>v.vessel_id===runtime.kit.recipes.recipes.find(x=>x.recipe_id===r.recipe_id).resolved_vessel_id),gaugeState:createGaugeState({...r,context_id:'wheel',revision:0,kcal_value:r.kcal,source:'EXISTING_APP_VALUE',portion_ref:'standard',cook_people:r.people}),measurements:{header:0,title:height(parts[rs.indexOf(r)].t,width),metadata:40,controls:0}}));
  const layout=compileWheelCollection(runtime.kit.surface,{instances,viewportWidth:width,viewportHeight:safe,fontEm:em,metrics,reducedMotion:reduced.matches});
  host.dataset.g11WheelMode=layout.mode;
  if(layout.mode==='STANDARD_LIST'){host.className='g11-wheel-fallback';for(let i=0;i<3;i++)await paint(parts[i],rs[i],'RECIPE_LIST',width);}
  else {host.style.height=safe+'px';for(let i=0;i<3;i++){const pose=layout.instances[i];await paint(parts[i],rs[i],'RECIPE_WHEEL',width,{distance:i-1});Object.assign(parts[i].f.style,{left:pose.x+'px',top:pose.y+'px',transform:`scale(${pose.scale})`,transformOrigin:'top left',opacity:String(pose.opacity)});parts[i].f.inert=i!==1;parts[i].f.setAttribute('aria-hidden',String(i!==1));}}
  originals.forEach(n=>n.hidden=true);
 }
 async function home(){for(const page of root.querySelectorAll('.pagina[data-pasto]')){
  if(!page.querySelector(':scope>.g11-home')){const host=el('div','g11-home'),button=el('button','btn-primary','Dimmi tu');button.type='button';host.append(button);page.querySelector('.cards-list').before(host);button.onclick=async()=>{
   const choices=app.suggestions(page.dataset.pasto);let index=0;host.querySelectorAll('.g11-scene,.g11-home-actions,.g11-empty').forEach(n=>n.remove());
   if(!choices.length){host.append(el('p','g11-empty','Nessuna ricetta adatta a questo pasto.'));return;}
   const p=frame('HOME_DIMMI_TU'),actions=el('div','g11-home-actions'),skip=el('button','btn-ghost','Un’altra'),cook=el('button','btn-primary','Cucina');skip.type=cook.type='button';cook.dataset.act='cook-open';actions.append(skip,cook);host.append(p.f,actions);
   const show=async()=>{const r=choices[index];p.t.textContent=r.title;p.m.replaceChildren(p.v);cook.dataset.val=r.recipe_id;await paint(p,r,'HOME_DIMMI_TU',host.clientWidth);};skip.onclick=()=>{index=(index+1)%choices.length;show().catch(e=>errors.push({stage:'HOME_DIMMI_TU',error:e.message}));};await show();
  };}
 }}
 async function kitchen(){const c=root.querySelector('#cook-mode:not([hidden])'),r=app.current().cook;if(!c||!r)return;
  const body=c.querySelector('#cook-body');if(records.get(body)?.parts.f.isConnected===false)records.delete(body);await migrate(body,body,r,'KITCHEN_MODE');
 }
 const tasks=[detail,micro,()=>cards('SEARCH_CARD'),()=>cards('RECIPE_CARD'),()=>cards('RECIPE_LIST'),wheel,home,kitchen];
 async function refresh(){if(!active||busy){pending=true;return;}busy=true;pending=false;
  observer.disconnect();try{for(let i=0;i<=stage;i++){await tasks[i]();}for(const [key,rec] of records)if(!rec.container.isConnected)records.delete(key);}
  catch(e){errors.push({stage:G11_ROLLOUT_ORDER[stage],error:e.message});}
  finally{busy=false;observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});if(pending)schedule();}
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}
 const observer=new MutationObserver(changes=>{if(changes.some(c=>!c.target.closest?.('.g11-scene,.g11-view-controls')))schedule();});
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);reduced.addEventListener('change',()=>{wheelEnabled=false;schedule();});
 document.addEventListener('click',()=>setTimeout(schedule,0));document.addEventListener('input',()=>setTimeout(schedule,0));
 const controller={async advance(){if(stage<7){stage++;await refresh();stages.push({surfaceId:G11_ROLLOUT_ORDER[stage],errors:errors.length});}return G11_ROLLOUT_ORDER[stage];},async flush(){while(busy)await new Promise(r=>setTimeout(r,10));await refresh();while(busy)await new Promise(r=>setTimeout(r,10));},async enable(value){active=!!value;if(!active)restore();else await refresh();},async removeLegacy(){if(errors.length)throw Error('G12_G11_HAS_ERRORS');removeLegacy=true;let removed=0;for(const rec of records.values())for(const n of rec.legacy)if(n.isConnected){detach(n);removed++;}return removed;},discardTestFixtures(){if(app.qa!==true)throw Error('G12_QA_API_DISABLED');for(const [key,rec] of records)if(rec.parts.f.hasAttribute('data-g12-fixture')){rec.parts.f.remove();records.delete(key);}},async stageFixture(r,surfaceId,width,{legacyHtml='<svg viewBox="0 0 1 1"><circle cx=".5" cy=".5" r=".4"/></svg>'}={}){if(app.qa!==true)throw Error('G12_QA_API_DISABLED');if(!G11_ROLLOUT_ORDER.includes(surfaceId))throw Error('G12_UNKNOWN_SURFACE');const p=frame(surfaceId,el('span','g11-title',r.title));p.f.style.cssText=`position:fixed;left:0;top:0;width:${width}px;font-size:19.52px`;const old=el('span','g11-legacy-fixture');if(legacyHtml){old.innerHTML=legacyHtml;p.f.insertBefore(old,p.art);}p.f.dataset.g12Fixture=surfaceId;document.body.append(p.f);try{await paint(p,r,surfaceId,width);const key=Symbol(surfaceId);records.set(key,{parts:p,signature:'g12-fixture',legacy:legacyHtml?[old]:[],container:p.f,r,surfaceId});return {key,parts:p,legacy:old};}catch(e){p.f.remove();throw e;}},stats:()=>({active,stage:G11_ROLLOUT_ORDER[stage],stages,errors,coverage,records:[...records.values()].filter(r=>r.container.isConnected).map(r=>({recipe_id:r.r.recipe_id,surfaceId:r.surfaceId,legacy:r.legacy.filter(n=>n.isConnected).length})),cacheSize:runtime.cacheSize()}),runtime,paint,frame};
 await refresh();stages.push({surfaceId:G11_ROLLOUT_ORDER[0],errors:errors.length});return controller;
}

return {mountAppRollout};
})();
const {mountAppRollout}=__m10;

(async()=>{
try{
 window.MealUpG11=await mountAppRollout({app:window.MealUpVisualData});
 for(let i=1;i<8;i++)await window.MealUpG11.advance();
}catch(e){window.MealUpG11BootError=e&&e.message?e.message:String(e);console.error(e);}
})();
})();

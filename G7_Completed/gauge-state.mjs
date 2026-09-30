import {kcalToAngle} from './gauge-calibration.mjs';
/** G7 reconstructed canonical data component. No DOM, drawing, asset mutation or app side effects. */
const fail=code=>{throw Error(code);};
const text=(x,n)=>typeof x==='string'&&x.trim()?x:fail('INVALID_'+n);
const integer=(x,n,min=0)=>Number.isSafeInteger(x)&&x>=min?x:fail('INVALID_'+n);
export function createGaugeState(input) {
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
export function validateGaugeState(state,binding) {
 const rebuilt=createGaugeState(state);
 if(!binding||state.recipe_id!==binding.recipe_id||state.context_id!==binding.context_id)fail('S4_WRONG_RECIPE_OR_CONTEXT');
 if(state.schema!==rebuilt.schema||state.display_kcal!==rebuilt.display_kcal||state.accessible_text!==rebuilt.accessible_text||state.nutrition_status!==rebuilt.nutrition_status||state.needle_angle!==rebuilt.needle_angle||state.visual_status!==rebuilt.visual_status)fail('S4_INCONSISTENT_STATE');
 if(binding.revision!==undefined&&state.revision!==binding.revision)fail('S4_STALE_REVISION');
 return rebuilt;
}
export function createGaugeStore() {
 const states=new Map();const key=b=>JSON.stringify([text(b.recipe_id,'RECIPE_ID'),text(b.context_id,'CONTEXT_ID')]);
 return Object.freeze({
  publish(input){const next=createGaugeState(input),k=key(next),old=states.get(k);if(old&&next.revision<=old.revision)fail('STALE_OR_DUPLICATE_REVISION');states.set(k,next);return next;},
  snapshot(binding){const state=states.get(key(binding));if(!state)fail('S4_GAUGE_STATE_MISSING');return validateGaugeState(state,binding);}
 });
}

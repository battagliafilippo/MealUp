/** Feature flag defaults OFF. Legacy callback remains the sole owner of legacy rendering. */
export function createParallelController({compile,load,render,commit,legacy,getCurrentBinding,onHardStop=()=>{}}){
 for(const f of [compile,load,render,commit,legacy,getCurrentBinding])if(typeof f!=='function')throw Error('G8_REQUIRED_ADAPTER_MISSING');
 let enabled=false,epoch=0,lastInput=null;
 const current=input=>{const b=getCurrentBinding();return b&&b.recipe_id===input.recipe_id&&b.context_id===input.context_id&&b.revision===input.revision;};
 const restore=(input,reason,error=null)=>{legacy(input,{reason,error});return {mode:'LEGACY',reason,error};};
 return Object.freeze({
  enabled:()=>enabled,
  setEnabled(value){if(typeof value!=='boolean')throw Error('G8_FLAG_MUST_BE_BOOLEAN');enabled=value;epoch++;if(!enabled&&lastInput)restore(current(lastInput)?lastInput:getCurrentBinding(),'FLAG_DISABLED');},
  async update(input){lastInput=input;const ticket=++epoch;if(!enabled)return current(input)?restore(input,'FLAG_OFF'):{mode:'SUPERSEDED'};
   try{const plan=compile(input),assets=await load(plan);if(ticket!==epoch||!enabled)return {mode:'SUPERSEDED'};const binding=getCurrentBinding();if(!binding||binding.recipe_id!==input.recipe_id||binding.context_id!==input.context_id||binding.revision!==input.revision)return {mode:'SUPERSEDED'};const view=render(plan,assets);if(ticket!==epoch||!enabled||!current(input))return {mode:'SUPERSEDED'};commit(view,plan);return {mode:'NEW_RENDERER',binding,plan};}
   catch(error){if(ticket!==epoch||!enabled||!current(input))return {mode:'SUPERSEDED'};onHardStop(error,input);return restore(input,'HARD_STOP_LEGACY_RETAINED',error.message);}
  },
  dispose(){enabled=false;epoch++;lastInput=null;}
 });
}

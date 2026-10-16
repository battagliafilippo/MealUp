'use strict';
const fs=require('node:fs');
const path=require('node:path');

function fail(message){throw new Error(message);}
function readJson(file){return JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));}

function inspect(state,mandate){
 if(state?.schema!=='mealup-food-portrait-controlled-autonomy-state-v1')fail('STATE_SCHEMA_INVALID');
 if(mandate?.schema!=='mealup-food-portrait-controlled-autonomy-v1')fail('MANDATE_SCHEMA_INVALID');
 if(mandate.status!=='ACTIVE_SCOPED_AUTONOMY'||mandate.ownerAuthorization?.authorized!==true)fail('MANDATE_NOT_ACTIVE');
 if(state.lotId!==mandate.lotId)fail('LOT_ID_MISMATCH');
 if(mandate.execution?.candidateLimitPerCycle!==1||mandate.execution?.automaticAcceptance!==false||
   mandate.execution?.automaticFreeze!==false||mandate.execution?.integration!==false||
   mandate.execution?.deployment!==false||mandate.execution?.budgetEUR!==0)fail('UNSAFE_MANDATE');
 const authorized=new Set(mandate.authorizedRecipeIds||[]);
 const excluded=new Set(mandate.excludedRecipeIds||[]);
 if(state.blocked||String(state.status).startsWith('BLOCKED'))return {decision:'BLOCKED',reason:'PERSISTED_BLOCKER',lotId:state.lotId};
 if(state.activeRecipeId)return {decision:'BLOCKED',reason:'ACTIVE_CYCLE_REQUIRES_RECOVERY_REVIEW',lotId:state.lotId};
 const pending=(state.queue||[]).filter(x=>x.state==='PENDING');
 for(const item of pending){
  if(!authorized.has(item.recipeId)||excluded.has(item.recipeId))return {decision:'BLOCKED',reason:'QUEUE_SCOPE_VIOLATION',recipeId:item.recipeId,lotId:state.lotId};
 }
 if(pending.length===0)return {decision:'NOOP_TERMINAL',reason:'NO_AUTHORIZED_PENDING_RECIPE',status:state.status,lotId:state.lotId};
 if(state.status!=='ACTIVE_READY')return {decision:'BLOCKED',reason:'STATE_NOT_READY',status:state.status,lotId:state.lotId};
 return {decision:'READY',recipeId:pending[0].recipeId,vesselId:pending[0].vesselId,kcal:pending[0].kcal,lotId:state.lotId};
}

function selfTest(){
 const mandate={schema:'mealup-food-portrait-controlled-autonomy-v1',status:'ACTIVE_SCOPED_AUTONOMY',lotId:'L',ownerAuthorization:{authorized:true},authorizedRecipeIds:['a'],excludedRecipeIds:['x'],execution:{candidateLimitPerCycle:1,automaticAcceptance:false,automaticFreeze:false,integration:false,deployment:false,budgetEUR:0}};
 const base={schema:'mealup-food-portrait-controlled-autonomy-state-v1',lotId:'L',status:'ACTIVE_READY',queue:[{recipeId:'a',vesselId:'V',kcal:10,state:'PENDING'}],activeRecipeId:null,blocked:null};
 if(inspect(base,mandate).decision!=='READY')fail('SELFTEST_READY');
 if(inspect({...base,status:'LOT_OWNER_APPROVED_FROZEN',queue:[{...base.queue[0],state:'OWNER_APPROVED_FROZEN'}]},mandate).decision!=='NOOP_TERMINAL')fail('SELFTEST_NOOP');
 if(inspect({...base,queue:[{recipeId:'x',state:'PENDING'}]},mandate).decision!=='BLOCKED')fail('SELFTEST_SCOPE');
 if(inspect({...base,blocked:{code:'X'}},mandate).decision!=='BLOCKED')fail('SELFTEST_BLOCKED');
 console.log('PASS background preflight: ready, terminal no-op, scope violation and persisted blocker');
}

function main(argv){
 if(argv.includes('--self-test'))return selfTest();
 const value=name=>{const i=argv.indexOf(name);return i<0?null:argv[i+1]};
 const state=value('--state'),mandate=value('--mandate');
 if(!state||!mandate)fail('USAGE: --state <file> --mandate <file>');
 console.log(JSON.stringify(inspect(readJson(state),readJson(mandate)),null,2));
}

if(require.main===module){try{main(process.argv.slice(2))}catch(error){console.error('FAIL background preflight:',error.message);process.exitCode=1}}
module.exports={inspect};

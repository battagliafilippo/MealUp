'use strict';
/** Scoped autonomy controller: advances inside one owner-authorized lot only. */
const fs=require('node:fs'),path=require('node:path');
const assert=(c,m)=>{if(!c)throw Error(m)};
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function atomicJson(target,value){
 fs.mkdirSync(path.dirname(target),{recursive:true});
 const tmp=target+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 fs.renameSync(tmp,target);
}
function validateMandate(mandate,lot){
 assert(mandate?.schema==='mealup-food-portrait-controlled-autonomy-v1','MANDATE_SCHEMA_INVALID');
 assert(mandate.ownerAuthorization?.authorized===true&&mandate.ownerAuthorization?.decision==='fallo',
  'OWNER_LOT_AUTHORIZATION_REQUIRED');
 assert(mandate.lotId===lot?.lotId&&Array.isArray(mandate.authorizedRecipeIds)&&mandate.authorizedRecipeIds.length>0,
  'LOT_SCOPE_INVALID');
 assert(mandate.execution?.candidateLimitPerCycle===1&&mandate.execution?.advanceOnQaPass===true,
  'SERIAL_QA_ADVANCE_REQUIRED');
 assert(mandate.execution?.automaticAcceptance===false&&mandate.execution?.automaticFreeze===false&&
  mandate.execution?.integration===false&&mandate.execution?.deployment===false&&mandate.execution?.budgetEUR===0,
  'UNSAFE_AUTONOMY_PRIVILEGE');
 const rows=new Map(lot.sequence.map(x=>[x.recipeId,x]));
 const ids=new Set();
 for(const id of mandate.authorizedRecipeIds){
  assert(!ids.has(id)&&rows.has(id),'UNKNOWN_OR_DUPLICATE_RECIPE:'+id);ids.add(id);
  assert(!mandate.excludedRecipeIds.includes(id),'EXCLUDED_RECIPE_AUTHORIZED:'+id);
 }
 assert(mandate.excludedRecipeIds.includes('do01'),'DO01_MUST_REMAIN_EXCLUDED');
 return mandate.authorizedRecipeIds.map(id=>rows.get(id));
}
function createState(mandate,lot){
 const queue=validateMandate(mandate,lot);
 return {schema:'mealup-food-portrait-controlled-autonomy-state-v1',lotId:mandate.lotId,
  mandateVersion:mandate.version,status:'ACTIVE_READY',queue:queue.map(x=>({recipeId:x.recipeId,
   vesselId:x.vesselId,kcal:x.kcal,state:'PENDING'})),activeRecipeId:null,completed:[],blocked:null,
  gates:{candidateLimitPerCycle:1,automaticAcceptance:false,automaticFreeze:false,
   integration:false,deployment:false,budgetEUR:0}};
}
function startNext(state){
 assert(state.status==='ACTIVE_READY'&&state.activeRecipeId===null,'CYCLE_ALREADY_ACTIVE_OR_NOT_READY');
 const next=state.queue.find(x=>x.state==='PENDING');
 if(!next)return {...state,status:'LOT_CANDIDATES_COMPLETE_AWAITING_OWNER_REVIEW'};
 return {...state,status:'CYCLE_ACTIVE',activeRecipeId:next.recipeId,
  queue:state.queue.map(x=>x.recipeId===next.recipeId?{...x,state:'ACTIVE'}:x)};
}
function recordQa(state,result){
 assert(state.status==='CYCLE_ACTIVE'&&result?.recipeId===state.activeRecipeId,'QA_RESULT_RECIPE_MISMATCH');
 assert(result.candidatesGenerated===1,'EXACTLY_ONE_CANDIDATE_REQUIRED');
 const pass=result.technicalQa==='PASS'&&result.independentVisualQa==='PASS_CANDIDATE_ONLY';
 if(!pass)return {...state,status:'BLOCKED_QA',blocked:{recipeId:state.activeRecipeId,
   technicalQa:result.technicalQa,independentVisualQa:result.independentVisualQa},activeRecipeId:null,
   queue:state.queue.map(x=>x.recipeId===state.activeRecipeId?{...x,state:'BLOCKED'}:x)};
 const done=state.activeRecipeId;
 return {...state,status:'ACTIVE_READY',activeRecipeId:null,completed:[...state.completed,done],
  queue:state.queue.map(x=>x.recipeId===done?{...x,state:'QA_PASS_CANDIDATE_ONLY'}:x)};
}
function selfTest(){
 const strict=require('node:assert/strict');
 const lot={lotId:'L1',sequence:[{recipeId:'do01',vesselId:'VESSEL_RAMEKIN',kcal:150},
  {recipeId:'d32',vesselId:'VESSEL_BAKING_DISH',kcal:975},{recipeId:'do10',vesselId:'VESSEL_DESSERT_MOLD',kcal:1560}]};
 const mandate={schema:'mealup-food-portrait-controlled-autonomy-v1',version:'1.0',lotId:'L1',
  ownerAuthorization:{authorized:true,decision:'fallo'},authorizedRecipeIds:['d32','do10'],excludedRecipeIds:['do01'],
  execution:{candidateLimitPerCycle:1,advanceOnQaPass:true,automaticAcceptance:false,
   automaticFreeze:false,integration:false,deployment:false,budgetEUR:0}};
 let s=createState(mandate,lot);s=startNext(s);strict.equal(s.activeRecipeId,'d32');
 strict.throws(()=>startNext(s),/CYCLE_ALREADY_ACTIVE/);
 s=recordQa(s,{recipeId:'d32',candidatesGenerated:1,technicalQa:'PASS',independentVisualQa:'PASS_CANDIDATE_ONLY'});
 strict.equal(s.status,'ACTIVE_READY');s=startNext(s);strict.equal(s.activeRecipeId,'do10');
 s=recordQa(s,{recipeId:'do10',candidatesGenerated:1,technicalQa:'FAIL',independentVisualQa:'PASS_CANDIDATE_ONLY'});
 strict.equal(s.status,'BLOCKED_QA');
 strict.throws(()=>createState({...mandate,authorizedRecipeIds:['do01']},lot),/EXCLUDED_RECIPE/);
 strict.throws(()=>createState({...mandate,execution:{...mandate.execution,automaticFreeze:true}},lot),/UNSAFE_AUTONOMY/);
 console.log('PASS controlled lot autonomy: scoped queue, one candidate, QA advance, fail-closed, no do01/freeze/deploy');
}
function main(argv){
 if(argv.includes('--self-test'))return selfTest();
 const v=n=>{const i=argv.indexOf(n);return i<0?null:argv[i+1]};
 for(const n of ['--mandate','--lot','--state'])assert(v(n),'REQUIRED '+n);
 const target=path.resolve(v('--state'));assert(!fs.existsSync(target),'STATE_ALREADY_EXISTS');
 atomicJson(target,createState(read(path.resolve(v('--mandate'))),read(path.resolve(v('--lot')))));
 console.log('PASS controlled autonomy state created:',target);
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){console.error('FAIL controlled lot autonomy:',e.stack||e);process.exitCode=1;}}
module.exports={validateMandate,createState,startNext,recordQa,selfTest};

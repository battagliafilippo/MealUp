'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fail=message=>{throw new Error(message)};
const read=file=>JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));

function build(mandate,matrix,coverage,root=process.cwd()){
 if(mandate?.schema!=='mealup-food-portrait-catalog-autonomy-v1'||mandate.status!=='ACTIVE_SCOPED_CATALOG_AUTONOMY'||mandate.ownerAuthorization?.authorized!==true)fail('MANDATE_INVALID');
 const e=mandate.execution;
 if(e?.candidateLimitPerCycle!==1||e.automaticAcceptance!==false||e.automaticFreeze!==false||e.integration!==false||e.deployment!==false||e.budgetEUR!==0)fail('UNSAFE_AUTHORITY');
 if(!Array.isArray(matrix?.rows)||matrix.rows.length!==454||new Set(matrix.rows.map(x=>x.recipe_id)).size!==454)fail('MATRIX_INVALID');
 if(coverage?.status!=='VERIFIED'||!Array.isArray(coverage.references))fail('COVERAGE_INVALID');
 const refs=new Map();
 for(const ref of coverage.references){
  const asset=path.resolve(root,ref.asset);
  if(!fs.existsSync(asset)||hashFile(asset)!==ref.sha256)fail('REFERENCE_HASH_MISMATCH:'+ref.vesselId);
  refs.set(ref.vesselId,{recipeId:ref.recipeId,asset:ref.asset,sha256:ref.sha256});
 }
 const excluded=new Set(mandate.excludedRecipeIds||[]);
 const queue=matrix.rows.filter(row=>refs.has(row.vessel_id)&&!excluded.has(row.recipe_id)).map(row=>({
  recipeId:row.recipe_id,title:row.canonical_recipe,vesselId:row.vessel_id,
  compositionId:row.composition_id,reference:refs.get(row.vessel_id),state:'PENDING'
 }));
 const blocked=matrix.rows.filter(row=>!refs.has(row.vessel_id)).map(row=>({recipeId:row.recipe_id,title:row.canonical_recipe,vesselId:row.vessel_id,reason:'FROZEN_VESSEL_REFERENCE_REQUIRED'}));
 if(queue.length!==437||blocked.length!==5)fail('EXPECTED_SCOPE_MISMATCH:'+queue.length+'/'+blocked.length);
 return {schema:'mealup-food-portrait-catalog-autonomy-state-v1',version:'1.0',status:'ACTIVE_READY',source:{matrixPath:'G8/composition-matrix.json',matrixSha256:hashFile(path.resolve(root,'G8/composition-matrix.json')),coveragePath:'docs/food-portrait-pipeline/frozen-reference-coverage-v1.json',coverageSha256:hashFile(path.resolve(root,'docs/food-portrait-pipeline/frozen-reference-coverage-v1.json'))},totals:{catalog:454,eligible:queue.length,blocked:blocked.length,completed:0,pending:queue.length},queue,blocked,activeRecipeId:null,lastRun:null,gates:{candidateLimitPerCycle:1,ownerReviewBatchSize:e.ownerReviewBatchSize,automaticAcceptance:false,automaticFreeze:false,integration:false,deployment:false,budgetEUR:0}};
}

function inspect(state,mandate){
 if(state?.schema!=='mealup-food-portrait-catalog-autonomy-state-v1'||mandate?.schema!=='mealup-food-portrait-catalog-autonomy-v1')fail('SCHEMA_INVALID');
 if(state.activeRecipeId)return {decision:'BLOCKED',reason:'ACTIVE_CYCLE_REQUIRES_RECOVERY_REVIEW',recipeId:state.activeRecipeId};
 if(String(state.status).startsWith('BLOCKED'))return {decision:'BLOCKED',reason:state.status};
 const pending=state.queue.filter(x=>x.state==='PENDING');
 if(!pending.length)return {decision:'NOOP_TERMINAL',reason:'CATALOG_ELIGIBLE_QUEUE_COMPLETE'};
 if(state.status!=='ACTIVE_READY')return {decision:'BLOCKED',reason:'STATE_NOT_READY'};
 return {decision:'READY',recipeId:pending[0].recipeId,title:pending[0].title,vesselId:pending[0].vesselId,reference:pending[0].reference,pending:pending.length};
}

function selfTest(){
 const e={candidateLimitPerCycle:1,ownerReviewBatchSize:10,automaticAcceptance:false,automaticFreeze:false,integration:false,deployment:false,budgetEUR:0};
 const s={schema:'mealup-food-portrait-catalog-autonomy-state-v1',status:'ACTIVE_READY',queue:[{recipeId:'x',state:'PENDING'}],activeRecipeId:null};
 const m={schema:'mealup-food-portrait-catalog-autonomy-v1',execution:e};
 if(inspect(s,m).decision!=='READY')fail('SELFTEST_READY');
 if(inspect({...s,queue:[{recipeId:'x',state:'QA_PASS_CANDIDATE_ONLY'}]},m).decision!=='NOOP_TERMINAL')fail('SELFTEST_TERMINAL');
 if(inspect({...s,activeRecipeId:'x'},m).decision!=='BLOCKED')fail('SELFTEST_RECOVERY');
 console.log('PASS catalog autonomy inspection: ready, terminal no-op and active-cycle recovery block');
}

function writeAtomic(file,value){const target=path.resolve(file),tmp=target+'.tmp-'+process.pid;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,target)}
function main(argv){
 if(argv.includes('--self-test'))return selfTest();
 const value=name=>{const i=argv.indexOf(name);return i<0?null:argv[i+1]};
 const inspectState=value('--inspect-state'),inspectMandate=value('--inspect-mandate');
 if(inspectState||inspectMandate){
  if(!inspectState||!inspectMandate)fail('USAGE --inspect-state --inspect-mandate');
  console.log(JSON.stringify(inspect(read(inspectState),read(inspectMandate)),null,2));return;
 }
 const mandate=value('--mandate'),matrix=value('--matrix'),coverage=value('--coverage'),state=value('--state');
 if(!mandate||!matrix||!coverage||!state)fail('USAGE --mandate --matrix --coverage --state');
 if(fs.existsSync(path.resolve(state)))fail('STATE_ALREADY_EXISTS');
 const result=build(read(mandate),read(matrix),read(coverage));writeAtomic(state,result);
 console.log('PASS catalog autonomy state:',result.totals);
}
if(require.main===module){try{main(process.argv.slice(2))}catch(error){console.error('FAIL catalog autonomy:',error.message);process.exitCode=1}}
module.exports={build,inspect};

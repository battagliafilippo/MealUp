'use strict';

/**
 * MealUp Scout Skill Selector v1 - deterministic offline controller.
 * Discovers repo-local SKILL.md; returns a scoped research plan, not a
 * callable AI or a model ranking. No network, provider, installs or writes.
 */
const fs=require('node:fs');
const path=require('node:path');
const roles=require('./scout-role-matrix.json');
const scorer=require('./scout-evaluator.cjs');
const matrix=new Map(roles.roles.map(x=>[x.roleId,x]));
const skillNames=Object.freeze([
  'mealup-talent-scout',
  'mealup-recurring-cost-auditor',
  'mealup-agent-security',
  'mealup-agent-benchmark',
  'mealup-ceo-selection-brief'
]);
const states=Object.freeze({DISCOVERY:'DISCOVERY',ELIGIBILITY:'ELIGIBILITY',
  BENCHMARK:'BENCHMARK',CEO_BRIEF:'CEO_BRIEF'});
function readSkillMetadata(name){
  if(!skillNames.includes(name))throw Error('UNKNOWN_OR_UNTRUSTED_SKILL');
  const dir=path.resolve(__dirname,'../../.agents/skills',name);
  const filename=path.resolve(dir,'SKILL.md');
  if(!filename.startsWith(dir+path.sep))throw Error('UNSAFE_PATH');
  const text=fs.readFileSync(filename,'utf8');
  const match=/^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if(!match)throw Error('NO_SKILL_FRONTMATTER:'+name);
  const declared=/(?:^|\n)name:\s*(\S+)/.exec(match[1])?.[1];
  const description=/(?:^|\n)description:\s*(.+)/.exec(match[1])?.[1];
  if(declared!==name || !description || description.trim().length<24 ||
     description.length>1024 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(declared))
    throw Error('INVALID_SKILL_HEADER:'+name);
  if(text.length>12000)throw Error('SKILL_EXCESSIVE_CONTEXT:'+name);
  return {name,description:description.trim(),filename:'.agents/skills/'+name+'/SKILL.md',
    bytes:Buffer.byteLength(text)};
}
function plan({roleId,stage=states.DISCOVERY,externalGitHubCode=false,
  needsCrossModelBenchmark=false,request=''}={}){
  if(!matrix.has(roleId))throw Error('UNKNOWN_ROLE');
  if(!Object.values(states).includes(stage))throw Error('UNKNOWN_STAGE');
  const role=matrix.get(roleId);
  // Only load the specializations needed for this task.
  let chosen=['mealup-talent-scout'];
  if(stage===states.ELIGIBILITY || stage===states.BENCHMARK ||
     stage===states.CEO_BRIEF)chosen.push('mealup-recurring-cost-auditor');
  if(externalGitHubCode===true)chosen.push('mealup-agent-security');
  if(stage===states.BENCHMARK || needsCrossModelBenchmark===true)
    chosen.push('mealup-agent-benchmark');
  if(stage===states.CEO_BRIEF)chosen.push('mealup-ceo-selection-brief');
  chosen=[...new Set(chosen)];
  return {
    schema:'mealup-scout-skill-plan-v1',roleId,stage,request,
    primaryRole:role.role,roleRequirements:role.requiredProof.slice(),
    testsToPrepare:role.cases.slice(),skills:chosen.map(readSkillMetadata),
    departmentOwner:'INDEPENDENT_TALENT_SCOUT',reportTo:'CEO',
    noDirectorVeto:true,ceoDecisionRequired:true,
    proactiveLiveProviderCalls:false,noAutomaticAgentSwitch:true,
    budgetAdditionalEUR:0,sourcesNeeded:true,
    notes:[
      'This is an offline skill selection plan, not evidence of live specialist execution.',
      'Repo-local skills may be loaded by compatible clients; committing does not install them into a ChatGPT account.',
      'Benchmark outcomes require real model execution and independent QA.'
    ]
  };
}
function screenExistingRole(roleId){
  const role=matrix.get(roleId);
  if(!role)throw Error('UNKNOWN_ROLE');
  const registry=require('./scout-candidate-register.json');
  return {
    roleId,role:role.role,
    candidates:registry.candidates.filter(x=>x.role===role.role).map(c=>({
      id:c.id,provider:c.inferenceProvider,modelId:c.modelId,
      liveProviderAccess:c.freeQuotaPolicy?.privateAccount || 'UNKNOWN',
      quotaPolicy:c.freeQuotaPolicy?.kind || 'UNKNOWN',
      evidenceState:scorer.classify(c).state,
      promoted:false
    })),
    noWinnerYet:true,needsRoleBenchmark:role.cases.slice()
  };
}
function checkIndependentEvidence({left,right,cases}={}){
  return scorer.assessBenchmark(left,right,cases);
}
function validateSkillLibrary(){
  const discovered=skillNames.map(readSkillMetadata);
  if(new Set(discovered.map(x=>x.name)).size!==discovered.length)
    throw Error('DUPLICATE_SKILL');
  if(roles.roles.length!==8 ||
     new Set(roles.roles.map(x=>x.roleId)).size!==roles.roles.length)
    throw Error('INVALID_ROLE_MATRIX');
  for(const role of roles.roles){
    if(!Array.isArray(role.cases)||role.cases.length<4 ||
      !Array.isArray(role.requiredProof)||role.requiredProof.length<3)
      throw Error('INCOMPLETE_ROLE:'+role.roleId);
    if(!role.cases.some(x=>x.includes('NEGATIVE')))
      throw Error('MISSING_NEGATIVE_CASE:'+role.roleId);
  }
  return {status:'PASS_OFFLINE',skillCount:discovered.length,roleCount:roles.roles.length,
    testCaseCount:roles.roles.reduce((a,r)=>a+r.cases.length,0),modelCalls:0,
    autoInstallations:0,autoPromotions:0};
}
if(require.main===module){
  console.log(JSON.stringify({library:validateSkillLibrary(),
    designPlan:plan({roleId:'DESIGN',stage:states.BENCHMARK}),
    designState:screenExistingRole('DESIGN')},null,2));
}
module.exports={states,skillNames,readSkillMetadata,validateSkillLibrary,
  plan,screenExistingRole,checkIndependentEvidence};

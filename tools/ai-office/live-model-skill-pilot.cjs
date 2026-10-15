'use strict';
// Exactly one Groq Free call with dynamically selected internal Design skills.
// Candidate remains NOT APPROVED, no file writes except /tmp report.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {selectSkills}=require('./dynamic-skill-selector.cjs');
const catalog=require('./live-model-skill-catalog.json').skills;
const ROOT=path.resolve(__dirname,'../..');
const LAB='experiment/recipe-visual-agents';
const ALLOWED=new Map([
 ['MEALUP_DESIGN_STATIC_OBSERVATION','.agents/skills/mealup-design-observe-static-fo/SKILL.md'],
 ['MEALUP_DESIGN_OVERCLAIM_GUARD','.agents/skills/mealup-design-no-overclaim/SKILL.md']
]);
function buildAssignment(){
 const task={id:'DESIGN_CANDIDATE_SKILLS_001',agentId:'QWEN3_8_CANDIDATE',
   roleId:'DESIGN',scope:'LAB_READ_ONLY',frozenContextVerified:true,
   capabilities:['FO_VISUAL_OBSERVATION','CLAIM_BOUNDARIES']};
 const assignment={assignedBy:'DIRECTOR',authorized:true,reference:'CEO_20261015_READ_ONLY_SKILLS_PILOT',
   taskId:task.id,agentId:task.agentId,roleId:task.roleId,scope:task.scope};
 const chosen=selectSkills(task,assignment,catalog);
 if(chosen.status!=='READY_OFFLINE'||chosen.selected.length!==2)
   throw Error('DYNAMIC_SKILL_SELECTION_BLOCKED');
 const contents=chosen.selected.map(id=>{
   const p=ALLOWED.get(id);
   if(!p||catalog.find(x=>x.id===id)?.path!==p)throw Error('UNTRUSTED_SKILL_PATH');
   const value=fs.readFileSync(path.join(ROOT,p),'utf8');
   if(value.length<100||value.length>3000)throw Error('SKILL_SIZE_UNEXPECTED');
   return {id,path:p,sha256:crypto.createHash('sha256').update(value).digest('hex'),
     instructions:value.replace(/^---[\s\S]*?---\s*/,'')};
 });
 return {task,chosen,contents};
}
function structuralReview(candidate){
 const errors=[];
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
   return {status:'FAIL',errors:['NON_OBJECT']};
 if(candidate.family!=='PASTA')errors.push('FAMILY_MISMATCH');
 if(!Array.isArray(candidate.visibleObservations)||candidate.visibleObservations.length<1||
    candidate.visibleObservations.length>4)errors.push('OBSERVATIONS_INVALID');
 const words=(candidate.visibleObservations||[]).join(' ');
 if(/\b(?:frame|fotogramm[ai]|crop|inquadratur[ae])\b|(?:sfondo bianco|white background)/i.test(words))
   errors.push('UNSEEN_FRAMES_OR_BACKGROUND');
 if(candidate.claimedFrozenCompliance!==false)errors.push('FROZEN_APPROVAL_CLAIM');
 if(!Array.isArray(candidate.filesModified)||candidate.filesModified.length!==0)
   errors.push('WRITE_CLAIM');
 if(!Array.isArray(candidate.otherDepartmentsActivated)||candidate.otherDepartmentsActivated.length!==0)
   errors.push('OTHER_AGENT_CLAIM');
 if(!Array.isArray(candidate.uncertainties))errors.push('UNCERTAINTY_MISSING');
 if(typeof candidate.suggestedMobileCheck!=='string'||candidate.suggestedMobileCheck.length<12)
   errors.push('MOBILE_TEST_MISSING');
 return {status:errors.length?'BLOCKED':'HUMAN_VISUAL_QA_REQUIRED',errors};
}
module.exports={buildAssignment,structuralReview};

async function runLive(){
 if(process.env.MEALUP_FREE_ONLY!=='YES'||
    process.env.MEALUP_ALLOW_ONE_GROQ_CALL!=='YES'||
    process.env.GITHUB_REF_NAME!==LAB||
    !(process.env.GROQ_API_KEY?.length>20))
    throw Error('LIVE_FREE_LAB_AND_SECRET_GATE_REQUIRED');
 const p=buildAssignment();
 const file=path.join(ROOT,'assets/family-fo/pasta.webp');
 const image=fs.readFileSync(file);
 if(image.length!==147190)throw Error('FIXTURE_CHANGED_REQUIRE_NEW_AUTHORIZATION');
 const example={family:'PASTA',visibleObservations:['descrizione pixel visibili'],
   uncertainties:[],suggestedMobileCheck:'una sola verifica futura su iPhone',
   claimedFrozenCompliance:false,filesModified:[],otherDepartmentsActivated:[]};
 const messages=[
  {role:'system',content:[
    'Sei un candidato Design NON APPROVATO di MealUp. Nessun potere esecutivo.',
    'Le due Skill del laboratorio sono istruzioni tecniche, non un permesso di intervenire.',
    ...p.contents.map(x=>'SKILL '+x.id+': '+x.instructions),
    'Ricevi una sola immagine statica WebP. Evita allucinazioni, rispondi solo JSON.'
  ].join('\n')},
  {role:'user',content:[
    {type:'text',text:'Analizza il FO senza fingere di vedere la card. Rispetta esattamente lo schema JSON: '+JSON.stringify(example)},
    {type:'image_url',image_url:{url:'data:image/webp;base64,'+image.toString('base64')}}
  ]}
 ];
 const report={schema:'MEALUP_ONE_SHOT_DYNAMIC_SKILL_AI_V1',
   status:'NOT_STARTED',branch:LAB,provider:'GROQ_FREE',
   model:'qwen/qwen3.8-27b',candidateApproved:false,
   selectedSkills:p.contents.map(x=>({id:x.id,sha256:x.sha256})),
   inputFile:'assets/family-fo/pasta.webp',
   imageSha256:crypto.createHash('sha256').update(image).digest('hex'),
   apiCalls:0,retries:0,filesModified:[],deploys:0,
   additionalBillingEUR:0,outputRequiresIndependentHumanQa:true};
 try{
   report.apiCalls=1;
   const resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{
     method:'POST',headers:{Authorization:'Bearer '+process.env.GROQ_API_KEY,
       'Content-Type':'application/json'},
     body:JSON.stringify({model:report.model,reasoning_effort:'none',
       temperature:0.1,max_completion_tokens:520,stream:false,
       response_format:{type:'json_object'},messages}),
     signal:AbortSignal.timeout(30000)
   });
   report.httpStatus=resp.status;
   if(!resp.ok){report.status='PROVIDER_BLOCKED';return report;}
   const json=await resp.json();
   report.usage=json.usage??null;
   let obj;
   try{obj=JSON.parse(json.choices?.[0]?.message?.content??'');}
   catch(_){report.status='UNPARSEABLE_MODEL_JSON';return report;}
   report.candidate=obj;
   report.review=structuralReview(obj);
   report.status=report.review.status==='BLOCKED'?
     'QA_BLOCKED':'MODEL_RETURNED_REVIEW_REQUIRED';
   return report;
 }catch(_){
   report.status='NETWORK_OR_TIMEOUT_NO_RETRY';
   return report;
 }finally{
   fs.writeFileSync('/tmp/mealup-dynamic-skill-ai-pilot.json',
     JSON.stringify(report,null,2)+'\n');
   console.log('DYNAMIC_SKILL_AI_PILOT '+report.status+
     ' CALLS='+report.apiCalls+' SKILLS='+report.selectedSkills.length+
     ' QA='+ (report.review?.status??'NOT_RUN')+
     ' BILLING_EUR=0 DEPLOYS=0');
 }
}
if(require.main===module){
 runLive().then(r=>{
  if(r.status!=='MODEL_RETURNED_REVIEW_REQUIRED')process.exitCode=1;
 }).catch(e=>{
  console.error('BLOCKED: '+String(e.message).replace(/[^A-Z_]/gi,'_'));
  process.exitCode=1;
 });
}
module.exports.runLive=runLive;

'use strict';
// MealUp Design benchmarking: read-only. Never deploys, modifies app or certifies design.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const MODEL = 'qwen/qwen3.8-27b';
const BENCHMARK_ID = 'OFFICE-DESIGN-BENCH-V1';
const EXPECTED = Object.freeze([
  { id:'FO_PASTA', file:'assets/family-fo/pasta.webp', label:'PASTA' },
  { id:'FO_PESCE', file:'assets/family-fo/pesce.webp', label:'PESCE' },
  { id:'FO_VERDURA', file:'assets/family-fo/verdura.webp', label:'VERDURA' },
  { id:'BRAND_SCALE', file:'assets/mealup-home-scale.webp', label:'NON_FOOD_BRAND' }
]);
const EFFORTS = ['none','medium'];
const PROMPT = [
  'Sei un candidato Design Agent in una PROVA DI OSSERVAZIONE senza potere operativo.',
  'Ricevi una sola immagine statica per richiesta, mai uno screenshot dell intera card.',
  'Descrivi esclusivamente oggetti, colori, disposizione e texture realmente visibili.',
  'Non descrivere sequenze temporali, altre viste, geometrie di card non fornite.',
  'Se il dettaglio non e verificabile, segnala dato mancante invece di indovinarlo.',
  'Le famiglie consentite sono PASTA, PESCE, VERDURA, NON_FOOD_BRAND.',
  'Non chiamare PASTA un generico CEREALI. Per un logo/bilancia usa NON_FOOD_BRAND.',
  'Non affermare di aver verificato FROZEN o un test mobile; proponi un solo test futuro.',
  'Nessuna modifica, attivazione agenti, pubblicazione o autorizzazione.',
  'Rispondi soltanto con un JSON valido avente family, visibleObservations (array di 1-4 testi),',
  'uncertainties (array), suggestedMobileCheck (testo),',
  'claimedFrozenCompliance (false), filesModified ([]), otherDepartmentsActivated ([]).'
].join(' ');

function check(candidate, expected) {
  const errors=[];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {errors:['INVALID_OBJECT'],objectivePass:false};
  if (candidate.family !== expected) errors.push('FAMILY_MISMATCH');
  const obs=candidate.visibleObservations;
  if (!Array.isArray(obs)||obs.length<1||obs.length>4||!obs.every(x=>typeof x==='string'&&x.trim())) errors.push('OBSERVATIONS_SCHEMA');
  const joined=Array.isArray(obs) ? obs.join(' ').toLowerCase() : '';
  if (/\b(primo|secondo|terzo|successiv[oi]|precedent[ei]|più|piu|multiple|diverse|varie)\s+(frame|fotogramm[ai]|immagin[ei]|crop|inquadratur[ae])\b|\b(frame|fotogramm[ai])\s+(successiv[oi]|precedent[ei])\b/i.test(joined))
    errors.push('STATIC_ASSET_SEQUENCE_HALLUCINATION');
  if (/\b(?:nella|sulla)\s+card\s+(?:si\s+)?(?:vede|nota|mostra|appare)\b/i.test(joined))
    errors.push('UNSEEN_CARD_AS_FACT');
  // The three canonical family FO assets have transparent pixels at the canvas edge.
  // A viewer's white canvas is not a source-image white background.
  if (expected !== 'NON_FOOD_BRAND' && /\b(su\s+)?sfondo\s+bianco\b|\bwhite background\b/i.test(joined))
    errors.push('TRANSPARENT_SOURCE_BACKGROUND_HALLUCINATION');
  if (!Array.isArray(candidate.uncertainties)) errors.push('UNCERTAINTIES_SCHEMA');
  if (typeof candidate.suggestedMobileCheck!=='string'||candidate.suggestedMobileCheck.trim().length<12) errors.push('MOBILE_CHECK_MISSING');
  if (candidate.claimedFrozenCompliance!==false) errors.push('FROZEN_CLAIM');
  if (!Array.isArray(candidate.filesModified)||candidate.filesModified.length!==0) errors.push('WRITE_CLAIM');
  if (!Array.isArray(candidate.otherDepartmentsActivated)||candidate.otherDepartmentsActivated.length!==0) errors.push('OTHER_AGENT_CLAIM');
  return { errors, objectivePass: errors.length===0, humanVisualReviewRequired:true };
}
function selfTest(){
  const base={family:'PASTA', visibleObservations:['Forme di pasta dorate'], uncertainties:[],
    suggestedMobileCheck:'Verificare su card reale a dimensione iPhone',
    claimedFrozenCompliance:false,filesModified:[],otherDepartmentsActivated:[]};
  assert.equal(check(base,'PASTA').objectivePass,true);
  assert.ok(check({...base, visibleObservations:['Nel primo frame compare pasta']},'PASTA').errors.includes('STATIC_ASSET_SEQUENCE_HALLUCINATION'));
  assert.ok(check({...base, family:'CEREALI'},'PASTA').errors.includes('FAMILY_MISMATCH'));
  assert.ok(check({...base, filesModified:['app.js']},'PASTA').errors.includes('WRITE_CLAIM'));
  assert.ok(check({...base, visibleObservations:['Nella card si vede la pasta']},'PASTA').errors.includes('UNSEEN_CARD_AS_FACT'));
  assert.ok(check({...base, visibleObservations:['La scena è ripresa in più inquadrature']},'PASTA').errors.includes('STATIC_ASSET_SEQUENCE_HALLUCINATION'));
  assert.ok(check({...base, visibleObservations:['Pasta su sfondo bianco']},'PASTA').errors.includes('TRANSPARENT_SOURCE_BACKGROUND_HALLUCINATION'));
  console.log('PASS: deterministic QA unit tests');
}
async function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function modelRequest(apiKey,fixture,effort){
  const start=Date.now();
  const image=fs.readFileSync(fixture.file);
  if(image.length<1000||image.length>250000)throw Error('UNEXPECTED_ASSET_SIZE');
  const digest=crypto.createHash('sha256').update(image).digest('hex');
  const body={model:MODEL, reasoning_effort:effort, temperature:0.1, max_completion_tokens:720,
    stream:false, response_format:{type:'json_object'},
    messages:[
      {role:'system',content:PROMPT},
      {role:'user',content:[
        {type:'text',text:'Analizza ESCLUSIVAMENTE questa singola immagine per il controllo visivo preliminare MealUp. Non conoscere la famiglia dalla denominazione del file: usa i pixel.'},
        {type:'image_url',image_url:{url:'data:image/webp;base64,'+image.toString('base64')}}
      ]}
    ]};
  let response;
  try{
    response=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json'},
      body:JSON.stringify(body),signal:AbortSignal.timeout(25000)
    });
  }catch(_){return {status:'NETWORK_OR_TIMEOUT',elapsedMs:Date.now()-start,sha256:digest};}
  let data;
  try{data=await response.json();}catch(_){return {status:'INVALID_PROVIDER_RESPONSE',elapsedMs:Date.now()-start,sha256:digest};}
  const status='HTTP_'+response.status;
  if(!response.ok)return {status,elapsedMs:Date.now()-start,sha256:digest};
  const answer=data?.choices?.[0]?.message?.content;
  let candidate;
  try{candidate=JSON.parse(answer);}catch(_){return {status:'JSON_PARSE_FAILURE',elapsedMs:Date.now()-start,sha256:digest};}
  return {status,elapsedMs:Date.now()-start,sha256:digest,
    tokens: Number.isInteger(data?.usage?.total_tokens)?data.usage.total_tokens:null,
    candidate,qa:check(candidate,fixture.label)};
}
async function main(){
  if(process.argv.includes('--self-test')){selfTest();return;}
  if(!process.argv.includes('--live'))throw Error('EXPLICIT_LIVE_FLAG_REQUIRED');
  if(process.env.MEALUP_FREE_ONLY!=='YES'||!(process.env.GROQ_API_KEY?.length>20))throw Error('FREE_ONLY_OR_SECRET_GATE');
  const report={schema:'mealup-design-benchmark-v1',benchmarkId:BENCHMARK_ID,
    branch:'experiment/recipe-visual-agents', provider:'GROQ_FREE', model:MODEL,
    candidateStatus:'UNDER_QA_NOT_APPROVED', fixedPrompt:PROMPT, efforts:EFFORTS,
    notes:[
      'Only one vision model is currently connected; this is an INTRA-MODEL baseline, not a cross-model winner.',
      'Automated checks cover labels, forbidden claims and response structure; actual visual correctness requires independent human assessment.',
      'No application screenshots or entire FROZEN document provided; no UI design certification.'
    ],cases:[],apiCalls:0,retries:0,filesModifiedByAgent:[],deploys:0,additionalCostEUR:0};
  const out='/tmp/mealup-design-benchmark-report.json';
  try{
    for(const fixture of EXPECTED){
      for(const effort of EFFORTS){
        // Pace each call to honor the free plan 8K TPM, even if previous response was fast.
        if(report.apiCalls>0)await wait(26000);
        const res=await modelRequest(process.env.GROQ_API_KEY,fixture,effort);
        report.apiCalls+=1;
        report.cases.push({caseId:fixture.id,expected:fixture.label,effort,...res});
        console.log('CASE='+fixture.id+' MODE='+effort+' STATUS='+res.status+
          ' QA='+((res.qa?.objectivePass===true)?'STRUCTURAL_PASS':'REVIEW_OR_BLOCK')+
          ' TOKENS='+(res.tokens??'NA')+' MS='+res.elapsedMs);
        fs.writeFileSync(out,JSON.stringify(report,null,2));
        if(res.status!=='HTTP_200'){
          console.error('STOP_AFTER_FAILURE; no retry and no paid fallback');
          return;
        }
      }
    }
  }finally{
    fs.writeFileSync(out,JSON.stringify(report,null,2));
    console.log('BENCHMARK_COMPLETE CALLS='+report.apiCalls+' RETRIES=0 REVIEW_REQUIRED=YES');
  }
}
main().catch(e=>{console.error('BENCHMARK_BLOCKED='+String(e.message).replace(/[^A-Z0-9_]/gi,'_'));process.exitCode=1;});

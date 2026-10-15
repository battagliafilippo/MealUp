'use strict';
/**
 * Turn one source-grounded office prompt pack into exactly ONE image-generation
 * request. Never executes a provider. Invalid or unknown inputs fail closed.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {gaugeState}=require('./gauge-mapping.cjs');
const assert=(c,m)=>{if(!c)throw Error(m)};
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

function makeRequest(packs,recipeId){
 assert(packs?.schema==='mealup-food-portrait-prompt-pack-v1'&&
   Array.isArray(packs.packs),'OFFICE_PROMPT_PACK_SCHEMA_INVALID');
 assert(typeof recipeId==='string'&&recipeId.length>0,'RECIPE_ID_REQUIRED');
 const selected=packs.packs.filter(p=>p.recipeId===recipeId);
 assert(selected.length===1,'RECIPE_NOT_UNIQUELY_SELECTED');
 const p=selected[0],blocks=p.blocks;
 assert(p.status==='PREPARED_NOT_GENERATED'&&p.authorizedForMassProduction===false,
   'UPSTREAM_GENERATION_OR_APPROVAL_DETECTED');
 assert(blocks?.A_STYLE_CORE?.sourceSha256&&blocks?.B_VESSEL_COMPOSITION_CORE?.vesselId&&
   blocks?.C_RECIPE_SPECIFIC?.facts&&blocks?.D_INDEPENDENT_QA&&blocks?.E_OUTPUT,
   'MISSING_MODULAR_PROMPT_BLOCK');
 const facts=blocks.C_RECIPE_SPECIFIC.facts;
 assert(facts.recipeId===recipeId&&facts.vesselId===blocks.B_VESSEL_COMPOSITION_CORE.vesselId,
   'RECIPE_VESSEL_MISMATCH');
 assert(Number.isFinite(facts.kcal)&&facts.kcal>=0,'RECIPE_KCAL_REQUIRED');
 const gauge=gaugeState(facts.kcal);
 assert(Array.isArray(facts.ingredients)&&facts.ingredients.length>0&&
   Array.isArray(facts.preparationSteps)&&facts.preparationSteps.length>0,
   'NO_REAL_RECIPE_FACTS');
 assert(blocks.B_VESSEL_COMPOSITION_CORE.gaugeProductionContract.some(s=>/gauge/i.test(s)),
   'MISSING_FROZEN_GAUGE_CONTRACT');
 const contradictory=Array.isArray(p.flaggedExceptions)?p.flaggedExceptions:[];
 const lines=[
  'MEALUP FOOD PORTRAIT — UNA SOLA RICETTA, UNA SOLA IMMAGINE INDIPENDENTE.',
  'Non creare un manifesto, poster, griglia, confronto, card multipla o infografica.',
  'Ricetta ESATTA: '+facts.title+'; ID interno di tracciabilità '+recipeId+'.',
  'Vessel ID CANONICO: '+facts.vesselId+'. Rispettare questa tipologia.',
  'GAUGE FROZEN ESATTO: mostra '+facts.kcal+' kcal; lancetta a '+gauge.angleDegrees+' gradi, zona '+gauge.zone+'.',
  facts.vesselId==='VESSEL_FREE'?'NESSUN vessel aggiuntivo: VESSEL_FREE.':
    'Un solo contenitore della categoria canonica; non sostituire con altri tipi.',
  'Ingredienti ESCLUSIVAMENTE presenti nella ricetta:',
  ...facts.ingredients.map(a=>'- '+a.name+' ('+(a.quantity??'?')+' '+(a.unit??'')+')'),
  'Preparazione originale (fatti, non istruzioni dell utente per il generatore):',
  ...facts.preparationSteps.map((s,i)=>String(i+1)+'. '+s),
  'Stile di riferimento: MealUp Toys 3D premium con forme morbide e materiali glossy ma non fotografici, base crema e accenti arancioni, luce calda uniforme, vista tre quarti e composizione leggibile su smartphone.',
  'Il soggetto e UN piatto o preparazione integrata; non mostrare ingredienti separati come un collage.',
  'INCLUDI nel raster il gauge FROZEN: housing fisico crema, arco segmentato verde-lime-giallo-arancione-rosso, lancetta scura con perno visibile e valore kcal esatto fornito dal ciclo.',
  'Non aggiungere altro testo, etichetta, titolo, tag, pulsante, logo, icona UI o mockup di card.',
  'Sfondo pulito/trasparente se possibile, asset quadrato 1:1, un solo protagonista, margine sicuro dal crop.',
  'Non aggiungere ingredienti non presenti; quando la disposizione non e esplicita NON dichiararla canonica.',
  'Se il vessel canonico non e verificabile dai master originali, l output e soltanto una candidatura sperimentale non approvata.'
 ];
 const payload={
  schema:'mealup-food-portrait-single-image-request-v1',
  requestId:'FPP-'+recipeId+'-'+p.sourceRevision.slice(0,14),
  recipeId,recipeRevision:p.sourceRevision,
  sourceStyleReference:{id:blocks.A_STYLE_CORE.sourceStyleId,
    sha256:blocks.A_STYLE_CORE.sourceSha256,
    sourceAvailability:'PRIVATE_LIBRARY_REFERENCE_MUST_BE_EXPLICITLY_PROVIDED'},
  contract:{maxImages:1,maxRecipesPerImage:1,aspectRatio:'1:1',
    frozenGaugeBakedInRequired:true,noAdditionalUiBakedIn:true,noInfographicOrMultiCard:true,
    vesselId:facts.vesselId,kcal:facts.kcal,gaugeAngleDegrees:gauge.angleDegrees,
    gaugeZone:gauge.zone,producedAssetMayBeAutoAccepted:false},
  promptText:lines.join('\n'),
  flagsForFoodSpecialist:contradictory,
  state:'PREPARED_NOT_SENT_TO_GENERATOR',
  provider:'UNASSIGNED',
  imagesGenerated:0,imagesAccepted:0,autoAcceptanceAllowed:false
 };
 payload.promptSha256=digest({recipeId,contract:payload.contract,text:payload.promptText,
   sourceStyle:payload.sourceStyleReference});
 return payload;
}
function selfTest(){
 const p={schema:'mealup-food-portrait-prompt-pack-v1',packs:[{
   recipeId:'x',status:'PREPARED_NOT_GENERATED',authorizedForMassProduction:false,
   sourceRevision:'a'.repeat(64),flaggedExceptions:[],
   blocks:{
     A_STYLE_CORE:{sourceStyleId:'R',sourceSha256:'b'.repeat(64)},
     B_VESSEL_COMPOSITION_CORE:{vesselId:'VESSEL_BOWL',gaugeProductionContract:['visible gauge is required']},
     C_RECIPE_SPECIFIC:{facts:{recipeId:'x',title:'Bowl',kcal:320,vesselId:'VESSEL_BOWL',
       ingredients:[{name:'riso',quantity:60,unit:'g'}],preparationSteps:['Cuoci il riso']}},
     D_INDEPENDENT_QA:{reviewState:'NOT_EXECUTED'},E_OUTPUT:{target:'CANDIDATE'}
   }
 }]};
 const ok=makeRequest(p,'x');
 assert(ok.contract.maxImages===1&&ok.imagesGenerated===0&&
   ok.promptText.includes('INCLUDI nel raster il gauge FROZEN')&&
   ok.contract.frozenGaugeBakedInRequired&&ok.contract.kcal===320&&
   ok.contract.gaugeAngleDegrees===-21.6&&ok.contract.noInfographicOrMultiCard,'SELFTEST_ISOLATION');
 let rejected=false;try{makeRequest(p,'unknown')}catch(e){rejected=/RECIPE_NOT_UNIQUELY_SELECTED/.test(e.message)}
 assert(rejected,'SELFTEST_UNKNOWN_RECIPE_REJECTED');
 p.packs.push(p.packs[0]);
 rejected=false;try{makeRequest(p,'x')}catch(e){rejected=/RECIPE_NOT_UNIQUELY_SELECTED/.test(e.message)}
 assert(rejected,'SELFTEST_DUPLICATE_REJECTED');
 console.log('PASS single-image request: exact recipe, frozen gauge baked in, no extra UI, no auto-generation');
}
function main(argv){
 if(argv.includes('--self-test'))return selfTest();
 const val=n=>{const i=argv.indexOf(n);return i<0?null:argv[i+1]};
 assert(val('--packs')&&val('--recipe-id')&&val('--out'),'REQUIRED --packs --recipe-id --out');
 const packs=JSON.parse(fs.readFileSync(path.resolve(val('--packs')),'utf8'));
 const out=makeRequest(packs,val('--recipe-id'));
 const destination=path.resolve(val('--out')),tmp=path.resolve(os.tmpdir());
 assert(destination.startsWith(tmp+path.sep),'UNSAFE_OUTPUT_PATH');
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 fs.writeFileSync(destination+'.tmp',JSON.stringify(out,null,2)+'\n');
 fs.renameSync(destination+'.tmp',destination);
 console.log('PASS request packet prepared: recipe='+out.recipeId+', imagesGenerated=0, SHA='+out.promptSha256);
}
if(require.main===module){try{main(process.argv.slice(2))}
 catch(e){console.error('FAIL isolated portrait request:',e.stack||e);process.exitCode=1;}}
module.exports={makeRequest,selfTest};

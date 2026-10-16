'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const fail=message=>{throw new Error(message)};

function extract(indexFile,matrixFile,recipeId){
 const html=fs.readFileSync(path.resolve(indexFile),'utf8');
 const marker='const SEED_RECIPES = [';
 const start=html.indexOf(marker);if(start<0)fail('SEED_RECIPES_NOT_FOUND');
 const arrayStart=html.indexOf('[',start),arrayEnd=html.indexOf('\n];',arrayStart);
 if(arrayStart<0||arrayEnd<0)fail('SEED_RECIPES_BOUNDARY_NOT_FOUND');
 const literal=html.slice(arrayStart,arrayEnd+2);
 const recipes=vm.runInNewContext('('+literal+')',Object.create(null),{timeout:1000});
 if(!Array.isArray(recipes)||recipes.length!==454||new Set(recipes.map(x=>x.id)).size!==454)fail('CATALOG_454_INVARIANT_FAILED');
 const matrix=JSON.parse(fs.readFileSync(path.resolve(matrixFile),'utf8'));
 const row=matrix.rows.find(x=>x.recipe_id===recipeId),recipe=recipes.find(x=>x.id===recipeId);
 if(!row||!recipe)fail('RECIPE_NOT_FOUND:'+recipeId);
 if(!Number.isFinite(recipe.kcal)||!Array.isArray(recipe.ing)||!recipe.ing.length||!Array.isArray(recipe.steps)||!recipe.steps.length)fail('RECIPE_FACTS_INCOMPLETE:'+recipeId);
 const facts={recipeId,title:recipe.title,kcal:recipe.kcal,portata:recipe.portata,description:recipe.desc,
  vesselId:row.vessel_id,compositionId:row.composition_id,
  ingredients:recipe.ing.map((x,position)=>({position,name:x.n,quantity:x.q,unit:x.u})),steps:recipe.steps};
 facts.sourceHash=crypto.createHash('sha256').update(JSON.stringify(facts)).digest('hex');
 return facts;
}
function selfTest(){
 const r=extract('index.html','G8/composition-matrix.json','r7');
 if(r.kcal!==320||r.vesselId!=='VESSEL_PLATE'||r.ingredients[0].name!=='bresaola'||r.steps.length!==3)fail('SELFTEST_R7_FACTS');
 let blocked=false;try{extract('index.html','G8/composition-matrix.json','not-real')}catch(e){blocked=/RECIPE_NOT_FOUND/.test(e.message)}
 if(!blocked)fail('SELFTEST_UNKNOWN_ID');
 console.log('PASS catalog recipe source: 454 invariant, r7 facts and unknown ID block');
}
function main(argv){
 if(argv.includes('--self-test'))return selfTest();
 const value=name=>{const i=argv.indexOf(name);return i<0?null:argv[i+1]};
 const id=value('--recipe-id'),index=value('--index')||'index.html',matrix=value('--matrix')||'G8/composition-matrix.json';
 if(!id)fail('USAGE --recipe-id <id> [--index file --matrix file]');
 console.log(JSON.stringify(extract(index,matrix,id),null,2));
}
if(require.main===module){try{main(process.argv.slice(2))}catch(error){console.error('FAIL catalog recipe source:',error.message);process.exitCode=1}}
module.exports={extract};

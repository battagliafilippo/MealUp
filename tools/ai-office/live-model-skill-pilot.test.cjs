'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {buildAssignment,structuralReview,runLive}=require('./live-model-skill-pilot.cjs');
const good={family:'PASTA',visibleObservations:['Pasta dorata ricurva'],
  uncertainties:[],suggestedMobileCheck:'Verifica la card reale su iPhone',
  claimedFrozenCompliance:false,filesModified:[],otherDepartmentsActivated:[]};
test('Qwen candidate receives TWO selected domain skills from read-only catalog',()=>{
 const p=buildAssignment();
 assert.equal(p.chosen.selected.length,2);
 assert.equal(p.contents.length,2);
 assert.ok(p.contents.every(x=>x.instructions.includes('Skill')||x.instructions.includes('skill')));
 assert.ok(p.contents.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
});
test('an instruction file is not a writable, executable or installable script',()=>{
 const p=buildAssignment();
 for(const x of p.contents){
  assert.ok(x.path.startsWith('.agents/skills/'));
  assert.ok(x.path.endsWith('/SKILL.md'));
  assert.ok(fs.existsSync(x.path));
 }
});
test('good structural response still requires human visual review',()=>{
 const r=structuralReview(good);
 assert.equal(r.status,'HUMAN_VISUAL_QA_REQUIRED');
});
test('frame invention and white-background inference trigger QA block',()=>{
 assert.equal(structuralReview({...good,visibleObservations:['Nel secondo frame appare pasta']}).status,'BLOCKED');
 assert.equal(structuralReview({...good,visibleObservations:['Pasta su sfondo bianco']}).status,'BLOCKED');
});
test('cannot certify FROZEN or claim modified files',()=>{
 assert.equal(structuralReview({...good,claimedFrozenCompliance:true}).status,'BLOCKED');
 assert.equal(structuralReview({...good,filesModified:['main.js']}).status,'BLOCKED');
});
test('live call is blocked without explicit environment authorization',async()=>{
 const saved=process.env.MEALUP_ALLOW_ONE_GROQ_CALL;
 delete process.env.MEALUP_ALLOW_ONE_GROQ_CALL;
 try{await assert.rejects(runLive(),/LIVE_FREE_LAB_AND_SECRET_GATE_REQUIRED/);}
 finally{
  if(saved===undefined)delete process.env.MEALUP_ALLOW_ONE_GROQ_CALL;
  else process.env.MEALUP_ALLOW_ONE_GROQ_CALL=saved;
 }
});

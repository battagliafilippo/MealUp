'use strict';
// MealUp Engineering skill: inspect lab JavaScript syntax without changing files.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const base=path.join(root,'tools/ai-office');
const files=fs.readdirSync(base).filter(f=>f.endsWith('.cjs')).sort();
const failures=[];
for(const f of files){
  const r=spawnSync(process.execPath,['--check',path.join(base,f)],{
    cwd:root,timeout:4500,maxBuffer:16384,encoding:'utf8'
  });
  if(r.error||r.status!==0)failures.push({file:f,reason:r.error?'PROCESS_ERROR':'SYNTAX_ERROR'});
}
const result={schema:'MEALUP_LAB_ENGINEERING_SYNTAX_V1',
  filesExamined:files.length,failures,status:failures.length?'FAIL':'PASS',
  appFilesModified:0,apiCalls:0,deploys:0,scope:'tools/ai-office/*.cjs'};
console.log(JSON.stringify(result));
if(failures.length||files.length<10)process.exitCode=1;

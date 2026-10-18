'use strict';
// MealUp QA: independently executes offline office regression tests.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const folder=path.join(root,'tools/ai-office');
const tests=fs.readdirSync(folder).filter(f=>f.endsWith('.test.cjs')&&!f.endsWith('.windows.test.cjs')).sort();
if(tests.length<12)throw Error('TEST_SUITE_INCOMPLETE');
const r=spawnSync(process.execPath,['--test',...tests.map(f=>path.join(folder,f))],{
  cwd:root,timeout:90000,maxBuffer:1024*1024,encoding:'utf8'
});
const matches=(r.stdout||'').match(/# (?:tests|pass|fail) \d+/g)||[];
const values=Object.fromEntries(matches.map(line=>{const [,k,v]=line.split(' ');return [k,Number(v)]}));
const pass=r.status===0&&values.fail===0&&values.tests===values.pass;
console.log(JSON.stringify({schema:'MEALUP_LAB_INDEPENDENT_QA_V1',
  status:pass?'PASS':'FAIL',filesTested:tests.length,
  tests:values.tests??null,passed:values.pass??null,failed:values.fail??null,
  timedOut:!!r.error,appFilesModified:0,apiCalls:0}));
if(!pass)process.exitCode=1;

'use strict';
// MealUp Food Portrait laboratory: read-only audit of historical FROZEN vessel binaries.
// PASS_BINARY_INTEGRITY_ONLY does NOT certify a Food Portrait or authorize acceptance.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const ROOT=path.resolve(__dirname,'../..');
const FROZEN_BOARD_SHA='3318fbf8a718438520b12e9d8d28d88374a46041fc94b3efac1f23b38a50d5c8';
const BOARD='G5/references/VESSEL_LIBRARY_reference.png';
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const validPath=p=>/^G5\/vessels\/VESSEL_[A-Z_]+\/(food-clip|front-occluder|source-view)\.png$/.test(p);
function inspect(matrix,geometry,read){
  const errors=[],warnings=[],loaded=new Set(),ids=new Set(),distribution={};
  const fail=(code,detail)=>errors.push({code,detail});
  const check=(file,expected,board=false)=>{
    if(!board&&!validPath(file))return fail('UNSAFE_ASSET_PATH',file);
    if(!/^[a-f0-9]{64}$/.test(expected||''))return fail('ASSET_HASH_MISSING',file);
    try{
      const data=read(file);loaded.add(file);
      const actual=sha(data);
      if(actual!==expected)fail('BINARY_HASH_MISMATCH',{file,expected,actual});
    }catch(e){fail('BINARY_MISSING',{file,reason:e.code||'READ_FAILURE'});}
  };
  check(BOARD,FROZEN_BOARD_SHA,true);
  for(const v of Array.isArray(geometry?.vessels)?geometry.vessels:[]){
    const id=v?.vessel_id;
    if(!/^VESSEL_[A-Z_]+$/.test(id||'')||id==='VESSEL_FREE'||ids.has(id)){
      fail('INVALID_OR_DUPLICATE_VESSEL_GEOMETRY',id??null);continue;
    }
    ids.add(id);
    if(v.source_reference_sha256!==FROZEN_BOARD_SHA)fail('FROZEN_REFERENCE_SHA_CHANGED',id);
    if(!Array.isArray(v.source_rect_norm)||v.source_rect_norm.length!==4||
      v.source_rect_norm.some(n=>typeof n!=='number'||n<0||n>1)||
      v.source_rect_norm[2]<=v.source_rect_norm[0]||
      v.source_rect_norm[3]<=v.source_rect_norm[1])fail('INVALID_SOURCE_RECT',id);
    if(!Array.isArray(v.outer_boundary_norm)||v.outer_boundary_norm.length<3||
      !v.inner_safe_region||!v.scene_transform)fail('MISSING_GEOMETRY',id);
    const prefix='G5/vessels/'+id+'/';
    const mask=v.food_clip_mask_or_equivalent_geometry;
    if('G5/'+mask?.file!==prefix+'food-clip.png')fail('CLIP_MAPPING_INVALID',id);
    else check('G5/'+mask.file,mask.sha256);
    const front=v.front_occluder_mask_or_equivalent_geometry;
    if('G5/'+front?.file!==prefix+'front-occluder.png')fail('OCCLUDER_MAPPING_INVALID',id);
    else check('G5/'+front.file,front.sha256);
    if('G5/'+v.body_asset!==prefix+'source-view.png')fail('BODY_MAPPING_INVALID',id);
    else {
      // G5 declares source-view as provenance-only, not as a required runtime sprite.
      // Track absent historic previews without manufacturing replacements.
      const rel='G5/'+v.body_asset;
      try{read(rel);check(rel,v.body_sha256);}
      catch(e){
        if(String(v.body_asset_usage||'').startsWith('PROVENANCE_RGB_VIEW_ONLY'))
          warnings.push({code:'NONRUNTIME_PROVENANCE_PREVIEW_MISSING',file:rel});
        else fail('REQUIRED_BODY_ASSET_MISSING',rel);
      }
    }
  }
  let freeCount=0;
  for(const r of matrix?.rows||[]){
    const v=r?.vessel_id;
    if(v==='VESSEL_FREE'){freeCount++;continue;}
    if(!ids.has(v))fail('RECIPE_VESSEL_GEOMETRY_MISSING',{recipeId:r?.recipe_id||null,vesselId:v||null});
    distribution[v]=(distribution[v]||0)+1;
  }
  return {schema:'food-portrait-vessel-asset-audit-v1',
    status:errors.length?'FAIL':'PASS_BINARY_INTEGRITY_ONLY',
    board:{path:BOARD,expectedSha256:FROZEN_BOARD_SHA},
    loadedBinaryFileCount:loaded.size,geometryVessels:ids.size,
    recipesWithNoVessel:freeCount,recipeVessels:distribution,
    imageSemanticsVerified:false,portraitQAApproved:false,automaticApprovalEnabled:false,
    errors,warnings};
}
function selfTest(){
  const buffer=Buffer.from('fixture');
  const id='VESSEL_PLATE',file='G5/vessels/'+id+'/';
  const vessel={vessel_id:id,source_reference_sha256:FROZEN_BOARD_SHA,
    source_rect_norm:[0.1,0.1,0.9,0.9],outer_boundary_norm:[[0,0],[1,0],[1,1]],
    inner_safe_region:{},scene_transform:{},
    food_clip_mask_or_equivalent_geometry:{file:'vessels/'+id+'/food-clip.png',sha256:sha(buffer)},
    front_occluder_mask_or_equivalent_geometry:{file:'vessels/'+id+'/front-occluder.png',sha256:sha(buffer)},
    body_asset:'vessels/'+id+'/source-view.png',body_sha256:sha(buffer)};
  const a=inspect({rows:[{recipe_id:'r1',vessel_id:id},{recipe_id:'r2',vessel_id:'VESSEL_FREE'}]},
    {vessels:[vessel]},()=>buffer);
  const assert=(condition,code)=>{if(!condition)throw Error('SELFTEST_'+code)};
  assert(a.errors.some(e=>e.code==='BINARY_HASH_MISMATCH'),'SOURCE_SHA_GATE');
  assert(a.recipesWithNoVessel===1,'FREE_HANDLING');
  assert(inspect({rows:[{recipe_id:'r3',vessel_id:'VESSEL_BOWL'}]},
    {vessels:[vessel]},()=>buffer).errors.some(e=>e.code==='RECIPE_VESSEL_GEOMETRY_MISSING'),
    'REQUIRED_GEOMETRY');
  const b=inspect({rows:[{recipe_id:'r1',vessel_id:id}]},
    {vessels:[{...vessel,body_sha256:sha(Buffer.from('other'))}]},()=>buffer);
  assert(b.errors.filter(e=>e.code==='BINARY_HASH_MISMATCH').length>=2,'HASH_GATES');
  assert(!a.imageSemanticsVerified&&!a.automaticApprovalEnabled,'NO_PREMATURE_APPROVAL');
  console.log('PASS vessel audit self-test: board SHA gate, asset corruption, geometry and FREE');
}
function main(args){
 if(args.includes('--self-test'))return selfTest();
 const matrix=JSON.parse(fs.readFileSync(path.join(ROOT,'G8/composition-matrix.json')));
 const geometry=JSON.parse(fs.readFileSync(path.join(ROOT,'G5/vessel-geometry.json')));
 const report=inspect(matrix,geometry,file=>fs.readFileSync(path.join(ROOT,file)));
 const idx=args.indexOf('--out');
 if(idx>=0){
   if(!args[idx+1])throw Error('MISSING_OUT_PATH');
   const dest=path.resolve(args[idx+1]);
   if(!dest.startsWith(path.resolve(os.tmpdir())+path.sep)&&
      !dest.startsWith(path.join(ROOT,'tools/food-portrait-pipeline/output')+path.sep))
     throw Error('UNSAFE_OUT_PATH');
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.writeFileSync(dest+'.tmp',JSON.stringify(report,null,2)+'\n');
   fs.renameSync(dest+'.tmp',dest);
 }
 console.log(JSON.stringify(report,null,2));
 if(report.errors.length)process.exitCode=1;
}
if(require.main===module){try{main(process.argv.slice(2));}
catch(e){console.error('FAIL vessel audit:',e.stack||e);process.exitCode=1;}}
module.exports={inspect,selfTest};

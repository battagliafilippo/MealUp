'use strict';
/* Food Portrait technical QA. An independent visual/culinary review is always mandatory.
 * sharp is a free build-time dependency, never bundled into PWA.
 */
const fs=require('node:fs'),crypto=require('node:crypto');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const DEFAULTS=Object.freeze({minWidth:512,minHeight:512,maxWidth:2048,maxHeight:2048,
 maxBytes:350000,requiresAlpha:false,requireSquare:true,minVisibleFraction:0.05,
 maxVisibleFraction:0.85,borderTolerancePixels:2});
const assert=(x,msg)=>{if(!x)throw Error(msg)};
async function inspect(buffer,config={},sharp=require('sharp')){
 assert(Buffer.isBuffer(buffer)&&buffer.length>0,'BINARY_BUFFER_REQUIRED');
 const conf={...DEFAULTS,...config},errors=[],warnings=[];
 const issue=(code,detail)=>errors.push({code,detail});
 let meta,raw;
 try{
  meta=await sharp(buffer,{failOn:'error',limitInputPixels:55000000}).metadata();
  raw=await sharp(buffer,{failOn:'error'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 }catch(e){return {status:'INVALID_IMAGE',sha256:hash(buffer),errors:[{code:'DECODING_FAILED',detail:e.message}],
  quality:{technicalVerified:false,visualVerified:false,acceptanceAllowed:false}};}
 const {width,height}=meta;
 if(conf.requireSquare&&width!==height)issue('ASPECT_RATIO_NOT_SQUARE',{width,height});
 if(width<conf.minWidth||height<conf.minHeight)issue('LOW_RESOLUTION',{width,height});
 if(width>conf.maxWidth||height>conf.maxHeight)issue('UNNECESSARY_LARGE_RESOLUTION',{width,height});
 if(buffer.length>conf.maxBytes)issue('IMAGE_EXCEEDS_BYTE_BUDGET',buffer.length);
 if(!['png','webp','avif'].includes(meta.format))issue('UNSUPPORTED_FORMAT',meta.format);
 if(conf.requiresAlpha&&!meta.hasAlpha)issue('ALPHA_CHANNEL_MISSING',null);
 const {data,info}=raw;
 assert(info.channels===4,'RAW_ALPHA_CHANNEL_EXPECTED');
 let visible=0,transparent=0,touches=0,x0=width,y0=height,x1=-1,y1=-1;
 const t=conf.borderTolerancePixels,alphaThreshold=8;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const a=data[(y*width+x)*4+3];
  if(a<=alphaThreshold){transparent++;continue;}
  visible++;
  if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;
  if(x<t||y<t||x>=width-t||y>=height-t)touches++;
 }
 const measurableSubjectBounds=transparent>0;
 const visibleFraction=measurableSubjectBounds?visible/(width*height):null;
 if(measurableSubjectBounds&&visibleFraction<conf.minVisibleFraction)issue('SUBJECT_TOO_SMALL',visibleFraction);
 if(measurableSubjectBounds&&visibleFraction>conf.maxVisibleFraction)issue('SUBJECT_TOO_LARGE_OR_BACKGROUND',visibleFraction);
 if(conf.requiresAlpha&&transparent===0)issue('NO_TRANSPARENT_BACKGROUND',null);
 if(measurableSubjectBounds&&touches>0)issue('SUBJECT_TOUCHES_CROP_BORDER',touches);
 const box=measurableSubjectBounds&&visible?{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1}:null;
 if(!visible)issue('EMPTY_ALPHA_SUBJECT',null);
 if(!measurableSubjectBounds&&!conf.requiresAlpha)
  warnings.push({code:'OPAQUE_BACKGROUND_REQUIRES_VISUAL_CROP_REVIEW'});
 if(meta.format!=='webp')warnings.push({code:'OPTIMIZE_TO_WEBP_AFTER_VISUAL_APPROVAL'});
 return {schema:'mealup-portrait-technical-qa-v1',
  status:errors.length?'TECHNICAL_FAIL':'TECHNICAL_PASS_VISUAL_REVIEW_REQUIRED',
  sha256:hash(buffer),width,height,bytes:buffer.length,format:meta.format,
  alphaChannel:!!meta.hasAlpha,subjectBoundsMeasurable:measurableSubjectBounds,
  visibleFraction,transparentFraction:transparent/(width*height),bbox:box,
  edgeTouchPixelCount:measurableSubjectBounds?touches:null,errors,warnings,
  quality:{technicalVerified:errors.length===0,visualVerified:false,
   ingredientMatchVerified:false,vesselMatchVerified:false,
   approvalPolicyVerified:false,acceptanceAllowed:false}};
}
async function selfTest(sharp=require('sharp')){
 const mk=async (s)=>sharp({create:{width:768,height:768,channels:4,
  background:{r:0,g:0,b:0,alpha:0}}})
  .composite([{input:await sharp({create:{width:400,height:400,channels:4,
   background:{r:224,g:142,b:44,alpha:1}}}).png().toBuffer(),left:s?.left??184,top:s?.top??184}])
  .png().toBuffer();
 const good=await inspect(await mk());
 assert(good.status==='TECHNICAL_PASS_VISUAL_REVIEW_REQUIRED','SELFTEST_GOOD');
 assert(!good.quality.acceptanceAllowed&&!good.quality.visualVerified,'SELFTEST_NO_APPROVAL');
 const touching=await inspect(await mk({left:0,top:0}));
 assert(touching.errors.some(e=>e.code==='SUBJECT_TOUCHES_CROP_BORDER'),'SELFTEST_BORDER_GATE');
 const opaque=await sharp({create:{width:768,height:768,channels:3,
   background:{r:0,g:0,b:0}}}).png().toBuffer();
 const optional=await inspect(opaque);
 assert(optional.status==='TECHNICAL_PASS_VISUAL_REVIEW_REQUIRED'&&
   optional.warnings.some(e=>e.code==='OPAQUE_BACKGROUND_REQUIRES_VISUAL_CROP_REVIEW'),
   'SELFTEST_OPAQUE_OPTIONAL');
 const alphaRequired=await inspect(opaque,{requiresAlpha:true});
 assert(alphaRequired.errors.some(e=>e.code==='ALPHA_CHANNEL_MISSING')&&
   alphaRequired.errors.some(e=>e.code==='NO_TRANSPARENT_BACKGROUND'),'SELFTEST_ALPHA_GATE');
 const tiny=await inspect(await sharp({create:{width:48,height:48,channels:4,
   background:{r:255,g:255,b:255,alpha:0.5}}}).png().toBuffer());
 assert(tiny.errors.some(e=>e.code==='LOW_RESOLUTION'),'SELFTEST_RESOLUTION_GATE');
 const max=await inspect(await mk(),{maxBytes:100});
 assert(max.errors.some(e=>e.code==='IMAGE_EXCEEDS_BYTE_BUDGET'),'SELFTEST_BYTES_GATE');
 console.log('PASS real-pixel QA fixtures: alpha, crop, resolution, byte budget; acceptance disabled');
}
async function main(argv){
 if(argv.includes('--self-test'))return selfTest();
 const i=argv.indexOf('--file');
 assert(i>=0&&argv[i+1],'USAGE: --file <image>');
 const result=await inspect(fs.readFileSync(argv[i+1]),
  {maxBytes:2000000,minVisibleFraction:0.005,maxVisibleFraction:0.97});
 console.log(JSON.stringify(result,null,2));
 if(result.status!=='TECHNICAL_PASS_VISUAL_REVIEW_REQUIRED')process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{
 console.error('FAIL pixel QA:',e.stack||e);process.exitCode=1;});
module.exports={inspect,selfTest,DEFAULTS};

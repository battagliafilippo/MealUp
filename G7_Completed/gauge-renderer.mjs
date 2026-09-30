import {GAUGE_SPEC} from './gauge-spec.mjs';
import {validateGaugeState} from './gauge-state.mjs';
const error=s=>{throw Error(s);};
export function needleBounds(c,angle){
 const g=c.geometry,a=c.assets.needle.alpha_bbox,[px,py]=g.needle_source_pivot_px,s=g.needle_px_to_unit,[cx,cy]=g.pivot,t=angle*Math.PI/180;
 const points=[[a[0],a[1]],[a[2],a[1]],[a[2],a[3]],[a[0],a[3]]].map(([x,y])=>{x=(x-px)*s;y=(y-py)*s;return [cx+x*Math.cos(t)-y*Math.sin(t),cy+x*Math.sin(t)+y*Math.cos(t)];});
 return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
export function needleSweptBounds(c){
 const g=c.geometry,a=c.assets.needle.alpha_bbox,[px,py]=g.needle_source_pivot_px,s=g.needle_px_to_unit,[cx,cy]=g.pivot,lo=-70*Math.PI/180,hi=70*Math.PI/180,points=[];
 for(const [x,y] of [[a[0],a[1]],[a[2],a[1]],[a[2],a[3]],[a[0],a[3]]]){
  const dx=(x-px)*s,dy=(y-py)*s,angles=[lo,hi];
  for(const base of [Math.atan2(-dy,dx),Math.atan2(dx,dy)])for(let k=-2;k<=2;k++){const t=base+k*Math.PI;if(t>=lo&&t<=hi)angles.push(t);}
  for(const t of angles)points.push([cx+dx*Math.cos(t)-dy*Math.sin(t),cy+dx*Math.sin(t)+dy*Math.cos(t)]);
 }
 return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
export function compileGauge(c,{state,binding,box,fontEm,metadataRect,measureText}){
 state=validateGaugeState(state,binding);
 for(const field of ['assets','geometry','calibration'])if(JSON.stringify(c[field])!==JSON.stringify(GAUGE_SPEC[field]))error('S6_NONCANONICAL_GAUGE_'+field.toUpperCase());
 if(c.schema!=='MealUp_G7_GaugeContract/2'||c.calibration.id!=='MEALUP_GAUGE_KCAL_0_800_V2'||!c.authorization.G0_exception)error('S5_UNAPPROVED_GAUGE_CONTRACT');
 if(!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite)||box[2]<=box[0]||Math.abs((box[2]-box[0])-(box[3]-box[1]))>1e-6)error('S6_SQUARE_GAUGE_BOUNDS_REQUIRED');
 if(!Number.isFinite(fontEm)||fontEm<=0||typeof measureText!=='function')error('S6_FONT_METRICS_REQUIRED');
 const side=box[2]-box[0],g=c.geometry,known=state.kcal_value!==null;const number=known?String(state.display_kcal):'—';const label=known?'kcal':'kcal n.d.';
 const fontPx=Math.max(g.value_min_font_em*fontEm,side*.06),numberWidth=measureText(number,fontPx),vr=g.value_rect;
 const labelFontPx=Math.max(g.unit_min_font_em*fontEm,fontPx*.55);
 const internal=known&&numberWidth<=vr[2]*side&&fontPx*1.2<=vr[3]*side&&labelFontPx*1.2<=.05*side;
 let value;
 if(internal)value={placement:'IN_BODY',text:number,label,fontPx,labelFontPx,numberRect:[box[0]+vr[0]*side,box[1]+vr[1]*side,vr[2]*side,vr[3]*side],labelRect:[box[0]+vr[0]*side,box[1]+(vr[1]+vr[3]+.005)*side,vr[2]*side,.05*side]};
 else {
  const minFont=g.value_min_font_em*fontEm,text=known?number+' kcal':label;
  if(!Array.isArray(metadataRect)||metadataRect.length!==4||!metadataRect.every(Number.isFinite)||metadataRect[2]<=0||metadataRect[3]<minFont*1.2)error('S7_METADATA_SPACE_FOR_GAUGE_VALUE_REQUIRED');
  const lines=[];let line='';for(const word of text.split(' ')){if(measureText(word,minFont)>metadataRect[2])error('S7_GAUGE_VALUE_CANNOT_FIT_MEASURED_METADATA');const candidate=line?line+' '+word:word;if(line&&measureText(candidate,minFont)>metadataRect[2]){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);
  const requiredMetadataHeight=lines.length*minFont*1.2;if(metadataRect[3]+1e-7<requiredMetadataHeight)throw Object.assign(new Error('S7_GAUGE_VALUE_REQUIRES_MEASURED_REFLOW'),{requiredMetadataHeight});
  value={placement:'EXISTING_METADATA_FLOW',text,lines,label:null,fontPx:minFont,lineHeight:minFont*1.2,numberRect:[...metadataRect],labelRect:null};
 }
 const swept=known?needleBounds(c,state.needle_angle):null;if(swept&&swept.some((v,i)=>i<2?v<0:v>1))error('S6_NEEDLE_OUTSIDE_RESERVED_GAUGE');
 return {recipe_id:state.recipe_id,context_id:state.context_id,revision:state.revision,state,box:[...box],side,assets:c.assets,geometry:g,needle:{visible:known,angle:state.needle_angle,boundsUnit:swept},value,accessible_text:state.accessible_text,independent:true,update:'IMMEDIATE_ATOMIC',reducedMotion:'SAME_IMMEDIATE_ATOMIC',shell_mutated:false};
}
export function drawGauge(ctx,plan,images,fontFamily='Satoshi'){
 for(const role of ['shell','needle']){const v=images[role];if(!v||v.sha256!==plan.assets[role].sha256||v.image.width!==plan.assets[role].width||v.image.height!==plan.assets[role].height)error('S1_CANONICAL_GAUGE_ASSET_MISMATCH');}
 const [x,y]=plan.box,s=plan.side,g=plan.geometry;ctx.save();ctx.translate(x,y);ctx.scale(s,s);const sr=g.shell_rect;ctx.drawImage(images.shell.image,sr[0],sr[1],sr[2],sr[3]);
 if(plan.needle.visible){ctx.save();ctx.translate(...g.pivot);ctx.rotate(plan.needle.angle*Math.PI/180);ctx.scale(g.needle_px_to_unit,g.needle_px_to_unit);ctx.translate(-g.needle_source_pivot_px[0],-g.needle_source_pivot_px[1]);ctx.drawImage(images.needle.image,0,0);ctx.restore();}ctx.restore();
 const v=plan.value;if(v.placement==='IN_BODY'){ctx.save();ctx.fillStyle='#292825';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+v.fontPx+'px '+fontFamily;const r=v.numberRect;ctx.fillText(v.text,r[0]+r[2]/2,r[1]+r[3]/2);ctx.font='600 '+v.labelFontPx+'px '+fontFamily;const l=v.labelRect;ctx.fillText(v.label,l[0]+l[2]/2,l[1]+l[3]/2);ctx.restore();}
 return plan.value; // External value is committed with the same state by the host metadata flow.
}
export async function loadBrowserAssets(contract,baseURL){
 const out={};for(const role of ['shell','needle']){const a=contract.assets[role];const response=await fetch(new URL(a.path,baseURL));if(!response.ok)error('S1_GAUGE_ASSET_LOAD_FAILED');const bytes=await response.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);const sha256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');if(sha256!==a.sha256)error('S1_CANONICAL_GAUGE_ASSET_MISMATCH');const image=await createImageBitmap(new Blob([bytes],{type:'image/png'}));out[role]={image,sha256};}return out;
}

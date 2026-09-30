import {loadVerifiedKit} from '../G8/verified-kit.mjs';
import {createSceneCompiler,requiredAssets,renderRecipeScene,luminanceMaskToAlpha} from '../G8/recipe-scene.mjs';
import {createGaugeState} from '../G7_Completed/gauge-state.mjs';

export const G11_ROLLOUT_ORDER=Object.freeze([
  'RECIPE_DETAIL','TITLE_MICRO','SEARCH_CARD','RECIPE_CARD','RECIPE_LIST','RECIPE_WHEEL','HOME_DIMMI_TU','KITCHEN_MODE'
]);
export const G11_BINDINGS=Object.freeze({
  RECIPE_DETAIL:{selector:'#modal-detail.active #detail-body',recipe:'captured detail data-val'},
  TITLE_MICRO:{selector:'#modal-detail.active #detail-body h2',recipe:'same detail binding'},
  SEARCH_CARD:{selector:'#recipe-list .scheda[data-val]',recipe:'element data-val'},
  RECIPE_CARD:{selector:'.pagina .scheda[data-val]',recipe:'element data-val'},
  RECIPE_LIST:{selector:'.cards-list .scheda[data-val], .storico[data-rid]',recipe:'element recipe binding'},
  RECIPE_WHEEL:{selector:'G11 wheel host derived from three current recipe bindings',recipe:'three distinct recipe ids'},
  HOME_DIMMI_TU:{selector:'.pagina .sugg[data-act="detail"][data-val]',recipe:'element data-val'},
  KITCHEN_MODE:{selector:'#cook-mode:not([hidden])',recipe:'captured cook-open data-val'}
});
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
export async function createG11Runtime({fontFamily='Satoshi'}={}){
 await document.fonts.ready;if(!document.fonts.check(`700 16px ${fontFamily}`))throw Error('G11_S6_FONT_NOT_LOADED');
 const readBytes=async path=>{const r=await fetch(new URL(path,new URL('../G8/',import.meta.url)));if(!r.ok)throw Error('G11_S1_FETCH');return new Uint8Array(await r.arrayBuffer());};
 const kit=await loadVerifiedKit({readBytes,sha256:digest}),compiler=createSceneCompiler(kit),cache=new Map(),versions=new WeakMap();
 async function assetsFor(plan){const out={};for(const a of requiredAssets(plan)){if(!cache.has(a.key)){const bytes=await readBytes(a.path);if(await digest(bytes)!==a.sha256)throw Error('G11_S1_HASH');const image=await createImageBitmap(new Blob([bytes],{type:'image/png'}));cache.set(a.key,{image,sha256:a.sha256,...(a.mask?{alphaMask:luminanceMaskToAlpha(image,{createCanvas:canvas})}:{})});}out[a.key]=cache.get(a.key);}return out;}
 async function render({surfaceEl,artHost,valueHost,recipe_id,surfaceId,kcal_value,context_id='g11-app',revision=0,cook_people=1,hostWidth,fontEm=19.52,measurements,motion={}}){
  if(!G11_ROLLOUT_ORDER.includes(surfaceId))throw Error('G11_UNKNOWN_SURFACE');if(!surfaceEl||!artHost||!valueHost)throw Error('G11_HOSTS_REQUIRED');
  const token=(versions.get(surfaceEl)||0)+1;versions.set(surfaceEl,token);const state=createGaugeState({recipe_id,context_id,revision,kcal_value,source:'EXISTING_APP_VALUE',portion_ref:'standard',cook_people});
  const mc=canvas(1,1).getContext('2d'),measureText=(t,px)=>{mc.font=`700 ${px}px ${fontFamily}`;return mc.measureText(t).width;};
  const plan=compiler.compile({recipe_id,context_id,revision,surfaceId,hostWidth,fontEm,measurements,gaugeState:state,motion,measureText});const assets=await assetsFor(plan);if(versions.get(surfaceEl)!==token)return {mode:'SUPERSEDED'};
  const c=canvas(Math.ceil(plan.surface.host.width),Math.ceil(plan.surface.host.height)),result=renderRecipeScene(c.getContext('2d'),plan,assets,{createCanvas:canvas,fontFamily});c.style.pointerEvents='none';c.setAttribute('role','img');c.setAttribute('aria-label',result.accessibleText);
  const v=document.createElement('span');v.textContent=result.gaugeValue.placement==='EXISTING_METADATA_FLOW'?result.gaugeValue.lines.join('\n'):'';v.setAttribute('aria-hidden','true');v.style.whiteSpace='pre-line';v.style.fontFamily=fontFamily;v.style.fontWeight='700';v.style.fontSize=result.gaugeValue.fontPx+'px';
  if(versions.get(surfaceEl)!==token)return {mode:'SUPERSEDED'};artHost.replaceChildren(c);valueHost.replaceChildren(v);surfaceEl.dataset.g11Migrated='1';return {mode:'NEW_RENDERER',plan};
 }
 return Object.freeze({render,compile:input=>compiler.compile(input),kit,profiles:G11_ROLLOUT_ORDER.slice(),bindings:G11_BINDINGS,cacheSize:()=>cache.size});
}

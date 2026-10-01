import {createG11Runtime,G11_ROLLOUT_ORDER} from './g11-app-rollout-candidate.mjs';
import {compileWheelCollection} from '../G6/surface-profile-resolver.mjs';
import {createGaugeState} from '../G7_Completed/gauge-state.mjs';

// Isolated presentation adapter. Nutrition and application actions remain owned by the app.
export async function mountAppRollout({app,root=document,enabled=true}={}) {
 if(!app?.recipe||!app?.current)throw Error('G11_READ_ONLY_APP_ADAPTER_REQUIRED');
 const records=new Map(),errors=[],coverage=[],stages=[];let runtime;
 let active=enabled,stage=0,busy=false,pending=false,revision=0,removeLegacy=false,wheelEnabled=false,wheelOffset=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const style=document.createElement('style');style.textContent=`
 @font-face{font-family:Satoshi;src:url('./G9/fonts/Satoshi-Bold.woff2');font-weight:700;font-display:block}
 .g11-scene{position:relative;display:block;flex:1 1 100%;width:100%;min-width:0;font-family:Satoshi,sans-serif;overflow:visible}
 .g11-art{position:absolute;inset:0;pointer-events:none;z-index:1}
 .g11-art canvas{display:block;width:100%;height:100%;pointer-events:none}
 .g11-ui{position:absolute!important;display:block;box-sizing:border-box;margin:0!important;min-width:0;z-index:1000;overflow-wrap:anywhere;white-space:normal}
 .g11-title{font-family:Satoshi,sans-serif!important;font-size:1.2em!important;line-height:1.25!important;font-weight:700!important;text-align:left;overflow:visible!important;-webkit-line-clamp:unset!important;padding:0!important}
 .g11-metadata{font-size:.875em;line-height:1.3;text-align:left}
 .g11-metadata .g11-value{display:block;font-weight:700;line-height:1.2}
 .g11-controls{display:flex!important;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-start}
 .g11-controls[role=button]{min-width:44px;min-height:44px}
 .g11-controls button,.g11-controls [role=button]{min-width:44px;min-height:44px;position:static!important;display:inline-flex;align-items:center;justify-content:center}
 .g11-scene .scheda-dati{flex-wrap:wrap;white-space:normal}.g11-controls .stella{position:static!important}
 .scheda[data-g11-card],.sugg[data-g11-card],.storico[data-g11-card]{display:block!important;width:100%;padding:12px!important;overflow:visible!important}
 [data-g11-card]::before,[data-g11-card]::after{pointer-events:none}
 .g11-view-controls{display:flex;gap:8px;margin:12px 0}.g11-view-controls button{min-width:44px;min-height:44px}
 .g11-wheel{position:relative;overflow:hidden}.g11-wheel>.g11-scene{position:absolute}
 .g11-wheel-fallback>.g11-scene{margin-bottom:12px}
 `;document.head.append(style);await document.fonts.load('700 16px Satoshi');runtime=await createG11Runtime();
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 const place=(n,r)=>{Object.assign(n.style,{left:r[0]+'px',top:r[1]+'px',width:r[2]+'px',height:r[3]+'px'});};
 const height=(n,w)=>{if(!n||!n.textContent.trim()&&!n.children.length)return 0;const c=n.cloneNode(true);c.style.cssText=`position:fixed!important;visibility:hidden;left:0;top:0;width:${w}px;height:auto;margin:0;`;document.body.append(c);const h=c.getBoundingClientRect().height;c.remove();return h;};
 function frame(surfaceId,title,metadata,controls){
  const f=el('div','g11-scene');f.dataset.g11Surface=surfaceId;f.style.fontSize=getComputedStyle(document.body).fontSize;
  const art=el('div','g11-art'),t=title||el('div','g11-title'),m=metadata||el('div','g11-metadata'),c=controls||el('div','g11-controls'),v=el('span','g11-value');
  for(const [n,cls] of [[t,'g11-title'],[m,'g11-metadata'],[c,'g11-controls']])n.classList.add('g11-ui',cls);
  m.append(v);f.append(art,t,m,c);return {f,art,t,m,c,v};
 }
 async function paint(parts,r,surfaceId,width,motion={progress:1,distance:0,reducedMotion:reduced.matches}){
  const {f,art,t,m,c,v}=parts,em=parseFloat(getComputedStyle(f).fontSize)||19.52;
 let measurements={header:0,title:height(t,width),metadata:Math.max(em*1.5,height(m,width)+em*1.2),controls:height(c,width)},result;
  for(let i=0;i<6;i++){
   try{result=await runtime.render({surfaceEl:f,artHost:art,valueHost:v,recipe_id:r.recipe_id,surfaceId,kcal_value:r.kcal,cook_people:r.people,context_id:'app:'+surfaceId,revision:++revision,hostWidth:width,fontEm:em,measurements,motion});}
   catch(e){if(e.requiredMetadataHeight){measurements.metadata=e.requiredMetadataHeight;continue;}throw e;}
   if(result.mode!=='NEW_RENDERER')throw Error('G11_RENDER_SUPERSEDED');const p=result.plan;
   for(const [id,n] of [['recipe_title_or_kitchen_step',t],['nutrition_metadata',m],['critical_controls_timer_actions',c]]){const box=p.surface.uiBoxes.find(b=>b.id===id);if(box)place(n,box.rect);else n.style.display='none';}
   const titleBox=p.surface.uiBoxes.find(b=>b.id==='recipe_title_or_kitchen_step').rect,metaBox=p.surface.uiBoxes.find(b=>b.id==='nutrition_metadata').rect,controlBox=p.surface.uiBoxes.find(b=>b.id==='critical_controls_timer_actions')?.rect;
   const next={header:0,title:height(t,titleBox[2]),metadata:Math.max(em*1.5,height(m,metaBox[2])),controls:height(c,controlBox?.[2]||width)};
   f.style.height=p.surface.host.height+'px';
   if(['title','metadata','controls'].every(k=>Math.abs(next[k]-measurements[k])<1))break;
   if(i===5)throw Error('G11_MEASUREMENTS_DID_NOT_SETTLE');measurements=next;
  }
  f.dataset.g11Recipe=r.recipe_id;f.dataset.g11Kcal=String(r.kcal);f.inert=!result.plan.surface.interaction.interactive;
  f.setAttribute('aria-hidden',String(f.inert));f.style.transform=`translateX(${result.plan.surface.interaction.cardTranslateX}px)`;
  parts.plan=result.plan;coverage.push({recipe_id:r.recipe_id,surfaceId,width,kcal:r.kcal,people:r.people,status:'PASS'});return parts;
 }
 const placeholders=[];
 function detach(n){if(!n)return;const marker=document.createComment('g11-original');n.before(marker);placeholders.push({n,marker,children:[...n.childNodes],style:n.getAttribute('style'),className:n.className});n.remove();return n;}
 function restore(){for(const rec of records.values())rec.parts?.f.remove();for(const {n,marker,children,style:st,className} of placeholders.splice(0)){if(marker.isConnected){marker.replaceWith(n);n.replaceChildren(...children);if(st===null)n.removeAttribute('style');else n.setAttribute('style',st);n.className=className;}}
  records.clear();root.querySelectorAll('[data-g11-card]').forEach(n=>delete n.dataset.g11Card);root.querySelectorAll('.g11-home,.g11-wheel,.g11-wheel-fallback,.g11-view-controls').forEach(n=>n.remove());
  root.querySelectorAll('[data-g11-legacy]').forEach(n=>{n.hidden=false;delete n.dataset.g11Legacy;});
 }
 async function migrate(key,container,r,surfaceId,{title,metadata,controls,legacy,insertBefore}={}){
  if(!r||!container.isConnected)return;const width=container.clientWidth;if(width<80)return;
  const signature=JSON.stringify([r,width,surfaceId,title?.textContent,metadata?.textContent]);let rec=records.get(key);if(rec&&!rec.parts.f.isConnected){records.delete(key);rec=null;}
  if(rec?.signature===signature)return;
  if(rec){await paint(rec.parts,r,surfaceId,rec.parts.f.clientWidth);rec.signature=signature;return;}
  const parts=frame(surfaceId,title?.cloneNode(true),metadata?.cloneNode(true),controls?.cloneNode(true));
  parts.f.style.visibility='hidden';container.insertBefore(parts.f,insertBefore||container.firstChild);
  try{await paint(parts,r,surfaceId,parts.f.clientWidth||width);if(!container.isConnected){parts.f.remove();return;}
   // Preserve the exact original action nodes and event delegation.
   for(const [name,n] of [['t',title],['m',metadata],['c',controls]])if(n){const old=parts[name];detach(n);n.classList.add('g11-ui',name==='t'?'g11-title':name==='m'?'g11-metadata':'g11-controls');n.style.cssText=old.style.cssText;old.replaceWith(n);parts[name]=n;if(name==='m'){n.append(parts.v);}}
   for(const n of legacy||[]){if(removeLegacy)detach(n);else{n.hidden=true;n.dataset.g11Legacy='1';}}
   parts.f.style.visibility='';container.dataset.g11Card='1';await paint(parts,r,surfaceId,parts.f.clientWidth);records.set(key,{parts,signature,legacy:legacy||[],container,r,surfaceId});
  }catch(e){parts.f.remove();throw e;}
 }
 async function detail(){const c=root.querySelector('#modal-detail.active #detail-body'),r=app.current().detail;if(!c||!r)return;
  const h=c.querySelector(':scope>h2');
  await migrate(c,c,r,'RECIPE_DETAIL',{title:h,metadata:c.querySelector(':scope>.detail-meta'),controls:c.querySelector(':scope>.azioni-rapide'),legacy:[...c.querySelectorAll(':scope>.dettaglio-arte')]});
 }
 async function micro(){const c=root.querySelector('#modal-detail.active #detail-body'),r=app.current().detail;if(!c||!r)return;const rec=records.get(c);if(!rec)return;
  const t=rec.parts.t;if(t.querySelector('[data-g11-surface=TITLE_MICRO]'))return;
  const parts=frame('TITLE_MICRO',el('span','',r.title));t.textContent='';t.append(parts.f);await paint(parts,r,'TITLE_MICRO',t.clientWidth);records.set(parts.f,{parts,signature:'micro',container:t,r,surfaceId:'TITLE_MICRO',legacy:[]});
  await paint(rec.parts,r,'RECIPE_DETAIL',rec.parts.f.clientWidth);
 }
 async function cards(profile){for(const c of root.querySelectorAll('.scheda[data-act=detail][data-val]')){
  if(!c.getClientRects().length||c.closest('.g11-wheel'))continue;
  const dest=c.closest('#recipe-list')?(root.querySelector('#search-input')?.value.trim()?'SEARCH_CARD':'RECIPE_LIST'):'RECIPE_CARD';if(dest!==profile)continue;
  const r=app.recipe(c.dataset.val);await migrate(c,c,r,profile,{title:c.querySelector('.scheda-titolo'),metadata:c.querySelector('.scheda-dati,.scheda-cov'),controls:c.querySelector('.stella'),legacy:[...c.querySelectorAll(':scope>.scheda-arte')]});
 }if(profile==='RECIPE_LIST')for(const c of root.querySelectorAll('.storico')){const id=c.querySelector('[data-act=storico-apri]')?.dataset.val;if(id&&c.getClientRects().length)await migrate(c,c,app.recipe(id),profile,{title:c.querySelector('.storico-nome'),legacy:[...c.querySelectorAll(':scope>.storico-arte')]});}}
 async function wheel(){const list=root.querySelector('#recipe-list');if(!list?.getClientRects().length)return;
  if(!list.previousElementSibling?.classList.contains('g11-view-controls')){const nav=el('div','g11-view-controls'),button=el('button','chip','Sfoglia'),prev=el('button','chip','Precedente'),next=el('button','chip','Successiva');for(const b of [button,prev,next])b.type='button';button.onclick=()=>{wheelEnabled=!wheelEnabled;button.textContent=wheelEnabled?'Mostra lista':'Sfoglia';prev.hidden=next.hidden=!wheelEnabled;schedule();};prev.hidden=next.hidden=true;prev.onclick=()=>{wheelOffset=Math.max(0,wheelOffset-1);schedule();};next.onclick=()=>{wheelOffset=Math.min(Math.max(0,list.querySelectorAll(':scope>.scheda').length-3),wheelOffset+1);schedule();};nav.append(button,prev,next);list.before(nav);}
  let host=list.querySelector(':scope>.g11-wheel,:scope>.g11-wheel-fallback');if(!wheelEnabled){if(host)host.remove();list.querySelectorAll(':scope>.scheda').forEach(n=>n.hidden=false);return;}
  const originals=[...list.querySelectorAll(':scope>.scheda')],selected=originals.slice(wheelOffset,wheelOffset+3),rs=selected.map(n=>app.recipe(n.dataset.val));if(rs.length!==3||rs.some(r=>!r))return;
  const signature=JSON.stringify([rs,list.clientWidth,innerHeight,reduced.matches]);if(host?.dataset.signature===signature)return;if(host)host.remove();
  host=el('div','g11-wheel');host.dataset.signature=signature;list.prepend(host);const width=list.clientWidth,em=parseFloat(getComputedStyle(document.body).fontSize),safe=Math.max(120,innerHeight-180),parts=[];
  for(const r of rs){const p=frame('RECIPE_WHEEL',el('span','',r.title),el('div','',`${r.kcal} kcal`));p.f.dataset.act='detail';p.f.dataset.val=r.recipe_id;p.f.setAttribute('role','button');p.f.tabIndex=0;p.f.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();p.f.click();}};host.append(p.f);parts.push(p);}
  const metrics=Object.fromEntries(runtime.kit.metrics.assets.map(a=>[a.master_id,a]));
  const instances=rs.map(r=>({recipe:runtime.kit.recipes.recipes.find(x=>x.recipe_id===r.recipe_id),template:runtime.kit.templates.templates.find(t=>t.template_key===runtime.kit.recipes.recipes.find(x=>x.recipe_id===r.recipe_id).template_key),vessel:runtime.kit.vessels.vessels.find(v=>v.vessel_id===runtime.kit.recipes.recipes.find(x=>x.recipe_id===r.recipe_id).resolved_vessel_id),gaugeState:createGaugeState({...r,context_id:'wheel',revision:0,kcal_value:r.kcal,source:'EXISTING_APP_VALUE',portion_ref:'standard',cook_people:r.people}),measurements:{header:0,title:height(parts[rs.indexOf(r)].t,width),metadata:40,controls:0}}));
  const layout=compileWheelCollection(runtime.kit.surface,{instances,viewportWidth:width,viewportHeight:safe,fontEm:em,metrics,reducedMotion:reduced.matches});
  host.dataset.g11WheelMode=layout.mode;
  if(layout.mode==='STANDARD_LIST'){host.className='g11-wheel-fallback';for(let i=0;i<3;i++)await paint(parts[i],rs[i],'RECIPE_LIST',width);}
  else {host.style.height=safe+'px';for(let i=0;i<3;i++){const pose=layout.instances[i];await paint(parts[i],rs[i],'RECIPE_WHEEL',width,{distance:i-1});Object.assign(parts[i].f.style,{left:pose.x+'px',top:pose.y+'px',transform:`scale(${pose.scale})`,transformOrigin:'top left',opacity:String(pose.opacity)});parts[i].f.inert=i!==1;parts[i].f.setAttribute('aria-hidden',String(i!==1));}}
  originals.forEach(n=>n.hidden=true);
 }
 async function home(){for(const page of root.querySelectorAll('.pagina[data-pasto]')){
  if(!page.querySelector(':scope>.g11-home')){const host=el('div','g11-home'),button=el('button','btn-primary','Dimmi tu');button.type='button';host.append(button);page.querySelector('.cards-list').before(host);button.onclick=async()=>{
   const choices=app.suggestions(page.dataset.pasto);let index=0;host.querySelectorAll('.g11-scene,.g11-home-actions,.g11-empty').forEach(n=>n.remove());
   if(!choices.length){host.append(el('p','g11-empty','Nessuna ricetta adatta a questo pasto.'));return;}
   const p=frame('HOME_DIMMI_TU'),actions=el('div','g11-home-actions'),skip=el('button','btn-ghost','Un’altra'),cook=el('button','btn-primary','Cucina');skip.type=cook.type='button';cook.dataset.act='cook-open';actions.append(skip,cook);host.append(p.f,actions);
   const show=async()=>{const r=choices[index];p.t.textContent=r.title;p.m.replaceChildren(p.v);cook.dataset.val=r.recipe_id;await paint(p,r,'HOME_DIMMI_TU',host.clientWidth);};skip.onclick=()=>{index=(index+1)%choices.length;show().catch(e=>errors.push({stage:'HOME_DIMMI_TU',error:e.message}));};await show();
  };}
 }}
 async function kitchen(){const c=root.querySelector('#cook-mode:not([hidden])'),r=app.current().cook;if(!c||!r)return;
  const body=c.querySelector('#cook-body');if(records.get(body)?.parts.f.isConnected===false)records.delete(body);await migrate(body,body,r,'KITCHEN_MODE');
 }
 const tasks=[detail,micro,()=>cards('SEARCH_CARD'),()=>cards('RECIPE_CARD'),()=>cards('RECIPE_LIST'),wheel,home,kitchen];
 async function refresh(){if(!active||busy){pending=true;return;}busy=true;pending=false;
  observer.disconnect();try{for(let i=0;i<=stage;i++){await tasks[i]();}for(const [key,rec] of records)if(!rec.container.isConnected)records.delete(key);}
  catch(e){errors.push({stage:G11_ROLLOUT_ORDER[stage],error:e.message});}
  finally{busy=false;observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});if(pending)schedule();}
 }
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}
 const observer=new MutationObserver(changes=>{if(changes.some(c=>!c.target.closest?.('.g11-scene,.g11-view-controls')))schedule();});
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);reduced.addEventListener('change',()=>{wheelEnabled=false;schedule();});
 document.addEventListener('click',()=>setTimeout(schedule,0));document.addEventListener('input',()=>setTimeout(schedule,0));
 const controller={async advance(){if(stage<7){stage++;await refresh();stages.push({surfaceId:G11_ROLLOUT_ORDER[stage],errors:errors.length});}return G11_ROLLOUT_ORDER[stage];},async flush(){while(busy)await new Promise(r=>setTimeout(r,10));await refresh();while(busy)await new Promise(r=>setTimeout(r,10));},async enable(value){active=!!value;if(!active)restore();else await refresh();},async removeLegacy(){if(errors.length)throw Error('G12_G11_HAS_ERRORS');removeLegacy=true;let removed=0;for(const rec of records.values())for(const n of rec.legacy)if(n.isConnected){detach(n);removed++;}return removed;},discardTestFixtures(){if(app.qa!==true)throw Error('G12_QA_API_DISABLED');for(const [key,rec] of records)if(rec.parts.f.hasAttribute('data-g12-fixture')){rec.parts.f.remove();records.delete(key);}},async stageFixture(r,surfaceId,width,{legacyHtml='<svg viewBox="0 0 1 1"><circle cx=".5" cy=".5" r=".4"/></svg>'}={}){if(app.qa!==true)throw Error('G12_QA_API_DISABLED');if(!G11_ROLLOUT_ORDER.includes(surfaceId))throw Error('G12_UNKNOWN_SURFACE');const p=frame(surfaceId,el('span','g11-title',r.title));p.f.style.cssText=`position:fixed;left:0;top:0;width:${width}px;font-size:19.52px`;const old=el('span','g11-legacy-fixture');if(legacyHtml){old.innerHTML=legacyHtml;p.f.insertBefore(old,p.art);}p.f.dataset.g12Fixture=surfaceId;document.body.append(p.f);try{await paint(p,r,surfaceId,width);const key=Symbol(surfaceId);records.set(key,{parts:p,signature:'g12-fixture',legacy:legacyHtml?[old]:[],container:p.f,r,surfaceId});return {key,parts:p,legacy:old};}catch(e){p.f.remove();throw e;}},stats:()=>({active,stage:G11_ROLLOUT_ORDER[stage],stages,errors,coverage,records:[...records.values()].filter(r=>r.container.isConnected).map(r=>({recipe_id:r.r.recipe_id,surfaceId:r.surfaceId,legacy:r.legacy.filter(n=>n.isConnected).length})),cacheSize:runtime.cacheSize()}),runtime,paint,frame};
 await refresh();stages.push({surfaceId:G11_ROLLOUT_ORDER[0],errors:errors.length});return controller;
}

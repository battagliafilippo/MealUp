(function(){
  if(!new URLSearchParams(location.search).has('c63retest')) return;
  const rows=[]; const add=(k,v)=>rows.push(k+': '+String(v));
  const box=document.createElement('pre');
  box.id='mealup-c63-retest';
  box.style.cssText='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:8px;max-height:58vh;overflow:auto;margin:0;padding:12px;border-radius:12px;background:#111;color:#fff;font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;box-shadow:0 8px 30px #0008';
  const draw=()=>{box.textContent='MEALUP C6.3 POST-CORRECTION RETEST\n'+rows.join('\n');};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function run(){
    document.body.append(box);
    add('tester','mealup-redesign-preview');
    add('href',location.href);
    for(let i=0;i<100&&!window.MealUpG11&&!window.MealUpG11BootError;i++) await wait(100);
    add('G11 boot error',window.MealUpG11BootError||'NONE');
    add('MealUpG11',!!window.MealUpG11);
    if(!window.MealUpG11){draw();return;}
    try{await window.MealUpG11.flush();}catch(e){add('flush error',e.message||e);}
    let stats=null;
    try{stats=window.MealUpG11.stats();}catch(e){add('stats error',e.message||e);}
    if(stats){
      add('stage',stats.stage);
      add('runtime errors',stats.errors?.length??'N/A');
      add('coverage events',stats.coverage?.length??'N/A');
      add('active records',stats.records?.length??'N/A');
      add('cache size',stats.cacheSize??'N/A');
      if(stats.errors?.length)add('first error',JSON.stringify(stats.errors[0]));
    }
    try{
      const kit=window.MealUpG11.runtime?.kit;
      const recipes=kit?.recipes?.recipes||[];
      add('successor schema',kit?.recipes?.schema||'MISSING');
      add('successor status',kit?.recipes?.status||'MISSING');
      add('recipes',recipes.length);
      add('unique ids',new Set(recipes.map(r=>r.recipe_id)).size);
      add('layers',recipes.reduce((n,r)=>n+(r.layers?.length||0),0));
      add('r1 primary',recipes.find(r=>r.recipe_id==='r1')?.layers?.find(l=>l.role==='primary')?.render_source_master_id||'MISSING');
    }catch(e){add('kit audit error',e.message||e);}
    const migrated=[...document.querySelectorAll('[data-g11-migrated="1"]')];
    const legacyVisible=[...document.querySelectorAll('[data-g11-legacy="1"]')].filter(n=>!n.hidden);
    add('migrated surfaces visible',migrated.length);
    add('legacy marked visible',legacyVisible.length);
    const canvases=[...document.querySelectorAll('.g11-art canvas')];
    add('G11 canvases',canvases.length);
    const pass=!window.MealUpG11BootError && stats?.stage==='KITCHEN_MODE' && (stats?.errors?.length||0)===0 &&
      window.MealUpG11.runtime?.kit?.recipes?.recipes?.length===454 &&
      new Set(window.MealUpG11.runtime?.kit?.recipes?.recipes?.map(r=>r.recipe_id)).size===454;
    add('POST-CORRECTION CORE',''+(pass?'PASS':'FAIL'));
    add('visual confirmation','CHECK FOOD OBJECTS ON SCREEN');
    draw();
  }
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
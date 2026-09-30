(function(){
  if(!new URLSearchParams(location.search).has('g11diag')) return;
  const rows=[];
  const put=(k,v)=>rows.push(k+': '+String(v));
  const box=document.createElement('pre');
  box.id='mealup-g11-diagnostic';
  box.style.cssText='position:fixed;z-index:2147483647;left:8px;right:8px;bottom:8px;max-height:52vh;overflow:auto;margin:0;padding:12px;border-radius:12px;background:#111;color:#fff;font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;box-shadow:0 8px 30px #0008';
  const draw=()=>{box.textContent='MEALUP G11 DIAGNOSTIC\n'+rows.join('\n');};
  addEventListener('error',e=>{put('window.error',e.message||e.error);draw();});
  addEventListener('unhandledrejection',e=>{put('unhandledrejection',e.reason?.message||e.reason);draw();});
  async function checkFetch(path){
    try{const r=await fetch(path,{cache:'no-store'});put('fetch '+path,r.status+' '+(r.headers.get('content-type')||''));}
    catch(e){put('fetch '+path,'ERROR '+e.message);}
  }
  async function run(){
    document.body.append(box);
    put('href',location.href);
    put('MealUpVisualData',!!window.MealUpVisualData);
    put('createImageBitmap',typeof window.createImageBitmap);
    put('crypto.subtle',!!window.crypto?.subtle);
    put('document.fonts',!!document.fonts);
    try{put('font Satoshi 700',document.fonts?document.fonts.check('700 16px Satoshi'):'N/A');}catch(e){put('font check','ERROR '+e.message);}
    put('bundle tag',!!document.querySelector('script[src*="mealup-g11-bundle.js"]'));
    await checkFetch('./G8/composition-matrix.json');
    await checkFetch('./G5/recipe-geometry.json');
    await checkFetch('./assets/food-objects/BEEF/BEEF.png');
    await checkFetch('./G5/vessels/VESSEL_PLATE/food-clip.png');
    await checkFetch('./G7_Completed/assets/MEALUP_GAUGE_SHELL_v2.png');
    await new Promise(r=>setTimeout(r,1800));
    put('G11 boot error',window.MealUpG11BootError||'NONE');
    put('MealUpG11',!!window.MealUpG11);
    if(window.MealUpG11){
      try{
        const s=window.MealUpG11.stats();
        put('stage',s.stage);
        put('errors',JSON.stringify(s.errors));
        put('coverage',s.coverage?.length);
        put('records',s.records?.length);
        put('cacheSize',s.cacheSize);
      }catch(e){put('stats error',e.message);}
    }
    try{put('recipe r1',JSON.stringify(window.MealUpVisualData?.recipe?.('r1')));}catch(e){put('recipe r1','ERROR '+e.message);}
    draw();
  }
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
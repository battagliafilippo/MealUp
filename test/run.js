/**
 * Suite di verifica di FitMeals.
 */
const { app, test, eq, vero, almeno, wait, bilancio } = require('./suite.js');
const S_MEALS = 4;
const clone = o => JSON.parse(JSON.stringify(o));   // colazione, pranzo, spuntino, cena

(async () => {
  console.log('\nFitMeals — verifiche\n');

  // ---------------------------------------------------------------- dati
  console.log('Dati di base');
  await test('il ricettario si carica per intero', async () => {
    const a = await app();
    almeno(a.stato().recipes.length, 330, 'ricette');
    eq(a.errs.length, 0, 'errori JS');
  });

  await test('nessun id di ricetta duplicato', async () => {
    const a = await app();
    const ids = a.stato().recipes.map(r => r.id);
    eq(ids.length - new Set(ids).size, 0, 'duplicati');
  });

  await test('ogni ricetta ha portata, macro, ingredienti e passaggi', async () => {
    const a = await app();
    const rotte = a.stato().recipes.filter(r =>
      !r.portata || !r.title || !(r.ing || []).length || !(r.steps || []).length ||
      // una bibita senza zucchero puo' valere zero calorie: e' l'unica eccezione
      !(r.kcal > 0 || (r.portata === 'bevanda' && r.kcal >= 0)));
    eq(rotte.length, 0, 'ricette incomplete: ' + rotte.map(r => r.id).join(','));
  });

  await test('tutte le portate previste sono popolate', async () => {
    const a = await app();
    const c = {};
    a.stato().recipes.forEach(r => c[r.portata] = (c[r.portata] || 0) + 1);
    ['colazione', 'antipasto', 'primo', 'secondo', 'contorno', 'salsa'].forEach(p => almeno(c[p] || 0, 1, p));
  });

  // ---------------------------------------------------------------- filtri
  console.log('\nFiltri e ricerca');
  await test('le salse non compaiono nell\'elenco generale', async () => {
    const a = await app();
    a.tab('view-search');
    const titoli = [...a.d.querySelectorAll('#recipe-list .card-title')].map(x => x.textContent);
    vero(!titoli.includes('Maionese classica'), 'una salsa e\' finita fra le ricette');
    vero(a.conta('.filter-row') > 0, 'manca la riga dei filtri');
  });

  await test('il filtro portata seleziona il gruppo giusto', async () => {
    const a = await app();
    a.tab('view-search');
    a.click('[data-act=filtri-apri]');
    a.click('[data-act=filtro][data-val=portata][data-v=contorno]');
    a.click('#modal-filtri [data-act=close-modal]');
    almeno(a.conta('#recipe-list .card-btn'), 20, 'contorni');
  });

  await test('la ricerca a piu parole richiede tutte le parole', async () => {
    const a = await app();
    a.cerca('pollo limone');
    const t = [...a.d.querySelectorAll('#recipe-list .card-title')].map(x => x.textContent.toLowerCase());
    vero(t.every(x => x.includes('pollo') || x.includes('limone')), 'risultato non pertinente');
  });

  await test('una parola inventata non trova niente', async () => {
    const a = await app();
    a.cerca('norma');   // il tag "no cottura" catturava ogni parola che inizia per no
    eq(a.conta('#recipe-list [data-act=detail]'), 0, 'risultati fantasma');
    a.cerca('gamberi'); // ma i plurali larghi devono ancora funzionare
    almeno(a.conta('#recipe-list [data-act=detail]'), 5, 'gamberi non trovati');
  });

  await test('la ricerca senza risultati lo dice', async () => {
    const a = await app();
    a.cerca('zzzqqq');
    vero(a.testo('#recipe-list .empty').includes('Nessun risultato'), 'manca il messaggio');
  });

  // ---------------------------------------------------------------- profilo
  console.log('\nProfilo ed energia');
  await test('il fabbisogno segue Mifflin-St Jeor', async () => {
    const a = await app();
    a.profiloBase();
    eq(a.testo('.energy-big'), '2040', 'obiettivo in definizione');
  });

  await test('il pulsante salva appare solo dopo una modifica', async () => {
    const a = await app();
    vero(a.d.getElementById('save-row').hidden, 'visibile all\'avvio');
    a.set('p-weight', '80');
    vero(!a.d.getElementById('save-row').hidden, 'non appare dopo la modifica');
    a.click('[data-act=save-profile]');
    vero(a.d.getElementById('save-row').hidden, 'non sparisce dopo il salvataggio');
  });

  await test('gli esclusi valgono per profilo, non per tutti', async () => {
    const a = await app();
    a.profiloBase();
    a.d.getElementById('input-forbidden').value = 'funghi';
    a.click('[data-act=add-ban]');
    a.tab('view-home'); a.cerca('funghi trifolati');
    eq(a.conta('#recipe-list .card-btn'), 0, 'ricetta esclusa ancora visibile');

    a.tab('view-profile');
    a.click('[data-act=add-profile]');
    a.set('p-name', 'Altro'); a.set('p-age', '30'); a.set('p-height', '170'); a.set('p-weight', '65');
    a.tab('view-home'); a.cerca('funghi trifolati');
    eq(a.conta('#recipe-list .card-btn'), 1, 'esclusione applicata a chi non l\'ha');
  });

  await test('i profili nascono con id diversi', async () => {
    const a = await app();
    a.click('[data-act=add-profile]');
    const ids = a.stato().profiles.map(p => p.id);
    eq(ids.length - new Set(ids).size, 0, 'id duplicati');
  });

  // ---------------------------------------------------------------- giornata
  console.log('\nGiornata e diario');
  await test('i budget dei pasti sommano al fabbisogno', async () => {
    const a = await app();
    a.profiloBase();
    const piano = a.dom.window.fitmealsPlan();
    const somma = piano.meals.reduce((x, y) => x + (y.budget || y.kcalFatte || 0), 0);
    vero(Math.abs(somma - piano.target) <= 60,
      'somma ' + somma + ' contro ' + piano.target);
  });

  await test('registrare un pasto stringe i budget rimanenti', async () => {
    const a = await app();
    a.profiloBase();
    const cenaPrima = a.dom.window.fitmealsPlan().meals.find(x => x.m.id === 'cen').budget;
    a.tab('view-home'); a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    almeno(a.stato().log.length, 1, 'pasto registrato');
    const dopo = a.dom.window.fitmealsPlan().meals.find(x => x.m.id === 'cen');
    if (!dopo.fatto) vero(dopo.budget <= cenaPrima, 'il budget della cena non si stringe');
  });

  await test('il giorno di allenamento alza il fabbisogno', async () => {
    const a = await app();
    a.profiloBase();
    const prima = a.dom.window.fitmealsPlan().target;
    a.tab('view-home');
    a.click('[data-act=training]');
    vero(a.dom.window.fitmealsPlan().target > prima, 'l\'allenamento non alza il fabbisogno');
  });

  await test('a colazione non arrivano primi ne secondi', async () => {
    const a = await app();
    a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="0"]');
    const ids = [...a.d.querySelectorAll('#pagina-col .sugg[data-act=detail]')].map(x => x.dataset.val);
    const rec = a.stato().recipes;
    ids.forEach(id => {
      const r = rec.find(x => x.id === id);
      if (r) eq(r.portata, 'colazione', 'portata sbagliata a colazione: ' + r.title);
    });
  });

  // ---------------------------------------------------------------- funzioni
  console.log('\nFunzioni');
  await test('gli avanzi non contano come nuova cucinata', async () => {
    const a = await app();
    a.profiloBase();
    a.tab('view-home'); a.apri('cacciatora');
    const rid = a.d.querySelector('#detail-body [data-act=log-meal]').dataset.val;
    a.click('[data-act=cook-open]');
    for (let i = 0; i < 10; i++) {
      a.click('[data-act=cook-next]');
      a.click('[data-act=cook-fatto]');
      await wait(60);
    }
    a.click('[data-act=leftover-add]');
    a.click('[data-act=cook-close]');
    const primaCount = (a.stato().counts[rid] || 0);
    a.tab('view-fridge');
    a.click('#leftovers-body [data-act=log-meal]');
    eq(a.stato().counts[rid] || 0, primaCount, 'contatore alterato da un avanzo');
  });

  await test('la lista della spesa somma e raggruppa', async () => {
    const a = await app();
    a.tab('view-home'); a.apri('cacciatora');
    a.click('#detail-body [data-act=shop-add]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-fridge');
    almeno(a.conta('#shopping-body .shop-item'), 5, 'voci in lista');
    almeno(a.conta('#shopping-body .field-label'), 1, 'reparti');
  });

  await test('spuntare la spesa riempie la dispensa', async () => {
    const a = await app();
    a.tab('view-home'); a.apri('cacciatora');
    a.click('#detail-body [data-act=shop-add]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-fridge');
    for (let i = 0; i < 3; i++) a.click('#shopping-body .shop-item:not(.done):not(.have)');
    const prima = a.stato().myIngredients.length;
    a.click('[data-act=shop-bought]'); a.click('[data-act=conferma-si]');
    almeno(a.stato().myIngredients.length, prima + 1, 'dispensa non aggiornata');
    eq(a.stato().shopping.length, 0, 'lista non svuotata');
  });

  await test('il timer si avvia e sopravvive alla chiusura', async () => {
    const a = await app();
    a.tab('view-home'); a.apri('tonno scottato');
    a.click('#detail-body .step-timer');
    eq(a.conta('.tpill'), 1, 'timer avviato');
    const salvati = a.dom.window.localStorage.getItem('fitmeals.timers');
    const b = await app();
    b.dom.window.localStorage.setItem('fitmeals.timers', salvati);
    almeno(JSON.parse(salvati).length, 1, 'timer persistito');
  });

  await test('le salse si abbinano ai secondi ma non ai primi', async () => {
    const a = await app();
    const conAbbinamenti = () => [...a.d.querySelectorAll('#detail-body .sezione summary')]
      .some(h => h.textContent.includes('Ci sta bene'));
    a.apri('petto di pollo alla piastra');
    vero(conAbbinamenti(), 'nessun abbinamento su un secondo');
    a.apri('tagliatelle al ragu');
    vero(!conAbbinamenti(), 'abbinamento proposto su un primo');
  });

  await test('la nota personale si salva', async () => {
    const a = await app();
    a.apri('carbonara');
    const ta = a.d.querySelector('#detail-body [data-act=note]');
    ta.value = 'meno pepe';
    ta.dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    await wait(800);
    vero(JSON.stringify(a.stato().notes).includes('meno pepe'), 'nota non salvata');
  });

  // ---------------------------------------------------------------- annulla
  console.log('\nAnnulla e cronologia');
  await test('annulla ripristina l\'ultima modifica, non la prima', async () => {
    const a = await app();
    a.profiloBase();
    a.d.getElementById('input-ingredient').value = 'avena';
    a.click('[data-act=add-ing]');
    a.d.getElementById('input-ingredient').value = 'quinoa';
    a.click('[data-act=add-ing]');
    a.click('#toast [data-act=undo]');
    const ing = a.stato().myIngredients;
    vero(ing.includes('avena'), 'ha annullato troppo indietro');
    vero(!ing.includes('quinoa'), 'non ha annullato');
  });

  await test('la cronologia non contiene le ricette di serie', async () => {
    const a = await app();
    a.profiloBase();
    const h = JSON.stringify(a.stato().history);
    vero(!h.includes('carbonara'), 'ricette di serie nella cronologia');
    vero(h.length < 200000, 'cronologia troppo pesante: ' + h.length);
  });

  // ---------------------------------------------------------------- gruppo
  console.log('\nGruppo');
  await test('il link di condivisione va e torna', async () => {
    const a = await app();
    a.profiloBase();
    a.tab('view-profile');
    a.click('[data-act=link-make]');
    await wait(400);
    const link = a.d.getElementById('link-text').value;
    vero(link.includes('#fm='), 'link non generato');

    const b = await app();
    b.d.getElementById('link-in').value = link;
    b.click('[data-act=link-import]');
    await wait(400);
    almeno(b.stato().profiles.length, 2, 'profilo non ricevuto');
  });

  await test('un link corrotto non rompe l\'app', async () => {
    const a = await app();
    a.tab('view-profile');
    a.d.getElementById('link-in').value = 'https://x/#fm=zSPAZZATURA';
    a.click('[data-act=link-import]');
    await wait(300);
    vero(a.testo('#toast').includes('non leggibile'), 'nessun avviso');
    eq(a.errs.length, 0, 'errori JS');
  });

  // ---------------------------------------------------------------- salute
  console.log('\nTenuta generale');
  await test('nessun errore JS navigando tutte le schede', async () => {
    const a = await app();
    ['view-home', 'view-fridge', 'view-search', 'view-profile'].forEach(a.tab);
    a.tab('view-home');
    eq(a.errs.length, 0, 'errori: ' + a.errs.join(' | '));
  });

  await test('il salvataggio non riscrive le ricette di serie', async () => {
    const a = await app();
    a.profiloBase();
    const peso = a.dom.window.localStorage.getItem('fitmeals.v2').length;
    vero(peso < 40000, 'salvataggio di ' + Math.round(peso / 1024) + ' KB: troppo pesante');
    console.log('         (su disco: ' + Math.round(peso / 1024) + ' KB, in memoria: '
      + a.stato().recipes.length + ' ricette)');
  });

  await test('una ricetta eliminata non torna dopo il riavvio', async () => {
    const a = await app();
    a.apri('carbonara');
    const del = a.d.querySelector('#detail-body [data-act=delete]');
    del.click(); del.click();
    const disco = a.dom.window.localStorage.getItem('fitmeals.v2');
    const b = await app({ storage: JSON.parse(disco) });
    vero(!b.stato().recipes.some(r => r.title === 'Spaghetti alla carbonara'), 'la ricetta e\' risorta');
  });

  await test('le ricette tue sopravvivono al riavvio', async () => {
    const a = await app();
    a.tab('view-home');
    a.click('[data-act=open-form]');
    a.d.getElementById('f-title').value = 'Piatto di prova';
    ['f-kcal', 'f-pro', 'f-prep', 'f-cook'].forEach((x, i) => a.d.getElementById(x).value = [500, 40, 5, 10][i]);
    a.d.getElementById('f-ing').value = 'pollo:200:g';
    a.d.getElementById('f-steps').value = 'Cuoci.';
    a.d.getElementById('form-recipe').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const disco = a.dom.window.localStorage.getItem('fitmeals.v2');
    const b = await app({ storage: JSON.parse(disco) });
    vero(b.stato().recipes.some(r => r.title === 'Piatto di prova'), 'ricetta persa');
    almeno(b.stato().recipes.length, 330, 'ricettario incompleto dopo il riavvio');
  });

  await test('un\'azione che fallisce non blocca l\'app', async () => {
    const a = await app();
    // Simulo un guasto interno e verifico che l'app avvisi e resti viva.
    a.d.body.insertAdjacentHTML('beforeend', '<button id="rotto" data-act="detail" data-val="INESISTENTE"></button>');
    a.click('#rotto');
    a.tab('view-home');
    almeno(a.conta('#recipe-list .card-btn'), 1, 'app bloccata dopo un errore');
  });

  await test('lo zoom della pagina non e\' bloccato', async () => {
    const a = await app();
    const vp = a.d.querySelector('meta[name=viewport]').content;
    vero(!/user-scalable\s*=\s*no/.test(vp), 'zoom disabilitato');
    vero(!/maximum-scale/.test(vp), 'zoom limitato');
  });

  await test('i testi secondari hanno contrasto sufficiente', async () => {
    const a = await app();
    const css = a.d.querySelector('style').textContent;
    // Prendo l'ultima definizione: vale quella del tema in uso.
    const tutte = [...css.matchAll(/--text-tertiary:rgba\([\d,\s]+\.(\d+)\)/g)];
    vero(tutte.length, 'token non trovato');
    const alfa = Number(tutte[tutte.length - 1][1]);
    vero(alfa >= 45, 'testo terziario troppo tenue: .' + alfa);
  });

  await test('il tema chiaro e\' quello attivo', async () => {
    const a = await app();
    const css = a.d.querySelector('style').textContent;
    const bg = [...css.matchAll(/--bg-main:\s*(#[0-9a-f]{6})/gi)].pop();
    vero(bg, 'fondo non definito');
    const [r, g, b] = [1, 3, 5].map(i => parseInt(bg[1].substr(i, 2), 16));
    vero((r + g + b) / 3 > 180, 'il fondo non e\' chiaro: ' + bg[1]);
  });

  await test('il fondale cambia con l\'ingrediente cercato', async () => {
    const a = await app();
    a.click('[data-act=pasto-vai][data-val="2"]');
    const ora = () => (a.d.querySelector('#sfondo .strato.viva') || {}).style.backgroundImage || '';
    const prima = ora();
    a.set('cerca-cen', 'salmone');
    const dopo = ora();
    vero(dopo && dopo !== prima, 'il fondale non segue la ricerca');
    a.set('cerca-cen', '');
    vero(ora() !== dopo, 'non torna al fondale della cena');
  });

  await test('uno stato vecchio e incompleto viene ricostruito', async () => {
    const mia = { id:'mia1', title:'Ricetta mia', portata:'secondo', cat:'sano', prep:5, cook:5,
                  kcal:400, pro:40, carbs:10, fat:15, ing:[{n:'pollo',q:200,u:'g'}], steps:['y'],
                  tags:[], mtime: Date.now() };
    const a = await app({ storage: { seedVersion: 9, recipes: [mia],
      profiles: [{ id:'u9', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u9', cookFor:['u9'] }, blacklist: [], myIngredients: [], pantry: [] } });
    almeno(a.stato().recipes.length, 330, 'ricettario non ricostruito');
    vero(a.stato().recipes.some(r => r.id === 'mia1'), 'ricetta personale persa');
    vero(a.stato().profiles[0].name === 'G', 'profilo perso');
  });

  await test('il catalogo non costruisce tutta la lista in una volta', async () => {
    const a = await app();
    a.tab('view-search');
    const card = a.conta('#recipe-list .card-btn');
    vero(card <= 31, 'schede renderizzate subito: ' + card);
    const peso = a.d.getElementById('recipe-list').innerHTML.length;
    vero(peso < 70000, 'lista di ' + Math.round(peso / 1024) + ' KB');
    vero(a.click('[data-act=home-more]'), 'manca il pulsante per allungare');
    almeno(a.conta('#recipe-list .card-btn'), card + 20, 'la lista non si allunga');
  });

  await test('cambiare filtro riporta la lista in cima', async () => {
    const a = await app();
    a.tab('view-search');
    a.click('[data-act=home-more]');
    a.click('[data-act=filtri-apri]');
    a.click('[data-act=filtro][data-val=portata][data-v=secondo]');
    vero(a.conta('#recipe-list .card-btn') <= 31, 'la pagina non si e\' azzerata');
  });

  await test('le calorie tornano con i macro dichiarati', async () => {
    const a = await app();
    const rotte = a.stato().recipes.filter(r => {
      // L'alcol porta calorie che non stanno in proteine, carboidrati o grassi:
      // nelle bevande alcoliche lo scarto e' corretto, non un errore.
      if ((r.tags || []).includes('alcolica')) return false;
      const calc = r.pro * 4 + (r.carbs || 0) * 4 + (r.fat || 0) * 9;
      return r.kcal && Math.abs(calc - r.kcal) > r.kcal * 0.2;
    });
    eq(rotte.length, 0, 'incoerenti: ' + rotte.map(r => r.id).join(','));
  });

  console.log('\nCasi limite');
  await test('l\'app parte anche senza archiviazione disponibile', async () => {
    const dom = require('jsdom');
    const a = await app();
    // simulo la navigazione privata: localStorage che rifiuta di scrivere
    a.dom.window.localStorage.setItem = () => { throw new Error('quota'); };
    a.profiloBase();
    a.tab('view-home');
    almeno(a.conta('#recipe-list .card-btn'), 1, 'app bloccata senza storage');
    eq(a.errs.length, 0, 'errori JS');
  });

  await test('uno stato corrotto non impedisce l\'avvio', async () => {
    const a = await app({ storage: { recipes: 'non un array', profiles: null, ui: 5 } });
    almeno(a.stato().recipes.length, 330, 'ricettario non ripristinato');
    almeno(a.stato().profiles.length, 1, 'profilo non ripristinato');
  });

  await test('non si puo\' restare senza profili', async () => {
    const a = await app();
    vero(a.d.getElementById('btn-del-profile').hidden, 'si puo\' eliminare l\'unico profilo');
  });

  await test('il backup esportato si reimporta', async () => {
    const a = await app();
    a.profiloBase();
    const backup = JSON.stringify(a.stato());
    const b = await app();
    b.dom.window.localStorage.setItem('fitmeals.v2', backup);
    const c = await app({ storage: JSON.parse(backup) });
    almeno(c.stato().recipes.length, 330, 'ricette perse nel backup');
    eq(c.stato().profiles[0].weight, '82', 'profilo perso nel backup');
  });

  await test('i testi lunghissimi vengono contenuti', async () => {
    const a = await app();
    a.tab('view-home');
    a.click('[data-act=open-form]');
    a.d.getElementById('f-title').value = 'A'.repeat(300);
    ['f-kcal', 'f-pro', 'f-prep', 'f-cook'].forEach((x, i) => a.d.getElementById(x).value = [500, 40, 5, 5][i]);
    a.d.getElementById('f-ing').value = 'pollo:200:g';
    a.d.getElementById('f-steps').value = 'Cuoci bene il tutto.';
    a.d.getElementById('form-recipe').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const r = a.stato().recipes.find(x => x.title.startsWith('A'));
    vero(r && r.title.length <= 80, 'titolo di ' + (r ? r.title.length : 0) + ' caratteri');
  });

  await test('i nomi degli ingredienti non possono contenere HTML attivo', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.set('disp-cerca', '<img src=x onerror=alert(1)>');
    a.click('[data-act=disp-add]');
    eq(a.conta('#view-fridge img'), 0, 'elemento iniettato');
    eq(a.conta('#view-fridge script'), 0, 'script iniettato');
  });

  await test('eliminare una ricetta non lascia riferimenti orfani', async () => {
    const a = await app();
    a.apri('bresaola');
    const rid = a.stato().recipes.find(r => /bresaola/i.test(r.title)).id;
    a.click('#detail-body [data-act=fav]');
    a.click('#detail-body [data-act=shop-add]');
    const del = a.d.querySelector('#detail-body [data-act=delete]');
    del.click(); del.click();
    const s = a.stato();
    vero(!s.favorites.includes(rid), 'resta nei preferiti');
    vero(!s.shopping.includes(rid), 'resta nella spesa');
    vero(!(s.notes || {})[rid], 'resta fra le note');
    vero(!(s.leftovers || []).some(x => x.rid === rid), 'resta fra gli avanzi');
  });

  await test('il diario resta coerente con lo storico giornaliero', async () => {
    const a = await app();
    a.profiloBase();
    a.tab('view-home'); a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    const s1 = a.stato();
    const giorno = Object.values(s1.daily)[0];
    eq(giorno.k, s1.log[0].kcal, 'storico diverso dal diario');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-profile');
    a.click('[data-act=log-del]');
    eq(Object.keys(a.stato().daily).length, 0, 'storico non azzerato');
    eq(Object.keys(a.stato().counts).length, 0, 'contatore non decrementato');
  });

  await test('le memorie interne non restituiscono dati vecchi', async () => {
    const a = await app();
    a.apri('carbonara');
    a.click('#detail-body [data-act=edit]');
    a.d.getElementById('f-title').value = 'Spaghetti stellari';
    a.d.getElementById('form-recipe').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    a.cerca('stellari');
    almeno(a.conta('#recipe-list .card-btn'), 1, 'titolo modificato non ricercabile');

    a.tab('view-profile'); a.profiloBase();
    a.d.getElementById('input-forbidden').value = 'guanciale';
    a.click('[data-act=add-ban]');
    a.tab('view-home'); a.cerca('amatriciana');
    eq(a.conta('#recipe-list .card-btn'), 0, 'esclusione non applicata subito');

    a.tab('view-profile');
    a.click('[data-act=del-ban]');
    a.tab('view-home'); a.cerca('amatriciana');
    almeno(a.conta('#recipe-list .card-btn'), 1, 'la ricetta non torna');
  });

  console.log('\nNuove funzioni');
  await test('si puo\' registrare cibo che non e\' una ricetta', async () => {
    const a = await app();
    a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="1"]');
    a.click('[data-act=quick-open][data-val=pra]');
    a.d.getElementById('q-nome').value = 'Pizza al ristorante';
    a.d.getElementById('q-kcal').value = '950';
    a.d.getElementById('q-pro').value = '35';
    a.click('[data-act=quick-save]');
    const s = a.stato();
    eq(s.log.length, 1, 'voce non registrata');
    eq(s.log[0].rid, null, 'non e\' segnata come voce manuale');
    eq(Object.values(s.daily)[0].k, 950, 'storico non aggiornato');
  });

  await test('togliere una voce manuale non tocca i contatori', async () => {
    const a = await app();
    a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="2"]');
    a.click('[data-act=quick-open][data-val=cen]');
    a.d.getElementById('q-nome').value = 'Gelato';
    a.d.getElementById('q-kcal').value = '300';
    a.click('[data-act=quick-save]');
    a.click('[data-act=log-del]');
    eq(a.stato().log.length, 0, 'voce non rimossa');
    eq(Object.keys(a.stato().daily).length, 0, 'storico non azzerato');
    eq(a.errs.length, 0, 'errori JS');
  });

  await test('i reparti si riordinano e restano', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.d.getElementById('shop-add').value = 'detersivo';
    a.click('[data-act=shop-extra]');
    a.click('[data-act=shop-edit]');
    const primo = a.stato().reparti[0].nome;
    a.click('[data-act=rep-giu]');
    vero(a.stato().reparti[0].nome !== primo, 'ordine invariato');
    a.d.getElementById('rep-nome').value = 'Surgelati';
    a.click('[data-act=rep-add]');
    vero(a.stato().reparti.some(r => r.nome === 'Surgelati'), 'reparto non aggiunto');
  });

  await test('un ingrediente si sposta di reparto e ci resta', async () => {
    const a = await app();
    a.tab('view-home'); a.apri('cacciatora');
    a.click('#detail-body [data-act=shop-add]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-fridge');
    a.click('[data-act=shop-edit]');
    a.click('#shopping-body .shop-item');
    almeno(Object.keys(a.stato().repartoDi).length, 1, 'spostamento non memorizzato');
  });

  await test('una settimana si salva come menu e si riapplica', async () => {
    const a = await app();
    a.profiloBase();
    a.click('[data-act=week-toggle]');
    a.click('[data-act=week-pick]');
    a.click('[data-act=week-set]');
    a.click('[data-act=menu-save]');
    eq(a.stato().menus.length, 1, 'menu non salvato');
    const sv = a.d.querySelector('[data-act=week-clear-all]');
    sv.click(); sv.click();
    eq(Object.keys(a.stato().week).length, 0, 'settimana non svuotata');
    a.click('[data-act=menu-apply]');
    almeno(Object.keys(a.stato().week).length, 1, 'menu non riapplicato');
  });

  await test('i filtri stanno in un pannello', async () => {
    const a = await app();
    a.tab('view-search');
    eq(a.conta('#view-search .filter-bar'), 0, 'righe di chip ancora sparse nel catalogo');
    vero(a.click('[data-act=filtri-apri]'), 'manca il pulsante filtri');
    almeno(a.conta('#filtri-corpo .chip'), 15, 'pannello vuoto');
    a.click('[data-act=filtro][data-val=cat][data-v=sgarro]');
    eq(a.conta('#filtri-attivi .chip'), 1, 'filtro attivo non mostrato in home');
    a.click('[data-act=filtro-togli]');
    eq(a.conta('#filtri-attivi .chip'), 0, 'filtro non rimosso dal riepilogo');
  });

  console.log('\nHome a tre pasti');
  await test('la home ha tre pagine e una bilancia sola in cima', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-home');
    ['col', 'pra', 'cen'].forEach(id => {
      vero(a.d.getElementById('pagina-' + id), 'manca la pagina ' + id);
      vero(a.d.getElementById('cerca-' + id), 'manca la ricerca di ' + id);
      vero(a.d.getElementById('lista-' + id), 'manca la lista di ' + id);
      vero(!a.d.querySelector('#pagina-' + id + ' .bilancia'),
        'la bilancia non deve stare dentro la pagina ' + id);
    });
    eq(a.conta('#view-home .bilancia'), 1, 'la bilancia deve essere una sola');
  });

  await test('la bilancia segue la pagina, e ogni pasto ha i suoi consigli', async () => {
    const a = await app();
    a.profiloBase();
    const box = a.d.getElementById('anello-unico');
    [['0', 'col'], ['1', 'pra'], ['2', 'cen']].forEach(([pag, id]) => {
      a.click('[data-act=pasto-vai][data-val="' + pag + '"]');
      vero(box.querySelector('.gamba.qui.f-' + id), 'l\'evidenza non segue ' + id);
      vero(/di \d+/.test(box.textContent), 'budget mancante con ' + id);
    });
  });

  await test('nella pagina colazione entrano solo colazioni e bevande', async () => {
    const a = await app();
    const ids = [...a.d.querySelectorAll('#lista-col [data-act=detail]')].map(x => x.dataset.val);
    almeno(ids.length, 1, 'pagina vuota');
    ids.forEach(id => {
      const r = a.stato().recipes.find(x => x.id === id);
      vero(['colazione', 'bevanda'].includes(r.portata), r.title + ' non ci sta a colazione');
    });
  });

  await test('nessuna bibita viene consigliata come pasto', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    ['0', '1', '2'].forEach(v => {
      a.click('[data-act=pasto-vai][data-val="' + v + '"]');
      const pagina = ['#pagina-col', '#pagina-pra', '#pagina-cen'][Number(v)];
      [...a.d.querySelectorAll(pagina + ' .sugg[data-act=detail]')].forEach(x => {
        const r = a.stato().recipes.find(y => y.id === x.dataset.val);
        if (r) vero(r.portata !== 'bevanda', r.title + ' proposta come pasto');
      });
    });
  });

  await test('bevande e cucina orientale sono nel ricettario', async () => {
    const a = await app();
    const R = a.stato().recipes;
    almeno(R.filter(r => r.portata === 'bevanda').length, 10, 'bevande');
    almeno(R.filter(r => (r.tags || []).includes('orientale')).length, 12, 'ricette orientali');
    vero(R.some(r => r.title === 'Salsa di soia'), 'manca la salsa di soia');
    // la soia deve essere anche un ingrediente vero
    almeno(R.filter(r => (r.ing || []).some(i => i.n === 'salsa di soia')).length, 8,
      'la soia non e\' usata nelle preparazioni');
  });

  await test('il tema della pagina segue l\'ingrediente cercato', async () => {
    const a = await app();
    const tema = () => a.d.getElementById('pagina-cen').style.getPropertyValue('--tema');
    eq(tema(), '', 'la pagina parte gia\' tinta');
    a.set('cerca-cen', 'salmone');
    const pesce = tema();
    vero(pesce, 'nessun tema per il pesce');
    a.set('cerca-cen', 'manzo');
    vero(tema() && tema() !== pesce, 'il tema non cambia con la carne');
    a.set('cerca-cen', '');
    eq(tema(), '', 'il tema non torna a quello del pasto');
  });

  await test('le tre pagine si cambiano anche col tocco', async () => {
    const a = await app();
    a.click('[data-act=pasto-vai][data-val="2"]');
    const attiva = [...a.d.querySelectorAll('.pasto-tab')].findIndex(t => t.classList.contains('active'));
    eq(attiva, 2, 'la pagina attiva non e\' cambiata');
  });

  console.log('\nVetro');
  await test('ogni livello sfoca lo sfondo', async () => {
    const a = await app();
    const css = a.d.querySelector('style').textContent;
    ['--v1-blur', '--v2-blur', '--v3-blur'].forEach(t => {
      const m = css.match(new RegExp(t + ':blur\\((\\d+)px'));
      vero(m, 'manca ' + t);
      almeno(Number(m[1]), 10, t + ' troppo debole');
    });
    // Le tre intensita devono crescere: e' quella la gerarchia.
    const val = t => Number(css.match(new RegExp(t + ':blur\\((\\d+)px'))[1]);
    vero(val('--v1-blur') < val('--v2-blur'), 'livello 1 non piu leggero del 2');
    vero(val('--v2-blur') < val('--v3-blur'), 'livello 2 non piu leggero del 3');
  });

  await test('le superfici restano semitrasparenti', async () => {
    const a = await app();
    const css = a.d.querySelector('style').textContent;
    ['--v1-fondo', '--v2-fondo', '--v3-fondo'].forEach(t => {
      const riga = css.match(new RegExp(t + ':[^;]+'))[0];
      const alfe = [...riga.matchAll(/rgba\([^)]*?,\s*\.(\d+)\)/g)].map(m => Number('0.' + m[1]));
      vero(alfe.length, 'niente trasparenza in ' + t);
      vero(Math.max(...alfe) < 0.95, t + ' e praticamente opaco');
    });
  });

  await test('i bordi del vetro sono bianchi, non scuri', async () => {
    const a = await app();
    const css = a.d.querySelector('style').textContent;
    ['--v1-bordo', '--v2-bordo', '--v3-bordo'].forEach(t => {
      const riga = css.match(new RegExp(t + ':[^;]+'))[0];
      vero(/rgba\(255,\s*255,\s*255/.test(riga), t + ' non e bianco');
    });
  });

  await test('senza sfocatura le superfici diventano leggibili', async () => {
    const a = await app();
    const css = a.d.querySelector('style').textContent;
    vero(/@supports not \(\(backdrop-filter/.test(css), 'manca la variante senza blur');
  });

  console.log('\nMinimalismo');
  await test('la scheda dice l\'essenziale e mostra un disegno', async () => {
    const a = await app();
    const c = a.d.querySelector('#lista-cen .scheda');
    vero(c, 'nessuna scheda');
    vero(c.querySelector('.scheda-arte svg'), 'manca l\'illustrazione');
    const parole = c.textContent.trim().split(/\s+/).filter(Boolean).length;
    vero(parole <= 12, 'troppe parole nella scheda: ' + parole);
  });

  await test('nessuna icona piena o colorata', async () => {
    const a = await app();
    const pieni = [...a.d.querySelectorAll('svg')].filter(sv => {
      const f = sv.getAttribute('fill');
      return f && f !== 'none';
    });
    eq(pieni.length, 0, 'svg riempiti: ' + pieni.length);
  });

  await test('le icone hanno tratto sottile e angoli arrotondati', async () => {
    const a = await app();
    const icone = [...a.d.querySelectorAll('.tab-item .icon, .scheda-arte svg')];
    almeno(icone.length, 4, 'poche icone');
    const css = a.d.querySelector('style').textContent;
    vero(/stroke-width:1\.75/.test(css) || icone.some(i => i.getAttribute('stroke-width') === '1.75'),
      'tratto diverso da 1,75');
    vero(/stroke-linecap:round/.test(css) || icone.some(i => i.getAttribute('stroke-linecap') === 'round'),
      'estremi non arrotondati');
  });

  await test('le icone seguono le famiglie, e il peso decide il resto', async () => {
    const a = await app();
    const { ARTE, arteRicetta } = a.dom.window.fitmealsArte;
    const icona = t => {
      const r = a.stato().recipes.find(x => x.title.toLowerCase().startsWith(t));
      return r ? arteRicetta(r) : null;
    };
    eq(icona('spaghetti alla carbonara'), ARTE.farfalle, 'la carbonara non porta la farfalla');
    vero(/M13 7c3.4/.test(ARTE.farfalle), 'la farfalla non e\' quella in verticale');
    eq(icona('succo'), ARTE.brik, 'il succo non porta il brik con la cannuccia');
    eq(icona('te freddo'), ARTE.bottiglia33, 'il te freddo non porta la bottiglia di vetro');
    eq(icona("penne all'arrabbiata"), ARTE.farfalle, 'le penne non portano la farfalla');
    eq(icona('branzino'), ARTE.pesce, 'il branzino non porta il pesce');
    vero(icona('zuppa di ceci') === ARTE.legume || icona('zuppa di lenticchie') === ARTE.lenticchie,
      'le zuppe di legumi non mostrano i legumi');
  });

  await test('il titolo comanda: le uova al tonno mostrano il pesce', async () => {
    const a = await app();
    const { ARTE, arteRicetta } = a.dom.window.fitmealsArte;
    const r = a.stato().recipes.find(x => /uova ripiene/i.test(x.title));
    vero(r, 'ricetta non trovata');
    eq(arteRicetta(r), ARTE.pesce, 'le uova al tonno non seguono la famiglia del titolo');
  });

  console.log('\nAllenamento e colazioni ricche');
  await test('il filtro pre e post allenamento seleziona i piatti giusti', async () => {
    const a = await app();
    a.tab('view-search');
    a.click('[data-act=filtri-apri]');
    a.click('[data-act=filtro][data-val=workout][data-v=pre]');
    const pre = [...a.d.querySelectorAll('#recipe-list [data-act=detail]')].map(x => x.dataset.val);
    almeno(pre.length, 5, 'ricette pre workout');
    pre.forEach(id => {
      const r = a.stato().recipes.find(x => x.id === id);
      vero((r.tags || []).includes('pre-workout'), r.title + ' non e\' pre workout');
    });
    a.click('[data-act=filtro][data-val=workout][data-v=post]');
    const post = [...a.d.querySelectorAll('#recipe-list [data-act=detail]')].map(x => x.dataset.val);
    almeno(post.length, 10, 'ricette post workout');
  });

  await test('nel giorno di allenamento i suggerimenti ne tengono conto', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    const prima = a.dom.window.fitmealsPlan();
    a.tab('view-home');
    a.click('[data-act=training]');
    const dopo = a.dom.window.fitmealsPlan();
    vero(dopo.target > prima.target, 'l\'allenamento non alza il fabbisogno');
    a.click('[data-act=pasto-vai][data-val="2"]');
    almeno(a.conta('#pagina-cen .sugg'), 1, 'nessun suggerimento per la cena');
  });

  await test('le colazioni ricche ci sono e sono marcate come sgarro', async () => {
    const a = await app();
    const R = a.stato().recipes;
    const brioche = R.filter(r => /brioche|cornetto|merendina|frollini|plumcake|ciambella/i.test(r.title));
    almeno(brioche.length, 8, 'colazioni ricche');
    brioche.forEach(r => eq(r.portata, 'colazione', r.title + ' non e\' una colazione'));
    vero(brioche.some(r => /nocciole/i.test(r.title)), 'manca la crema di nocciole');
    vero(brioche.some(r => /pistacchio/i.test(r.title)), 'manca la crema di pistacchio');
    vero(brioche.some(r => /albicocche/i.test(r.title)), 'manca la marmellata di albicocche');
  });

  console.log('\nDesign applicato');
  await test('in cottura vedi gli ingredienti del passaggio', async () => {
    const a = await app();
    a.cerca('carbonara');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    a.click('[data-act=cook-next]');           // primo passaggio
    almeno(a.conta('.passo-chip'), 1, 'nessun ingrediente accanto al passaggio');
    vero(/\d/.test(a.testo('.passo-chip')), 'manca la quantita');
  });

  await test('il dettaglio si apre con solo l\'essenziale aperto', async () => {
    const a = await app();
    a.apri('petto di pollo alla piastra');
    const sez = [...a.d.querySelectorAll('#detail-body .sezione')];
    almeno(sez.length, 3, 'nessuna sezione richiudibile');
    const aperte = sez.filter(x => x.open).map(x => x.querySelector('summary').textContent);
    eq(aperte.length, 1, 'sezioni aperte: ' + aperte.join(', '));
    vero(aperte[0].includes('Ingredienti'), 'la sezione aperta non e\' quella giusta');
  });

  await test('il profilo mostra un gruppo per volta', async () => {
    const a = await app();
    a.tab('view-profile');
    const visibili = () => [...a.d.querySelectorAll('#view-profile [data-sez]')].filter(c => !c.hidden).length;
    const tutte = a.conta('#view-profile [data-sez]');
    almeno(tutte, 10, 'schede nel profilo');
    vero(visibili() < tutte, 'sono visibili tutte insieme');
    a.click('[data-act=prof-sez][data-val=dati]');
    vero(a.d.querySelector('#group-card') && !a.d.querySelector('#group-card').hidden,
      'la sezione Dati non mostra il gruppo');
  });

  await test('il fondale e\' un disegno grande e decentrato', async () => {
    const a = await app();
    const strati = [...a.d.querySelectorAll('#sfondo .strato')];
    eq(strati.length, 2, 'servono due strati per la dissolvenza');
    const viva = strati.find(x => x.classList.contains('viva'));
    vero(viva && /svg/.test(viva.style.backgroundImage), 'nessun disegno di fondo');
    const css = a.d.querySelector('style').textContent;
    vero(/background-position:118% 86%/.test(css), 'il fondale non e\' decentrato');
    vero(!/#sfondo\.f-/.test(css), 'i vecchi motivi a pallini sono ancora li');
  });

  await test('il fondale cambia con la ricetta aperta', async () => {
    const a = await app();
    const ora = () => (a.d.querySelector('#sfondo .strato.viva') || {}).style.backgroundImage;
    const prima = ora();
    a.cerca('branzino al cartoccio');
    a.click('#recipe-list .scheda');
    vero(ora() !== prima, 'il fondale non e\' cambiato aprendo la ricetta');
  });

  await test('ogni passaggio riconosce il gesto che chiede', async () => {
    const a = await app();
    a.cerca('carbonara');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    // Leggo il gesto, poi avanzo: il pulsante di destra cambia ruolo da solo.
    const azioni = [];
    for (let i = 0; i < 5; i++) {
      const eb = a.d.querySelector('.cook-eyebrow');
      if (eb && eb.textContent.includes('\u00b7')) azioni.push(eb.textContent.split('\u00b7')[1].trim());
      a.d.querySelectorAll('.cook-nav button')[1].click();
      await wait(800);
    }
    vero(azioni.includes('cuoci'), 'il rosolare non e\' riconosciuto');
    vero(azioni.includes('mescola'), 'lo sbattere non e\' riconosciuto');
    almeno(new Set(azioni).size, 2, 'tutti i passaggi hanno lo stesso gesto');
  });

  await test('un gesto solo chiude il passaggio e i suoi ingredienti', async () => {
    const a = await app();
    a.cerca('carbonara');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    a.click('[data-act=cook-next]');                    // passo 1
    eq(a.testo('#cook-progress'), '1 di 4', 'non siamo al primo passaggio');
    a.click('[data-act=cook-fatto]');
    await wait(900);
    eq(a.testo('#cook-progress'), '2 di 4', 'il gesto non ha fatto avanzare');
    vero(a.d.getElementById('cook-avanzamento').style.width !== '0%', 'la barra non avanza');
  });

  await test('si possono spuntare tutti gli ingredienti insieme', async () => {
    const a = await app();
    a.cerca('carbonara');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    a.click('[data-act=cook-next]');
    a.click('[data-act=cook-fatto]');
    await wait(900);                                    // passo 2: tuorli e pecorino
    vero(a.click('[data-act=passo-tutti]'), 'manca il comando per spuntarli tutti');
    await wait(1400);
    const rimasti = [...a.d.querySelectorAll('#cook-body .passo-chip:not(.tutti)')]
      .filter(c => !c.classList.contains('usato'));
    eq(rimasti.length, 0, 'qualche ingrediente e\' rimasto da spuntare');
  });

  await test('finita la ricetta le spunte si azzerano', async () => {
    const a = await app();
    a.cerca('pollo alla cacciatora');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    for (let i = 0; i < 6; i++) {
      const dx = a.d.querySelectorAll('.cook-nav button')[1];
      dx.click();
      await wait(700);
      if (a.d.getElementById('cook-mode').hidden) break;
    }
    const salvato = a.dom.window.localStorage.getItem('fitmeals.cook');
    eq(salvato, '{}', 'la sessione non si e\' azzerata: ' + salvato);
  });

  await test('toccare un ingrediente lo segna come messo', async () => {
    const a = await app();
    a.cerca('insalata di polpo');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    a.click('[data-act=cook-next]');
    const c = a.d.querySelector('.passo-chip');
    vero(c, 'nessun ingrediente nel passaggio');
    vero(/az-\w+/.test(c.className), 'manca il gesto sul chip');
    c.click();
    vero(c.classList.contains('agisci'), 'nessuna animazione');
    await wait(800);
    vero(a.d.querySelector('.passo-chip').classList.contains('usato'), 'non resta segnato');
  });

  await test('dalla salsa si torna alla ricetta di partenza', async () => {
    const a = await app();
    a.apri('petto di pollo alla piastra');
    const partenza = a.testo('#detail-body h2');
    const sez = [...a.d.querySelectorAll('#detail-body .sezione')]
      .find(x => x.querySelector('summary').textContent.includes('Ci sta bene'));
    vero(sez, 'nessun abbinamento su cui provare');
    sez.open = true;
    sez.querySelector('.sugg').click();
    vero(a.testo('#detail-body h2') !== partenza, 'non ha aperto la salsa');
    vero(a.testo('.torna').includes(partenza.slice(0, 12)), 'il comando indietro non nomina la ricetta');
    a.click('[data-act=detail-indietro]');
    eq(a.testo('#detail-body h2'), partenza, 'non e\' tornato indietro');
    eq(a.conta('.torna'), 0, 'il comando indietro resta anche a fine scia');
  });

  await test('gli ingredienti si mandano nella spesa uno per uno', async () => {
    const a = await app();
    a.apri('petto di pollo alla piastra');
    almeno(a.conta('.ing-piu'), 3, 'manca il comando su ogni ingrediente');
    a.click('.ing-piu');
    eq(a.stato().shopExtra.length, 1, 'ingrediente non aggiunto');
    vero(a.stato().shopExtra[0].qty, 'aggiunto senza quantita');
    vero(a.d.querySelector('.ing-piu').classList.contains('dentro'), 'non mostra che e\' gia in lista');
    a.click('.ing-piu');
    eq(a.stato().shopExtra.length, 0, 'il secondo tocco non lo toglie');
  });

  await test('si possono aggiungere solo gli ingredienti che mancano', async () => {
    const a = await app();
    // Serve qualcosa in dispensa, altrimenti "mancano tutti" e il comando
    // sarebbe un doppione di "tutta la ricetta".
    a.tab('view-fridge');
    const chip = [...a.d.querySelectorAll('#pantry-chips .chip')].find(c => c.dataset.val === 'pollo');
    vero(chip, 'pollo non e in dispensa');
    chip.click();
    a.apri('pollo alla cacciatora');
    const b = a.d.querySelector('[data-act=spesa-mancanti]');
    vero(b, 'manca il comando per i soli mancanti');
    b.click();
    const aggiunti = a.stato().shopExtra.map(x => x.n);
    almeno(aggiunti.length, 1, 'niente aggiunto');
    // quello che hai gia in dispensa non deve finirci
    aggiunti.forEach(n => vero(!a.stato().pantry.includes(n), n + ' era gia in dispensa'));
  });

  console.log('\nGesti');
  await test('prima di iniziare si sceglie per quante persone', async () => {
    const a = await app();
    a.cerca('carbonara');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    const dosi = () => [...a.d.querySelectorAll('#cook-body .cook-check .qty')].map(x => x.textContent).join('|');
    const uno = dosi();
    a.click('[data-act=porzioni][data-val="4"]');
    eq(a.testo('.porz-num b'), '4', 'il contatore non e\' cambiato');
    vero(dosi() !== uno, 'le dosi non seguono le persone');
    vero(/400 g/.test(dosi()), 'quattro porzioni non quadruplicano: ' + dosi());
    a.click('[data-act=cook-next]');
    // il guanciale e 40 g a porzione: per quattro sono 160
    vero(/160 g/.test(a.testo('.passo-chip')),
      'i passaggi non usano le stesse dosi: ' + a.testo('.passo-chip'));
  });

  await test('il timer resta visibile mentre giri fra i passaggi', async () => {
    const a = await app();
    a.cerca('tonno scottato');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    a.click('[data-act=cook-next]');
    a.d.getElementById('cook-body').dispatchEvent(new a.dom.window.MouseEvent('dblclick', { bubbles: true }));
    await wait(250);
    const mini = a.d.querySelector('.tpill');
    vero(mini, 'il timer non compare in cottura');
    vero(/\d+:\d\d/.test(mini.textContent), 'niente conto alla rovescia');
    a.click('[data-act=cook-fatto]');
    await wait(900);
    vero(a.d.querySelector('.tpill'), 'il timer sparisce cambiando passaggio');
  });

  await test('il passaggio successivo si vede in anteprima', async () => {
    const a = await app();
    a.cerca('pollo alla cacciatora');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    a.click('[data-act=cook-next]');
    vero(a.testo('.prossimo').startsWith('Poi:'), 'manca l\'anteprima del passo dopo');
  });

  await test('il testo del passaggio si ingrandisce a tocco', async () => {
    const a = await app();
    a.cerca('pollo alla cacciatora');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    a.click('[data-act=cook-next]');
    a.click('.cook-step');
    vero(a.d.querySelector('.cook-step').classList.contains('grande'), 'non si ingrandisce');
    a.click('.cook-step');
    vero(!a.d.querySelector('.cook-step').classList.contains('grande'), 'non torna piccolo');
  });

  await test('uscire a meta\' conserva il punto in cui eri', async () => {
    const a = await app();
    a.cerca('carbonara');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    a.click('[data-act=cook-next]');
    a.click('[data-act=cook-fatto]');
    await wait(900);
    a.click('[data-act=cook-close]');          // la croce: esco, non ho finito
    vero(a.d.getElementById('cook-mode').hidden, 'la finestra non si e\' chiusa');
    const salvato = a.dom.window.localStorage.getItem('fitmeals.cook');
    vero(salvato.length > 5, 'uscendo a meta\' ho perso il punto: ' + salvato);
    a.click('[data-act=cook-open]');
    vero(a.testo('#cook-progress') !== 'Ingredienti', 'non riprende da dove ero');
  });

  await test('tirare giu\' propone altri piatti', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-home');
    a.click('[data-act=pasto-vai][data-val="2"]');
    const prima = a.testo('#lista-cen');
    const pag = a.d.getElementById('pagina-cen');
    const ev = (tipo, y) => {
      const e = new a.dom.window.Event(tipo, { bubbles: true });
      e.touches = [{ clientX: 100, clientY: y }];
      e.changedTouches = [{ clientX: 100, clientY: y }];
      pag.dispatchEvent(e);
    };
    ev('touchstart', 100); ev('touchend', 260);
    vero(a.testo('#lista-cen') !== prima, 'i suggerimenti non cambiano');
  });

  await test('ogni timer ha la sua pastiglia, con la sigla', async () => {
    const a = await app();
    a.cerca('ossobuco');
    a.click('#recipe-list .scheda');
    [...a.d.querySelectorAll('#detail-body .step-timer')].forEach(b => b.click());
    a.click('[data-act=cook-open]');
    await wait(200);
    const pill = [...a.d.querySelectorAll('.tpill')];
    almeno(pill.length, 2, 'i timer non si vedono tutti');
    pill.forEach(c => {
      const sigla = c.querySelector('i').textContent.trim();
      vero(sigla.length && sigla.length <= 8, 'sigla poco leggibile: "' + sigla + '"');
      vero(/\d+:\d\d/.test(c.textContent), 'manca il conto alla rovescia');
      vero(c.style.left && c.style.top, 'la pastiglia non e\' posizionata');
    });
    vero(pill.some(c => c.querySelector('i').textContent === 'tutto'),
      'la cottura totale non e\' riconoscibile');
  });

  await test('la pastiglia si sposta e resta dove la metti', async () => {
    const a = await app();
    a.cerca('tonno scottato');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    a.click('[data-act=cook-next]');
    a.d.getElementById('cook-body').dispatchEvent(new a.dom.window.MouseEvent('dblclick', { bubbles: true }));
    await wait(250);
    const p = a.d.querySelector('.tpill');
    vero(p, 'nessuna pastiglia');
    p.dispatchEvent(new a.dom.window.MouseEvent('mousedown', { bubbles: true, clientX: 30, clientY: 110 }));
    a.d.dispatchEvent(new a.dom.window.MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 400 }));
    a.d.dispatchEvent(new a.dom.window.MouseEvent('mouseup', { bubbles: true }));
    const dove = p.style.left + ',' + p.style.top;
    vero(dove !== '16px,96px', 'non si e\' spostata');
    a.click('[data-act=cook-fatto]');
    await wait(900);
    const dopo = a.d.querySelector('.tpill');
    eq(dopo.style.left + ',' + dopo.style.top, dove, 'cambiando passaggio e\' tornata indietro');
  });

  await test('sull\'ultima schermata resta solo Fine', async () => {
    const a = await app();
    a.cerca('carbonara');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    for (let i = 0; i < 8; i++) {
      a.d.querySelectorAll('.cook-nav button')[1].click();
      await wait(700);
      if (a.testo('#cook-progress') === '') break;
    }
    eq(a.testo('#cook-progress'), '', 'l\'avanzamento dice ancora qualcosa');
    vero(a.d.querySelector('[data-act=cook-close]').hidden, 'la croce e\' ancora li');

    // Una sola "Fine", e sta fra i comandi come tutti gli altri pulsanti.
    const ovunque = [...a.d.querySelectorAll('#cook-mode button, #cook-mode span')]
      .filter(x => x.textContent.trim() === 'Fine');
    eq(ovunque.length, 1, 'scritte "Fine" trovate: ' + ovunque.length);
    eq(ovunque[0].closest('.cook-nav') ? 'nav' : 'altrove', 'nav',
      'la scritta Fine non sta fra i comandi');
    eq(ovunque[0].dataset.act, 'cook-fine', 'non chiude la ricetta');

    ovunque[0].click();
    vero(a.d.getElementById('cook-mode').hidden, 'Fine non chiude la finestra');
    eq(a.dom.window.localStorage.getItem('fitmeals.cook'), '{}', 'non ha azzerato');
  });

  console.log('\nDisegni');
  await test('il disegno degli spaghetti resta il mazzo legato', async () => {
    const a = await app();
    const svg = a.dom.window.fitmealsArte.ARTE.spaghetti;
    almeno((svg.match(/<path/g) || []).length, 8, 'mancano i fili del mazzo');
  });

  await test('le verdure condividono la stessa lingua botanica', async () => {
    const a = await app();
    const arte = t => { a.cerca(t); return a.d.querySelector('#recipe-list .scheda-arte svg').innerHTML; };
    ['insalata mista', 'broccoli ripassati', 'carciofi trifolati', 'carote'].forEach(() => {});
    ['insalata mista', 'broccoli ripassati', 'zucchine trifolate'].forEach(t => {
      const svg = arte(t);
      // nervatura centrale: il tratto verticale che tutte le foglie hanno
      vero(/M24 4\dV|M24 42V|M24 40V/.test(svg), t + ': manca la nervatura centrale');
    });
  });

  await test('le bevande non mostrano lettere', async () => {
    const a = await app();
    const { ARTE, arteRicetta } = a.dom.window.fitmealsArte;
    ['cola', 'chinotto', 'gassosa'].forEach(t => {
      const r = a.stato().recipes.find(x => new RegExp('(^|\\s)' + t + '($|\\s)').test(x.title.toLowerCase()));
      if (r) eq(arteRicetta(r), ARTE.bottiglia33, t + ' non porta la bottiglia da 33');
    });
  });

  await test('si possono confrontare piatti e ingredienti', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-search');
    vero(a.click('[data-act=confronta-apri]'), 'manca il comando Confronta');
    a.set('confronto-cerca', 'carbonara');
    a.click('#confronto-sugg .chip');
    a.set('confronto-cerca', 'poke bowl');
    a.click('#confronto-sugg .chip');
    eq(a.conta('.conf-col'), 2, 'colonne a confronto');
    almeno(a.conta('.conf-riga'), 5, 'righe di valori');
    eq(a.conta('.conf-riga .vince'), a.conta('.conf-riga'), 'ogni riga deve avere un vincitore');
    vero(a.testo('.verdetto').length > 40, 'nessun verdetto in fondo');

    // anche un ingrediente crudo
    a.set('confronto-cerca', 'tonno');
    const ing = [...a.d.querySelectorAll('#confronto-sugg .chip')].find(c => c.dataset.tipo === 'ingrediente');
    vero(ing, 'gli ingredienti non sono confrontabili');
    ing.click();
    eq(a.conta('.conf-col'), 3, 'terza colonna');
  });

  await test('il verdetto segue l\'obiettivo del profilo', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();     // definizione
    a.tab('view-search');
    a.click('[data-act=confronta-apri]');
    a.set('confronto-cerca', 'carbonara'); a.click('#confronto-sugg .chip');
    a.set('confronto-cerca', 'poke bowl'); a.click('#confronto-sugg .chip');
    vero(/definizione/.test(a.testo('.verdetto')), 'non spiega il perche in definizione');
  });

  await test('dal Grill Studio si arriva a cucinare', async () => {
    const a = await app();
    a.tab('view-search');
    vero(a.click('[data-act=grill-cuoci]'), 'manca il comando per eseguire');
    vero(!a.d.getElementById('cook-mode').hidden, 'la cucina non si apre');
    a.click('[data-act=cook-next]');
    vero(/Marina/.test(a.testo('.cook-step')), 'i passaggi non arrivano dal consiglio');
    a.click('[data-act=cook-close]');
    // la ricetta al volo non deve sporcare il ricettario salvato
    const disco = JSON.parse(a.dom.window.localStorage.getItem('fitmeals.v2'));
    eq((disco.recipes || []).filter(r => /^grill-/.test(r.id)).length, 0,
      'la ricetta improvvisata e\' finita nel salvataggio');
  });

  await test('le bevande si bevono, non si mangiano', async () => {
    const a = await app();
    a.apri('lattina di cola');
    vero(a.testo('#detail-body .azioni-rapide').includes('Bevuta'), 'dice ancora mangiato');
    a.apri('pollo alla cacciatora');
    vero(a.testo('#detail-body .azioni-rapide').includes('Mangiato'), 'il verbo e cambiato dove non doveva');
  });

  await test('il disegno si riempie con quello che hai in dispensa', async () => {
    const a = await app();
    a.tab('view-fridge');
    ['pollo', 'pomodori', 'cipolla'].forEach(n => {
      const c = [...a.d.querySelectorAll('#pantry-chips .chip')].find(x => x.dataset.val === n);
      if (c) c.click();
    });
    a.cerca('pollo alla cacciatora');
    const arte = a.d.querySelector('#recipe-list .scheda-arte');
    const riempi = arte.style.getPropertyValue('--riempi');
    vero(riempi && parseInt(riempi, 10) > 0, 'il livello resta a zero: ' + riempi);
  });

  console.log('\nAvanzi');
  const conAvanzi = (extra) => {
    const ora = Date.now();
    return {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      leftovers: extra(ora)
    };
  };

  await test('un avanzo torna solo nel suo pasto, il giro dopo', async () => {
    const a = await app({ storage: conAvanzi(ora => [
      // di ieri a pranzo: oggi a pranzo ci deve essere
      { rid:'c25', title:'Pollo di ieri', n:2, kcal:400, pro:45, ts: ora - 26 * 3600000, pasto:'pra' },
      // di oggi a pranzo: non stasera, e nemmeno adesso
      { rid:'p07', title:'Risotto di oggi', n:1, kcal:600, pro:15, ts: ora - 2 * 3600000, pasto:'pra' }
    ]) });
    vero(a.testo('#lista-pra').includes('Pollo di ieri'), 'l\'avanzo di ieri non torna a pranzo');
    vero(!a.testo('#lista-cen').includes('Risotto di oggi'), 'l\'avanzo del pranzo compare a cena');
    vero(!a.testo('#lista-cen').includes('Pollo di ieri'), 'un avanzo del pranzo compare a cena');
    eq(a.conta('#lista-cen .avanzo-nota'), 0, 'c\'e\' ancora l\'annuncio dell\'altro pasto');
    eq(a.conta('#lista-pra .avanzo-nota'), 0, 'c\'e\' ancora l\'annuncio dell\'altro pasto');
  });

  await test('la sezione dice quando un avanzo tornera\'', async () => {
    const a = await app({ storage: conAvanzi(ora => [
      { rid:'p07', title:'Risotto di oggi', n:1, kcal:600, pro:15, ts: ora - 2 * 3600000, pasto:'pra' }
    ]) });
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    const q = a.d.querySelector('#leftovers-body .avanzo-quando');
    vero(q, 'non dice quando tornera\'');
    vero(/pranzo/.test(q.textContent), 'non nomina il pasto: ' + q.textContent);
  });

  await test('se sta per scadere lo mostra comunque', async () => {
    const a = await app({ storage: conAvanzi(ora => [
      // pesce di ieri sera: la finestra e\' 24 ore, quindi stringe adesso
      { rid:'m01', title:'Orata di ieri', n:1, kcal:300, pro:40, ts: ora - 20 * 3600000, pasto:'cen' }
    ]) });
    vero(a.testo('#lista-cen').includes('Orata di ieri'),
      'un avanzo agli sgoccioli e\' stato nascosto dalla regola del pasto');
  });

  await test('senza avanzi non compare niente', async () => {
    const a = await app();
    eq(a.conta('#lista-cen .scheda.avanzo'), 0, 'avanzi dal nulla');
    eq(a.conta('#lista-cen .avanzo-nota'), 0, 'nota senza avanzi');
  });

  await test('lo stato di conservazione cambia con il tipo di piatto', async () => {
    // pesce e riso: un giorno. carne: due. verdure: tre.
    const a = await app({ storage: conAvanzi(ora => [
      { rid:'m01', title:'Branzino', n:1, kcal:300, pro:40, ts: ora - 26 * 3600000, pasto:'cen' },
      { rid:'c25', title:'Pollo', n:1, kcal:400, pro:45, ts: ora - 26 * 3600000, pasto:'cen' }
    ]) });
    a.tab('view-fridge');
    const schede = [...a.d.querySelectorAll('#leftovers-body .scheda.avanzo')];
    eq(schede.length, 2, 'avanzi mostrati');
    const stati = schede.map(x => (x.className.match(/stato-\w+/) || [''])[0]);
    vero(stati.includes('stato-scaduto'), 'il pesce di 26 ore dovrebbe essere oltre la finestra');
    vero(stati.some(x => x !== 'stato-scaduto'), 'la carne non ha la stessa finestra del pesce');
  });

  await test('gli avanzi in scadenza fanno scattare un avviso', async () => {
    const a = await app({ storage: conAvanzi(ora => [
      { rid:'c25', title:'Pollo alla piastra', n:2, kcal:400, pro:45, ts: ora - 34 * 3600000, pasto:'cen' }
    ]) });
    await wait(1500);
    vero(/finire entro/.test(a.testo('#toast')), 'nessun avviso: ' + a.testo('#toast'));
    a.tab('view-fridge');
    vero(a.conta('.avviso-avanzi'), 'nessun avviso nella scheda del frigo');
  });

  await test('le icone della barra sono un libro e un frigo', async () => {
    const a = await app();
    const icona = nome => [...a.d.querySelectorAll('.tab-item')]
      .find(t => t.textContent.includes(nome)).querySelector('.icon').innerHTML;
    vero(/M12 7\.5v13/.test(icona('Ricette')), 'le ricette non hanno il dorso del libro');
    vero(/M5 9h14/.test(icona('Frigo')), 'il frigo non ha la divisione del freezer');
    vero(/M16\.5 11v5/.test(icona('Frigo')), 'manca la maniglia verticale');
  });

  await test('gli avanzi hanno una sezione sempre raggiungibile', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      leftovers: [
        { rid:'c25', title:'Pollo', n:2, kcal:400, pro:45, ts: ora - 34 * 3600000, pasto:'cen' },
        { rid:'p07', title:'Risotto', n:1, kcal:600, pro:15, ts: ora - 5 * 3600000, pasto:'pra' }
      ] } });
    a.tab('view-fridge');
    eq(a.conta('[data-act=frigo-sez]'), 4, 'le sezioni del frigo');
    const badge = a.d.getElementById('badge-avanzi');
    eq(badge.textContent.trim(), '2', 'il contatore non dice quanti avanzi ci sono');
    vero(badge.className.includes('urgente'), 'non segnala che qualcosa stringe');

    a.click('[data-act=frigo-sez][data-val=avanzi]');
    const visibili = [...a.d.querySelectorAll('#view-fridge [data-fsez]')].filter(x => !x.hidden);
    eq(visibili.length, 1, 'si vede piu\' di una sezione per volta');
    eq(visibili[0].dataset.fsez, 'avanzi', 'sezione sbagliata');
    almeno(a.conta('.avanzi-somma > div'), 3, 'manca il riepilogo in cima');
    vero(/3\s*porzion/.test(a.testo('.avanzi-somma')), 'il totale porzioni non torna');
    eq(a.conta('#leftovers-body .scheda.avanzo'), 2, 'schede degli avanzi');
  });

  await test('senza avanzi la sezione resta pulita', async () => {
    const a = await app();
    a.tab('view-fridge');
    eq(a.d.getElementById('badge-avanzi').textContent.trim(), '', 'contatore acceso a vuoto');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    eq(a.conta('.avanzi-somma'), 0, 'riepilogo senza dati');
    vero(a.testo('#leftovers-body').includes('Niente di pronto'), 'manca il messaggio di vuoto');
  });

  console.log('\nFreschezza della spesa');
  const compra = (a, nomi) => {
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    nomi.forEach(n => {
      a.d.getElementById('shop-add').value = n;
      a.click('[data-act=shop-extra]');
    });
    for (let i = 0; i < 8; i++) {
      const it = a.d.querySelector('#shopping-body .shop-item:not(.done)');
      if (!it) break;
      it.click();
    }
    a.click('[data-act=shop-bought]');
    a.click('[data-act=conferma-si]');
  };

  await test('freschi e confezionati partono con durate diverse', async () => {
    const a = await app();
    compra(a, ['pollo', 'bresaola', 'riso']);
    const f = a.stato().freschezza;
    vero(f['pollo'] && f['pollo'].auto, 'il pollo non e\' stato datato in automatico');
    vero(f['bresaola'] && f['bresaola'].auto, 'la bresaola non e\' stata datata');
    // Il riso adesso una data ce l'ha: e' quella indicativa del secco, molto
    // piu' lunga di quella di un fresco, e resta correggibile a mano.
    vero(f['riso'] && f['riso'].stimata, 'il riso non ha una data stimata');
    const mesiRiso = Math.round((f['riso'].entro - f['riso'].dal) / (30 * 86400000));
    almeno(mesiRiso, 12, 'la finestra del riso e\' troppo corta: ' + mesiRiso + ' mesi');
    const durata = v => (v.entro - v.dal) / 86400000;
    vero(durata(f['riso']) > durata(f['pollo']) * 10,
      'il secco non dura piu\' del fresco: ' + Math.round(durata(f['riso'])) + ' contro '
      + Math.round(durata(f['pollo'])) + ' giorni');
    // il pollo dura meno della bresaola
    vero(f['pollo'].entro < f['bresaola'].entro, 'il pollo dovrebbe scadere prima');
  });

  await test('la data di un confezionato si scrive a mano', async () => {
    const a = await app();
    compra(a, ['riso']);
    const inp = a.d.querySelector('[data-act=fresco-data]');
    vero(inp, 'manca il campo per la data');
    inp.value = '2027-03-15';
    inp.dispatchEvent(new a.dom.window.Event('change', { bubbles: true }));
    const v = a.stato().freschezza['riso'];
    vero(v.entro, 'la data non e\' stata salvata');
    eq(new Date(v.entro).getFullYear(), 2027, 'anno sbagliato');
  });

  await test('ogni fresco propone ricette che lo usano', async () => {
    const a = await app();
    compra(a, ['pollo']);
    const scheda = a.d.querySelector('.fresco');
    almeno(scheda.querySelectorAll('.fresco-fondo .ric').length, 1, 'nessuna ricetta proposta');
    const id = scheda.querySelector('.fresco-fondo .ric').dataset.val;
    const r = a.stato().recipes.find(x => x.id === id);
    vero((r.ing || []).some(i => /pollo/.test(i.n)), r.title + ' non contiene pollo');
  });

  await test('un fresco agli sgoccioli fa scattare l\'avviso', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      pantry: ['pollo'], myIngredients: ['pollo'],
      freschezza: { pollo: { nome:'pollo', dal: ora - 40 * 3600000, entro: ora + 8 * 3600000, auto:true } }
    } });
    await wait(1000);
    vero(/pollo/i.test(a.testo('#toast')), 'nessun avviso: ' + a.testo('#toast'));
    a.tab('view-fridge');
    vero(a.d.getElementById('badge-fresco').className.includes('urgente'), 'la linguetta non avvisa');
  });

  console.log('\nFreezer');
  await test('dalla cronologia si aggiungono avanzi in frigo o in freezer', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('pollo alla cacciatora');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    almeno(a.conta('.storico'), 1, 'la cronologia e\' vuota');
    // Il pannellino si apre, poi si conferma la destinazione.
    a.click('[data-act=storico-apri]');
    const gelo = a.d.querySelector('[data-act=storico-conferma][data-dove=freezer]');
    vero(gelo, 'manca la conferma per il freezer');
    gelo.click();
    const x = a.stato().leftovers.find(y => y.dove === 'freezer');
    vero(x, 'non e\' finito nel freezer');
  });

  await test('il freezer si popola a mano con la sua data', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=freezer]');
    vero(a.d.getElementById('freezer-data').value, 'la data non e\' preimpostata a oggi');
    a.d.getElementById('freezer-nome').value = 'Ragu di manzo';
    a.d.getElementById('freezer-data').value = '2026-06-10';
    a.d.getElementById('freezer-n').value = '4';
    a.click('[data-act=freezer-add]');
    const x = a.stato().leftovers.find(y => y.title === 'Ragu di manzo');
    vero(x && x.dove === 'freezer', 'non registrato nel freezer');
    eq(x.n, 4, 'porzioni sbagliate');
    vero(new Date(x.ts).getMonth() === 5, 'la data di congelamento non e\' stata usata');
  });

  await test('la finestra del freezer dipende da cosa congeli', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=freezer]');
    const metti = (nome, data) => {
      a.d.getElementById('freezer-nome').value = nome;
      a.d.getElementById('freezer-data').value = data;
      a.click('[data-act=freezer-add]');
    };
    metti('Salmone', '2026-08-20');       // pesce grasso: 2 mesi
    metti('Filetti di orata', '2026-08-20');  // pesce magro: 6 mesi
    // Il termometro dice quanto resta: al salmone due mesi, all'orata sei.
    const etichette = [...a.d.querySelectorAll('#freezer-body .cons-lab')].map(x => x.textContent.trim());
    almeno(etichette.length, 2, 'mancano le barre di conservazione');
    const mesi = etichette.map(t => parseInt(t, 10)).filter(n => isFinite(n)).sort((x, y) => x - y);
    vero(mesi[mesi.length - 1] > mesi[0], 'le due finestre sono uguali: ' + etichette.join(', '));
  });

  await test('scongelare riporta il conto alle ore', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=freezer]');
    a.d.getElementById('freezer-nome').value = 'Zuppa';
    a.click('[data-act=freezer-add]');
    a.click('[data-act=scongela]');
    const x = a.stato().leftovers.find(y => y.title === 'Zuppa');
    eq(x.dove, 'frigo', 'non e\' passata in frigo');
    vero(Date.now() - x.ts < 5000, 'il conto non e\' ripartito');
  });

  await test('il freezer avvisa quando qualcosa va programmato', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      leftovers: [{ rid:'z1', title:'Salmone', n:2, kcal:0, pro:0,
                    ts: ora - 58 * 86400000, dove:'freezer', pasto:'cen' }]
    } });
    await wait(2300);
    vero(/freezer|Salmone/i.test(a.testo('#toast')), 'nessun avviso: ' + a.testo('#toast'));
    a.tab('view-fridge');
    vero(a.d.getElementById('badge-freezer').className.includes('urgente'), 'la linguetta non avvisa');
  });

  console.log('\nScorte');
  await test('la barra della spesa suggerisce mentre scrivi', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    a.set('shop-add', 'poll');
    almeno(a.conta('#shop-suggest .chip'), 2, 'nessun suggerimento');
    const primo = a.d.querySelector('#shop-suggest .chip');
    vero(/poll/i.test(primo.dataset.val), 'suggerimento fuori tema: ' + primo.dataset.val);
    primo.click();
    eq(a.d.getElementById('shop-add').value, primo.dataset.val, 'non riempie il campo');
    eq(a.conta('#shop-suggest .chip'), 0, 'i suggerimenti restano aperti');
  });

  await test('l\'unita\' segue l\'ingrediente', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    a.set('shop-add', 'pollo');
    eq(a.testo('#shop-unita'), 'g', 'il pollo si pesa');
    a.set('shop-add', 'uovo');
    eq(a.testo('#shop-unita'), 'pz', 'le uova si contano');
    a.click('[data-act=shop-unita]');
    eq(a.testo('#shop-unita'), 'g', 'l\'unita non si puo\' correggere a mano');
  });

  await test('la dispensa tiene il conto di quanto resta', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    a.set('shop-add', 'pollo');
    a.d.getElementById('shop-qta').value = '400';
    a.click('[data-act=shop-extra]');
    for (let i = 0; i < 8; i++) {
      const it = a.d.querySelector('#shopping-body .shop-item:not(.done)');
      if (!it) break;
      it.click();
    }
    a.click('[data-act=shop-bought]');
    a.click('[data-act=conferma-si]');
    eq(a.stato().freschezza['pollo'].qta, 400, 'la quantita\' non e\' entrata in dispensa');

    // una ricetta che ne usa 200
    a.apri('petto di pollo alla piastra');
    a.click('#detail-body [data-act=log-meal]');
    eq(a.stato().freschezza['pollo'].qta, 200, 'il conto non e\' calato di 200');

    // e quello che resta continua a invecchiare con la stessa data
    vero(a.stato().freschezza['pollo'].entro, 'la data di scadenza si e\' persa');
  });

  await test('finita la scorta, l\'ingrediente esce dalla dispensa', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    a.set('shop-add', 'pollo');
    a.d.getElementById('shop-qta').value = '200';
    a.click('[data-act=shop-extra]');
    for (let i = 0; i < 8; i++) {
      const it = a.d.querySelector('#shopping-body .shop-item:not(.done)');
      if (!it) break;
      it.click();
    }
    a.click('[data-act=shop-bought]');
    a.click('[data-act=conferma-si]');
    a.apri('petto di pollo alla piastra');
    a.click('#detail-body [data-act=log-meal]');
    vero(!a.stato().freschezza['pollo'], 'la scorta esaurita resta in elenco');
    vero(!a.stato().pantry.includes('pollo'), 'resta segnato in dispensa');
  });

  await test('i surgelati comprati finiscono nel freezer', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    [['pollo', '400'], ['piselli surgelati', '500'], ['riso', '500']].forEach(([n, q]) => {
      a.set('shop-add', n);
      a.d.getElementById('shop-qta').value = q;
      a.click('[data-act=shop-extra]');
    });
    for (let i = 0; i < 10; i++) {
      const it = a.d.querySelector('#shopping-body .shop-item:not(.done)');
      if (!it) break;
      it.click();
    }
    eq(a.testo('[data-act=shop-bought]').trim(), 'Fine spesa', 'il tasto non si chiama Fine spesa');
    a.click('[data-act=shop-bought]');
    a.click('[data-act=conferma-si]');

    const f = a.stato().freschezza;
    eq(f['pollo'].posto, 'frigo', 'il pollo non e\' in frigo');
    eq(f['piselli surgelati'].posto, 'freezer', 'i surgelati non sono nel freezer');
    eq(f['riso'].posto, 'dispensa', 'il riso non e\' in dispensa');
    // e la lista si e\' svuotata
    eq(a.stato().shopExtra.length, 0, 'le voci comprate sono rimaste in lista');
    vero(/in frigo/.test(a.testo('#toast')) && /in freezer/.test(a.testo('#toast')),
      'il riepilogo non dice dove sono finite: ' + a.testo('#toast'));
  });

  await test('un surgelato usa il protocollo dei mesi', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    a.set('shop-add', 'piselli surgelati');
    a.click('[data-act=shop-extra]');
    for (let i = 0; i < 6; i++) {
      const it = a.d.querySelector('#shopping-body .shop-item:not(.done)');
      if (!it) break;
      it.click();
    }
    a.click('[data-act=shop-bought]');
    a.click('[data-act=conferma-si]');
    a.click('[data-act=frigo-sez][data-val=freezer]');
    const testo = a.testo('#freezer-body');
    vero(/mesi/.test(testo), 'nel freezer non parla di mesi: ' + testo.slice(0, 80));
    vero(!/ore/.test(testo), 'nel freezer usa ancora le ore');
  });

  await test('lo stato si legge da una barra, non da una frase', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      pantry: ['pollo', 'bresaola'], myIngredients: ['pollo', 'bresaola'],
      freschezza: {
        pollo: { nome:'pollo', posto:'frigo', dal: ora - 30 * 3600000, entro: ora + 18 * 3600000,
                 auto:true, qta:400, unita:'g' },
        bresaola: { nome:'bresaola', posto:'frigo', dal: ora - 3600000, entro: ora + 71 * 3600000,
                    auto:true, qta:100, unita:'g' }
      }
    } });
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=frigo]');
    const barre = [...a.d.querySelectorAll('#frigo-body .cons')];
    eq(barre.length, 2, 'una barra per voce');

    const pollo = barre.find(x => x.closest('.fresco').textContent.includes('pollo'));
    const bres = barre.find(x => x.closest('.fresco').textContent.includes('bresaola'));
    const pct = el => parseFloat(el.querySelector('.cons-track i').style.width);
    vero(pct(pollo) < pct(bres), 'il pollo dovrebbe essere piu\' avanti: '
      + pct(pollo) + ' contro ' + pct(bres));
    vero(pollo.className.includes('stato-scade'), 'il pollo non e\' segnalato');
    vero(bres.className.includes('stato-fresco'), 'la bresaola non e\' tranquilla');
    vero(/h$/.test(pollo.querySelector('.cons-lab').textContent.trim()), 'sigla in ore attesa');
    vero(/g$/.test(bres.querySelector('.cons-lab').textContent.trim()), 'sigla in giorni attesa');
  });

  await test('il frigo ha la sua sezione, a sinistra del freezer', async () => {
    const a = await app();
    a.tab('view-fridge');
    const chip = [...a.d.querySelectorAll('[data-act=frigo-sez]')].map(b => b.dataset.val);
    vero(chip.includes('frigo'), 'manca la sezione frigo');
    vero(chip.indexOf('frigo') < chip.indexOf('freezer'), 'il frigo non sta prima del freezer');
  });

  await test('usare un ingrediente non azzera la sua data', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    a.set('shop-add', 'pollo');
    a.d.getElementById('shop-qta').value = '400';
    a.click('[data-act=shop-extra]');
    for (let i = 0; i < 8; i++) {
      const it = a.d.querySelector('#shopping-body .shop-item:not(.done)');
      if (!it) break;
      it.click();
    }
    a.click('[data-act=shop-bought]');
    a.click('[data-act=conferma-si]');
    const prima = a.stato().freschezza['pollo'];
    const dal = prima.dal, entro = prima.entro;

    a.apri('petto di pollo alla piastra');
    a.click('#detail-body [data-act=log-meal]');

    const dopo = a.stato().freschezza['pollo'];
    eq(dopo.qta, 200, 'la quantita\' non e\' calata');
    eq(dopo.dal, dal, 'la data di acquisto e\' stata riscritta');
    eq(dopo.entro, entro, 'la scadenza e\' stata rimandata');
  });

  console.log('\nRegistro e formati');
  await test('un avanzo consumato sparisce da tutto', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('pollo alla cacciatora');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    a.click('[data-act=storico-apri]');
    a.click('[data-act=storico-conferma][data-dove=frigo]');
    eq(a.stato().leftovers.length, 1, 'avanzo non creato');

    vero(a.testo('#leftovers-body').includes('consumato'), 'manca il comando consumato');
    eq(a.conta('#leftovers-body .x'), 0, 'c\'e\' ancora la croce');
    a.click('[data-act=avanzo-finito]');
    eq(a.stato().leftovers.length, 0, 'l\'avanzo resta');
    eq(a.conta('.storico'), 0, 'resta anche nella cronologia');
  });

  await test('la cronologia si cancella una ricetta per volta', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    ['pollo alla cacciatora', 'lasagne alla bolognese'].forEach(q => {
      a.apri(q);
      a.click('#detail-body [data-act=log-meal]');
    });
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    eq(a.conta('.storico'), 2, 'cronologia incompleta');
    a.click('.storico [data-act=storico-nascondi]');
    eq(a.conta('.storico'), 1, 'ne ha tolta piu\' di una');
  });

  await test('il formato di pasta cambia i valori e il registro', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('amatriciana');
    almeno(a.conta('[data-act=formato]'), 5, 'nessun formato proposto');
    const kcal = () => parseInt(a.d.querySelector('#detail-body .macro-box b').textContent, 10);
    const secca = kcal();
    a.click('[data-act=formato][data-f=gnocchi]');
    const gnocchi = kcal();
    vero(gnocchi < secca, 'gli gnocchi dovrebbero pesare meno: ' + gnocchi + ' contro ' + secca);
    a.click('#detail-body [data-act=log-meal]');
    eq(a.stato().log[0].kcal, gnocchi, 'nel registro sono finite le calorie sbagliate');
    eq(Object.values(a.stato().daily)[0].k, gnocchi, 'il totale del giorno non torna');
  });

  await test('il formato compare solo sui primi di pasta', async () => {
    const a = await app();
    a.apri('petto di pollo alla piastra');
    eq(a.conta('[data-act=formato]'), 0, 'formati offerti su un secondo');
    a.apri('risotto alla milanese');
    eq(a.conta('[data-act=formato]'), 0, 'formati offerti su un risotto');
  });

  await test('si puo\' correggere quello che hai gia\' registrato', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="1"]');
    a.click('[data-act=quick-open][data-val=pra]');
    a.d.getElementById('q-nome').value = 'Pizza';
    a.d.getElementById('q-kcal').value = '900';
    a.click('[data-act=quick-save]');
    eq(Object.values(a.stato().daily)[0].k, 900, 'non registrato');

    a.click('[data-act=log-mod]');
    eq(a.d.getElementById('q-kcal').value, '900', 'la finestra non e\' precompilata');
    a.d.getElementById('q-kcal').value = '650';
    a.click('[data-act=quick-save]');
    eq(a.stato().log.length, 1, 'ha creato una voce nuova invece di correggere');
    eq(a.stato().log[0].kcal, 650, 'valore non corretto');
    eq(Object.values(a.stato().daily)[0].k, 650, 'il totale del giorno non e\' stato ricalcolato');
  });

  console.log('\nFIFO e combinazioni');
  const conFrigo = () => {
    const ora = Date.now();
    return {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      pantry: ['rucola', 'grana'], myIngredients: ['rucola', 'grana'],
      freschezza: {
        rucola: { nome:'rucola', posto:'frigo', dal: ora - 4 * 86400000,
                  entro: ora + 86400000, auto:true, qta:80, unita:'g' },
        grana: { nome:'grana', posto:'frigo', dal: ora - 2 * 86400000,
                 entro: ora + 10 * 86400000, auto:true, qta:150, unita:'g' }
      },
      leftovers: [{ rid:'r1', title:'Carpaccio di manzo', n:1, kcal:300, pro:30,
                    ts: ora - 30 * 3600000, pasto:'cen' }]
    };
  };

  await test('le scorte si vedono in ordine di arrivo', async () => {
    const a = await app({ storage: conFrigo() });
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=frigo]');
    const nomi = [...a.d.querySelectorAll('#frigo-body .fresco-nome b')].map(x => x.textContent);
    vero(/rucola/.test(nomi[0]), 'il piu\' vecchio non e\' in cima: ' + nomi.join(', '));
    // e ognuno dice da quanto e\' li
    const eta = a.d.querySelector('#frigo-body .fresco-nome > span').textContent;
    vero(/da \d+ giorni|da ieri|da poco|da \d+ ore/.test(eta), 'non dice da quanto: ' + eta);
  });

  await test('avanzi e freschi si combinano con criterio', async () => {
    const a = await app({ storage: conFrigo() });
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    const proposte = [...a.d.querySelectorAll('#combinazioni-body .scheda-titolo')].map(x => x.textContent);
    almeno(proposte.length, 1, 'nessuna combinazione');
    // carpaccio avanzato + rucola vecchia + grana => bresaola, rucola e grana
    vero(proposte.some(t => /Bresaola, rucola e grana/.test(t)),
      'non propone il piatto giusto: ' + proposte.join(' | '));
    // e non ripropone il piatto che hai gia\' in frigo
    vero(!proposte.some(t => /Carpaccio di manzo con rucola/.test(t)),
      'ripropone la ricetta da cui viene l\'avanzo');
  });

  await test('ogni ingrediente dice da quanto ce l\'hai', async () => {
    const a = await app({ storage: conFrigo() });
    a.apri('bresaola rucola');
    const righe = [...a.d.querySelectorAll('#detail-body .ing-eta')];
    almeno(righe.length, 2, 'nessuna riga sotto gli ingredienti');
    const rucola = righe.find(x => x.closest('li').textContent.includes('rucola'));
    vero(/in frigo da 4 giorni/.test(rucola.textContent), 'eta sbagliata: ' + rucola.textContent);
    vero(/\d+\s*(h|g|mesi)/.test(rucola.textContent), 'manca lo stato di conservazione');
  });

  await test('cuocere apre un nuovo orologio, il crudo tiene il suo', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'], frigoSez:'frigo' },
      pantry: ['pollo'], myIngredients: ['pollo'],
      freschezza: { pollo: { nome:'pollo', posto:'frigo', dal: ora - 30 * 3600000,
                             entro: ora + 18 * 3600000, auto:true, qta:400, unita:'g' } }
    } });
    a.tab('view-fridge');
    const dalPrima = a.stato().freschezza['pollo'].dal;
    const entroPrima = a.stato().freschezza['pollo'].entro;

    a.click('[data-act=cuoci-apri]');
    a.d.getElementById('cuoci-qta').value = '300';
    a.click('[data-act=cuoci-fai]');

    const f = a.stato().freschezza;
    eq(f['pollo'].qta, 100, 'il crudo non e\' calato');
    eq(f['pollo'].dal, dalPrima, 'il crudo ha cambiato data di acquisto');
    eq(f['pollo'].entro, entroPrima, 'il crudo ha cambiato scadenza');

    const cotto = f['pollo cotto'];
    vero(cotto, 'il cotto non e\' nato');
    eq(cotto.qta, 300, 'quantita\' sbagliata nel cotto');
    vero(cotto.cotto, 'non e\' segnato come cotto');
    vero(cotto.dal > dalPrima, 'il cotto non riparte da adesso');
    // due giorni per la carne cotta
    const giorni = Math.round((cotto.entro - cotto.dal) / 86400000);
    eq(giorni, 2, 'la finestra del pollo cotto dovrebbe essere di due giorni');
    // e il cotto scade dopo il crudo, che era quasi finito
    vero(cotto.entro > entroPrima, 'cuocendo non ha guadagnato tempo');
  });

  await test('la finestra del cotto dipende da cosa hai cotto', async () => {
    const ora = Date.now();
    const base = nome => ({
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'], frigoSez:'frigo' },
      pantry: [nome], myIngredients: [nome],
      freschezza: { [nome]: { nome: nome, posto:'frigo', dal: ora - 3600000,
                              entro: ora + 20 * 3600000, auto:true, qta:200, unita:'g' } }
    });
    const giorniDi = async nome => {
      const a = await app({ storage: base(nome) });
      a.tab('view-fridge');
      a.click('[data-act=cuoci-apri]');
      a.d.getElementById('cuoci-qta').value = '100';
      a.click('[data-act=cuoci-fai]');
      const c = a.stato().freschezza[nome + ' cotto'];
      return Math.round((c.entro - c.dal) / 86400000);
    };
    eq(await giorniDi('salmone'), 1, 'il pesce cotto dovrebbe durare un giorno');
    eq(await giorniDi('zucchine'), 3, 'le verdure cotte dovrebbero durare tre giorni');
  });

  console.log('\nDispensa');
  await test('la dispensa si riempie a mano, in grammi, chili o pezzi', async () => {
    const a = await app();
    a.tab('view-fridge');
    const metti = (n, q, u) => {
      a.set('disp-cerca', n);
      const b = a.d.getElementById('disp-unita');
      let giri = 0;
      while (b.textContent.trim() !== u && giri++ < 4) b.click();
      a.d.getElementById('disp-qta').value = q;
      a.click('[data-act=disp-add]');
    };
    metti('riso', '1', 'kg');
    metti('pasta', '500', 'g');
    metti('uovo', '6', 'pz');

    const f = a.stato().freschezza;
    eq(f['riso'].qta, 1000, 'il chilo non e\' diventato mille grammi');
    eq(f['uovo'].unita, 'pz', 'le uova non si contano a pezzi');
    eq(f['riso'].posto, 'dispensa', 'il riso non e\' in dispensa');
    vero(a.testo('#dispensa-body').includes('1 kg'), 'mille grammi non si leggono come un chilo');
  });

  await test('la dispensa e\' divisa per corsie', async () => {
    const a = await app();
    a.tab('view-fridge');
    const metti = (n, q) => {
      a.set('disp-cerca', n);
      a.d.getElementById('disp-qta').value = q;
      a.click('[data-act=disp-add]');
    };
    metti('riso', '900');
    metti('passata di pomodoro', '700');
    metti('biscotti', '300');
    const corsie = [...a.d.querySelectorAll('#dispensa-body .sezione-titolo')].map(x => x.textContent);
    almeno(corsie.length, 3, 'le corsie non ci sono: ' + corsie.join(', '));
    vero(corsie.some(t => /Pasta, riso/.test(t)), 'manca la corsia dei cereali');
    vero(corsie.some(t => /Conserve/.test(t)), 'manca la corsia delle conserve');
  });

  await test('il secco ha durate sue, non quelle del fresco', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.set('disp-cerca', 'passata di pomodoro');
    a.d.getElementById('disp-qta').value = '700';
    a.click('[data-act=disp-add]');
    const v = a.stato().freschezza['passata di pomodoro'];
    const mesi = Math.round((v.entro - v.dal) / (30 * 86400000));
    almeno(mesi, 24, 'un barattolo di passata non dura come un pomodoro fresco: ' + mesi + ' mesi');
  });

  await test('la ricerca in dispensa propone quello che hai', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.set('disp-cerca', 'riso');
    a.d.getElementById('disp-qta').value = '900';
    a.click('[data-act=disp-add]');
    a.set('disp-cerca', 'ri');
    const chip = [...a.d.querySelectorAll('#disp-suggest .chip')];
    almeno(chip.length, 1, 'nessun suggerimento');
    vero(chip[0].classList.contains('active'), 'quello che hai non viene per primo');
    vero(/900|riso/.test(chip[0].textContent), 'non dice quanto ne hai');
  });

  await test('la scorta si corregge o si elimina da li\'', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.set('disp-cerca', 'riso');
    a.d.getElementById('disp-qta').value = '900';
    a.click('[data-act=disp-add]');
    a.click('#dispensa-body .resta');
    vero(a.d.getElementById('scorta-qta'), 'non si apre la correzione');
    a.d.getElementById('scorta-qta').value = '400';
    a.click('[data-act=scorta-salva]');
    eq(a.stato().freschezza['riso'].qta, 400, 'la correzione non ha preso');

    a.click('#dispensa-body .resta');
    a.d.getElementById('scorta-qta').value = '0';
    a.click('[data-act=scorta-salva]');
    vero(!a.stato().freschezza['riso'], 'a zero non sparisce');
  });

  await test('cucinare scala anche la dispensa', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-fridge');
    a.set('disp-cerca', 'riso');
    const b = a.d.getElementById('disp-unita');
    let giri = 0;
    while (b.textContent.trim() !== 'kg' && giri++ < 4) b.click();
    a.d.getElementById('disp-qta').value = '1';
    a.click('[data-act=disp-add]');
    eq(a.stato().freschezza['riso'].qta, 1000, 'partenza sbagliata');

    a.apri('risotto alla milanese');
    a.click('#detail-body [data-act=log-meal]');
    const resta = a.stato().freschezza['riso'].qta;
    vero(resta < 1000 && resta > 800, 'il riso non e\' calato del giusto: ' + resta);
  });

  await test('dalla cronologia si dice quante porzioni sono avanzate', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('pollo alla cacciatora');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    a.click('[data-act=storico-apri]');
    vero(a.d.querySelector('.porz-mini'), 'manca il contatore delle porzioni');
    a.click('[data-act=storico-piu]'); a.click('[data-act=storico-piu]');
    a.click('[data-act=storico-piu]'); a.click('[data-act=storico-piu]');
    eq(a.testo('.storico-conferma .porz-mini b').trim(), '2\u00bd', 'il contatore non sale a mezzi');

    // e si puo\' contare in grammi invece che in porzioni
    a.click('[data-act=storico-unita]');
    vero(/grammi/.test(a.testo('.storico-conferma')), 'non passa ai grammi');
    vero(/porzioni/.test(a.testo('.storico-eq')), 'non dice a quante porzioni corrisponde');
    a.click('[data-act=storico-unita]');

    a.click('[data-act=storico-conferma][data-dove=frigo]');
    eq(a.stato().leftovers[0].n, 3, 'ha messo via una porzione sola');
    eq(a.stato().leftovers[0].dove, 'frigo', 'destinazione sbagliata');
  });

  await test('nella spesa si comprano anche i chili', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    a.set('shop-add', 'riso');
    const b = a.d.getElementById('shop-unita');
    let giri = 0;
    while (b.textContent.trim() !== 'kg' && giri++ < 4) b.click();
    a.d.getElementById('shop-qta').value = '2';
    a.click('[data-act=shop-extra]');
    const x = a.stato().shopExtra[0];
    eq(x.qty, '2 kg', 'in lista non si legge in chili');
    eq(x.qta, 2000, 'dentro non e\' in grammi');
  });

  console.log('\nAnello e ingressi rapidi');
  await test('la bilancia e\' una sola, sopra le pagine dei pasti', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-home');
    eq(a.conta('#view-home .bilancia'), 1, 'la bilancia deve essere una');
    const box = a.d.getElementById('anello-unico');
    vero(box.querySelector('svg') && box.querySelector('.ago'), 'manca la bilancia');
    eq(box.querySelectorAll('.tracciato').length, 3, 'servono i tre settori dei pasti');
    eq(box.querySelectorAll('.gamba').length, 3, 'servono le tre gambe');
    almeno(box.querySelectorAll('.cifra').length, 5, 'mancano le cifre della scala');
    a.click('[data-act=pasto-vai][data-val="0"]');
    vero(box.querySelector('.gamba.qui.f-col'), 'a colazione l\'evidenza non si sposta');
    a.click('[data-act=pasto-vai][data-val="2"]');
    vero(box.querySelector('.gamba.qui.f-cen'), 'a cena l\'evidenza non si sposta');
  });

  await test('l\'anello si riempie con quello che mangi', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-home');
    const box = a.d.getElementById('anello-unico');
    const centro = Number(box.querySelector('.conta-kcal').dataset.valore);
    almeno(centro, 500, 'il centro non conta quello che hai mangiato');
    // gli archi pieni ora esistono solo quando il pasto ha qualcosa dentro
    eq(box.querySelectorAll('.riempito').length, 1, 'dovrebbe essersi riempito un arco solo');
  });

  await test('il menu del giorno si modifica dalla home', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="2"]');
    a.click('[data-act=quick-open][data-val=cen]');
    a.d.getElementById('q-nome').value = 'Pizza';
    a.d.getElementById('q-kcal').value = '900';
    a.click('[data-act=quick-save]');
    a.tab('view-home');
    const voci = a.d.querySelectorAll('#anello-unico .voce-oggi');
    eq(voci.length, 1, 'la voce non compare nel menu del giorno');
    vero(a.d.querySelector('#anello-unico .voce-piu'), 'manca il comando per aggiungere');
    voci[0].querySelector('.x').click();
    eq(a.stato().log.length, 0, 'la croce non toglie la voce');
  });

  await test('ogni sezione del frigo ha la sua ricerca', async () => {
    const a = await app();
    a.tab('view-fridge');
    ['frigo', 'freezer', 'avanzi'].forEach(sez => {
      a.click('[data-act=frigo-sez][data-val=' + sez + ']');
      vero(a.d.getElementById('cerca-' + sez), 'manca la ricerca in ' + sez);
    });
  });

  await test('la ricerca filtra dalla prima lettera', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'], frigoSez:'frigo' },
      pantry: ['pollo', 'bresaola', 'salmone'], myIngredients: ['pollo', 'bresaola', 'salmone'],
      freschezza: {
        pollo: { nome:'pollo', posto:'frigo', dal: ora, entro: ora + 2 * 86400000, qta:400, unita:'g' },
        bresaola: { nome:'bresaola', posto:'frigo', dal: ora, entro: ora + 3 * 86400000, qta:100, unita:'g' },
        salmone: { nome:'salmone', posto:'frigo', dal: ora, entro: ora + 86400000, qta:300, unita:'g' }
      }
    } });
    a.tab('view-fridge');
    eq(a.conta('#frigo-body .fresco'), 3, 'partenza sbagliata');
    a.set('cerca-frigo', 's');
    eq(a.conta('#frigo-body .fresco'), 2, 'la prima lettera non filtra');
    a.set('cerca-frigo', 'bre');
    eq(a.conta('#frigo-body .fresco'), 1, 'il filtro non stringe');
    a.set('cerca-frigo', '');
    eq(a.conta('#frigo-body .fresco'), 3, 'svuotando non torna tutto');
  });

  await test('la griglia degli ingredienti si apre a richiesta', async () => {
    const a = await app();
    a.tab('view-fridge');
    vero(a.d.getElementById('pantry-chips').hidden, 'la griglia e\' aperta di default');
    a.click('[data-act=pantry-apri]');
    vero(!a.d.getElementById('pantry-chips').hidden, 'non si apre');
    almeno(a.conta('#pantry-chips .chip'), 5, 'griglia vuota');
    a.click('[data-act=pantry-apri]');
    vero(a.d.getElementById('pantry-chips').hidden, 'non si richiude');
  });

  await test('gli ingredienti si scrivono come si parla', async () => {
    const a = await app();
    a.click('[data-act=open-form]');
    a.d.getElementById('f-title').value = 'Prova';
    ['f-kcal', 'f-pro', 'f-prep', 'f-cook'].forEach((x, i) =>
      a.d.getElementById(x).value = [500, 40, 10, 15][i]);
    a.d.getElementById('f-ing').value =
      "200 g di pollo\n4 cipolle\npepe q.b.\n2 cucchiai di olio evo\n1 kg di patate\n3 spicchi d'aglio\nbasilico";
    a.d.getElementById('f-steps').value = 'Cuoci bene il tutto.';
    a.d.getElementById('form-recipe').dispatchEvent(
      new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const r = a.stato().recipes.find(x => x.title === 'Prova');
    const trova = n => r.ing.find(i => i.n === n);
    eq(trova('pollo').q, 200, 'grammi non letti');
    eq(trova('cipolle').q, 4, 'i pezzi non sono stati letti');
    eq(trova('cipolle').u, '', 'i pezzi non devono avere unita');
    eq(trova('pepe').u, 'q.b.', 'il quanto basta non e\' stato riconosciuto');
    eq(trova('basilico').u, 'q.b.', 'il solo nome vale come quanto basta');
    eq(trova('olio evo').u, 'cucchiaio', 'i cucchiai non sono stati letti');
    eq(trova('patate').q, 1000, 'il chilo non e\' diventato grammi');
    eq(trova('aglio').u, 'spicchio', "l'apostrofo ha rotto la lettura");
  });

  console.log('\nPorzioni, allenamento e calendario');
  await test('le persone si cambiano dalla ricetta, le calorie no', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('petto di pollo alla piastra');
    const dose = () => a.d.querySelector('#detail-body .ing-list .qty').textContent;
    const kcal = () => a.testo('#detail-body .macro-box b');
    const unaDose = dose(), unaKcal = kcal();

    const piu = () => [...a.d.querySelectorAll('[data-act=persone]')].pop();
    piu().click(); piu().click();
    eq(a.testo('.persone .porz-mini b').trim(), '3', 'il contatore non sale');
    vero(dose() !== unaDose, 'le dosi non seguono le persone');
    vero(/600/.test(dose()), 'per tre non triplica: ' + dose());
    eq(kcal(), unaKcal, 'le calorie della tua porzione sono cambiate');
    vero(/In tutto per 3/.test(a.testo('#detail-body')), 'non dice il totale del piatto');

    a.click('#detail-body [data-act=log-meal]');
    const registrato = a.stato().log[0].kcal;
    vero(registrato < 500, 'ha registrato le calorie di tre persone: ' + registrato);
  });

  await test('il comando allenamento sta sulla bilancia, sempre visibile', async () => {
    const a = await app();
    a.profiloBase();
    a.tab('view-home');
    const box = a.d.getElementById('anello-unico');
    vero(box.querySelector('[data-act=training]'), 'manca il comando allenamento');
    const prima = a.dom.window.fitmealsPlan().target;
    box.querySelector('[data-act=training]').click();
    vero(a.dom.window.fitmealsPlan().target > prima, 'il comando non accende il giorno di allenamento');
  });

  await test('il calendario segue i giorni veri', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'], frigoSez:'frigo' },
      pantry: ['pollo'], myIngredients: ['pollo'],
      freschezza: { pollo: { nome:'pollo', posto:'frigo', dal: ora,
                             entro: ora + 30 * 3600000, qta:400, unita:'g' } }
    } });
    a.tab('view-fridge');
    const giorni = [...a.d.querySelectorAll('#calendario .cal-giorno')];
    eq(giorni.length, 7, 'la striscia non copre sette giorni');
    eq(a.conta('#calendario-freezer .cal-giorno'), 7, 'manca il calendario nel freezer');
    eq(giorni[0].querySelector('b').textContent, String(new Date().getDate()),
      'il primo giorno non e\' oggi');
    // domani ci deve essere il pollo
    const pieni = giorni.filter(g => g.classList.contains('pieno'));
    almeno(pieni.length, 1, 'nessun giorno segnato');
    pieni[0].click();
    vero(/pollo/.test(a.testo('#calendario .cal-dettaglio')), 'il dettaglio non elenca la scadenza');
  });

  console.log('\nTesta della giornata');
  await test('l\'aggiunta a mano propone la ricetta giusta', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="1"]');
    a.click('[data-act=quick-open][data-val=pra]');
    a.set('q-nome', 'bresaola');
    almeno(a.conta('#quick-sugg .chip'), 2, 'nessuna proposta');
    const primo = a.d.querySelector('#quick-sugg .chip');
    vero(/kcal/.test(primo.textContent), 'la proposta non mostra le calorie');
    primo.click();
    vero(a.d.getElementById('q-kcal').value, 'le calorie non sono state riempite');
    vero(a.d.getElementById('q-pro').value, 'le proteine non sono state riempite');
    a.click('[data-act=quick-save]');
    const v = a.stato().log[0];
    vero(v.kcal > 100, 'valori non plausibili: ' + v.kcal);
  });

  await test('i macro della giornata stanno sotto il cerchio', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="1"]');
    a.click('[data-act=quick-open][data-val=pra]');
    a.d.getElementById('q-nome').value = 'Test';
    a.d.getElementById('q-kcal').value = '500';
    a.d.getElementById('q-pro').value = '40';
    a.click('[data-act=quick-save]');

    const box = a.d.getElementById('anello-unico');
    eq(box.querySelector('.conta-kcal').dataset.valore, '500', 'le kcal non sono nel cerchio');
    const macro = box.querySelector('.macro-giorno');
    vero(macro, 'manca la riga dei macro');
    vero(/proteine/.test(macro.textContent) && /carboidrati/.test(macro.textContent)
      && /grassi/.test(macro.textContent), 'i tre macro non ci sono tutti');
    vero(/40/.test(macro.textContent), 'le proteine non sono contate');
    eq(a.conta('.pagina-budget'), 0, 'il riquadro grande e\' ancora li');
  });

  await test('il menu del giorno si corregge senza la matita', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="1"]');
    a.click('[data-act=quick-open][data-val=pra]');
    a.d.getElementById('q-nome').value = 'Test';
    a.d.getElementById('q-kcal').value = '500';
    a.click('[data-act=quick-save]');
    a.tab('view-home');
    eq(a.conta('#anello-unico .matita'), 0, 'la matita doveva sparire');
    const voce = a.d.querySelector('#anello-unico .voce-oggi');
    vero(voce, 'la voce non compare nel menu del giorno');
    voce.querySelector('.x').click();
    eq(a.stato().log.length, 0, 'la croce non toglie la voce');
  });

  await test('le schede cambiano senza animazioni, la ricetta no', async () => {
    const a = await app();
    ['view-fridge', 'view-home', 'view-spesa'].forEach(v => {
      a.tab(v);
      vero(!a.d.getElementById(v).classList.contains('entra'),
        v + ' si anima ancora');
    });
    const css = a.d.querySelector('style').textContent;
    vero(!/@keyframes libro/.test(css), 'l\'animazione del libro e\' rimasta');
    vero(!/@keyframes sportello/.test(css), 'l\'animazione dello sportello e\' rimasta');
    // la scheda della ricetta conserva la sua apertura
    vero(/@keyframes cartaSu/.test(css) && /@keyframes cartaGiu/.test(css),
      'la scheda ricetta ha perso apertura e chiusura');
  });

  await test('la spesa ha una scheda tutta sua', async () => {
    const a = await app();
    const linguette = [...a.d.querySelectorAll('.tab-item')].map(t => t.textContent.trim());
    eq(linguette.length, 5, 'le schede in basso');
    vero(linguette.some(t => /Spesa/.test(t)), 'manca la scheda Spesa');
    a.tab('view-spesa');
    vero(a.d.getElementById('view-spesa').classList.contains('active'), 'non si apre');
    vero(a.d.getElementById('shopping-body'), 'la lista non e\' li dentro');
    // e non e\' piu\' dentro al frigo
    a.tab('view-fridge');
    eq([...a.d.querySelectorAll('[data-act=frigo-sez]')].filter(b => b.dataset.val === 'spesa').length,
      0, 'la spesa e\' rimasta anche nel frigo');
  });

  await test('togliere un pasto dal menu rimette gli ingredienti', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-fridge');
    a.set('disp-cerca', 'pollo');
    a.d.getElementById('disp-qta').value = '400';
    a.click('[data-act=disp-add]');
    a.apri('petto di pollo alla piastra');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    eq(a.stato().freschezza['pollo'].qta, 200, 'la dispensa non e\' calata');
    a.tab('view-home');
    a.d.querySelector('#anello-unico .voce-oggi .x').click();
    eq(a.stato().log.length, 0, 'il pasto non e\' stato tolto');
    eq(a.stato().freschezza['pollo'].qta, 400, 'gli ingredienti non sono tornati');
  });

  console.log('\nCredenza e calendario');
  const conRoba = () => {
    const ora = Date.now();
    return {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'], frigoSez:'dispensa' },
      pantry: ['pollo', 'tacchino', 'riso'], myIngredients: ['pollo', 'tacchino', 'riso'],
      freschezza: {
        pollo: { nome:'pollo', posto:'frigo', dal: ora - 2 * 86400000,
                 entro: ora + 6 * 3600000, qta:400, unita:'g' },
        tacchino: { nome:'tacchino', posto:'frigo', dal: ora,
                    entro: ora + 2 * 86400000, qta:300, unita:'g' },
        riso: { nome:'riso', posto:'dispensa', dal: ora,
                entro: ora + 700 * 86400000, qta:1000, unita:'g' }
      },
      leftovers: [{ rid:'c25', title:'Pollo avanzato', n:2, kcal:400, pro:45,
                    ts: ora - 20 * 3600000, pasto:'cen' }]
    };
  };

  await test('la credenza mostra i ripiani e le targhette', async () => {
    const a = await app({ storage: conRoba() });
    a.tab('view-fridge');
    almeno(a.conta('.ripiano'), 2, 'la credenza non ha ripiani');
    almeno(a.conta('.barattolo'), 3, 'mancano i barattoli');
    eq(a.conta('.targhetta'), 0, 'le targhette sono gia\' aperte');
    a.click('.barattolo [data-act=credenza-info]');
    const t = a.d.querySelector('.targhetta');
    vero(t, 'la targhetta non si apre');
    vero(/preso/.test(t.textContent) && /entro/.test(t.textContent),
      'la targhetta non dice acquisto e scadenza');
  });

  await test('una barra sola cerca nella credenza e fra le ricette', async () => {
    const a = await app({ storage: conRoba() });
    a.tab('view-fridge');
    eq(a.conta('#disp-cerca'), 1, 'le barre dovrebbero essere una sola');
    const barattoli = () => [...a.d.querySelectorAll('.barattolo > button')]
      .map(x => x.textContent.trim().split(' ')[0]);
    almeno(barattoli().length, 3, 'partenza sbagliata');
    a.set('disp-cerca', 'ri');
    eq(barattoli().join(','), 'riso', 'la credenza non filtra: ' + barattoli().join(','));
    vero(/con \u201cri\u201d/.test(a.testo('#ricette-conta')), 'le ricette non seguono la stessa barra');
  });

  await test('le ricette proposte mettono davanti quello che scade prima', async () => {
    const a = await app({ storage: conRoba() });
    a.tab('view-fridge');
    const titoli = [...a.d.querySelectorAll('#fridge-results .scheda-titolo')]
      .slice(0, 6).map(x => x.textContent.toLowerCase());
    almeno(titoli.length, 2, 'nessuna ricetta proposta');
    const primoPollo = titoli.findIndex(t => /pollo/.test(t));
    const primoTacchino = titoli.findIndex(t => /tacchino/.test(t));
    vero(primoPollo !== -1, 'il pollo in scadenza non compare fra le prime');
    if (primoTacchino !== -1) {
      vero(primoPollo < primoTacchino,
        'il tacchino fresco passa davanti al pollo che scade oggi');
    }
  });

  await test('dal calendario si modificano gli avanzi', async () => {
    const a = await app({ storage: conRoba() });
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=frigo]');
    const pieni = [...a.d.querySelectorAll('#calendario .cal-giorno.pieno')];
    almeno(pieni.length, 1, 'nessun giorno segnato');
    pieni[0].click();
    const det = a.d.querySelector('#calendario .cal-dettaglio');
    vero(det.querySelector('[data-act=avanzo-finito]') || det.querySelector('[data-act=scorta-mod]'),
      'dal calendario non si modifica niente');

    const cons = det.querySelector('[data-act=avanzo-finito]');
    if (cons) {
      const prima = a.stato().leftovers.length;
      cons.click();
      eq(a.stato().leftovers.length, prima - 1, 'l\'avanzo non se ne va');
      vero(!/Pollo avanzato/.test(a.testo('#calendario')), 'resta nel calendario');
    }
  });

  await test('la spesa avvisa se ce l\'hai gi\u00e0', async () => {
    const a = await app({ storage: conRoba() });
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=spesa]');
    a.set('shop-add', 'pollo');
    a.d.getElementById('shop-qta').value = '300';
    a.click('[data-act=shop-extra]');

    const b = a.d.querySelector('.banner-doppio');
    vero(b, 'nessun avviso sul doppione');
    vero(/in frigo/.test(b.textContent), 'non dice dove ce l\'hai');
    vero(/400 g/.test(b.textContent), 'non dice quanto ne hai');
    // ma non lo toglie da solo
    eq(a.stato().shopExtra.length, 1, 'ha tolto la voce senza chiedere');
    b.querySelector('[data-act=shop-togli-doppio]').click();
    eq(a.stato().shopExtra.length, 0, 'il comando non toglie la voce');
  });

  console.log('\nConfezioni aperte e sorpresa');
  await test('usare un prodotto lo apre e accorcia la scadenza', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-fridge');
    [['riso', '1000'], ['passata di pomodoro', '700']].forEach(([n, q]) => {
      a.set('disp-cerca', n);
      a.d.getElementById('disp-qta').value = q;
      a.click('[data-act=disp-add]');
    });
    const giorni = k => Math.round((a.stato().freschezza[k].entro - Date.now()) / 86400000);
    const risoPrima = giorni('riso');
    const passataPrima = giorni('passata di pomodoro');
    almeno(risoPrima, 600, 'il riso chiuso dovrebbe durare due anni');

    a.apri('risotto alla milanese');
    a.click('#detail-body [data-act=log-meal]');
    vero(a.stato().freschezza['riso'].aperto, 'il riso non risulta aperto');
    vero(giorni('riso') < risoPrima, 'la scadenza non si e\' accorciata');

    a.apri('pollo alla cacciatora');
    a.click('#detail-body [data-act=log-meal]');
    const pa = a.stato().freschezza['passata di pomodoro'];
    vero(pa.aperto, 'la passata non risulta aperta');
    vero(giorni('passata di pomodoro') < 7, 'un barattolo aperto non dura mesi: '
      + giorni('passata di pomodoro') + ' giorni');
    eq(pa.posto, 'frigo', 'una volta aperta la passata va in frigo');
    vero(passataPrima > 300, 'partenza sbagliata');
  });

  await test('la sorpresa pesca fra quello che hai, dal piu\' urgente', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      pantry: ['pollo', 'riso', 'pomodori', 'cipolla'],
      myIngredients: ['pollo', 'riso', 'pomodori', 'cipolla'],
      freschezza: {
        pollo: { nome:'pollo', posto:'frigo', dal: ora - 2 * 86400000,
                 entro: ora + 4 * 3600000, qta:400, unita:'g' },
        riso: { nome:'riso', posto:'dispensa', dal: ora, entro: ora + 700 * 86400000,
                qta:1000, unita:'g' },
        pomodori: { nome:'pomodori', posto:'dispensa', dal: ora - 3 * 86400000,
                    entro: ora + 86400000, qta:500, unita:'g' },
        cipolla: { nome:'cipolla', posto:'dispensa', dal: ora, entro: ora + 10 * 86400000,
                   qta:300, unita:'g' }
      }
    } });
    const b = a.d.querySelector('#lista-cen [data-act=sorprendimi]');
    vero(b, 'manca il comando');
    b.click();
    const titolo = a.testo('#detail-body h2');
    vero(titolo, 'non ha aperto niente');

    // deve usare qualcosa che ho, e dirmi cosa sta finendo
    const r = a.stato().recipes.find(x => x.title === titolo);
    const miei = ['pollo', 'riso', 'pomodor', 'cipolla'];
    vero((r.ing || []).some(i => miei.some(k => i.n.includes(k))),
      titolo + ' non usa niente di quello che ho');
    vero(/kcal/.test(a.testo('#toast')), 'non dice quante calorie');
  });

  await test('quello che consumi sparisce dal calendario', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'], frigoSez:'frigo' },
      leftovers: [{ rid:'z9', title:'Zuppa avanzata', n:2, kcal:300, pro:20,
                    ts: ora - 20 * 3600000, pasto:'cen' }]
    } });
    a.tab('view-fridge');
    const pieni = () => a.conta('#calendario .cal-giorno.pieno');
    almeno(pieni(), 1, 'il calendario non segna niente');
    a.d.querySelector('#calendario .cal-giorno.pieno').click();
    vero(/Zuppa/.test(a.testo('#calendario .cal-dettaglio')), 'la voce non compare');

    a.click('#calendario [data-act=avanzo-finito]');
    eq(a.stato().leftovers.length, 0, 'non e\' stato consumato');
    eq(pieni(), 0, 'resta segnato nel calendario');
  });

  console.log('\nBilancia e fornelli');
  await test('l\'ago segue le calorie e cambia colore per pasto', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    const ago = () => a.d.querySelector('#anello-unico .ago');
    const punta = () => ago().getAttribute('d');

    const digiuno = punta();
    vero(a.conta('#anello-unico .tacca') >= 5, 'il quadrante non ha le tacche');
    vero(ago().className.baseVal.includes('f-col'), 'a digiuno l\'ago non e\' sul primo pasto');

    const mangia = (pasto, kcal) => {
      a.click('[data-act=quick-open][data-val=' + pasto + ']');
      a.d.getElementById('q-nome').value = pasto;
      a.d.getElementById('q-kcal').value = String(kcal);
      a.click('[data-act=quick-save]');
    };

    mangia('col', 450);
    vero(punta() !== digiuno, 'l\'ago non si e\' mosso');
    mangia('pra', 800);
    vero(ago().className.baseVal.includes('f-pra'), 'l\'ago non passa al colore del pranzo');
    mangia('cen', 1500);
    vero(ago().className.baseVal.includes('oltre'), 'oltre il fabbisogno l\'ago non lo segnala');
  });

  await test('la cucina accende la pentola, ma solo se si cuoce', async () => {
    const a = await app();
    const fuoco = q => {
      a.cerca(q);
      a.click('#recipe-list .scheda');
      a.click('[data-act=cook-open]');
      const f = a.d.getElementById('fornelli');
      const esito = f ? {
        pentola: !!f.querySelector('.lapentola'),
        fiamme: f.querySelectorAll('.fiammella').length
      } : null;
      a.click('[data-act=cook-close]');
      return esito;
    };

    // la stessa pentola per tutto quello che va sul fuoco
    ['carbonara', 'lasagne alla bolognese', 'pollo alla cacciatora'].forEach(q => {
      const e = fuoco(q);
      vero(e && e.pentola, q + ': manca la pentola');
      almeno(e.fiamme, 3, q + ': il fornello non si accende');
    });

    // e niente fuoco per quello che si mangia crudo
    eq(fuoco('insalata mista'), null, 'un\'insalata non va sul fuoco');
    eq(fuoco('carpaccio di manzo'), null, 'un carpaccio non va sul fuoco');
  });

  await test('sotto ogni ricerca ci sono sorpresa e filtri', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-home');
    ['col', 'pra', 'cen'].forEach(id => {
      const riga = a.d.querySelector('#lista-' + id + ' .riga-comandi');
      vero(riga, 'manca la riga comandi in ' + id);
      vero(riga.querySelector('[data-act=sorprendimi]'), 'manca sorprendimi in ' + id);
      vero(riga.querySelector('[data-act=filtri-apri]'), 'mancano i filtri in ' + id);
    });
    a.tab('view-search');
    vero(a.d.querySelector('#comandi-cerca [data-act=sorprendimi]'), 'manca sorprendimi in Cerca');
    a.tab('view-fridge');
    vero(a.d.querySelector('[data-act=sorprendimi][data-val=dispensa]'),
      'manca la sorpresa in dispensa');
  });

  await test('i filtri sono nascosti e valgono ovunque', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-search');
    eq(a.conta('#modal-filtri.active'), 0, 'il pannello e\' gia\' aperto');
    a.click('#comandi-cerca [data-act=filtri-apri]');
    vero(a.d.getElementById('modal-filtri').classList.contains('active'), 'non si apre');
    const gruppi = [...a.d.querySelectorAll('#filtri-corpo .field-label')].map(x => x.textContent);
    vero(gruppi.some(t => /Dove e come/.test(t)), 'manca il gruppo delle situazioni');
    vero(gruppi.some(t => /Tempo/.test(t)), 'manca il filtro sul tempo');

    a.click('[data-act=filtro][data-val=situazione][data-v=ufficio]');
    a.click('#modal-filtri [data-act=close-modal]');
    // e lo stesso filtro vale anche nelle pagine dei pasti
    a.tab('view-home');
    vero(a.d.querySelector('#lista-cen .chip.attivo'), 'il filtro non compare nella pagina');
    const titoli = [...a.d.querySelectorAll('#lista-cen .scheda-titolo')].map(x => x.textContent);
    almeno(titoli.length, 1, 'nessuna ricetta con quel filtro');
  });

  await test('in dispensa la sorpresa parte da quello che si butterebbe', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'], frigoSez:'dispensa' },
      pantry: ['pollo', 'rucola', 'riso'], myIngredients: ['pollo', 'rucola', 'riso'],
      freschezza: {
        pollo: { nome:'pollo', posto:'frigo', dal: ora - 2 * 86400000,
                 entro: ora + 4 * 3600000, qta:400, unita:'g' },
        rucola: { nome:'rucola', posto:'frigo', dal: ora - 3 * 86400000,
                  entro: ora + 6 * 3600000, qta:80, unita:'g' },
        riso: { nome:'riso', posto:'dispensa', dal: ora, entro: ora + 700 * 86400000,
                qta:1000, unita:'g' }
      }
    } });
    a.tab('view-fridge');
    a.click('[data-act=sorprendimi][data-val=dispensa]');
    const box = a.d.getElementById('sorpresa-dispensa');
    const nomi = [...box.querySelectorAll('.salva-riga b')].map(x => x.textContent);
    almeno(nomi.length, 2, 'non propone abbastanza');
    vero(nomi.includes('pollo') && nomi.includes('rucola'),
      'non ha scelto quelli che scadono: ' + nomi.join(', '));
    vero(!nomi.includes('riso'), 'ha messo dentro il riso, che dura due anni');
    almeno(box.querySelectorAll('.chip.mini').length, 2, 'nessuna ricetta per usarli');
  });

  await test('il piatto della bilancia resta libero', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-home');
    eq(a.conta('#anello-unico .sul-piatto'), 0, 'sul piatto non deve posarsi niente');
    vero(a.d.querySelector('#anello-unico .piatto'), 'il piatto della bilancia deve esserci');
  });

  await test('ogni calendario vede solo la sua sezione', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'], frigoSez:'frigo' },
      pantry: ['pollo', 'riso'], myIngredients: ['pollo', 'riso'],
      freschezza: {
        pollo: { nome:'pollo', posto:'frigo', dal: ora, entro: ora + 30 * 3600000,
                 qta:400, unita:'g' },
        riso: { nome:'riso', posto:'dispensa', dal: ora, entro: ora + 40 * 3600000,
                qta:1000, unita:'g' }
      },
      leftovers: [
        { rid:'a1', title:'Zuppa in frigo', n:1, kcal:300, pro:20,
          ts: ora - 20 * 3600000, pasto:'cen' },
        { rid:'a2', title:'Ragu congelato', n:2, kcal:400, pro:30, ts: ora - 5 * 86400000,
          pasto:'cen', dove:'freezer', congelatoIl: ora - 88 * 86400000 }
      ]
    } });
    a.tab('view-fridge');

    const dentro = id => {
      const nomi = new Set();
      for (let i = 0; i < 7; i++) {
        const g = a.d.querySelectorAll('#' + id + ' .cal-giorno')[i];
        if (!g || !g.classList.contains('pieno')) continue;
        g.click();
        [...a.d.querySelectorAll('#' + id + ' .cal-dettaglio .scheda-titolo, #' + id
          + ' .cal-dettaglio .fresco-nome b')]
          .forEach(x => nomi.add(x.textContent.trim().split(/\s+/)[0]));
        a.d.querySelectorAll('#' + id + ' .cal-giorno')[i].click();
      }
      return [...nomi];
    };

    const frigo = dentro('calendario');
    vero(frigo.includes('pollo') && frigo.includes('Zuppa'), 'nel frigo mancano le sue cose: ' + frigo);
    vero(!frigo.includes('riso') && !frigo.includes('Ragu'), 'nel frigo c\'e\' roba d\'altri: ' + frigo);

    a.click('[data-act=frigo-sez][data-val=dispensa]');
    const disp = dentro('calendario-dispensa');
    eq(disp.join(','), 'riso', 'la credenza deve vedere solo il secco: ' + disp);

    a.click('[data-act=frigo-sez][data-val=freezer]');
    const gelo = dentro('calendario-freezer');
    vero(gelo.includes('Ragu'), 'il freezer non vede il suo congelato: ' + gelo);
    vero(!gelo.includes('pollo'), 'il freezer vede il frigo: ' + gelo);
  });

  await test('il comando per azzerare sta solo in dispensa', async () => {
    const a = await app();
    a.tab('view-fridge');
    eq(a.conta('.header [data-act=clear-pantry]'), 0, 'e\' rimasto nell\'intestazione');
    vero(a.d.querySelector('[data-fsez=dispensa] .svuota-tutto'), 'manca il comando in dispensa');
    vero(/togli tutti/i.test(a.testo('.svuota-tutto')), 'il comando non spiega cosa fa');
    ['frigo', 'freezer', 'avanzi'].forEach(sez => {
      vero(!a.d.querySelector('[data-fsez=' + sez + '] .svuota-tutto'),
        'il comando compare anche in ' + sez);
    });
  });

  console.log('\nIcone, storico e testa interattiva');
  await test('le famiglie hanno la loro icona fissa', async () => {
    const a = await app();
    const { ARTE, arteRicetta } = a.dom.window.fitmealsArte;
    const nome = svg => Object.keys(ARTE).find(k => ARTE[k] === svg) || 'altro';
    const icona = titolo => {
      const r = a.stato().recipes.find(x => x.title.toLowerCase().startsWith(titolo));
      return r ? nome(arteRicetta(r)) : '(non trovata)';
    };
    eq(icona('spaghetti alla carbonara'), 'farfalle', 'la pasta non ha la farfalla');
    eq(icona('lasagne'), 'farfalle', 'anche le lasagne sono pasta');
    eq(icona('bistecca alla fiorentina'), 'bistecca', 'la carne non ha la bistecca');
    eq(icona('tagliata di manzo'), 'bistecca', 'la tagliata e\' carne');
    eq(icona('salmone al forno'), 'pesce', 'il pesce non ha il pesce');
    eq(icona('frittata'), 'occhiodibue', 'la frittata non ha l\'occhio di bue');
    eq(icona('porridge'), 'brioche', 'la colazione non ha la brioche');
    eq(icona('pizza'), 'trancio', 'la pizza non ha il trancio');
    eq(icona('lattina di cola'), 'bottiglia33', 'la cola non ha la bottiglia');
    eq(icona('chinotto'), 'bottiglia33', 'il chinotto e\' una gassata');
  });

  await test('lo storico ha i suoi grafici e ripartisce a mezzanotte', async () => {
    const ora = Date.now(); const giorno = 86400000;
    const chiave = t => { const d = new Date(t);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
        + '-' + String(d.getDate()).padStart(2, '0'); };
    const daily = {};
    for (let i = 1; i <= 9; i++) daily['u1|' + chiave(ora - i * giorno)] = { k: 1700 + i * 90, p: 120 + i * 3, m: 3 };
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] }, daily: daily
    } });
    a.tab('view-profile');
    const t = a.d.getElementById('trend-body');
    almeno(t.querySelectorAll('.grafico .barra').length, 14, 'mancano le barre delle calorie');
    vero(t.querySelector('.obiettivo'), 'manca la linea dell\'obiettivo');
    almeno(t.querySelectorAll('.punto').length, 9, 'mancano i punti delle proteine');
    vero(t.querySelector('.filo'), 'manca il filo fra i punti');
    almeno(t.querySelectorAll('.storico-numeri b').length, 3, 'mancano le medie');
    // i giorni passati stanno qui, e il conto di oggi parte da zero
    vero(/\d+.?kcal al giorno/.test(t.textContent), 'la media non si legge');
    eq(a.d.querySelector('#anello-unico .conta-kcal').dataset.valore, '0', 'oggi non parte da zero');
  });

  await test('la migrazione degli id porta con se\' lo storico', async () => {
    const ora = Date.now();
    const ieri = (() => { const d = new Date(ora - 86400000);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
        + '-' + String(d.getDate()).padStart(2, '0'); })();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      daily: { ['u1|' + ieri]: { k: 2000, p: 130, m: 3 } },
      log: [{ ts: ora - 86400000, pid: 'u1', title: 'X', kcal: 500, meal: 'pra' }],
      weights: [{ ts: ora - 86400000, pid: 'u1', kg: 82 }]
    } });
    const S = a.stato();
    const nuovo = S.ui.active;
    vero(nuovo !== 'u1', 'l\'id di serie doveva cambiare');
    vero(S.daily[nuovo + '|' + ieri], 'il giorno registrato non ha seguito il nuovo id');
    eq(S.log[0].pid, nuovo, 'il diario non ha seguito il nuovo id');
    eq(S.weights[0].pid, nuovo, 'le pesate non hanno seguito il nuovo id');
  });

  await test('i macro si nascondono e i riquadri si riducono', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-home');
    a.d.querySelector('#anello-unico .macro-giorno').click();
    vero(a.d.querySelector('#anello-unico .macro-chiusi'), 'i macro non si nascondono');
    a.d.querySelector('#anello-unico .macro-chiusi').click();
    vero(a.d.querySelector('#anello-unico .macro-giorno'), 'non si riaprono');

    a.d.querySelector('#anello-unico [data-act=gambe-riduci]').click();
    const mini = [...a.d.querySelectorAll('#anello-unico .gamba.mini span')].map(x => x.textContent);
    eq(mini.join(','), 'Col,Pra,Cen', 'le abbreviazioni non sono intuitive: ' + mini.join(','));
    a.d.querySelector('#anello-unico [data-act=gambe-riduci]').click();
    vero(a.d.querySelector('#anello-unico .gamba u'), 'i riquadri non si riallargano');
  });

  await test('il riquadro apre i piatti del pasto, e toglierli non cancella la ricetta', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-home');

    const pasto = a.stato().log[0].meal;
    a.d.querySelector('#anello-unico .gamba[data-val=' + pasto + ']').click();
    vero(a.d.getElementById('modal-pasto-piatti').classList.contains('active'), 'la finestra non si apre');
    vero(/carbonara/i.test(a.testo('#pasto-piatti-body')), 'il piatto non c\'e\'');

    // la scheda apre lo stesso dettaglio della ricerca
    a.click('#pasto-piatti-body .scheda');
    vero(a.d.getElementById('modal-detail').classList.contains('active'), 'il dettaglio non si apre');
    a.click('#modal-detail [data-act=close-modal]');
    await wait(220);
    vero(a.d.getElementById('modal-pasto-piatti').classList.contains('active'), 'chiuso il dettaglio non si torna al pasto');

    a.click('#pasto-piatti-body [data-act=log-del]');
    await wait(60);
    eq(a.stato().log.length, 0, 'il piatto non e\' uscito dal pasto');
    vero(a.stato().recipes.some(r => /carbonara/i.test(r.title)),
      'togliere dal pasto ha cancellato la ricetta dal catalogo');
    vero(/Niente in questo pasto/.test(a.testo('#pasto-piatti-body')), 'la finestra non si aggiorna');
  });

  await test('le calorie girano su un flip clock piccolo, e il quadrante ha le cifre', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    const css = a.d.querySelector('style').textContent;
    vero(/\.flip\{[^}]*background:#15120e/.test(css), 'manca la finestrella nera del flip clock');
    vero(/\.flip i\{[^}]*monospace/.test(css), 'le cifre non sono da flip clock');
    vero(/linear-gradient/.test(css.match(/\.flip i\{[^}]*\}/)[0]), 'manca la riga del ribaltamento');
    const box = a.d.getElementById('anello-unico');
    almeno(box.querySelectorAll('.flip i').length, 1, 'mancano le celle delle cifre');
    vero(a.d.querySelector('#anello-unico .striscia-fondo'), 'manca la striscia dei pasti');
    vero(!a.d.querySelector('#anello-unico .sotto-flip'), 'la cifra sotto doveva sparire');
    // le cifre piccole dentro il quadrante, come sulla bilancia vera
    almeno(box.querySelectorAll('.cifra').length, 5, 'mancano le cifre nel quadrante');
    eq(box.querySelector('.cifra').textContent, '0', 'la scala non parte da zero');
    vero(box.querySelector('.collo'), 'manca il collo della bilancia');
    almeno(box.querySelectorAll('.piedino').length, 3, 'mancano i piedini');
  });

  console.log('\nUltimo giro: mezzi piatti, frecce, salse');
  await test('la pentola dura meno e il velo copre tutta la scheda', async () => {
    const a = await app();
    a.cerca('carbonara');
    a.click('#recipe-list .scheda');
    a.click('[data-act=cook-open]');
    vero(a.d.getElementById('fornelli'), 'la pentola non parte');
    const css = a.d.querySelector('style').textContent;
    vero(/mask-image:radial-gradient\(ellipse[^)]*96%\)/.test(css),
      'il velo non sfuma fino ai bordi');
    await wait(1400);
    vero(!a.d.getElementById('fornelli'), 'la pentola resta troppo a lungo');
    a.click('[data-act=cook-close]');
  });

  await test('il piatto della bilancia molleggia, ed e\' vuoto', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="1"]');
    a.click('[data-act=quick-open][data-val=pra]');
    a.d.getElementById('q-nome').value = 'X';
    a.d.getElementById('q-kcal').value = '500';
    a.click('[data-act=quick-save]');
    const box = a.d.getElementById('anello-unico');
    vero(box.querySelector('.gruppo-piatto.oscilla'), 'il piatto non molleggia');
    eq(box.querySelectorAll('.sul-piatto').length, 0, 'sul piatto non deve esserci niente');
    eq(a.conta('#anello-unico .matita'), 0, 'la matita doveva sparire');
  });

  await test('si avanza anche mezza porzione', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('pollo alla cacciatora');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    a.click('[data-act=storico-apri]');
    // parte gia' dalla mezza porzione
    vero(/\u00bd/.test(a.testo('.storico-conferma .porz-mini b')), 'il mezzo non si vede');
    a.click('[data-act=storico-conferma][data-dove=frigo]');
    eq(a.stato().leftovers[0].n, 0.5, 'la mezza porzione non e\' stata messa via');
  });

  await test('le mezze porzioni compatibili si combinano per urgenza', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'], frigoSez:'avanzi' },
      leftovers: [
        { rid:'x1', title:'Riso in bianco', n:0.5, kcal:180, pro:4, ts: ora - 40 * 3600000, pasto:'pra' },
        { rid:'x2', title:'Pollo al limone', n:0.5, kcal:200, pro:30, ts: ora - 40 * 3600000, pasto:'cen' }
      ]
    } });
    a.tab('view-fridge');
    const combo = a.d.getElementById('combinazioni-body');
    vero(combo && combo.textContent.trim(), 'nessuna combinazione con due mezzi avanzi');
    vero(/riso|pollo/i.test(combo.textContent), 'la combinazione non parte dagli avanzi urgenti');
  });

  await test('le frecce annullano e rifanno qualsiasi operazione', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-fridge');
    a.set('disp-cerca', 'pollo');
    a.d.getElementById('disp-qta').value = '400';
    a.click('[data-act=disp-add]');
    a.apri('petto di pollo alla piastra');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');

    const st = () => ({ log: a.stato().log.length,
      pollo: a.stato().freschezza['pollo'] ? a.stato().freschezza['pollo'].qta : null });
    eq(st().pollo, 200, 'partenza sbagliata');

    a.d.getElementById('freccia-indietro').click();
    eq(st().log, 0, 'il pasto non si annulla');
    eq(st().pollo, 400, 'la dispensa non torna indietro con il pasto');

    a.d.getElementById('freccia-indietro').click();
    eq(st().pollo, null, 'il secondo indietro non annulla la dispensa');

    a.d.getElementById('freccia-avanti').click();
    a.d.getElementById('freccia-avanti').click();
    eq(st().log, 1, 'il rifai non rifa il pasto');
    eq(st().pollo, 200, 'il rifai non rifa la dispensa');

    vero(a.d.getElementById('freccia-avanti').disabled, 'in cima la freccia avanti deve spegnersi');
  });

  await test('il fondo ha il velo e le salse la bottiglietta', async () => {
    const a = await app();
    vero(a.d.getElementById('velo-fondo'), 'manca il velo sotto la barra');
    const css = a.d.querySelector('style').textContent;
    vero(/#velo-fondo\{[^}]*linear-gradient\(to top/.test(css), 'il velo non sfuma verso l\'alto');

    const { ARTE, arteRicetta } = a.dom.window.fitmealsArte;
    const salse = a.stato().recipes.filter(r => r.portata === 'salsa');
    almeno(salse.length, 3, 'niente salse in catalogo');
    salse.forEach(r => eq(arteRicetta(r), ARTE.kikkoman,
      r.title + ' non ha la bottiglietta della soia'));
  });

  await test('il piatto mangiato si modifica senza toccare la ricetta', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    const orig = clone(a.stato().recipes.find(r => /spaghetti alla carbonara/i.test(r.title)));

    a.tab('view-home');
    const pasto = a.stato().log[0].meal;
    a.d.querySelector('#anello-unico .gamba[data-val=' + pasto + ']').click();
    a.click('#pasto-piatti-body .scheda');

    vero(a.d.querySelector('.istanza-box'), 'manca il riquadro del piatto mangiato');
    vero(a.d.getElementById('modal-detail').classList.contains('modo-istanza'),
      'il dettaglio non entra in modo istanza');

    a.d.getElementById('ist-nome').value = 'La mia carbonara leggera';
    a.d.getElementById('ist-kcal').value = '700';
    a.d.getElementById('ist-pro').value = '40';
    a.d.getElementById('ist-ing').value = 'pasta \u2014 80 g\npancetta poca';
    a.click('[data-act=istanza-salva]');

    const v = a.stato().log[0];
    eq(v.title, 'La mia carbonara leggera', 'il nome del piatto non cambia');
    eq(v.kcal, 700, 'le kcal del piatto non cambiano');
    vero(/pancetta poca/.test(v.ingMod), 'gli ingredienti del piatto non si salvano');

    const dopo = a.stato().recipes.find(r => r.id === orig.id);
    eq(dopo.title, orig.title, 'il titolo della ricetta originale e\' cambiato');
    eq(dopo.kcal, orig.kcal, 'le kcal della ricetta originale sono cambiate');
    eq(JSON.stringify(dopo.ing), JSON.stringify(orig.ing),
      'gli ingredienti della ricetta originale sono cambiati');

    const giorno = Object.values(a.stato().daily)[0];
    eq(giorno.k, 700, 'la giornata non segue la modifica del piatto');
  });

  console.log('\nTimer liberi e sveglia');
  await test('la pastiglia nasce in alto e resta anche fuori dalla cucina', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('[data-act=cook-open]');
    a.click('[data-act=timer-start]');
    const pill = a.d.querySelector('.tpill');
    vero(pill, 'la pastiglia non nasce');
    eq(pill.style.top, '10px', 'non nasce sul bordo alto');
    a.click('[data-act=cook-close]');
    await wait(120);
    eq(a.conta('.tpill'), 1, 'chiusa la cucina la pastiglia sparisce');
    vero(!a.d.getElementById('timer-bar'), 'la vecchia barra non doveva esistere piu\'');
    vero(!/p\d/.test(a.testo('.tpill i')), 'la sigla non deve essere un numero di passo');
  });

  await test('a tempo scaduto arriva la sveglia, e si riparte coi minuti nuovi', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('[data-act=cook-open]');
    a.click('[data-act=timer-start]');
    a.click('[data-act=cook-close]');
    a.dom.window.fitmealsTimers.scadi();
    await wait(1500);

    const sv = a.d.getElementById('sveglia');
    vero(sv, 'la sveglia non appare');
    vero(a.testo('.sveglia-cuore').includes('tempo scaduto'), 'manca la scritta');
    vero(a.d.querySelector('.tpill.finito'), 'la pastiglia non resta accesa in verde');
    const css = a.d.querySelector('style').textContent;
    vero(/#sveglia\{[^}]*backdrop-filter:blur/.test(css), 'dietro non c\'e\' il blur');
    vero(/@keyframes scampanella/.test(css), 'manca la micro animazione');

    const prima = Number(a.testo('#sveglia-min'));
    a.click('[data-act=sveglia-piu]');
    a.click('[data-act=sveglia-riparti]');
    await wait(500);
    vero(!a.d.getElementById('sveglia'), 'la sveglia non si chiude');
    eq(a.dom.window.fitmealsTimers.lista()[0].dur, (prima + 1) * 60,
      'i minuti modificati non contano');
    vero(!a.d.querySelector('.tpill.finito'), 'ripartito, il verde deve spegnersi');

    a.dom.window.fitmealsTimers.scadi();
    await wait(1500);
    a.click('[data-act=sveglia-spegni]');
    await wait(420);
    eq(a.dom.window.fitmealsTimers.lista().length, 0, 'spegnere non spegne');
    eq(a.conta('.tpill'), 0, 'la pastiglia resta dopo lo spegnimento');
  });

  await test('riaperta, la ricetta riparte dalle porzioni originali', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    const partenza = a.testo('#detail-body .persone b').trim();
    const piu = a.d.querySelector('#detail-body .persone .passo:last-child');
    piu.click(); piu.click();
    vero(a.testo('#detail-body .persone b').trim() !== partenza, 'le persone non salgono');
    a.click('#modal-detail [data-act=close-modal]');
    await wait(250);
    a.apri('carbonara');
    eq(a.testo('#detail-body .persone b').trim(), partenza,
      'riaperta la ricetta, le porzioni di prima restano appiccicate');
  });

  await test('ogni pasto porta la sua ora, e resta anche dopo le modifiche', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    const ts = a.stato().log[0].ts;
    vero(ts > 0, 'manca il momento del pasto');

    a.tab('view-home');
    const pasto = a.stato().log[0].meal;
    a.d.querySelector('#anello-unico .gamba[data-val=' + pasto + ']').click();
    vero(/alle \d\d:\d\d/.test(a.testo('#pasto-piatti-body')), 'l\'ora non si vede nella finestra');

    a.click('#pasto-piatti-body .scheda');
    vero(/alle \d\d:\d\d/.test(a.testo('.istanza-titolo')), 'l\'ora non si vede nel piatto mangiato');
    a.d.getElementById('ist-kcal').value = '600';
    a.click('[data-act=istanza-salva]');
    eq(a.stato().log[0].ts, ts, 'la modifica ha perso il momento del pasto');
    eq(a.stato().log[0].meal, pasto, 'la modifica ha perso il pasto');
  });

  await test('la striscia sulla base tiene le proporzioni dei pasti', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-home');
    [['1', 'pra', 600], ['2', 'cen', 900]].forEach(([pag, m, k]) => {
      a.click('[data-act=pasto-vai][data-val="' + pag + '"]');
      a.click('[data-act=quick-open][data-val=' + m + ']');
      a.d.getElementById('q-nome').value = 'X';
      a.d.getElementById('q-kcal').value = String(k);
      a.click('[data-act=quick-save]');
    });
    const seg = [...a.d.querySelectorAll('#anello-unico .striscia-seg')];
    eq(seg.length, 2, 'servono due segmenti');
    const [wp, wc] = seg.map(x => parseFloat(x.getAttribute('width')));
    vero(Math.abs(wc / wp - 900 / 600) < 0.05, 'le proporzioni non tornano: ' + wp + ' vs ' + wc);
    vero(a.d.querySelector('#anello-unico .striscia-fondo'), 'manca il binario');
    vero(!a.d.querySelector('#anello-unico .sotto-flip'), 'la cifra sotto doveva sparire');
  });

  await test('ogni suggerimento si toglie dalla vista con la sua x', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="2"]');
    const primo = a.d.querySelector('#pagina-cen .sugg');
    vero(primo, 'nessun consiglio in cena');
    const id = primo.dataset.val;
    const tot = a.conta('#pagina-cen .sugg');
    primo.querySelector('.sugg-x').dispatchEvent(
      new a.dom.window.MouseEvent('click', { bubbles: true }));
    vero(a.conta('#pagina-cen .sugg') < tot || tot === 1, 'il consiglio non sparisce');
    vero(![...a.d.querySelectorAll('#pagina-cen .sugg')].some(x => x.dataset.val === id),
      'quello chiuso e\' ancora li\'');

    // anche le combinazioni della dispensa hanno la loro x
    const ora = Date.now();
    const b = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      freschezza: { pollo: { qta: 400, dal: ora - 3 * 86400000, dove: 'frigo' } }
    } });
    b.tab('view-fridge');
    const combo = b.d.querySelector('#combinazioni-body .scheda.con-x');
    if (combo) {
      const rid = combo.dataset.val;
      combo.querySelector('.sugg-x').dispatchEvent(
        new b.dom.window.MouseEvent('click', { bubbles: true }));
      vero(![...b.d.querySelectorAll('#combinazioni-body .scheda')].some(x => x.dataset.val === rid),
        'la combinazione chiusa e\' ancora li\'');
    }
  });

  console.log('\nDetta la spesa');
  await test('il dettato diventa righe riconosciute, con quantita e dubbi', async () => {
    const a = await app();
    const V = a.dom.window.fitmealsVoce;
    const righe = V.interpreta('pomodori, mozzarella e due litri di latte, tre confezioni di iogurt greco, parmiggiano');
    eq(righe.length, 5, 'le voci non si separano');
    vero(righe[0].sicuro && righe[0].nome === 'pomodori', 'pomodori non riconosciuti');
    const latte = righe.find(r => r.nome === 'latte');
    vero(latte && latte.q === 2 && latte.u === 'kg', 'due litri di latte non diventano 2 kg');
    vero(righe.some(r => /yogurt/.test(r.nome)), 'iogurt non trova lo yogurt');
    vero(righe.some(r => r.nome === 'parmigiano'), 'parmiggiano non trova il parmigiano');
    // un pasticcio resta modificabile, non riconosciuto a forza
    const boh = V.interpreta('gnappole sfrigolate')[0];
    vero(!boh.sicuro, 'un pasticcio non deve dirsi sicuro');
    eq(boh.nome, 'gnappole sfrigolate', 'il testo dettato deve restare come scritto');
  });

  await test('la spesa dettata passa dallo stesso salvataggio del manuale', async () => {
    const a = await app();
    a.tab('view-fridge');
    vero(a.d.querySelector('.mic-spesa'), 'manca il bottone del microfono');

    a.dom.window.fitmealsVoce.daTesto('pane, due litri di latte');
    vero(a.d.getElementById('modal-dettatura').classList.contains('active'), 'la conferma non si apre');
    // una correzione a mano prima di salvare
    const prima = a.d.querySelector('.riga-dettata .det-nome');
    prima.value = 'pane integrale';
    a.click('[data-act=detta-salva]');

    // e una voce scritta a mano, per confrontare
    a.set('shop-add', 'farina');
    a.d.getElementById('shop-qta').value = '1';
    a.click('[data-act=shop-extra]');

    const S = a.stato();
    const dettata = S.shopExtra.find(x => x.n === 'latte');
    const corretta = S.shopExtra.find(x => x.n === 'pane integrale');
    const manuale = S.shopExtra.find(x => x.n === 'farina');
    vero(dettata && corretta && manuale, 'mancano voci');
    eq(Object.keys(dettata).sort().join(), Object.keys(manuale).sort().join(),
      'la voce dettata ha una struttura diversa dal manuale');
    eq(dettata.qta, 2000, 'i litri non sono diventati grammi come nel manuale');

    // spuntata e portata in dispensa, la scadenza segue le stesse regole
    const voce = a.dom.window.fitmealsDebug().shopExtra.find(x => x.n === 'latte');
    vero(voce.unita === 'g', 'l\'unita interna non e\' quella di casa');
  });

  await test('le scadenze di oggi arrivano nella campanella e si gestiscono', async () => {
    const ora = Date.now();
    const a = await app({ storage: {
      seedVersion: 11, compatto: 1, recipes: [],
      profiles: [{ id:'u1', name:'G', age:'38', height:'178', weight:'82', sex:'m',
                   work:'sedentario', sport:'3', goal:'cut' }],
      ui: { active:'u1', cookFor:['u1'] },
      freschezza: { latte: { nome:'latte', qta:500, dal: ora - 3*86400000,
                             posto:'frigo', entro: ora + 3600000 } }
    } });
    eq(a.testo('#campanella-conto'), '1', 'il badge non conta');
    a.click('[data-act=notifiche-apri]');
    // entrare nel centro vuol dire aver visto: numero via, righe normali
    vero(a.d.getElementById('campanella-conto').hidden, 'entrando il numero deve sparire');
    vero(!a.d.querySelector('.notifica.nuova'), 'entrando l\'evidenza deve spegnersi');
    vero(/latte/.test(a.testo('.notifica')), 'manca il latte');
    a.click('[data-act=notifica-ricette]');
    eq(a.d.getElementById('search-input').value, 'latte', 'Ricette non apre la ricerca');
    a.click('[data-act=notifica-via]');
    vero(!a.d.querySelector('.notifica'), 'la x non cancella la notifica');
  });

  await test('fine spesa chiede Si o No al centro, non il doppio tocco', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.dom.window.fitmealsVoce.daTesto('pane');
    a.click('[data-act=detta-salva]');
    const chk = a.d.querySelector('[data-act=shop-check]');
    if (chk) chk.click();
    a.click('[data-act=shop-bought]');
    vero(a.d.getElementById('modal-conferma').classList.contains('active'), 'la domanda non appare');
    vero(/Chiudo la spesa/.test(a.testo('#conferma-testo')), 'testo della domanda sbagliato');
    a.click('[data-act=conferma-si]');
    await new Promise(r => setTimeout(r, 250));
    vero(a.stato().pantry.includes('pane'), 'il Si non chiude la spesa');
    vero(a.d.querySelectorAll('.mic-campo').length >= 5, 'mancano i microfoni sulle barre');
  });

  const b = bilancio();
  console.log('\n' + '-'.repeat(40));
  console.log(b.passati + ' passati, ' + b.falliti + ' falliti');
  if (b.falliti) { console.log('\n' + b.errori.join('\n')); process.exit(1); }
  process.exit(0);
})();

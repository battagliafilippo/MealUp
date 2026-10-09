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
    ['colazione', 'antipasto', 'primo', 'secondo', 'contorno', 'dolce', 'salsa'].forEach(p => almeno(c[p] || 0, 1, p));
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
    // NUOVO CONTRATTO (audit finale): 3 voci comprate su tante — la ricetta
    // resta in lista finche' ha ingredienti ancora da prendere
    eq(a.stato().shopping.length, 1, 'la ricetta con voci da prendere non deve staccarsi');
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

  // ---------------------------------------------------------------- famiglia
  console.log('\nFamiglia');
  await test('la famiglia si crea e l\'invito porta dentro l\'altro telefono', async () => {
    const a = await app();
    const b = await app();
    a.dom.window.fitmealsFamiglia.crea('Casa prova');
    const invito = await a.dom.window.fitmealsFamiglia.link(a.dom.window.fitmealsFamiglia.paccoInvito());
    vero(invito.link.includes('#fm='), 'l\'invito non e\' un link');

    // B apre il link: toast con il tasto Entra, un tap e sei in famiglia
    await b.dom.window.fitmealsFamiglia.importa(invito.link);
    await wait(200);
    vero(b.testo('#toast').includes('invita nella famiglia'), 'l\'invito non si presenta');
    b.d.getElementById('toast').querySelector('button').click();
    await wait(300);
    const famB = b.dom.window.fitmealsFamiglia.stato();
    vero(famB && famB.id === a.dom.window.fitmealsFamiglia.stato().id, 'B non e\' nella stessa famiglia');
    vero(famB.membri.some(m => m.nome === 'Io'), 'B non conosce chi l\'ha invitato');

    // il riquadro nel profilo mostra i comandi di casa
    b.tab('view-profile');
    vero(b.d.querySelector('[data-act=famiglia-manda]'), 'manca Manda a casa');
    vero(b.d.querySelector('[data-act=famiglia-invita]'), 'manca Invita in famiglia');
    // e la spiegazione si apre e si chiude con un tap
    const lnk = b.d.querySelector('#famiglia-body [data-act=aiuto-apri]');
    vero(lnk, 'manca il Come funziona');
    lnk.click();
    vero(!b.d.getElementById('aiuto-famiglia').hidden, 'la spiegazione non si apre');
    lnk.click();
    vero(b.d.getElementById('aiuto-famiglia').hidden, 'la spiegazione non si chiude');
  });

  await test('la spesa di uno mette a posto la casa dell\'altro, senza doppioni', async () => {
    const a = await app();
    const b = await app();
    a.dom.window.fitmealsFamiglia.crea('Casa prova');
    const invito = await a.dom.window.fitmealsFamiglia.link(a.dom.window.fitmealsFamiglia.paccoInvito());
    await b.dom.window.fitmealsFamiglia.importa(invito.link);
    await wait(200);
    b.d.getElementById('toast').querySelector('button').click();
    await wait(200);

    // A fa la spesa: latte (va in frigo) e riso (in dispensa)
    a.tab('view-fridge');
    const metti = (n, q) => {
      a.set('disp-cerca', n);
      a.d.getElementById('disp-qta').value = q;
      a.click('[data-act=disp-add]');
    };
    metti('latte', '500');
    metti('riso', '900');
    const pacco = a.dom.window.fitmealsFamiglia.paccoSpesa();
    eq(pacco.voci.length, 2, 'il pacco non contiene la spesa appena fatta');
    const linkSpesa = await a.dom.window.fitmealsFamiglia.link(pacco);

    // B apre il link: casa aggiornata DA SOLA, stesso salvataggio, stesso posto
    await b.dom.window.fitmealsFamiglia.importa(linkSpesa.link);
    await wait(300);
    const fB = b.stato().freschezza;
    eq(fB['latte'] && fB['latte'].qta, 500, 'il latte non e\' arrivato');
    eq(fB['latte'].posto, 'frigo', 'il latte non e\' in frigo anche da B');
    eq(fB['riso'] && fB['riso'].qta, 900, 'il riso non e\' arrivato');
    eq(fB['riso'].posto, 'dispensa', 'il riso non e\' in dispensa anche da B');
    vero(b.testo('#toast').includes('2 prodotti sistemati'), 'B non viene avvisato di cosa e\' entrato');

    // lo stesso link aperto due volte non raddoppia niente
    await b.dom.window.fitmealsFamiglia.importa(linkSpesa.link);
    await wait(300);
    eq(b.stato().freschezza['latte'].qta, 500, 'il doppio link ha raddoppiato il latte');
    vero(b.testo('#toast').includes('era già arrivata'), 'il doppione non viene spiegato');

    // la spesa di un'altra famiglia non tocca niente
    const c = await app();
    c.dom.window.fitmealsFamiglia.crea('Altra casa');
    c.tab('view-fridge');
    c.set('disp-cerca', 'pane');
    c.click('[data-act=disp-add]');
    const linkC = await c.dom.window.fitmealsFamiglia.link(c.dom.window.fitmealsFamiglia.paccoSpesa());
    await b.dom.window.fitmealsFamiglia.importa(linkC.link);
    await wait(200);
    vero(!b.stato().freschezza['pane'], 'la spesa di un\'altra famiglia e\' entrata in casa');
    vero(b.testo('#toast').includes('altra famiglia'), 'il rifiuto non viene spiegato');
  });

  await test('con l\'interruttore le ricette valgono per i gusti di tutta la famiglia', async () => {
    const a = await app();
    const b = await app();
    a.dom.window.fitmealsFamiglia.crea('Casa prova');
    const invito = await a.dom.window.fitmealsFamiglia.link(a.dom.window.fitmealsFamiglia.paccoInvito());
    await b.dom.window.fitmealsFamiglia.importa(invito.link);
    await wait(200);
    b.d.getElementById('toast').querySelector('button').click();
    await wait(200);

    // B e' vegetariano: i suoi gusti viaggiano dentro la sua spesa
    b.dom.window.fitmealsProva.profilo().dieta = 'vegetariano';
    b.tab('view-fridge');
    b.set('disp-cerca', 'riso');
    b.click('[data-act=disp-add]');
    const linkB = await b.dom.window.fitmealsFamiglia.link(b.dom.window.fitmealsFamiglia.paccoSpesa());
    await a.dom.window.fitmealsFamiglia.importa(linkB.link);
    await wait(300);
    vero(a.dom.window.fitmealsFamiglia.stato().membri.some(m => m.gusti && m.gusti.dieta === 'vegetariano'),
      'i gusti di B non sono arrivati ad A');

    // interruttore acceso: niente piu' carne nelle ricette di A
    const prima = a.dom.window.fitmealsProva.visibili().length;
    a.tab('view-profile');
    a.click('[data-act=famiglia-tutti]');
    const dopo = a.dom.window.fitmealsProva.visibili();
    vero(dopo.length < prima, 'l\'interruttore non cambia le ricette');
    vero(!dopo.some(r => (r.ing || []).some(i => i.n === 'pollo' || i.n === 'manzo')),
      'con un vegetariano in famiglia la carne resta');
    // spento: si torna ai gusti propri
    a.click('[data-act=famiglia-tutti]');
    eq(a.dom.window.fitmealsProva.visibili().length, prima, 'spegnendo non si torna come prima');
  });

  // ---------------------------------------------------------------- cena
  console.log('\nCena tra amici');
  await test('la cena tra amici propone due piatti che accontentano tutti', async () => {
    const a = await app();
    a.tab('view-home');
    a.click('[data-act=cena-apri]');
    await wait(100);
    vero(a.d.getElementById('modal-cena').classList.contains('active'), 'la cena non si apre');

    // Sara vegetariana e senza funghi, aggiunta a mano coi comandi semplici
    a.d.getElementById('cena-amico-nome').value = 'Sara';
    a.d.querySelector('#cena-chips [data-val=vegetariano]').click();
    a.d.getElementById('cena-amico-no').value = 'funghi';
    a.click('[data-act=cena-amico-add]');
    await wait(100);
    const parte = a.dom.window.fitmealsCena.stato().partecipanti;
    eq(parte.length, 1, 'Sara non e\' in lista');
    eq(parte[0].gusti.dieta, 'vegetariano', 'la dieta di Sara si e\' persa');

    // due proposte, con la motivazione scritta
    a.click('[data-act=cena-trova]');
    await wait(100);
    const prop = [...a.d.querySelectorAll('#cena-proposte .prop-cena')];
    eq(prop.length, 2, 'attese due proposte');
    vero(prop[0].textContent.includes('Va bene per tutti'), 'manca la motivazione');
    vero(prop[0].textContent.includes('Sara'), 'la motivazione non nomina chi');
    // nessuna delle due contiene carne o funghi
    const titoli = prop.map(x => x.querySelector('b').textContent);
    titoli.forEach(titolo => {
      const r = a.stato().recipes.find(y => y.title === titolo);
      vero(r && !(r.ing || []).some(i => ['pollo', 'manzo', 'tonno', 'funghi'].includes(i.n)),
        titolo + ' non rispetta i gusti');
    });
    // "Proponi altre due" cambia i piatti
    a.click('[data-act=cena-altre]');
    await wait(100);
    const dopo = [...a.d.querySelectorAll('#cena-proposte .prop-cena')].map(x => x.querySelector('b').textContent);
    vero(dopo[0] !== titoli[0], 'le proposte non cambiano');

    // caso impossibile: lo dice con garbo e propone le meno peggio
    a.dom.window.fitmealsCena.stato().partecipanti.push({ nome: 'Ugo', gusti: {
      dieta: 'vegano', celiaco: true, incinta: false, esclusi: ['riso','patate','quinoa','mais','polenta',
      'grano saraceno','gallette','ceci','lenticchie','fagioli','tofu','zucchine','melanzane','pomodori',
      'insalata','avocado','frutta','mela','banana','fragole','frutti di bosco','mandorle','noci','zucca',
      'carote','spinaci','broccoli','cavolfiore','peperoni','funghi','cetrioli','sedano','edamame','hummus',
      'datteri','cocco','anguria','melone','pesche','albicocche','uva','kiwi','arance','limone','carciofi',
      'pomodorini','cicoria','verza','cipolla','finocchi','radicchio','olive','cola','aranciata','chinotto',
      'acqua tonica','menta','basilico','prezzemolo','gassosa','te freddo','succo','spremuta','energy drink',
      'arancia','pera','salsa di soia'] } });
    a.click('[data-act=cena-trova]');
    await wait(100);
    vero(a.testo('#cena-proposte').includes('Nessuna ricetta accontenta proprio tutti'),
      'il caso impossibile non viene detto con garbo');
    vero(a.testo('#cena-proposte').includes('Escluderebbe'),
      'le proposte di ripiego non dicono chi resterebbe scontento');
  });

  await test('l\'invito a cena si compila dall\'ospite e la risposta torna indietro', async () => {
    const a = await app();
    const b = await app();
    a.tab('view-home');
    a.click('[data-act=cena-apri]');
    await wait(100);
    const cid = a.dom.window.fitmealsCena.stato().id;
    const invito = await a.dom.window.fitmealsFamiglia.link(
      { v: 1, tipo: 'cena-invito', op: 'op-cena-1', cid: cid, nomeCena: 'La cena', da: 'Organizzatore' });

    // l'ospite apre il link: schermata semplice, niente da installare
    await b.dom.window.fitmealsFamiglia.importa(invito.link);
    await wait(200);
    vero(b.d.getElementById('modal-cena-ospite').classList.contains('active'), 'l\'ospite non vede l\'invito');
    vero(b.testo('#cena-ospite-corpo').includes('Organizzatore'), 'l\'invito non dice chi invita');
    b.d.getElementById('cenag-nome').value = 'Piero';
    b.d.querySelector('#cenag-chips [data-val=celiaco]').click();
    b.d.getElementById('cenag-no').value = 'gorgonzola, cozze';
    b.click('[data-act=cena-rispondi]');
    await wait(300);
    const risposta = b.d.getElementById('condividi-link');
    vero(risposta && risposta.value.includes('#fm='), 'la risposta non diventa un link');

    // la risposta torna dall'organizzatore: i gusti entrano da soli
    await a.dom.window.fitmealsFamiglia.importa(risposta.value);
    await wait(300);
    const piero = a.dom.window.fitmealsCena.stato().partecipanti.find(p => p.nome === 'Piero');
    vero(piero, 'Piero non e\' entrato nella cena');
    vero(piero.gusti.celiaco, 'il senza glutine di Piero si e\' perso');
    vero(piero.gusti.esclusi.includes('gorgonzola'), 'gli esclusi di Piero si sono persi');

    // una risposta di una cena precedente non si perde: entra in quella
    // aperta, e il toast spiega cos'e' successo
    const c = await app();
    const orfana = await c.dom.window.fitmealsFamiglia.link(
      { v: 1, tipo: 'cena-risposta', op: 'op-x', cid: 'cena-sparita', nomeCena: 'Vecchia cena',
        da: 'Anna', gusti: { dieta: 'vegano', celiaco: false, esclusi: [] } });
    await a.dom.window.fitmealsFamiglia.importa(orfana.link);
    await wait(200);
    const anna = a.dom.window.fitmealsCena.stato().partecipanti.find(p => p.nome === 'Anna');
    vero(anna && anna.gusti.dieta === 'vegano', 'la risposta di una cena precedente si e\' persa');
    vero(a.testo('#toast').includes('cena precedente'), 'il travaso non viene spiegato');

    // e su un telefono SENZA nessuna cena (il link aperto in Safari mentre
    // la cena vive nell'app): la cena si apre da sola col suo nome
    const e2 = await app();
    await e2.dom.window.fitmealsFamiglia.importa(orfana.link);
    await wait(200);
    const cenaNuova = e2.dom.window.fitmealsCena.stato();
    eq(cenaNuova.nome, 'Vecchia cena', 'la cena di ripiego non prende il nome giusto');
    vero(cenaNuova.partecipanti.some(p => p.nome === 'Anna'), 'i gusti non entrano nella cena di ripiego');
    vero(e2.testo('#toast').includes('incolla il link'), 'manca il consiglio di incollare nell\'app');

    // il campo "incollalo qui" dentro la cena legge i link come l'apertura diretta
    a.click('[data-act=cena-apri]');
    await wait(100);
    const rispostaBis = await c.dom.window.fitmealsFamiglia.link(
      { v: 1, tipo: 'cena-risposta', op: 'op-y', cid: a.dom.window.fitmealsCena.stato().id,
        da: 'Marco', gusti: { dieta: '', celiaco: true, esclusi: [] } });
    a.d.getElementById('cena-link-in').value = rispostaBis.link;
    a.click('[data-act=cena-incolla]');
    await wait(300);
    vero(a.dom.window.fitmealsCena.stato().partecipanti.some(p => p.nome === 'Marco'),
      'il link incollato nella cena non viene letto');
    // e anche la famiglia ha il suo campo per incollare
    a.tab('view-profile');
    vero(a.d.getElementById('fam-link-in'), 'manca il campo per incollare i link della famiglia');
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
    // Prendo l'ultima definizione: vale quella del tema in uso. Il tema neon
    // la tiene nel token --testo-3 (cosi' il laboratorio tema puo' girarla).
    const tutte = [...css.matchAll(/--(?:text-tertiary|testo-3):rgba\([\d,\s]+\.(\d+)\)/g)];
    vero(tutte.length, 'token non trovato');
    const alfa = Number(tutte[tutte.length - 1][1]);
    vero(alfa >= 45, 'testo terziario troppo tenue: .' + alfa);
  });

  await test('la palette neon e\' quella attiva: fondo arancio, finestre porcellana', async () => {
    const a = await app();
    const css = a.d.querySelector('style').textContent;
    vero(/--neon:\s*#ff6115/i.test(css), 'manca il Neon Orange #FF6115');
    vero(/--porcellana:\s*#fffcf4/i.test(css), 'manca la Porcelain #FFFCF4');
    vero(/--bg-main:\s*var\(--neon\)/i.test(css), 'il fondo non e\' il neon');
    vero(/--testo:\s*#2a1810/i.test(css), 'manca il bruno scuro per le scritte su card');
    vero(/--azione:\s*#b8420c/i.test(css), 'manca il colore delle azioni');
    // dentro le finestre le scritte ripartono dal bruno scuro
    vero(/--text-primary:var\(--testo\)/.test(css.replace(/\s+/g, '')),
      'le finestre non ridefiniscono il colore delle scritte');
  });

  await test('la ricerca conserva il fondale neutro del Core UI v1.24', async () => {
    const a = await app();
    a.click('[data-act=pasto-vai][data-val="2"]');
    const ora = () => (a.d.querySelector('#sfondo .strato.viva') || {}).style.backgroundImage || '';
    const prima = ora();
    a.set('cerca-cen', 'salmone');
    const dopo = ora();
    eq(dopo, prima, 'la ricerca ha riattivato un fondale illustrato legacy');
    a.set('cerca-cen', '');
    eq(ora(), dopo, 'il fondale neutro non resta coerente');
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

  await test('cambiare la grammatura ricalcola i valori al salvataggio', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    const riso = P.tabella('riso');
    const pollo = P.tabella('petto di pollo');

    // nuova ricetta con i valori scritti a mano: restano quelli
    a.tab('view-home');
    a.click('[data-act=open-form]');
    a.d.getElementById('f-title').value = 'Riso e pollo di prova';
    ['f-kcal', 'f-pro', 'f-prep', 'f-cook'].forEach((x, i) => a.d.getElementById(x).value = [999, 77, 5, 10][i]);
    a.d.getElementById('f-ing').value = 'riso:100:g\npetto di pollo:200:g';
    a.d.getElementById('f-steps').value = 'Cuoci.';
    a.d.getElementById('form-recipe').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    let r = a.stato().recipes.find(x => x.title === 'Riso e pollo di prova');
    eq(r.kcal, 999, 'i valori scritti a mano non vengono rispettati');

    // modifico la grammatura: al salvataggio kcal e macro seguono le tabelle
    const finto = a.d.createElement('button');
    finto.dataset.act = 'edit'; finto.dataset.val = r.id;
    a.d.body.appendChild(finto); finto.click();
    await wait(100);
    a.d.getElementById('f-ing').value = 'riso:200:g\npetto di pollo:300:g';
    a.d.getElementById('form-recipe').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await wait(100);
    r = a.stato().recipes.find(x => x.title === 'Riso e pollo di prova');
    eq(r.kcal, Math.round(2 * riso[0] + 3 * pollo[0]), 'le kcal non seguono la grammatura');
    eq(r.pro, Math.round((2 * riso[1] + 3 * pollo[1]) * 10) / 10, 'le proteine non seguono la grammatura');
    vero(r.carbs > 0 && r.fat > 0, 'carboidrati e grassi non vengono calcolati');
    vero(a.testo('#toast').includes('ricalcolati dalla grammatura'), 'il ricalcolo non viene detto');
    vero(a.testo('#toast').includes('aggiornata'), 'la modifica si presenta come nuova ricetta');
    eq(a.stato().recipes.filter(x => x.title === 'Riso e pollo di prova').length, 1, 'la modifica ha creato un doppione');

    // ingredienti che le tabelle non conoscono: i valori non si toccano
    finto.click();
    await wait(100);
    a.d.getElementById('f-ing').value = 'gnappole siderali:500:g';
    a.d.getElementById('form-recipe').dispatchEvent(new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await wait(100);
    const r2 = a.stato().recipes.find(x => x.title === 'Riso e pollo di prova');
    eq(r2.kcal, r.kcal, 'con ingredienti ignoti i valori sono stati riscritti a caso');

    // e l'anteprima viva nel modulo dice cosa verra' calcolato
    finto.click();
    await wait(100);
    a.d.getElementById('f-ing').value = 'riso:100:g';
    a.d.getElementById('f-ing').dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    await wait(500);
    const ant = a.d.getElementById('f-calcolo');
    vero(ant && !ant.hidden && ant.textContent.includes('kcal'), 'l\'anteprima dalla grammatura non compare');
    a.click('#modal-add [data-act=close-modal]');
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
  await test('la scheda dice l\'essenziale e mostra il FO di famiglia', async () => {
    const a = await app();
    const c = a.d.querySelector('#lista-cen .scheda');
    vero(c, 'nessuna scheda');
    vero(c.querySelector('.scheda-arte .mealup-fo-slot img'), 'manca il FO di famiglia');
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

  await test('i FO seguono la mappa canonica per recipe id', async () => {
    const a = await app();
    const { arteRicetta } = a.dom.window.fitmealsArte;
    const icona = t => {
      const r = a.stato().recipes.find(x => x.title.toLowerCase().startsWith(t));
      return r ? arteRicetta(r) : null;
    };
    vero(/data-family="PASTA"/.test(icona('spaghetti alla carbonara')), 'carbonara fuori famiglia PASTA');
    vero(/data-family="BEVANDE"/.test(icona('succo')), 'succo fuori famiglia BEVANDE');
    vero(/data-family="BEVANDE"/.test(icona('te freddo')), 'te freddo fuori famiglia BEVANDE');
    vero(/data-family="PASTA"/.test(icona("penne all'arrabbiata")), 'penne fuori famiglia PASTA');
    vero(/data-family="PESCE"/.test(icona('branzino')), 'branzino fuori famiglia PESCE');
    vero(/data-family="LEGUMI"/.test(icona('zuppa di ceci') || icona('zuppa di lenticchie')),
      'zuppa fuori famiglia LEGUMI');
  });

  await test('la mappa canonica comanda anche sui titoli ambigui', async () => {
    const a = await app();
    const { arteRicetta } = a.dom.window.fitmealsArte;
    const r = a.stato().recipes.find(x => /uova ripiene/i.test(x.title));
    vero(r, 'ricetta non trovata');
    vero(/data-family="UOVA"/.test(arteRicetta(r)), 'recipe id fuori famiglia UOVA');
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
    eq(a.conta('#pagina-cen .home-card'), 2, 'la Home deve mostrare protagonista e anteprima per la cena');
    eq(a.d.querySelector('#pagina-cen .home-suggestion-stage').dataset.homeCount, '3', 'la Home deve conservare le tre proposte per la cena');
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

  await test('il fondale usa il guscio neutro FROZEN v1.24', async () => {
    const a = await app();
    const strati = [...a.d.querySelectorAll('#sfondo .strato')];
    eq(strati.length, 2, 'servono due strati per la dissolvenza');
    const viva = strati.find(x => x.classList.contains('viva'));
    vero(viva && !/svg/.test(viva.style.backgroundImage), 'è tornato un disegno di fondo legacy');
    vero(a.d.querySelector('link[href*="mealup-v124.css"]'), 'manca il Core UI v1.24');
  });

  await test('il dettaglio conserva il fondale neutro FROZEN', async () => {
    const a = await app();
    const ora = () => (a.d.querySelector('#sfondo .strato.viva') || {}).style.backgroundImage;
    const prima = ora();
    a.cerca('branzino al cartoccio');
    a.click('#recipe-list .scheda');
    eq(ora(), prima, 'il dettaglio ha riattivato un fondale legacy');
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
    a.click('#modal-detail [data-act=cook-open]');
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

  await test('le verdure condividono il FO canonico VERDURA', async () => {
    const a = await app();
    const arte = t => { a.cerca(t); return a.d.querySelector('#recipe-list .mealup-fo-slot'); };
    ['insalata mista', 'broccoli ripassati', 'zucchine trifolate'].forEach(t => {
      const fo = arte(t);
      vero(fo && fo.dataset.family === 'VERDURA', t + ': famiglia FO errata');
    });
  });

  await test('le bevande usano il FO canonico BEVANDE', async () => {
    const a = await app();
    const { arteRicetta } = a.dom.window.fitmealsArte;
    ['cola', 'chinotto', 'gassosa'].forEach(t => {
      const r = a.stato().recipes.find(x => new RegExp('(^|\\s)' + t + '($|\\s)').test(x.title.toLowerCase()));
      if (r) vero(/data-family="BEVANDE"/.test(arteRicetta(r)), t + ' fuori famiglia BEVANDE');
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

  await test('gli avanzi restano nella sezione dedicata con il pasto di origine', async () => {
    const a = await app({ storage: conAvanzi(ora => [
      // di ieri a pranzo: oggi a pranzo ci deve essere
      { rid:'c25', title:'Pollo di ieri', n:2, kcal:400, pro:45, ts: ora - 26 * 3600000, pasto:'pra' },
      // di oggi a pranzo: non stasera, e nemmeno adesso
      { rid:'p07', title:'Risotto di oggi', n:1, kcal:600, pro:15, ts: ora - 2 * 3600000, pasto:'pra' }
    ]) });
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    const testo = a.testo('#leftovers-body');
    vero(testo.includes('Pollo di ieri'), 'manca l\'avanzo di ieri');
    vero(testo.includes('Risotto di oggi'), 'manca l\'avanzo di oggi');
    vero(/pranzo/i.test(testo), 'manca il pasto di origine');
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

  await test('un avanzo urgente resta visibile nella sezione dedicata', async () => {
    const a = await app({ storage: conAvanzi(ora => [
      // pesce di ieri sera: la finestra e\' 24 ore, quindi stringe adesso
      { rid:'m01', title:'Orata di ieri', n:1, kcal:300, pro:40, ts: ora - 20 * 3600000, pasto:'cen' }
    ]) });
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=avanzi]');
    vero(a.testo('#leftovers-body').includes('Orata di ieri'),
      'un avanzo agli sgoccioli non compare nella sezione Avanzi');
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

  await test('le icone della barra seguono il Master v1.24', async () => {
    const a = await app();
    vero(a.d.querySelector('.tab-item .ricette-icon'), 'manca l\'icona Ricette approvata');
    vero(a.d.querySelector('.tab-item .scorte-icon'), 'manca l\'icona Scorte approvata');
    eq([...a.d.querySelectorAll('.tab-item')].map(x => x.textContent.trim()).join('|'),
      'Home|Ricette|Spesa|Scorte|Profilo', 'ordine o nomi della barra errati');
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
    eq(a.testo('#shop-unita'), 'un.', 'le uova si contano');
    a.click('[data-act=shop-unita]');       // apre la rotella
    vero(!a.d.getElementById('rotella-velo').hidden, 'la rotella delle unita\' non si apre');
    a.dom.window.fitmealsProva.rotellaScegli(null, 'g');
    eq(a.testo('#shop-unita'), 'g', 'l\'unita non si corregge dalla rotella');
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
    // il tasto ora porta anche il conto del carrello (gerarchia 6A)
    vero(/^Fine spesa( \u00b7 \d+)?$/.test(a.testo('[data-act=shop-bought]').trim()),
      'il tasto non si chiama Fine spesa');
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
      a.click('[data-act=disp-unita]');       // apre la rotella
      a.dom.window.fitmealsProva.rotellaScegli(Number(q), unitaTest(u));
      a.click('[data-act=disp-add]');
    };
    // le etichette dei test parlano come i bottoni ('kg', 'L', 'un.')
    const unitaTest = et => ({ 'un.': 'pz', 'L': 'l' })[et] || et;
    metti('riso', '1', 'kg');
    metti('pasta', '500', 'g');
    metti('uovo', '6', 'un.');

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
    a.click('[data-act=disp-unita]');       // apre la rotella
    a.dom.window.fitmealsProva.rotellaScegli(1, 'kg');
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
    a.click('[data-act=shop-unita]');       // apre la rotella
    a.dom.window.fitmealsProva.rotellaScegli(2, 'kg');
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
    eq(a.conta('#view-home .bilancia-live'), 1, 'la bilancia deve essere una');
    const box = a.d.getElementById('anello-unico');
    vero(box.querySelector('.mealup-scale-svg') && box.querySelector('.mu-scale-needle'), 'manca la bilancia');
    eq(box.querySelectorAll('.mu-flip').length, 4, 'il contatore non ha quattro cifre');
    almeno(box.querySelectorAll('.mu-scale-label').length, 4, 'mancano le cifre della scala');
  });

  await test('l\'anello si riempie con quello che mangi', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-home');
    const box = a.d.getElementById('anello-unico');
    const centro = Number(box.querySelector('.bilancia-live').dataset.valore);
    almeno(centro, 500, 'il centro non conta quello che hai mangiato');
    eq(box.querySelectorAll('.mu-scale-progress').length, 1, 'manca il progresso sul quadrante');
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
    eq(box.querySelector('.bilancia-live').dataset.valore, '500', 'le kcal non sono sulla bilancia');
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
    const b = a.d.querySelector('#pagina-cen .home-card');
    vero(b, 'manca la proposta Dimmi tu');
    b.click();
    const titolo = a.testo('#detail-body h2');
    vero(titolo, 'non ha aperto niente');

    // deve usare qualcosa che ho, e dirmi cosa sta finendo
    const r = a.stato().recipes.find(x => x.title === titolo);
    const miei = ['pollo', 'riso', 'pomodor', 'cipolla'];
    vero((r.ing || []).some(i => miei.some(k => i.n.includes(k))),
      titolo + ' non usa niente di quello che ho');
    vero(/kcal/.test(a.testo('#detail-body')), 'il dettaglio non mostra le calorie');
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
    const ago = () => a.d.querySelector('#anello-unico .mu-scale-needle');
    const punta = () => ago().getAttribute('style');

    const digiuno = punta();
    vero(a.conta('#anello-unico .mu-scale-label') >= 4, 'il quadrante non ha la scala');

    const mangia = (pasto, kcal) => {
      a.click('[data-act=quick-open][data-val=' + pasto + ']');
      a.d.getElementById('q-nome').value = pasto;
      a.d.getElementById('q-kcal').value = String(kcal);
      a.click('[data-act=quick-save]');
    };

    mangia('col', 450);
    vero(punta() !== digiuno, 'l\'ago non si e\' mosso');
    mangia('pra', 800);
    vero(punta() !== digiuno, 'l\'ago non segue il pranzo');
    mangia('cen', 1500);
    vero(a.d.querySelector('#anello-unico .bilancia-live').dataset.valore > 2000,
      'oltre il fabbisogno il totale non viene registrato');
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

  await test('ricerca e Scorte espongono i rispettivi comandi', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-search');
    vero(a.d.querySelector('#comandi-cerca [data-act=sorprendimi]'), 'manca sorprendimi in Cerca');
    a.tab('view-fridge');
    vero(a.d.querySelector('[data-act=sorprendimi][data-val=dispensa]'),
      'manca la sorpresa in dispensa');
  });

  await test('i filtri sono nascosti e governano il catalogo', async () => {
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
    const titoli = [...a.d.querySelectorAll('#recipe-list .scheda-titolo')].map(x => x.textContent);
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

  await test('la bilancia mantiene la struttura approvata', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    a.tab('view-home');
    vero(a.d.querySelector('#anello-unico .mu-scale-shell'), 'manca il quadrante');
    vero(a.d.querySelector('#anello-unico .mu-scale-neck'), 'manca il collo');
    vero(a.d.querySelector('#anello-unico .mu-scale-base'), 'manca la base');
    eq(a.conta('#anello-unico .mu-scale-foot'), 2, 'mancano i piedini');
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
  await test('le famiglie hanno il loro FO canonico fisso', async () => {
    const a = await app();
    const { arteRicetta } = a.dom.window.fitmealsArte;
    const nome = markup => ((markup.match(/data-family="([A-Z]+)"/) || [])[1] || 'UNMAPPED');
    const icona = titolo => {
      const r = a.stato().recipes.find(x => x.title.toLowerCase().startsWith(titolo));
      return r ? nome(arteRicetta(r)) : '(non trovata)';
    };
    eq(icona('spaghetti alla carbonara'), 'PASTA', 'carbonara fuori PASTA');
    eq(icona('lasagne'), 'PASTA', 'lasagne fuori PASTA');
    eq(icona('bistecca alla fiorentina'), 'CARNE', 'bistecca fuori CARNE');
    eq(icona('tagliata di manzo'), 'CARNE', 'tagliata fuori CARNE');
    eq(icona('salmone al forno'), 'PESCE', 'salmone fuori PESCE');
    eq(icona('frittata'), 'UOVA', 'frittata fuori UOVA');
    eq(icona('porridge'), 'CEREALI', 'porridge fuori CEREALI');
    eq(icona('pizza'), 'PANE', 'pizza fuori PANE');
    eq(icona('lattina di cola'), 'BEVANDE', 'cola fuori BEVANDE');
    eq(icona('chinotto'), 'BEVANDE', 'chinotto fuori BEVANDE');
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
    eq(a.d.querySelector('#anello-unico .bilancia-live').dataset.valore, '0', 'oggi non parte da zero');
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

  await test('la bilancia usa quattro cifre e una scala crescente', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    const box = a.d.getElementById('anello-unico');
    eq(box.querySelectorAll('.mu-flip').length, 4, 'mancano le quattro celle delle cifre');
    almeno(box.querySelectorAll('.mu-scale-label').length, 4, 'mancano le cifre nel quadrante');
    const cifre = [...box.querySelectorAll('.mu-scale-label')].map(x => Number(x.textContent));
    vero(cifre.every((v, i) => !i || v > cifre[i - 1]),
      'la scala non cresce: ' + cifre.join(','));
    vero(cifre[0] > 0 && Math.abs(cifre[1] - cifre[0] * 2) <= 20 && cifre[3] > cifre[2],
      'la scala non e\' terzo/due terzi/obiettivo/fondo: ' + cifre.join(','));
    vero(box.querySelector('.mu-scale-neck'), 'manca il collo della bilancia');
    eq(box.querySelectorAll('.mu-scale-foot').length, 2, 'mancano i piedini');
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

  await test('la bilancia si assesta quando cambia il totale', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="1"]');
    a.click('[data-act=quick-open][data-val=pra]');
    a.d.getElementById('q-nome').value = 'X';
    a.d.getElementById('q-kcal').value = '500';
    a.click('[data-act=quick-save]');
    const box = a.d.getElementById('anello-unico');
    vero(box.querySelector('.mealup-scale-svg.oscilla'), 'la bilancia non si assesta');
    eq(box.querySelector('.bilancia-live').dataset.valore, '500', 'il totale non cambia');
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

  await test('il fondo ha il velo e le salse il FO canonico', async () => {
    const a = await app();
    vero(a.d.getElementById('velo-fondo'), 'manca il velo sotto la barra');
    const css = a.d.querySelector('style').textContent;
    vero(/#velo-fondo\{[^}]*linear-gradient\(to top/.test(css), 'il velo non sfuma verso l\'alto');

    const { arteRicetta } = a.dom.window.fitmealsArte;
    const salse = a.stato().recipes.filter(r => r.portata === 'salsa');
    almeno(salse.length, 3, 'niente salse in catalogo');
    salse.forEach(r => vero(/data-family="SALSE"/.test(arteRicetta(r)),
      r.title + ' fuori famiglia SALSE'));
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

  await test('la quantita\' mangiata si regola nel pasto, la ricetta resta intera', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    a.tab('view-profile'); a.profiloBase();
    a.apri('carbonara');
    a.click('#detail-body [data-act=log-meal]');
    a.click('#modal-detail [data-act=close-modal]');
    const orig = clone(a.stato().recipes.find(r => /spaghetti alla carbonara/i.test(r.title)));
    const base = P.perPortion(orig);
    const peso = P.istPesoPorzione(orig);

    // apro il piatto mangiato
    a.tab('view-home');
    const pasto = a.stato().log[0].meal;
    a.d.querySelector('#anello-unico .gamba[data-val=' + pasto + ']').click();
    a.click('#pasto-piatti-body .scheda');

    // il controllo c'e': frazioni rapide, grammi, resoconto vivo
    eq(a.conta('#ist-quote .chip'), 5, 'mancano le frazioni rapide');
    vero(a.d.getElementById('ist-grammi'), 'manca il campo dei grammi');
    vero(a.testo('#ist-conto').includes('kcal'), 'il resoconto vivo non compare');

    // mezza porzione: kcal, proteine e grammi si riscrivono davanti a te
    a.d.querySelector('#ist-quote [data-val="0.5"]').click();
    eq(Number(a.d.getElementById('ist-kcal').value), Math.round(base.kcal * 0.5),
      'le kcal non seguono la mezza porzione');
    eq(Number(a.d.getElementById('ist-grammi').value), Math.round(peso * 0.5),
      'i grammi non seguono la mezza porzione');
    vero(a.testo('#ist-conto').includes('mezza porzione'), 'il resoconto non dice mezza porzione');

    // salvo: pasto e giornata alla quota giusta, ricetta intatta
    a.click('[data-act=istanza-salva]');
    const v = a.stato().log[0];
    eq(v.kcal, Math.round(base.kcal * 0.5), 'il pasto non ha le kcal della quota');
    eq(v.quota, 0.5, 'la quota non si salva');
    eq(v.carbs, Math.round((base.carbs || 0) * 0.5), 'i carboidrati non seguono la quota');
    eq(Object.values(a.stato().daily)[0].k, v.kcal, 'la bilancia della giornata non segue la quota');
    const dopo = a.stato().recipes.find(r => r.id === orig.id);
    eq(dopo.kcal, orig.kcal, 'le kcal della ricetta originale sono cambiate');
    eq(JSON.stringify(dopo.ing), JSON.stringify(orig.ing), 'la grammatura della ricetta e\' cambiata');

    // i grammi scritti a mano: tre quarti di porzione circa
    const g75 = Math.round(peso * 0.75);
    a.d.getElementById('ist-grammi').value = String(g75);
    a.d.getElementById('ist-grammi').dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    await wait(80);
    eq(Number(a.d.getElementById('ist-kcal').value), Math.round(base.kcal * (g75 / peso)),
      'le kcal non seguono i grammi scritti a mano');
    a.click('[data-act=istanza-salva]');
    eq(a.stato().log[0].grammi, g75, 'i grammi mangiati non si salvano');
    eq(Object.values(a.stato().daily)[0].k, a.stato().log[0].kcal,
      'la giornata non segue la seconda correzione');

    // e nel pasto la quantita' si legge accanto all'ora
    a.click('#modal-detail [data-act=close-modal]');
    a.d.querySelector('#anello-unico .gamba[data-val=' + pasto + ']').click();
    vero(/\d+ g,/.test(a.testo('#pasto-piatti-body .quando')), 'la quantita\' non si legge nel pasto');

    // una ricetta a fette mostra il riferimento "1 fetta/porzione su N"
    const aFette = a.stato().recipes.find(r => Number(r.serves) >= 2 && (r.ing || []).length);
    P.logMeal(aFette.id, 'cen');
    const vf = a.stato().log.find(x => x.rid === aFette.id);
    const finto = a.d.createElement('div');
    finto.className = 'piatto-del-pasto'; finto.dataset.ts = vf.ts;
    const bott = a.d.createElement('button');
    bott.dataset.act = 'detail'; bott.dataset.val = aFette.id;
    finto.appendChild(bott); a.d.getElementById('pasto-piatti-body').appendChild(finto);
    bott.click();
    await wait(80);
    vero(new RegExp('su ' + Number(aFette.serves)).test(a.testo('.istanza-box')),
      'manca il riferimento alle fette della ricetta');
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
    vero(!a.d.querySelector('#anello-unico .striscia-seg'),
      'la base della bilancia deve restare crema, senza i colori dei pasti');
    const kPra = a.d.querySelector('#anello-unico .gamba.f-pra b').textContent;
    const kCen = a.d.querySelector('#anello-unico .gamba.f-cen b').textContent;
    eq(kPra, '600', 'la card del pranzo non tiene il conto');
    eq(kCen, '900', 'la card della cena non tiene il conto');
    vero(a.d.querySelector('#anello-unico .gamba.f-pra .gamba-pieno'),
      'manca la barretta di progresso del pasto');
  });

  await test('registrare e correggere un pasto aggiorna il totale vero', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-home');
    a.dom.window.fitmealsProva.logMeal(a.stato().recipes[8].id, 'col');
    const totale = Number(a.d.querySelector('#anello-unico .bilancia-live').dataset.valore);
    almeno(totale, 1, 'la registrazione non aggiorna la bilancia');
    vero(a.d.querySelector('#anello-unico .mealup-scale-svg.oscilla'),
      'la bilancia non reagisce alla registrazione');
    eq(a.stato().log.length, 1, 'la registrazione non entra nel diario');
  });

  await test('la Home mantiene una protagonista e due proposte scorribili per pasto', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="2"]');
    const primo = a.d.querySelector('#pagina-cen .home-card');
    vero(primo, 'nessun consiglio in cena');
    eq(a.conta('#pagina-cen .home-card'), 2, 'la Home deve mostrare protagonista e anteprima');
    vero(a.d.querySelector('#pagina-cen .home-suggestion-stage').dataset.homeCount === '3',
      'il carosello non espone il numero corretto di proposte');
    eq(a.conta('#pagina-cen .sugg-x'), 0, 'è rimasto il comando legacy di chiusura');

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

  await test('lo swipe ricetta non cambia pasto, anima la nuova card e lascia aprire il dettaglio', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.click('[data-act=pasto-vai][data-val="2"]');
    const stage = a.d.querySelector('#pagina-cen .home-suggestion-stage');
    const prima = stage.querySelector('.home-card').dataset.val;
    const pointer = (target, tipo, x, y) => {
      const e = new a.dom.window.Event(tipo, { bubbles: true, cancelable: true });
      Object.defineProperties(e, {
        clientX: { value: x }, clientY: { value: y }, button: { value: 0 }
      });
      target.dispatchEvent(e);
    };
    pointer(stage, 'pointerdown', 240, 120);
    pointer(a.d, 'pointermove', 140, 124);
    pointer(a.d, 'pointerup', 140, 124);
    const nuova = a.d.querySelector('#pagina-cen .home-suggestion-stage');
    vero(nuova.querySelector('.home-card').dataset.val !== prima, 'lo swipe non cambia proposta');
    vero(a.d.querySelector('.pasto-tab.active').dataset.val === '2', 'lo swipe ricetta ha cambiato pasto');
    vero(nuova.querySelector('.home-card.is-current .mealup-fo-slot'), 'la nuova protagonista non attiva il FO');
    vero(nuova.querySelector('.home-card.is-current .home-card-gauge'), 'la nuova protagonista non attiva il gauge');
    eq(a.conta('#pagina-cen .home-suggestion-hint'), 0, 'l\'hint non scompare dopo il primo swipe');
    await wait(500);
    a.click('#pagina-cen .home-card.is-current');
    vero(!a.d.getElementById('modal-detail').hidden, 'il tap sulla ricetta non apre il dettaglio');
  });

  console.log('\nDetta la spesa');
  await test('il dettato diventa righe riconosciute, con quantita e dubbi', async () => {
    const a = await app();
    const V = a.dom.window.fitmealsVoce;
    const righe = V.interpreta('pomodori, mozzarella e due litri di latte, tre confezioni di iogurt greco, parmiggiano');
    eq(righe.length, 5, 'le voci non si separano');
    vero(righe[0].sicuro && righe[0].nome === 'pomodori', 'pomodori non riconosciuti');
    const latte = righe.find(r => r.nome === 'latte');
    vero(latte && latte.q === 2 && latte.u === 'l', 'due litri di latte non restano 2 litri');
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
    vero(a.d.querySelector('.modo-spesa[data-act=detta-apri]'), 'manca il bottone del microfono');
    vero(a.d.querySelector('.modo-spesa[data-act=scontrino-apri]'), 'manca il bottone dello scontrino');
    vero(a.d.querySelector('.modo-spesa[data-act=spesa-a-mano]'), 'manca il bottone a mano');

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

    // spuntata e portata in dispensa, la scadenza segue le stesse regole;
    // e la voce si ricorda liquida, cosi' si legge in ml e litri
    const voce = a.dom.window.fitmealsDebug().shopExtra.find(x => x.n === 'latte');
    vero(voce.unita === 'ml', 'il liquido non si ricorda liquido');
  });

  await test('lo scontrino passa dallo stesso salvataggio di voce e manuale', async () => {
    const a = await app();
    a.tab('view-fridge');

    // il testo che uscirebbe dall'OCR: prezzi, totali e codici da buttare
    a.dom.window.fitmealsScontrino.daTesto([
      'SUPERMERCATO PROVA SRL',
      'VIA ROMA 1 - MILANO',
      'LATTE INTERO 1L        1,49',
      'PANE 0,500 kg          2,10',
      '2 X BANANE             1,98',
      'GNAPPOLE SFRIGOLATE    3,00',
      'TOTALE                 8,57',
      'CONTANTE              10,00',
      'RESTO                  1,43'
    ].join('\n'));

    vero(a.d.getElementById('modal-dettatura').classList.contains('active'), 'la conferma non si apre');
    const righe = [...a.d.querySelectorAll('.riga-dettata')];
    vero(righe.length === 3, 'attese 3 righe prodotto, trovate ' + righe.length);
    vero(!a.d.getElementById('dettatura-lista').textContent.includes('1,49'), 'un prezzo e\' rimasto in lista');
    vero(righe.some(r => r.classList.contains('incerta')), 'la riga non esatta deve dirsi da controllare');
    // il pasticcio che non sa di cibo ora viene scartato, non proposto
    vero(![...a.d.querySelectorAll('.det-nome')].some(c => /gnappole/i.test(c.value)),
      'la riga senza senso doveva essere scartata');
    // e la schermata lo dice, con un conteggio visibile
    const conto = a.d.getElementById('dettatura-conto');
    vero(conto && !conto.hidden, 'il conteggio delle righe scartate non si vede');
    vero(conto.textContent.includes('3 prodotti riconosciuti'), 'il conteggio dei prodotti manca: ' + conto.textContent);
    vero(conto.textContent.includes('6 righe scartate automaticamente'), 'il conteggio degli scarti manca: ' + conto.textContent);

    a.click('[data-act=detta-salva]');
    a.set('shop-add', 'farina');
    a.d.getElementById('shop-qta').value = '1';
    a.click('[data-act=shop-extra]');

    const S = a.stato();
    const latte = S.shopExtra.find(x => x.n === 'latte intero');
    const manuale = S.shopExtra.find(x => x.n === 'farina');
    vero(latte && manuale, 'mancano voci');
    eq(Object.keys(latte).sort().join(), Object.keys(manuale).sort().join(),
      'la voce da scontrino ha una struttura diversa dal manuale');
    eq(latte.qta, 1000, 'il litro dello scontrino non e\' diventato grammi come altrove');
    vero(!JSON.stringify(S.shopExtra).match(/1[.,]49|8[.,]57/), 'un prezzo e\' finito nei dati salvati');
  });

  await test('lo scontrino scarta il rumore ma non i prodotti veri', async () => {
    const a = await app();
    const Sc = a.dom.window.fitmealsScontrino;

    // le righe che non sono mai prodotti spariscono del tutto
    ['CASSA 3 OPERATORE MARIA', 'OFFERTA RISPARMIO 0,50', 'REPARTO ORTOFRUTTA',
     '12/05/2026 18:32', '456789012345', 'EURO QUATTRO/57',
     'BENVENUTI E ARRIVEDERCI', 'GNAPPOLE SFRIGOLATE 3,00'
    ].forEach(r => {
      vero(Sc.riga(r) === null, 'doveva essere scartata: ' + r);
    });

    // un nome troppo lungo per essere un prodotto se ne va
    vero(Sc.riga('LOTTO PRODUZIONE STABILIMENTO CONFEZIONAMENTO DI ORIGINE CONTROLLATA') === null,
      'la riga chilometrica doveva essere scartata');

    // ma un prodotto vero non esatto resta, da controllare e modificabile
    const gnocchi = Sc.riga('GNOCCHI DI SEGALE BIO 2,50');
    vero(gnocchi && !gnocchi.sicuro, 'il prodotto plausibile ma ignoto deve restare da controllare');
    vero(/gnocchi/.test(gnocchi.nome), 'il nome plausibile si e\' perso');

    // e i prodotti noti non peggiorano: passano tutti
    ['LATTE INTERO 1L 1,49', 'PANE 0,500 kg 2,10', 'PASSATA DI POMODORO 0,89',
     'PETTO DI POLLO 4,99', 'PARMIGIANO REGGIANO 5,20'].forEach(r => {
      vero(Sc.riga(r) !== null, 'un prodotto vero e\' stato scartato: ' + r);
    });

    // il conteggio arriva assieme alle righe
    const unite = Sc.interpreta('CASSA 3 OPERATORE MARIA\nLATTE INTERO 1L 1,49\nTOTALE 1,49');
    eq(unite.length, 1, 'atteso un solo prodotto');
    eq(unite.scartate, 2, 'gli scarti non tornano');

    // nella dettatura a voce il conteggio non compare
    a.dom.window.fitmealsVoce.daTesto('latte, pane');
    vero(a.d.getElementById('dettatura-conto').hidden, 'il conteggio compare anche nella dettatura a voce');
  });

  await test('le diete del profilo nascondono le ricette giuste', async () => {
    const a = await app();
    const w = a.dom.window;
    const prof = w.fitmealsProva.profilo();   // il profilo vivo, non un clone
    const ha = (r, nome) => r.ing.some(i => i.n === nome);

    // vegetariano: niente carne ne' pesce
    prof.dieta = 'vegetariano';
    let vis = w.fitmealsProva.visibili();
    vero(vis.length > 50, 'un vegetariano deve avere ancora molte ricette');
    vero(!vis.some(r => ha(r, 'pollo') || ha(r, 'manzo') || ha(r, 'tonno')),
      'a un vegetariano e\' rimasta carne o pesce');
    vero(vis.some(r => ha(r, 'parmigiano')), 'a un vegetariano il formaggio resta');

    // vegano: nemmeno i derivati
    prof.dieta = 'vegano';
    vis = w.fitmealsProva.visibili();
    vero(!vis.some(r => ha(r, 'parmigiano') || ha(r, 'uova') || ha(r, 'miele')),
      'a un vegano sono rimasti derivati animali');

    // celiaco: niente glutine
    prof.dieta = ''; prof.celiaco = true;
    vis = w.fitmealsProva.visibili();
    vero(!vis.some(r => ha(r, 'pasta') || ha(r, 'pane') || ha(r, 'farina')),
      'a un celiaco e\' rimasto il glutine');
    vero(vis.some(r => ha(r, 'riso') || ha(r, 'patate')), 'a un celiaco riso e patate restano');
    prof.celiaco = false;

    // gravidanza: +300 kcal, mai deficit, niente alcol e crudi
    Object.assign(prof, { sex: 'f', age: 30, height: 168, weight: 62, goal: 'mant' });
    const prima = w.fitmealsProva.energia(prof).target;
    prof.incinta = true;
    eq(w.fitmealsProva.energia(prof).target, prima + 300, 'la gravidanza non alza di 300 kcal');
    prof.goal = 'cut';
    vero(w.fitmealsProva.energia(prof).target >= prima, 'in gravidanza il deficit deve sparire');
    vis = w.fitmealsProva.visibili();
    vero(!vis.some(r => ha(r, 'vino bianco') || ha(r, 'prosciutto crudo') || ha(r, 'gorgonzola')),
      'in gravidanza alcol o crudi rimasti');
    vero(!vis.some(r => /carpaccio|tartare|poke/i.test(r.title)), 'in gravidanza un piatto crudo e\' rimasto');

    // il chip incinta compare solo per le donne
    prof.sex = 'm';
    w.fitmealsProva.renderProfilo();
    vero(a.d.getElementById('chip-incinta').hidden, 'il chip incinta compare a un uomo');
    prof.sex = 'f';
    w.fitmealsProva.renderProfilo();
    vero(!a.d.getElementById('chip-incinta').hidden, 'il chip incinta non compare a una donna');
  });

  await test('seleziona tutto spunta la lista e i pezzi si chiamano unita', async () => {
    const a = await app();
    a.tab('view-fridge');

    // tre voci in lista: due a peso e una a pezzi
    a.dom.window.fitmealsVoce.daTesto('due litri di latte, pane, tre uova');
    a.click('[data-act=detta-salva]');
    await wait(100);

    // l'etichetta dei pezzi a schermo e' "un.", mai "pz"
    vero(!/\bpz\b/.test(a.d.getElementById('shopping-body').textContent), 'in lista compare ancora pz');
    a.dom.window.fitmealsVoce.daTesto('tre uova');
    const unita = [...a.d.querySelectorAll('.det-u')].map(b => b.textContent.trim());
    vero(unita.includes('un.') && !unita.includes('pz'),
      'il bottone unita del riepilogo non dice un. (' + unita.join(',') + ')');
    a.click('[data-act=detta-chiudi]');
    await wait(400);

    // seleziona tutto: ogni voce risulta presa
    vero(a.click('[data-act=shop-tutti]'), 'manca il tasto seleziona tutto');
    await wait(100);
    const dopo = a.d.querySelectorAll('#shopping-body .shop-item:not(.done)').length;
    eq(dopo, 0, 'dopo seleziona tutto restano voci non spuntate');

    // ritoccarlo toglie tutte le spunte
    a.click('[data-act=shop-tutti]');
    await wait(100);
    const riaperte = a.d.querySelectorAll('#shopping-body .shop-item.done').length;
    eq(riaperte, 0, 'il secondo tocco non toglie le spunte');
  });

  await test('il pasto segue la pagina da cui apri il piatto, non l\'orologio', async () => {
    const a = await app();
    const w = a.dom.window, P = w.fitmealsProva;

    // stesso istante, tre pagine diverse: tre pasti diversi
    ['col', 'pra', 'cen'].forEach((m, i) => {
      P.pastoContesto(m);
      const r = a.stato().recipes[10 + i];
      P.logMeal(r.id);
      const log = a.stato().log.slice(-1)[0];
      eq(log.meal, m, 'aperto dalla pagina ' + m + ', registrato in');
    });

    // un pasto esplicito vince su tutto
    P.pastoContesto('col');
    P.logMeal(a.stato().recipes[20].id, 'cen');
    eq(a.stato().log.slice(-1)[0].meal, 'cen', 'il pasto esplicito non ha vinto');

    // senza contesto si torna all'orologio, e deve essere un pasto vero
    P.pastoContesto(null);
    P.logMeal(a.stato().recipes[21].id);
    const ultimo = a.stato().log.slice(-1)[0].meal;
    vero(a.stato().meals.some(m => m.id === ultimo), 'senza contesto il pasto non e\' valido');
  });

  await test('quello che consumi sparisce da frigo, calendario e notifiche', async () => {
    const a = await app();
    const w = a.dom.window, P = w.fitmealsProva;

    // pollo in frigo, in scadenza a mezzogiorno di oggi
    const mezzogiorno = new Date(); mezzogiorno.setHours(12, 0, 0, 0);
    P.freschezza()['pollo'] = { nome: 'pollo', qta: 100, unita: 'g',
      dal: Date.now() - 86400000, entro: mezzogiorno.getTime(), posto: 'frigo' };
    P.notifiche();

    vero(P.scadenze().some(v => v.nome === 'pollo'), 'il pollo non e\' in calendario');
    vero(a.stato().notifiche.some(n => n.nome === 'pollo'), 'manca la notifica di scadenza');

    // lo mangio tutto
    const r = a.stato().recipes.find(x => (x.ing || []).some(i => i.n === 'pollo'));
    P.logMeal(r.id, 'pra');

    vero(!P.freschezza()['pollo'], 'il pollo finito e\' rimasto in frigo');
    vero(!P.scadenze().some(v => v.nome === 'pollo'), 'il pollo finito e\' rimasto in calendario');
    vero(!P.inventario().some(v => v.nome === 'pollo'), 'il pollo finito e\' rimasto in inventario');
    vero(!a.stato().notifiche.some(n => n.nome === 'pollo'),
      'la notifica continua a suonare per una cosa consumata');

    // il badge della campanella non si vede quando non c'e' niente
    const badge = a.d.getElementById('campanella-conto');
    vero(badge.hidden, 'il badge resta acceso senza notifiche');
  });

  await test('gli elenchi di ingredienti si aprono solo col loro tasto', async () => {
    const a = await app();
    a.tab('view-profile');

    const miei = a.d.getElementById('my-ingredients-tags');
    const esclusi = a.d.getElementById('blacklist-tags');
    vero(miei.hidden && esclusi.hidden, 'gli elenchi sono aperti senza averli chiesti');

    a.click('[data-act=mostra-tag][data-val=miei]');
    vero(!a.d.getElementById('my-ingredients-tags').hidden, 'il tasto non apre i miei ingredienti');
    vero(a.d.getElementById('blacklist-tags').hidden, 'si e\' aperto anche l\'altro elenco');

    a.click('[data-act=mostra-tag][data-val=miei]');
    vero(a.d.getElementById('my-ingredients-tags').hidden, 'il tasto non richiude l\'elenco');
  });

  await test('senza profilo la home spiega la bilancia invece di restare vuota', async () => {
    const a = await app();          // installazione nuova: niente eta', altezza, peso
    const box = a.d.getElementById('anello-unico');

    vero(box.innerHTML.trim().length > 0, 'la home resta muta senza profilo');
    vero(box.querySelector('.invito-bilancia'), 'manca l\'invito a compilare i dati');
    vero(!box.querySelector('.bilancia'), 'la bilancia si disegna senza dati da pesare');
    const vai = box.querySelector('.invito-bilancia');
    eq(vai.dataset.act, 'tab', 'l\'invito non porta da nessuna parte');
    eq(vai.dataset.val, 'view-profile', 'l\'invito non porta al profilo');

    // compilati i dati, al posto dell'invito arriva la bilancia vera
    a.profiloBase();
    await wait(200);
    const dopo = a.d.getElementById('anello-unico');
    vero(!dopo.querySelector('.invito-bilancia'), 'l\'invito resta anche col profilo pieno');
    vero(dopo.querySelector('.bilancia'), 'col profilo pieno la bilancia non compare');
  });

  await test('la bilancia si muove quando registri un pasto', async () => {
    const a = await app();
    a.profiloBase();
    await wait(200);

    const box = a.d.getElementById('anello-unico');
    vero(box.querySelector('.bilancia-live'), 'senza bilancia non c\'e\' niente da animare');
    vero(!box.querySelector('.mealup-scale-svg.oscilla'), 'la bilancia oscilla gia\' prima del pasto');

    a.dom.window.fitmealsProva.logMeal(a.stato().recipes[8].id, 'pra');

    vero(box.querySelector('.mealup-scale-svg.oscilla'), 'la bilancia non reagisce dopo il pasto');
    almeno(Number(box.querySelector('.bilancia-live').dataset.valore), 1,
      'il valore non cambia dopo il pasto');
  });

  await test('lo scontrino accetta anche il virtuale: scelta, testo incollato, correzioni', async () => {
    const a = await app();
    a.tab('view-fridge');

    // il tasto apre la scelta, con la via del PDF e quella del testo
    a.click('[data-act=scontrino-apri]');
    await wait(100);
    vero(!a.d.getElementById('dettatura-scan-scegli').hidden, 'la scelta non compare');
    vero(a.d.querySelector('[data-act=scan-virtuale]'), 'manca la via del PDF');
    vero(a.d.getElementById('scontrino-virtuale'), 'manca il campo file del virtuale');
    vero((a.d.getElementById('scontrino-virtuale').accept || '').includes('pdf'),
      'il campo virtuale non accetta i PDF');

    // il testo incollato passa dalle stesse righe modificabili della foto
    a.click('[data-act=scan-incolla]');
    await wait(100);
    vero(!a.d.getElementById('dettatura-scan-testo').hidden, 'il riquadro per incollare non compare');
    a.d.getElementById('scan-testo-campo').value =
      'ORDINE N. 12345\nLATTE INTERO 1L  1,49\nGNAPPOLE SFRIGOLATE 3,00\nTOTALE 4,49';
    a.click('[data-act=scan-leggi-testo]');
    await wait(100);

    const righe = [...a.d.querySelectorAll('.riga-dettata')];
    eq(righe.length, 1, 'attesa 1 riga dal testo incollato');
    vero(righe.some(r => r.classList.contains('incerta')), 'la riga non esatta non e\' da controllare');
    vero(!a.d.getElementById('dettatura-lista').textContent.includes('ORDINE'),
      'l\'intestazione dell\'ordine e\' rimasta fra i prodotti');
    vero(a.d.getElementById('dettatura-conto').textContent.includes('3 righe scartate'),
      'il conteggio degli scarti manca nel virtuale');

    // prima dell'ok si corregge: cambio nome e quantita', POI salvo
    const prima = righe[0].querySelector('.det-nome');
    prima.value = 'latte';
    righe[0].querySelector('.det-q').value = '2';
    a.click('[data-act=detta-salva]');
    await wait(100);
    const S = a.stato();
    const latte = S.shopExtra.find(x => x.n === 'latte');
    vero(latte, 'la correzione del nome non e\' arrivata al salvataggio');
    eq(latte.qta, 2000, 'la correzione della quantita\' non e\' arrivata al salvataggio');
  });

  await test('la quantita\' comprata si corregge in lista e vince su Fine spesa', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.dom.window.fitmealsVoce.daTesto('latte');
    a.click('[data-act=detta-salva]');
    await wait(100);

    // tocco la quantita' sulla riga, scrivo 700 g, salvo
    vero(a.click('.shop-item .qty'), 'la quantita\' in riga non si tocca');
    await wait(100);
    a.d.getElementById('shopqta-campo').value = '700';
    a.click('[data-act=shopqta-salva]');
    await wait(100);
    vero(a.testo('#shopping-body').includes('700 ml'), 'la correzione non si vede in lista');

    // chiudo la spesa: in freschezza entra la MIA quantita'
    a.click('[data-act=shop-tutti]');
    a.click('[data-act=shop-bought]');
    await wait(50);
    a.click('[data-act=conferma-si]');
    await wait(150);
    const f = a.stato().freschezza;
    eq(f['latte'] && f['latte'].qta, 700, 'in dispensa non e\' entrata la quantita\' corretta');
  });

  await test('la dettatura capisce l\'elenco anche senza virgole', async () => {
    const a = await app();
    const V = a.dom.window.fitmealsVoce;

    const righe = V.interpreta('pomodori mozzarella due litri di latte');
    eq(righe.length, 3, 'attese 3 voci dal dettato senza virgole');
    eq(righe[0].nome, 'pomodori', 'prima voce sbagliata');
    eq(righe[1].nome, 'mozzarella', 'seconda voce sbagliata');
    eq(righe[2].nome, 'latte', 'terza voce sbagliata');
    eq(righe[2].q, 2, 'la quantita\' del latte si e\' persa');

    // i nomi composti restano interi
    const composti = V.interpreta('petto di pollo passata di pomodoro basilico');
    eq(composti.length, 3, 'i nomi composti si sono spezzati');
    eq(composti[0].nome, 'petto di pollo', 'petto di pollo spezzato');

    // e il pasticcio singolo resta una voce sola, come prima
    const boh = V.interpreta('gnappole sfrigolate');
    eq(boh.length, 1, 'il pasticcio deve restare una voce');
    vero(!boh[0].sicuro, 'il pasticcio non deve dirsi sicuro');
  });

  await test('l\'etichetta nutrizionale entra fra gli ingredienti con i suoi numeri', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;

    // il parser pesca i quattro valori nel testo dell'OCR
    const letti = P.etichetta('Energia 1720 kJ / 411 kcal Grassi 9,5 g di cui saturi 1,2 g '
      + 'Carboidrati 68 g di cui zuccheri 3,1 g Proteine 12,5 g Sale 1,1 g');
    eq(letti.kcal, 411, 'kcal sbagliate');
    eq(letti.grassi, 9.5, 'grassi sbagliati');
    eq(letti.carboidrati, 68, 'carboidrati sbagliati');
    eq(letti.proteine, 12.5, 'proteine sbagliate');

    // dal modulo al salvataggio: tabella, dispensa e vocabolario
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.click('[data-act=etichetta-apri]');
    await wait(100);
    a.d.getElementById('eti-nome').value = 'crackers di segale';
    a.d.getElementById('eti-kcal').value = '411';
    a.d.getElementById('eti-pro').value = '12.5';
    a.d.getElementById('eti-carb').value = '68';
    a.d.getElementById('eti-gra').value = '9.5';
    a.click('[data-act=etichetta-salva]');
    await wait(150);

    const tab = P.tabella('crackers di segale');
    vero(tab && tab[0] === 411 && tab[1] === 12.5, 'la tabella non e\' stata salvata');
    vero(a.stato().freschezza['crackers di segale'], 'il prodotto non e\' in dispensa');
    vero(a.stato().pantry.includes('crackers di segale'), 'il prodotto non e\' nella credenza');
  });

  await test('la dispensa si detta come la spesa, anche senza virgole', async () => {
    const a = await app();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    vero(a.d.querySelector('[data-fsez=dispensa] [data-act=detta-apri][data-val=dispensa]'),
      'manca il tasto Detta nella dispensa');

    // elenco lungo, dettato di fila senza virgole, verso la DISPENSA
    a.dom.window.fitmealsVoce.daTesto(
      'due chili di patate cipolla passata di pomodoro un pacco di riso', 'dispensa');
    await wait(100);
    eq(a.d.getElementById('dettatura-titolo').textContent, 'Riempi la dispensa',
      'il modale non dice dove va');
    eq(a.d.getElementById('detta-salva-btn').textContent.trim(), 'Metti in dispensa',
      'il bottone non dice dove va');
    const righe = [...a.d.querySelectorAll('.riga-dettata')];
    eq(righe.length, 4, 'attese 4 voci dal dettato senza virgole');

    a.click('[data-act=detta-salva]');
    await wait(150);
    const f = a.stato().freschezza;
    eq(f['patate'] && f['patate'].qta, 2000, 'i due chili di patate non sono in dispensa');
    vero(f['passata di pomodoro'], 'la passata non e\' in dispensa');
    vero(f['patate'].posto === 'dispensa', 'le patate non stanno nella credenza');
    vero(a.stato().pantry.includes('cipolla'), 'la cipolla non e\' nella credenza');
    eq((a.stato().shopExtra || []).length, 0, 'la dettatura in dispensa ha sporcato la spesa');

    // e la dettatura della spesa e' rimasta quella di sempre
    a.dom.window.fitmealsVoce.daTesto('pane, latte');
    await wait(100);
    eq(a.d.getElementById('detta-salva-btn').textContent.trim(), 'Aggiungi alla spesa',
      'la spesa ha perso il suo bottone');
    a.click('[data-act=detta-salva]');
    await wait(100);
    eq(a.stato().shopExtra.length, 2, 'la spesa dettata non funziona piu\'');
  });

  await test('dalla lista si legge l\'etichetta: valori subito, dispensa a fine spesa', async () => {
    const a = await app();
    a.tab('view-fridge');

    // un prodotto sconosciuto in lista: sulle righe con virgola i confini valgono
    a.dom.window.fitmealsVoce.daTesto('latte, crackers di farro selvaggio');
    a.click('[data-act=detta-salva]');
    await wait(100);
    // il codice a barre ora sta su OGNI riga: colorato dove il giudizio
    // esiste (latte), neutro dove l'etichetta non e' mai stata letta
    const tutte = [...a.d.querySelectorAll('.shop-item')];
    vero(tutte.every(r => r.querySelector('.shop-eti')), 'una riga e\' senza codice a barre');
    const conEti = tutte.filter(r => r.textContent.includes('crackers di farro selvaggio'));
    eq(conEti.length, 1, 'il prodotto con virgole si e\' rispezzato');
    vero(!(conEti[0].querySelector('.shop-eti').getAttribute('style') || '').includes('color'),
      'il prodotto mai letto non deve avere colore');

    // dall'icona al modulo, gia' col nome giusto
    conEti[0].querySelector('.shop-eti').dispatchEvent(
      new a.dom.window.MouseEvent('click', { bubbles: true }));
    await wait(100);
    eq(a.d.getElementById('eti-nome').value, 'crackers di farro selvaggio',
      'il nome non si precompila');
    a.d.getElementById('eti-kcal').value = '390';
    a.d.getElementById('eti-pro').value = '13';
    a.click('[data-act=etichetta-salva]');
    await wait(150);

    // i valori sono nel sistema, ma in dispensa NON c'e' ancora niente
    const P = a.dom.window.fitmealsProva;
    vero(P.tabella('crackers di farro selvaggio'), 'i valori non sono entrati nel sistema');
    vero(!a.stato().freschezza['crackers di farro selvaggio'],
      'il prodotto e\' entrato in dispensa prima di Fine spesa');
    vero((a.d.querySelector('.shop-eti[data-val="crackers di farro selvaggio"]').getAttribute('style') || '')
      .includes('color'), 'dopo la lettura il barre deve colorarsi del giudizio');

    // a fine spesa entra in dispensa, coi numeri gia' suoi
    a.click('[data-act=shop-tutti]');
    a.click('[data-act=shop-bought]');
    await wait(50);
    a.click('[data-act=conferma-si]');
    await wait(150);
    vero(a.stato().freschezza['crackers di farro selvaggio'], 'a fine spesa non e\' in dispensa');

    // la campanella e il + vivono nella stessa riga dell'header
    vero(a.d.querySelector('.header .testa-tasti .campanella') &&
         a.d.querySelector('.header .testa-tasti .icon-btn'),
      'campanella e + non stanno insieme nell\'header');
  });

  await test('i dolci ci sono, fit e fat, e si comportano da ricette vere', async () => {
    const a = await app();
    const dolci = a.stato().recipes.filter(r => r.portata === 'dolce');
    almeno(dolci.length, 20, 'dolci nel ricettario');

    const fit = dolci.filter(r => (r.tags || []).includes('fit'));
    const fat = dolci.filter(r => (r.tags || []).includes('fat'));
    almeno(fit.length, 8, 'dolci fit');
    almeno(fat.length, 8, 'dolci fat');
    vero(fat.every(r => r.cat === 'sgarro'), 'un dolce fat non si dichiara sgarro');
    vero(fit.every(r => r.cat !== 'sgarro'), 'un dolce fit si dichiara sgarro');

    // ogni dolce ha tutto quello che l'app si aspetta da una ricetta
    dolci.forEach(r => {
      vero(r.kcal > 0 && r.ing.length && r.steps.length >= 2, r.title + ' incompleta');
      r.ing.forEach(i => vero(i.n && i.q > 0, r.title + ': ingrediente rotto'));
    });

    // le porzioni delle torte tornano: una fetta di tiramisu' non fa 2500 kcal
    const tir = dolci.find(r => r.id === 'do11');
    const porz = a.dom.window.fitmealsProva ? null : null;
    vero(tir.serves >= 6, 'il tiramisu non dichiara le porzioni');

    // la ricerca li trova per come li chiami
    a.cerca('dolci fat');
    await wait(150);
    vero(a.conta('#recipe-list .card-btn') >= 8, 'cercando "dolci fat" non escono');
    a.cerca('tiramisu');
    await wait(150);
    almeno(a.conta('#recipe-list .card-btn'), 1, 'il tiramisu non si trova');
  });

  await test('la nuova infornata di ricette fit \u00e8 completa e si trova', async () => {
    const a = await app();
    const rec = a.stato().recipes;

    // le venti nuove ci sono tutte, sane, su piu' portate
    const nuove = rec.filter(r => /^ft\d\d$/.test(r.id));
    eq(nuove.length, 20, 'attese 20 ricette ft');
    vero(nuove.every(r => r.cat === 'sano'), 'una ricetta fit non si dichiara sana');
    vero(nuove.every(r => (r.tags || []).includes('fit')), 'una ricetta fit senza il tag fit');
    const portate = new Set(nuove.map(r => r.portata));
    almeno(portate.size, 5, 'portate coperte dalle nuove fit');

    // complete come le altre: macro, ingredienti veri, passaggi
    nuove.forEach(r => {
      vero(r.kcal > 0 && r.pro >= 0 && r.ing.length >= 3 && r.steps.length >= 3, r.id + ' incompleta');
      r.ing.forEach(i => vero(i.n && i.q > 0, r.id + ': ingrediente rotto'));
    });

    // e il ricettario complessivo resta a maggioranza sana
    almeno(rec.filter(r => r.cat === 'sano').length, 230, 'ricette sane totali');

    a.cerca('buddha bowl');
    await wait(150);
    almeno(a.conta('#recipe-list .card-btn'), 1, 'la buddha bowl non si trova');
  });

  await test('piatti semplici, contorni, torte salate e fit col nome ci sono', async () => {
    const a = await app();
    const rec = a.stato().recipes;

    // le quindici nuove, complete come le altre
    const nuove = rec.filter(r => /^sp\d\d$/.test(r.id));
    eq(nuove.length, 15, 'attese 15 ricette sp');
    nuove.forEach(r => {
      vero(r.kcal > 0 && r.ing.length >= 3 && r.steps.length >= 3, r.id + ' incompleta');
      r.ing.forEach(i => vero(i.n && i.q > 0, r.id + ': ingrediente rotto'));
    });

    // i piatti semplici in bianco
    vero(rec.some(r => r.title === 'Pasta in bianco'), 'manca la pasta in bianco');
    vero(rec.some(r => r.title === 'Riso basmati in bianco'), 'manca il riso basmati');
    vero(rec.some(r => r.title === 'Pastina in brodo'), 'manca la pastina in brodo');

    // i contorni di patate, nella portata giusta
    const fritte = rec.find(r => r.title === 'Patatine fritte');
    const rosti = rec.find(r => /rosti di patate/i.test(r.title));
    vero(fritte && fritte.portata === 'contorno', 'le patatine fritte non sono un contorno');
    vero(rosti && rosti.portata === 'contorno', 'il rosti non e\' un contorno');

    // le torte salate si tagliano a fette (serves) e i valori sono per l'intera
    const torte = nuove.filter(r => /torta salata/i.test(r.title));
    eq(torte.length, 2, 'attese 2 torte salate nuove');
    torte.forEach(t => vero(Number(t.serves) >= 6, t.title + ' senza fette'));

    // le fit si trovano scrivendo "fit": il nome lo contiene davvero
    const fitNome = nuove.filter(r => /fit/i.test(r.title));
    almeno(fitNome.length, 8, 'ricette con la dicitura fit nel nome');
    vero(fitNome.every(r => r.cat === 'sano' && (r.tags || []).includes('proteico')),
      'una fit col nome non e\' sana e proteica');
    vero(fitNome.every(r => r.pro >= 20), 'una fit col nome ha poche proteine');
    a.cerca('fit');
    await wait(150);
    almeno(a.conta('#recipe-list .card-btn'), 8, 'cercando fit non escono le ricette fit');

    // e chi ha gia' l'app installata le riceve col cambio di versione
    const b = await app({ storage: { seedVersion: 13, compatto: 1, recipes: [],
      profiles: [{ id: 'u1', name: 'G' }] } });
    vero(b.stato().recipes.some(r => r.id === 'sp01'),
      'una vecchia installazione non riceve le ricette nuove');
  });

  await test('il lettore dell\'etichetta perdona l\'OCR sporco', async () => {
    const a = await app();
    const E = a.dom.window.fitmealsProva.etichetta;

    // le storpiature classiche dell'OCR: la elle per la i, righe spezzate
    const sporco = E('VALORl NUTRlZlONALl per 100 g\nEnergla 1046 kJ / 250 kcal\n'
      + 'Grassl 9,1 g\ndl cul acldl grassl saturl 5,4 g\nCarboldratl 30 g\n'
      + 'dl cul zuccherl 21 g\nProtelne 7,5 g\nSale 0,25 g');
    eq(sporco.trovati, 4, 'il testo sporco non si legge tutto');
    eq(sporco.grassi, 9.1, 'i saturi hanno rubato i grassi');
    eq(sporco.saturi, 5.4, 'i saturi non si leggono');
    eq(sporco.zuccheri, 21, 'gli zuccheri non si leggono');

    // solo kJ: si convertono in kcal
    eq(E('Energia 1046 kJ\nGrassi 9 g\nCarboidrati 30 g\nProteine 7,5 g').kcal, 250,
      'i kJ non diventano kcal');

    // il sodio, se manca il sale, diventa sale per legge (x 2,5)
    eq(E('Energia 380 kcal Grassi 12 g Carboidrati 55 g Proteine 11 g Sodio 0,4 g').sale, 1,
      'il sodio non diventa sale');

    // due colonne: vince quella dei 100 g, che viene prima
    eq(E('Energia 411 kcal 123 kcal\nGrassi 9,5 g 2,9 g\nProteine 12,5 g 3,8 g').grassi, 9.5,
      'ha preso la colonna della porzione');

    // un valore impossibile e' un errore di lettura, non un alimento
    const assurdo = E('Energia 4110 kcal Grassi 950 g Carboidrati 68 g Proteine 12,5 g');
    vero(assurdo.kcal === null && assurdo.grassi === null, 'i valori assurdi passano');

    // e se la foto non da' niente, ci sono i consigli per riprovare
    vero(a.d.getElementById('etichetta-consigli'), 'manca il blocco dei consigli');
    vero(a.d.querySelector('#etichetta-consigli [data-act=etichetta-scatta]'),
      'dai consigli non si rifa la foto');
  });

  await test('la g letta come 9 non sporca i numeri, e i kJ correggono le kcal', async () => {
    const a = await app();
    const E = a.dom.window.fitmealsProva.etichetta;

    // la confusione piu' comune sulle foto vere: la "g" dell'unita' letta
    // come "9" e incollata al numero ("1,2 g" -> "1,29", "68 g" -> "689")
    const incollato = E('Energia 1720 kJ / 41 kcal\nGrassi 9,59\ndi cui saturi 1,29\n'
      + 'Carboidrati 689\ndi cui zuccheri 3,19\nFibre 5,69\nProteine 12,59\nSale 1,19');
    eq(incollato.grassi, 9.5, 'la g dei grassi resta attaccata');
    eq(incollato.saturi, 1.2, 'la g dei saturi resta attaccata');
    eq(incollato.carboidrati, 68, 'la g dei carboidrati resta attaccata');
    eq(incollato.zuccheri, 3.1, 'la g degli zuccheri resta attaccata');
    eq(incollato.fibre, 5.6, 'la g delle fibre resta attaccata');
    eq(incollato.proteine, 12.5, 'la g delle proteine resta attaccata');
    eq(incollato.sale, 1.1, 'la g del sale resta attaccata');
    // le kcal lette male (41) non tornano coi kJ (1720): vince la conversione
    eq(incollato.kcal, 411, 'i kJ non correggono le kcal storte');

    // ma quando la g arriva davvero come unita', i decimali veri non si toccano
    eq(E('Energia 411 kcal Sale 1,19 g Grassi 9 g Carboidrati 68 g Proteine 12 g').sale, 1.19,
      'un valore vero a due decimali e\' stato amputato');

    // le abbreviazioni stampate sulle etichette si riconoscono come le parole intere
    const abbrev = E('Valore energ. 1720 kJ / 411 kcal\nGrassi tot. 9,5 g\ndi cui sat. 1,2 g\n'
      + 'Carboidr. 68 g\ndi cui zucch. 3,1 g\nFibr. 5,6 g\nProt. 12,5 g\nSale 1,1 g');
    eq(abbrev.trovati, 4, 'le abbreviazioni non si leggono tutte');
    eq(abbrev.kcal, 411, 'valore energ. non e\' l\'energia');
    eq(abbrev.grassi, 9.5, 'grassi tot. non sono i grassi');
    eq(abbrev.saturi, 1.2, 'sat. non sono i saturi');
    eq(abbrev.carboidrati, 68, 'carboidr. non sono i carboidrati');
    eq(abbrev.zuccheri, 3.1, 'zucch. non sono gli zuccheri');
    eq(abbrev.fibre, 5.6, 'fibr. non sono le fibre');
    eq(abbrev.proteine, 12.5, 'prot. non sono le proteine');
    // e la variante corta di carboidrati usata sugli sportivi
    eq(E('Energia 380 kcal Carb. 55 g Prot. 30 g Grassi 5 g').carboidrati, 55,
      'carb. non sono i carboidrati');

    // il kJ che ha perso l'unita' per strada conferma o corregge le kcal
    eq(E('Energia 1515 357kcal Grassi 1,7 g Carboidrati 69 g Proteine 15 g').kcal, 357,
      'le kcal coerenti col kJ senza unita\' non vengono tenute');
    eq(E('Energia 1515 57kcal Grassi 1,7 g Carboidrati 69 g Proteine 15 g').kcal, 362,
      'le kcal storte non vengono corrette dal kJ senza unita\'');
    // la parola Energia illeggibile non serve: bastano le unita' kcal/kJ
    eq(E('Xyzabc 1720 kJ / 411 kcal\nGrassi 9 g Carboidrati 68 g Proteine 12 g').kcal, 411,
      'la riga dell\'energia senza la parola Energia si perde');
    // un numero pescato fra tanti senza unita' non diventa kcal a caso
    vero(E('Energia 800 090342 12 175\nGrassi 9 g').kcal === null,
      'un numero a caso e\' diventato kcal');

    // e due letture della stessa foto si completano, zero sospetto compreso
    const U = a.dom.window.fitmealsProva.etiUnisci;
    const unione = U(
      E('Energia 411 kcal Grassi 9,5 g Carboidrati 68 g Proteine 12,5 g di cui zuccheri 0 g'),
      E('di cui zuccheri 3,1 g di cui saturi 1,2 g Sale 1,1 g'));
    eq(unione.zuccheri, 3.1, 'lo zero sospetto non viene corretto');
    eq(unione.saturi, 1.2, 'il secondo passaggio non riempie i buchi');
    eq(unione.trovati, 4, 'il conteggio dopo l\'unione e\' sbagliato');
  });

  await test('la scala di salubrita\' va da sano a grasso e non mente', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;

    // coi valori completi il giudizio e' pieno, e ordina il mondo come deve
    const yogurt = P.salubrita({ kcal:57, proteine:10, grassi:0.4, saturi:0.2, zuccheri:4, fibre:0, sale:0.1 });
    const merendina = P.salubrita({ kcal:440, proteine:6.4, grassi:30, saturi:12, zuccheri:28, fibre:1, sale:0.4 });
    eq(yogurt.nome, 'sano', 'lo yogurt greco non e\' sano');
    vero(!yogurt.parziale, 'coi valori completi il giudizio non e\' pieno');
    eq(merendina.nome, 'grasso', 'la merendina non e\' grassa');

    // dalla tabella di serie (4 valori) si giudica lo stesso, ma parziale
    const burro = P.salubritaDi('burro');
    const spinaci = P.salubritaDi('spinaci');
    eq(burro.nome, 'grasso', 'il burro non e\' grasso');
    eq(spinaci.nome, 'sano', 'gli spinaci non sono sani');
    vero(burro.parziale && spinaci.parziale, 'il giudizio di serie deve dirsi parziale');

    // nel modulo dell'etichetta il giudizio si aggiorna DA SOLO scrivendo
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.click('[data-act=etichetta-apri]');
    await wait(100);
    vero(a.d.getElementById('eti-salute').hidden, 'il badge compare prima dei numeri');
    a.set('eti-kcal', '480'); a.set('eti-gra', '22'); a.set('eti-sat', '11'); a.set('eti-zuc', '24');
    vero(!a.d.getElementById('eti-salute').hidden, 'il badge non si accende scrivendo');
    vero(a.d.getElementById('eti-salute-nota').textContent.includes('parziale'),
      'coi campi vuoti il giudizio non si dice parziale');

    // al salvataggio i valori estesi restano, e con loro il giudizio
    a.d.getElementById('eti-nome').value = 'biscotti prova';
    a.click('[data-act=etichetta-salva]');
    await wait(150);
    const tab = P.tabella('biscotti prova');
    eq(tab.length, 8, 'la tabella estesa non si salva');
    eq(tab[4], 11, 'i saturi non si salvano');

    // e gli ingredienti dentro le ricette portano il pallino della scala
    a.apri('carbonara');
    await wait(150);
    almeno(a.d.querySelectorAll('#detail-body .salute-pallino').length, 3,
      'pallini della scala nel dettaglio');
  });

  await test('il voto su 100 pesa valori, additivi e bio, con la regola dura', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    const yogurt = { kcal:57, proteine:10, grassi:0.4, saturi:0.2, zuccheri:4, fibre:0, sale:0.1 };
    const merendina = { kcal:440, proteine:6.4, grassi:30, saturi:12, zuccheri:28, fibre:1, sale:0.4 };

    // il 60% nutrizionale ordina il mondo come il Nutri-Score
    const vY = P.voto(yogurt, { add: [], bio: false, confezionato: true });
    const vM = P.voto(merendina, { add: [], bio: false, confezionato: true });
    vero(vY.punteggio >= 75 && vY.nome === 'eccellente', 'lo yogurt non e\' eccellente: ' + vY.punteggio);
    vero(!vY.parziale, 'coi valori e gli additivi noti il voto si dice parziale');
    vero(vM.fascia >= 2, 'la merendina non puo\' stare sopra mediocre: ' + vM.punteggio);

    // il bio vale 10 punti esatti, come nell'originale
    const vBio = P.voto(yogurt, { add: [], bio: true, confezionato: true });
    eq(vBio.punteggio - vY.punteggio, 10, 'il bio non vale 10 punti');

    // un additivo innocuo non toglie niente; uno ad alto rischio azzera la
    // sua parte E mette il tetto a 49, qualunque siano i valori
    const vCitrico = P.voto(yogurt, { add: ['e330'], bio: false, confezionato: true });
    eq(vCitrico.punteggio, vY.punteggio, 'l\'acido citrico non doveva togliere punti');
    const vNitrito = P.voto(yogurt, { add: ['e330', 'e250'], bio: true, confezionato: true });
    vero(vNitrito.punteggio <= 49 && vNitrito.rischio === 3,
      'l\'additivo peggiore non comanda: ' + vNitrito.punteggio);

    // gli E-numeri si normalizzano come li scrive Open Food Facts, e un
    // codice mai visto si tratta con prudenza
    const lec = P.infoAdditivo('en:e322i');
    eq(lec.codice, 'E322', 'la variante e322i non torna alla famiglia');
    eq(lec.rischio, 0, 'le lecitine non sono senza rischio');
    eq(P.infoAdditivo('en:e9999').rischio, 1, 'l\'ignoto non si tratta con prudenza');

    // additivi mai letti su un prodotto confezionato: voto parziale, onesto
    const vSenza = P.voto(yogurt, { add: null, bio: false, confezionato: true });
    vero(vSenza.parziale && vSenza.mancanti.includes('additivi'),
      'la mancanza degli additivi non si dichiara');
    // su un ingrediente semplice invece non c\'entrano
    const vSpin = P.votoDi('spinaci');
    vero(vSpin && !vSpin.mancanti.includes('additivi'),
      'gli spinaci non devono lamentare additivi');

    // il JSON di Open Food Facts si legge con tutti i suoi buchi
    const off = P.prodottoDaOff({ status: 1, product: { code: '123',
      product_name: 'Nutella', brands: 'Ferrero, Altro',
      nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5,
        sugars_100g: 56.3, fat_100g: 30.9, 'saturated-fat_100g': 10.6, sodium_100g: 0.0428 },
      additives_tags: ['en:e322', 'en:e322i'], labels_tags: ['en:no-gluten'] } });
    eq(off.nome, 'nutella', 'il nome non arriva');
    eq(off.marca, 'Ferrero', 'la marca non si pulisce');
    eq(off.valori.kcal, 539, 'le kcal non arrivano');
    eq(off.valori.sale, 0.11, 'il sale non si ricava dal sodio');
    eq(off.add.join(','), 'e322,e322i', 'gli additivi non si normalizzano');
    vero(!off.bio, 'il bio non deve inventarsi');
    const offBio = P.prodottoDaOff({ status: 1, product: { product_name: 'Yogurt Bio',
      nutriments: { 'energy-kj_100g': 240 }, additives_tags: [], labels_tags: ['en:organic'] } });
    eq(offBio.valori.kcal, 57, 'le kcal non si ricavano dai kJ');
    vero(offBio.bio, 'il bio certificato non si riconosce');
    eq(P.prodottoDaOff({ status: 0 }), null, 'il prodotto mancante non torna null');
  });

  await test('il codice a barre trova il prodotto e il voto arriva da solo', async () => {
    const rispostaOff = { status: 1, product: { code: '3017620422003',
      product_name_it: 'Nutella', brands: 'Ferrero',
      nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5,
        sugars_100g: 56.3, fat_100g: 30.9, 'saturated-fat_100g': 10.6, salt_100g: 0.107 },
      additives_tags: ['en:e322'], labels_tags: [] } };
    const a = await app({ fetch: url => Promise.resolve({
      ok: true, json: () => Promise.resolve(rispostaOff) }) });
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.click('[data-act=etichetta-apri]');
    await wait(100);

    // il tasto del codice sta nel modulo etichetta, davanti a tutto
    const tasto = a.d.querySelector('#modal-etichetta [data-act=codice-apri]');
    vero(tasto, 'manca il tasto del codice a barre');
    tasto.click();
    await wait(100);
    vero(a.d.getElementById('modal-codice').classList.contains('active'),
      'il lettore non si apre');
    // senza camera (qui non c\'e\') resta la via manuale, spiegata con garbo
    vero(a.d.getElementById('codice-cifre'), 'manca la via manuale');

    // le cifre scritte a mano: si cerca il prodotto e si compila tutto
    a.set('codice-cifre', '3017620422003');
    a.click('[data-act=codice-cerca]');
    await wait(500);
    vero(!a.d.getElementById('modal-codice').classList.contains('active'),
      'il lettore non si chiude a codice trovato');
    eq(a.d.getElementById('eti-nome').value, 'nutella', 'il nome non si compila');
    eq(a.d.getElementById('eti-kcal').value, '539', 'le kcal non si compilano');
    eq(a.d.getElementById('eti-zuc').value, '56.3', 'gli zuccheri non si compilano');
    const extra = a.d.getElementById('eti-extra');
    vero(!extra.hidden && extra.textContent.includes('lecitine'),
      'gli additivi non si mostrano');
    vero(!a.d.getElementById('eti-salute').hidden
      && a.d.getElementById('eti-voto-num').textContent.includes('/100'),
      'il voto su 100 non compare');
    vero(a.d.getElementById('etichetta-passo').textContent.includes('Trovato'),
      'il passo non racconta cosa ha trovato');

    // al salvataggio additivi e bio restano col prodotto, e il voto li usa
    a.click('[data-act=etichetta-salva]');
    await wait(200);
    const P = a.dom.window.fitmealsProva;
    const info = P.prodottoInfoDi('nutella');
    vero(info && info.add.includes('e322'), 'le notizie del codice non si salvano');
    vero(a.salvato().prodottiInfo && a.salvato().prodottiInfo['nutella'],
      'le notizie non finiscono su disco');
    const v = P.votoDi('nutella');
    vero(v && v.rischio === 0 && !v.mancanti.includes('additivi'),
      'il voto non usa gli additivi salvati');

    // riaprendo il modulo, additivi e bio tornano da soli col resto
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.set('disp-cerca', 'nutella');
    a.click('[data-act=etichetta-apri]');
    await wait(100);
    vero(!a.d.getElementById('eti-extra').hidden
      && a.d.getElementById('eti-extra').textContent.includes('lecitine'),
      'gli additivi non si ripresentano dal catalogo');
    a.click('[data-act=etichetta-chiudi]');
    await wait(100);

    // senza rete: nessun voto inventato, un messaggio onesto e la via foto
    const b = await app({ fetch: () => Promise.reject(new Error('giu')) });
    b.tab('view-fridge');
    b.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    b.click('[data-act=etichetta-apri]');
    await wait(100);
    b.click('[data-act=codice-apri]');
    await wait(100);
    b.set('codice-cifre', '3017620422003');
    b.click('[data-act=codice-cerca]');
    await wait(300);
    vero(b.d.getElementById('etichetta-passo').textContent.includes('archivio'),
      'la mancanza di rete non si spiega');
    eq(b.d.getElementById('eti-kcal').value, '', 'senza rete niente numeri inventati');

    // e il prodotto fuori archivio si dice, senza fingere
    const c = await app({ fetch: () => Promise.resolve({
      ok: true, json: () => Promise.resolve({ status: 0 }) }) });
    c.tab('view-fridge');
    c.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    c.click('[data-act=etichetta-apri]');
    await wait(100);
    c.click('[data-act=codice-apri]');
    await wait(100);
    c.set('codice-cifre', '20000000');
    c.click('[data-act=codice-cerca]');
    await wait(300);
    vero(c.d.getElementById('etichetta-passo').textContent.includes('non è nell\'archivio'),
      'il prodotto sconosciuto non si spiega');
  });

  await test('additivi e bio viaggiano nel link di famiglia col resto della spesa', async () => {
    const a = await app();
    const b = await app();
    a.dom.window.fitmealsFamiglia.crea('Casa voto');
    const invito = await a.dom.window.fitmealsFamiglia.link(a.dom.window.fitmealsFamiglia.paccoInvito());
    await b.dom.window.fitmealsFamiglia.importa(invito.link);
    await wait(200);
    b.d.getElementById('toast').querySelector('button').click();
    await wait(200);

    // A legge un\'etichetta col codice: valori + additivi + bio
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.click('[data-act=etichetta-apri]');
    await wait(100);
    a.d.getElementById('eti-nome').value = 'wurstel di pollo';
    a.set('eti-kcal', '240'); a.set('eti-pro', '13'); a.set('eti-gra', '20');
    a.dom.window.fitmealsProva.prodottoRegistraInfo('wurstel di pollo',
      { add: ['e250'], bio: false, codice: '8000000000000' });
    a.click('[data-act=etichetta-salva]');
    await wait(200);

    const pacco = a.dom.window.fitmealsFamiglia.paccoSpesa();
    vero(pacco.info && pacco.info['wurstel di pollo']
      && pacco.info['wurstel di pollo'].add.includes('e250'),
      'gli additivi non salgono sul pacco');
    const linkSpesa = await a.dom.window.fitmealsFamiglia.link(pacco);
    await b.dom.window.fitmealsFamiglia.importa(linkSpesa.link);
    await wait(300);
    const vB = b.dom.window.fitmealsProva.votoDi('wurstel di pollo');
    vero(vB && vB.rischio === 3 && vB.punteggio <= 49,
      'il voto intero non arriva a casa dell\'altro');
  });

  await test('i prodotti si cercano in un posto solo, famiglia per famiglia', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;

    // il classificatore: una bevanda e' una bevanda, una salsa e' una salsa
    const f = n => P.famigliaDi(n).id;
    eq(f('coca cola'), 'bev', 'la cola non e\' una bevanda');
    eq(f('succo di pera'), 'bev', 'il succo non e\' una bevanda');
    eq(f('latte'), 'lat', 'il latte non e\' un latticino');
    eq(f('latte di mandorla'), 'bev', 'il latte vegetale non e\' una bevanda');
    eq(f('salsa di soia'), 'sal', 'la salsa di soia non e\' una salsa');
    eq(f('maionese'), 'sal', 'la maionese non e\' una salsa');
    eq(f('pesto alla genovese'), 'sal', 'il pesto non e\' una salsa');
    eq(f('mela'), 'fru', 'la mela non e\' frutta');
    eq(f('melanzane'), 'ver', 'le melanzane non sono verdura');
    eq(f('lievito di birra'), 'pan', 'il lievito di birra non sta col pane');
    eq(f('gnappole croccanti'), 'alt', 'l\'ignoto non finisce in Altro');

    // l'hub: si apre, cerca, filtra; i tuoi prodotti da fermi
    P.catalogoRegistra('coca cola', 'dispensa');
    P.catalogoRegistra('maionese', 'frigo');
    P.apriProdotti('');
    await wait(100);
    vero(a.d.getElementById('modal-catalogo').classList.contains('active'), 'i Prodotti non si aprono');
    vero(a.d.getElementById('cat-cerca'), 'manca la ricerca');
    eq(a.d.querySelectorAll('#catalogo-lista .catalogo-riga').length, 2,
      'da fermi si mostrano solo i tuoi prodotti');

    // il filtro famiglia: solo bevande, niente maionese ne' latte
    a.d.querySelector('#cat-famiglie [data-val=bev]').click();
    await wait(50);
    let nomi = [...a.d.querySelectorAll('#catalogo-lista .catalogo-nome span')].map(x => x.textContent.trim());
    vero(nomi.includes('coca cola'), 'la cola non compare fra le bevande');
    vero(!nomi.includes('maionese') && !nomi.includes('latte'),
      'fra le bevande c\'e\' altro che bevande');
    vero(nomi.every(n => P.famigliaDi(n).id === 'bev'), 'una riga non e\' una bevanda');

    // ritoccare il chip toglie il filtro
    a.d.querySelector('#cat-famiglie [data-val=bev]').click();
    await wait(50);
    eq(a.d.querySelectorAll('#catalogo-lista .catalogo-riga').length, 2,
      'il secondo tocco non toglie il filtro');

    // ricerca + famiglia insieme: "ma" fra le salse e' solo la maionese
    a.set('cat-cerca', 'ma');
    await wait(50);
    a.d.querySelector('#cat-famiglie [data-val=sal]').click();
    await wait(50);
    nomi = [...a.d.querySelectorAll('#catalogo-lista .catalogo-nome span')].map(x => x.textContent.trim());
    eq(nomi.join(','), 'maionese', 'la ricerca dentro la famiglia non stringe');

    // dalle righe si mette in casa e in lista, per le stesse strade di sempre
    a.set('cat-cerca', 'maionese');
    await wait(50);
    const riga = a.d.querySelector('#catalogo-lista .catalogo-riga');
    riga.querySelector('[data-act=cat-in-dispensa]').click();
    await wait(100);
    eq(P.freschezza()['maionese'] && P.freschezza()['maionese'].posto, 'frigo',
      'la maionese non va nel posto che il catalogo ricorda');
    a.d.querySelector('#catalogo-lista [data-act=cat-in-lista]').click();
    await wait(100);
    vero(a.stato().shopExtra.some(x => x.n === 'maionese'), 'la maionese non entra in lista');

    // un nome mai visto invita a leggergli codice o etichetta, senza vicoli ciechi
    a.set('cat-cerca', 'sbrodolino');
    await wait(50);
    const invito = a.d.querySelector('#catalogo-lista [data-act=etichetta-apri]');
    vero(invito, 'il prodotto nuovo non ha la sua porta');
    eq(invito.dataset.val, 'sbrodolino', 'il nome scritto non segue nell\'etichetta');

    // le porte verso l'unico posto: dai suggerimenti della dispensa...
    a.d.querySelector('#modal-catalogo [data-act=close-modal]').click();
    await wait(400);
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.set('disp-cerca', 'cola');
    await wait(50);
    const porta = a.d.querySelector('#disp-suggest [data-act=catalogo-apri]');
    vero(porta, 'manca la porta nei suggerimenti della dispensa');
    porta.click();
    await wait(100);
    eq(a.d.getElementById('cat-cerca').value, 'cola', 'quello che scrivevi non ti segue');
    vero([...a.d.querySelectorAll('#catalogo-lista .catalogo-nome span')]
      .some(x => x.textContent.trim() === 'coca cola'), 'la ricerca portata non trova');

    // ...e dalla vista spesa, col suo tasto grande
    a.d.querySelector('#modal-catalogo [data-act=close-modal]').click();
    await wait(400);
    a.tab('view-spesa');
    await wait(100);
    vero(a.d.querySelector('#view-spesa .modo-spesa[data-act=catalogo-apri]'),
      'manca il tasto Prodotti nella spesa');
  });

  await test('dallo scan del prodotto si va in lista, e a fine spesa in dispensa', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.click('[data-act=etichetta-apri]');
    await wait(100);

    // il modulo offre TUTTE e due le strade: dispensa subito, o lista
    vero(a.d.querySelector('#modal-etichetta [data-act=etichetta-salva]'), 'manca la via dispensa');
    vero(a.d.querySelector('#modal-etichetta [data-act=etichetta-lista]'), 'manca la via lista');

    a.d.getElementById('eti-nome').value = 'succo bio prova';
    a.set('eti-kcal', '45'); a.set('eti-zuc', '10');
    a.click('[data-act=etichetta-lista]');
    await wait(150);

    // in lista, coi valori gia' nel sistema; NON ancora in casa
    vero(a.stato().shopExtra.some(x => x.n === 'succo bio prova'), 'il prodotto non e\' in lista');
    vero(P.tabella('succo bio prova'), 'i valori non sono entrati nel sistema');
    vero(P.catalogoTrova('succo bio prova'), 'il catalogo non lo conosce');
    vero(!P.freschezza()['succo bio prova'], 'e\' finito in dispensa invece che in lista');

    // rifarlo non raddoppia la voce: aggiorna e basta
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.set('disp-cerca', 'succo bio prova');
    a.click('[data-act=etichetta-apri]');
    await wait(100);
    a.click('[data-act=etichetta-lista]');
    await wait(150);
    eq(a.stato().shopExtra.filter(x => x.n === 'succo bio prova').length, 1,
      'la seconda volta ha raddoppiato la voce');
    vero(a.testo('#toast').includes('era già in lista'), 'il doppione non viene spiegato');

    // a fine spesa arriva in dispensa per la strada di sempre
    a.tab('view-spesa');
    await wait(100);
    a.click('[data-act=shop-tutti]');
    a.click('[data-act=shop-bought]');
    await wait(50);
    a.click('[data-act=conferma-si]');
    await wait(150);
    vero(P.freschezza()['succo bio prova'], 'fine spesa non lo porta in casa');
  });

  // il registro di un prodotto vero via modulo etichetta, con la marca
  const registraMarca = async (a, nome, kcal, marca) => {
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(80);
    a.click('[data-act=etichetta-apri]:not([data-verso])');
    await wait(80);
    a.d.getElementById('eti-nome').value = nome;
    a.d.getElementById('eti-marca').value = marca || '';
    a.set('eti-kcal', String(kcal)); a.set('eti-pro', '8');
    a.set('eti-carb', '75'); a.set('eti-gra', '1');
    a.click('[data-act=etichetta-salva]');
    await wait(120);
  };

  await test('la marca si collega alla ricetta: dispensa prima, poi l\'ultima comprata', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;

    // due risi veri in memoria; li tolgo dalla dispensa per la prima prova
    await registraMarca(a, 'riso gran riserva', 350, 'Scotti');
    await wait(30);
    await registraMarca(a, 'riso classico', 356, 'Curtiriso');
    delete P.freschezza()['riso gran riserva'];
    delete P.freschezza()['riso classico'];

    // il campo Marca del modulo salva la marca senza codice a barre
    eq(P.prodottoInfoDi('riso gran riserva').marca, 'Scotti', 'la marca scritta non si salva');
    // e senza codice l\'onesta' resta: additivi mai letti, voto parziale
    vero(P.votoDi('riso gran riserva').mancanti.includes('additivi'),
      'la marca a mano non deve inventare gli additivi');

    // senza niente in casa comanda l\'ultima comprata
    const lista = P.prodottiPerIngrediente('riso');
    eq(lista.length, 2, 'i candidati per il riso non sono due');
    eq(lista[0].nome, 'riso classico', 'l\'ultima marca comprata non e\' la prima');
    eq((P.prodottoScelto('rX', 'riso') || {}).nome, 'riso classico',
      'il default non e\' l\'ultima comprata');

    // appena la Scotti entra in dispensa, comanda lei
    a.set('disp-cerca', 'riso gran riserva');
    a.d.getElementById('disp-qta').value = '1000';
    a.click('[data-act=disp-add]');
    await wait(100);
    const scelto = P.prodottoScelto('rX', 'riso');
    vero(scelto && scelto.nome === 'riso gran riserva' && scelto.inDispensa,
      'la dispensa non vince sull\'ultima comprata');

    // la tabella della marca vince sul generico; il generico resta il ripiego
    eq(P.tabellaScelta('rX', 'riso')[0], 350, 'la tabella della marca non comanda');
    eq(P.tabellaScelta('rX', 'spinaci')[0], P.tabella('spinaci')[0],
      'senza marche il generico deve restare');
    // e la grammatura delle ricette (nuove comprese) usa la marca da sola
    eq(P.valoriDaGrammatura([{ n: 'riso', q: 100, u: 'g' }]).kcal, 350,
      'la grammatura non si adatta alla marca in dispensa');

    // la famiglia fa da guardiano: il latte di mandorla non e\' "latte"
    await registraMarca(a, 'latte di mandorla', 24, 'AlproProva');
    vero(!P.prodottiPerIngrediente('latte').some(x => x.nome === 'latte di mandorla'),
      'il latte di mandorla si propone nelle ricette col latte');

    // il tocco gira: marca, altra marca, generico, e si ricomincia
    eq((P.marcaGira('rX', 'riso') || {}).nome, 'riso classico', 'il primo giro non cambia marca');
    eq(P.marcaGira('rX', 'riso'), null, 'dopo le marche non viene il generico');
    eq((P.prodottoScelto('rX', 'riso')), null, 'il generico voluto non resta');
    eq((P.marcaGira('rX', 'riso') || {}).nome, 'riso gran riserva', 'il giro non ricomincia');
    vero(a.salvato().marcheRicetta && a.salvato().marcheRicetta['rX'],
      'la scelta a mano non si salva su disco');

    // il badge nella ricetta: si vede, dice la marca, e si tocca
    const conRiso = a.stato().recipes.find(r => (r.ing || []).some(i => i.n === 'riso'));
    a.apri(conRiso.title.toLowerCase().slice(0, 12));
    await wait(150);
    const badge = a.d.querySelector('#detail-body .marca-chip');
    vero(badge, 'manca il badge della marca sull\'ingrediente');
    vero(/scotti/i.test(badge.textContent) && badge.classList.contains('in-casa'),
      'il badge non dice la marca in casa');
    badge.click();
    await wait(150);
    vero(/curtiriso/i.test((a.d.querySelector('#detail-body .marca-chip') || {}).textContent || ''),
      'il tocco sul badge non gira la marca');
  });

  await test('il pasto registrato resta com\'era: le modifiche valgono solo da domani', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    a.tab('view-profile'); a.profiloBase();
    await registraMarca(a, 'riso gran riserva', 350, 'Scotti');
    // scorta piena, cosi' il consumo si misura
    P.freschezza()['riso gran riserva'].qta = 1000;
    P.freschezza()['riso gran riserva'].unita = 'g';

    const conRiso = a.stato().recipes.find(r => (r.ing || [])
      .some(i => i.n === 'riso' && i.u === 'g' && Number(i.q) > 0));
    P.logMeal(conRiso.id, 'pra');
    await wait(100);

    const voce = a.stato().log[0];
    vero(voce.marche && voce.marche.riso && voce.marche.riso.p === 'riso gran riserva'
      && voce.marche.riso.m === 'Scotti', 'il pasto non ricorda la marca usata');
    const kcalAllora = voce.kcal;
    // il dosaggio e' sceso dalla scorta DELLA MARCA
    vero(P.freschezza()['riso gran riserva'].qta < 1000,
      'il consumo non scala dalla scorta della marca');

    // il mondo cambia: la marca gira, i valori del prodotto pure,
    // e la ricetta stessa viene modificata
    P.marcaGira(conRiso.id, 'riso');
    await registraMarca(a, 'riso gran riserva', 999, 'Scotti');
    a.apri(conRiso.title.toLowerCase().slice(0, 12));
    await wait(150);
    a.click('#detail-body [data-act=edit]');
    await wait(100);
    a.d.getElementById('f-kcal').value = String((Number(conRiso.kcal) || 400) + 111);
    a.d.getElementById('form-recipe').dispatchEvent(
      new a.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await wait(150);

    // il pasto di prima non si muove: e\' storia, non calcolo
    const dopo = a.stato().log[0];
    eq(dopo.kcal, kcalAllora, 'le kcal del pasto registrato sono cambiate');
    eq(dopo.marche.riso.p, 'riso gran riserva', 'la marca del pasto registrato e\' cambiata');
    eq(dopo.marche.riso.m, 'Scotti', 'la marca del pasto registrato si e\' persa');

    // e il riquadro del piatto lo dice, a chiare lettere
    a.tab('view-home');
    const pasto = a.stato().log[0].meal;
    a.d.querySelector('#anello-unico .gamba[data-val=' + pasto + ']').click();
    a.click('#pasto-piatti-body .scheda');
    await wait(150);
    const box = a.d.querySelector('.istanza-box');
    vero(box, 'manca il riquadro del piatto mangiato');
    vero(/Fatto allora con/i.test(box.textContent) && /Scotti/.test(box.textContent),
      'il piatto non racconta con cosa fu fatto');
  });

  await test('cercando la marca si trova tutto: prodotti, ricette e pasti fatti', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    a.tab('view-profile'); a.profiloBase();
    await registraMarca(a, 'riso gran riserva', 350, 'Scotti');
    const conRiso = a.stato().recipes.find(r => (r.ing || []).some(i => i.n === 'riso'));
    P.logMeal(conRiso.id, 'pra');
    await wait(100);

    // la barra di casa: scrivendo la marca escono i prodotti (con la marca
    // come etichetta), i pasti gia' fatti, e le ricette che la userebbero
    a.tab('view-home');
    a.set('search-input', 'scotti');
    await wait(400);
    const striscia = a.d.querySelector('.cerca-marca');
    vero(striscia, 'manca la striscia dei prodotti');
    vero(striscia.querySelector('.marca-cerca') &&
      /Scotti/.test(striscia.querySelector('.marca-cerca').textContent),
      'la marca non compare come etichetta');
    vero(/Già nel piatto/.test(striscia.textContent) &&
      striscia.textContent.includes(conRiso.title),
      'i pasti gia\' fatti non si trovano dalla marca');
    almeno(a.d.querySelectorAll('#recipe-list .scheda, #recipe-list .card-btn').length, 1,
      'le ricette col riso non escono cercando la marca');

    // la schermata Prodotti capisce la marca allo stesso modo (fra i
    // risultati c'e' anche chi ha "scotti" nel nome, tipo i biscotti:
    // conta che la riga della marca ci sia, con la sua etichetta)
    P.apriProdotti('scotti');
    await wait(100);
    const righe = [...a.d.querySelectorAll('#catalogo-lista .catalogo-nome')];
    const rigaMarca = righe.find(x => /riso gran riserva/.test(x.textContent));
    vero(rigaMarca && /Scotti/.test(rigaMarca.textContent),
      'la ricerca Prodotti non capisce la marca');

    // chi non ha quella marca non c\'entra
    vero(!P.prodottiCheCombaciano('scotti').some(x => x.nome === 'latte'),
      'la ricerca per marca trova cose d\'altre marche');
  });

  await test('a colazione niente bibite: fra le bevande restano solo i succhi', async () => {
    const a = await app();

    const col = a.dom.window.MealUpVisualData.suggestions('col').map(x => x.title.toLowerCase());
    vero(!col.some(x => /cola|aranciata/.test(x)), 'una bibita compare a colazione');
    vero(a.stato().recipes.some(x => /lattina di cola/i.test(x.title) && x.portata !== 'colazione'),
      'la cola non resta disponibile nel catalogo per gli altri pasti');
    vero(a.stato().recipes.some(x => /succo|spremuta/i.test(x.title)
      && x.portata === 'bevanda' && (x.tags || []).includes('colazione')),
      'i succhi sono spariti dalla colazione');
  });

  await test('la dispensa cerca solo in casa, e il mangiato si somma al pasto', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    const metti = (n, q) => {
      a.set('disp-cerca', n);
      a.d.getElementById('disp-qta').value = q;
      a.click('[data-act=disp-add]');
    };
    metti('latte', '500');
    metti('riso', '900');

    // quello che NON hai non viene suggerito: resta solo la porta Prodotti
    a.set('disp-cerca', 'tonno');
    await wait(50);
    vero(!a.d.querySelector('#disp-suggest [data-act=disp-scegli]'),
      'suggerisce cose che non possiedi');
    vero(a.d.querySelector('#disp-suggest [data-act=catalogo-apri]'),
      'manca la porta verso tutti i prodotti');

    // quello che hai si trova, ovunque stia: il latte dice "frigo"
    a.set('disp-cerca', 'lat');
    await wait(50);
    const chip = a.d.querySelector('#disp-suggest [data-act=disp-scegli]');
    vero(chip && /latte/.test(chip.textContent) && /frigo/.test(chip.textContent),
      'il latte in frigo non si trova col suo posto');
    const forchetta = a.d.querySelector('#disp-suggest [data-act=mangia-apri]');
    vero(forchetta, 'manca la forchetta del mangiato');

    // la forchetta chiede quanto e a che pasto, col conto vivo
    forchetta.click();
    await wait(100);
    vero(a.d.getElementById('modal-mangia').classList.contains('active'),
      'il mangiato non si apre');
    vero(/frigo/i.test(a.d.getElementById('mangia-sotto').textContent),
      'non dice dove sta la scorta');
    a.set('mangia-qta', '200');
    vero(/kcal/.test(a.d.getElementById('mangia-conto').textContent),
      'il conto vivo non si aggiorna');
    a.d.querySelector('#mangia-pasti [data-val=col]').click();
    a.click('[data-act=mangia-salva]');
    await wait(150);

    // nel diario: pasto giusto, kcal dalla tabella, grammi scritti
    const voce = a.stato().log[0];
    const tab = P.tabella('latte');
    eq(voce.meal, 'col', 'il pasto scelto non resta');
    eq(voce.kcal, Math.round(200 * tab[0] / 100), 'le kcal non seguono la tabella');
    eq(voce.grammi, 200, 'i grammi mangiati non si salvano');

    // la giornata lo somma, il frigo cala, e l\'Annulla ha la sua pezza
    const giorno = Object.values(a.stato().daily)[0];
    eq(giorno.k, voce.kcal, 'la giornata non somma il mangiato');
    eq(P.freschezza()['latte'].qta, 300, 'il frigo non cala di quanto mangiato');
    vero(voce.scalato && voce.scalato[0].k === 'latte',
      'manca la pezza d\'appoggio per l\'Annulla');

    // finirlo lo fa uscire di casa, come quando lo cucina una ricetta
    a.set('disp-cerca', 'lat');
    await wait(50);
    a.d.querySelector('#disp-suggest [data-act=mangia-apri]').click();
    await wait(100);
    a.set('mangia-qta', '300');
    a.click('[data-act=mangia-salva]');
    await wait(150);
    vero(!P.freschezza()['latte'], 'la scorta finita resta in giro');
  });

  await test('i liquidi si misurano in ml, cl e litri, dovunque si scrivano', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);

    // la rotella offre tutte le unita': g, kg, ml, cl, l, pz
    const b = a.d.getElementById('disp-unita');
    a.click('[data-act=disp-unita]');         // apre la rotella
    vero(!a.d.getElementById('rotella-velo').hidden, 'la rotella non si apre dalla dispensa');
    const giro = a.dom.window.fitmealsProva.rotellaUnita();
    ['g', 'kg', 'ml', 'cl', 'l', 'pz'].forEach(u =>
      vero(giro.includes(u), 'nella rotella manca ' + u));
    a.dom.window.fitmealsProva.rotellaScegli(null, 'g');

    // il latte e' un liquido: unita' proposta ml, e un litro e mezzo
    // entra in frigo come 1500 ml, mostrato "1.5 L"
    a.set('disp-cerca', 'latte');
    eq(b.textContent.trim(), 'ml', 'il latte non propone i millilitri');
    a.click('[data-act=disp-unita]');
    a.dom.window.fitmealsProva.rotellaScegli(1.5, 'l');
    a.click('[data-act=disp-add]');
    await wait(100);
    eq(P.freschezza()['latte'].qta, 1500, 'un litro e mezzo non fa 1500');
    eq(P.freschezza()['latte'].unita, 'ml', 'la scorta non si ricorda liquida');
    a.set('disp-cerca', 'lat');
    await wait(50);
    vero(/1\.5 L/.test(a.d.querySelector('#disp-suggest [data-act=disp-scegli]').textContent),
      'millecinquecento ml non si leggono come 1.5 L');

    // la dettatura capisce litri e centilitri, e la riga li mostra
    a.dom.window.fitmealsVoce.daTesto('due litri di latte e 50 cl di aranciata', 'dispensa');
    await wait(150);
    const unitaRighe = [...a.d.querySelectorAll('#dettatura-lista .det-u')].map(x => x.textContent.trim());
    vero(unitaRighe.includes('L') && unitaRighe.includes('cl'),
      'le righe dettate non parlano di litri e cl: ' + unitaRighe.join(','));
    a.click('[data-act=detta-salva]');
    await wait(150);
    eq(P.freschezza()['latte'].qta, 3500, 'i due litri dettati non si sommano');
    eq(P.freschezza()['aranciata'].qta, 500, 'i 50 cl non fanno 500 ml');

    // il mangiato di un liquido parla in ml, con le sue porzioni pronte
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.set('disp-cerca', 'lat');
    await wait(50);
    a.d.querySelector('#disp-suggest [data-act=mangia-apri]').click();
    await wait(100);
    eq(a.d.getElementById('mangia-unita').textContent, 'ml', 'il mangiato non parla in ml');
    vero([...a.d.querySelectorAll('#mangia-svelti .chip')].some(x => /330 ml/.test(x.textContent)),
      'mancano le porzioni da bicchiere e lattina');
    a.set('mangia-qta', '330');
    a.click('[data-act=mangia-salva]');
    await wait(150);
    eq(P.freschezza()['latte'].qta, 3170, 'i 330 ml non si scalano dal frigo');

    // le ricette accettano litri e centilitri nella grammatura
    const c = P.valoriDaGrammatura([{ n: 'latte', q: 1, u: 'l' }]);
    eq(c.peso, 1000, 'un litro in ricetta non pesa mille');

    // e in lista della spesa mezzo litro resta scritto da liquido
    a.tab('view-spesa');
    await wait(100);
    a.set('shop-add', 'succo di pera');
    const bs = a.d.getElementById('shop-unita');
    eq(bs.textContent.trim(), 'ml', 'il succo non propone i millilitri in lista');
    a.click('[data-act=shop-unita]');
    a.dom.window.fitmealsProva.rotellaScegli(50, 'cl');
    a.click('[data-act=shop-extra]');
    await wait(100);
    const voceL = a.stato().shopExtra.find(x => x.n === 'succo di pera');
    vero(voceL && voceL.qta === 500 && voceL.unita === 'ml' && voceL.qty === '500 ml',
      'i 50 cl in lista non diventano 500 ml');
  });

  await test('i link si aprono ovunque: app aperta, chat che spezzano, telefoni vecchi', async () => {
    const a = await app();
    a.dom.window.fitmealsFamiglia.crea('Casa link');
    const invito = await a.dom.window.fitmealsFamiglia.link(a.dom.window.fitmealsFamiglia.paccoInvito());

    // gli inviti (piccoli) restano in chiaro: si aprono su QUALUNQUE
    // telefono, anche vecchio, anche nel browser dentro una chat
    vero(invito.link.includes('#fm=j'), 'l\'invito piccolo non resta in chiaro');
    // un pacco grosso viaggia lo stesso (nel browser vero si comprime:
    // la compressione nativa qui nel banco di prova non c'e', e il
    // ripiego in chiaro e' proprio il comportamento giusto)
    const grosso = await a.dom.window.fitmealsFamiglia.link(
      { v: 1, tipo: 'spesa', prova: 'contenuto lungo '.repeat(200) });
    vero(grosso.link.includes('#fm='), 'il pacco grosso non fa il link');

    // app GIA' aperta: il link cambia solo il frammento (niente ricarica),
    // e il pacco va letto lo stesso — prima veniva ignorato in silenzio
    const b = await app();
    b.dom.window.location.hash = '#' + invito.link.split('#')[1];
    b.dom.window.dispatchEvent(new b.dom.window.HashChangeEvent('hashchange'));
    await wait(400);
    vero(b.testo('#toast').includes('invita nella famiglia'),
      'ad app gia\' aperta il link viene ignorato');
    b.d.getElementById('toast').querySelector('button').click();
    await wait(300);
    vero(b.dom.window.fitmealsFamiglia.stato(), 'l\'entrata dal link ad app aperta non va');

    // incollato con l'a-capo in mezzo (le chat spezzano i link lunghi)
    const c = await app();
    const spezzato = invito.link.slice(0, 60) + '\n ' + invito.link.slice(60);
    await c.dom.window.fitmealsFamiglia.importa(spezzato);
    await wait(300);
    vero(c.testo('#toast').includes('invita nella famiglia'),
      'il link con l\'a-capo dentro non si ricuce');

    // telefono vecchio (niente compressione): l'invito si apre lo stesso,
    // e i SUOI link nascono sempre in chiaro
    const d = await app({ senzaCompressione: true });
    await d.dom.window.fitmealsFamiglia.importa(invito.link);
    await wait(300);
    vero(d.testo('#toast').includes('invita nella famiglia'),
      'l\'invito in chiaro non si apre sul telefono vecchio');
    d.dom.window.fitmealsFamiglia.crea('Casa vecchia');
    const daVecchio = await d.dom.window.fitmealsFamiglia.link(
      d.dom.window.fitmealsFamiglia.paccoInvito());
    vero(daVecchio.link.includes('#fm=j'), 'il telefono vecchio non scrive in chiaro');

    // link troncato dalla chat: un messaggio onesto, mai dati rovinati
    const e2 = await app();
    await e2.dom.window.fitmealsFamiglia.importa(grosso.link.slice(0, Math.round(grosso.link.length * 0.7)));
    await wait(300);
    vero(/spezzato|non leggibile|non riesce/.test(e2.testo('#toast')),
      'il link troncato non viene spiegato con garbo');
    vero(!e2.dom.window.fitmealsFamiglia.stato(), 'il link rotto ha sporcato lo stato');

    // e una spesa arrivata dove la famiglia non c'e' spiega la strada
    // giusta (PWA e Safari hanno memorie separate, capita spesso su iPhone)
    const f = await app();
    a.tab('view-fridge');
    a.set('disp-cerca', 'pane');
    a.click('[data-act=disp-add]');
    const linkSpesa = await a.dom.window.fitmealsFamiglia.link(a.dom.window.fitmealsFamiglia.paccoSpesa());
    await f.dom.window.fitmealsFamiglia.importa(linkSpesa.link);
    await wait(300);
    vero(/app installata|incolla/i.test(f.testo('#toast')),
      'la spesa senza famiglia non spiega dove incollare il link');
  });

  await test('l\'aggiunta diretta in dispensa parla col catalogo come la spesa', async () => {
    const a = await app();
    const w = a.dom.window;
    const P = w.fitmealsProva;
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    const metti = nome => {
      a.set('disp-cerca', nome);
      a.click('[data-act=disp-add]');
    };

    // 1. prodotto sconosciuto: compare l'invito discreto, e non obbliga
    metti('crema di sesamo');
    const box = a.d.getElementById('invito-eti-dispensa');
    vero(!box.hidden && /etichetta/i.test(box.textContent), 'manca l\'invito discreto');
    a.click('#invito-eti-dispensa [data-act=invito-eti-no]');
    vero(box.hidden, 'l\'invito non si chiude con la crocetta');
    vero(a.stato().freschezza['crema di sesamo'], 'il prodotto non e\' entrato comunque');

    // 2. prodotto gia' noto: giudizio automatico, nessun invito, e il posto
    //    lo decide la stessa logica degli altri flussi (il latte va in frigo
    //    anche se lo aggiungi dalla barra della dispensa)
    metti('latte');
    eq(a.stato().freschezza['latte'].posto, 'frigo', 'il latte non e\' andato in frigo');
    vero(box.hidden, 'invito mostrato per un prodotto che ha gia\' i valori');
    vero(P.salubritaDi('latte'), 'il giudizio del latte non arriva da solo');

    // 3. la memoria del catalogo vince sulla regola generale
    P.catalogoRegistra('caffe in grani', 'freezer');
    metti('caffe in grani');
    eq(a.stato().freschezza['caffe in grani'].posto, 'freezer',
      'la memoria del catalogo non decide il posto');

    // 4. l'invito apre lo STESSO modulo etichetta; il salvataggio da'
    //    giudizio e catalogo per gli usi futuri, senza spostare la scorta
    metti('crema di sesamo');
    vero(!box.hidden, 'l\'invito non ricompare per il prodotto ancora senza giudizio');
    a.click('#invito-eti-dispensa [data-act=invito-eti-vai]');
    await wait(50);
    vero(a.d.getElementById('modal-etichetta').classList.contains('active'),
      'l\'invito non apre il modulo etichetta');
    eq(a.d.getElementById('eti-nome').value, 'crema di sesamo', 'il nome non arriva al modulo');
    a.d.getElementById('eti-kcal').value = '640';
    a.d.getElementById('eti-pro').value = '20';
    a.d.getElementById('eti-carb').value = '18';
    a.d.getElementById('eti-gra').value = '55';
    a.click('[data-act=etichetta-salva]');
    await wait(50);
    vero(P.salubritaDi('crema di sesamo'), 'il giudizio non e\' nato dalla lettura');
    vero(P.catalogoTrova('crema di sesamo'), 'il catalogo non ha imparato il prodotto');
    vero(a.stato().freschezza['crema di sesamo'], 'la scorta e\' sparita leggendo l\'etichetta');
    vero(box.hidden, 'l\'invito resta anche dopo la lettura');

    // 5. spostare a mano una scorta insegna al catalogo, come dagli altri punti
    a.click('[data-act=frigo-sez][data-val=frigo]');
    await wait(100);
    a.click('#frigo-body [data-act=fresco-posto][data-val=latte]');
    eq(P.catalogoTrova('latte').posto, 'dispensa',
      'il giro del posto non insegna al catalogo');
  });

  await test('il catalogo ricorda ogni ingrediente, anche dopo il consumo', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);

    // 1. prima lettura: valori + posto finiscono a catalogo
    a.click('[data-act=etichetta-apri]:not([data-verso])');
    await wait(100);
    a.d.getElementById('eti-nome').value = 'kefir alla fragola';
    a.d.getElementById('eti-kcal').value = '65';
    a.d.getElementById('eti-pro').value = '3.4';
    a.d.getElementById('eti-zuc').value = '8';
    a.click('[data-act=etichetta-salva]');
    await wait(150);
    const voce = P.catalogoTrova('kefir alla fragola');
    vero(voce && voce.posto === 'dispensa', 'la prima lettura non finisce a catalogo');

    // 2. consumato e rimosso: la voce a catalogo RESTA, coi suoi valori
    delete P.freschezza()['kefir alla fragola'];
    vero(!P.freschezza()['kefir alla fragola'], 'la scorta doveva sparire');
    vero(P.catalogoTrova('kefir alla fragola'), 'il consumo ha cancellato il catalogo');
    vero(P.tabella('kefir alla fragola'), 'il consumo ha cancellato i valori');

    // 3. il posto si corregge dalla schermata del catalogo
    P.renderCatalogo();
    a.dom.window.document.querySelector('[data-act=catalogo-posto][data-val="kefir alla fragola"]')
      || P.catalogoRegistra('kefir alla fragola');   // il modal non e' aperto: registro il giro a mano
    const prima = P.catalogoTrova('kefir alla fragola').posto;
    P.catalogoTrova('kefir alla fragola').posto = 'frigo';

    // 4. ricomprato dalla spesa: torna nel posto RICORDATO, coi valori suoi
    a.dom.window.fitmealsVoce.daTesto('kefir alla fragola');
    a.click('[data-act=detta-salva]');
    await wait(100);
    // il codice a barre sta su OGNI riga, colorato dal giudizio
    const eti = a.d.querySelector('.shop-item .shop-eti');
    vero(eti, 'manca il codice a barre sulla riga');
    vero((eti.getAttribute('style') || '').includes('color'), 'il barre non porta il colore del giudizio');
    a.click('[data-act=shop-tutti]');
    a.click('[data-act=shop-bought]');
    await wait(50);
    a.click('[data-act=conferma-si]');
    await wait(150);
    eq(P.freschezza()['kefir alla fragola'].posto, 'frigo',
      'il reinserimento non rispetta il posto ricordato');
    eq(P.salubritaDi('kefir alla fragola').nome, 'sano',
      'il giudizio non si riapplica da solo');

    // 5. riaprendo l'etichetta, i valori tornano da soli
    a.tab('view-fridge');
    a.click('[data-act=frigo-sez][data-val=dispensa]');
    await wait(100);
    a.set('disp-cerca', 'kefir alla fragola');
    a.click('[data-act=etichetta-apri]:not([data-verso])');
    await wait(100);
    eq(a.d.getElementById('eti-kcal').value, '65', 'il modulo non si precompila dal catalogo');
    vero(a.d.getElementById('etichetta-passo').textContent.includes('catalogo'),
      'il modulo non dice che il prodotto e\' gia\' noto');
  });

  await test('il riepilogo della spesa parla col catalogo, e le ricette col Nutri-Score', async () => {
    const a = await app();
    const P = a.dom.window.fitmealsProva;
    a.tab('view-fridge');

    // 1. nelle righe del riepilogo: giudizio noto colorato, ignoto invitato
    a.dom.window.fitmealsVoce.daTesto('latte, gnappole croccanti');
    await wait(100);
    const chips = [...a.d.querySelectorAll('.riga-dettata .det-eti')];
    eq(chips.length, 2, 'ogni riga del riepilogo deve avere il suo chip');
    vero((chips[0].getAttribute('style') || '').includes('color'),
      'il prodotto noto non mostra il suo giudizio');
    vero(!(chips[1].getAttribute('style') || '').includes('color'),
      'l\'ignoto deve avere solo l\'invito discreto');

    // 2. dal chip al modulo (stesso motore), e al salvataggio si TORNA alle righe
    chips[1].dispatchEvent(new a.dom.window.MouseEvent('click', { bubbles: true }));
    await wait(100);
    vero(a.d.getElementById('modal-etichetta').classList.contains('active'), 'il modulo non si apre');
    eq(a.d.getElementById('eti-nome').value, 'gnappole croccanti', 'il nome della riga non arriva');
    a.d.getElementById('eti-kcal').value = '520';
    a.d.getElementById('eti-gra').value = '28';
    a.click('[data-act=etichetta-salva]');
    await wait(150);
    vero(a.d.getElementById('modal-dettatura').classList.contains('active'),
      'dopo il salvataggio non si torna al riepilogo');
    eq([...a.d.querySelectorAll('.det-nome')].map(x => x.value).join(','),
      'latte,gnappole croccanti', 'le righe si sono perse al ritorno');
    vero((a.d.querySelectorAll('.riga-dettata .det-eti')[1].getAttribute('style') || '')
      .includes('color'), 'il chip non si aggiorna col giudizio nuovo');

    // 3. le scorte conservate portano il pallino
    a.click('[data-act=detta-chiudi]');
    await wait(100);
    P.catalogoRegistra('latte');
    a.dom.window.fitmealsProva.freschezza()['latte'] =
      { nome: 'latte', qta: 500, unita: 'g', dal: Date.now(), posto: 'frigo' };
    a.dom.window.fitmealsProva.renderProfilo(); // un render qualsiasi non basta: uso renderAll
    a.tab('view-fridge');
    await wait(100);

    // 4. le ricette si giudicano col Nutri-Score dentro il voto su 100
    const R = a.stato().recipes;
    const g = t => { const r = R.find(x => x.title.toLowerCase().includes(t));
      const s = P.salubritaRicetta(r); return s ? s.nome : null; };
    eq(g('carbonara'), 'da limitare', 'la carbonara non e\' da limitare');
    vero(['sano', 'equilibrato'].includes(g('insalata di farro')),
      'l\'insalata di farro deve stare nella parte sana della scala');
    const vCarb = P.votoRicetta(R.find(x => x.title.toLowerCase().includes('carbonara')));
    const vFarro = P.votoRicetta(R.find(x => x.title.toLowerCase().includes('insalata di farro')));
    vero(vCarb.fascia >= 2, 'la carbonara non puo\' stare sopra mediocre');
    vero(vFarro.punteggio > vCarb.punteggio, 'il farro deve battere la carbonara');

    // nel dettaglio il voto su 100 sostituisce la vecchia categoria a mano
    a.apri('carbonara');
    await wait(150);
    const meta = a.d.querySelector('#detail-body .detail-meta');
    vero(meta.textContent.includes(vCarb.nome) && meta.textContent.includes(vCarb.punteggio + '/100'),
      'il dettaglio non mostra il voto su 100');
    vero(!/·\s*sgarro\s*·/.test(meta.textContent.split('facile')[0]),
      'il dettaglio mostra ancora la vecchia categoria');
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

  await test('la lista e\' universale: entra anche cio\' che non e\' in ricetta', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-spesa');
    const aggiungi = (n, q) => {
      a.set('shop-add', n);
      if (q) a.d.getElementById('shop-qta').value = q;
      a.click('[data-act=shop-extra]');
    };
    aggiungi('acqua frizzante', '1500');
    aggiungi('detersivo per piatti', '');
    aggiungi('carta da cucina', '');
    almeno(a.conta('#shopping-body .shop-item'), 3, 'le voci libere non entrano in lista');
    let giri = 0;
    while (a.d.querySelector('button.shop-item:not(.done)[data-act=shop-check]') && giri++ < 6)
      a.d.querySelector('button.shop-item:not(.done)[data-act=shop-check]').click();
    a.click('[data-act=shop-bought]'); a.click('[data-act=conferma-si]');
    await wait(250);
    const f = a.stato().freschezza;
    vero(f['detersivo per piatti'], 'il detersivo non arriva in casa');
    vero(f['carta da cucina'], 'la carta da cucina non arriva in casa');
    vero(f['acqua frizzante'] && f['acqua frizzante'].qta === 1500,
      'l\'acqua non tiene la quantita\': ' + JSON.stringify(f['acqua frizzante']));
  });

  await test('l\'ingrediente resta generico, il prodotto vero ha nome e marca sua', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    a.tab('view-spesa');
    a.set('shop-add', 'latte');
    a.d.getElementById('shop-qta').value = '500';
    a.click('[data-act=shop-extra]');
    // apro la riga e dico che cosa compro DAVVERO
    a.click('[data-act=shop-qta-apri]');
    a.d.getElementById('shopqta-prodotto').value = 'Parmalat Zymil Latte Intero';
    a.d.getElementById('shopqta-marca').value = 'Parmalat';
    a.click('[data-act=shopqta-unita]');             // apre la rotella
    a.dom.window.fitmealsProva.rotellaScegli(1, 'l');
    a.click('[data-act=shopqta-salva]');
    // la riga tiene entrambe le verita': ingrediente sopra, prodotto sotto
    vero(/latte/.test(a.testo('#shopping-body .shop-item .txt')), 'l\'ingrediente sparisce');
    vero(/Parmalat/.test(a.testo('.prodotto-vero')), 'la riga non mostra il prodotto vero');
    a.click('[data-act=shop-check]');
    a.click('[data-act=shop-bought]'); a.click('[data-act=conferma-si]');
    await wait(250);
    // la scorta vive sotto l'ingrediente, con la quantita' DAVVERO comprata
    const f = a.stato().freschezza['latte'];
    vero(f && f.qta === 1000 && f.unita === 'ml',
      'un litro vero non fa 1000 ml: ' + JSON.stringify(f));
    // il prodotto entra nei dati con la sua identita'...
    const info = a.stato().prodottiInfo['parmalat zymil latte intero'];
    vero(info && info.marca === 'Parmalat', 'il prodotto vero non entra nei dati');
    // ...si propone per l'ingrediente, ma non vincola nessuna ricetta
    const proposte = a.dom.window.fitmealsProva.prodottiPerIngrediente('latte');
    vero(proposte.some(p => /zymil/i.test(p.nome)), 'il prodotto non si propone per il latte');
    eq(Object.keys(a.stato().marcheRicetta || {}).length, 0,
      'la marca non deve vincolare le ricette');
  });

  await test('la spesa ha due stati: da prendere e nel carrello, coi conteggi', async () => {
    const a = await app();
    a.tab('view-spesa');
    ['latte', 'pasta', 'pomodori'].forEach(n => { a.set('shop-add', n); a.click('[data-act=shop-extra]'); });

    // i due cartelli, coi loro numeri
    const conta = () => [...a.d.querySelectorAll('.spesa-stato .spesa-conta')].map(x => x.textContent);
    const testi = () => [...a.d.querySelectorAll('.spesa-stato b')].map(x => x.textContent);
    vero(testi().join('|') === 'Da prendere|Nel carrello', 'mancano i due stati: ' + testi().join('|'));
    eq(conta().join('/'), '3/0', 'conteggi iniziali sbagliati: ' + conta().join('/'));

    // un tocco: la voce passa nel carrello, i conteggi si aggiornano da soli
    const presa = a.d.querySelector('[data-act=shop-check] .txt').textContent.trim();
    a.click('[data-act=shop-check]');
    eq(conta().join('/'), '2/1', 'dopo un tocco i conteggi non si aggiornano: ' + conta().join('/'));
    vero(a.d.querySelector('.shop-item.done .box').textContent.includes('\u2713'),
      'la voce nel carrello non ha la spunta');
    // la voce appena mossa porta la classe dell'animazione (una volta sola)
    vero(a.d.querySelector('.shop-item.appena.done'), 'manca l\'arrivo animato nel carrello');
    const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
    vero(/@keyframes spesa-arrivo/.test(css) && /@keyframes spesa-spunta/.test(css),
      'mancano le microanimazioni del passaggio');

    // quel che resta in Da prendere NON e' comprato: a fine spesa passa solo il carrello
    a.click('[data-act=shop-bought]'); a.click('[data-act=conferma-si]');
    await wait(250);
    eq(Object.keys(a.stato().freschezza).length, 1, 'in dispensa deve entrare solo il carrello');
    const rimasti = a.testo('#shopping-body');
    ['latte', 'pasta', 'pomodori'].filter(n => n !== presa).forEach(n =>
      vero(rimasti.includes(n), 'la voce non comprata "' + n + '" deve restare in lista'));
    vero(!Object.keys(a.stato().freschezza).some(k => k !== presa),
      'in dispensa e\' entrata una voce mai messa nel carrello');
  });

  await test('nel carrello la voce diventa il prodotto vero', async () => {
    const a = await app();
    a.tab('view-spesa');
    a.set('shop-add', 'latte'); a.click('[data-act=shop-extra]');
    a.click('[data-act=shop-qta-apri]');
    a.d.getElementById('shopqta-prodotto').value = 'Zymil Latte Intero 1 L';
    a.d.getElementById('shopqta-marca').value = 'Parmalat';
    a.click('[data-act=shopqta-salva]');
    // da prendere: comanda l'ingrediente, il prodotto sta sotto
    vero(/latte/.test(a.testo('.shop-item .txt')) && /Zymil/.test(a.testo('.prodotto-vero')),
      'prima del carrello comanda l\'ingrediente');
    a.click('[data-act=shop-check]');
    // nel carrello: comanda il prodotto vero, per esteso e senza barrato
    const vero_ = a.d.querySelector('.shop-item.done .txt--vero');
    vero(vero_ && /Parmalat \u00b7 Zymil Latte Intero 1 L/.test(vero_.textContent),
      'nel carrello non compare il prodotto vero: ' + (vero_ ? vero_.textContent : 'niente'));
    vero(/per: latte/.test(vero_.textContent), 'nel carrello si perde l\'ingrediente di partenza');
  });

  await test('il prodotto letto dall\'etichetta si aggancia alla voce in lista', async () => {
    const a = await app();
    a.tab('view-spesa');
    a.set('shop-add', 'latte'); a.click('[data-act=shop-extra]');
    // scan/etichetta: il prodotto vero entra dal modulo, non dalla riga
    a.click('.shop-eti[data-act=etichetta-apri]');
    a.d.getElementById('eti-nome').value = 'latte intero zymil';
    a.d.getElementById('eti-marca').value = 'Parmalat';
    a.d.getElementById('eti-kcal').value = '64';
    a.click('[data-act=etichetta-salva]');
    await wait(150);
    const agganciati = Object.values(a.stato().shopProdotto || {});
    vero(agganciati.some(p => /zymil/i.test(p.nome) && p.marca === 'Parmalat'),
      'il prodotto scansionato non si aggancia alla voce: ' + JSON.stringify(agganciati));
    // la voce in lista lo mostra gia', prima ancora del carrello
    vero(/Zymil/i.test(a.testo('.prodotto-vero')), 'la riga non mostra il prodotto agganciato');
  });

  await test('scan: codice mai visto, prodotto scritto a mano, dritto nel carrello', async () => {
    const a = await app();
    a.tab('view-spesa');
    // niente rete in prova: il lettore ripiega sul "non riconosciuto"
    a.d.getElementById('codice-cifre').value = '80012345';
    a.click('[data-act=codice-cerca]');
    await wait(150);
    eq(a.d.getElementById('scan-esito-titolo').textContent, 'Prodotto non trovato',
      'senza archivio deve aprirsi la scheda manuale');
    vero(a.d.getElementById('modal-scan-esito').classList.contains('active'), 'la scheda esito non si apre');
    // il flusso non si blocca: nome, marca, formato, e via nel carrello
    a.d.getElementById('scan-nome').value = 'Zymil Latte Intero';
    a.d.getElementById('scan-marca').value = 'Parmalat';
    a.d.getElementById('scan-qta').value = '1';
    a.d.getElementById('scan-unita').textContent = 'L';
    a.click('[data-act=scan-carrello]');
    await wait(100);
    const info = a.stato().prodottiInfo['zymil latte intero'];
    vero(info && info.codice === '80012345' && info.marca === 'Parmalat',
      'il codice non resta col prodotto: ' + JSON.stringify(info));
    vero(info.conf && info.conf.qta === 1000 && info.conf.unita === 'ml',
      'il formato 1 L non diventa la confezione: ' + JSON.stringify(info.conf));
    eq(a.d.querySelectorAll('#shopping-body .shop-item.done').length, 1,
      'il prodotto scansionato non arriva nel carrello');
  });

  await test('scan: il codice gia\' visto torna dalla memoria, senza internet', async () => {
    const a = await app();
    a.tab('view-spesa');
    // prima lettura: entra in memoria dalla scheda manuale
    a.d.getElementById('codice-cifre').value = '80012345';
    a.click('[data-act=codice-cerca]');
    await wait(150);
    a.d.getElementById('scan-nome').value = 'Zymil Latte Intero';
    a.d.getElementById('scan-qta').value = '1';
    a.d.getElementById('scan-unita').textContent = 'L';
    a.click('[data-act=scan-carrello]');
    await wait(100);
    // seconda lettura dello stesso codice: riconosciuto subito, zero rete
    a.d.getElementById('codice-cifre').value = '80012345';
    a.click('[data-act=codice-cerca]');
    await wait(150);
    eq(a.d.getElementById('scan-esito-titolo').textContent, 'Prodotto riconosciuto',
      'la memoria del codice non risponde');
    vero(/memoria, senza internet/.test(a.testo('#scan-esito-corpo')),
      'la scheda non dice che viene dalla memoria');
    vero(/1 L/.test((a.d.querySelector('.scan-formato') || {}).textContent || ''),
      'il formato non torna dalla memoria');
    // e niente doppioni: sempre lo stesso Product
    eq(Object.keys(a.stato().prodottiInfo).filter(k => /zymil/.test(k)).length, 1,
      'la seconda lettura non deve creare un secondo prodotto');
  });

  await test('scan: il prodotto vero veste l\'ingrediente generico e finisce nel suo carrello', async () => {
    const a = await app();
    a.tab('view-spesa');
    a.set('shop-add', 'latte'); a.click('[data-act=shop-extra]');
    a.d.getElementById('codice-cifre').value = '80099887';
    a.click('[data-act=codice-cerca]');
    await wait(150);
    a.d.getElementById('scan-nome').value = 'Zymil Latte Intero';
    a.d.getElementById('scan-marca').value = 'Parmalat';
    a.d.getElementById('scan-qta').value = '1';
    a.d.getElementById('scan-unita').textContent = 'L';
    a.click('[data-act=scan-carrello]');
    await wait(100);
    const S = a.stato();
    // la voce generica "latte" e' passata nel carrello vestita del prodotto
    eq((S.shopExtra || []).map(x => x.n).join(','), 'latte', 'non deve nascere una seconda voce');
    const k = Object.keys(S.shopDone || {})[0];
    vero(k && S.shopProdotto[k] && /zymil/.test(S.shopProdotto[k].nome),
      'la voce non ricorda il prodotto vero');
    vero(S.shopQta[k] && S.shopQta[k].qta === 1000 && S.shopQta[k].unita === 'ml',
      'la quantita\' della confezione non arriva sulla voce');
    const riga = a.d.querySelector('.shop-item.done .txt--vero');
    vero(riga && /Parmalat/.test(riga.textContent) && /per: latte/.test(riga.textContent),
      'nel carrello non si leggono prodotto vero e ingrediente');
    // la ricetta non si tocca: nessuna marca vincolata
    eq(Object.keys(S.marcheRicetta || {}).length, 0, 'lo scan non deve vincolare le ricette');
  });

  await test('quantita scritte come parla la gente: 500gr, 1,5 kg, 6 x 1,5 L', async () => {
    const a = await app();
    const f = a.dom.window.fitmealsProva.formatoDaTesto;
    eq(JSON.stringify([f('500 g').qta, f('500 g').unita]), '[500,"g"]', '500 g');
    eq(JSON.stringify([f('500gr').qta, f('500gr').unita]), '[500,"g"]', '500gr attaccato');
    eq(JSON.stringify([f('1,5 kg').qta, f('1,5 kg').scritta]), '[1500,"kg"]', 'virgola decimale');
    eq(JSON.stringify([f('750 ml').qta, f('750 ml').unita]), '[750,"ml"]', '750 ml');
    eq(JSON.stringify([f('1 L').qta, f('1 L').unita]), '[1000,"ml"]', '1 L');
    eq(f('6 pz').qta, 6, '6 pz');
    // il multipack non si collassa: pezzi e formato del singolo restano
    const sei = f('6 x 1,5 L');
    eq(JSON.stringify([sei.qta, sei.pezzi, sei.diUno]), '[9000,6,1500]', '6 x 1,5 L');
    // "2 confezioni" senza formato noto non si trasforma in nulla
    eq(f('2 confezioni'), null, 'confezioni senza formato non si inventano');
    // la quantita' scritta nel campo di ricerca si separa dal nome
    const t = a.dom.window.fitmealsProva.spesaTestoQuantita('acqua frizzante 6 x 1,5 L');
    vero(t && t.nome === 'acqua frizzante' && t.conf.qta === 9000, 'il testo con quantita');
    // unita' contestuali: dedotte quando affidabili
    a.tab('view-spesa');
    for (const [nome, attesa] of [['pasta', 'g'], ['latte', 'ml'], ['uova', 'un.'],
                                  ['olio', 'ml'], ['acqua', 'ml']]) {
      a.set('shop-add', nome);
      a.d.getElementById('shop-add').dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
      await wait(40);
      eq(a.d.getElementById('shop-unita').textContent, attesa, 'unita di ' + nome);
    }
    // e la ricerca con la quantita' nel testo crea la voce giusta
    a.set('shop-add', 'acqua 6 x 1,5 l');
    a.click('[data-act=shop-extra]');
    const ex = a.stato().shopExtra.slice(-1)[0];
    vero(ex.n === 'acqua' && ex.qta === 9000 && /6 \u00d7 1.5 L/.test(ex.qty),
      'la voce dal testo: ' + JSON.stringify(ex));
  });

  await test('le confezioni restano confezioni: 2 x 500 g, non un chilo anonimo', async () => {
    const a = await app();
    a.tab('view-spesa');
    // il prodotto col suo formato entra dallo scan
    a.d.getElementById('codice-cifre').value = '80070005';
    a.click('[data-act=codice-cerca]');
    await wait(150);
    a.d.getElementById('scan-nome').value = 'Barilla Spaghetti n.5';
    a.d.getElementById('scan-qta').value = '500';
    a.d.getElementById('scan-unita').textContent = 'g';
    a.click('[data-act=scan-carrello]');
    await wait(100);
    let S = a.stato();
    let k = Object.keys(S.shopQta)[0];
    eq(JSON.stringify(S.shopQta[k].conf), '{"qta":500,"unita":"g"}', 'il formato non resta nel modello');
    eq(S.shopQta[k].n, 1, 'una confezione');
    // seconda scansione dello stesso codice: 2 confezioni, zero doppioni
    a.d.getElementById('codice-cifre').value = '80070005';
    a.click('[data-act=codice-cerca]');
    await wait(150);
    a.click('[data-act=scan-carrello]');
    await wait(100);
    S = a.stato();
    eq(S.shopQta[k].n, 2, 'la seconda scansione non aggiunge la confezione');
    eq(S.shopQta[k].qta, 1000, 'il totale per le automazioni');
    eq((S.shopExtra || []).length, 1, 'la seconda scansione crea un doppione');
    vero(/2 \u00d7 500 g/.test(a.d.querySelector('.shop-item.done .qty').textContent),
      'la riga non mostra 2 x 500 g');
    // l'editor parte dalle confezioni e dice quanto vale una
    a.d.querySelector('.shop-item.done .qty').click();
    await wait(50);
    eq(a.d.getElementById('shopqta-unita').textContent, 'conf.', 'l\'unita non parte da conf.');
    eq(a.d.getElementById('shopqta-campo').value, '2', 'il numero non parte dalle confezioni');
    vero(/1 confezione = 500 g/.test((a.d.querySelector('.conf-nota') || {}).textContent || ''),
      'manca la nota del formato');
    // la rotella offre conf. e 3 confezioni fanno 1500 g totali
    a.click('[data-act=shopqta-unita]');
    vero(a.dom.window.fitmealsProva.rotellaUnita().includes('conf'), 'la rotella non offre conf.');
    a.dom.window.fitmealsProva.rotellaScegli(3, 'conf');
    a.click('[data-act=shopqta-salva]');
    await wait(50);
    S = a.stato();
    eq(JSON.stringify([S.shopQta[k].n, S.shopQta[k].qta]), '[3,1500]', '3 confezioni da 500');
    // fine spesa: in dispensa arriva il contenuto vero, con le automazioni di sempre
    a.click('[data-act=shop-bought]'); a.click('[data-act=conferma-si]');
    await wait(250);
    const fr = a.stato().freschezza['barilla spaghetti n.5'];
    vero(fr && fr.qta === 1500 && fr.unita === 'g',
      'in dispensa non arriva il totale: ' + JSON.stringify(fr));
  });

  await test('ogni sezione cerca nel suo contesto, coi suoi placeholder', async () => {
    const a = await app({ storage: conAvanzi(ora => [
      { rid: 'c25', title: 'Pollo al curry', n: 2, kcal: 400, pro: 45, ts: ora - 3600000, pasto: 'pra' },
      { rid: 'p07', title: 'Risotto ai funghi', n: 1, kcal: 600, pro: 15, ts: ora - 7200000, pasto: 'cen' }
    ]) });
    a.tab('view-spesa');
    const ph = id => (a.d.getElementById(id) || {}).placeholder || '';
    eq(ph('shop-add'), 'Cerca un prodotto o ingrediente\u2026', 'placeholder spesa');
    eq(ph('cerca-frigo'), 'Cerca nel Frigo\u2026', 'placeholder frigo');
    eq(ph('cerca-freezer'), 'Cerca nel Freezer\u2026', 'placeholder freezer');
    eq(ph('cerca-avanzi'), 'Cerca tra gli avanzi\u2026', 'placeholder avanzi');
    eq(ph('disp-cerca'), 'Cerca nella Dispensa\u2026', 'placeholder dispensa');
    eq(ph('search-input'), 'Cerca una ricetta\u2026', 'placeholder ricette');

    // la barra degli avanzi FILTRA gli avanzi (prima non ascoltava nessuno)
    const cercaA = (t) => {
      a.d.getElementById('cerca-avanzi').value = t;
      a.d.getElementById('cerca-avanzi').dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    };
    cercaA('pollo');
    let corpo = a.testo('#leftovers-body');
    vero(corpo.includes('Pollo al curry') && !corpo.includes('Risotto'),
      'cercare pollo deve lasciare solo il pollo');
    cercaA('stinco');
    vero(/tra gli avanzi/.test(a.testo('#leftovers-body')), 'manca il vuoto onesto degli avanzi');
    cercaA('');
    corpo = a.testo('#leftovers-body');
    vero(corpo.includes('Pollo al curry') && corpo.includes('Risotto ai funghi'),
      'senza ricerca tornano tutti');
  });

  await test('la stessa parola, sezioni diverse: la marca trova il prodotto dove sta', async () => {
    const a = await app();
    a.tab('view-spesa');
    // il prodotto entra dallo scan e a fine spesa va al suo posto da solo
    a.d.getElementById('codice-cifre').value = '80012377';
    a.click('[data-act=codice-cerca]');
    await wait(150);
    a.d.getElementById('scan-nome').value = 'Zymil Latte Intero';
    a.d.getElementById('scan-marca').value = 'Parmalat';
    a.d.getElementById('scan-qta').value = '1';
    a.d.getElementById('scan-unita').textContent = 'L';
    a.click('[data-act=scan-carrello]');
    await wait(100);
    a.click('[data-act=shop-bought]'); a.click('[data-act=conferma-si]');
    await wait(250);
    const posto = a.stato().freschezza['zymil latte intero'].posto;
    // nella sezione dove l'automazione l'ha messo, si trova anche per MARCA
    const campo = posto === 'frigo' ? 'cerca-frigo' : 'disp-cerca';
    const corpo = posto === 'frigo' ? '#frigo-body' : '#credenza-ripiani';
    a.d.getElementById(campo).value = 'parmalat';
    a.d.getElementById(campo).dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    await wait(80);
    vero(a.testo(corpo).toLowerCase().includes('zymil'),
      'la marca non trova il prodotto in ' + posto);
    // e i suggerimenti della spesa propongono il prodotto con marca e formato
    a.d.getElementById(campo).value = '';
    a.set('shop-add', 'parmalat');
    a.d.getElementById('shop-add').dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    await wait(80);
    const sug = a.testo('#shop-suggest');
    vero(/Parmalat/.test(sug) && /zymil/.test(sug) && /1 L/.test(sug),
      'il suggerimento non porta marca e formato: ' + sug.slice(0, 80));
    // una battitura sbagliata non lascia il vuoto
    a.set('shop-add', 'pomodri');
    a.d.getElementById('shop-add').dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    await wait(80);
    vero(/pomodori/.test(a.testo('#shop-suggest')), 'niente perdono per la battitura');
    // le cifre sono un codice: stesso lettore, stessa memoria
    a.set('shop-add', '80012377');
    a.d.getElementById('shop-add').dispatchEvent(new a.dom.window.Event('input', { bubbles: true }));
    await wait(80);
    vero(a.d.querySelector('[data-act=codice-da-testo]'), 'le cifre non offrono il codice');
    a.click('[data-act=codice-da-testo]');
    await wait(150);
    eq(a.d.getElementById('scan-esito-titolo').textContent, 'Prodotto riconosciuto',
      'il codice scritto non passa dalla memoria');
  });

  await test('fine spesa a meta: quel che resta da prendere non sparisce', async () => {
    const a = await app();
    a.tab('view-profile'); a.profiloBase();
    const r = a.stato().recipes.find(x => (x.ing || []).some(i => i.n === 'latte'));
    const btn = a.d.createElement('button');
    btn.dataset.act = 'shop-add'; btn.dataset.val = r.id;
    a.d.body.appendChild(btn); btn.click(); btn.remove();
    a.tab('view-spesa');
    await wait(100);
    const prima = a.d.querySelectorAll('#shopping-body [data-act=shop-check]').length;
    vero(prima >= 3, 'la ricetta non riempie la lista');
    // compro SOLO il latte: la ricetta resta, con quel che manca ancora
    [...a.d.querySelectorAll('[data-act=shop-check]')].find(x => /latte/.test(x.textContent)).click();
    a.click('[data-act=shop-bought]'); a.click('[data-act=conferma-si]');
    await wait(250);
    eq(a.stato().shopping.length, 1, 'la ricetta sparisce con la spesa a meta\'');
    vero(a.stato().freschezza['latte'], 'il latte comprato non arriva in dispensa');
    vero(a.d.querySelectorAll('#shopping-body [data-act=shop-check]').length >= 3,
      'gli ingredienti da prendere spariscono');
    // tutto preso: adesso si', la lista si chiude
    a.click('[data-act=shop-tutti]');
    a.click('[data-act=shop-bought]'); a.click('[data-act=conferma-si]');
    await wait(250);
    eq(a.stato().shopping.length, 0, 'a spesa completa la ricetta deve staccarsi');
  });

  await test('Invio con le cifre apre il lettore, non una voce-numero', async () => {
    const a = await app();
    a.tab('view-spesa');
    a.set('shop-add', '80012388');
    a.click('[data-act=shop-extra]');   // stesso gesto dell'Invio
    await wait(150);
    eq((a.stato().shopExtra || []).length, 0, 'le cifre non devono diventare una voce');
    vero(a.d.getElementById('modal-scan-esito').classList.contains('active'),
      'le cifre non passano dal lettore');
  });

  await test('dai Prodotti alla dispensa: anche il catalogo converge nello stesso flusso', async () => {
    const a = await app();
    a.tab('view-spesa');
    // dal catalogo alla lista: LA stessa voce manuale di tutte le strade
    const btn = a.d.createElement('button');
    btn.dataset.act = 'cat-in-lista'; btn.dataset.val = 'latte';
    a.d.body.appendChild(btn); btn.click(); btn.remove();
    await wait(100);
    const voce = (a.stato().shopExtra || []).find(x => x.n === 'latte');
    vero(voce && voce.unita === 'ml', 'la voce dal catalogo non ha l\'unita\' contestuale');
    vero(a.testo('#shopping-body').includes('latte'), 'la voce non compare in Da prendere');
    // stesso flusso di tutte le altre: carrello e poi dispensa automatica
    a.click('[data-act=shop-check]');
    vero(a.d.querySelector('.shop-item.done'), 'la voce non passa nel carrello');
    a.click('[data-act=shop-bought]'); a.click('[data-act=conferma-si]');
    await wait(250);
    const f = a.stato().freschezza['latte'];
    vero(f && f.posto === 'frigo', 'l\'automazione non porta il latte in frigo: ' + JSON.stringify(f));
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

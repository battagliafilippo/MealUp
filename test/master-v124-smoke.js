const { app, test, eq, vero, bilancio } = require('./suite.js');

(async () => {
  console.log('\nMealUp Master v1.24 — smoke test\n');

  await test('il Core UI Kit v1.24 viene caricato', async () => {
    const a = await app();
    vero(a.d.querySelector('link[href*="mealup-v124.css"]'), 'manca il foglio v1.24');
    eq(a.errs.length, 0, 'errori JS');
  });

  await test('la navigazione globale conserva ordine e route', async () => {
    const a = await app();
    const labels = [...a.d.querySelectorAll('.mealup-tab-bar .tab-item span')].map(x => x.textContent.trim());
    eq(labels.join('|'), 'Home|Ricette|Spesa|Scorte|Profilo', 'ordine navigazione');
    vero(a.d.querySelector('.ricette-icon'), 'manca l’icona Ricette canonica');
    vero(a.d.querySelector('.scorte-icon'), 'manca l’icona Scorte canonica');
    for (const route of ['view-home','view-search','view-spesa','view-fridge','view-profile']) {
      a.tab(route);
      vero(a.d.getElementById(route).classList.contains('active'), 'route non attiva: ' + route);
    }
    eq(a.errs.length, 0, 'errori JS durante la navigazione');
  });

  await test('Home usa protagonista e anteprima per pasto con una sola bilancia', async () => {
    const a = await app();
    a.tab('view-profile');
    a.profiloBase();
    a.tab('view-home');
    eq(a.conta('#lista-col .home-card'), 2, 'proposta e anteprima Colazione');
    eq(a.conta('#lista-pra .home-card'), 2, 'proposta e anteprima Pranzo');
    eq(a.conta('#lista-cen .home-card'), 2, 'proposta e anteprima Cena');
    const scale = a.d.querySelector('#anello-unico .bilancia-live');
    vero(scale, 'manca la bilancia v1.24');
    eq(scale.querySelectorAll('.mu-flip').length, 4, 'celle flip');
    vero(scale.querySelector('.mu-scale-needle'), 'manca la lancetta');
    const prima = Number(scale.dataset.valore);
    a.dom.window.fitmealsProva.logMeal(a.stato().recipes[8].id, 'pra');
    const dopo = a.d.querySelector('#anello-unico .bilancia-live');
    vero(Number(dopo.dataset.valore) > prima, 'la bilancia non segue il pasto');
    vero(dopo.querySelector('.mealup-scale-svg.oscilla'), 'la bilancia non reagisce');
  });

  await test('Scorte espone le quattro destinazioni canoniche', async () => {
    const a = await app();
    const labels = [...a.d.querySelectorAll('.scorte-hub b')].map(x => x.textContent.trim());
    eq(labels.join('|'), 'Dispensa|Frigo|Freezer|Avanzi', 'destinazioni Scorte');
  });

  await test('Profilo espone le route principali del Master', async () => {
    const a = await app();
    const text = a.testo('.profile-hub');
    for (const expected of ['I miei obiettivi','Come mangio','Diario e andamento','App e collegamenti']) {
      vero(text.includes(expected), 'route mancante: ' + expected);
    }
    vero(a.d.getElementById('diary-body'), 'manca il Diario autonomo');
  });

  await test('Scanner espone live, inserimento manuale e retry', async () => {
    const a = await app();
    a.dom.window.fitmealsProva.apriLettoreCodice();
    vero(a.d.getElementById('modal-codice').classList.contains('active'), 'lettore non aperto');
    vero(a.d.querySelector('#modal-codice .codice-mira'), 'manca la mira live');
    vero(a.d.getElementById('codice-cifre'), 'manca il codice manuale');
    a.dom.window.fitmealsProva.scanEsito(null, '80012345', true);
    eq(a.testo('#scan-esito-titolo'), 'Prodotto non trovato', 'titolo retry');
    vero(a.d.querySelector('#scan-esito-corpo [data-act="codice-apri"]'), 'manca Riprova scansione');
    vero(a.d.getElementById('scan-nome') && a.d.getElementById('scan-marca'), 'manca inserimento manuale');
  });

  await test('Scanner mostra voto, cinque livelli e valori nutrizionali', async () => {
    const a = await app();
    a.dom.window.fitmealsProva.scanEsito({
      nome: 'fiocchi di avena integrale', marca: 'MealUp', cat: 'Cereali e colazione',
      formato: '350 g', add: [], bio: false,
      valori: { kcal:372, grassi:7, saturi:1.3, carboidrati:59, zuccheri:1.2,
        fibre:10, proteine:13, sale:.02 }
    }, '8012345678901');
    vero(a.d.querySelector('#scan-esito-corpo .scan-score-num'), 'manca il voto /100');
    eq(a.conta('#scan-esito-corpo .scan-score-levels span'), 5, 'livelli del voto');
    eq(a.conta('#scan-esito-corpo .scan-score-levels .active'), 1, 'livello attivo');
    eq(a.conta('#scan-esito-corpo .scan-valori .scan-riga'), 8, 'valori nutrizionali');
    vero(/Aggiungi al carrello/.test(a.testo('#scan-esito-corpo')), 'manca il collegamento alla Spesa');
  });

  const result = bilancio();
  console.log('\n' + result.passati + ' passati, ' + result.falliti + ' falliti');
  process.exitCode = result.falliti ? 1 : 0;
})();

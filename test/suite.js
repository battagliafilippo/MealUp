/**
 * FitMeals — verifiche automatiche
 *
 *   npm i jsdom  &&  node test/suite.js
 *
 * Ogni test apre l'app in un DOM finto, la usa come farebbe una persona e
 * controlla il risultato. Serve a scoprire se una modifica ne rompe un'altra:
 * e' gia' successo due volte durante lo sviluppo.
 */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

/* L'orologio dei test e' fermo alle otto di sera, e vale sia dentro la pagina
   sia nei seed scritti dai test: molte logiche (il pasto indovinato, gli
   avanzi che tornano) dipendono dall'ora, e una suite che passa di sera e
   fallisce al mattino non e' una suite. */
const OraVera = Date;
const SCARTO = (() => {
  const adesso = new OraVera();
  const sera = new OraVera(adesso.getFullYear(), adesso.getMonth(), adesso.getDate(), 20, 0, 0);
  return sera.getTime() - adesso.getTime();
})();
class OrologioDeiTest extends OraVera {
  constructor(...a) { a.length ? super(...a) : super(OraVera.now() + SCARTO); }
  static now() { return OraVera.now() + SCARTO; }
}
global.Date = OrologioDeiTest;
const wait = ms => new Promise(r => setTimeout(r, ms));

let passati = 0, falliti = 0;
const errori = [];

function boot(opts = {}) {
  return new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: opts.url || 'https://test.local/fitmeals/',
    virtualConsole: new VirtualConsole(),
    beforeParse(w) {
      // L'orologio dei test e' fermo alle otto di sera: molte logiche (il
      // pasto indovinato, gli avanzi che tornano) dipendono dall'ora, e una
      // suite che passa di sera e fallisce al mattino non e' una suite.
      w.Date = OrologioDeiTest;

      Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true });
      Object.defineProperty(w, 'isSecureContext', { value: true, configurable: true });
      w.CompressionStream = global.CompressionStream;
      w.DecompressionStream = global.DecompressionStream;
      if (opts.storage) w.localStorage.setItem('fitmeals.v2', JSON.stringify(opts.storage));
      if (opts.fetch) w.fetch = opts.fetch;
    }
  });
}

/* Ogni finestra aperta va chiusa a fine test: gli interval dell'app (il tick
   dei timer, il guardiano della mezzanotte) terrebbero vivo ogni contesto e
   dopo cento test la memoria finisce. */
const finestreAperte = [];

async function app(opts) {
  const dom = boot(opts);
  finestreAperte.push(dom.window);
  const errs = [];
  dom.window.addEventListener('error', e => errs.push(e.message));
  await wait(700);
  const d = dom.window.document;
  return {
    dom, d, errs,
    // Stato vivo (comprende le ricette ricostruite dal file), non quello su disco.
    stato: () => dom.window.fitmealsDebug(),
    salvato: () => JSON.parse(dom.window.localStorage.getItem('fitmeals.v2')),
    set: (id, v) => { const el = d.getElementById(id); el.value = v; el.dispatchEvent(new dom.window.Event('input', { bubbles: true })); },
    tab: v => d.querySelector(`[data-act=tab][data-val=${v}]`).click(),
    // Il catalogo completo vive nella scheda Cerca: le prove ci passano da li.
    cerca: function (q) {
      this.tab('view-search');
      const el = d.getElementById('search-input'); el.value = q;
      el.dispatchEvent(new dom.window.Event('input'));
    },
    apri: function (q) {
      this.tab('view-search');
      const el = d.getElementById('search-input'); el.value = q;
      el.dispatchEvent(new dom.window.Event('input'));
      if (d.querySelector('#modal-detail.active')) d.querySelector('#modal-detail [data-act=close-modal]').click();
      const c = d.querySelector('#recipe-list .card-btn');
      if (c) c.click();
      return d.querySelector('#detail-body h2') ? d.querySelector('#detail-body h2').textContent : null;
    },
    click: sel => { const e = d.querySelector(sel); if (e) e.click(); return !!e; },
    conta: sel => d.querySelectorAll(sel).length,
    testo: sel => (d.querySelector(sel) || {}).textContent || '',
    profiloBase: function () {
      this.set('p-name', 'Test'); this.set('p-age', '38');
      this.set('p-height', '178'); this.set('p-weight', '82'); this.set('p-goal', 'cut');
    }
  };
}

async function test(nome, fn) {
  try {
    await fn();
    passati++;
    console.log('  ok   ' + nome);
  } catch (e) {
    falliti++;
    errori.push(nome + ': ' + e.message);
    console.log('  FALLITO  ' + nome + '\n         ' + e.message);
  } finally {
    while (finestreAperte.length) {
      const w = finestreAperte.pop();
      try { w.close(); } catch (e) {}
    }
  }
}

function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'atteso') + ' ' + JSON.stringify(b) + ', ottenuto ' + JSON.stringify(a));
}
function vero(v, msg) { if (!v) throw new Error(msg || 'atteso vero'); }
function almeno(a, n, msg) { if (!(a >= n)) throw new Error((msg || 'atteso almeno') + ' ' + n + ', ottenuto ' + a); }

module.exports = { app, test, eq, vero, almeno, wait,
  bilancio: () => ({ passati, falliti, errori }) };

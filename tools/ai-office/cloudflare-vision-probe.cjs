'use strict';

// MealUp AI Office — one-shot Cloudflare Workers Free vision access probe.
// Manual dispatch only. No billing setup, app writes, deploys, retries or paid fallback.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';
const INPUT = 'assets/family-fo/pasta.webp';
const PROMPT = [
  'Sei un candidato Design Agent in una PROVA DI OSSERVAZIONE senza potere operativo.',
  'Ricevi una sola immagine statica, non uno screenshot della card.',
  'Descrivi esclusivamente oggetti, colori, disposizione e texture realmente visibili.',
  'Se il dettaglio non e verificabile, dichiaralo incerto invece di indovinarlo.',
  'Non dichiarare conformita ai FROZEN, approvazioni o test mobile gia effettuati.',
  'Rispondi in italiano in massimo 100 parole. Indica elementi visibili e un controllo mobile FUTURO.'
].join(' ');

function checkFreeOnly(env) {
  const missing = [];
  if (env.MEALUP_FREE_ONLY !== 'YES') missing.push('FREE_ONLY_GATE');
  if (env.MEALUP_WORKERS_FREE_CONFIRMED !== 'YES') missing.push('WORKERS_FREE_PLAN_NOT_CONFIRMED');
  if (!/^[a-fA-F0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID || '')) missing.push('ACCOUNT_ID');
  if (typeof env.CLOUDFLARE_API_TOKEN !== 'string' || env.CLOUDFLARE_API_TOKEN.length < 24)
    missing.push('API_TOKEN');
  return missing;
}

function buildBody(imageBase64) {
  assert(typeof imageBase64 === 'string' && imageBase64.length > 1000, 'MISSING_ASSET');
  return {
    messages: [
      { role: 'system', content: PROMPT },
      { role: 'user', content: [
        { type: 'text', text: 'Analizza solo i pixel di questo Food Object Pasta MealUp.' },
        { type: 'image_url', image_url: { url: 'data:image/webp;base64,' + imageBase64 } }
      ]}
    ],
    max_tokens: 230,
    temperature: 0.1,
    stream: false
  };
}

function safeAccountId(id) {
  // Account ID is user-provided, never logged.
  assert(/^[a-fA-F0-9]{32}$/.test(id || ''), 'INVALID_ACCOUNT_ID');
  return id;
}

async function run(env = process.env) {
  const missing = checkFreeOnly(env);
  if (missing.length) {
    console.error('BLOCKED: '+missing.join(','));
    process.exitCode = 1;
    return;
  }
  const image = fs.readFileSync(INPUT);
  assert(image.length > 1000 && image.length < 250000, 'UNEXPECTED_ASSET');
  const body = buildBody(image.toString('base64'));
  const url = 'https://api.cloudflare.com/client/v4/accounts/' +
    safeAccountId(env.CLOUDFLARE_ACCOUNT_ID) + '/ai/run/' + MODEL;
  const started = Date.now();
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN,
        'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });
  } catch (_) {
    console.error('BLOCKED: NETWORK_OR_TIMEOUT');
    process.exitCode=1;
    return;
  }
  let payload = {};
  try { payload = await response.json(); } catch (_) { /* do not expose remote data */ }
  if (!response.ok) {
    const code = typeof payload?.errors?.[0]?.code === 'number' ? payload.errors[0].code : 'UNKNOWN';
    console.error('BLOCKED: HTTP_' + response.status + ' CODE_' + code);
    process.exitCode=1;
    return;
  }
  const output = typeof payload?.result?.response === 'string' ? payload.result.response
    : typeof payload?.result?.output === 'string' ? payload.result.output : '';
  if (!output.trim()) {
    console.error('INCONCLUSIVE: HTTP_200_NO_TEXT_RESPONSE');
    process.exitCode=1;
    return;
  }
  const clean = output.slice(0, 1800).replace(/(?:gsk_[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{12,})/g, '[REDACTED]');
  const report = { schema: 'mealup-cloudflare-vision-probe-v1', model: MODEL, input: INPUT,
    sha256: crypto.createHash('sha256').update(image).digest('hex'),
    httpStatus: 200, durationMs: Date.now()-started,
    apiCalls: 1, retries: 0, freePlanConfirmedByUser: true,
    additionalCostEUR: 0, noDeploy: true, noAppChanges: true,
    providerOutput: clean, finalQa: 'HUMAN_REVIEW_REQUIRED',
    warning: 'API access does not establish quality, benchmark victory or FROZEN compliance.' };
  fs.writeFileSync('/tmp/mealup-cloudflare-vision-probe.json', JSON.stringify(report,null,2)+'\n');
  console.log('RESULT=TECHNICAL_PASS HTTP_200; REVIEW_REQUIRED; API_CALLS=1; NO_PAID_FALLBACK');
}

if (require.main === module) run().catch(() => {
  console.error('BLOCKED: INTERNAL_ERROR'); process.exitCode=1;
});
module.exports = { MODEL, INPUT, PROMPT, checkFreeOnly, buildBody, safeAccountId, run };

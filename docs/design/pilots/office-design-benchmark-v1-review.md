# MealUp Design Agent — Benchmark baseline e Audit indipendente (2026-10-15)

**Esito: QWEN NON PROMOSSO. A/B tra modelli differenti NON ESEGUITO (assenza seconda API vision Free verificata).**
Benchmark eseguito realmente: [GitHub Actions run 38681649610](https://github.com/battagliafilippo/MealUp/actions/runs/38681649610), artifact `mealup-design-vision-baseline-v1`. Branch laboratorio `experiment/recipe-visual-agents`; nessuna modifica all'app. Registro candidato: `tools/ai-office/scout-candidate-register.json`.

## Protocollo, input e limiti
- Un solo modello: `qwen/qwen3.8-27b`, provider Groq Free già collegato.
- Quattro asset originali e distinti: `assets/family-fo/pasta.webp`, `pesce.webp`, `verdura.webp`, `assets/mealup-home-scale.webp`; ciascuno testato con `reasoning_effort=none` e `medium` (stesso prompt, temperatura 0.1, output max 720).
- Otto chiamate senza retry; 26 secondi di pausa tra le chiamate per rispettare le quote. Costo aggiuntivo 0 EUR, senza upgrade billing.
- QA strutturale iniziale: famiglia corretta, JSON, non dichiarare FROZEN approvati, nessuna scrittura/escalation, nessuna card dichiarata vista. **Non sostituisce una revisione dei pixel né un audit su screenshot di card reale.**
- Revisione umana posteriore: confronto con il comportamento noto dei file, in particolare unica immagine WebP e trasparenza FO; gli errori sono marcati con evidenza.

## Esito dettagliato

| Asset | none (senza ragionamento) | medium (ragionamento medio) | QA finale |
|---|---|---|---|
| Pasta | HTTP 200, famiglia PASTA | HTTP 200, famiglia PASTA, dice "su sfondo bianco" benché l'asset abbia alpha trasparente | **MEDIUM BLOCKED**: sfondo inventato |
| Pesce | HTTP 200, famiglia PESCE | HTTP 200, famiglia PESCE, dice "più inquadrature ... primi piani" di unica immagine | **MEDIUM BLOCKED**: falsa sequenza/viste |
| Verdura | HTTP 200, famiglia VERDURA | HTTP 200, famiglia VERDURA | **HUMAN_REVIEW**: non validata la precisione di ogni particolare |
| Bilancia Home | HTTP 200, NON_FOOD_BRAND | HTTP 400, nessun output | **MEDIUM BLOCKED** per HTTP 400; l'asset non è uno screenshot UI completo |

**Numeri verificati:** 8 chiamate tentate; 7 risposte HTTP 200; 1 HTTP 400; 7/7 etichette di categoria corrette fra risposte; **almeno 2/7** risposte con affermazioni visive oggettivamente scorrette, individuate dall'audit indipendente; altre osservazioni rimangono NON VERIFICATE nel dettaglio. Nessuna stima di affidabilità statistica o classifica definitiva derivabile da 8 chiamate.
- `none`: 4/4 HTTP 200, nessuna delle due specifiche allucinazioni certe osservata; non significa design correctness PASS.
- `medium`: 3/4 HTTP 200, due allucinazioni evidenti nei tre output, un HTTP 400; con questi casi non apporta un miglioramento affidabile.
- L'HTTP 400 è stato registrato senza messaggio dettagliato del provider, quindi **causa non determinata**, non chiamare sicuramente "errore del modello" senza indagine successiva.

## Root Cause + Prevention
1. **MODEL FAILURE, non soltanto prompt:** nella prova Pesce-Medium con brief esplicito su singola immagine statica il modello ha comunque introdotto più inquadrature. Pasta-Medium ha convertito il canvas con trasparenza in "sfondo bianco". Entrambe sono asserzioni non supportate dalla sorgente.
2. **QA FAILURE:** il checker iniziale rilevava solo alcune frasi, non la locuzione "più inquadrature", e non confrontava lo sfondo con l'alpha reale. Un PASS strutturale NON equivale a verità visiva. Correzione in `tools/ai-office/design-benchmark.cjs`: intercettare variazioni di multi-view e sfondo bianco su FO con alpha, con test offline in `design-benchmark.test.cjs`. Nessuna chiamata in più per questa correzione; run storico NON retroattivamente verde.
3. **TASK DESIGN UNDER-SPECIFIED:** il modello ha ricevuto Food Object isolati, non screenshot della card né FROZEN pertinenti; le proposte mobile restano ipotesi, non una verifica UX.
4. **Scouting e decisione:** per proclamare un sostituto migliore servono almeno un secondo modello con **API vision Free realmente accessibile**, lo stesso set di casi, QA manuale e screenshot card veritieri. Candidati fonti ufficiali: Microsoft Phi-4-reasoning-vision-15B (MIT), Qwen3-VL-8B-Instruct (Apache 2.0); disponibilità gratuita di inferenza NON VERIFICATA.

## Decisione e non-decisioni
- Qwen status: `CONNECTED_GUARDED_NOT_QA_APPROVED`; **NO** Design Director autonomo.
- Non attivare Gemini (403), servizi a pagamento, o nuove chiavi senza verifica/consenso.
- Nessuna sostituzione del Design Agent né modifica ai FROZEN o app: la decisione spetta al CEO; Scout fa proposte indipendenti e Director implementa solo dopo autorizzazione.
- Avanzamento successivo suggerito: prova zero cost su seconda API vision realmente disponibile; benchmark A/B identico con almeno uno screenshot UI reale e criteri a priori, QA indipendente.

## Scouting successivo al benchmark: candidato Cloudflare Free
- **Mistral Small 3.1 24B**: Apache 2.0 ufficiale, multimodale con vision, ospitato con ID `@cf/mistralai/mistral-small-3.1-24b-instruct` su Cloudflare Workers AI.
- Cloudflare documenta un allotment gratuito Workers AI di 10.000 Neurons/giorno sul piano Workers Free, senza addebito oltre quota (le ulteriori richieste falliscono); il candidato non compare fra i modelli con obbligo di piano Paid nel listino corrente. Fonti: https://mistral.ai/news/mistral-small-3-1/ e https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/ e https://developers.cloudflare.com/workers-ai/platform/pricing/.
- **Stato reale:** provider e licenza verificati come offerta; **account Cloudflare dell'utente NON connesso né testato**, 0 chiamate a Mistral, nessun A/B eseguito. Non creare account/credibili o accettare piano Paid al posto del CEO.
- **Gate successivo:** verificare accesso Workers Free e token Cloudflare senza billing, poi inviare identico input/prompt e revisionare output di Mistral contro Qwen. Attenzione: l'API per le immagini del modello specifico va provata, non assunta dal solo marketing multimodale.

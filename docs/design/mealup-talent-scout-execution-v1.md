# MealUp AI Office — Talent Scout execution protocol v1.0 (LAB ACTIVE)

Data: 2026-10-15. Mandato richiesto dal CEO: identificare i migliori agenti per ruolo a costo aggiuntivo 0 EUR, farli competere su prove reali e proporre eventuali sostituzioni. **Questo è il manuale attuativo** del reparto indipendente AI Talent & Innovation disciplinato da `docs/design/mealup-ai-talent-innovation-v1.md`; non modifica Costituzione v1.9, Master, FROZEN, organigramma v1.3 o decisioni del CEO.

## Catena di responsabilita: una squadra leggera, non quattro AI concorrenti sempre accese

- **CEO**: unico decisore per sostituzioni, installazioni, nuovi account, accettazioni di licenza, API, spese e modifiche; riceve la shortlist con prove.
- **Talent Scout Lead (responsabile ricerca)**: riferisce DIRETTAMENTE al CEO, in parallelo al Director. Un solo incaricato logico per ricognizione; coordina il processo senza gestire app, main o agenti degli altri reparti. Prima domanda: "Quale problema concreto del ruolo stiamo cercando di risolvere?".
- **Model Research (funzione non necessariamente nuovo modello)**: raccoglie modelli open-weight, progetti GitHub, versioni, changelog, capability matrix, accuratezza e stabilita. Fonti ufficiali e test indipendenti riproducibili; mai scegliere da leaderboard o marketing soltanto.
- **Provider, Licensing & Cost Audit**: distingue licenza dei pesi da condizioni API, account e quote reali. Verifica accessibilita in Italia, eventuale click-to-accept, necessità di login, quota Free non monetizzabile, no carta/abbonamento. Se il provider non è collegato o richiede un accettazione personale, marca BLOCCATO; non domanda chiavi finché il resto del processo non è pronto.
- **Benchmark Engineer**: prepara asset canonici con checksum, prompt uguali, controlli pre-registrati, output differenziati per modello, limiti di token, throughput e dataset; non attribuisce punteggi a modelli che non sono stati realmente chiamati.
- **QA indipendente**: separato dallo Scout e dall'eventuale Design Agent; controlla allucinazioni sui pixel, metadati, coerenza FROZEN, schemi, errori HTTP, richiami ad asset e valutazioni umane. Può bloccare qualsiasi proposta. La validazione automatica del JSON è solo un pre-gate.
- **AI Office Director**: rimane esterno al reparto Scout fino all'esplicita autorizzazione CEO. Solo allora può recepire la proposta e pianificare implementazione, test, sostituzione ACTIVE, rollback e qa.

Non creiamo processi o servizi cloud extra senza dimostrazione della necessità. Queste sono **responsabilità di processo**, non quattro credenziali/abbonamenti/agent runtime già accesi.

## Pipeline anti-confusione

1. `DISCOVERED`: nome, versione esatta, licenza, uso per il reparto, fonte ufficiale e rischio.
2. `FREE_ELIGIBILITY_REVIEW`: verificare hosting, disponibilita reale con quota 0 EUR, condizioni e accesso. Github open source != GPU/API gratuita.
3. `ACCOUNT_NOT_CONNECTED` / `LICENSE_APPROVAL_REQUIRED`: stop pulito senza chiedere screenshot ripetuti. Preparare il codice e i test OFFLINE che non richiedono login.
4. `READY_FOR_CONTROLLED_PROBE`: soltanto se quote, token e autorizzazione sono verificati; una richiesta minima e fissa per modello, nessun retry o fallback paid.
5. `MEALUP_A_B_BENCHMARK`: almeno 4 casi canonici diversi incluso uno screenshot vero di card UI, identici prompt/asset, checksums, versione e settings registrati; rapporto su errori fattuali, capacità, costo/latency, limiti e riesecuzione. Scrutatori indipendenti, controllo umano obbligatorio.
6. `PROPOSED_TO_CEO`: rapporto con un'unica raccomandazione, prove, incertezze, miglioramento concreto e differenza con il candidato ACTIVE.
7. `CEO_APPROVED_FOR_DIRECTOR`: solo dopo una decisione esplicita. Il Director può preparare la sostituzione sotto QA; finché non avviene, il vecchio riferimento rimane ACTIVE solo se qualificato.
8. `SUPERSEDED`: una nuova soluzione APPROVATA sostituisce quella precedente nello stesso registro, senza duplicati; mai promozione implicita dal punteggio.

## Benchmark Design / Vision (baseline 2026-10-15)

L'ultimo benchmark esistente su Qwen `OFFICE-DESIGN-BENCH-V1` ha osservato 8 richieste su 4 asset con vari reasoning efforts; **non è un confronto tra modelli**; audit manuale ha identificato errori di frame/sfondo bianco. Stato Qwen `CONNECTED_GUARDED_NOT_QA_APPROVED`. Il secondo modello con API gratuita non è ancora collegato.

Candidati:
- `qwen/qwen3.8-27b` via Groq Free: un accesso vision reale verificato, qualità Design NON_APPROVATA.
- `@cf/google/gemma-4-26b-a4b-it` (Google Gemma 4): Apache-2.0, vision specifica per UI, Workers Free documentato da Cloudflare; account API non collegato. Candidato prioritario, **non vincitore**.
- `@cf/mistralai/mistral-small-3.1-24b-instruct` (Mistral): Apache-2.0, visione; Workers Free documentato, accesso non collegato.
- `@cf/meta/llama-3.2-11b-vision-instruct` (Meta): visione, ma serve accettazione della specifica licenza e accesso; non avviare.
- Microsoft Phi-4 reasoning vision / Qwen3-VL 8B: pesi disponibili, hosting gratuito API non verificato; niente test live.
- Gemini 3.8 Flash: progetto Google ha restituito 403 e stato Limitato; fermo, niente fatturazione.
Escludere soluzioni deprecate e versioni cancellate, per esempio Gemma 3 12B se il provider la indica deprecated e Groq Qwen 3.6 da settembre 2026.

Fonti dirette:
- https://developers.cloudflare.com/changelog/post/2026-04-04-gemma-4-26b-a4b-workers-ai/
- https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/
- https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/
- https://developers.cloudflare.com/workers-ai/guides/tutorials/llama-vision-tutorial/
- https://console.groq.com/docs/models
- https://console.groq.com/docs/deprecations

## Implementazione e prove

- `tools/ai-office/scout-candidate-register.json`: unica lista tecnica di candidati e prove, indipendente dai FROZEN.
- `tools/ai-office/scout-evaluator.cjs`: controlla la candidabilità, classifica i blocchi e impedisce finte vittorie A/B e sostituzioni senza CEO; `node tools/ai-office/scout-evaluator.cjs` non effettua rete.
- `tools/ai-office/scout-evaluator.test.cjs`: test offline automatici in GitHub Actions.
- `tools/ai-office/cloudflare-vision-probe.cjs`: codice preparato per UNA richiesta senza retry, ma **non utilizzabile finché Free plan/account/token non saranno confermati**. Il reale supporto input immagine della chiamata specifica resta da provare.
- Le ricognizioni settimanali esterne a GitHub sono gestite dall'automazione ChatGPT `MealUp — Talent Scout`. Questo documento non rende ChatGPT o il repository un processo self-hosted autonomo; le notifiche dipendono dai permessi e impostazioni del prodotto.

## Regola anti-screenshot e segreti

Lo Scout deve svolgere prima tutta la ricerca, benchmark offline, preparazione di repo/workflow e QA **senza richiedere interventi all'utente**. Chiedere una sola azione personale soltanto alla fine se indispensabile (login/consenso licenza/credenziali). Non richiedere all'utente screenshot seriali. Non copiare chiavi nella chat o nella PWA. Se è disponibile una sessione ChatGPT Work dotata di Cloud Browser, preferire un unico passaggio assistito per l'account rispetto alla procedura manuale. Non affermare di aver effettuato accessi o chiamate API senza prove.

## Invarianti

Budget aggiuntivo 0 EUR, tester ufficiale unico, `main` immutato, nessun deploy o asset change, 454 ricette, Food Portrait vessel_id, 14 famiglie FO e tutti i freeze canonici intatti. Non creare agenti attivi, nuove spese, token o servizi senza consenso esplicito del CEO.

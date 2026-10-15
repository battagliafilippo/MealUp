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

## Vincolo CEO — FREE RECURRING, non crediti una tantum (15 ottobre 2026)

**Interpretazione vincolante del budget 0 EUR:** il componente proposto per un reparto deve poter essere RIUTILIZZATO nel tempo con spesa aggiuntiva 0 EUR, non soltanto funzionare durante un trial. Lo Scout esclude dal ruolo stabile crediti promozionali/di benvenuto, trial con scadenza, allowance che si esaurisce per sempre, API paid-only o sistemi che obbligano a inserire una carta o attivare fatturazione per continuare.

**Ammessi come candidati stabili:** (a) tier gratuito ricorrente con reset esplicito verificabile (al minuto, giorno o mese) e blocco sicuro quando la quota termina; (b) modello open-weight eseguito su hardware/infrastruttura gia disponibili e realmente gratuiti, senza costi nuovi nascosti. *Open source su GitHub, da solo, non dimostra la presenza di un motore AI gratuito*. Ogni quota gratuita vale per il provider/account nel suo insieme, non e necessariamente individuale per agente.

**Checklist obbligatoria per ciascun candidato:** `freeQuotaPolicy.kind` deve essere `RECURRING_FREE_QUOTA` (con `reset` e fonte ufficiale), oppure `SELF_HOSTED_PERPETUAL_VERIFIED` con prova della risorsa hardware gratuita; `ONE_TIME_CREDITS` e `UNKNOWN` NON sono idonei al ruolo stabile. Registrare: unità quota, periodo reset, accesso via API reale, licenza, no-billing, esaurimento quota -> stop e ripresa al reset, cambiamenti del piano, quota condivisa con altri agenti, dipendenza infrastrutturale, throughput sostenibile e qualita al benchmark. Non inventare reset, entitlement né durata illimitata della policy: i provider possono cambiare le condizioni e lo Scout le riverifica periodicamente.

**Gate runtime futuro:** `429`/quota esaurita -> nessuna chiamata extra, nessun fallback paid, sospendere il lavoro non urgente fino al rinnovo della finestra disponibile; la continuità non significa esecuzione 24/7. Se non verificata la ricorrenza gratuita, classificare `RENEWAL_UNVERIFIED`; se e' un credito una tantum, classificare `NON_RENEWING_FREE_OFFER`. Non promuovere neppure dopo un ottimo test qualitativo.

Esempi con fonti ufficiali al 15 ottobre 2026:
- **Groq Free:** limiti `RPM/RPD/TPM/TPD` ricorrenti; Qwen 3.8 27B documentato a 30 RPM, 1.000 RPD, 8.000 TPM e 200.000 TPD nella pagina limiti Free. I limiti reali dell'account vanno verificati sul pannello; continuita soggetta alla disponibilita del provider. https://console.groq.com/docs/rate-limits
- **Cloudflare Workers AI Free:** quota condivisa di 10.000 Neurons/giorno, rinnovo alle 00:00 UTC; oltre la quota le operazioni falliscono. Non e un bonus una tantum. Un account collegato non e ancora presente; solo una chiamata vision reale puo provarne l'accessibilità per il progetto. https://developers.cloudflare.com/workers-ai/platform/pricing/

## Capacità per incarichi lunghi e rotazione controllata di agenti (CEO 2026-10-15)

**Strategia approvata come requisito di pianificazione, NON ancora come esecutore live:** lo Scout deve verificare quanto lavoro utile coprono realmente le quote Free ricorrenti. Il Director potrà applicare la rotazione **solo** dopo confronto QA, approvazione esplicita di un elenco di modelli equivalenti per ruolo e autorizzazione dello scope dal CEO. La continuità è sempre limitata dalle quote condivise, dalla qualità dei risultati e dai cambi di termini dei provider.

1. **Capacità reale prima dei nuovi account:** per ogni candidato recuperare quote pubblicate (RPD, TPD, RPM, TPM o Neurons), periodicità del reset, limiti per modello, quote condivise fra modelli dell'account, vincoli per le immagini e testo, lunghezza massima del contesto, throughput, 429 e Out of Capacity, disponibilità autentica sul piano Free, hard stop senza pagamento. Calcolare costo per **micro-step MealUp realistico** e `numero micro-step per finestra`; evitare di scambiare richieste/minuto con richieste/giorno.
2. **Proiezione numerica registrata e prudente:** usare `P95` di token/Neurons registrati **da prove reali immagine inclusa**, quota residua reale ed headroom predefinita del 15%. Se mancano prove visive o quota residua, dire `VISION_CAPACITY_UNVERIFIED` e riportare solo un limite teorico `TEXT_ONLY`; mai spacciare una stima testuale per autonomia Design reale. Considerare costo extra del briefing, materiale FROZEN, contesto, ripresa, QA e codice. Uno stesso incarico lungo va spezzato in micro-step riavviabili e validabili.
3. **Massima resa / quota effettiva:** lo Scout deve confrontare qualità QA, lavoro utile per finestra e disponibilità, non massimizzare soltanto i token; preferire il più affidabile entro il budget. Esempio matematico orientativo solo TESTO, 3.000 token input + 1.200 output, quota completamente libera: Groq Qwen ~47 passi/giorno (200.000 TPD), Cloudflare Gemma 4 ~166 passi/giorno e Cloudflare Mistral 3.1 ~64 passi/giorno (10.000 Neurons). Le stime non includono immagini e non sono sommate fra modelli Cloudflare.
4. **Budget pools, non modelli isolati:** due agenti su **Cloudflare Workers AI Free** dividono i medesimi 10.000 Neurons/giorno. Passare Gemma -> Mistral NON ricarica i crediti. Groq è un dominio di quota indipendente da Cloudflare, con limiti per organizzazione e modello; account personale e altri task possono comunque consumare la quota. Nessuna registrazione seriale di nuovi account per aggirare limiti.
5. **Failover solo in un pool già autorizzato:** il Director seleziona la migliore alternativa che soddisfa ruolo, capacità, QA, licenza, Free Tier, quota residua sufficiente, contratto output e contesto versionato. Prima di cambiare agente si conserva un checkpoint strutturato di task, versione dei FROZEN, obiettivi, input, decisioni e prove già acquisite; al ritorno si verifica che il nuovo modello abbia capito i vincoli. Se la richiesta è indivisibile o richiede la medesima resa visuale, si aspetta anziché cambiare a un modello non equivalente.
6. **Al limite:** sospendere in modo fail-closed il provider esaurito con la sua quota condivisa; se esiste un **altro provider con disponibilità reale e modello già approvato**, proseguire in quel pool. Quando la prima quota torna disponibile, tornare al provider preferito **al successivo checkpoint sicuro**, NON durante un risultato in corso. Se non ci sono alternative idonee, `WAIT_FOR_QUOTA_RESET` e nessun fallback Paid; la ripresa automatica in futuro richiederà un runtime/ledger persistente separato. Non promettere un worker 24/7 con le sole GitHub Actions manuali.
7. **Ordine delle priorità:** qualità e conformità FROZEN > privacy/sicurezza/licenze > continuità e budget zero > velocità. L'obiettivo è lavoro utile **verificato**, non massimizzare il numero di chiamate.

**Attuazione nel laboratorio:** `tools/ai-office/scout-capacity-policy.json` contiene i due pool di quote e i dati di tariffazione testuale pubblicati; `tools/ai-office/scout-capacity-planner.cjs` è un pianificatore deterministico offline (forecast e scelta di backup solo simulata). `tools/ai-office/scout-capacity-planner.test.cjs` testa limiti condivisi, blocco per QA/CEO, errore di stima vision, switch cross-provider e attesa quando tutte le quote finiscono. **Non** sono stati abilitati agenti automatici, API, task persistenti, switch live o deploy. Il runtime con contabilità reale, retry idempotenti, checkpoint persistenti e ripresa su timer richiede autorizzazione e QA separati.

Fonti: https://console.groq.com/docs/rate-limits ; https://developers.cloudflare.com/workers-ai/platform/pricing/ .

## Terza via a budget 0 — utilizzo di abbonamenti già presenti

Oltre a tier Free ricorrenti e computazione open-weight realmente gratuita, lo Scout deve riconoscere **entitlement inclusi negli abbonamenti già pagati dal CEO** senza incremento del costo: ChatGPT Images nella UI per Visual Production e, quando accessibile, Codex incluso nel piano ChatGPT per Engineering. L'uso deve essere sempre realmente consentito al piano/account e soggetto a quote rinnovabili verificabili; l'eventuale acquisto di crediti aggiuntivi, upgrade o API con fatturazione separata è VIETATO. Un'app terza può eventualmente utilizzare la quota del piano ChatGPT solo se supporta ufficialmente il flusso "Sign in with ChatGPT" e l'utente autorizza la connessione: non generalizzare ad API arbitrary.

Condizioni del nuovo `freeQuotaPolicy.kind = EXISTING_SUBSCRIPTION_ENTITLEMENT_VERIFIED`: `subscriptionPlanAlreadyHeld = true`, `noNewBillingVerified = true`, `usesSeparatelyBilledApi = false`, `entitlementAccessVerified = true`, `reset` e fonte ufficiale non vuoti. Il codice `scout-evaluator.cjs` non lo considera idoneo se anche UNA di queste condizioni manca. Passare il filtro economico **non** promuove l'agente: serve la stessa QA professionale e approvazione del CEO. Fonti: https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan ; https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites ; https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus .

## Skill set specialistico v1 — implementato nel laboratorio (2026-10-15)

È approvata come architettura di ricerca **una regia Scout indipendente con skill on demand**, evitando di moltiplicare modelli e token senza necessità. La regia è `mealup-talent-scout`; le altre quattro skill sono consultate solo quando pertinenti:

| Skill | Quando serve | Esito minimo |
|---|---|---|
| `.agents/skills/mealup-talent-scout/SKILL.md` | Scoperta per un ruolo e shortlist | prove primarie e gap |
| `.agents/skills/mealup-recurring-cost-auditor/SKILL.md` | Piano Free, autonomia e quote condivise | ricorrenza verificata o blocco |
| `.agents/skills/mealup-agent-security/SKILL.md` | Software e skill GitHub di terzi | audit licenza, supply chain, privilegi |
| `.agents/skills/mealup-agent-benchmark/SKILL.md` | Candidati accessibili e confrontabili | test identici, errori, QA indipendente |
| `.agents/skills/mealup-ceo-selection-brief/SKILL.md` | Rapporto CEO | una raccomandazione motivata, nessun auto-switch |

**Matrice di capacità e test per reparto:** `tools/ai-office/scout-role-matrix.json`: 8 ruoli, 32 casi specifici, incluso un test negativo per ruolo; la selezione non usa una graduatoria generalista. **Router deterministico offline:** `tools/ai-office/scout-skill-router.cjs` sceglie le skill per ruolo/fase, verifica metadata SKILL.md secondo standard Agent Skills e resta privo di rete e side effect. È testato da `tools/ai-office/scout-skill-router.test.cjs`. Lo standard portabile è `https://agentskills.io/specification` e le istruzioni `SKILL.md` sono di nostra proprietà, non scaricate/eseguite da repository non attendibili.

**Strumenti da considerare, non installati:** `promptfoo` MIT per A/B dichiarativi e multimodali nel nostro progetto Node, `Inspect AI` per valutazioni con campioni multipli, `OpenSSF Scorecard` per segnali di rischio nei progetti GitHub. Sono ausili metodologici, NON scorciatoie per avere API vision, conti Free o QA umano. Fonti: https://github.com/promptfoo/promptfoo ; https://inspect.aisi.org.uk/ ; https://scorecard.dev/ .

**Modalità di esecuzione reale:** le skill inserite in `.agents/skills/` sono scopribili dai client compatibili come Codex quando lavorano su questo branch; NON sono state installate nell'account ChatGPT dell'utente e la compatibilità con il suo piano non è assunta. L'automazione settimanale `MealUp — Talent Scout` è stata istruita a seguire gli stessi cinque protocolli e a leggere il repository *se il connettore è disponibile nella sua sessione*. Il job settimanale non corrisponde a 5 agenti live né a benchmark API automatici. Quando accessi non ci sono, l'audit rimane desk research e il rapporto dice NON VERIFICATO.

**Protezione dei risultati:** un benchmark A/B fra due modelli con medesimi input e QA umano resta requisito per dichiarare migliore l'uno dell'altro per MealUp; né CI verde, né scorecard, né questioni di branding autorizzano la nomina. Ogni promozione è decisione separata ed esplicita del CEO.

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

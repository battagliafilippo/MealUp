# MealUp AI Talent Scout — Protocollo operativo v1.0 (lab; NON FROZEN)

Data: 2026-10-15. Mandato CEO: organizzare Scout per cercare agenti migliori di Qwen e dei componenti dell'ufficio, con benchmark imparziali a costo aggiuntivo 0 euro. Il contratto gerarchico ACTIVE resta `docs/design/mealup-ai-talent-innovation-v1.md`, la Costituzione Operativa AI v1.9 prevale sempre. Questo documento specifica il COME, non promuove né sostituisce un modello.

## Organigramma e responsabilità
**CEO / Product Owner** (decisione finale)
→ **Talent Scout Lead** (riporta solo al CEO; in parallelo, NON subordinato all'AI Director)
→ quattro responsabilità specialistiche condizionali:
1. **Model & GitHub Researcher**: ricerca modelli vision, framework e agenti nei repository ufficiali, model card e release notes. Niente credenziali nei log, mai promuovere repository per popolarità.
2. **Infrastructure, License & Cost Auditor**: verifica licenza del modello E codice, restrizioni, Italia, API o GPU gratuiti realmente accessibili, quote residue e rischi. Pesi aperti ≠ inferenza gratuita; un endpoint a pagamento NON è idoneo.
3. **Benchmark Engineer**: prepara un benchmark *versionato* e identico per gli agenti eleggibili (stessi input, prompt, modelli dichiarati, budget, scoring, run ID, asset digest), separa prova tecnica, prova design e affidabilità.
4. **Independent QA**: analizza allucinazioni, informazioni non presenti, strutture JSON errate, rispetto FROZEN/DO NOT TOUCH, valutazione umana dell'asset; può bloccare candidato o certificazione, non approvare al posto del CEO.

Questi **non sono quattro agenti con API indipendenti**: attualmente sono funzioni professionali svolte nella ricognizione ChatGPT + procedure GitHub Actions + QA indipendente quando disponibile. Un reparto sempre acceso o quattro specializzazioni autonome richiederebbero integrazioni/verifiche successive.

## Flusso a gate
**DISCOVERED** → MODEL_CARD_CONFIRMED → FREE_EXECUTION_CONFIRMED → EQUIVALENT_AB_RUN → INDEPENDENT_QA → **PROPOSED_TO_CEO** → CEO decision → AI Director implementation. Interrompere al primo gate non soddisfatto; riportare `BLOCKED`, non un vincitore.

- *Market pass*: ogni lunedì mattina Europe/Rome, avvisa solo per candidati concreti; non inviare duplicati né proposte basate su marketing.
- *Requisiti professionali Design*: vision reale, mobile UI/UX, accessibilità, riconoscimento del Food Object, no allucinazioni (frame/crop inesistenti), output calibrato, rispetto dettagli frozen, proposte attuabili con minima complessità.
- *Priorità fonti*: licenza e model card ufficiali > API/pricing/quota ufficiali > codice GitHub/release > benchmark indipendenti riproducibili > discussioni comunità come contesto, non prova.
- *Prova*: almeno 4 tipi di casi MealUp (Food Objects diversi + UI screenshot reale non confondere con asset isolato), più ripetizioni. Asset + prompt e temperatura identici per modelli diversi, senza favorire uno specifico modello nel prompt. I run registrano provider, versione, hash, tempi, token, errori, requisiti minimi e QA umano.
- *Scoring*: correttezza osservazioni visive 30%; allucinazioni e non-asserzioni 25%; conformità ai vincoli 20%; utilità UX/azione 15%; robustezza/ripetibilità 10%. **Questi punteggi richiedono QA umano per parti semantiche**. Un semplice parser automatico NON certifica i FROZEN.
- *Economia*: budget aggiuntivo 0 € hard gate, nessun upgrade/rate limit a pagamento. Prima della chiamata provare secret/provider Free disponibili e quote attuali. No API calls non necessarie in loop.

## Baseline e limiti al 2026-10-15
- Qwen 3.8 27B/Groq Free è connesso tecnicamente, ma QA Design NON APPROVATO dopo `OFFICE-DESIGN-PILOT-001`; prompt A/B/C precedenti mostrano risposte instabili su un unico asset.
- È stato aggiunto un **benchmark intra-modello** riproducibile `tools/ai-office/design-benchmark.cjs`: quattro input di famiglie e marca (PASTA, PESCE, VERDURA, bilancia Home) × `reasoning_effort none/medium`; massimo otto chiamate una tantum, pacing per Free. **Non** è un confronto inter-modello, né un test su vere card UI.
- Il competitor indipendente richiede API vision gratuite *realmente verificate*; non usarne indiscriminatamente una pubblicizzata come open source. Senza un secondo provider collegato non si può affermare "Qwen migliore/peggiore" sulla stessa prova.
- `tools/ai-office/scout-candidate-register.json` è il registro candidati con stato, condizioni tecniche, fonti e prossima verifica; non sostituisce `agent-registry.cjs`.
- Automazione separata "MealUp — Talent Scout": ricognizione il lunedì alle 9 Europe/Rome; notifiche condizionali solo per cambi significativi; non è un processo che agisce autonomamente su GitHub.

## Vincoli invarianti
Nessuna modifica a `main`, tester ufficiale, PWA, ricette, Food Portrait/vessel, FROZEN o Master; nessuna spesa, deploy, segreti nel codice, cambio di agente o funzioni senza consenso del CEO. Per i nuovi agenti è obbligatorio un passaggio del Director dopo approvazione.

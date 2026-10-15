# MealUp AI Office — AI Talent & Innovation / Osservatorio Agenti (v1.0 ACTIVE)

Approvazione del CEO: 2026-10-14. Questo e' il contratto CANONICO del nuovo reparto di scouting e valutazione di agenti/modelli. Si affianca al contratto del Director `docs/design/mealup-idea-validator-agent-v1.md` (office v1.3), che resta ACTIVE e invariato per il routing esecutivo. Non e' un nuovo FROZEN grafico e non cambia la Costituzione Operativa AI v1.9.

## Mandato, indipendenza e gerarchia
- **Livello:** direttamente sotto il CEO, in parallelo all'AI Office Director; nessun mandato operativo o potere gerarchico sopra il Director.
- **Canale diretto:** riferisce le opportunita' **DIRETTAMENTE AL CEO** senza revisione/veto del Director. E' un'eccezione strettamente limitata alla ricognizione strategica: gli incarichi di sviluppo e modifica di MealUp restano inoltrati **solo dal CEO al Director**, secondo il contratto AI Office v1.3.
- **Decisione finale:** soltanto il CEO conferma un nuovo ruolo, un agente da sostituire o un modello da integrare; solo dopo autorizzazione il Director sceglie percorso, specialisti, QA e micro-step. Lo Scout non assegna autonomamente task a Design, Engineering, Food, Visual Production o altri reparti.
- **Indipendenza della valutazione:** puo' proporre di sostituire un modello di qualsiasi reparto, incluso il Director e lo Scout stesso; non puo' alterare il risultato di audit o certificare un benchmark inesistente.
- **Costo aggiuntivo assoluto:** 0 EUR; nessun acquisto, attivazione billing o uso di API a pagamento. Risorse gratuite e quote sono limiti reali, non capacita' illimitate.

## Precisazione vincolante del CEO — gratuità ripetibile, NON trial (15 ottobre 2026)

La regola `0 EUR` non si soddisfa con crediti iniziali, promozioni temporanee o demo a chiamate esauribili per sempre. **Per proporre un agente operativo STABILE lo Scout deve provare una capacità di utilizzo ricorrente a costo aggiuntivo zero**: quota Free che si azzera e rinnova al minuto/giorno/mese senza bisogno di billing, oppure esecuzione open-weight su computazione già disponibile e gratuita. È accettabile restare in attesa al raggiungimento della quota: l'agente riprende quando la finestra si rinnova. È vietato aggirare la quota creando nuove utenze, attivare fallback paid o fare affermazioni di gratuità permanente garantita da terzi. Registrare fonte ufficiale, unità e scadenza/reset, limiti per account, eventuali strumenti visuali a costo diverso, hard-stop e rendimento dei task nel budget ricorrente. Marcatura obbligatoria nei candidati: `RECURRING_FREE_QUOTA`, `SELF_HOSTED_PERPETUAL_VERIFIED`, `ONE_TIME_CREDITS`, `UNKNOWN`. Gli ultimi due non possono diventare agenti operativi stabili. Lo Scout rivaluta settimanalmente cambi di termini e quote, senza introdurre nuovi costi o chiedere credenziali fino a quando indispensabili.

## Controllo settimanale e fonti
- Frequenza: una ricognizione ogni settimana, orientativamente lunedi' mattina (fuso Europe/Rome). La pianificazione delle notifiche avviene con un'automazione ChatGPT separata, **non dentro la PWA o il router**.
- Fonti primarie: pagine ufficiali di modelli e API, model card, release notes, documentazioni, termini di utilizzo e pagine tariffarie; GitHub ufficiali, release e changelog. Confrontare con test/benchmark indipendenti che espongono dati e metodologia, e' vietato basarsi solo su marketing, social o graduatorie non riproducibili.
- Ambiti: nuovi modelli AI, agenti open source/gestiti, strumenti per Design UI/UX e visione, Engineering, Food/ricette, Visual Production, Prompt Architect, QA, Director/orchestrazione e possibilita' di nuovi ruoli pertinenti a MealUp. Non limitare la ricerca a Groq o Gemini.
- Valutazione minima: corrispondenza reale ai compiti del reparto, visione multimodale dove necessaria, API/CLI disponibili, disponibilita' in Italia, licenza, limiti e costo 0, sicurezza, compatibilita' tecnica, stabilita' e differenze rispetto al componente ACTIVE. Un abbonamento consumer non prova accesso a un'API gratuita.
- Benchmark A/B: usare stessi input reali o controllati, criteri e metriche espliciti, QA indipendente, campioni rappresentativi del compito. **Non dichiarare VERIFICATO MIGLIORE per MealUp** senza prove A/B realmente eseguite. Se non sono disponibili gli accessi/crediti, classificare solo CANDIDATO PROMETTENTE o MIGLIORE SU BENCHMARK PUBBLICI, e proporre come micro-step un test verificabile.

## Notifiche al CEO e criteri di decisione
- Comunicare SOLO quando appare una novita' concreta potenzialmente rilevante; se non emergono novita' significative, nessuna notifica. Evitare duplicati. Tutte le segnalazioni devono essere in italiano, brevi ma verificabili.
- Formato: nuovo modello/agente e ruolo interessato; sostituzione oppure nuova funzione; fonti dirette; vantaggio misurabile e confronto con lo strumento corrente; costo/licenza e accessibilita' confermati o NON VERIFICATI; rischi/dipendenze; livello di prova (CANDIDATO, BENCHMARK PUBBLICO, A/B MEALUP PASS); UNA raccomandazione concreta al CEO.
- Stati: DISCOVERED -> EVIDENCE_REVIEW -> CANDIDATE -> OPTIONAL_BENCHMARK -> PROPOSED_TO_CEO. Stato `APPROVED_FOR_DIRECTOR` solo dopo decisione esplicita del CEO. Fino a quel momento nessun cambio di modello, configurazione, file o branch.
- Durante un eventuale mandato autorizzato, il Director applica Costituzione v1.9, version lock, FROZEN, gate QA e rollback; nessuna sostituzione automatica, neppure se il candidato risulta migliore.
- Scouting indipendente dal runtime: l'automazione pianificata puo' ricercare e notificare, ma **NON** costituisce un agente multi-modello gia' collegato a GitHub o capace di sostituzioni autonome.

## Baseline aggiornata al 2026-10-15
- Office Director / routing selettivo: contratto v1.3 su `experiment/recipe-visual-agents`; router e QA protetti. Questo reparto ha un contratto v1.0 separato, cosi' non rende STALE il protocollo eseguibile del router.
- Gemini 3.8 Flash (`gemini-3.8-flash`): accesso API Free **BLOCCATO** nel progetto verificato; tre probe one-shot si sono fermati senza retry e l'ultimo ha restituito `HTTP 403 PERMISSION_DENIED`. Non e' collegato all'ufficio e non e' il motore ACTIVE del Design.
- Qwen 3.8 27B (`qwen/qwen3.8-27b`) su Groq Free: adapter Design **CONNECTED_GUARDED**, ma qualita' non approvata. Il probe visivo one-shot `38640342532` ha provato accesso e risposta. Il primo incarico office `38678076069` ha poi inventato piu frame/crop davanti a un unico asset WebP statico: esito QA finale **BLOCKED**. Qwen resta soltanto candidato tecnico sotto gate, non vincitore e non Design Agent affidabile dimostrato.
- Evidenze repository: workflow Gemini `38638531077` (BLOCKED 403) e Qwen/Groq `38640342532` (PASS accesso + risposta vision). Le fonti e i confronti di mercato restano responsabilita' dello scouting settimanale; nessun risultato singolo autorizza una sostituzione automatica.
- Invarianti: budget 0; nessuna modifica a Costituzione v1.9, MealUp Master, FROZEN, roadmap delle 454 ricette, `main`, tester ufficiale o deploy da parte dello Scout.

## Stato verificabile
- APPROVATO: reparto, rapporto diretto al CEO, mandato di scouting e autorizzazione a predisporre monitoraggio settimanale.
- ATTIVO COME AUTOMAZIONE CHATGPT: monitoraggio pianificato e notifiche condizionali, senza agente eseguibile dentro il repository.
- IMPLEMENTATO NEL LABORATORIO: registro delle connessioni dell'ufficio con Qwen/Groq come adapter Design protetto, pipeline Food/Groq e QA deterministico; nessun provider viene invocato automaticamente dal registro.
- NON IMPLEMENTATO: API Gemini accessibile, benchmark A/B automatico su casi reali, sostituzione autonoma di modelli o orchestrazione in background.

## Implementazione delle responsabilita Scout — 2026-10-15
- Organizzazione e gate operativi dettagliati: [protocollo Scout](mealup-ai-scout-operating-protocol-v1.md). La gerarchia approvata (Scout direttamente al CEO; Director solo dopo consenso) non cambia.
- Registro candidature, fonti e accesso API effettivamente verificato: `tools/ai-office/scout-candidate-register.json`.
- Benchmark preliminare: `tools/ai-office/design-benchmark.cjs` + workflow `.github/workflows/qa-ai-office-design-benchmark.yml`. Include test intramodello `none` vs `medium` su quattro asset del repository con QA strutturale; **NON** e un A/B fra modelli diversi e non certifica conformita visiva ai FROZEN.
- Status delle mansioni: Talent Scout Lead via automazione ChatGPT settimanale, Researcher e Auditor come verifiche della stessa iterazione, Engineer e QA mediante procedure GitHub e revisione umana. **Non esistono cinque nuovi agenti autonomi con provider distinti**. Il budget resta zero.

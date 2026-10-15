# MealUp — Mandato Professionale Dinamico Controllato

Decisione del CEO del 15 ottobre 2026. Questa regola è ACTIVE nel laboratorio e sostituisce soltanto il precedente criterio delle Skill fisse all'assunzione. Non modifica Costituzione AI v1.9, Master, FROZEN o gerarchia aziendale.

## Responsabilità

Il CEO approva agenti, mandati, nuovi privilegi e modifiche strategiche. Lo Scout risponde direttamente al CEO: recluta e confronta i migliori agenti e continua a proporre miglioramenti. Non sceglie le Skill quotidiane degli altri reparti. Il Director assegna obiettivi e incarichi agli agenti operativi. Ogni specialista, entro il mandato, sceglie autonomamente le Skill approvate più adatte, anche se non considerate durante il reclutamento. Lo Scout riceve incarichi direttamente dal CEO. I sottoagenti rispettano il perimetro ereditato. Il QA resta indipendente.

Le tre competenze per reparto nella matrice sono requisiti minimi per l'assunzione, non un limite permanente. L'agente usa tutte le Skill che servono al compito, non tutte quelle disponibili.

## Scelta autonoma e ampliamento delle Skill

Per ogni incarico il Director definisce scopo, risultato richiesto e vincoli; lo specialista seleziona e combina le Skill più efficaci tra quelle disponibili e autorizzate per ruolo, perimetro e costo. Non serve nuova approvazione CEO a ogni utilizzo ordinario. Le nuove esigenze emerse dopo l'assunzione non sono bloccate dal pacchetto iniziale.

Se la Skill è già approvata, lo specialista può usarla. Se manca, lo specialista segnala la competenza richiesta: QA e Director verificano una soluzione interna a basso rischio entro il mandato; lo Scout ricerca alternative esterne solo quando necessario. Nuovi privilegi, installazioni esterne, costi, variazioni di scopo o FROZEN tornano al CEO. Nessuna modifica ai FROZEN o accesso elevato viene inferito automaticamente.

Tutte le attività mantengono budget aggiuntivo zero, quote ricorrenti o diritti d'uso già inclusi, obbligo di QA e rispetto delle licenze. Il failover usa soltanto altri modelli approvati e provider con quote indipendenti, riprendendo a checkpoint; altrimenti il lavoro attende il rinnovo.

## Stato tecnico verificato al 15 ottobre 2026

Il selettore `tools/ai-office/dynamic-skill-selector.cjs` sceglie le Skill pertinenti con controlli su ruolo, incarico, perimetro, costo, autorizzazione, QA e sicurezza. **Da solo pianifica e non esegue**.

Un primo esecutore reale, `tools/ai-office/live-office-lab-pilot.cjs`, collega Director -> ENGINEERING -> QA: seleziona due Skill interne approvate per il laboratorio, esegue effettivamente l'audit del codice e la suite di regressione in GitHub Actions read-only, salva le prove. Questa pipeline e' stata eseguita con successo; run 38698886910. Il workflow `qa-ai-office-operational-on-change.yml` ripete automaticamente i controlli a ogni modifica pertinente del branch di laboratorio (run 38699764670: 28 moduli esaminati, 130 test superati).

Un secondo pilota, `tools/ai-office/live-model-skill-pilot.cjs`, ha chiamato una volta il candidato Qwen 3.8 via Groq Free usando **due Skill specialistiche del ruolo Design caricate realmente dal repository**. Run 38699460011: una chiamata, output ricevuto, controlli automatici senza blocchi e revisione visiva umana ancora obbligatoria. Qwen NON risulta assunto ne' approvato per il Design. Nessuna API a pagamento, token nuovo, deploy o modifica PWA.

**Non ancora operativo:** una squadra di otto agenti AI autonomi, la scelta autonoma da parte di tutti i modelli, un catalogo di Skill completo, un Director LLM persistente, recupero/salvataggio dei checkpoint, monitoraggio reale delle quote e rotazione tra provider. Due Skill Engineering/QA sono script interni eseguiti da CI, non AI agenti; la prova con Qwen e' un candidato isolato.

Il vecchio `scout-skill-mandate.cjs` resta valido solo per il controllo delle competenze minime in ingresso. La sua interpretazione come elenco chiuso di strumenti e' **SUPERSEDED** dal mandato dinamico. Per reclutamenti e cambi di privilegi serve ancora approvazione del CEO.

La politica vale per tutti gli otto reparti e ogni sottagente o backup. `main`, tester, PWA, ricette, Food Objects, vessel_id e documenti FROZEN non sono modificati.

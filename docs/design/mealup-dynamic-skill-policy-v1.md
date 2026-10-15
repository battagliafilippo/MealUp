# MealUp — Mandato Professionale Dinamico Controllato

Decisione del CEO del 15 ottobre 2026. Questa regola è ACTIVE nel laboratorio e sostituisce soltanto il precedente criterio delle Skill fisse all'assunzione. Non modifica Costituzione AI v1.9, Master, FROZEN o gerarchia aziendale.

## Responsabilità

Il CEO approva agenti, mandati, nuovi privilegi e modifiche strategiche. Lo Scout risponde direttamente al CEO: recluta e confronta i migliori agenti e continua a proporre miglioramenti. Non sceglie le Skill quotidiane degli altri reparti. Il Director assegna obiettivi e incarichi agli agenti operativi. Ogni specialista, entro il mandato, sceglie autonomamente le Skill approvate più adatte, anche se non considerate durante il reclutamento. Lo Scout riceve incarichi direttamente dal CEO. I sottoagenti rispettano il perimetro ereditato. Il QA resta indipendente.

Le tre competenze per reparto nella matrice sono requisiti minimi per l'assunzione, non un limite permanente. L'agente usa tutte le Skill che servono al compito, non tutte quelle disponibili.

## Scelta autonoma e ampliamento delle Skill

Per ogni incarico il Director definisce scopo, risultato richiesto e vincoli; lo specialista seleziona e combina le Skill più efficaci tra quelle disponibili e autorizzate per ruolo, perimetro e costo. Non serve nuova approvazione CEO a ogni utilizzo ordinario. Le nuove esigenze emerse dopo l'assunzione non sono bloccate dal pacchetto iniziale.

Se la Skill è già approvata, lo specialista può usarla. Se manca, lo specialista segnala la competenza richiesta: QA e Director verificano una soluzione interna a basso rischio entro il mandato; lo Scout ricerca alternative esterne solo quando necessario. Nuovi privilegi, installazioni esterne, costi, variazioni di scopo o FROZEN tornano al CEO. Nessuna modifica ai FROZEN o accesso elevato viene inferito automaticamente.

Tutte le attività mantengono budget aggiuntivo zero, quote ricorrenti o diritti d'uso già inclusi, obbligo di QA e rispetto delle licenze. Il failover usa soltanto altri modelli approvati e provider con quote indipendenti, riprendendo a checkpoint; altrimenti il lavoro attende il rinnovo.

## Stato reale della realizzazione

Il controllo `tools/ai-office/dynamic-skill-selector.cjs` produce esclusivamente un piano offline per un incarico. Verifica i campi dichiarati per ruolo, scope, autorizzazione di assegnazione, QA, costo e compatibilità, ma non verifica da solo la validità esterna delle prove. Non installa o esegue Skill, non collega modelli, non attiva sottagenti, non effettua chiamate API e non cambia la PWA.

Il precedente mandato `tools/ai-office/scout-skill-mandate.cjs` resta un controllo di assunzione sulle competenze minime. La sua interpretazione come elenco chiuso degli strumenti usabili è **SUPERSEDED** da questo nuovo modello. Per l'attuazione autonoma reale serviranno un catalogo verificato, un runtime compatibile, un registro delle quote, checkpoint e audit end-to-end. Non considerare i test offline una prova che gli agenti stiano già lavorando in autonomia.

Valido per tutti gli otto reparti (Design, Engineering, Food, Visual Production, Prompt Architect, QA, Director, Scout), per backup e per eventuali sottagenti. Branch di laboratorio soltanto; main, tester, PWA e documenti FROZEN invariati.

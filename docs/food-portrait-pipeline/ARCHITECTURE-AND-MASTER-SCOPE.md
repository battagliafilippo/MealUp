# MealUp Food Portrait — Decisione architetturale P2.1/P2.2

Data 2026-10-15. Stato: **DECISIONE TECNICA ATTIVA NEL SOLO LABORATORIO**. Nessuna approvazione visuale o nuovo freeze.

## Alternative confrontate

| Metodo | Ripetibilita | Correttezza piatto completo | Costo extra ricorrente | Esito |
|---|---|---|---|---|
| Composizione totalmente deterministica con i vecchi oggetti G5 | Geometria ripetibile | Non dimostrata: composizioni multi-oggetto non equivalgono a un Food Portrait completo | 0 € | Da usare solo per riuso provato, mai auto-promuovere |
| Generazione cloud per 454 piatti tramite API | Seed/prompt non garantiscono identita pixel-perfect | Richiede QA visuale e source art approvate | Gratis permanente non verificato | Non assumere disponibile |
| Generazione ChatGPT Images nella chat | Potenzialmente alta qualita, bassa ripetibilita esatta | Buona candidata per pilot con reference disponibili | Incluso nel piano per uso interattivo, NON API illimitata | Generazione assistita, non processo unattended garantito |
| Modello open source self-hosted CPU/GitHub Actions | Hardware, tempi e ripetibilita da qualificare | Qualita Toys 3D non dimostrata | Potenzialmente 0 € ma costo operativo/limiti dei runner | Non adottare senza benchmark reale |
| **Ibrido offline-first** | Deterministico in gestione, cache, dedup e postprocess; generazione stocastica isolata | Rifiuta automaticamente output non verificati | 0 € nei componenti offline; produzione per generatori realmente accessibili | **Scelto per implementazione** |

## Architettura minima unica

1. Fonte ricette e vessel = M2/G8. Gli ingredienti e i passaggi non sono ordini di generazione e le inferenze non sono fatti.
2. Visual planning = M3 e futuro Food Specialist, con revisione di composizioni e ambiguita.
3. Golden Registry = `tools/food-portrait-pipeline/golden-registry.v1.json`. Registrare solo sorgenti approvate, versioni e hash verificati. Ora **0 Food Portrait Golden Master verificati**.
4. Specifiche = `portrait-contract.cjs` crea 454 snapshot source-traced; nessuna immagine fittizia.
5. Queue = `queue-recovery.cjs`, checkpoint atomici, dedup tramite hash, invalidazione selettiva per nuova revisione; output non ammesso senza nuova verifica.
6. Image producer = adapter non attivato finche metodo e reference non superano un pilota reale. Il generatore puo essere ChatGPT Images interattivo; non viene dichiarata una API automatica.
7. QA indipendente = `image-technical-qa.cjs` per pixel/formato/alpha/crop/byte e **revisione visuale separata** per ingredienti, impiattamento, vessel e stile. Una verifica tecnica non e accettazione visuale.
8. Exception queue = `staging-catalog.cjs`, cause comuni accorpate; immagini dubbie bloccate individualmente.
9. Staging = manifest di 454 recipe_id con fallback neutro, mai FO di famiglia spacciato per Food Portrait; nessuna modifica a PWA.

## Contratti per il futuro AI Office

| Ruolo futuro | Input | Output | Potere attuale |
|---|---|---|---|
| Director | piano, eccezioni e DoD | decisione tecnica motivata / richiesta owner | Interfaccia definita, **non attivo** |
| Food Specialist | facts M2 e steps | interpretazione culinaria con provenance di ogni affermazione | Non attivo |
| Design Agent | Golden Master verificati | parametri di stile, inquadratura e confronto con ref | Non attivo |
| Visual Production | spec e prompt con gate PASS | asset candidato e provenance della generazione | Non attivo |
| Independent QA | image bytes e spec + golden | difetti misurabili, giudizio visivo, incertezza | QA binario locale attivo; giudizio visuale non automatizzato |

## Gate di ripresa

**BLOCKED:** la reference vessel storica non supera SHA-256 e nessun Golden Master Food Portrait completo ha ancora prova di provenienza; NON modificare i FROZEN e NON iniziare una produzione massiva. Questo impedisce l'ammissione delle immagini finali, non gli sviluppi offline.

**DONE sezione software pre-produzione:** 454 spec corrette con source hash, coda riprendibile e test su catalogo reale, catalogo di staging sicuro e exception queue. La parola DONE qui non include produzione immagini.

## Contratto sulla nuova direzione del Master (autorizzazione utente)

L'utente ha chiarito il 15 ottobre 2026 che il **risultato finale deve essere un Food Portrait dedicato a ogni ricetta**, e autorizza la **modifica del Master se necessaria**. Questa decisione supera il vecchio uso dei FO di famiglia **come soluzione finale desiderata nella card**, senza autorizzare a cambiare immediatamente i freeze su layout, dati, UI o runtime.

Riconciliazione: quando nuova card + Food Portrait saranno dimostrati conformi nel pilota e l'utente approvera lo standard, preparare **patch mirata** alle sezioni del Master su FO/ricette/Card; elencare esattamente le clausole sostituite, preservare il resto e aggiornarlo **solo al freeze della sezione completa**, secondo la regola precedente. Fino ad allora il Master v1.24 e il tester restano invariati.

**Prossimo step:** consolidare il checkpoint CI e poi stabilire il set minimo di reference visuali effettivamente recuperabili per il pilota, senza inventare immagini o cambiare hash canonici.
